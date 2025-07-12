'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Gamepad2, Trophy, BarChart, Swords } from 'lucide-react';

export default function DashboardPage() {
    const { user, isLoading } = useAuth();

    if (isLoading || !user) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-primary" />
            </div>
        );
    }

    const totalMatches = user.wins + user.loses;
    const winRate = totalMatches > 0 ? `${Math.round((user.wins / totalMatches) * 100)}%` : "N/A";

    const stats = [
        { title: "Wins", value: user.wins, icon: <Trophy className="h-6 w-6 text-green-400" /> },
        { title: "Losses", value: user.loses, icon: <Swords className="h-6 w-6 text-red-400" /> },
        { title: "Total Matches", value: totalMatches, icon: <Gamepad2 className="h-6 w-6 text-blue-400" /> },
        { title: "Win Rate", value: winRate, icon: <BarChart className="h-6 w-6 text-yellow-400" /> },
    ];

    return (
        <div className="container mx-auto max-w-7xl space-y-8 py-8">
            <div>
                <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
                <p className="text-muted-foreground">This is your command center. Review your stats and jump into a game.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map(stat => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                            {stat.icon}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                    <Button asChild size="lg" className="flex-1"><Link href="/play">Find a Match</Link></Button>
                    <Button asChild variant="secondary" size="lg" className="flex-1"><Link href="/leaderboard">View Leaderboard</Link></Button>
                </CardContent>
            </Card>
        </div>
    );
}
