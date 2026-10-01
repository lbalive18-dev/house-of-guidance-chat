<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NoorCachedAnswer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Noor — the House of Guidance assistant (free tier).
 *
 * Three layers, cheapest first:
 *  1. Local — greetings, menu topics, and House of Guidance knowledge
 *     answered instantly with zero API calls.
 *  2. Cache — repeat questions served from stored answers, zero calls.
 *  3. Groq — only genuinely new questions hit the model, with site
 *     context + Islamic safety rules. Any failure falls back silently
 *     to a local answer, so Noor never errors in the user's face.
 *
 * The model key lives only in server config (GROQ_API_KEY), never in the
 * frontend. Without a key, layers 1–2 keep working.
 */
class NoorController extends Controller
{
    public function chat(Request $request)
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:2000'],
            'lang' => ['sometimes', 'nullable', 'string', 'max:12'],
        ]);

        $message = trim($validated['message']);
        $lang = $this->resolveLang($validated['lang'] ?? null, $message);

        // Layer 1 — local, instant, free.
        $local = $this->localAnswer($message, $lang);

        if ($local) {
            return response()->json([
                'answer' => $local['answer'],
                'sources' => $local['sources'],
                'layer' => 'local',
                'cached' => false,
            ]);
        }

        // Layer 2 — repeat questions, free.
        $hash = NoorCachedAnswer::hashFor($message, $lang);
        $cached = NoorCachedAnswer::query()->where('question_hash', $hash)->first();

        if ($cached) {
            $cached->increment('hits');

            return response()->json([
                'answer' => $cached->answer,
                'sources' => $cached->sources ?? [],
                'layer' => 'cache',
                'cached' => true,
            ]);
        }

        // Layer 3 — the model, only for genuinely new questions.
        $answer = $this->askGroq($message, $lang);

        if ($answer) {
            try {
                NoorCachedAnswer::query()->create([
                    'question_hash' => $hash,
                    'question' => mb_substr($message, 0, 2000),
                    'lang' => $lang,
                    'answer' => $answer['answer'],
                    'sources' => $answer['sources'],
                ]);
            } catch (\Throwable $exception) {
                report($exception);
            }

            return response()->json([
                'answer' => $answer['answer'],
                'sources' => $answer['sources'],
                'layer' => 'groq',
                'cached' => false,
            ]);
        }

        // Silent fallback — model unreachable, unconfigured, or refused.
        return response()->json([
            'answer' => $this->fallbackAnswer($lang),
            'sources' => [],
            'layer' => 'fallback',
            'cached' => false,
        ]);
    }

    /**
     * en, lg (Luganda), ar — explicit choice wins, else sniff the message.
     */
    protected function resolveLang(?string $requested, string $message): string
    {
        $requested = strtolower(trim((string) $requested));

        if (in_array($requested, ['en', 'lg', 'ar'], true)) {
            return $requested;
        }

        if (preg_match('/[\x{0600}-\x{06FF}]/u', $message)) {
            return 'ar';
        }

        $lower = mb_strtolower($message);

        foreach (['oli otya', 'gyoli', 'oli ani', 'webare', 'tukwatagana', 'ssaala', 'kuran', 'kurani', 'hadithi', 'omusiraamu', 'katonda', 'oyagala', 'bulungi', 'neeza', 'ntegeeza'] as $marker) {
            if (str_contains($lower, $marker)) {
                return 'lg';
            }
        }

        return 'en';
    }

    /**
     * Instant local answers: [answer, sources[]] or null to continue down
     * the pipeline.
     */
    protected function localAnswer(string $message, string $lang): ?array
    {
        $lower = mb_strtolower(trim($message));
        $short = mb_substr(preg_replace('/[^\p{L}\p{N}\s]/u', '', $lower) ?? '', 0, 60);

        $greetings = ['hello', 'hi', 'hey', 'salam', 'assalamu', 'as-salamu', 'assalamu alaykum', 'morning', 'evening', 'oli otya', 'gyoli', 'ki kati', 'webare', 'tusanyukidde', 'صباح', 'مساء', 'سلام'];

        foreach ($greetings as $greeting) {
            if ($short === $greeting || str_starts_with($short, $greeting.' ')) {
                return [
                    'answer' => $this->t($lang, [
                        'en' => "Wa alaykum as-salam! I am **Noor**, your House of Guidance companion.\n\nAsk me about Islam, the Qur'an, Hadith, prayer times, or anything in this app — in English, Luganda, or Arabic.\n\nTry one below, or just type your question.",
                        'lg' => "Wa alaykum as-salam! Nze **Noor**, munno wo mu House of Guidance.\n\nMbuuza ku ddiini, Kur’an, Hadith, essaala, oba ekintu kyonna mu app eno — mu Lungereza, Luganda, oba Luwarabu.\n\nLonda wansi, oba wandika ekibuuzo kyo.",
                        'ar' => "وعليكم السلام! أنا **نور**، رفيقك في بيت الهداية.\n\nاسألني عن الإسلام، والقرآن، والحديث، ومواقيت الصلاة، أو أي شيء في هذا التطبيق — بالإنجليزية أو اللوغندية أو العربية.",
                    ]),
                    'sources' => [],
                ];
            }
        }

        $topics = [
            'prayer' => ['prayer', 'salah', 'salaah', 'swallah', 'swala', 'ssaala', 'essaala', 'pray', 'namaz', 'صلاة', 'مواقيت'],
            'quran' => ['quran', "qur'an", 'koran', 'kuran', 'kurani', 'recit', 'soma kuran', 'قرآن', 'quran room'],
            'hadith' => ['hadith', 'hadithi', 'hadis', 'sunnah', 'sunna', 'حديث'],
            'qiblah' => ['qiblah', 'qibla', 'kibla', 'direction', 'قبلة'],
            'dua' => ['dua', 'duas', 'du‘a', 'supplication', 'prayer for', 'دعاء'],
            'rooms' => ['room', 'rooms', 'yassarna', 'tajweed', 'hifdh', 'community', 'ekibiina'],
            'verify' => ['verif', 'confirm email', 'kakasa'],
            'admin' => ['admin', 'claim', 'become admin', 'moderator'],
            'calls' => ['call', 'voice', 'video', 'phone', 'speak', 'okwogera'],
            'who' => ['who are you', 'your name', 'oli ani', 'what is noor', 'what are you', 'about yourself', 'من أنت'],
            'help' => ['help', 'menu', 'what can you', 'oyamba ki', 'oyinza ki', 'options', 'commands', 'مساعدة'],
            'thanks' => ['thank', 'thanks', 'shukran', 'webare', 'mwebare', 'jazak', 'jazakallah', 'شكرا'],
        ];

        foreach ($topics as $topic => $markers) {
            foreach ($markers as $marker) {
                if (str_contains($lower, $marker)) {
                    return $this->topicAnswer($topic, $lang);
                }
            }
        }

        return null;
    }

    protected function topicAnswer(string $topic, string $lang): array
    {
        $link = fn (string $label, string $url) => ['label' => $label, 'url' => $url];

        return match ($topic) {
            'prayer' => [
                'answer' => $this->t($lang, [
                    'en' => "Prayer times are one tap away.\n\nOpen **Prayer Times**, allow your location (or enter your city), and you will see today's five prayers with a live countdown. Save your home location in **Settings → Daily reminders** and I will nudge you before each prayer.",
                    'lg' => "Essaala ziri okumpi.\n\nGgulawo **Prayer Times**, kkriza ekifo kyo (oba ossaamu ekibuga kyo), olabe essaala ettaano eza leero n'okubala okudda emabega. Teeka ekifo kyo mu **Settings → Daily reminders** nange nzija okukujukiza ng buli ssaala etuuse.",
                    'ar' => "مواقيت الصلاة على بعد نقرة واحدة.\n\nافتح **مواقيت الصلاة**، واسمح بموقعك (أو أدخل مدينتك)، وسترى صلوات اليوم الخمس مع عدّاد مباشر.",
                ]),
                'sources' => [$link('Prayer Times', '/islamic/prayer-times')],
            ],
            'quran' => [
                'answer' => $this->t($lang, [
                    'en' => "The Qur'an section is the heart of this app.\n\n- **Read** the full Arabic text with translation\n- **Listen** to beautiful recitation, verse by verse\n- **Bookmark** verses and track your reading progress\n\nStart with today's verse on your home screen, or open the reader now.",
                    'lg' => "Ekitabo kya Kur’an y'omutima gw'app eno.\n\n- **Soma** ennukuta zonna ez'oluwarabu n'okuvvuunula\n- **Wuliriza** okusoma okulungi, aya ku aya\n- **Teekako akabonero** ku aya era olondoole entambula yo\n\nTandika n'aya ya leero, oba ggulawo omusomi kaakano.",
                    'ar' => "قسم القرآن هو قلب هذا التطبيق.\n\n- **اقرأ** النص العربي الكامل مع الترجمة\n- **استمع** إلى تلاوة جميلة آيةً آية\n- **احفظ** الآيات وتتبّع تقدمك في القراءة",
                ]),
                'sources' => [$link("Qur'an Reader", '/islamic/quran/read'), $link("Qur'an", '/islamic/quran')],
            ],
            'hadith' => [
                'answer' => $this->t($lang, [
                    'en' => "Our Hadith library holds four verified collections, including Riyad as-Salihin and the Forty Hadith.\n\nOpen the library, pick a book, and read each hadith on its own page with Arabic text, translation, grade, and Previous/Next walking the book's true order.",
                    'lg' => "Laiburale yaffe eya Hadith erimu ebitabo bina ebikakasiddwa, omuli Riyad as-Salihin ne Hadith amakumi ana.\n\nGgulawo laiburale, londa ekitabo, era osome buli hadith ku lupapula lwayo n'oluwarabu, ennyinyonnyola, n'obukulu bwayo.",
                    'ar' => "تحتوي مكتبة الحديث لدينا على أربعة كتب موثوقة، منها رياض الصالحين والأربعون النووية.\n\nافتح المكتبة واختر كتابًا، واقرأ كل حديث في صفحته مع النص العربي والترجمة والدرجة.",
                ]),
                'sources' => [$link('Hadith Library', '/islamic/hadith')],
            ],
            'qiblah' => [
                'answer' => $this->t($lang, [
                    'en' => "Need the prayer direction?\n\nOpen **Qiblah**, allow your location, and follow the compass to Makkah. It works with your device's orientation — hold the phone flat for the best reading.",
                    'lg' => "Wetaaga endagiriro y'essaala?\n\nGgulawo **Qiblah**, kkiriza ekifo kyo, era ogoberere ekkomba okutuuka e Makkah.",
                    'ar' => "تحتاج اتجاه الصلاة؟\n\nافتح **القبلة**، واسمح بموقعك، واتبع البوصلة نحو مكة.",
                ]),
                'sources' => [$link('Qiblah', '/islamic/qiblah')],
            ],
            'dua' => [
                'answer' => $this->t($lang, [
                    'en' => "Du'as for every moment live in the **Dua Library** — morning and evening, before meals, travel, hardship, and gratitude.\n\nEach dua opens on its own page with Arabic, transliteration, and translation. Tap any card to read it fully.",
                    'lg' => "Ensaala za buli kiseera ziri mu **Dua Library** — ez'enkya n'ez'akawungeezi, nga tonnaba kulya, mu lugendo, mu bizibu, n'okwebaza.\n\nBuli dua egguka ku lupapula lwayo n'oluwarabu n'okuvvuunula.",
                    'ar' => "أدعية كل لحظة في **مكتبة الأدعية** — الصباح والمساء، وقبل الطعام، والسفر، والشدة، والشكر.\n\nكل دعاء يفتح في صفحته مع العربية والنطق والترجمة.",
                ]),
                'sources' => [$link('Dua Library', '/islamic/duas')],
            ],
            'rooms' => [
                'answer' => $this->t($lang, [
                    'en' => "Learning is better together.\n\nJoin the **Quran Room** to read and reflect, or the **Yassarna Room** to practise reading. Every member can start a voice or video circle — no admin needed.",
                    'lg' => "Okuyiga kulungi awamu.\n\nYingira **Quran Room** osobeko era ofumiitirize, oba **Yassarna Room** okole okusoma. Buli mmemba asobola okutandika olukiiko lw'eddoboozi oba vidiyo.",
                    'ar' => "التعلّم أجمل معًا.\n\nانضم إلى **غرفة القرآن** للقراءة والتدبر، أو **غرفة يسّرنا** للتدرب على القراءة.",
                ]),
                'sources' => [$link('Learning Rooms', '/rooms')],
            ],
            'verify' => [
                'answer' => $this->t($lang, [
                    'en' => "Verifying is easy — and you have two ways:\n\n1. **Link way:** open the verification email and tap the button.\n2. **Code way:** the same email carries a 6-digit code — type it on the Verify page, no link needed.\n\nCodes last 30 minutes; resend anytime for a fresh one.",
                    'lg' => "Okukakasa kyangu — era olina engeri bbiri:\n\n1. **Link:** ggulawo email y'okukakasa otunye ku button.\n2. **Koodi:** email y'emu erimu koodi ya namba mukaaga — giteeke ku lupapula lwa Verify.\n\nKoodi emala eddakiika 30; saba endala empya buli kiseera.",
                    'ar' => "التحقق سهل — ولديك طريقتان:\n\n1. **الرابط:** افتح بريد التحقق واضغط الزر.\n2. **الرمز:** البريد نفسه يحمل رمزًا من 6 أرقام — أدخله في صفحة التحقق.",
                ]),
                'sources' => [$link('Verify Email', '/verify-email')],
            ],
            'admin' => [
                'answer' => $this->t($lang, [
                    'en' => "Admin access is granted person to person.\n\nThe very first admin is claimed once through a guarded setup page; after that, only an existing admin can make another member admin from the Admin panel. There are no master passwords and no backdoors — by design.",
                    'lg' => "Obuyinza bwa admin buweebwa omuntu ku muntu.\n\nAdmin asooka yeekakasa omulundi gumu gwokka; oluvannyuma, admin aliwo y'ayinzika okuwa omulala obuyinza. Teri paasword enkulu — ekyo kyakigendererwa.",
                    'ar' => "صلاحية الإدارة تُمنح من شخص لشخص.\n\nأول مشرف يُعتمد مرة واحدة عبر صفحة إعداد محمية؛ وبعدها لا يمنح الصلاحية إلا مشرف موجود.",
                ]),
                'sources' => [],
            ],
            'calls' => [
                'answer' => $this->t($lang, [
                    'en' => "Voice and video calls work one-to-one, in groups, and in rooms.\n\nOpen any chat, tap **Audio call** or **Video call**, and answer from the ringing screen — or enable push in Settings and your phone will ring even with the app closed.",
                    'lg' => "Okukubira n'okulaba (vidiyo) kukola omuntu ku muntu, mu bibinja, ne mu rooms.\n\nGgulawo chat yonna, tunya **Audio call** oba **Video call**. Kozesa push mu Settings, essimu yo ejja okukukubira n'app eggaddwa.",
                    'ar' => "المكالمات الصوتية والمرئية تعمل بين شخصين وفي المجموعات والغرف.\n\nافتح أي محادثة واضغط مكالمة صوتية أو مرئية.",
                ]),
                'sources' => [],
            ],
            'who' => [
                'answer' => $this->t($lang, [
                    'en' => "I am **Noor** — light — the companion of House of Guidance Chat.\n\nI answer questions about Islam and guide you around this app: Qur'an, Hadith, prayer times, rooms, calls, and settings. I speak English, Luganda, and Arabic — just write to me in yours.",
                    'lg' => "Nze **Noor** — ekitangaala — munno wo mu House of Guidance Chat.\n\nNziramu ebibuuzo ku ddiini era nkuluŋŋamya mu app eno: Kur’an, Hadith, essaala, rooms, n'entegeka. Njogera Lungereza, Luganda, n'Oluwarabu — mpandiikira mu lulimi lwo.",
                    'ar' => "أنا **نور** — رفيق دردشة بيت الهداية.\n\nأجيب عن أسئلة الإسلام وأرشدك في هذا التطبيق: القرآن، الحديث، الصلاة، الغرف، والمكالمات.",
                ]),
                'sources' => [],
            ],
            'thanks' => [
                'answer' => $this->t($lang, [
                    'en' => "Wa iyyakum — you are most welcome! May Allah bless your learning. Ask me anything, anytime.",
                    'lg' => "Tukwataganye — oli muyaanidwa nnyo! Katonda akuwe omukisa mu kuyiga kwo. Mbuuza kyonna, buli kiseera.",
                    'ar' => "وإياكم — على الرحب والسعة! بارك الله في تعلّمك.",
                ]),
                'sources' => [],
            ],
            default => [
                'answer' => $this->t($lang, [
                    'en' => "I can help with that and more.\n\nTry asking about prayer times, the Qur'an, Hadith, duas, rooms, calls, or tap a suggestion below to explore.",
                    'lg' => "Nsasula ekyo n'ebirala.\n\nGezaako okumbuuza ku ssaala, Kur’an, Hadith, duas, rooms, oba okukubira — oba londa wansi okunoonyereza.",
                    'ar' => "يمكنني المساعدة في ذلك والمزيد.\n\nجرّب السؤال عن الصلاة أو القرآن أو الحديث أو الغرف.",
                ]),
                'sources' => [],
            ],
        };
    }

    protected function t(string $lang, array $versions): string
    {
        return $versions[$lang] ?? $versions['en'];
    }

    /**
     * Ask Groq (OpenAI-compatible). Returns [answer, sources] or null so
     * the caller falls back silently. Never throws outward.
     */
    protected function askGroq(string $message, string $lang): ?array
    {
        $key = trim((string) config('services.groq.key'));

        if ($key === '') {
            return null;
        }

        $langName = ['en' => 'English', 'lg' => 'Luganda', 'ar' => 'Arabic'][$lang] ?? 'English';

        $system = "You are Noor, the warm companion of the House of Guidance Chat app, a Muslim community learning platform with Qur'an reader, Hadith library (4 verified books), dua library, prayer times, Qiblah, learning rooms (Quran Room, Yassarna Room), group and private chats with voice/video calls, events, and reminders.\n"
            ."Respond in {$langName} (match the user's language exactly, including Luganda and Arabic with proper script).\n"
            ."Format beautifully for reading: short paragraphs separated by blank lines, **bold** for key terms, simple dashes for lists. Keep answers focused and warm, rarely longer than 180 words.\n"
            .'Ground Islamic content in Qur\'an and authentic Sunnah with brief references like (Qur’an 2:152); never invent verses or hadith wording — if unsure, say so and suggest asking a local scholar. '
            .'You give friendly religious guidance, not binding fatwas: for rulings people must act on, advise consulting a qualified scholar. '
            .'Be respectful to all; never produce extremist, hateful, or harassing content. '
            .'For app questions, point to the right page by name (Home, Rooms, Hadith, Settings).';

        try {
            $response = Http::timeout(25)
                ->withHeaders([
                    'Authorization' => 'Bearer '.$key,
                    'Content-Type' => 'application/json',
                ])
                ->post(rtrim((string) config('services.groq.base_url'), '/').'/chat/completions', [
                    'model' => trim((string) config('services.groq.model')),
                    'temperature' => 0.6,
                    'max_tokens' => 800,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $message],
                    ],
                ]);

            if (! $response->successful()) {
                Log::warning('Noor model request rejected.', ['status' => $response->status()]);

                return null;
            }

            $text = trim((string) $response->json('choices.0.message.content'));

            if ($text === '') {
                return null;
            }

            return ['answer' => $text, 'sources' => [['label' => 'Answered by Noor AI', 'url' => '/noor']]];
        } catch (\Throwable $exception) {
            report($exception);

            return null;
        }
    }

    protected function fallbackAnswer(string $lang): string
    {
        return $this->t($lang, [
            'en' => "I could not reach my wider knowledge just now — but I am still here.\n\nAsk me about prayer times, the Qur'an, Hadith, duas, rooms, or anything in this app, and try your question again in a moment.",
            'lg' => "Saasobola kutuuka ku bumanyi bwange obunene kaakano — naye nkyali wano.\n\nMbuuza ku ssaala, Kur’an, Hadith, duas, oba ekintu mu app eno, era oddemu ekibuuzo kyo akaseera.",
            'ar' => "تعذّر الوصول إلى معرفتي الأوسع الآن — لكنني ما زلت هنا.\n\nاسألني عن الصلاة أو القرآن أو الحديث أو أي شيء في التطبيق وحاول مجددًا بعد قليل.",
        ]);
    }
}
