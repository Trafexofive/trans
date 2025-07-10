import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

async function getMyProfile() {
    const cookieStore = cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) return null;

    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/me`,
            {
                headers: { "Authorization": `Bearer ${token}` },
                cache: "no-store",
            },
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data.success ? data.result : null;
    } catch (error) {
        console.error("Failed to fetch profile on server:", error);
        return null;
    }
}

export default async function DashboardPage() {
    const user = await getMyProfile();

    if (!user) {
        return (
            <div>
                <h1 className="text-3xl font-bold">Error</h1>
                <p className="text-muted-foreground">
                    Could not load user dashboard. Please try logging in again.
                </p>
            </div>
        );
    }

    const totalMatches = user.wins + user.loses;
    const winRate = totalMatches > 0
        ? `${Math.round((user.wins / totalMatches) * 100)}%`
        : "N/A";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
                <p className="text-muted-foreground">
                    Here's a look at your journey in the world of Pong.
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Wins</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{user.wins}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Losses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{user.loses}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Total Matches</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{totalMatches}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Win Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{winRate}</p>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Quick Actions</h2>
                <div className="flex gap-4">
                    <Button asChild>
                        <Link href="/play">Find a Match</Link>
                    </Button>
                    <Button variant="secondary" asChild>
                        <Link href="/tournaments">Browse Tournaments</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
