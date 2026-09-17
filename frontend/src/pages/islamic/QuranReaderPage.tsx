import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Pause,
  Play,
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
import QuranAudioPlayer from '@/components/islamic/QuranAudioPlayer';
import type {
  QuranBookmark,
  QuranReciter,
  QuranSurah,
  QuranSurahDetail,
} from '@/types/islamic';

const DEFAULT_RECITER = 'mishary-rashid-alafasy';

export default function QuranReaderPage() {
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [reciters, setReciters] = useState<QuranReciter[]>([]);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [surah, setSurah] = useState<QuranSurahDetail | null>(null);
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [lastAyahNumber, setLastAyahNumber] = useState<number | null>(null);
  const [positionAyah, setPositionAyah] = useState(1);
  const [reciter, setReciter] = useState(DEFAULT_RECITER);
  const [showTranslation, setShowTranslation] = useState(false);
  const [activeAyah, setActiveAyah] = useState<number | null>(null);
  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const [audioErrorAyah, setAudioErrorAyah] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [error, setError] = useState('');

  const ayahRefs = useRef<Record<number, HTMLElement | null>>({});
  const indexOpen = useRef(false);
  const [, forceIndex] = useState(false);

  useEffect(() => {
    async function loadLibrary() {
      try {
        const [surahList, reciterList, bookmarkList] = await Promise.all([
          fetchQuranSurahs(),
          fetchQuranReciters(),
          fetchQuranBookmarks(),
        ]);
        setSurahs(surahList);
        setReciters(reciterList);
        setBookmarks(bookmarkList);
      } catch {
        setError('Unable to load the Qur’an library.');
      } finally {
        setLoading(false);
      }
    }

    loadLibrary();
  }, []);

  useEffect(() => {
    async function loadSurah() {
      try {
        setLoadingSurah(true);
        setError('');
        setActiveAyah(null);
        setAutoPlayNext(false);
        setAudioErrorAyah(null);

        const [result, progress] = await Promise.all([
          fetchQuranSurah(selectedSurah, {
            ...(showTranslation
              ? { language: 'en', translator: 'Mohammed Marmaduke Pickthall' }
              : {}),
            reciter,
          }),
          fetchQuranProgress(selectedSurah),
        ]);

        setSurah(result);
        setLastAyahNumber(progress?.last_ayah_number ?? null);
        setPositionAyah(progress?.last_ayah_number ?? 1);
      } catch {
        setError('Unable to open this Surah.');
      } finally {
        setLoadingSurah(false);
      }
    }

    loadSurah();
  }, [selectedSurah, reciter, showTranslation]);

  useEffect(() => {
    if (!surah) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop,
          )[0];

        if (visible) {
          const ayahNumber = Number((visible.target as HTMLElement).dataset.ayah);
          if (!Number.isNaN(ayahNumber)) setPositionAyah(ayahNumber);
        }
      },
      { rootMargin: '-40% 0px -50% 0px' },
    );

    Object.values(ayahRefs.current).forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [surah]);

  const reciterName = useMemo(
    () => reciters.find((item) => item.slug === reciter)?.name ?? 'Selected reciter',
    [reciters, reciter],
  );

  const activeAudioSrc = useMemo(() => {
    if (!surah || activeAyah === null) return null;
    const ayah = (surah.ayahs ?? []).find((item) => item.number === activeAyah);
    return ayah?.audio?.[0]?.audio_url ?? null;
  }, [surah, activeAyah]);

  const bookmarkForAyah = (ayahId: number) =>
    bookmarks.find((bookmark) => bookmark.ayah_id === ayahId);

  async function toggleBookmark(ayahId: number, existing: QuranBookmark | undefined) {
    try {
      if (existing) {
        await removeQuranBookmark(ayahId);
        setBookmarks((current) => current.filter((b) => b.ayah_id !== ayahId));
        return;
      }

      const note = window.prompt('Add a note for this bookmark (optional):', '');
      const created = await bookmarkQuranAyah(ayahId, note?.trim() ? note.trim() : null);
      setBookmarks((current) => [created, ...current.filter((b) => b.ayah_id !== ayahId)]);
    } catch {
      setError('Unable to update the bookmark.');
    }
  }

  async function saveProgress(ayahNumber: number, completed = false) {
    if (!surah) return;
    try {
      await saveQuranProgress(surah.number, ayahNumber, completed);
      setLastAyahNumber(ayahNumber);
    } catch {
      setError('Unable to save reading progress.');
    }
  }

  function scrollToAyah(ayahNumber: number) {
    ayahRefs.current[ayahNumber]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handleAudioEnded() {
    if (!surah) return;
    const next = activeAyah === null ? 1 : activeAyah + 1;
    if (next <= surah.verses_count) {
      setActiveAyah(next);
      setAutoPlayNext(true);
      scrollToAyah(next);
    } else {
      setAutoPlayNext(false);
    }
  }

  const currentIndex = surahs.findIndex((item) => item.number === selectedSurah);
  const previousSurah = currentIndex > 0 ? surahs[currentIndex - 1] : null;
  const nextSurah =
    currentIndex >= 0 && currentIndex < surahs.length - 1 ? surahs[currentIndex + 1] : null;

  const progressPercent =
    surah && lastAyahNumber
      ? Math.min(100, Math.round((lastAyahNumber / Math.max(surah.verses_count, 1)) * 100))
      : 0;

  return (
    <div className="min-h-screen bg-[#faf8f1] pb-32 dark:bg-slate-950">
      <div className="sticky top-0 z-30 border-b border-amber-100 bg-[#faf8f1]/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Link to="/islamic/quran" className="rounded-full p-1.5 text-gray-500 hover:bg-amber-50" aria-label="Back to study view">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-50">
              {surah ? `${surah.number}. ${surah.name_english}` : 'Qur’an Reader'}
            </p>
            <p className="text-[11px] text-gray-500">
              {surah ? `Ayah ${positionAyah} of ${surah.verses_count} • ${progressPercent}% read` : 'Opening…'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              indexOpen.current = !indexOpen.current;
              forceIndex((v) => !v);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-200"
          >
            <ListMusic className="h-4 w-4" /> Surahs
          </button>
        </div>
        <div className="h-1 bg-amber-100/60 dark:bg-slate-800">
          <div className="h-full bg-emerald-700 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {indexOpen.current && (
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <div className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto rounded-2xl border border-amber-100 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4">
            {(surahs.length > 0 ? surahs : []).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedSurah(item.number);
                  indexOpen.current = false;
                  forceIndex((v) => !v);
                  window.scrollTo({ top: 0 });
                }}
                className={`rounded-xl px-2 py-2 text-left text-xs ${
                  item.number === selectedSurah
                    ? 'bg-emerald-700 font-bold text-white'
                    : 'hover:bg-amber-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="font-bold">{item.number}. </span>
                <span dir="rtl">{item.name_arabic}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 pt-4 md:px-6">
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="relative min-w-44 flex-1">
            <select
              value={selectedSurah}
              onChange={(e) => {
                setSelectedSurah(Number(e.target.value));
                window.scrollTo({ top: 0 });
              }}
              className="h-11 w-full appearance-none rounded-2xl border border-amber-200 bg-white px-4 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              aria-label="Select surah"
            >
              {surahs.map((item) => (
                <option key={item.id} value={item.number}>
                  {item.number}. {item.name_english}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          </div>

          <div className="relative min-w-40 flex-1">
            <select
              value={reciter}
              onChange={(e) => setReciter(e.target.value)}
              className="h-11 w-full appearance-none rounded-2xl border border-amber-200 bg-white px-4 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              aria-label="Select reciter"
            >
              {reciters.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={showTranslation}
            onClick={() => setShowTranslation((v) => !v)}
            className={`h-11 rounded-2xl px-4 text-xs font-bold ${
              showTranslation ? 'bg-emerald-700 text-white' : 'border border-amber-200 bg-white text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300'
            }`}
          >
            {showTranslation ? 'EN on' : 'EN off'}
          </button>
        </div>

        {loading || loadingSurah ? (
          <div className="rounded-3xl bg-white p-16 text-center dark:bg-slate-900">
            <BookOpen className="mx-auto mb-4 h-10 w-10 animate-pulse text-emerald-700" />
            <p className="text-sm text-slate-500">Opening the mushaf…</p>
          </div>
        ) : surah ? (
          <>
            <header className="mb-8 rounded-[2rem] border border-amber-200/70 bg-gradient-to-b from-white to-amber-50 px-6 py-10 text-center shadow-sm dark:border-amber-900/30 dark:from-slate-900 dark:to-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-700 dark:text-amber-400">
                Surah {surah.number} • {surah.revelation_type}
              </p>
              <h1 dir="rtl" lang="ar" className="font-arabic mt-4 text-5xl leading-snug md:text-6xl">
                {surah.name_arabic}
              </h1>
              <p className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">
                {surah.name_english}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {surah.name_transliterated} • {surah.verses_count} verses
              </p>
              {lastAyahNumber && (
                <button
                  type="button"
                  onClick={() => scrollToAyah(lastAyahNumber)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
                >
                  <Play className="h-3.5 w-3.5" /> Resume from verse {lastAyahNumber}
                </button>
              )}
            </header>

            {surah.number !== 9 && (
              <p dir="rtl" lang="ar" className="font-arabic mb-8 text-center text-3xl leading-relaxed md:text-4xl">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
            )}

            <div>
              {(surah.ayahs ?? []).map((ayah) => {
                const translation = showTranslation ? ayah.translations?.[0] : undefined;
                const bookmark = bookmarkForAyah(ayah.id);
                const isActive = activeAyah === ayah.number;
                const isSaved = lastAyahNumber === ayah.number;

                return (
                  <article
                    key={ayah.id}
                    data-ayah={ayah.number}
                    ref={(element) => {
                      ayahRefs.current[ayah.number] = element;
                    }}
                    className={`group border-b border-amber-100/80 px-1 py-6 dark:border-slate-800/80 md:py-7 ${
                      isActive ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    <p dir="rtl" lang="ar" className="font-arabic text-justify text-[1.65rem] leading-[2.4] text-gray-900 dark:text-gray-50 md:text-3xl md:leading-[2.5]">
                      {ayah.text_arabic}{' '}
                      <span className="mx-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-emerald-700/40 align-middle font-sans text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        {ayah.number}
                      </span>
                    </p>

                    {translation && (
                      <p className="mt-3 text-[15px] leading-8 text-gray-600 dark:text-gray-300">
                        <span className="mr-2 font-bold text-emerald-800 dark:text-emerald-300">{ayah.number}.</span>
                        {translation.text}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAyah(ayah.number);
                          setAutoPlayNext(false);
                          setAudioErrorAyah(null);
                        }}
                        className="rounded-full p-2 text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-slate-800"
                        aria-label={isActive ? 'Pause recitation' : `Listen to verse ${ayah.number}`}
                      >
                        {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleBookmark(ayah.id, bookmark)}
                        className="rounded-full p-2 text-gray-500 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-slate-800"
                        aria-label={bookmark ? 'Remove bookmark' : `Bookmark verse ${ayah.number}`}
                      >
                        {bookmark ? <BookmarkCheck className="h-4 w-4 text-amber-600" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveProgress(ayah.number, ayah.number === surah.verses_count)}
                        className="rounded-full px-3 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-slate-800"
                      >
                        {isSaved ? '✓ Saved' : 'Save place'}
                      </button>
                      {audioErrorAyah === ayah.number && (
                        <span className="text-[11px] text-red-600">Audio unavailable for this verse.</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 flex justify-between pb-4">
              <button
                type="button"
                disabled={!previousSurah}
                onClick={() => {
                  if (previousSurah) {
                    setSelectedSurah(previousSurah.number);
                    window.scrollTo({ top: 0 });
                  }
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                disabled={!nextSurah}
                onClick={() => {
                  if (nextSurah) {
                    setSelectedSurah(nextSurah.number);
                    window.scrollTo({ top: 0 });
                  }
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          !loading && (
            <div className="rounded-3xl bg-white p-12 text-center dark:bg-slate-900">
              <BookOpen className="mx-auto mb-4 h-10 w-10 text-emerald-700" />
              <p className="text-slate-500">Select a Surah to begin reading.</p>
            </div>
          )
        )}
      </div>

      {surah && activeAyah !== null && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-100 bg-white/97 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/97">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                Verse {activeAyah} of {surah.verses_count}
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveAyah(null);
                  setAutoPlayNext(false);
                }}
                className="text-xs font-semibold text-gray-400"
              >
                Close player
              </button>
            </div>
            <QuranAudioPlayer
              src={activeAudioSrc}
              reciterName={reciterName}
              autoPlay={autoPlayNext}
              onEnded={handleAudioEnded}
              onError={() => activeAyah !== null && setAudioErrorAyah(activeAyah)}
              onCanPlay={() => setAudioErrorAyah(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
