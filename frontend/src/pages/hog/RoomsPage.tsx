import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, BookOpenText, Languages, MessageSquare, Mic2, Users } from 'lucide-react';
import { fetchRooms, joinRoom } from '@/lib/roomsApi';
import type { Conversation, RoomType } from '@/types/chat';

const ROOM_META: Record<RoomType, { icon: typeof Users; blurb: string }> = {
  discussion: { icon: MessageSquare, blurb: 'Open conversation for the whole community.' },
  tajweed: { icon: Mic2, blurb: 'Practice and questions on the rules of recitation.' },
  hifdh: { icon: BookOpenText, blurb: "Support for those memorizing the Qur'an." },
  arabic: { icon: Languages, blurb: 'Learn and practice the Arabic language.' },
  ask_sheikh: { icon: Users, blurb: 'Ask questions, get answers from our teachers.' },
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms()
      .then(setRooms)
      .finally(() => setLoading(false));
  }, []);

  const handleEnter = async (room: Conversation) => {
    if (room.is_member) {
      navigate(`/chat/${room.id}`);
      return;
    }

    setJoiningId(room.id);
    try {
      await joinRoom(room.id);
      navigate(`/chat/${room.id}`);
    } catch {
      toast.error('Could not join that room.');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/" className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 dark:hover:bg-primary-900/30">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">Rooms</h1>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      <div className="space-y-3">
        {!loading &&
          rooms.map((room) => {
            const meta = room.room_type ? ROOM_META[room.room_type] : null;
            const Icon = meta?.icon ?? Users;

            return (
              <button
                key={room.id}
                onClick={() => handleEnter(room)}
                disabled={joiningId === room.id}
                className="card flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-primary-50/50 disabled:opacity-60 dark:hover:bg-primary-900/10"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary dark:bg-primary-900/40 dark:text-primary-300">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{room.name}</p>
                  <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                    {room.description || meta?.blurb}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">{room.participant_count} members</p>
                </div>
                {!room.is_member && (
                  <span className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                    {joiningId === room.id ? 'Joining…' : 'Join'}
                  </span>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}
