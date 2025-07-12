"use client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
    return (
        <main className="flex h-screen flex-col items-center justify-center p-8">
            <div className="w-full max-w-3xl rounded-2xl bg-gradient-to-br from-gray-700 via-gray-900 to-black p-px shadow-2xl">
                <div className="rounded-[15px] bg-gray-900 p-8 text-center sm:p-12">
                    <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                        Transcendence
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-gray-300">
                        The definitive Pong experience. Compete, conquer, and
                        ascend.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <Button asChild size="lg">
                            <Link href="/login">Enter the Arena</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                            <Link href="/register">Register Account</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}
