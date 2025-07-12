"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
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

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            await login(email, password);
        } catch (err: any) {
            setError(
                err.message || "Login failed. Please check your credentials.",
            );
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
                            Enter the Arena
                        </CardTitle>
                        <CardDescription>
                            Sign in to your Transcendence account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
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
                                Sign In
                            </Button>
                        </form>
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border/40" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background/80 px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full transition-all duration-300 hover:scale-105 hover:bg-primary/5"
                            asChild
                            disabled={isLoading}
                        >
                            <a href={`${API_BASE_URL}/login/google`}>Google</a>
                        </Button>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <p className="text-sm text-muted-foreground">
                            No account?{" "}
                            <Link
                                href="/register"
                                className="font-medium text-primary hover:underline"
                            >
                                Register
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
