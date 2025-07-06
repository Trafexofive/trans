'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

interface Tournament {
    id: number;
    name: string;
    status: string;
    creator_id: number;
}

export default function TournamentsPage() {
    const { accessToken } = useAuth();
    const router = useRouter();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [tournamentName, setTournamentName] = useState('');
    const [error, setError] = useState('');
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // TODO: We need a backend endpoint to fetch ALL tournaments. For now, we'll just handle creation.
    // This is a placeholder for where you would fetch the list of tournaments.
    useEffect(() => {
        // Mock data until the endpoint is created
        // In a real scenario: fetch(`${API_BASE_URL}/api/tournaments`)...
        console.log("Fetching all tournaments is not yet implemented on the backend.");
    }, [accessToken, API_BASE_URL]);

    const handleCreateTournament = async () => {
        if (!tournamentName.trim() || !accessToken) {
            setError("Tournament name cannot be empty.");
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/tournaments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ name: tournamentName }),
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.result);
            
            // On success, redirect to the new tournament's lobby page
            router.push(`/tournaments/${data.result.id}`);

        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="page-container">
            <h1 className="text-3xl font-bold text-white mb-6">Tournaments</h1>
            <div className="bg-[#1a1a1c] p-6 rounded-lg mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Create New Tournament</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={tournamentName}
                        onChange={(e) => setTournamentName(e.target.value)}
                        placeholder="Enter tournament name"
                        className="form-input flex-grow"
                    />
                    <button onClick={handleCreateTournament} className="btn btn-primary">
                        Create
                    </button>
                </div>
                {error && <p className="text-red-500 mt-2">{error}</p>}
            </div>

            {/* This is where the list of existing tournaments would be rendered */}
            <div className="bg-[#1a1a1c] p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-white mb-4">Upcoming Tournaments</h2>
                <p className="text-gray-400">List of tournaments coming soon...</p>
            </div>
        </div>
    );
}
