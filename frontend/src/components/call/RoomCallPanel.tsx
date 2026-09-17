import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Armchair, Minus, Phone, Plus } from 'lucide-react';
import { getEcho } from '@/lib/echo';
import {
  claimSeat,
  fetchRoomCallState,
  releaseSeat,
  removeCallParticipant,
  startCall,
  updateSeatCapacity,
} from '@/lib/callApi';
import { useCall } from '@/hooks/useCall';
import GroupCallView from '@/components/call/GroupCallView';
import Avatar from '@/components/ui/Avatar';
import type { RoomCallState } from '@/types/call';

interface RoomCallPanelProps {
  conversationId: number;
  currentUserId: number;
  currentUserName: string;
  currentUserAvatar?: string | null;
  isAdmin: boolean;
  roomName: string;
}

export default function RoomCallPanel({
  conversationId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isAdmin,
  roomName,
}: RoomCallPanelProps) {
  const call = useCall({ conversationId, currentUserId });
  const [roomState, setRoomState] = useState<RoomCallState | null>(null);
  const [capacityDraft, setCapacityDraft] = useState('8');
  const [busy, setBusy] = useState(false);

  const refreshSeats = useCallback(async () => {
    try {
      const state = await fetchRoomCallState(conversationId);
      setRoomState(state);
      setCapacityDraft(String(state.seat_capacity));
    } catch {
      // seats unavailable — call still works without the map
    }
  }, [conversationId]);

  useEffect(() => {
    void refreshSeats();
  }, [refreshSeats]);

  useEffect(() => {
    const echo = getEcho();
    const channel = echo.private(`conversation.${conversationId}`);
    const refresh = () => {
      void refreshSeats();
      if (call.session) void call.refreshSession(call.session.id);
    };
    channel.listen('.room.seat.claimed', refresh);
    channel.listen('.room.seat.released', refresh);
    channel.listen('.call.ended', refresh);
    return () => {
      for (const event of ['.room.seat.claimed', '.room.seat.released', '.call.ended'] as const) {
        try {
          channel.stopListening(event);
        } catch {
          // channel already gone
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, refreshSeats]);

  const liveSession = call.session && call.session.status !== 'ended' ? call.session : null;
  const occupied = roomState?.seats.filter((s) => s.user_id !== null).length ?? 0;
  const capacity = roomState?.seat_capacity ?? 8;
  const isFull = occupied >= capacity;
  const mySeat = roomState?.seats.find((s) => s.user_id === currentUserId) ?? null;
  const amInCall = call.me?.status === 'joined';

  const handleStartRoomCall = async (media: 'audio' | 'video') => {
    setBusy(true);
    try {
      const created = await startCall(conversationId, media);
      await call.adoptSession(created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start the room call.');
    } finally {
      setBusy(false);
      void refreshSeats();
    }
  };

  const handleClaim = async (seatNumber: number) => {
    try {
      await claimSeat(conversationId, seatNumber);
      await refreshSeats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not claim that seat.');
      await refreshSeats();
    }
  };

  const handleRelease = async (seatNumber: number) => {
    try {
      await releaseSeat(conversationId, seatNumber);
      await refreshSeats();
    } catch {
      toast.error('Could not release that seat.');
    }
  };

  const handleCapacity = async () => {
    const value = Number(capacityDraft);
    if (!Number.isInteger(value) || value < 1 || value > 50) {
      toast.error('Capacity must be between 1 and 50.');
      return;
    }
    try {
      await updateSeatCapacity(conversationId, value);
      toast.success('Seat capacity updated.');
      await refreshSeats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update capacity.');
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-gray-50">Live session • {roomName}</h3>
          <p className="text-xs text-gray-500">
            {liveSession
              ? `${liveSession.media === 'video' ? 'Video' : 'Audio'} call live`
              : 'No live call right now'}
            {roomState ? ` • ${occupied}/${capacity} seats taken` : ''}
          </p>
        </div>
        {isFull && liveSession && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            Room is full
          </span>
        )}
      </div>

      {!liveSession && (
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleStartRoomCall('audio')}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <Phone className="h-4 w-4" /> Start audio call
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleStartRoomCall('video')}
                className="inline-flex items-center gap-1.5 rounded-2xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                Start video call
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500">Only room admins can start a live session.</p>
          )}
        </div>
      )}

      {liveSession && call.viewState !== 'connected' && call.viewState !== 'connecting' && (
        <button
          type="button"
          onClick={() => void call.join()}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Phone className="h-4 w-4" /> Join the live call
        </button>
      )}

      {(call.viewState === 'connected' || call.viewState === 'connecting') && liveSession && (
        <GroupCallView
          call={call}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          isAdmin={isAdmin}
          onRemoveParticipant={(userId) => {
            void removeCallParticipant(liveSession.id, userId)
              .then(() => call.refreshSession(liveSession.id))
              .catch(() => toast.error('Could not remove that participant.'));
          }}
        />
      )}

      {roomState && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Seats {occupied}/{capacity}
            </p>
            {isAdmin && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Decrease capacity"
                  onClick={() => setCapacityDraft(String(Math.max(1, Number(capacityDraft) - 1 || 1)))}
                  className="rounded-full border p-1.5"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  value={capacityDraft}
                  onChange={(e) => setCapacityDraft(e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => void handleCapacity()}
                  className="h-8 w-12 rounded-xl border text-center text-sm"
                  aria-label="Seat capacity"
                />
                <button
                  type="button"
                  aria-label="Increase capacity"
                  onClick={() => setCapacityDraft(String(Math.min(50, (Number(capacityDraft) || 0) + 1)))}
                  className="rounded-full border p-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {Array.from({ length: capacity }, (_, i) => i + 1).map((seatNumber) => {
              const seat = roomState.seats.find((s) => s.seat_number === seatNumber);
              const mine = seat?.user_id === currentUserId;
              const taken = !!seat?.user_id;

              return (
                <button
                  key={seatNumber}
                  type="button"
                  disabled={taken && !mine}
                  onClick={() => {
                    if (!taken && amInCallJoined()) void handleClaim(seatNumber);
                    else if (mine) void handleRelease(seatNumber);
                  }}
                  title={
                    mine
                      ? 'Your seat — tap to release'
                      : taken
                        ? seat?.user?.name ?? `Seat ${seatNumber}`
                        : amInCallJoined()
                          ? `Take seat ${seatNumber}`
                          : 'Join the call first'
                  }
                  className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 text-center ${
                    mine
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                      : taken
                        ? 'border-gray-200 bg-gray-50 opacity-80 dark:border-gray-700 dark:bg-slate-800'
                        : 'border-dashed border-gray-300 hover:border-emerald-500 dark:border-gray-600'
                  }`}
                >
                  {taken && seat?.user ? (
                    <Avatar name={seat.user.name} avatarUrl={seat.user.avatar_url} size="sm" />
                  ) : (
                    <Armchair className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="max-w-full truncate text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                    {mine ? 'You' : (seat?.user?.name ?? `#${seatNumber}`)}
                  </span>
                </button>
              );
            })}
          </div>

          {mySeat && (
            <button
              type="button"
              onClick={() => void handleRelease(mySeat.seat_number)}
              className="mt-2 text-xs font-semibold text-gray-500 hover:text-red-600"
            >
              Release my seat (#{mySeat.seat_number})
            </button>
          )}
        </div>
      )}
    </div>
  );

  function amInCallJoined(): boolean {
    return amInCall && call.viewState !== 'idle' && call.viewState !== 'ended' && call.viewState !== 'failed';
  }
}
