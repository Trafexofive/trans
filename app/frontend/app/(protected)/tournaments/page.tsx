'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PlusCircle, Users, Trophy, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tournament {
    id: number;
    name: string;
    status: 'pending' | 'in_progress' | 'completed';
    creator_name: string;
    participant_count: number;
}

export default function TournamentsPage() {
    const { accessToken } = useAuth();
    const router = useRouter();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [tournamentName, setTournamentName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const fetchTournaments = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/tournaments`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            const data = await response.json();
            if (data.success) setTournaments(data.result); else throw new Error(data.result);
        } catch (err: any) { setError(err.message); } 
        finally { setIsLoading(false); }
    }, [accessToken, API_BASE_URL]);

    useEffect(() => { if (accessToken) fetchTournaments(); }, [accessToken, fetchTournaments]);

    const handleCreateTournament = async () => {
        if (!tournamentName.trim()) { setError("Tournament name cannot be empty."); return; }
        setIsCreating(true);
        setError("");
        try {
            const response = await fetch(`${API_BASE_URL}/api/tournaments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ name: tournamentName }),
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.result);
            router.push(`/tournaments/${data.result.id}`);
        } catch (err: any) { setError(err.message); } 
        finally { setIsCreating(false); }
    };

    return (
        <div className="container mx-auto max-w-7xl py-8 space-y-8 animate-fade-in-up">
            <h1 className="text-4xl font-bold tracking-tight">Tournaments</h1>
            <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PlusCircle className="h-6 w-6"/>Create New Tournament</CardTitle>
                    <CardDescription>Start a new bracket and invite your friends to compete for glory.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-2">
                    <Input value={tournamentName} onChange={(e) => setTournamentName(e.target.value)} placeholder="Enter tournament name..."/>
                    <Button onClick={handleCreateTournament} disabled={isCreating} className="transition-transform hover:scale-105">
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create
                    </Button>
                </CardContent>
                {error && <p className="text-destructive text-sm px-6 pb-4">{error}</p>}
            </Card>

            <div>
                <h2 className="text-2xl font-semibold mb-4">Active Lobbies</h2>
                {isLoading ? (
                     <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                ) : tournaments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tournaments.map(t => (
                            <Card key={t.id} className="bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors duration-300 group flex flex-col">
                                <CardHeader>
                                    <CardTitle className="truncate group-hover:text-primary">{t.name}</CardTitle>
                                    <CardDescription>Created by {t.creator_name}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-4 text-sm">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <div className="flex items-center gap-2"><Users className="h-4 w-4"/><span>{t.participant_count} participants</span></div>
                                        <span className={cn('px-2 py-1 text-xs font-semibold rounded-full', t.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-green-900/50 text-green-400')}>
                                            {t.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </CardContent>
                                <div className="p-6 pt-0">
                                     <Button className="w-full transition-transform group-hover:scale-105" variant="secondary" onClick={() => router.push(`/tournaments/${t.id}`)}>View Lobby</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg bg-card/30">
                        <Trophy className="mx-auto h-12 w-12" />
                        <h3 className="mt-2 text-sm font-semibold">No active tournaments</h3>
                        <p className="mt-1 text-sm">Why not start one?</p>
                    </div>
                )}
            </div>
        </div>
    );
}
