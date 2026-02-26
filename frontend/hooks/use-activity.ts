import { useQuery } from '@tanstack/react-query';

interface Activity {
  id: string;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Signed in',
  logout: 'Signed out',
  logout_all: 'Signed out from all devices',
  register: 'Account registered',
  password_change: 'Password changed',
  profile_update: 'Profile updated',
  token_refresh: 'Session refreshed',
};

export function useUserActivity() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  return useQuery<Activity[]>({
    queryKey: ['user-activity'],
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/users/me/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch activity');
      return res.json();
    },
    staleTime: 30 * 1000,
  });
}

export function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
