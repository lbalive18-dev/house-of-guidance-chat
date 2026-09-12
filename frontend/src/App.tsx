import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { initNotifications } from '@/lib/nativeNotifications';
import { router } from '@/router';

export default function App() {
  useEffect(() => {
    initNotifications().catch((error) => {
      console.error('Unable to initialize notifications:', error);
    });
  }, []);

  return (
    <ThemeProvider>
      <RouterProvider router={router} />

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '0.875rem',
            background: '#0B6E4F',
            color: '#FFFFFF',
          },
          success: {
            iconTheme: {
              primary: '#D4AF37',
              secondary: '#FFFFFF',
            },
          },
        }}
      />
    </ThemeProvider>
  );
}