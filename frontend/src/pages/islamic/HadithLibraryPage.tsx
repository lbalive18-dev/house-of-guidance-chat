import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  Library,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  fetchHadith,
  fetchHadithBooks,
  fetchHadithChapters,
  fetchHadiths,
} from '@/lib/islamicApi';
import ShareReminderButton from '@/components/islamic/ShareReminderButton';
import type { Hadith, HadithBook } from '@/types/islamic';

const BOOK_ACCENTS = [
  'from-emerald-900 via-emerald-800 to-emerald-950',
  'from-amber-800 via-yellow-800 to-amber-950',
  'from-teal-800 via-emerald-800 to-teal-950',
  'from-stone-700 via-amber-900 to-stone-900',
];

function HadithCard({ hadith, number }: { hadith: Hadith; number: number }) {
  const shareText = `"${hadith.text}"\n${hadith.narrator ? `— Narrated by ${hadith.narrator}, ` : '— '}${hadith.reference}\n\nShared from House of Guidance Chat`;

  return (
    <article className="card px-5 py-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-sm font-bold text-primary dark:bg-primary-900/40 dark:text-primary-300">
          {hadith.hadith_number ?? number}
        </span>
        <ShareReminderButton text={shareText} />
      </div>

      {hadith.arabic_text && (
        <p dir="rtl" lang="ar" className="font-arabic text-right text-xl leading-[2] text-gray-900 dark:text-gray-50">
          {hadith.arabic_text}
        </p>
      )}

      <p className="mt-3 text-[15px] leading-7 text-gray-700 dark:text-gray-200">
        &ldquo;{hadith.text}&rdquo;
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {hadith.narrator && (
          <span className="font-medium text-gray-600 dark:text-gray-300">
            Narrated by {hadith.narrator}
          </span>
        )}
        <span className="font-semibold text-secondary-600 dark:text-secondary-300">
          {hadith.reference}
        </span>
        {hadith.grade && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {hadith.grade}
          </span>
        )}
      </div>

      {(hadith.chapter || hadith.category) && (
        <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-400">
          {[hadith.chapter, hadith.category].filter(Boolean).join(' • ')}
        </p>
      )}

      {hadith.source_collection && hadith.source_number !== null && (
        <p className="mt-1 text-[11px] text-gray-400">
          Originally {hadith.source_collection} no. {hadith.source_number}
        </p>
      )}
    </article>
  );
}

