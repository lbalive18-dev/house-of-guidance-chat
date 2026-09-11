import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Camera, Loader2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import TextField from '@/components/ui/TextField';
import { useAuthStore } from '@/store/authStore';
import { deleteAvatar, updatePassword, updateProfile } from '@/lib/authApi';

interface ProfileForm {
  name: string;
  email: string;
  bio: string;
  phone: string;
}

interface PasswordForm {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export default function ProfileSettings() {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      bio: user?.bio ?? '',
      phone: user?.phone ?? '',
    },
  });

  const passwordForm = useForm<PasswordForm>();

  if (!user) return null;

  const onAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const updated = await updateProfile({ avatar: file });
      setUser(updated);
      toast.success('Profile picture updated.');
    } catch {
      toast.error('Could not upload profile picture.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const updated = await deleteAvatar();
      setUser(updated);
      toast.success('Profile picture removed.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSaveProfile = async (values: ProfileForm) => {
    setSavingProfile(true);
    try {
      const updated = await updateProfile(values);
      setUser(updated);
      toast.success('Profile updated.');
    } catch {
      toast.error('Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const onSavePassword = async (values: PasswordForm) => {
    setSavingPassword(true);
    try {
      await updatePassword(values.current_password, values.password, values.password_confirmation);
      toast.success('Password updated.');
      passwordForm.reset();
    } catch {
      toast.error('Could not update password. Check your current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Profile settings</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage your account information and profile picture.
      </p>

      <section className="card mt-6 flex items-center gap-5 px-6 py-6">
        <div className="relative">
          <Avatar name={user.name} avatarUrl={user.avatar_url} size="xl" showOnline isOnline={user.is_online} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-card hover:bg-primary-600"
            aria-label="Change profile picture"
          >
            {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onAvatarSelected}
          />
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-50">{user.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
          {user.avatar_url && (
            <button
              type="button"
              onClick={onRemoveAvatar}
              className="mt-1 text-xs font-medium text-red-500 hover:underline"
            >
              Remove photo
            </button>
          )}
        </div>
      </section>

      <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="card mt-6 space-y-4 px-6 py-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Basic information</h2>
        <TextField label="Full name" error={profileForm.formState.errors.name?.message} {...profileForm.register('name', { required: 'Name is required' })} />
        <TextField label="Email address" type="email" error={profileForm.formState.errors.email?.message} {...profileForm.register('email', { required: 'Email is required' })} />
        <TextField label="Phone number" {...profileForm.register('phone')} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Bio</label>
          <textarea rows={3} className="input-field" {...profileForm.register('bio')} />
        </div>
        <button type="submit" disabled={savingProfile} className="btn-primary">
          {savingProfile ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <form onSubmit={passwordForm.handleSubmit(onSavePassword)} className="card mt-6 space-y-4 px-6 py-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Change password</h2>
        <TextField
          label="Current password"
          type="password"
          error={passwordForm.formState.errors.current_password?.message}
          {...passwordForm.register('current_password', { required: 'Required' })}
        />
        <TextField
          label="New password"
          type="password"
          error={passwordForm.formState.errors.password?.message}
          {...passwordForm.register('password', { required: 'Required', minLength: { value: 8, message: 'At least 8 characters' } })}
        />
        <TextField
          label="Confirm new password"
          type="password"
          error={passwordForm.formState.errors.password_confirmation?.message}
          {...passwordForm.register('password_confirmation', { required: 'Required' })}
        />
        <button type="submit" disabled={savingPassword} className="btn-primary">
          {savingPassword ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
