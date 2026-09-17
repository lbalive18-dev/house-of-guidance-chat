<?php

namespace Tests\Feature\Islamic;

use App\Models\Hadith;
use App\Models\User;
use Database\Seeders\HadithSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HadithCollectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_collections_endpoint_lists_the_four_books_with_counts(): void
    {
        $this->seed(HadithSeeder::class);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/islamic/hadith/collections');

        $response->assertOk()->assertJsonStructure(['books' => [['collection', 'title_en', 'count']]]);

        $books = collect($response->json('books'));
        $this->assertSame(4, $books->count());
        $this->assertContains('Riyad as-Salihin', $books->pluck('collection')->all());
        $this->assertContains("Al-Arba'in an-Nawawiyyah", $books->pluck('collection')->all());
    }

    public function test_hadiths_can_be_filtered_by_collection(): void
    {
        Hadith::create(['collection' => 'Riyad as-Salihin', 'hadith_number' => 1, 'text' => 'A', 'reference' => 'X', 'category' => 'general']);
        Hadith::create(['collection' => 'Daily Essentials', 'hadith_number' => 1, 'text' => 'B', 'reference' => 'Y', 'category' => 'general']);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/islamic/hadith?collection=Riyad%20as-Salihin');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Riyad as-Salihin', $response->json('data.0.collection'));
    }

    public function test_a_single_hadith_can_be_fetched(): void
    {
        $hadith = Hadith::create(['collection' => 'Test', 'hadith_number' => 3, 'text' => 'C', 'reference' => 'Z', 'category' => 'general']);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson("/api/islamic/hadith/{$hadith->id}");

        $response->assertOk()->assertJsonPath('hadith_number', 3);
    }

    public function test_categories_route_is_not_shadowed_by_the_show_route(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/islamic/hadith/categories');

        $response->assertOk();
        $this->assertIsArray($response->json());
    }

    public function test_a_guest_cannot_access_collections(): void
    {
        $response = $this->getJson('/api/islamic/hadith/collections');

        $response->assertStatus(401);
    }
}
