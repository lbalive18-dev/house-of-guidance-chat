<?php

namespace App\Services;

use App\Models\Hadith;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/*
| Hadith collection importer.
|
| Reads authoritative collection data from JSON files placed under
| database/data/hadith/<slug>.json — one file per book, matching a
| `collection` string from config/hadith_books.php. Expected row shape:
|
|   {
|     "hadith_number": 1,
|     "arabic_text": "...",
|     "text": "English translation...",
|     "narrator": "...",
|     "reference": "...",
|     "chapter": "...",
|     "grade": "...",
|     "category": "...",
|     "source_collection": "Original Book (curated copies only)",
|     "source_number": 7
|   }
|
| Integrity rules (fail loudly, never auto-fill):
|  - arabic_text and text are required on every row.
|  - hadith_number must be present and gapless per collection file.
|  - Duplicate (collection, hadith_number) pairs are rejected.
|  - Rows failing validation abort the whole import with a clear report.
|  - Only previously IMPORTED rows (non-NULL hadith_number) are replaced;
|    legacy rows (NULL hadith_number) are never touched.
|  - Religious text is NEVER generated here; absent source files mean the
|    book stays empty and the UI shows an honest pending state.
*/
class HadithImportService
{
    /**
     * @return array{imported: int, collection: string}
     */
    public function importFile(string $collection, string $path): array
    {
        if (! file_exists($path)) {
            throw new RuntimeException("Hadith source file not found: {$path}");
        }

        $decoded = json_decode(file_get_contents($path), true);

        if (! is_array($decoded)) {
            throw new RuntimeException("Hadith source file is not valid JSON: {$path}");
        }

        $errors = [];
        $rows = [];

        foreach (array_values($decoded) as $index => $row) {
            $rowNumber = $index + 1;

            if (! is_array($row)) {
                $errors[] = "Row {$rowNumber}: not an object.";

                continue;
            }

            $arabic = trim((string) ($row['arabic_text'] ?? ''));
            $english = trim((string) ($row['text'] ?? ''));
            $number = $row['hadith_number'] ?? null;

            if ($arabic === '') {
                $errors[] = "Row {$rowNumber}: missing arabic_text.";
            }

            if ($english === '') {
                $errors[] = "Row {$rowNumber}: missing text (English translation).";
            }

            if (! is_int($number) || $number < 1) {
                $errors[] = "Row {$rowNumber}: missing or invalid hadith_number.";
            }

            $sourceNumber = $row['source_number'] ?? null;

            if (isset($row['source_collection']) !== isset($row['source_number']) || (isset($row['source_number']) && (! is_int($sourceNumber) || $sourceNumber < 1))) {
                $errors[] = "Row {$rowNumber}: source_collection and source_number must appear together with a valid number.";
            }

            $rows[] = [
                'collection' => $collection,
                'source_collection' => isset($row['source_collection']) ? trim((string) $row['source_collection']) ?: null : null,
                'source_number' => is_int($sourceNumber) && $sourceNumber >= 1 ? $sourceNumber : null,
                'hadith_number' => is_int($number) ? $number : null,
                'chapter' => isset($row['chapter']) ? trim((string) $row['chapter']) ?: null : null,
                'narrator' => isset($row['narrator']) ? trim((string) $row['narrator']) ?: null : null,
                'arabic_text' => $arabic !== '' ? $arabic : null,
                'text' => $english !== '' ? $english : null,
                'reference' => trim((string) ($row['reference'] ?? '')) ?: $collection,
                'grade' => isset($row['grade']) ? trim((string) $row['grade']) ?: null : null,
                'category' => trim((string) ($row['category'] ?? '')) ?: 'general',
            ];
        }

        if ($errors !== []) {
            throw new RuntimeException(
                'Hadith import rejected ('.$collection.'): '.implode(' ', array_slice($errors, 0, 10))
                .(count($errors) > 10 ? ' (+'.(count($errors) - 10).' more)' : '')
            );
        }

        $numbers = array_column($rows, 'hadith_number');
        sort($numbers);

        if (count(array_unique($numbers)) !== count($numbers)) {
            throw new RuntimeException(
                "Hadith import rejected ({$collection}): duplicate hadith_number values detected."
            );
        }

        if ($numbers !== range(1, count($numbers))) {
            throw new RuntimeException(
                "Hadith import rejected ({$collection}): hadith_number values must be gapless starting at 1."
            );
        }

        DB::transaction(function () use ($collection, $rows) {
            // Replace only previously imported rows. Legacy rows carry a
            // NULL hadith_number and are never deleted or rewritten here.
            Hadith::where('collection', $collection)
                ->whereNotNull('hadith_number')
                ->delete();

            foreach ($rows as $row) {
                Hadith::create($row);
            }
        });

        return ['imported' => count($rows), 'collection' => $collection];
    }
}