export default function HadithLibraryPage() {
  const [books, setBooks] = useState<HadithBook[]>([]);
  const [selected, setSelected] = useState<HadithBook | null>(null);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [chapter, setChapter] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [readerId, setReaderId] = useState<number | null>(null);
  const [readerHadith, setReaderHadith] = useState<Hadith | null>(null);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHadithBooks()
      .then(setBooks)
      .catch(() => setError('Unable to load the Hadith library.'))
      .finally(() => setLoadingBooks(false));
  }, []);

  useEffect(() => {
    if (!selected) return;

    setLoadingList(true);
    const timeout = setTimeout(() => {
      Promise.all([
        fetchHadiths({
          collection: selected.collection,
          chapter: chapter || undefined,
          q: query || undefined,
          page,
        }),
        fetchHadithChapters(selected.collection),
      ])
        .then(([res, chapterList]) => {
          setHadiths(res.data);
          setLastPage(res.meta.last_page);
          setTotal(res.meta.total);
          setChapters(chapterList);
        })
        .catch(() => setError('Unable to load this collection.'))
        .finally(() => setLoadingList(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [selected, chapter, query, page]);

  useEffect(() => {
    if (readerId === null) {
      setReaderHadith(null);
      return;
    }

    fetchHadith(readerId)
      .then(setReaderHadith)
      .catch(() => setError('Unable to open this hadith.'));
  }, [readerId]);

  const openBook = (book: HadithBook) => {
    setSelected(book);
    setChapter('');
    setQuery('');
    setPage(1);
    setReaderId(null);
    setError('');
  };

  const reader = useMemo(
    () => hadiths.find((h) => h.id === readerId) ?? readerHadith,
    [hadiths, readerId, readerHadith],
  );

  return (
    <div className="min-h-screen bg-[#f6f8f4] dark:bg-slate-950">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0c4a3b] via-[#116149] to-[#08352c] text-white">
        <div className="relative mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <div className="flex items-center gap-3">
            <Link to="/" className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium">
              <Library className="h-4 w-4" />
              House of Guidance Library
            </div>
          </div>

          <h1 className="mt-4 text-4xl font-bold md:text-5xl">Hadith Library</h1>
          <p dir="rtl" lang="ar" className="mt-3 text-2xl text-emerald-50 md:text-3xl">
            مكتبة الحديث
          </p>
          <p className="mt-3 max-w-xl text-sm leading-7 text-emerald-50/80 md:text-base">
            Read from the blessed collections — Arabic wording with English
            meaning, references, and grades where verified.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loadingBooks ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">The Four Books</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {books.map((book, index) => {
                const active = selected?.collection === book.collection;

                return (
                  <button
                    key={book.collection}
                    type="button"
                    onClick={() => openBook(book)}
                    className={`overflow-hidden rounded-3xl text-left shadow-sm transition hover:shadow-md ${
                      active ? 'ring-2 ring-emerald-600 ring-offset-2' : ''
                    }`}
                  >
                    <div className={`bg-gradient-to-br ${BOOK_ACCENTS[index % BOOK_ACCENTS.length]} px-5 pb-6 pt-8 text-white`}>
                      <div className="mx-auto mb-4 flex h-14 w-11 items-center justify-center rounded-b-lg rounded-t-sm border border-amber-200/40 bg-white/10">
                        <Sparkles className="h-5 w-5 text-amber-200" />
                      </div>
                      {book.title_ar && (
                        <p dir="rtl" lang="ar" className="text-center text-xl">
                          {book.title_ar}
                        </p>
                      )}
                      <p className="mt-1 text-center text-sm font-bold">{book.title_en}</p>
                    </div>
                    <div className="bg-white px-5 py-4 dark:bg-slate-900">
                      <p className="line-clamp-2 min-h-10 text-xs leading-5 text-gray-500 dark:text-gray-400">
                        {book.description}
                      </p>
                      <p className="mt-2 text-xs font-bold text-emerald-700">
                        {book.count === 0 ? 'Source text pending' : `${book.count} hadith`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {selected && (
          <div className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">
                  {selected.title_en}
                </h3>
                <p className="text-xs text-gray-500">
                  {total === 0 ? 'No verified entries yet' : `${total} entries`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setReaderId(null);
                }}
                className="text-xs font-semibold text-emerald-700"
              >
                Back to shelf
              </button>
            </div>

            {selected.count === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-slate-900">
                <Library className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="font-semibold text-gray-700 dark:text-gray-200">
                  Verified source text for this book is not yet available.
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                  This shelf requires authoritative Arabic wording with
                  translation, numbering, and references for
                  &ldquo;{selected.collection}&rdquo; before entries can be
                  shown. Nothing here is auto-generated.
                </p>
              </div>
            ) : (
              <>
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder={`Search ${selected.title_en}…`}
                    className="input-field pl-10"
                  />
                </div>

                {chapters.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        setChapter('');
                        setPage(1);
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        chapter === ''
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      All chapters
                    </button>
                    {chapters.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setChapter(c);
                          setPage(1);
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          chapter === c
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {loadingList ? (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : hadiths.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-400">
                    No hadith found. Try a different search.
                  </p>
                ) : (
                  <>
                    <div className="space-y-4">
                      {hadiths.map((hadith, i) => (
                        <div
                          key={hadith.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setReaderId(hadith.id)}
                          onKeyDown={(e) => e.key === 'Enter' && setReaderId(hadith.id)}
                          className="cursor-pointer"
                        >
                          <HadithCard hadith={hadith} number={(page - 1) * 20 + i + 1} />
                        </div>
                      ))}
                    </div>

                    {lastPage > 1 && (
                      <div className="mt-6 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="inline-flex items-center gap-1 rounded-2xl border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:bg-slate-900"
                        >
                          <ChevronLeft className="h-4 w-4" /> Prev
                        </button>
                        <span className="text-xs text-gray-500">
                          Page {page} of {lastPage}
                        </span>
                        <button
                          type="button"
                          disabled={page >= lastPage}
                          onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                          className="inline-flex items-center gap-1 rounded-2xl border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:bg-slate-900"
                        >
                          Next <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {reader && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" onClick={() => setReaderId(null)}>
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 dark:bg-slate-900 sm:rounded-3xl md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                  {selected?.title_en} • No. {reader.hadith_number ?? reader.id}
                </p>
                <button
                  type="button"
                  onClick={() => setReaderId(null)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500"
                >
                  Close <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {reader.arabic_text && (
                <p dir="rtl" lang="ar" className="font-arabic rounded-2xl bg-[#fbfcf9] px-5 py-7 text-right text-2xl leading-[2.1] dark:bg-slate-950/60 md:text-3xl">
                  {reader.arabic_text}
                </p>
              )}

              <p className="mt-5 border-l-4 border-emerald-600 pl-4 text-base leading-8 text-gray-700 dark:text-gray-200">
                &ldquo;{reader.text}&rdquo;
              </p>

              <div className="mt-4 text-sm text-gray-500">
                {reader.narrator && <p>Narrated by {reader.narrator}</p>}
                <p className="font-semibold text-secondary-600">{reader.reference}</p>
                {reader.source_collection && reader.source_number !== null && (
                  <p>Originally {reader.source_collection} no. {reader.source_number}</p>
                )}
                {reader.grade && <p>Grade: {reader.grade}</p>}
                {reader.chapter && <p>Chapter: {reader.chapter}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
