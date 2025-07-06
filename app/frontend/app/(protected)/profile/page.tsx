"use client";


// will only be used to route /profile/ to the logged-in user's profile (/profile/[id])



import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

export default function ProfilePage() {
  const { user: loggedInUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to the logged-in user's profile if no ID is provided
    if (loggedInUser) {
      router.push(`/profile/${loggedInUser.id}`);
    }
  }, [loggedInUser, router]);

  // Render nothing since this component is only for redirection
  return null;
}
