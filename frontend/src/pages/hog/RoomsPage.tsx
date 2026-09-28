import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, BookOpenText, Languages, Phone, ScrollText } from 'lucide-react';
import { fetchRooms, joinRoom } from '@/lib/roomsApi';
import { useAuthStore } from '@/store/authStore';
import RoomCallPanel from '@/components/call/RoomCallPanel';
import type { Conversation } from '@/types/chat';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [liveRoomId, setLiveRoomId] = useState<number | null>(null);
  const currentUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'admin';

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
    <div className="mx-auto max-w-3xl px-4 py-5 md:px-8 md:py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/" className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 dark:hover:bg-primary-900/30">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Learning rooms</h1>
          <p className="text-xs text-gray-500 dark:text-emerald-50/55">Qur’an and Yassarna, together.</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/islamic/quran/read"
            className="rounded-full p-2 text-gray-400 hover:bg-primary-50 hover:text-primary dark:hover:bg-primary-900/30"
            aria-label="Open Qur’an reader"
            title="Qur’an"
          >
            <BookOpenText className="h-5 w-5" />
          </Link>
          <Link
            to="/islamic/hadith"
            className="rounded-full p-2 text-gray-400 hover:bg-primary-50 hover:text-primary dark:hover:bg-primary-900/30"
            aria-label="Open Hadith library"
            title="Hadith"
          >
            <ScrollText className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <section className="relative mb-5 overflow-hidden rounded-[1.75rem] border border-secondary/30 bg-gradient-to-br from-[#063b2d] via-[#07523d] to-[#03261d] p-5 text-white shadow-[0_18px_48px_rgba(3,38,29,.22)] md:p-7">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-secondary/10 blur-3xl" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[.2em] text-secondary-200">Learn • Recite • Grow</p>
        <h2 className="relative mt-2 text-2xl font-semibold tracking-tight">A welcoming place to learn</h2>
        <p className="relative mt-2 max-w-xl text-sm leading-6 text-emerald-50/75">Join either room to read, practise, and encourage one another. Start a voice or video circle whenever you’re ready.</p>
      </section>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      <div className="space-y-3">
        {!loading &&
          rooms.map((room) => {
            const isQuran = room.name === 'Quran Room';
            const Icon = isQuran ? BookOpenText : Languages;

            return (
              <div key={room.id} className="space-y-2">
                <button
                  onClick={() => handleEnter(room)}
                  disabled={joiningId === room.id}
                  className="card group flex w-full items-center gap-4 px-4 py-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-secondary/45 disabled:opacity-60 sm:px-5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-secondary/20 bg-primary-50 text-primary transition group-hover:bg-secondary-100 dark:bg-emerald-950/70 dark:text-secondary-200 dark:group-hover:bg-secondary-500/15">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-50">{room.name}</p>
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                      {room.description || (isQuran ? 'Read and reflect on the Qur’an together.' : 'Practise Yassarna reading together.')}
                    </p>
                    {isAdmin && (
                      <p className="mt-1 text-xs text-gray-400">{room.participant_count} members</p>
                    )}
                  </div>
                  {!room.is_member && (
                    <span className="btn-accent shrink-0 rounded-full px-4 py-2 text-xs">
                      {joiningId === room.id ? 'Joining…' : 'Join'}
                    </span>
                  )}
                </button>

                {room.is_member && currentUser && (
                  <div className="px-1">
                    <button
                      type="button"
                      onClick={() => setLiveRoomId((current) => (current === room.id ? null : room.id))}
                      className="inline-flex items-center gap-1.5 rounded-full border border-secondary/25 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary transition hover:border-secondary/50 dark:bg-emerald-950/60 dark:text-secondary-200"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {liveRoomId === room.id ? 'Hide live session' : 'Live session & seats'}
                    </button>
                    {liveRoomId === room.id && (
                      <div className="mt-2">
                        <RoomCallPanel
                          conversationId={room.id}
                          currentUserId={currentUser.id}
                          currentUserName={currentUser.name}
                          currentUserAvatar={currentUser.avatar_url}
                          isAdmin={room.my_role === 'admin'}
                          roomName={room.name ?? 'Room'}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
