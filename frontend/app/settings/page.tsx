'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { useNotification } from '@/contexts/notification-context';
import { useUserActivity, formatAction } from '@/hooks/use-activity';
import Link from 'next/link';

const AccountIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const BellIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const PaintIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);
const ShieldIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const ActivityIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);
const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);
const MonitorIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const LogoutAllIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const sections = [
  { id: 'account',       label: 'Account',           Icon: AccountIcon },
  { id: 'notifications', label: 'Notifications',     Icon: BellIcon },
  { id: 'appearance',    label: 'Appearance',         Icon: PaintIcon },
  { id: 'privacy',       label: 'Privacy & Security', Icon: ShieldIcon },
  { id: 'activity',      label: 'Activity',           Icon: ActivityIcon },
];

type Theme = 'dark' | 'light' | 'system';

function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  if (t === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(prefersDark ? 'dark' : 'light');
  } else {
    root.classList.add(t);
  }
  localStorage.setItem('moon-theme', t);
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { success, error: notifyError } = useNotification();
  const [activeSection, setActiveSection] = useState('account');
  const [notifications, setNotifications] = useState({
    emailUpdates: true, classReminders: true, newStudents: false, weeklyDigest: true,
  });
  const [theme, setTheme] = useState<Theme>('dark');
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const { data: activities, isLoading: activitiesLoading } = useUserActivity();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const saved = (localStorage.getItem('moon-theme') as Theme) || 'dark';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const handleThemeChange = (t: Theme) => { setTheme(t); applyTheme(t); success(`Theme set to ${t}`); };
  const handleSave = () => success('Settings saved successfully.');

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/logout-all`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Request failed');
      success('Signed out from all devices.');
      setConfirmLogoutAll(false);
      setTimeout(() => logout(), 1000);
    } catch {
      notifyError('Failed to sign out from all devices.');
    } finally {
      setLoggingOutAll(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
            <p className="text-gray-400 mt-1">Manage your account preferences and application settings.</p>
          </div>
          <div className="flex flex-col lg:flex-row gap-6">
            <nav className="lg:w-52 shrink-0">
              <ul className="space-y-1">
                {sections.map(({ id, label, Icon }) => (
                  <li key={id}>
                    <button onClick={() => setActiveSection(id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${activeSection === id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'}`}>
                      <Icon />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex-1 space-y-6">
              {activeSection === 'account' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-1">Account Settings</h2>
                  <p className="text-sm text-gray-500 mb-6">Manage your account information and security.</p>
                  <div className="divide-y divide-gray-800">
                    <div className="flex items-center justify-between py-4">
                      <div><p className="text-sm font-medium text-gray-200">Profile Information</p><p className="text-xs text-gray-500 mt-0.5">Update your name, avatar, and personal details</p></div>
                      <Link href="/me" className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-750 hover:text-gray-100 transition-colors">Edit profile</Link>
                    </div>
                    <div className="flex items-center justify-between py-4">
                      <div><p className="text-sm font-medium text-gray-200">Email Address</p><p className="text-xs text-gray-500 mt-0.5">{user?.email}</p></div>
                      <span className="px-3 py-1 text-xs bg-gray-800 text-gray-400 rounded-full border border-gray-700">Verified</span>
                    </div>
                    <div className="flex items-center justify-between py-4">
                      <div><p className="text-sm font-medium text-gray-200">Password</p><p className="text-xs text-gray-500 mt-0.5">Change your account password</p></div>
                      <Link href="/me" className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-750 hover:text-gray-100 transition-colors">Change</Link>
                    </div>
                    <div className="flex items-center justify-between py-4">
                      <div><p className="text-sm font-medium text-gray-200">Role</p><p className="text-xs text-gray-500 mt-0.5">Your current role on the platform</p></div>
                      <span className="px-3 py-1 text-xs bg-blue-900/40 text-blue-300 rounded-full border border-blue-800">{user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : ''}</span>
                    </div>
                  </div>
                </div>
              )}
              {activeSection === 'notifications' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-1">Notification Preferences</h2>
                  <p className="text-sm text-gray-500 mb-6">Choose what you want to be notified about.</p>
                  <div className="divide-y divide-gray-800">
                    {[{ key: 'emailUpdates', label: 'Email Updates', desc: 'Receive important platform announcements' },{ key: 'classReminders', label: 'Class Reminders', desc: 'Get reminded about upcoming class activities' },{ key: 'newStudents', label: 'New Student Alerts', desc: 'Be notified when students join your classes' },{ key: 'weeklyDigest', label: 'Weekly Digest', desc: 'A weekly summary of your activity' }].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between py-4">
                        <div><p className="text-sm font-medium text-gray-200">{label}</p><p className="text-xs text-gray-500 mt-0.5">{desc}</p></div>
                        <button onClick={() => setNotifications((n) => ({ ...n, [key]: !n[key as keyof typeof n] }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications[key as keyof typeof notifications] ? 'bg-primary-600' : 'bg-gray-700'}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications[key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-end"><button onClick={handleSave} className="px-5 py-2 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors">Save preferences</button></div>
                </div>
              )}
              {activeSection === 'appearance' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-1">Appearance</h2>
                  <p className="text-sm text-gray-500 mb-6">Customize how Moon Guide AI looks for you.</p>
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-3">Theme</p>
                    <div className="grid grid-cols-3 gap-3 max-w-sm">
                      {([{ value: 'dark', label: 'Dark', Icon: MoonIcon },{ value: 'light', label: 'Light', Icon: SunIcon },{ value: 'system', label: 'System', Icon: MonitorIcon }] as { value: Theme; label: string; Icon: () => JSX.Element }[]).map(({ value, label, Icon }) => (
                        <button key={value} onClick={() => handleThemeChange(value)} className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${theme === value ? 'border-primary-500 bg-primary-600/10 text-primary-400' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'}`}>
                          <Icon />{label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {activeSection === 'privacy' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-1">Privacy & Security</h2>
                  <p className="text-sm text-gray-500 mb-6">Control your privacy and keep your account secure.</p>
                  <div className="divide-y divide-gray-800">
                    <div className="py-4">
                      <p className="text-sm font-medium text-gray-200 mb-1">Two-Factor Authentication</p>
                      <p className="text-xs text-gray-500 mb-3">Add an extra layer of security to your account.</p>
                      <button className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-750 hover:text-gray-100 transition-colors">Enable 2FA</button>
                    </div>
                    <div className="py-4">
                      <p className="text-sm font-medium text-gray-200 mb-1">Active Sessions</p>
                      <p className="text-xs text-gray-500 mb-3">Manage devices that are logged into your account.</p>
                      <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                        <div><p className="text-sm text-gray-200">Current device</p><p className="text-xs text-gray-500">Last active: just now</p></div>
                        <span className="text-xs text-green-400 font-medium">Active</span>
                      </div>
                    </div>
                    <div className="py-4">
                      <p className="text-sm font-medium text-gray-200 mb-1">Sign Out All Devices</p>
                      <p className="text-xs text-gray-500 mb-3">Revoke all active sessions across every device.</p>
                      {!confirmLogoutAll ? (
                        <button onClick={() => setConfirmLogoutAll(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-red-900/30 border border-red-800 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors">
                          <LogoutAllIcon />Sign out all devices
                        </button>
                      ) : (
                        <div className="bg-red-950 border border-red-800 rounded-lg p-4 space-y-3">
                          <p className="text-sm text-red-300 font-medium">Are you sure? You will be signed out everywhere.</p>
                          <div className="flex gap-3">
                            <button onClick={handleLogoutAll} disabled={loggingOutAll} className="px-4 py-2 text-sm bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">{loggingOutAll ? 'Signing out' : 'Yes, sign out all'}</button>
                            <button onClick={() => setConfirmLogoutAll(false)} className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeSection === 'activity' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-1">Recent Activity</h2>
                  <p className="text-sm text-gray-500 mb-6">Your last 10 account actions, newest first.</p>
                  {activitiesLoading ? (
                    <p className="text-sm text-gray-500">Loading</p>
                  ) : !activities || activities.length === 0 ? (
                    <p className="text-sm text-gray-500">No activity recorded yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-800">
                      {activities.map((a) => (
                        <li key={a.id} className="py-3 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-200">{formatAction(a.action)}</p>
                            {a.ip_address && <p className="text-xs text-gray-500 mt-0.5">IP: {a.ip_address}</p>}
                          </div>
                          <time className="text-xs text-gray-500 shrink-0">{new Date(a.created_at).toLocaleString()}</time>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}