import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchDua } from '@/lib/islamicApi';
import ShareReminderButton from '@/components/islamic/ShareReminderButton';
import type { Dua } from '@/types/islamic';

interface ReaderContext {
  ids?: number[];
  index?: number;
  back?: string;
}

/** Full dua page with back arrow and previous/next within the open list. */
export default function DuaReaderPage() {
  const { duaId } = useParams<{ duaId: string }>();
  const id = Number(duaId);
  const location = useLocation();
  const navigate = useNavigate();
  const context = (location.state ?? {}) as ReaderContext;

  const [dua, setDua] = useState<Dua | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchDua(id)
      .then(setDua)
      .catch(() => setDua(null))
      .finally(() => setLoading(false));
  }, [id]);

  const ids = context.ids ?? [];
  const at = context.index ?? -1;
  const prevId = at > 0 ? ids[at - 1] : null;
  const nextId = at >= 0 && at < ids.length - 1 ? ids[at + 1] : null;
  const backTo = context.back ?? '/islamic/duas';

  const goTo = (target: number) => {
    navigate(`/islamic/duas/${target}`, { state: context });
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-8">
      <div className="mb-5 flex items-center gap-3">
        <Link to={backTo} aria-label="Back" className="rounded-full p-1.5 text-gray-500 transition hover:bg-primary-50 hover:text-primary dark:hover:bg-primary-900/30">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-secondary-600 dark:text-secondary-300">
            Dua reader
          </p>
          <h1 className="truncate text-lg font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
            {dua?.title ?? 'Opening…'}
          </h1>
        </div>
        {dua && (
          <div className="ml-auto">
            <ShareReminderButton text={`"${dua.translation}"\n— ${dua.title}\n\nShared from House of Guidance Chat`} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !dua ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-semibold text-gray-700 dark:text-gray-200">Could not open this dua.</p>
          <Link to={backTo} className="btn-primary mt-4">Back to library</Link>
        </div>
      ) : (
        <article className="card animate-page-enter px-5 py-6 md:px-7">
          <p dir="rtl" lang="ar" className="font-arabic rounded-2xl bg-[#fbfcf9] px-5 py-7 text-right text-2xl leading-[2.1] dark:bg-slate-950/60">
            {dua.arabic_text}
          </p>
          {dua.transliteration && (
            <p className="mt-4 text-sm italic leading-7 text-gray-500 dark:text-gray-400">{dua.transliteration}</p>
          )}
          <p className="mt-4 border-l-4 border-secondary-500 pl-4 text-base leading-8 text-gray-700 dark:text-gray-200">
            {dua.translation}
          </p>
          {dua.reference && (
            <p className="mt-4 text-xs font-semibold text-secondary-600 dark:text-secondary-300">{dua.reference}</p>
          )}

          {(prevId !== null || nextId !== null) && (
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                type="button"
                disabled={prevId === null}
                onClick={() => prevId !== null && goTo(prevId)}
                className="inline-flex items-center gap-1 rounded-2xl border bg-white px-4 py-2 text-sm font-semibold transition disabled:opacity-40 dark:bg-slate-950"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                disabled={nextId === null}
                onClick={() => nextId !== null && goTo(nextId)}
                className="inline-flex items-center gap-1 rounded-2xl border bg-white px-4 py-2 text-sm font-semibold transition disabled:opacity-40 dark:bg-slate-950"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </article>
      )}
    </div>
  );
}
