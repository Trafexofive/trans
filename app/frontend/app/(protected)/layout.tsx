"use client";

import AuthGuard from "@/components/AuthGuard";
import AppNavbar from "@/components/AppNavbar";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isChatPage = pathname.startsWith("/chat");

    return (
        <AuthGuard>
            <div className="flex h-screen flex-col overflow-hidden">
                <AppNavbar />
                {isChatPage
                    ? (
                        // Render a simple container for the chat page to manage its own layout
                        <main className="flex-1 overflow-hidden">
                            {children}
                        </main>
                    )
                    : (
                        // Render the decorative layout for all other pages
                        <main
                            className={cn(
                                "flex-1 overflow-y-auto bg-grid-white/[0.05] relative p-4 sm:p-6 lg:p-8",
                            )}
                        >
                            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]">
                            </div>
                            <div className="relative z-10">
                                {children}
                            </div>
                        </main>
                    )}
            </div>
        </AuthGuard>
    );
}
