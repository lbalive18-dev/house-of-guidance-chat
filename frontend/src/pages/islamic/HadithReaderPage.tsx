import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchHadith, fetchHadithNeighbors, type HadithNeighbor } from '@/lib/islamicApi';
import ShareReminderButton from '@/components/islamic/ShareReminderButton';
import type { Hadith } from '@/types/islamic';

interface ReaderContext {
  ids?: number[];
  index?: number;
  collection?: string;
  category?: string;
  chapter?: string;
  q?: string;
  back?: string;
}

/**
 * Full reader page (not a modal): back arrow, Arabic + translation, and
 * Previous/Next that follow the selected book's actual ordering.
 */
export default function HadithReaderPage() {
  const { hadithId } = useParams<{ hadithId: string }>();
  const id = Number(hadithId);
  const location = useLocation();
  const navigate = useNavigate();
  const context = (location.state ?? {}) as ReaderContext;

  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [neighbors, setNeighbors] = useState<{ prev: HadithNeighbor | null; next: HadithNeighbor | null }>({ prev: null, next: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const filters = {
      collection: context.collection,
      category: context.category,
      chapter: context.chapter,
      q: context.q,
    };
    Promise.all([fetchHadith(id), fetchHadithNeighbors(id, filters).catch(() => ({ prev: null, next: null }))])
      .then(([entry, adjacent]) => {
        setHadith(entry);
        // Prefer the list context when provided (exact page position);
        // otherwise fall back to the order-aware API neighbors.
        if (context.ids && context.index !== undefined) {
          const ids = context.ids;
          const at = context.index;
          setNeighbors({
            prev: at > 0 ? { id: ids[at - 1], hadith_number: null } : adjacent.prev,
            next: at < ids.length - 1 ? { id: ids[at + 1], hadith_number: null } : adjacent.next,
          });
        } else {
          setNeighbors(adjacent);
        }
      })
      .catch(() => setHadith(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const goTo = (neighborId: number) => {
    navigate(`/islamic/hadith/${neighborId}`, { state: context, replace: false });
    window.scrollTo({ top: 0 });
  };

  const backTo = context.back ?? '/islamic/hadith';

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-8">
      <div className="mb-5 flex items-center gap-3">
        <Link to={backTo} aria-label="Back" className="rounded-full p-1.5 text-gray-500 transition hover:bg-primary-50 hover:text-primary dark:hover:bg-primary-900/30">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-secondary-600 dark:text-secondary-300">
            Hadith reader
          </p>
          <h1 className="truncate text-lg font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
            {hadith ? `No. ${hadith.hadith_number ?? hadith.id}` : 'Opening…'}
          </h1>
        </div>
        {hadith && (
          <div className="ml-auto">
            <ShareReminderButton text={`"${hadith.text}"\n${hadith.narrator ? `— Narrated by ${hadith.narrator}, ` : '— '}${hadith.reference}\n\nShared from House of Guidance Chat`} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !hadith ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-semibold text-gray-700 dark:text-gray-200">Could not open this hadith.</p>
          <Link to={backTo} className="btn-primary mt-4">Back to library</Link>
        </div>
      ) : (
        <article className="card animate-page-enter px-5 py-6 md:px-7">
          {hadith.arabic_text && (
            <p dir="rtl" lang="ar" className="font-arabic rounded-2xl bg-[#fbfcf9] px-5 py-7 text-right text-2xl leading-[2.1] dark:bg-slate-950/60 md:text-3xl">
              {hadith.arabic_text}
            </p>
          )}

          <p className="mt-5 border-l-4 border-secondary-500 pl-4 text-base leading-8 text-gray-700 dark:text-gray-200">
            &ldquo;{hadith.text}&rdquo;
          </p>

          <div className="mt-4 space-y-1 text-sm text-gray-500 dark:text-gray-400">
            {hadith.narrator && <p>Narrated by <span className="font-medium text-gray-700 dark:text-gray-200">{hadith.narrator}</span></p>}
            <p className="font-semibold text-secondary-600 dark:text-secondary-300">{hadith.reference}</p>
            {hadith.source_collection && hadith.source_number !== null && (
              <p>Originally {hadith.source_collection} no. {hadith.source_number}</p>
            )}
            {hadith.grade && <p>Grade: {hadith.grade}</p>}
            {hadith.chapter && <p>Chapter: {hadith.chapter}</p>}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              disabled={!neighbors.prev}
              onClick={() => neighbors.prev && goTo(neighbors.prev.id)}
              className="inline-flex items-center gap-1 rounded-2xl border bg-white px-4 py-2 text-sm font-semibold transition disabled:opacity-40 dark:bg-slate-950"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-xs text-gray-400">
              {hadith.collection}
            </span>
            <button
              type="button"
              disabled={!neighbors.next}
              onClick={() => neighbors.next && goTo(neighbors.next.id)}
              className="inline-flex items-center gap-1 rounded-2xl border bg-white px-4 py-2 text-sm font-semibold transition disabled:opacity-40 dark:bg-slate-950"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </article>
      )}
    </div>
  );
}
