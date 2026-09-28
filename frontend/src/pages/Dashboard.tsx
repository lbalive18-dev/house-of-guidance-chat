import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  PlayCircle,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';
import SearchUsers from '@/components/dashboard/SearchUsers';
import ConversationList from '@/components/dashboard/ConversationList';
import CreateGroupModal from '@/components/chat/CreateGroupModal';
import DailyVerseCard from '@/components/islamic/DailyVerseCard';
import DailyHadithCard from '@/components/islamic/DailyHadithCard';
import IslamicQuickLinks from '@/components/islamic/IslamicQuickLinks';
import CommunityQuickLinks from '@/components/hog/CommunityQuickLinks';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    if (location.hash !== '#messages') return;
    window.requestAnimationFrame(() => document.getElementById('messages')?.scrollIntoView({ behavior: 'smooth' }));
  }, [location.hash]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fbfcf9] via-[#f6f8f4] to-[#eef4ef] dark:from-slate-950 dark:via-slate-950 dark:to-[#101a14]">
      {/* Welcome Header */}
      <section className="geometric-motif border-b border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
          <div className="flex items-center gap-4">
            <Avatar
              name={user.name}
              avatarUrl={user.avatar_url}
              size="lg"
              showOnline
              isOnline={user.is_online}
            />

            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50 md:text-2xl">
                As-salamu alaykum, {(user.name ?? 'User').split(' ')[0]}
              </h1>

              <p className="mt-1 text-sm capitalize text-gray-500 dark:text-gray-400">
                Signed in as {user.role}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <div className="flex-1">
              <SearchUsers />
            </div>

            <button
              type="button"
              onClick={() => setShowCreateGroup(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 text-primary transition hover:bg-primary-50 dark:border-primary-300/30 dark:text-primary-300 dark:hover:bg-primary-900/30"
              aria-label="New group"
              title="New group"
            >
              <Users className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        {/* Celestial accent — decorative only, never blocks controls */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative mb-6 flex h-20 items-center overflow-hidden rounded-[1.75rem] border border-emerald-900/10 bg-gradient-to-r from-[#041b15] via-[#07382d] to-[#0a4a38] px-5 md:h-24"
        >
          <div className="hog-moon relative h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-[#f3d877] to-[#d4af37] shadow-[0_0_24px_rgba(212,175,55,.45)]">
            <div className="absolute inset-y-1 left-1.5 w-7 rounded-full bg-[#07382d]/90" />
          </div>
          <div className="hog-stars absolute inset-0">
            {[
              { left: '18%', top: '22%', delay: '0s', size: 3 },
              { left: '30%', top: '62%', delay: '0.8s', size: 2 },
              { left: '44%', top: '28%', delay: '1.6s', size: 3 },
              { left: '58%', top: '58%', delay: '0.4s', size: 2 },
              { left: '70%', top: '26%', delay: '2.1s', size: 3 },
              { left: '82%', top: '60%', delay: '1.1s', size: 2 },
              { left: '92%', top: '30%', delay: '2.6s', size: 3 },
            ].map((star, i) => (
              <span
                key={i}
                style={{
                  left: star.left,
                  top: star.top,
                  width: star.size,
                  height: star.size,
                  animationDelay: star.delay,
                }}
                className="absolute rounded-full bg-[#e6ca74]"
              />
            ))}
          </div>
          <p className="relative ml-4 text-xs font-medium tracking-wide text-emerald-50/70 md:text-sm">
            Under His light we learn, together.
          </p>
        </div>

        {/* Featured Quran */}
        <section className="relative mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#07382d] via-[#0b5a45] to-[#063127] text-white shadow-[0_24px_60px_rgba(7,56,45,0.2)] ring-1 ring-emerald-950/10">
          {/* Decorative shapes */}
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-emerald-200/10 blur-3xl" />

          <div className="relative grid gap-8 p-7 md:grid-cols-[1.4fr_0.8fr] md:p-10 lg:p-12">
            {/* Text */}
            <div className="flex flex-col justify-center">
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-emerald-50 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                House of Guidance Quran
              </div>

              <h2 className="max-w-xl text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                Come closer to the words of Allah.
              </h2>

              <p
                dir="rtl"
                lang="ar"
                className="mt-5 text-3xl leading-relaxed text-emerald-50 md:text-4xl"
              >
                القرآن الكريم
              </p>

              <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-50/80 md:text-base md:leading-8">
                Read the Noble Quran in Arabic, understand its meaning through
                translation, and listen to beautiful recitations wherever you
                are.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/islamic/quran"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-emerald-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  <BookOpen className="h-5 w-5" />
                  Open Quran
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/islamic/quran"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <PlayCircle className="h-5 w-5" />
                  Listen & Read
                </Link>
              </div>
            </div>

            {/* Quran visual */}
            <div className="relative hidden min-h-[280px] items-center justify-center md:flex">
              <div className="absolute h-64 w-64 rounded-full border border-white/10" />
              <div className="absolute h-52 w-52 rounded-full border border-white/10" />

              <div className="relative flex h-52 w-52 flex-col items-center justify-center rounded-[3rem] border border-white/15 bg-white/10 shadow-2xl backdrop-blur-md">
                <BookOpen className="h-16 w-16 text-emerald-100" />

                <p
                  dir="rtl"
                  lang="ar"
                  className="mt-4 text-2xl text-emerald-50"
                >
                  القرآن
                </p>

                <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-100/70">
                  The Noble Quran
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Islamic Features */}
        <section className="mb-8">
          <IslamicQuickLinks />
        </section>

        {/* Community Features */}
        <section className="mb-8">
          <CommunityQuickLinks />
        </section>

        {/* Daily Inspiration */}
        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Daily Inspiration
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                A verse and hadith to reflect upon today.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <DailyVerseCard />
            <DailyHadithCard />
          </div>
        </section>

        {/* Recent Chats */}
        <section id="messages" className="scroll-mt-24">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Recent chats
            </h2>
          </div>

          <ConversationList />
        </section>
      </main>

      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} />
      )}
    </div>
  );
}
