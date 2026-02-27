// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function AuthCallbackPage() {
    const router = useRouter();
    const { refreshUser } = useAuth();

    useEffect(() => {
        // Tokens are set as httpOnly cookies by the backend during Google OAuth callback.
        // Just load the user profile and redirect.
        const completeLogin = async () => {
            await refreshUser();
            router.push('/dashboard');
        };
        completeLogin();
    }, [router, refreshUser]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h2 className="text-xl font-semibold">Completing login...</h2>
                <p className="text-gray-500">Please wait while we redirect you.</p>
            </div>
        </div>
    );
}