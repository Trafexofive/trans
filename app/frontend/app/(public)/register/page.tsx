"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/Card";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.result || "Registration failed.");
            }
            router.push("/login");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // The layout now handles the background. This div only handles content alignment.
        <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
            <div className="rounded-xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-px shadow-2xl shadow-primary/10">
                <Card className="rounded-[11px] border-none bg-background/80 backdrop-blur-md">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-3xl">
                            Create Account
                        </CardTitle>
                        <CardDescription>
                            Join the ranks of Transcendence
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    id="name"
                                    placeholder="Display Name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Password"
                                    required
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-destructive text-center pt-2">
                                    {error}
                                </p>
                            )}
                            <Button
                                type="submit"
                                className="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
                                disabled={isLoading}
                            >
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Register
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link
                                href="/login"
                                className="font-medium text-primary hover:underline"
                            >
                                Sign In
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
