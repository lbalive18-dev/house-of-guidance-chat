import { useCallback, useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { initNotifications } from '@/lib/nativeNotifications';
import { useAuthStore } from '@/store/authStore';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { acceptCall, declineCall } from '@/lib/callApi';
import IncomingCallDialog from '@/components/call/IncomingCallDialog';
import { apiErrorMessage } from '@/lib/apiError';
import { unlockCallAudio } from '@/hooks/useRingtone';
import { router } from '@/router';

export default function App() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { ringing, dismissRinging } = useIncomingCalls(currentUserId);
  const [acceptingCallId, setAcceptingCallId] = useState<number | null>(null);

  useEffect(() => {
    initNotifications().catch((error) => {
      console.error('Unable to initialize notifications:', error);
    });
  }, []);

  const handleAcceptRinging = useCallback(async () => {
    if (!ringing) return;
    const session = ringing;
    unlockCallAudio();
    setAcceptingCallId(session.id);
    try {
      const accepted = await acceptCall(session.id);
      // Hand the accepted session to the chat window so it can bring up
      // media immediately even if the active-call fetch races the commit.
      try {
        sessionStorage.setItem(
          'hog-accepted-call',
          JSON.stringify({ sessionId: accepted.id, conversationId: accepted.conversation_id, at: Date.now() }),
        );
      } catch {
        // storage unavailable — chat falls back to polling the API
      }
      dismissRinging();
      void router.navigate(`/chat/${session.conversation_id}`);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not answer this call.'));
    } finally {
      setAcceptingCallId(null);
    }
  }, [ringing, dismissRinging]);

  const handleDeclineRinging = useCallback(async () => {
    if (!ringing) return;
    const sessionId = ringing.id;
    dismissRinging();
    try {
      await declineCall(sessionId);
    } catch {
      // already resolved server-side
    }
  }, [ringing, dismissRinging]);

  return (
    <ThemeProvider>
      <RouterProvider router={router} />

      {ringing && (
        <IncomingCallDialog
          session={ringing}
          isAccepting={acceptingCallId === ringing.id}
          onAccept={() => void handleAcceptRinging()}
          onDecline={() => void handleDeclineRinging()}
        />
      )}

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
