'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProfileMenu from './ProfileMenu';
import FriendRequestsMenu from './FriendRequestsMenu';
import { useAuth } from '@/app/contexts/AuthContext'; // Import useAuth

export default function AppNavbar() {
  const pathname = usePathname();
  const { updateCounter } = useAuth(); // Consume the updateCounter

  const getNavLinkClass = (href: string) => {
    return pathname.startsWith(href) ? 'nav-link-active' : 'nav-link';
  };

  return (
    <div className="navbar-gradient">
      <div className="navbar solid-effect">
        <Link href="/dashboard" className="logo">Pong Transcendence</Link>
        <div className="nav-links">
          <Link href="/play" className={getNavLinkClass('/play')}>Play</Link>
          <Link href="/tournaments" className={getNavLinkClass('/tournaments')}>Tournaments</Link>
          <Link href="/chat" className={getNavLinkClass('/chat')}>Chat</Link>
          <Link href="/leaderboard" className={getNavLinkClass('/leaderboard')}>Leaderboard</Link>
          <Link href="/dashboard" className={getNavLinkClass('/dashboard')}>Dashboard</Link>
        </div>
        <div className="navbar-right flex items-center gap-4">
            {/* FIX: Add the key prop to force re-render on state change */}
            <FriendRequestsMenu key={`friend-requests-${updateCounter}`} />
            <ProfileMenu key={`profile-menu-${updateCounter}`} />
        </div>
      </div>
    </div>
  );
}
