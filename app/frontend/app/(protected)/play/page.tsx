"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
    GameState,
    GameStatus,
    PlayerInfo,
    useGameSocket,
} from "@/hooks/useGameSocket";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icons } from "@/components/ui/icons";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 10;

interface GameCanvasProps {
    gameState: GameState | null;
    onMouseMove: (y: number) => void;
    player1: PlayerInfo | null;
    player2: PlayerInfo | null;
}

const GameCanvas = React.memo(
    ({ gameState, onMouseMove, player1, player2 }: GameCanvasProps) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        useEffect(() => {
            const context = canvasRef.current?.getContext("2d");
            if (!context || !gameState) return;
            context.fillStyle = "#161618";
            context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            context.strokeStyle = "#4A4A4A";
            context.beginPath();
            context.setLineDash([10, 10]);
            context.moveTo(CANVAS_WIDTH / 2, 0);
            context.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
            context.stroke();
            context.setLineDash([]);
            context.fillStyle = "#FCFDFD";
            if (player1 && gameState.paddles[player1.id]) {
                context.fillRect(
                    PADDLE_WIDTH,
                    gameState.paddles[player1.id].y,
                    PADDLE_WIDTH,
                    PADDLE_HEIGHT,
                );
            }
            if (player2 && gameState.paddles[player2.id]) {
                context.fillRect(
                    CANVAS_WIDTH - (PADDLE_WIDTH * 2),
                    gameState.paddles[player2.id].y,
                    PADDLE_WIDTH,
                    PADDLE_HEIGHT,
                );
            }
            context.beginPath();
            context.arc(
                gameState.ball.x,
                gameState.ball.y,
                BALL_RADIUS,
                0,
                Math.PI * 2,
            );
            context.fill();
            context.font = '48px "Courier New", Courier, monospace';
            if (player1 && gameState.score[player1.id] !== undefined) {
                context.fillText(
                    gameState.score[player1.id].toString(),
                    CANVAS_WIDTH / 2 - 80,
                    60,
                );
            }
            if (player2 && gameState.score[player2.id] !== undefined) {
                context.fillText(
                    gameState.score[player2.id].toString(),
                    CANVAS_WIDTH / 2 + 50,
                    60,
                );
            }
        }, [gameState, player1, player2]);

        const handleMouseMove = (
            event: React.MouseEvent<HTMLCanvasElement>,
        ) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) onMouseMove(event.clientY - rect.top);
        };
        return (
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onMouseMove={handleMouseMove}
                className="bg-[#161618] rounded-lg shadow-2xl"
            />
        );
    },
);
GameCanvas.displayName = "GameCanvas";

const QueueTimer = () => {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
        return () => clearInterval(timer);
    }, []);
    const formatTime = (time: number) =>
        `${Math.floor(time / 60).toString().padStart(2, "0")}:${
            (time % 60).toString().padStart(2, "0")
        }`;
    return (
        <p className="text-2xl font-mono text-muted-foreground mt-4">
            {formatTime(seconds)}
        </p>
    );
};

interface StatusScreenProps {
    title: string;
    message?: string;
    showSpinner?: boolean;
    children?: React.ReactNode;
}
const StatusScreen = (
    { title, message, showSpinner = false, children }: StatusScreenProps,
) => (
    <div className="text-center text-white bg-card p-10 rounded-lg shadow-lg flex flex-col items-center">
        <h2 className="text-3xl font-bold mb-3">{title}</h2>
        {message && <p className="text-muted-foreground mb-4">{message}</p>}
        {showSpinner && (
            <Icons.Spinner className="h-8 w-8 text-primary animate-spin my-4" />
        )}
        {children}
    </div>
);

function PlayPageContent() {
    const { accessToken, user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const matchId = searchParams.get("matchId");
    const tournamentId = searchParams.get("tournamentId");
    const isSpectator = searchParams.get("spectate") === "true";

    const {
        status,
        errorMessage,
        gameState,
        winnerId,
        movePaddle,
        player1,
        player2,
    } = useGameSocket(accessToken, matchId, isSpectator);

    useEffect(() => {
        if (status === GameStatus.GameOver && tournamentId) {
            const timer = setTimeout(
                () => router.push(`/tournaments/${tournamentId}`),
                3000,
            );
            return () => clearTimeout(timer);
        }
    }, [status, tournamentId, router]);

    if (isAuthLoading) {
        return <StatusScreen title="Authenticating..." showSpinner />;
    }

    const winner = winnerId === player1?.id
        ? player1
        : (winnerId === player2?.id ? player2 : null);
    const winnerName = winner
        ? (winner.id === user?.id ? "You" : winner.name)
        : null;

    const handlePostGameAction = () => {
        if (isSpectator) router.back();
        else window.location.reload();
    };

    return (
        <div className="flex h-full items-center justify-center animate-fade-in-up">
            {status === GameStatus.Connecting && (
                <StatusScreen
                    title="Connecting to Game Server..."
                    showSpinner
                />
            )}
            {status === GameStatus.Waiting && (
                <StatusScreen
                    title={isSpectator
                        ? "Waiting for Match to Start..."
                        : "Searching for Opponent..."}
                    showSpinner
                >
                    <QueueTimer />
                </StatusScreen>
            )}
            {status === GameStatus.InProgress && (
                <div className="flex flex-col items-center relative">
                    {isSpectator && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-900/50 text-blue-300 px-4 py-1 rounded-full text-sm font-semibold border border-blue-700">
                            SPECTATOR MODE
                        </div>
                    )}
                    <div className="flex justify-between w-full max-w-[800px] my-2 text-white text-lg font-semibold">
                        <span>{player1?.name || "Player 1"}</span>
                        <span>vs</span>
                        <span>{player2?.name || "Player 2"}</span>
                    </div>
                    <GameCanvas
                        gameState={gameState}
                        onMouseMove={isSpectator ? () => {} : movePaddle}
                        player1={player1}
                        player2={player2}
                    />
                </div>
            )}
            {status === GameStatus.GameOver && (
                <StatusScreen
                    title="Game Over"
                    message={winner
                        ? `${winnerName} won!`
                        : "The match has concluded."}
                >
                    <Button onClick={handlePostGameAction} className="mt-6">
                        {isSpectator
                            ? "Back to Previous Page"
                            : tournamentId
                            ? "Return to Tournament"
                            : "Play Again"}
                    </Button>
                </StatusScreen>
            )}
            {(status === GameStatus.Error ||
                status === GameStatus.Disconnected) && (
                <StatusScreen
                    title="Connection Issue"
                    message={errorMessage || "You have been disconnected."}
                >
                    <Button
                        onClick={() =>
                            router.push(
                                tournamentId
                                    ? `/tournaments/${tournamentId}`
                                    : "/play",
                            )}
                        variant="secondary"
                        className="mt-6"
                    >
                        {tournamentId ? "Back to Tournament" : "Back to Play"}
                    </Button>
                </StatusScreen>
            )}
        </div>
    );
}

export default function PlayPage() {
    return (
        <Suspense
            fallback={<StatusScreen title="Loading Game..." showSpinner />}
        >
            <PlayPageContent />
        </Suspense>
    );
}
