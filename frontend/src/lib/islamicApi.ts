import { api } from '@/lib/axios';
import type { PaginatedResponse } from '@/types/chat';
import type {
  DailyVerse,
  Dua,
  Hadith,
  HadithBook,
  HijriCalendarDay,
  HijriDate,
  PrayerTimes,
  QiblahResult,
  QuranAyah,
  QuranReciter,
  QuranSurah,
  QuranSurahDetail,
} from '@/types/islamic';

export async function fetchDailyVerse(): Promise<DailyVerse> {
  const { data } = await api.get<DailyVerse>('/api/islamic/quran/daily');
  return data;
}

export async function fetchDailyHadith(): Promise<Hadith> {
  const { data } = await api.get<Hadith>('/api/islamic/hadith/daily');
  return data;
}

export async function fetchHadiths(
  params: { collection?: string; category?: string; chapter?: string; q?: string; page?: number } = {},
) {
  const { data } = await api.get<PaginatedResponse<Hadith>>(
    '/api/islamic/hadith',
    { params },
  );

  return data;
}

export async function fetchHadith(id: number): Promise<Hadith> {
  const { data } = await api.get<Hadith>(`/api/islamic/hadith/${id}`);

  return data;
}

export async function fetchHadithCategories(): Promise<string[]> {
  const { data } = await api.get<string[]>(
    '/api/islamic/hadith/categories',
  );

  return data;
}

export async function fetchHadithBooks(): Promise<HadithBook[]> {
  const { data } = await api.get<{ books: HadithBook[] }>(
    '/api/islamic/hadith/collections',
  );

  return data.books;
}

export async function fetchHadithChapters(collection?: string): Promise<string[]> {
  const { data } = await api.get<string[]>(
    '/api/islamic/hadith/chapters',
    { params: collection ? { collection } : {} },
  );

  return data;
}

export async function fetchDuas(
  params: { category?: string; q?: string; page?: number } = {},
) {
  const { data } = await api.get<PaginatedResponse<Dua>>(
    '/api/islamic/duas',
    { params },
  );

  return data;
}

export async function fetchDuaCategories(): Promise<string[]> {
  const { data } = await api.get<string[]>(
    '/api/islamic/duas/categories',
  );

  return data;
}

export async function fetchPrayerTimes(
  lat: number,
  lng: number,
  date?: string,
): Promise<PrayerTimes> {
  const { data } = await api.get<PrayerTimes>(
    '/api/islamic/prayer-times',
    {
      params: { lat, lng, date },
    },
  );

  return data;
}

export async function fetchQiblah(
  lat: number,
  lng: number,
): Promise<QiblahResult> {
  const { data } = await api.get<QiblahResult>(
    '/api/islamic/qiblah',
    {
      params: { lat, lng },
    },
  );

  return data;
}

export async function fetchHijriDate(
  date?: string,
): Promise<HijriDate> {
  const { data } = await api.get<HijriDate>(
    '/api/islamic/hijri-date',
    {
      params: { date },
    },
  );

  return data;
}

export async function fetchHijriCalendar(
  month: number,
  year: number,
): Promise<HijriCalendarDay[]> {
  const { data } = await api.get<{
    days: HijriCalendarDay[];
  }>('/api/islamic/calendar', {
    params: { month, year },
  });

  return data.days;
}

export async function fetchQuranSurahs(): Promise<QuranSurah[]> {
  const { data } = await api.get<{
    surahs: QuranSurah[];
  }>('/api/islamic/quran');

  return data.surahs;
}

export async function fetchQuranSurah(
  surah: number,
  params: {
    language?: string;
    translator?: string;
    reciter?: string;
  } = {},
): Promise<QuranSurahDetail> {
  const { data } = await api.get<{
    surah: QuranSurahDetail;
  }>(
    `/api/islamic/quran/${surah}`,
    { params },
  );

  return data.surah;
}

export async function fetchQuranReciters(): Promise<QuranReciter[]> {
  const { data } = await api.get<{
    reciters: QuranReciter[];
  }>(
    '/api/islamic/quran/reciters',
  );

  return data.reciters;
}

/*
|--------------------------------------------------------------------------
| Quran Bookmarks
|--------------------------------------------------------------------------
*/

export interface QuranBookmark {
  id: number;
  user_id: number;
  ayah_id: number;
  note: string | null;
  ayah: QuranAyahWithSurah;
}

export interface QuranAyahWithSurah extends QuranAyah {
  surah: QuranSurah;
}

export async function fetchQuranBookmarks(): Promise<QuranBookmark[]> {
  const { data } = await api.get<{
    bookmarks: QuranBookmark[];
  }>('/api/islamic/quran/bookmarks');

  return data.bookmarks;
}

export async function bookmarkQuranAyah(
  ayahId: number,
  note?: string | null,
): Promise<QuranBookmark> {
  const { data } = await api.post<{
    message: string;
    bookmark: QuranBookmark;
  }>(
    `/api/islamic/quran/ayahs/${ayahId}/bookmark`,
    {
      note: note ?? null,
    },
  );

  return data.bookmark;
}

export async function removeQuranBookmark(
  ayahId: number,
): Promise<void> {
  await api.delete(
    `/api/islamic/quran/ayahs/${ayahId}/bookmark`,
  );
}

/*
|--------------------------------------------------------------------------
| Quran Reading Progress
|--------------------------------------------------------------------------
*/

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

export async function fetchQuranProgress(
  surah: number,
): Promise<QuranProgress | null> {
  const { data } = await api.get<{
    progress: QuranProgress | null;
  }>(
    `/api/islamic/quran/progress/${surah}`,
  );

  return data.progress;
}

export async function saveQuranProgress(
  surah: number,
  ayah: number,
  completed = false,
): Promise<QuranProgress> {
  const { data } = await api.post<{
    message: string;
    progress: QuranProgress;
  }>(
    `/api/islamic/quran/progress/${surah}/ayah/${ayah}`,
    {
      completed,
    },
  );

  return data.progress;
}