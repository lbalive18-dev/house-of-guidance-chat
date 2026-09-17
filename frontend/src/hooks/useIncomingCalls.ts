import { useEffect, useState } from 'react';
import { getEcho } from '@/lib/echo';
import type { CallSession } from '@/types/call';

/**
 * Global incoming-call ring listener. Subscribes to the authenticated
 * user's own private channel (already authorized server-side for self
 * only) so an incoming call surfaces no matter which page is open.
 */
export function useIncomingCalls(currentUserId: number | undefined) {
  const [ringing, setRinging] = useState<CallSession | null>(null);

  useEffect(() => {
    if (currentUserId === undefined) return;
    const echo = getEcho();
    const channel = echo.private(`App.Models.User.${currentUserId}`);

    const onInitiated = (payload: { session: CallSession }) => {
      const session = payload.session;
      if (session.initiator_id === currentUserId) return;
      if (session.status !== 'ringing') return;
      setRinging(session);
    };

    const clearIfMatches = (payload: { session_id: number }) => {
      setRinging((current) => (current?.id === payload.session_id ? null : current));
    };

    channel.listen('.call.initiated', onInitiated);
    channel.listen('.call.cancelled', clearIfMatches);
    channel.listen('.call.ended', clearIfMatches);

    return () => {
      for (const event of ['.call.initiated', '.call.cancelled', '.call.ended'] as const) {
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
