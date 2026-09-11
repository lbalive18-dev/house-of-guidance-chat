import { createBrowserRouter } from 'react-router-dom';

import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import GuestRoute from '@/components/auth/GuestRoute';

import Dashboard from '@/pages/Dashboard';
import ProfileSettings from '@/pages/ProfileSettings';
import Chat from '@/pages/Chat';

import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import VerifyEmail from '@/pages/auth/VerifyEmail';

import PrayerTimesPage from '@/pages/islamic/PrayerTimesPage';
import QiblahPage from '@/pages/islamic/QiblahPage';
import DuaLibraryPage from '@/pages/islamic/DuaLibraryPage';
import IslamicCalendarPage from '@/pages/islamic/IslamicCalendarPage';
import QuranPage from '@/pages/islamic/QuranPage';

import RoomsPage from '@/pages/hog/RoomsPage';
import AnnouncementsPage from '@/pages/hog/AnnouncementsPage';
import EventsPage from '@/pages/hog/EventsPage';

import AdminRoute from '@/components/admin/AdminRoute';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminReportsPage from '@/pages/admin/AdminReportsPage';
import AdminBroadcastPage from '@/pages/admin/AdminBroadcastPage';
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage';

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/register',
        element: <Register />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: '/reset-password',
        element: <ResetPassword />,
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: (
          <AppLayout>
            <Dashboard />
          </AppLayout>
        ),
      },

      {
        path: '/verify-email',
        element: <VerifyEmail />,
      },

      {
        path: '/settings/profile',
        element: (
          <AppLayout>
            <ProfileSettings />
          </AppLayout>
        ),
      },

      {
        path: '/chat/:conversationId',
        element: <Chat />,
      },

      // Islamic Features
      {
        path: '/islamic/prayer-times',
        element: (
          <AppLayout>
            <PrayerTimesPage />
          </AppLayout>
        ),
      },

      {
        path: '/islamic/qiblah',
        element: (
          <AppLayout>
            <QiblahPage />
          </AppLayout>
        ),
      },

      {
        path: '/islamic/duas',
        element: (
          <AppLayout>
            <DuaLibraryPage />
          </AppLayout>
        ),
      },

      {
        path: '/islamic/calendar',
        element: (
          <AppLayout>
            <IslamicCalendarPage />
          </AppLayout>
        ),
      },

      {
        path: '/islamic/quran',
        element: (
          <AppLayout>
            <QuranPage />
          </AppLayout>
        ),
      },

      // House of Guidance
      {
        path: '/rooms',
        element: (
          <AppLayout>
            <RoomsPage />
          </AppLayout>
        ),
      },

      {
        path: '/announcements',
        element: (
          <AppLayout>
            <AnnouncementsPage />
          </AppLayout>
        ),
      },

      {
        path: '/events',
        element: (
          <AppLayout>
            <EventsPage />
          </AppLayout>
        ),
      },

      // Admin
      {
        element: <AdminRoute />,
        children: [
          {
            path: '/admin/users',
            element: (
              <AppLayout>
                <AdminUsersPage />
              </AppLayout>
            ),
          },

          {
            path: '/admin/reports',
            element: (
              <AppLayout>
                <AdminReportsPage />
              </AppLayout>
            ),
          },

          {
            path: '/admin/broadcast',
            element: (
              <AppLayout>
                <AdminBroadcastPage />
              </AppLayout>
            ),
          },

          {
            path: '/admin/analytics',
            element: (
              <AppLayout>
                <AdminAnalyticsPage />
              </AppLayout>
            ),
          },
        ],
      },
    ],
  },
]);