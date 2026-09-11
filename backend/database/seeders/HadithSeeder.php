<?php

namespace Database\Seeders;

use App\Models\Hadith;
use Illuminate\Database\Seeder;

class HadithSeeder extends Seeder
{
    public function run(): void
    {
        $hadiths = [
            [
                'collection' => 'Sahih al-Bukhari & Muslim',
                'narrator' => "Umar ibn al-Khattab",
                'text' => 'Actions are judged by intentions, and every person will be rewarded according to what they intended.',
                'reference' => 'Bukhari 1, Muslim 1907',
                'category' => 'intentions',
            ],
            [
                'collection' => 'Sahih al-Bukhari & Muslim',
                'narrator' => 'Anas ibn Malik',
                'text' => 'None of you truly believes until he loves for his brother what he loves for himself.',
                'reference' => 'Bukhari 13, Muslim 45',
                'category' => 'brotherhood',
            ],
            [
                'collection' => 'Sahih Muslim',
                'narrator' => 'Abu Hurairah',
                'text' => 'Whoever believes in Allah and the Last Day should speak good or remain silent.',
                'reference' => 'Muslim 47',
                'category' => 'character',
            ],
            [
                'collection' => 'Sahih al-Bukhari',
                'narrator' => 'Abdullah ibn Amr',
                'text' => 'The Muslim is one from whose tongue and hand the people are safe.',
                'reference' => 'Bukhari 10',
                'category' => 'character',
            ],
            [
                'collection' => 'Sahih Muslim',
                'narrator' => 'Abu Hurairah',
                'text' => 'Allah does not look at your appearance or wealth, but He looks at your hearts and your deeds.',
                'reference' => 'Muslim 2564',
                'category' => 'sincerity',
            ],
            [
                'collection' => 'Sunan al-Tirmidhi',
                'narrator' => 'Abu Hurairah',
                'text' => 'The strong believer is better and more beloved to Allah than the weak believer, though there is good in both.',
                'reference' => 'Muslim 2664',
                'category' => 'character',
            ],
            [
                'collection' => 'Sahih al-Bukhari',
                'narrator' => 'Abu Musa al-Ashari',
                'text' => 'The believer to another believer is like a building, each part strengthening the other.',
                'reference' => 'Bukhari 481',
                'category' => 'brotherhood',
            ],
            [
                'collection' => 'Riyad as-Salihin',
                'narrator' => 'Abu Hurairah',
                'text' => 'Whoever removes a hardship from a believer in this world, Allah will remove from him a hardship on the Day of Judgment.',
                'reference' => 'Muslim 2699',
                'category' => 'kindness',
            ],
            [
                'collection' => 'Sahih al-Bukhari',
                'narrator' => 'Abdullah ibn Umar',
                'text' => 'The most beloved of deeds to Allah are those done consistently, even if small.',
                'reference' => 'Bukhari 6465',
                'category' => 'worship',
            ],
            [
                'collection' => 'Sunan Abu Dawood',
                'narrator' => 'Abu Umamah',
                'text' => 'A guarantee is given for a house in Paradise for one who gives up arguing even if he is right.',
                'reference' => 'Abu Dawood 4800',
                'category' => 'character',
            ],
            [
                'collection' => 'Sahih Muslim',
                'narrator' => 'Abu Dharr',
                'text' => "Do not belittle any good deed, even meeting your brother with a cheerful face.",
                'reference' => 'Muslim 2626',
                'category' => 'kindness',
            ],
            [
                'collection' => 'Sahih al-Bukhari',
                'narrator' => 'Abu Hurairah',
                'text' => 'Whoever believes in Allah and the Last Day should honor his guest.',
                'reference' => 'Bukhari 6018',
                'category' => 'character',
            ],
            [
                'collection' => 'Sunan al-Tirmidhi',
                'narrator' => 'Abdullah ibn Amr',
                'text' => 'The most beloved people to Allah are those who are most beneficial to others.',
                'reference' => 'Al-Mu\'jam al-Awsat, graded hasan by scholars',
                'category' => 'kindness',
            ],
            [
                'collection' => 'Sahih al-Bukhari & Muslim',
                'narrator' => 'Abu Hurairah',
                'text' => 'Seeking knowledge is a path that leads to Paradise.',
                'reference' => 'Muslim 2699',
                'category' => 'knowledge',
            ],
            [
                'collection' => 'Sunan Ibn Majah',
                'narrator' => 'Anas ibn Malik',
                'text' => 'Seeking knowledge is an obligation upon every Muslim.',
                'reference' => 'Ibn Majah 224',
                'category' => 'knowledge',
            ],
            [
                'collection' => 'Sahih al-Bukhari',
                'narrator' => 'Abu Hurairah',
                'text' => 'Richness is not having many possessions, but richness is being content with oneself.',
                'reference' => 'Bukhari 6446',
                'category' => 'contentment',
            ],
        ];

        foreach ($hadiths as $hadith) {
            Hadith::create($hadith);
        }
    }
}
