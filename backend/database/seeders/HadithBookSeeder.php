<?php

namespace Database\Seeders;

use App\Services\HadithImportService;
use Illuminate\Database\Seeder;

/*
| Imports authoritative Hadith book files from database/data/hadith/.
|
| Each book needs a <slug>.json file (see HadithImportService for the exact
| row shape). Files that are absent are SKIPPED with a notice — the book
| shell stays in the library with an honest pending state. Nothing here
| generates religious text; the legacy 16 entries from HadithSeeder are
| left exactly as they are.
*/
class HadithBookSeeder extends Seeder
{
    public function run(): void
    {
        $importer = app(HadithImportService::class);

        $files = [
            'Riyad as-Salihin' => 'riyad-as-salihin.json',
            "Al-Arba'in an-Nawawiyyah" => 'nawawi-40.json',
            '40 Hadith Qudsi' => 'qudsi-40.json',
            'Daily Essentials' => 'daily-essentials.json',
        ];

        foreach ($files as $collection => $file) {
            $path = database_path('data/hadith/'.$file);

            if (! file_exists($path)) {
                $this->command->warn(
                    "Hadith source missing for '{$collection}' ({$file}) — book left pending."
                );

                continue;
            }

            $result = $importer->importFile($collection, $path);

            $this->command->info(
                "Hadith book '{$result['collection']}' imported: {$result['imported']} entries."
            );
        }
    }
}
