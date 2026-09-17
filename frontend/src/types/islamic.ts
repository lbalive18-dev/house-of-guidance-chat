export interface DailyVerse {
  surah: string;
  surah_arabic: string | null;
  ayah: number;
  arabic: string;
  translation: string;
  source: 'live' | 'offline';
}

export interface Hadith {
  id: number;
  collection: string;
  source_collection: string | null;
  source_number: number | null;
  hadith_number: number | null;
  chapter: string | null;
  narrator: string | null;
  arabic_text: string | null;
  text: string;
  reference: string;
  grade: string | null;
  category: string;
}

export interface HadithBook {
  collection: string;
  title_en: string;
  title_ar: string | null;
  description: string;
  count: number;
}

export interface Dua {
  id: number;
  title: string;
  category: string;
  arabic_text: string;
  transliteration: string | null;
  translation: string;
  reference: string | null;
}

export interface QuranSurah {
  id: number;
  number: number;
  name_arabic: string;
  name_transliterated: string;
  name_english: string;
  revelation_type: string;
  verses_count: number;
}

export interface QuranTranslation {
  id: number;
  ayah_id: number;
  language: string;
  translator: string;
  text: string;
}

export interface QuranAudio {
  id: number;
  ayah_id: number;
  quran_reciter_id: number;
  audio_url: string;
}

export interface QuranAyah {
  id: number;
  surah_id: number;
  number: number;
  text_arabic: string;
  translations: QuranTranslation[];
  audio: QuranAudio[];
}

export interface QuranSurahDetail extends QuranSurah {
  ayahs: QuranAyah[];
}

export interface QuranAyahWithSurah extends QuranAyah {
  surah: QuranSurah;
}

export interface QuranBookmark {
  id: number;
  user_id: number;
  ayah_id: number;
  note: string | null;
  ayah: QuranAyahWithSurah;
}

export interface QuranProgress {
  id: number;
  user_id: number;
  surah_id: number;
  last_ayah_id: number | null;
  last_ayah_number: number | null;
  completed: boolean;
  surah?: QuranSurah;
  lastAyah?: QuranAyah;
}

export interface QuranReciter {
  id: number;
  name: string;
  slug: string;
  language: string;
  bio: string | null;
  is_active: boolean;
}

export interface PrayerTimes {
  timings: {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Sunset: string;
    Maghrib: string;
    Isha: string;
    [key: string]: string;
  };
  date: {
    readable: string;
    [key: string]: unknown;
  };
  meta: {
    timezone: string;
    [key: string]: unknown;
  };
}

export interface QiblahResult {
  bearing: number;
  distance_km: number;
}

export interface HijriDate {
  day: string;
  month: {
    number: number;
    en: string;
    ar: string;
  };
  year: string;
  weekday: string;
  formatted: string;
  holidays: string[];
}

export interface HijriCalendarDay {
  gregorian_date: string;
  hijri_day: string;
  hijri_month: string;
  hijri_year: string;
  holidays: string[];
}