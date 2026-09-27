import { useEffect, useRef, useState } from 'react';
import { getEcho } from '@/lib/echo';
import { fetchCall, fetchIncomingCall } from '@/lib/callApi';
import type { CallSession } from '@/types/call';

const INCOMING_CALL_POLL_MS = 6000;

/**
 * Global incoming-call ring listener. Subscribes to the authenticated
 * user's own private channel (already authorized server-side for self
 * only) so an incoming call surfaces no matter which page is open.
 */
export function useIncomingCalls(currentUserId: number | undefined) {
  const [ringing, setRinging] = useState<CallSession | null>(null);
  const ringingRef = useRef<CallSession | null>(null);
  ringingRef.current = ringing;

  useEffect(() => {
    if (currentUserId === undefined) return;
    const echo = getEcho();
    const channel = echo.private(`App.Models.User.${currentUserId}`);
    let active = true;

    const onInitiated = (payload: { session: CallSession }) => {
      const session = payload.session;
      if (session.initiator_id === currentUserId) return;
      if (session.status !== 'ringing') return;
      setRinging(session);
    };

    const clearIfMatches = (payload: { session_id: number }) => {
      setRinging((current) => (current?.id === payload.session_id ? null : current));
    };

    const recoverIncomingCall = async () => {
      if (document.visibilityState === 'hidden') return;

      try {
        const incoming = await fetchIncomingCall();
        if (!active) return;
        if (incoming) {
          setRinging(incoming);
          return;
        }

        // The API can briefly answer before a just-started call is committed.
        // Confirm the call already shown to this user ended before dismissing it.
        const current = ringingRef.current;
        if (current) {
          void fetchCall(current.id)
            .then((latest) => {
              if (active && latest.status === 'ended') setRinging(null);
            })
            .catch(() => {
              if (active) setRinging(null);
            });
        }
      } catch {
        // Keep a realtime-delivered ring visible during a short API outage.
      }
    };

    channel.listen('.call.initiated', onInitiated);
    channel.listen('.call.accepted', clearIfMatches);
    channel.listen('.call.cancelled', clearIfMatches);
    channel.listen('.call.ended', clearIfMatches);

    void recoverIncomingCall();
    const poll = window.setInterval(() => void recoverIncomingCall(), INCOMING_CALL_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void recoverIncomingCall();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      for (const event of ['.call.initiated', '.call.accepted', '.call.cancelled', '.call.ended'] as const) {
        try {
          channel.stopListening(event);
        } catch {
          // channel already gone
        }
      }
    };
  }, [currentUserId]);

  return { ringing, dismissRinging: () => setRinging(null) };
}
