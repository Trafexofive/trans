"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

export default function AppNavbar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const router = useRouter();

    const navLinks = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/play", label: "Play" },
        { href: "/tournaments", label: "Tournaments" },
        { href: "/chat", label: "Chat" },
        { href: "/leaderboard", label: "Leaderboard" },
    ];

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center">
                <nav className="flex items-center space-x-6 text-sm font-medium">
                    <Link
                        href="/dashboard"
                        className="mr-6 flex items-center space-x-2"
                    >
                        <span className="font-bold">Transcendence</span>
                    </Link>
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`transition-colors hover:text-foreground/80 ${
                                pathname === link.href
                                    ? "text-foreground"
                                    : "text-foreground/60"
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <div className="flex flex-1 items-center justify-end space-x-4">
                    {user && (
                        <Link
                            href={`/profile/${user.id}`}
                            className="font-medium text-foreground/80 hover:text-foreground"
                        >
                            {user.name}
                        </Link>
                    )}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleLogout}
                    >
                        Logout
                    </Button>
                </div>
            </div>
        </header>
    );
}
