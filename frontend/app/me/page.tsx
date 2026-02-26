'use client';

import { useState, useEffect, useRef } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';

interface UserProfile {
  id: string;
  email: string;
  role: string | null;
  profile: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
  is_active: boolean;
  created_at: string;
}

const ROLE_STYLES: Record<string, { label: string; classes: string }> = {
  ADMIN: { label: 'Administrator', classes: 'bg-purple-900/50 text-purple-300 border-purple-800' },
  TEACHER: { label: 'Teacher', classes: 'bg-blue-900/50 text-blue-300 border-blue-800' },
  STUDENT: { label: 'Student', classes: 'bg-green-900/50 text-green-300 border-green-800' },
};

export default function ProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    old_password: '',
    new_password: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data: UserProfile = await response.json();
          setProfile(data);
          setFormData({
            first_name: data.profile?.first_name ?? '',
            last_name: data.profile?.last_name ?? '',
            old_password: '',
            new_password: '',
          });
        } else {
          setError('Failed to load profile.');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    const file = avatarInputRef.current?.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const formPayload = new FormData();
      formPayload.append('file', file);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/avatar`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formPayload,
      });
      if (response.ok) {
        const data = await response.json();
        setProfile((prev) => prev ? { ...prev, profile: prev.profile ? { ...prev.profile, avatar_url: data.avatar_url } : null } : null);
        setAvatarPreview(null);
        if (avatarInputRef.current) avatarInputRef.current.value = '';
        await refreshUser();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || 'Failed to upload avatar.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    const payload: Record<string, string> = {
      first_name: formData.first_name,
      last_name: formData.last_name,
    };
    if (formData.new_password) {
      payload.old_password = formData.old_password;
      payload.new_password = formData.new_password;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                profile: prev.profile
                  ? { ...prev.profile, ...result.profile }
                  : null,
              }
            : null
        );
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        setFormData((f) => ({ ...f, old_password: '', new_password: '' }));
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || 'Failed to update profile.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const roleInfo = profile?.role ? (ROLE_STYLES[profile.role] ?? { label: profile.role, classes: 'bg-gray-800 text-gray-300 border-gray-700' }) : null;

  const initials =
    (profile?.profile?.first_name?.[0] ?? '') +
    (profile?.profile?.last_name?.[0] ?? '');

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}>
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Success banner */}
          {saveSuccess && (
            <div className="mb-6 px-4 py-3 bg-green-950 border border-green-800 text-green-400 rounded-xl text-sm">
              Profile updated successfully.
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-950 border border-red-800 text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Avatar + identity card */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Avatar */}
                  <div className="relative shrink-0 group">
                    {(avatarPreview || profile.profile?.avatar_url) ? (
                      <img
                        src={avatarPreview ?? profile.profile!.avatar_url!}
                        alt="Avatar"
                        className="h-24 w-24 rounded-full object-cover ring-4 ring-gray-800"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-3xl ring-4 ring-gray-800">
                        {initials || '?'}
                      </div>
                    )}
                    <span
                      className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-gray-900 ${
                        profile.is_active ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                      title={profile.is_active ? 'Active' : 'Inactive'}
                    />
                    {/* Avatar upload controls */}
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
                    >
                      Change
                    </button>
                  </div>

                  {/* Identity */}
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-2xl font-bold text-gray-100">
                      {profile.profile?.first_name} {profile.profile?.last_name}
                    </h2>
                    <p className="text-gray-400 mt-1">{profile.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                      {roleInfo && (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${roleInfo.classes}`}>
                          {roleInfo.label}
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                          profile.is_active
                            ? 'bg-green-900/40 text-green-300 border-green-800'
                            : 'bg-gray-800 text-gray-400 border-gray-700'
                        }`}
                      >
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Avatar upload button + Edit toggle */}
                  <div className="shrink-0 flex flex-col gap-2">
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={avatarUploading}
                        className="px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-all"
                      >
                        {avatarUploading ? 'Uploading...' : 'Save avatar'}
                      </button>
                    )}
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-5 py-2 bg-gray-800 border border-gray-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-750 hover:border-gray-600 hover:text-gray-100 transition-all"
                      >
                        Edit profile
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit form */}
              {isEditing && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                  <h3 className="text-lg font-semibold text-gray-100 mb-6">Edit Information</h3>
                  <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          First name
                        </label>
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          required
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-white/30 outline-none transition-all placeholder:text-gray-500"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Last name
                        </label>
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          required
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-white/30 outline-none transition-all placeholder:text-gray-500"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    {/* Password change section */}
                    <div className="border-t border-gray-800 pt-5">
                      <h4 className="text-sm font-medium text-gray-400 mb-4">Change Password <span className="text-gray-600 font-normal">(optional)</span></h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Current password</label>
                          <input
                            type="password"
                            value={formData.old_password}
                            onChange={(e) => setFormData({ ...formData, old_password: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-white/30 outline-none transition-all placeholder:text-gray-500"
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">New password</label>
                          <input
                            type="password"
                            value={formData.new_password}
                            onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                            minLength={8}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-white/30 outline-none transition-all placeholder:text-gray-500"
                            placeholder="Min. 8 characters"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        {isSaving ? 'Saving...' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setError('');
                          setFormData({
                            first_name: profile.profile?.first_name ?? '',
                            last_name: profile.profile?.last_name ?? '',
                            old_password: '',
                            new_password: '',
                          });
                        }}
                        className="px-6 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-750 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Account details */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                <h3 className="text-lg font-semibold text-gray-100 mb-6">Account Details</h3>
                <div className="divide-y divide-gray-800">
                  {[
                    { label: 'User ID', value: profile.id, mono: true },
                    { label: 'Email address', value: profile.email, mono: false },
                    { label: 'Role', value: roleInfo?.label ?? '—', mono: false },
                    { label: 'Account status', value: profile.is_active ? 'Active' : 'Inactive', mono: false },
                    { label: 'Member since', value: joinedDate, mono: false },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-1">
                      <span className="text-sm text-gray-400">{label}</span>
                      <span
                        className={`text-sm text-gray-200 sm:text-right ${
                          mono ? 'font-mono text-xs text-gray-500 break-all' : 'font-medium'
                        }`}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div className="bg-gray-900 border border-red-900/50 rounded-2xl p-8">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-500 mb-5">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button
                  type="button"
                  className="px-5 py-2.5 bg-red-950 border border-red-800 text-red-400 text-sm font-medium rounded-lg hover:bg-red-900/60 hover:text-red-300 transition-all"
                >
                  Delete my account
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 text-gray-500">
              Profile not found.
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}