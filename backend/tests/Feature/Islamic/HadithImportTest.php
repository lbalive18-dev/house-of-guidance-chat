<?php

namespace Tests\Feature\Islamic;

use App\Models\Hadith;
use App\Services\HadithImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class HadithImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_rejects_duplicate_numbers_without_touching_data(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('duplicate');

        app(HadithImportService::class)->importFile(
            'Test Duplicates',
            base_path('tests/Fixtures/hadith-duplicate.json')
        );
    }

    public function test_import_rejects_a_missing_file(): void
    {
        $this->expectException(RuntimeException::class);

        app(HadithImportService::class)->importFile(
            'Test Missing',
            base_path('tests/Fixtures/does-not-exist.json')
        );
    }

    public function test_import_preserves_legacy_rows_with_null_numbers(): void
    {
        $legacy = Hadith::create([
            'collection' => "Al-Arba'in an-Nawawiyyah",
            'text' => 'Legacy entry kept as-is.',
            'reference' => 'legacy',
            'category' => 'general',
        ]);

        $result = app(HadithImportService::class)->importFile(
            "Al-Arba'in an-Nawawiyyah",
            database_path('data/hadith/nawawi-40.json')
        );

        $this->assertSame(42, $result['imported']);
        $this->assertTrue(Hadith::whereKey($legacy->id)->exists());
        $this->assertSame(43, Hadith::where('collection', "Al-Arba'in an-Nawawiyyah")->count());
    }
}
