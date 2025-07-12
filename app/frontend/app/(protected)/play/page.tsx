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

const GameCanvas = (
    { gameState, onMouseMove, player1, player2 }: GameCanvasProps,
) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
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

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            onMouseMove(event.clientY - rect.top);
        }
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
};

const QueueTimer = () => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(
            2,
            "0",
        );
        const seconds = (timeInSeconds % 60).toString().padStart(2, "0");
        return `${minutes}:${seconds}`;
    };

    return (
        <p className="text-2xl font-mono text-muted-foreground mt-4">
            {formatTime(seconds)}
        </p>
    );
};

function PlayPageContent() {
    const { accessToken, user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();

    const matchId = searchParams.get("matchId");
    const tournamentId = searchParams.get("tournamentId");

    const {
        status,
        errorMessage,
        gameState,
        winnerId,
        movePaddle,
        player1,
        player2,
    } = useGameSocket(accessToken, matchId);

    const handlePostGameAction = () => {
        if (tournamentId) {
            router.push(`/tournaments/${tournamentId}`);
        } else {
            window.location.reload();
        }
    };

    const winner = winnerId === player1?.id
        ? player1
        : (winnerId === player2?.id ? player2 : null);
    const winnerName = winner
        ? (winner.id === user?.id ? "You" : winner.name)
        : null;

    const renderContent = () => {
        switch (status) {
            case GameStatus.Connecting:
                return (
                    <StatusScreen
                        title="Connecting to Game Server..."
                        showSpinner
                    />
                );

            case GameStatus.Waiting:
                return (
                    <StatusScreen title="Searching for Opponent..." showSpinner>
                        <QueueTimer />
                    </StatusScreen>
                );

            case GameStatus.InProgress:
                return (
                    <div className="flex flex-col items-center">
                        <div className="flex justify-between w-full max-w-[800px] mb-2 text-white text-lg">
                            <span>{player1?.name || "Player 1"}</span>
                            <span>vs</span>
                            <span>{player2?.name || "Player 2"}</span>
                        </div>
                        <GameCanvas
                            gameState={gameState}
                            onMouseMove={movePaddle}
                            player1={player1}
                            player2={player2}
                        />
                    </div>
                );

            case GameStatus.GameOver:
                return (
                    <StatusScreen
                        title="Game Over"
                        message={winner
                            ? `${winnerName} won!`
                            : "The match has concluded."}
                    >
                        <Button onClick={handlePostGameAction} className="mt-6">
                            {tournamentId
                                ? "Return to Tournament"
                                : "Play Again"}
                        </Button>
                    </StatusScreen>
                );

            case GameStatus.Error:
            case GameStatus.Disconnected:
            default:
                return (
                    <StatusScreen
                        title="Connection Lost"
                        message={errorMessage || "You have been disconnected."}
                    >
                        <Button
                            onClick={handlePostGameAction}
                            variant="secondary"
                            className="mt-6"
                        >
                            {tournamentId ? "Back to Tournament" : "Retry"}
                        </Button>
                    </StatusScreen>
                );
        }
    };

    return (
        <div className="flex h-full items-center justify-center">
            {renderContent()}
        </div>
    );
}

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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary my-4">
            </div>
        )}
        {children}
    </div>
);

export default function PlayPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center items-center h-full">
                    Loading Game...
                </div>
            }
        >
            <PlayPageContent />
        </Suspense>
    );
}
