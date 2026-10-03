import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUp, BookOpenText, Clock, Eraser, MoonStar, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { askNoor, type NoorLang, type NoorLayer, type NoorSource } from '@/lib/noorApi';
import { apiErrorMessage } from '@/lib/apiError';
import NoorText from '@/components/noor/NoorText';

interface NoorMessage {
  id: string;
  role: 'user' | 'noor';
  text: string;
  sources: NoorSource[];
  layer?: NoorLayer;
}

const LANGS: { value: NoorLang; label: string; hint: string }[] = [
  { value: 'en', label: 'English', hint: 'EN' },
  { value: 'lg', label: 'Luganda', hint: 'LG' },
  { value: 'ar', label: 'العربية', hint: 'AR' },
];

const SUGGESTIONS = [
  { icon: Clock, label: 'Prayer times', prompt: 'When are prayer times today?' },
  { icon: BookOpenText, label: 'Qur’an', prompt: 'How do I start reading the Qur’an?' },
  { icon: Sparkles, label: 'Hadith', prompt: 'Share a hadith about kindness' },
  { icon: MoonStar, label: 'Dua', prompt: 'Dua for guidance' },
];

const HISTORY_KEY = 'hog-noor-history-v1';
const LANG_KEY = 'hog-noor-lang';

function loadHistory(): NoorMessage[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as NoorMessage[]) : [];
    if (!Array.isArray(parsed)) return [];
    // Normalize older entries that predate sources/history fields.
    return parsed.slice(-40).map((msg) => ({
      ...msg,
      sources: Array.isArray(msg.sources) ? msg.sources : [],
    }));
  } catch {
    return [];
  }
}

function loadLang(): NoorLang {
  try {
    const stored = window.localStorage.getItem(LANG_KEY);
    return stored === 'lg' || stored === 'ar' ? stored : 'en';
  } catch {
    return 'en';
  }
}

export default function NoorPage() {
  const [messages, setMessages] = useState<NoorMessage[]>(loadHistory);
  const [lang, setLang] = useState<NoorLang>(loadLang);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // private mode — history simply won't persist
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const pickLang = (next: NoorLang) => {
    setLang(next);
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      // ignore
    }
  };

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || thinking) return;
    setDraft('');
    const userMsg: NoorMessage = { id: `u-${Date.now()}-${idRef.current++}`, role: 'user', text: clean, sources: [] };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);
    try {
      const reply = await askNoor(clean, lang);
      setMessages((prev) => [
        ...prev,
        { id: `n-${Date.now()}-${idRef.current++}`, role: 'noor', text: reply.answer, sources: reply.sources, layer: reply.layer },
      ]);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Noor is resting. Try again in a moment.'));
    } finally {
      setThinking(false);
    }
  };

  const clear = () => {
    setMessages([]);
    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4.25rem-3.5rem)] w-full max-w-3xl flex-col px-4 pb-4 pt-5 md:pb-6">
      {/* Window header */}
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" aria-label="Back home" className="rounded-full p-1.5 text-gray-500 transition hover:bg-primary-50 hover:text-primary dark:hover:bg-primary-900/30">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary-300 to-secondary-600 text-[#17352a] shadow-[0_8px_24px_rgba(212,175,55,.4)]">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
            Noor <span className="font-arabic font-normal text-secondary-600 dark:text-secondary-300">نور</span>
          </h1>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">Your House of Guidance companion</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear conversation"
            title="Clear conversation"
            className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-red-200 hover:text-red-600 dark:border-gray-700 dark:text-gray-400"
          >
            <Eraser className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Language */}
      <div className="mb-4 flex gap-1.5" role="group" aria-label="Answer language">
        {LANGS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => pickLang(value)}
            aria-pressed={lang === value}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              lang === value
                ? 'bg-primary text-white shadow'
                : 'border border-gray-200 text-gray-500 hover:border-primary/40 hover:text-primary dark:border-gray-700 dark:text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Window */}
      <div className="card flex min-h-[50dvh] flex-1 flex-col overflow-hidden !rounded-[1.75rem] !border-secondary/25 px-0 shadow-[0_18px_48px_rgba(3,38,29,.10)]">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center px-2 py-8 text-center">
              <span className="hog-moon flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#f3d877] to-[#d4af37] shadow-[0_0_36px_rgba(212,175,55,.5)]">
                <Sparkles className="h-7 w-7 text-[#17352a]" />
              </span>
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
                As-salamu alaykum
              </h2>
              <p dir={lang === 'ar' ? 'rtl' : undefined} className="mt-2 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">
                {lang === 'lg'
                  ? 'Nze Noor. Mbuuza ku ddiini oba ku app — mu lulimi lwo.'
                  : lang === 'ar'
                    ? 'أنا نور. اسألني عن الدين أو عن التطبيق — بلغتك.'
                    : 'I am Noor. Ask me about the deen or about the app — in your language.'}
              </p>
              <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
                {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => void send(prompt)}
                    className="glass-tile group flex items-center gap-2.5 px-3.5 py-3 text-left"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary-400/90 to-secondary-600/90 text-[#17352a] transition group-hover:scale-105">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-gray-700 dark:text-gray-200">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) =>
            msg.role === 'user' ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-[15px] leading-7 text-white shadow-sm">
                  {msg.text}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-secondary/25 bg-gradient-to-b from-white to-[#fdf9ec] px-5 py-4 shadow-sm dark:border-secondary/20 dark:from-[#08291f] dark:to-[#06231a]">
                  <NoorText text={msg.text} />
                  {msg.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-secondary/20 pt-3">
                      {msg.sources.map((source) => (
                        <Link
                          key={source.url}
                          to={source.url}
                          className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-3 py-1 text-[11px] font-bold text-secondary-700 transition hover:bg-secondary/30 dark:text-secondary-200"
                        >
                          <BookOpenText className="h-3 w-3" />
                          {source.label}
                        </Link>
                      ))}
                    </div>
                  )}
                  {msg.layer === 'groq' && (
                    <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-300 dark:text-gray-600">Answered by Noor AI</p>
                  )}
                </div>
              </div>
            ),
          )}

          {thinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-secondary/25 bg-white px-5 py-4 dark:bg-[#08291f]">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-2 w-2 animate-bounce rounded-full bg-secondary-500"
                    style={{ animationDelay: `${dot * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-gray-100 bg-white/80 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-[#041b15]/80">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              rows={1}
              placeholder={lang === 'lg' ? 'Wandika ekibuuzo kyo…' : lang === 'ar' ? 'اكتب سؤالك…' : 'Ask Noor anything…'}
              aria-label="Ask Noor"
              className="input-field max-h-32 flex-1 resize-none !rounded-2xl"
            />
            <button
              type="button"
              onClick={() => void send(draft)}
              disabled={!draft.trim() || thinking}
              aria-label="Send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow transition hover:bg-primary-600 disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
