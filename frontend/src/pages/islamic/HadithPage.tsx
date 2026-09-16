import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/axios';

interface Hadith {
  id: number;
  category: string;
  arabic: string;
  english: string;
  source: string;
  narrator?: string;
  explanation?: string;
}

interface HadithCategory {
  id: string;
  name: string;
  description: string;
  count: number;
}

export default function HadithPage() {
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [categories, setCategories] = useState<HadithCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedHadith, setSelectedHadith] = useState<Hadith | null>(null);

  // Load hadiths and categories
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [hadithsRes, categoriesRes] = await Promise.all([
          api.get('/api/islamic/hadith'),
          api.get('/api/islamic/hadith/categories'),
        ]);

        setHadiths(hadithsRes.data.hadiths);
        setCategories(categoriesRes.data.categories);
      } catch (error) {
        console.error('Failed to load hadith data:', error);
        toast.error('Failed to load hadith collection');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter hadiths
  const filteredHadiths = hadiths.filter(hadith => {
    const matchesCategory = selectedCategory === 'all' || hadith.category === selectedCategory;
    const matchesSearch =
      searchTerm === '' ||
      hadith.arabic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hadith.english.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">حديث شريف</h1>
          <p className="text-gray-600 dark:text-gray-400">Noble Hadith Collections</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search hadiths..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8 flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            All Hadiths
          </button>

          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === category.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Hadiths List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredHadiths.length > 0 ? (
              filteredHadiths.map(hadith => (
                <div
                  key={hadith.id}
                  onClick={() => setSelectedHadith(hadith)}
                  className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary cursor-pointer transition hover:shadow-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {hadith.source}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{hadith.category}</span>
                  </div>

                  <p className="text-lg text-right mb-3 text-gray-900 dark:text-white font-arabic leading-relaxed">
                    {hadith.arabic.substring(0, 200)}...
                  </p>

                  <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-2">
                    {hadith.english.substring(0, 150)}...
                  </p>

                  {hadith.narrator && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      <span className="font-semibold">Narrator: </span>
                      {hadith.narrator}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No hadiths found</p>
              </div>
            )}
          </div>
        )}

        {/* Hadith Detail Modal */}
        {selectedHadith && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase">{selectedHadith.source}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedHadith.category}</p>
                </div>
                <button
                  onClick={() => setSelectedHadith(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <p className="text-lg text-right mb-6 text-gray-900 dark:text-white font-arabic leading-relaxed">
                {selectedHadith.arabic}
              </p>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">English Translation:</p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  {selectedHadith.english}
                </p>

                {selectedHadith.explanation && (
                  <>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Explanation:</p>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                      {selectedHadith.explanation}
                    </p>
                  </>
                )}

                {selectedHadith.narrator && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">Narrator: </span>
                    {selectedHadith.narrator}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
