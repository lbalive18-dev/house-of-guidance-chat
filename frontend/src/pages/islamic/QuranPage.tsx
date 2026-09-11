import { useEffect, useMemo, useRef, useState } from 'react';
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

  const [loading, setLoading] = useState(true);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [savingAyah, setSavingAyah] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [audioError, setAudioError] = useState<number | null>(null);

  // HTMLElement is intentionally used because the ref callback
  // is inferred as HTMLElement | null by React/TypeScript.
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
            language: 'en',
            translator: 'Mohammed Marmaduke Pickthall',
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
  }, [selectedSurah, reciter]);

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

  const currentSurahIndex = useMemo(
    () => surahs.findIndex((item) => item.number === selectedSurah),
    [surahs, selectedSurah],
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
          Math.round((lastAyahNumber / Math.max(surah.verses_count, 1)) * 100),
        )
      : 0;

  const bookmarkForAyah = (ayahId: number) =>
    bookmarks.find((bookmark) => bookmark.ayah_id === ayahId);

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
      setError('');

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

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8f4] dark:bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0c4a3b] via-[#116149] to-[#08352c] text-white">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-emerald-50 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                House of Guidance Quran
              </div>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Read the Noble Quran
              </h1>

              <p
                dir="rtl"
                lang="ar"
                className="mt-4 text-3xl leading-relaxed text-emerald-50 md:text-4xl"
              >
                القرآن الكريم
              </p>

              <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-50/80 md:text-base">
                Read the words of Allah in Arabic, understand their meaning
                through translation, and listen to beautiful recitations.
              </p>

              {lastAyahNumber && surah && (
                <button
                  type="button"
                  onClick={continueReading}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <Play className="h-4 w-4" />
                  Continue from Ayah {lastAyahNumber}
                </button>
              )}
            </div>

            <div className="hidden md:flex md:h-36 md:w-36 md:items-center md:justify-center md:rounded-[2rem] md:border md:border-white/10 md:bg-white/5 md:backdrop-blur">
              <BookOpen className="h-16 w-16 text-emerald-100" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="mb-8 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-5">
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Surah by name or number..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Surah */}
            <div className="relative">
              <select
                value={selectedSurah}
                onChange={(event) =>
                  setSelectedSurah(Number(event.target.value))
                }
                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-medium outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {surahs.map((item) => (
                  <option key={item.id} value={item.number}>
                    {item.number}. {item.name_english}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Reciter */}
            <div className="relative">
              <select
                value={reciter}
                onChange={(event) => setReciter(event.target.value)}
                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-medium outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {reciters.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Reading progress */}
          {surah && (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Reading progress
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {lastAyahNumber
                      ? `Last read: Ayah ${lastAyahNumber} of ${surah.verses_count}`
                      : 'No reading progress saved yet'}
                  </p>
                </div>

                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {progressPercent}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {lastAyahNumber && (
                <button
                  type="button"
                  onClick={continueReading}
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                >
                  <Play className="h-3.5 w-3.5" />
                  Continue reading
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-7 lg:grid-cols-[280px_1fr]">
          {/* Surah navigation */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    Surahs
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {surahs.length || 114} chapters
                  </p>
                </div>

                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>

              <div className="max-h-[65vh] space-y-1 overflow-y-auto pr-1">
                {loading ? (
                  <p className="px-3 py-6 text-center text-sm text-slate-500">
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
                        className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                          active
                            ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/10'
                            : 'text-slate-700 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                            active
                              ? 'bg-white/15 text-white'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                          }`}
                        >
                          {item.number}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {item.name_english}
                          </span>

                          <span
                            className={`block text-[11px] ${
                              active
                                ? 'text-emerald-100'
                                : 'text-slate-400'
                            }`}
                          >
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

          {/* Reader */}
          <main className="min-w-0">
            {loadingSurah ? (
              <div className="rounded-3xl bg-white p-16 text-center shadow-sm dark:bg-slate-900">
                <BookOpen className="mx-auto mb-4 h-10 w-10 animate-pulse text-emerald-600" />

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Opening the Quran...
                </p>
              </div>
            ) : surah ? (
              <>
                {/* Surah title */}
                <div className="mb-6 overflow-hidden rounded-[2rem] border border-emerald-900/10 bg-gradient-to-br from-emerald-900 to-emerald-700 p-7 text-white shadow-lg md:p-10">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">
                      Surah {surah.number}
                    </p>

                    <h2
                      dir="rtl"
                      lang="ar"
                      className="mt-4 text-4xl font-semibold leading-relaxed md:text-5xl"
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
                </div>

                {/* Previous / Next */}
                <div className="mb-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={!previousSurah}
                    onClick={() =>
                      previousSurah &&
                      setSelectedSurah(previousSurah.number)
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <ChevronLeft className="h-4 w-4" />

                    <span className="hidden sm:inline">
                      {previousSurah
                        ? `${previousSurah.number}. ${previousSurah.name_english}`
                        : 'Previous'}
                    </span>

                    <span className="sm:hidden">Previous</span>
                  </button>

                  <button
                    type="button"
                    disabled={!nextSurah}
                    onClick={() =>
                      nextSurah && setSelectedSurah(nextSurah.number)
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <span className="hidden sm:inline">
                      {nextSurah
                        ? `${nextSurah.number}. ${nextSurah.name_english}`
                        : 'Next'}
                    </span>

                    <span className="sm:hidden">Next</span>

                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Bismillah */}
                {surah.number !== 9 && (
                  <div className="mb-6 rounded-3xl border border-emerald-100 bg-white px-5 py-8 text-center shadow-sm dark:border-emerald-950 dark:bg-slate-900">
                    <p
                      dir="rtl"
                      lang="ar"
                      className="text-3xl leading-loose text-slate-800 dark:text-slate-100 md:text-4xl"
                    >
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </p>
                  </div>
                )}

                {/* Ayahs */}
                <div className="space-y-5">
                  {surah.ayahs.map((ayah) => {
                    const translation = ayah.translations[0];
                    const audio = ayah.audio[0];
                    const bookmark = bookmarkForAyah(ayah.id);
                    const isLastRead = lastAyahNumber === ayah.number;
                    const isSaving = savingAyah === ayah.number;

                    return (
                      <article
                        key={ayah.id}
                        ref={(element) => {
                          ayahRefs.current[ayah.number] = element;
                        }}
                        className={`group rounded-3xl border bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-slate-900 md:p-7 ${
                          isLastRead
                            ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                            : 'border-slate-200/80 dark:border-slate-800'
                        }`}
                      >
                        {/* Ayah header */}
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              {ayah.number}
                            </span>

                            {isLastRead && (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                Last read
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Bookmark */}
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                toggleBookmark(ayah.id, bookmark)
                              }
                              title={
                                bookmark
                                  ? 'Remove bookmark'
                                  : 'Bookmark this Ayah'
                              }
                              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition disabled:opacity-50 ${
                                bookmark
                                  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {bookmark ? (
                                <BookmarkCheck className="h-4 w-4" />
                              ) : (
                                <Bookmark className="h-4 w-4" />
                              )}

                              <span className="hidden sm:inline">
                                {bookmark ? 'Bookmarked' : 'Bookmark'}
                              </span>
                            </button>

                            {/* Save progress */}
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                saveProgress(
                                  ayah.number,
                                  ayah.number === surah.verses_count,
                                )
                              }
                              title="Save reading progress"
                              className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                            >
                              <BookOpen className="h-4 w-4" />

                              <span className="hidden sm:inline">
                                {ayah.number === surah.verses_count
                                  ? 'Complete'
                                  : 'Mark as read'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Bookmark note */}
                        {bookmark?.note && (
                          <div className="mb-5 flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                Bookmark note
                              </p>

                              <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-200">
                                {bookmark.note}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Audio */}
                        {audio?.audio_url && (
                          <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-950 dark:bg-emerald-950/20">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <div className="flex items-center gap-2">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
                                  <Headphones className="h-4 w-4" />
                                </span>

                                <div>
                                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                    Audio Recitation
                                  </p>

                                  <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
                                    {reciters.find(
                                      (item) => item.slug === reciter,
                                    )?.name || 'Selected reciter'}
                                  </p>
                                </div>
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
                                className="h-10 w-full min-w-0 sm:flex-1"
                              >
                                Your browser does not support audio playback.
                              </audio>
                            </div>

                            {audioError === ayah.number && (
                              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                This recitation could not be played. The audio
                                source may be unavailable.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Arabic */}
                        <div className="rounded-2xl bg-[#fbfcf9] px-4 py-7 dark:bg-slate-950/60 md:px-8 md:py-9">
                          <p
                            dir="rtl"
                            lang="ar"
                            className="text-right text-3xl leading-[2.25] text-slate-900 dark:text-white md:text-4xl"
                          >
                            {ayah.text_arabic}
                          </p>
                        </div>

                        {/* Translation */}
                        {translation && (
                          <div className="mt-6 border-l-4 border-emerald-600 pl-4 md:pl-5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                              {translation.translator}
                            </p>

                            <p className="mt-2 text-base leading-8 text-slate-700 dark:text-slate-300 md:text-lg md:leading-9">
                              {translation.text}
                            </p>
                          </div>
                        )}

                        {/* Ayah progress action */}
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
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
                            className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-800 disabled:opacity-50 dark:text-emerald-400"
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

                <p className="text-slate-500 dark:text-slate-400">
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