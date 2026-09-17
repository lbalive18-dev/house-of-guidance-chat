<?php

namespace Tests\Feature\Islamic;

use App\Models\Ayah;
use App\Models\QuranAudio;
use App\Models\QuranReciter;
use App\Models\Surah;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuranReadingTest extends TestCase
{
    use RefreshDatabase;

    private function seedMiniQuran(): array
    {
        $surah1 = Surah::create([
            'number' => 1, 'name_arabic' => 'الفاتحة', 'name_transliterated' => 'Al-Fatihah',
            'name_english' => 'The Opening', 'revelation_type' => 'meccan', 'verses_count' => 7,
        ]);
        $surah2 = Surah::create([
            'number' => 2, 'name_arabic' => 'البقرة', 'name_transliterated' => 'Al-Baqarah',
            'name_english' => 'The Cow', 'revelation_type' => 'medinan', 'verses_count' => 286,
        ]);

        foreach (range(1, 3) as $n) {
            Ayah::create(['surah_id' => $surah1->id, 'number' => $n, 'text_arabic' => 'آية '.$n]);
        }
        $ayah = Ayah::create(['surah_id' => $surah2->id, 'number' => 5, 'text_arabic' => 'آية خمسة']);

        $reciter = QuranReciter::create([
            'name' => 'Mishary Rashid Alafasy', 'slug' => 'mishary-rashid-alafasy',
            'language' => 'ar', 'is_active' => true,
        ]);
        QuranAudio::create([
            'ayah_id' => $ayah->id, 'quran_reciter_id' => $reciter->id,
            'audio_url' => 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/12.mp3',
        ]);

        return [$surah1, $surah2, $ayah];
    }

    public function test_surah_list_and_reciters_are_available(): void
    {
        [$surah1] = $this->seedMiniQuran();
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/islamic/quran')
            ->assertOk()->assertJsonPath('surahs.0.number', 1);

        $this->actingAs($user)->getJson('/api/islamic/quran/reciters')
            ->assertOk()->assertJsonPath('reciters.0.slug', 'mishary-rashid-alafasy');
    }

    public function test_surah_details_resolve_by_surah_number_with_audio_shape(): void
    {
        [$surah1, $surah2] = $this->seedMiniQuran();
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/islamic/quran/2?reciter=mishary-rashid-alafasy');

        $response->assertOk()
            ->assertJsonPath('surah.number', 2)
            ->assertJsonPath('surah.ayahs.0.audio.0.audio_url', 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/12.mp3');
    }

    public function test_bookmark_crud_is_scoped_to_the_user(): void
    {
        [$surah1, $surah2, $ayah] = $this->seedMiniQuran();
        $user = User::factory()->create();

        $this->actingAs($user)->postJson("/api/islamic/quran/ayahs/{$ayah->id}/bookmark", ['note' => 'reflect'])
            ->assertCreated()->assertJsonPath('bookmark.ayah_id', $ayah->id);

        $this->actingAs($user)->getJson('/api/islamic/quran/bookmarks')
            ->assertOk()->assertJsonCount(1, 'bookmarks');

        $this->actingAs($user)->deleteJson("/api/islamic/quran/ayahs/{$ayah->id}/bookmark")
            ->assertOk();

        $this->actingAs($user)->getJson('/api/islamic/quran/bookmarks')
            ->assertOk()->assertJsonCount(0, 'bookmarks');
    }

    public function test_progress_uses_ayah_numbers_beyond_the_first_surah(): void
    {
        [$surah1, $surah2, $ayah] = $this->seedMiniQuran();
        $user = User::factory()->create();

        // Surah 2, ayah NUMBER 5 (whose table id differs) must resolve.
        $this->actingAs($user)->postJson('/api/islamic/quran/progress/2/ayah/5')
            ->assertOk()->assertJsonPath('progress.last_ayah_number', 5);

        $this->actingAs($user)->getJson('/api/islamic/quran/progress/2')
            ->assertOk()->assertJsonPath('progress.last_ayah_number', 5);

        // Unknown ayah numbers are rejected, not misattributed.
        $this->actingAs($user)->postJson('/api/islamic/quran/progress/2/ayah/999')
            ->assertStatus(422);
    }
}
