export default function Footer() {
  return (
    <footer className="hidden border-t border-gray-100 bg-white py-5 dark:border-emerald-100/10 dark:bg-[#041b15] md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 text-center">
        <img src="/hog-logo.png" alt="" className="h-8 w-8 rounded-full object-contain" />
        <p className="text-sm text-gray-500 dark:text-emerald-50/60">
          © 2026 House of Guidance. Seeking Knowledge for the Pleasure of Allah.
        </p>
      </div>
    </footer>
  );
}
