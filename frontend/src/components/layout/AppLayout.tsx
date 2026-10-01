import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MobileTabBar from '@/components/layout/MobileTabBar';

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const onNoorPage = location.pathname.startsWith('/noor');

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9f6] text-gray-900 dark:bg-[#041b15] dark:text-gray-50">
      <Navbar />
      <main className="flex-1 animate-page-enter pb-24 md:pb-0">{children}</main>
      <Footer />
      {!onNoorPage && (
        <Link
          to="/noor"
          aria-label="Ask Noor"
          title="Ask Noor"
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-secondary-300 to-secondary-600 text-[#17352a] shadow-[0_12px_32px_rgba(212,175,55,.45)] transition hover:scale-105 md:bottom-8 md:right-8"
        >
          <Sparkles className="h-6 w-6" />
        </Link>
      )}
      <MobileTabBar />
    </div>
  );
}
