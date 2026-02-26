'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

const sections = [
  { id: 'account', label: 'Account', icon: '👤' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'privacy', label: 'Privacy & Security', icon: '🔒' },
  { id: 'language', label: 'Language & Region', icon: '🌐' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('account');
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    classReminders: true,
    newStudents: false,
    weeklyDigest: true,
  });
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [language, setLanguage] = useState('en');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
            <p className="text-gray-400 mt-1">Manage your account preferences and application settings.</p>
          </div>

          {saveSuccess && (
            <div className="mb-6 px-4 py-3 bg-green-950 border border-green-800 text-green-400 rounded-xl text-sm">
              Settings saved successfully.
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar nav */}
            <nav className="lg:w-52 shrink-0">
              <ul className="space-y-1">
                {sections.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setActiveSection(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                        activeSection === s.id
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                      }`}
                    >
                      <span>{s.icon}</span>
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Content */}
            <div className="flex-1 space-y-6">
              {/* Account */}
              {activeSection === 'account' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-1">Account Settings</h2>
                  <p className="text-sm text-gray-500 mb-6">Manage your account information and security.</p>

                  <div className="divide-y divide-gray-800">
                    <div className="flex items-center justify-between py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-200">Profile Information</p>
                        <p className="text-xs text-gray-500 mt-0.5">Update your name, avatar, and personal details</p>
                      </div>
                      <Link
                        href="/me"
                        className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-750 hover:text-gray-100 transition-colors"
                      >
                        Edit profile
                      </Link>
                    </div>

                    <div className="flex items-center justify-between py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-200">Email Address</p>
                        <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                      </div>
                      <span className="px-3 py-1 text-xs bg-gray-800 text-gray-400 rounded-full border border-gray-700">
                        Verified
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-200">Password</p>
                        <p className="text-xs text-gray-500 mt-0.5">Change your account password</p>
                      </div>
                      <Link
                        href="/me"
                        className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-750 hover:text-gray-100 transition-colors"
                      >
                        Change
                      </Link>
                    </div>

                    <div className="flex items-center justify-between py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-200">Role</p>
                        <p className="text-xs text-gray-500 mt-0.5">Your current role on the platform</p>
                      </div>
                      <span className="px-3 py-1 text-xs bg-blue-900/40 text-blue-300 rounded-full border border-blue-800">
                        {user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeSection === 'notifications' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-1">Notification Preferences</h2>
                  <p className="text-sm text-gray-500 mb-6">Choose what you want to be notified about.</p>

                  <div className="divide-y divide-gray-800">
                    {[
                      { key: 'emailUpdates', label: 'Email Updates', desc: 'Receive important platform announcements' },
                      { key: 'classReminders', label: 'Class Reminders', desc: 'Get reminded about upcoming class activities' },
                      { key: 'newStudents', label: 'New Student Alerts', desc: 'Be notified when students join your classes' },
                      { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'A weekly summary of your activity' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-200">{label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                        </div>
                        <button
                          onClick={() => setNotifications((n) => ({ ...n, [key]: !n[key as keyof typeof n] }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notifications[key as keyof typeof notifications] ? 'bg-primary-600' : 'bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notifications[key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSave}
                      className="px-5 py-2 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Save preferences
                    </button>
                  </div>
                </div>
              )}

              {/* Appearance */}
              {activeSection === 'appearance' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-1">Appearance</h2>
                  <p className="text-sm text-gray-500 mb-6">Customize how Moon Guide AI looks for you.</p>

                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-3">Theme</p>
                    <div className="grid grid-cols-3 gap-3 max-w-sm">
                      {(['dark', 'light', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`p-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                            theme === t
                              ? 'border-primary-500 bg-primary-600/10 text-primary-400'
                              : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                          }`}
                        >
                          {t === 'dark' ? '🌙' : t === 'light' ? '☀️' : '💻'} {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSave}
                      className="px-5 py-2 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Save appearance
                    </button>
                  </div>
                </div>
              )}

              {/* Privacy */}
              {activeSection === 'privacy' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-1">Privacy & Security</h2>
                  <p className="text-sm text-gray-500 mb-6">Control your privacy and keep your account secure.</p>

                  <div className="divide-y divide-gray-800">
                    <div className="py-4">
                      <p className="text-sm font-medium text-gray-200 mb-1">Two-Factor Authentication</p>
                      <p className="text-xs text-gray-500 mb-3">Add an extra layer of security to your account.</p>
                      <button className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-750 hover:text-gray-100 transition-colors">
                        Enable 2FA
                      </button>
                    </div>

                    <div className="py-4">
                      <p className="text-sm font-medium text-gray-200 mb-1">Active Sessions</p>
                      <p className="text-xs text-gray-500 mb-3">Manage devices that are logged into your account.</p>
                      <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-200">Current device</p>
                          <p className="text-xs text-gray-500">Last active: just now</p>
                        </div>
                        <span className="text-xs text-green-400 font-medium">Active</span>
                      </div>
                    </div>

                    <div className="py-4">
                      <p className="text-sm font-medium text-gray-200 mb-1">Data & Privacy</p>
                      <p className="text-xs text-gray-500 mb-3">Manage your data and download a copy of your information.</p>
                      <button className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-750 hover:text-gray-100 transition-colors">
                        Download my data
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Language */}
              {activeSection === 'language' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-1">Language & Region</h2>
                  <p className="text-sm text-gray-500 mb-6">Set your preferred language and regional settings.</p>

                  <div className="max-w-sm">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Display Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-white/30 outline-none"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="ar">العربية</option>
                      <option value="es">Español</option>
                    </select>
                  </div>

                  <div className="mt-4 max-w-sm">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                    <select className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-white/30 outline-none">
                      <option>UTC+0 — Greenwich Mean Time</option>
                      <option>UTC+1 — Central European Time</option>
                      <option>UTC+3 — East Africa Time</option>
                      <option>UTC-5 — Eastern Standard Time</option>
                      <option>UTC-8 — Pacific Standard Time</option>
                    </select>
                  </div>

                  <div className="mt-6 flex justify-end max-w-sm">
                    <button
                      onClick={handleSave}
                      className="px-5 py-2 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Save settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
