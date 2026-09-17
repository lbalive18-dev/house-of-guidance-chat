import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Play,
  Search,
  Sparkles,
  StickyNote,
} from 'lucide-react';
import {
  bookmarkQuranAyah,
  fetchQuranBookmarks,
  fetchQuranProgress,
  fetchQuranReciters,
  fetchQuranSurah,
  fetchQuranSurahs,
  removeQuranBookmark,
  saveQuranProgress,
} from '@/lib/islamicApi';
import type {
  QuranBookmark,
  QuranReciter,
  QuranSurah,
  QuranSurahDetail,
} from '@/types/islamic';

export default function QuranPage() {
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [reciters, setReciters] = useState<QuranReciter[]>([]);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [surah, setSurah] = useState<QuranSurahDetail | null>(null);
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [lastAyahNumber, setLastAyahNumber] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [reciter, setReciter] = useState('mishary-rashid-alafasy');
  const [showTranslation, setShowTranslation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [savingAyah, setSavingAyah] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [audioError, setAudioError] = useState<number | null>(null);

  const ayahRefs = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    async function loadQuran() {
      try {
        setLoading(true);
        setError('');

        const [surahList, reciterList, bookmarkList] = await Promise.all([
          fetchQuranSurahs(),
          fetchQuranReciters(),
          fetchQuranBookmarks(),
        ]);

        setSurahs(surahList);
        setReciters(reciterList);
        setBookmarks(bookmarkList);
      } catch (err) {
        console.error(err);
        setError('Unable to load Quran data.');
      } finally {
        setLoading(false);
      }
    }

    loadQuran();
  }, []);

  useEffect(() => {
    async function loadSurah() {
      try {
        setLoadingSurah(true);
        setError('');
        setAudioError(null);
        setLastAyahNumber(null);

        const [result, progress] = await Promise.all([
          fetchQuranSurah(selectedSurah, {
            ...(showTranslation
              ? {
                  language: 'en',
                  translator: 'Mohammed Marmaduke Pickthall',
                }
              : {}),
            reciter,
          }),
          fetchQuranProgress(selectedSurah),
        ]);

        setSurah(result);
        setLastAyahNumber(progress?.last_ayah_number ?? null);
      } catch (err) {
        console.error(err);
        setError('Unable to load this Surah.');
      } finally {
        setLoadingSurah(false);
      }
    }

    loadSurah();
  }, [selectedSurah, reciter, showTranslation]);

  const filteredSurahs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return surahs;

    return surahs.filter(
      (item) =>
        item.name_english.toLowerCase().includes(query) ||
        item.name_transliterated.toLowerCase().includes(query) ||
        item.name_arabic.includes(query) ||
        String(item.number).includes(query),
    );
  }, [search, surahs]);

  const currentSurahIndex = surahs.findIndex(
    (item) => item.number === selectedSurah,
  );

  const previousSurah =
    currentSurahIndex > 0 ? surahs[currentSurahIndex - 1] : null;

  const nextSurah =
    currentSurahIndex >= 0 && currentSurahIndex < surahs.length - 1
      ? surahs[currentSurahIndex + 1]
      : null;

  const progressPercent =
    surah && lastAyahNumber
      ? Math.min(
          100,
          Math.round(
            (lastAyahNumber / Math.max(surah.verses_count, 1)) * 100,
          ),
        )
      : 0;

  const bookmarkForAyah = (ayahId: number) =>
    bookmarks.find((bookmark) => bookmark.ayah_id === ayahId);

  const hasVerifiedAudio =
    !!surah && (surah.ayahs ?? []).some((ayah) => ayah.audio?.[0]?.audio_url);

  async function toggleBookmark(
    ayahId: number,
    existingBookmark: QuranBookmark | undefined,
  ) {
    try {
      setSavingAyah(ayahId);
      setError('');

      if (existingBookmark) {
        await removeQuranBookmark(ayahId);
        setBookmarks((current) =>
          current.filter((bookmark) => bookmark.ayah_id !== ayahId),
        );
        return;
      }

      const note = window.prompt(
        'Add a note for this bookmark (optional):',
        '',
      );

      const created = await bookmarkQuranAyah(
        ayahId,
        note?.trim() ? note.trim() : null,
      );

      setBookmarks((current) => [
        created,
        ...current.filter((bookmark) => bookmark.ayah_id !== ayahId),
      ]);
    } catch (err) {
      console.error(err);
      setError('Unable to update the bookmark.');
    } finally {
      setSavingAyah(null);
    }
  }

  async function saveProgress(ayahNumber: number, completed = false) {
    if (!surah) return;

    try {
      setSavingAyah(ayahNumber);
      await saveQuranProgress(surah.number, ayahNumber, completed);
      setLastAyahNumber(ayahNumber);
    } catch (err) {
      console.error(err);
      setError('Unable to save reading progress.');
    } finally {
      setSavingAyah(null);
    }
  }

  function continueReading() {
    if (!lastAyahNumber) return;

    const element = ayahRefs.current[lastAyahNumber];

    element?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  return (
    <div className="min-h-screen bg-[#f6f8f4] dark:bg-slate-950">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0c4a3b] via-[#116149] to-[#08352c] text-white">
        <div className="relative mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium">
                <Sparkles className="h-4 w-4" />
                House of Guidance Quran
              </div>

              <h1 className="text-4xl font-bold md:text-5xl">
                Read the Noble Quran
              </h1>

              <p
                dir="rtl"
                lang="ar"
                className="mt-4 text-3xl text-emerald-50 md:text-4xl"
              >
                الْقُرْآنُ الْكَرِيمُ
              </p>

              <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-50/80 md:text-base">
                Read the Qur’an in Arabic, listen to recitations, and turn on
                the English translation when needed.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {lastAyahNumber && surah && (
                  <button
                    type="button"
                    onClick={continueReading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold"
                  >
                    <Play className="h-4 w-4" />
                    Continue from Ayah {lastAyahNumber}
                  </button>
                )}
                <Link
                  to="/islamic/quran/read"
                  className="inline-flex items-center gap-2 rounded-2xl bg-amber-300/90 px-4 py-3 text-sm font-bold text-emerald-950"
                >
                  <BookOpen className="h-4 w-4" />
                  Open book view
                </Link>
              </div>
            </div>

            <BookOpen className="hidden h-16 w-16 md:block" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-8 rounded-3xl bg-white p-4 shadow-sm dark:bg-slate-900 md:p-5">
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Surah by name or number..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="relative">
              <select
                value={selectedSurah}
                onChange={(event) =>
                  setSelectedSurah(Number(event.target.value))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {surahs.map((item) => (
                  <option key={item.id} value={item.number}>
                    {item.number}. {item.name_english}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" />
            </div>

            <div className="relative">
              <select
                value={reciter}
                onChange={(event) => setReciter(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {reciters.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-800">
              <div>
                <p className="text-sm font-semibold">Translation</p>
                <p className="text-xs text-slate-500">
                  {showTranslation ? 'Pickthall enabled' : 'Arabic only'}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={showTranslation}
                onClick={() =>
                  setShowTranslation((current) => !current)
                }
                className={`relative h-7 w-12 rounded-full ${
                  showTranslation ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${
                    showTranslation ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {surah && !hasVerifiedAudio && !loadingSurah && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              Recitation audio is verified for Mishary Alafasy — unavailable for the selected reciter.
            </div>
          )}

          {surah && (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Reading progress
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {lastAyahNumber
                      ? `Last read: Ayah ${lastAyahNumber} of ${surah.verses_count}`
                      : 'No reading progress saved yet'}
                  </p>
                </div>

                <span className="font-bold text-emerald-700">
                  {progressPercent}%
                </span>
              </div>

              <div className="mt-2 h-2 rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-7 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-3xl bg-white p-4 shadow-sm dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold">Surahs</h2>
                  <p className="text-xs text-slate-500">
                    {surahs.length || 114} chapters
                  </p>
                </div>
                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>

              <div className="max-h-[65vh] space-y-1 overflow-y-auto">
                {loading ? (
                  <p className="py-6 text-center text-sm text-slate-500">
                    Loading...
                  </p>
                ) : (
                  filteredSurahs.map((item) => {
                    const active = item.number === selectedSurah;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedSurah(item.number)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${
                          active
                            ? 'bg-emerald-700 text-white'
                            : 'hover:bg-emerald-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 text-xs font-bold">
                          {item.number}
                        </span>

                        <span className="flex-1">
                          <span className="block text-sm font-semibold">
                            {item.name_english}
                          </span>
                          <span className="text-[11px] opacity-70">
                            {item.verses_count} Ayahs
                          </span>
                        </span>

                        <span dir="rtl" className="text-lg">
                          {item.name_arabic}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            {loadingSurah ? (
              <div className="rounded-3xl bg-white p-16 text-center dark:bg-slate-900">
                <BookOpen className="mx-auto mb-4 h-10 w-10 animate-pulse text-emerald-600" />
                <p className="text-sm text-slate-500">
                  Opening the Quran...
                </p>
              </div>
            ) : surah ? (
              <>
                <div className="mb-6 rounded-[2rem] bg-gradient-to-br from-emerald-900 to-emerald-700 p-7 text-center text-white shadow-lg md:p-10">
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">
                    Surah {surah.number}
                  </p>

                  <h2
                    dir="rtl"
                    lang="ar"
                    className="mt-4 text-4xl md:text-5xl"
                  >
                    {surah.name_arabic}
                  </h2>

                  <p className="mt-3 text-xl font-semibold">
                    {surah.name_english}
                  </p>

                  <p className="mt-2 text-sm text-emerald-100/80">
                    {surah.name_transliterated} • {surah.revelation_type} •{' '}
                    {surah.verses_count} Ayahs
                  </p>
                </div>

                <div className="mb-6 flex justify-between">
                  <button
                    type="button"
                    disabled={!previousSurah}
                    onClick={() =>
                      previousSurah &&
                      setSelectedSurah(previousSurah.number)
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-semibold disabled:opacity-40 dark:bg-slate-900"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={!nextSurah}
                    onClick={() =>
                      nextSurah && setSelectedSurah(nextSurah.number)
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-semibold disabled:opacity-40 dark:bg-slate-900"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {surah.number !== 9 && (
                  <div className="mb-6 rounded-3xl bg-white px-5 py-8 text-center shadow-sm dark:bg-slate-900">
                    <p
                      dir="rtl"
                      lang="ar"
                      className="text-3xl md:text-4xl"
                    >
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </p>
                  </div>
                )}

                <div className="space-y-5">
                  {(surah.ayahs ?? []).map((ayah) => {
                    const translation = showTranslation
                      ? ayah.translations?.[0]
                      : undefined;
                    const audio = ayah.audio?.[0];
                    const bookmark = bookmarkForAyah(ayah.id);
                    const isLastRead = lastAyahNumber === ayah.number;
                    const isSaving = savingAyah === ayah.number;

                    return (
                      <article
                        key={ayah.id}
                        ref={(element) => {
                          ayahRefs.current[ayah.number] = element;
                        }}
                        className={`rounded-3xl border bg-white p-5 shadow-sm dark:bg-slate-900 md:p-7 ${
                          isLastRead
                            ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                            {ayah.number}
                          </span>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                toggleBookmark(ayah.id, bookmark)
                              }
                              className="rounded-xl border px-3 py-2 text-xs font-semibold"
                            >
                              {bookmark ? (
                                <BookmarkCheck className="h-4 w-4" />
                              ) : (
                                <Bookmark className="h-4 w-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                saveProgress(
                                  ayah.number,
                                  ayah.number === surah.verses_count,
                                )
                              }
                              className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                            >
                              Save
                            </button>
                          </div>
                        </div>

                        {bookmark?.note && (
                          <div className="mb-5 flex gap-3 rounded-2xl bg-amber-50 p-4">
                            <StickyNote className="h-4 w-4 text-amber-600" />
                            <p className="text-sm">{bookmark.note}</p>
                          </div>
                        )}

                        {audio?.audio_url && (
                          <div className="mb-6 rounded-2xl bg-emerald-50 p-3">
                            <div className="mb-2 flex items-center gap-2">
                              <Headphones className="h-4 w-4 text-emerald-700" />
                              <span className="text-xs font-bold text-emerald-800">
                                {reciters.find(
                                  (item) => item.slug === reciter,
                                )?.name || 'Selected reciter'}
                              </span>
                            </div>

                            <audio
                              controls
                              preload="metadata"
                              src={audio.audio_url}
                              onError={() => setAudioError(ayah.number)}
                              onCanPlay={() =>
                                setAudioError((current) =>
                                  current === ayah.number ? null : current,
                                )
                              }
                              className="h-10 w-full"
                            />
                          </div>
                        )}

                        {audioError === ayah.number && (
                          <p className="mb-4 text-xs text-red-600">
                            This audio could not be played.
                          </p>
                        )}

                        <div className="rounded-2xl bg-[#fbfcf9] px-4 py-7 dark:bg-slate-950/60 md:px-8 md:py-9">
                          <p
                            dir="rtl"
                            lang="ar"
                            className="text-right text-3xl leading-[2.25] md:text-4xl"
                          >
                            {ayah.text_arabic}
                          </p>
                        </div>

                        {translation && (
                          <div className="mt-6 border-l-4 border-emerald-600 pl-4">
                            <p className="text-[11px] font-bold uppercase text-emerald-700">
                              {translation.translator}
                            </p>

                            <p className="mt-2 text-base leading-8 text-slate-700 dark:text-slate-300">
                              {translation.text}
                            </p>
                          </div>
                        )}

                        <div className="mt-6 flex justify-between border-t pt-4">
                          <p className="text-xs text-slate-400">
                            Ayah {ayah.number} of {surah.verses_count}
                          </p>

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              saveProgress(
                                ayah.number,
                                ayah.number === surah.verses_count,
                              )
                            }
                            className="text-xs font-semibold text-emerald-700"
                          >
                            {ayah.number === lastAyahNumber
                              ? '✓ Progress saved'
                              : 'Save my place here'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="rounded-3xl bg-white p-12 text-center dark:bg-slate-900">
                <BookOpen className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
                <p className="text-slate-500">
                  Select a Surah to begin reading.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}