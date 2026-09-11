<?php

namespace Database\Seeders;

use App\Models\QuranReciter;
use Illuminate\Database\Seeder;

class QuranReciterSeeder extends Seeder
{
    public function run(): void
    {
        $reciters = [
            [
                'name' => 'Mishary Rashid Alafasy',
                'slug' => 'mishary-rashid-alafasy',
                'language' => 'ar',
                'bio' => 'Kuwaiti Quran reciter and imam.',
                'is_active' => true,
            ],
            [
                'name' => 'Abdul Basit Abdul Samad',
                'slug' => 'abdul-basit-abdul-samad',
                'language' => 'ar',
                'bio' => 'Egyptian Quran reciter known for his distinctive recitation.',
                'is_active' => true,
            ],
            [
                'name' => 'Mahmoud Khalil Al-Husary',
                'slug' => 'mahmoud-khalil-al-husary',
                'language' => 'ar',
                'bio' => 'Egyptian Quran reciter renowned for precise Quranic recitation.',
                'is_active' => true,
            ],
            [
                'name' => 'Abdur-Rahman As-Sudais',
                'slug' => 'abdur-rahman-as-sudais',
                'language' => 'ar',
                'bio' => 'Saudi Quran reciter and imam.',
                'is_active' => true,
            ],
        ];

        foreach ($reciters as $reciter) {
            QuranReciter::updateOrCreate(
                ['slug' => $reciter['slug']],
                $reciter
            );
        }
    }
}