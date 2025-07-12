"use client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
    return (
        <main className="landing-bg flex h-screen w-screen flex-col items-center justify-center p-4">
            <div className="relative z-10 w-full max-w-2xl animate-fade-in-up">
                <div className="rounded-xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-px shadow-2xl shadow-primary/10">
                    <div className="rounded-[11px] bg-background/80 p-8 text-center backdrop-blur-md sm:p-12">
                        <h1 className="font-heading text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-gray-200 to-gray-500 sm:text-7xl">
                            Transcendence
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-gray-300">
                            The definitive real-time Pong experience. Compete in
                            tournaments, climb the leaderboard, and achieve
                            digital immortality.
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button
                                asChild
                                size="lg"
                                className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
                            >
                                <Link href="/login">Enter the Arena</Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:bg-primary/5"
                            >
                                <Link href="/register">Register Account</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

