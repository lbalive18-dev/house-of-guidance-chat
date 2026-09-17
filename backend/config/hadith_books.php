<?php

/*
|--------------------------------------------------------------------------
| Hadith Library Books
|--------------------------------------------------------------------------
|
| The fixed shelf of the in-app Hadith library. Each book is keyed by the
| exact `collection` string stored on hadiths rows, so live counts stay
| correct as authoritative imports arrive. Books with zero rows render an
| honest "source text pending" state in the UI — never filler content.
|
*/

return [
    'books' => [
        [
            'collection' => 'Riyad as-Salihin',
            'title_en' => 'Riyad as-Salihin',
            'title_ar' => 'رياض الصالحين',
            'description' => 'The Gardens of the Righteous — Imam an-Nawawi’s classic compilation on worship, character, and daily life.',
        ],
        [
            'collection' => "Al-Arba'in an-Nawawiyyah",
            'title_en' => "Al-Arba'in an-Nawawiyyah — 40 Hadith",
            'title_ar' => 'الأربعون النووية',
            'description' => 'Imam an-Nawawi’s forty essential hadith covering the foundations of the religion.',
        ],
        [
            'collection' => '40 Hadith Qudsi',
            'title_en' => '40 Hadith Qudsi',
            'title_ar' => 'الأحاديث القدسية',
            'description' => 'Sacred hadith in which the Prophet ﷺ relates the words of Allah Almighty.',
        ],
        [
            'collection' => 'Daily Essentials',
            'title_en' => 'Daily Essentials',
            'title_ar' => null,
            'description' => 'A curated collection of essential hadith for everyday reflection and practice.',
        ],
    ],
];
