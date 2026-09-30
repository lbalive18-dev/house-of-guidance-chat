import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  MailWarning,
  PlayCircle,
  Plus,
  Sparkles,
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
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt';
import PushPromptBanner from '@/components/pwa/PushPromptBanner';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    if (location.hash !== '#messages') return;
    window.requestAnimationFrame(() => document.getElementById('messages')?.scrollIntoView({ behavior: 'smooth' }));
  }, [location.hash]);

  if (!user) return null;

  const firstName = (user.name ?? 'User').split(' ')[0];

  return (
    <div className="min-h-screen bg-[#f4f7f3] dark:bg-slate-950">
      {/* HERO — the first screen: greeting, search, night-sky welcome */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#041b15] via-[#07382d] to-[#0a4a38] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
          <div className="geometric-motif-light absolute inset-0 opacity-60" />
          <div className="hog-stars absolute inset-0">
            {[
              { left: '8%', top: '18%', delay: '0s', size: 3 },
              { left: '22%', top: '64%', delay: '0.9s', size: 2 },
              { left: '38%', top: '26%', delay: '1.7s', size: 3 },
              { left: '55%', top: '60%', delay: '0.4s', size: 2 },
              { left: '68%', top: '22%', delay: '2.2s', size: 3 },
              { left: '80%', top: '58%', delay: '1.2s', size: 2 },
              { left: '92%', top: '28%', delay: '2.7s', size: 3 },
            ].map((star, i) => (
              <span
                key={i}
                style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay }}
                className="absolute rounded-full bg-[#e6ca74]"
              />
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-7 pt-7 md:px-8 md:pb-9 md:pt-10">
          <div className="animate-page-enter flex items-center gap-4">
            <Avatar
              name={user.name}
              avatarUrl={user.avatar_url}
              size="lg"
              showOnline
              isOnline={user.is_online}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary-200">
                As-salamu alaykum
              </p>
              <h1 className="truncate text-2xl font-extrabold tracking-tight md:text-3xl">
                {firstName}
              </h1>
            </div>
            <div className="hog-moon relative hidden h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-[#f3d877] to-[#d4af37] shadow-[0_0_28px_rgba(212,175,55,.5)] sm:block" aria-hidden="true">
              <div className="absolute inset-y-1.5 left-2 w-8 rounded-full bg-[#07382d]/90" />
            </div>
          </div>

          <p className="animate-page-enter mt-3 max-w-xl text-sm leading-6 text-emerald-50/75" style={{ animationDelay: '80ms' }}>
            Chat, learn, and grow with the House of Guidance community — all in one place.
          </p>

          {/* SEARCH — top of the home screen */}
          <div className="animate-page-enter mt-5 flex items-center gap-2" style={{ animationDelay: '140ms' }}>
            <div className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-lg backdrop-blur-xl">
              <SearchUsers />
            </div>
            <button
              type="button"
              onClick={() => setShowCreateGroup(true)}
              aria-label="New group"
              title="New group"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary font-bold text-[#17352a] shadow-[0_8px_24px_rgba(212,175,55,.35)] transition hover:-translate-y-0.5 hover:bg-secondary-200"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div aria-hidden="true" className="relative h-5">
          <svg className="absolute inset-x-0 bottom-[-1px] h-5 w-full text-[#f4f7f3] dark:text-slate-950" viewBox="0 0 1440 20" preserveAspectRatio="none">
            <path d="M0,12 C240,20 480,0 720,8 C960,16 1200,4 1440,12 L1440,20 L0,20 Z" fill="currentColor" />
          </svg>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-8 md:py-8">
        {!user.email_verified_at && (
          <Link
            to="/verify-email"
            className="flex items-center gap-3 rounded-2xl border border-secondary/30 bg-secondary-50 px-4 py-3 text-sm text-secondary-800 transition hover:-translate-y-0.5 dark:border-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-200"
          >
            <MailWarning className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <strong className="block">Verify your email to unlock reminders</strong>
              <span className="block truncate text-xs opacity-80">Calls, messages and daily nudges need a verified address.</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        )}
        <div className="animate-page-enter" style={{ animationDelay: '60ms' }}>
          <PwaInstallPrompt compact />
        </div>
        <div className="animate-page-enter" style={{ animationDelay: '90ms' }}>
          <PushPromptBanner />
        </div>

        {/* Worship shortcuts */}
        <section className="animate-page-enter" style={{ animationDelay: '120ms' }}>
          <SectionHeader eyebrow="Worship" title="Daily essentials" />
          <IslamicQuickLinks />
        </section>

        {/* Featured Quran */}
        <section className="animate-page-enter relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#07382d] via-[#0b5a45] to-[#063127] text-white shadow-[0_24px_60px_rgba(7,56,45,0.2)] ring-1 ring-emerald-950/10" style={{ animationDelay: '180ms' }}>
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-emerald-200/10 blur-3xl" />

          <div className="relative grid gap-8 p-7 md:grid-cols-[1.4fr_0.8fr] md:p-10 lg:p-12">
            <div className="flex flex-col justify-center">
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-emerald-50 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                House of Guidance Quran
              </div>

              <h2 className="max-w-xl text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl">
                Come closer to the words of Allah.
              </h2>

              <p dir="rtl" lang="ar" className="mt-5 text-3xl leading-relaxed text-emerald-50 md:text-4xl">
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
                  to="/islamic/quran/read"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <PlayCircle className="h-5 w-5" />
                  Listen &amp; Read
                </Link>
              </div>
            </div>

            <div className="relative hidden min-h-[280px] items-center justify-center md:flex">
              <div className="absolute h-64 w-64 rounded-full border border-white/10" />
              <div className="absolute h-52 w-52 rounded-full border border-white/10" />

              <div className="relative flex h-52 w-52 flex-col items-center justify-center rounded-[3rem] border border-white/15 bg-white/10 shadow-2xl backdrop-blur-md">
                <BookOpen className="h-16 w-16 text-emerald-100" />

                <p dir="rtl" lang="ar" className="mt-4 text-2xl text-emerald-50">
                  القرآن
                </p>

                <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-100/70">
                  The Noble Quran
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Community shortcuts */}
        <section className="animate-page-enter" style={{ animationDelay: '220ms' }}>
          <SectionHeader eyebrow="Community" title="Learn together" />
          <CommunityQuickLinks />
        </section>

        {/* Daily Inspiration */}
        <section className="animate-page-enter" style={{ animationDelay: '260ms' }}>
          <SectionHeader eyebrow="Reflection" title="Daily inspiration" subtitle="A verse and hadith to reflect upon today." />

          <div className="grid gap-5 md:grid-cols-2">
            <DailyVerseCard />
            <DailyHadithCard />
          </div>
        </section>

        {/* Recent Chats */}
        <section id="messages" className="animate-page-enter scroll-mt-24" style={{ animationDelay: '300ms' }}>
          <SectionHeader eyebrow="Messages" title="Recent chats" action={<Link to="/rooms" className="text-xs font-bold text-primary hover:underline">Browse rooms</Link>} />

          <ConversationList />
        </section>
      </main>

      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} />
      )}
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-secondary-600 dark:text-secondary-300">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
