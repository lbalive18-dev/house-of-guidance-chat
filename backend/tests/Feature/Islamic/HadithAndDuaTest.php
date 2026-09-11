<?php

namespace Tests\Feature\Islamic;

use App\Models\Dua;
use App\Models\Hadith;
use App\Models\User;
use Database\Seeders\DuaSeeder;
use Database\Seeders\HadithSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HadithAndDuaTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_daily_hadith_returns_a_seeded_entry(): void
    {
        $this->seed(HadithSeeder::class);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/islamic/hadith/daily');

        $response->assertOk()->assertJsonStructure(['collection', 'text', 'reference', 'category']);
    }

    public function test_hadiths_can_be_filtered_by_category(): void
    {
        Hadith::create(['collection' => 'Test', 'text' => 'A', 'reference' => 'X', 'category' => 'knowledge']);
        Hadith::create(['collection' => 'Test', 'text' => 'B', 'reference' => 'Y', 'category' => 'kindness']);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/islamic/hadith?category=knowledge');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_duas_can_be_browsed_and_searched(): void
    {
        $this->seed(DuaSeeder::class);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/islamic/duas?q=eating');

        $response->assertOk();
        $this->assertGreaterThanOrEqual(1, count($response->json('data')));
    }

    public function test_a_single_dua_can_be_fetched(): void
    {
        $dua = Dua::create([
            'title' => 'Test Dua', 'category' => 'general',
            'arabic_text' => 'test', 'translation' => 'test translation',
        ]);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson("/api/islamic/duas/{$dua->id}");

        $response->assertOk()->assertJsonPath('title', 'Test Dua');
    }
}
