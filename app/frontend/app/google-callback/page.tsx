"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import Spinner from '@/app/components/Spinner';

function GoogleCallbackComponent() {
    const { handleOauthLogin } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
            // Use the new context function to set the session
            handleOauthLogin(accessToken, refreshToken);
            // Redirect to the dashboard, replacing the current history entry
            router.replace('/dashboard');
        } else {
            // Handle error case: if tokens are missing, redirect to login with an error
            router.replace('/login?error=oauth_failed');
        }
    }, [handleOauthLogin, searchParams, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-white">
            <Spinner />
            <p className="mt-4">Finalizing login...</p>
        </div>
    );
}

// Wrap the component in Suspense because useSearchParams can suspend rendering
export default function GoogleCallbackPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spinner /></div>}>
            <GoogleCallbackComponent />
        </Suspense>
    );
}
