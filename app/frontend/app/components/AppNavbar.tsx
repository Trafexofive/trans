"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { FriendRequestsMenu } from "./FriendRequestsMenu";
import { LogOut, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AppNavbar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const navLinks = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/play", label: "Play" },
        { href: "/tournaments", label: "Tournaments" },
        { href: "/leaderboard", label: "Leaderboard" },
        { href: "/chat", label: "Chat" },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center">
                <nav className="flex items-center gap-6 text-sm">
                    <Link
                        href="/dashboard"
                        className="mr-4 flex items-center gap-2"
                    >
                        <Swords className="h-6 w-6" />
                        <span className="font-bold sm:inline-block">
                            TRANSCENDENCE
                        </span>
                    </Link>
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "transition-colors hover:text-foreground/80",
                                pathname.startsWith(link.href)
                                    ? "text-foreground"
                                    : "text-foreground/60",
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <div className="flex flex-1 items-center justify-end gap-4">
                    {user
                        ? (
                            <>
                                <FriendRequestsMenu />
                                <Button variant="ghost" asChild>
                                    <Link href={`/profile/${user.id}`}>
                                        {user.name}
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={logout}
                                >
                                    <LogOut className="mr-2 h-4 w-4" /> Logout
                                </Button>
                            </>
                        )
                        : (
                            <Button asChild>
                                <Link href="/login">Login</Link>
                            </Button>
                        )}
                </div>
            </div>
        </header>
    );
}
