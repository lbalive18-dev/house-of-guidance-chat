<?php

namespace Database\Seeders;

use App\Models\Dua;
use Illuminate\Database\Seeder;

class DuaSeeder extends Seeder
{
    public function run(): void
    {
        $duas = [
            [
                'title' => 'Before Eating',
                'category' => 'daily',
                'arabic_text' => 'بِسْمِ اللَّهِ',
                'transliteration' => 'Bismillah',
                'translation' => 'In the name of Allah.',
                'reference' => 'Abu Dawood, Tirmidhi',
            ],
            [
                'title' => 'After Eating',
                'category' => 'daily',
                'arabic_text' => 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
                'transliteration' => "Alhamdu lillahil-ladhi at'amani hadha, wa razaqanihi min ghayri hawlin minni wa la quwwah",
                'translation' => 'Praise be to Allah who fed me this and provided it for me without any power or might from myself.',
                'reference' => 'Abu Dawood, Tirmidhi',
            ],
            [
                'title' => 'Before Sleeping',
                'category' => 'daily',
                'arabic_text' => 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
                'transliteration' => 'Bismika Allahumma amutu wa ahya',
                'translation' => 'In Your name, O Allah, I die and I live.',
                'reference' => 'Sahih al-Bukhari',
            ],
            [
                'title' => 'Upon Waking',
                'category' => 'daily',
                'arabic_text' => 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
                'transliteration' => "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur",
                'translation' => 'Praise be to Allah who gave us life after having caused us to die, and to Him is the return.',
                'reference' => 'Sahih al-Bukhari',
            ],
            [
                'title' => 'Leaving the Home',
                'category' => 'daily',
                'arabic_text' => 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
                'transliteration' => "Bismillahi tawakkaltu 'alallah, wa la hawla wa la quwwata illa billah",
                'translation' => 'In the name of Allah, I place my trust in Allah, and there is no power or might except with Allah.',
                'reference' => 'Abu Dawood, Tirmidhi',
            ],
            [
                'title' => 'Entering the Home',
                'category' => 'daily',
                'arabic_text' => 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلِجِ وَخَيْرَ الْمَخْرَجِ',
                'transliteration' => 'Allahumma inni as-aluka khayral mawliji wa khayral makhraji',
                'translation' => 'O Allah, I ask You for the best entrance and the best exit.',
                'reference' => 'Abu Dawood',
            ],
            [
                'title' => 'For Travel',
                'category' => 'travel',
                'arabic_text' => 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ',
                'transliteration' => 'Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun',
                'translation' => 'Glory to Him who has subjected this to us, for we could never have accomplished this by ourselves. And to our Lord we shall return.',
                'reference' => 'Quran 43:13-14',
            ],
            [
                'title' => 'Seeking Forgiveness (Sayyid al-Istighfar)',
                'category' => 'forgiveness',
                'arabic_text' => 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ',
                'transliteration' => "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana 'abduka",
                'translation' => 'O Allah, You are my Lord, there is no god but You. You created me and I am Your servant. (The master of seeking forgiveness.)',
                'reference' => 'Sahih al-Bukhari',
            ],
            [
                'title' => 'For Anxiety and Distress',
                'category' => 'distress',
                'arabic_text' => 'اللَّهُمَّ إِنِّي عَبْدُكَ ابْنُ عَبْدِكَ ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ',
                'transliteration' => "Allahumma inni 'abduka ibnu 'abdika ibnu amatika, nasiyati biyadik",
                'translation' => 'O Allah, I am Your servant, son of Your servant, son of Your maidservant; my forelock is in Your hand.',
                'reference' => 'Musnad Ahmad',
            ],
            [
                'title' => 'For Parents',
                'category' => 'family',
                'arabic_text' => 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
                'transliteration' => 'Rabbi irhamhuma kama rabbayani saghira',
                'translation' => 'My Lord, have mercy upon them as they raised me when I was small.',
                'reference' => 'Quran 17:24',
            ],
            [
                'title' => 'For Ease in Difficulty',
                'category' => 'distress',
                'arabic_text' => 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا',
                'transliteration' => "Allahumma la sahla illa ma ja'altahu sahlan, wa anta taj'alul hazna idha shi'ta sahla",
                'translation' => 'O Allah, nothing is easy except what You make easy, and You make the difficult easy if You will.',
                'reference' => 'Ibn Hibban, graded sahih',
            ],
            [
                'title' => 'Increase in Knowledge',
                'category' => 'knowledge',
                'arabic_text' => 'رَبِّ زِدْنِي عِلْمًا',
                'transliteration' => "Rabbi zidni 'ilma",
                'translation' => 'My Lord, increase me in knowledge.',
                'reference' => 'Quran 20:114',
            ],
            [
                'title' => 'Entering the Masjid',
                'category' => 'worship',
                'arabic_text' => 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
                'transliteration' => 'Allahumma-ftah li abwaba rahmatik',
                'translation' => 'O Allah, open for me the doors of Your mercy.',
                'reference' => 'Sahih Muslim',
            ],
            [
                'title' => 'For Good in This Life and the Hereafter',
                'category' => 'general',
                'arabic_text' => 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
                'transliteration' => "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar",
                'translation' => 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
                'reference' => 'Quran 2:201',
            ],
        ];

        foreach ($duas as $dua) {
            Dua::create($dua);
        }
    }
}
