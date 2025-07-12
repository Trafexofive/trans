"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import { FriendRequestsMenu } from "./FriendRequestsMenu";
import ProfileMenu from "./ProfileMenu";
import { LogOut, Menu, Settings, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/ui/icons"; // <<< IMPORT NEW ICONS

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
                <Link
                    href="/dashboard"
                    className="mr-6 flex items-center gap-2"
                >
                    <Icons.Logo />
                    <span className="hidden font-bold sm:inline-block">
                        TRANSCENDENCE
                    </span>
                </Link>

                <nav className="hidden items-center gap-6 text-sm md:flex">
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

                <div className="flex flex-1 items-center justify-end gap-2">
                    {user
                        ? (
                            <>
                                <FriendRequestsMenu />
                                <div className="hidden md:block">
                                    <ProfileMenu />
                                </div>
                            </>
                        )
                        : (
                            <Button asChild size="sm">
                                <Link href="/login">Login</Link>
                            </Button>
                        )}

                    <div className="md:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[240px]">
                                <nav className="flex flex-col gap-4 mt-8">
                                    {navLinks.map((link) => (
                                        <SheetClose asChild key={link.href}>
                                            <Link
                                                href={link.href}
                                                className={cn(
                                                    "text-lg",
                                                    pathname.startsWith(
                                                            link.href,
                                                        )
                                                        ? "text-primary"
                                                        : "text-muted-foreground",
                                                )}
                                            >
                                                {link.label}
                                            </Link>
                                        </SheetClose>
                                    ))}
                                </nav>
                                {user && (
                                    <div className="mt-8 border-t pt-4">
                                        <SheetClose asChild>
                                            <Link
                                                href={`/profile/${user.id}`}
                                                className="flex items-center gap-3 py-2 text-lg text-muted-foreground"
                                            >
                                                <UserCircle className="h-5 w-5" />Profile
                                            </Link>
                                        </SheetClose>
                                        <SheetClose asChild>
                                            <Link
                                                href="/settings"
                                                className="flex items-center gap-3 py-2 text-lg text-muted-foreground"
                                            >
                                                <Settings className="h-5 w-5" />Settings
                                            </Link>
                                        </SheetClose>
                                        <Button
                                            variant="ghost"
                                            onClick={logout}
                                            className="w-full justify-start px-0 py-2 text-lg text-destructive hover:text-destructive"
                                        >
                                            <LogOut className="mr-3 h-5 w-5" />Logout
                                        </Button>
                                    </div>
                                )}
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </header>
    );
}
