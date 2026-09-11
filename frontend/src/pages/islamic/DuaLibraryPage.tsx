import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { fetchDuaCategories, fetchDuas } from '@/lib/islamicApi';
import ShareReminderButton from '@/components/islamic/ShareReminderButton';
import type { Dua } from '@/types/islamic';

export default function DuaLibraryPage() {
  const [duas, setDuas] = useState<Dua[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDuaCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      fetchDuas({ category: category || undefined, q: query || undefined })
        .then((res) => setDuas(res.data))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [category, query]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/" className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 dark:hover:bg-primary-900/30">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">Dua Library</h1>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search duas…"
          className="input-field pl-10"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <button
          onClick={() => setCategory('')}
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
            category === ''
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              category === cat
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && duas.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-400">No duas found.</p>
      )}

      <div className="space-y-3">
        {!loading &&
          duas.map((dua) => {
            const shareText = `${dua.title}\n\n${dua.arabic_text}\n${dua.transliteration ?? ''}\n\n"${dua.translation}"\n${dua.reference ?? ''}\n\nShared from House of Guidance Chat`;

            return (
              <div key={dua.id} className="card px-5 py-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50">{dua.title}</h3>
                  <ShareReminderButton text={shareText} />
                </div>
                <p dir="rtl" className="font-arabic text-right text-lg leading-relaxed text-gray-900 dark:text-gray-50">
                  {dua.arabic_text}
                </p>
                {dua.transliteration && (
                  <p className="mt-2 text-sm italic text-gray-500 dark:text-gray-400">{dua.transliteration}</p>
                )}
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{dua.translation}</p>
                {dua.reference && (
                  <p className="mt-2 text-xs font-medium text-secondary-600 dark:text-secondary-300">
                    {dua.reference}
                  </p>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
