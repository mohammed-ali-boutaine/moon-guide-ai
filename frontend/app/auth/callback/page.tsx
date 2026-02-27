// app/auth/callback/page.tsx
'use client'; // This must be a client component to use useEffect and useSearchParams

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
            // Store tokens exactly as you do in your manual login
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('refresh_token', refreshToken);

            // Redirect to dashboard
            router.push('/dashboard');
        } else {
            // If something went wrong, send them back to login
            router.push('/login?error=auth_failed');
        }
    }, [searchParams, router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h2 className="text-xl font-semibold">Completing login...</h2>
                <p className="text-gray-500">Please wait while we redirect you.</p>
            </div>
        </div>
    );
}