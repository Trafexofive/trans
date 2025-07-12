import { useEffect, useRef, useState } from "react";

export interface GameState {
    paddles: { [key: number]: { y: number } };
    ball: { x: number; y: number };
    score: { [key: number]: number };
}

export enum GameStatus {
    Connecting = "Connecting",
    Waiting = "Waiting for Opponent",
    InProgress = "In Progress",
    GameOver = "Game Over",
    Disconnected = "Disconnected",
    Error = "Error",
}

export interface PlayerInfo {
    id: number;
    name: string;
}

export const useGameSocket = (
    accessToken: string | null,
    matchId: string | null = null,
) => {
    const [status, setStatus] = useState<GameStatus>(GameStatus.Connecting);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [winnerId, setWinnerId] = useState<number | null>(null);
    const [player1, setPlayer1] = useState<PlayerInfo | null>(null);
    const [player2, setPlayer2] = useState<PlayerInfo | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!accessToken) {
            setStatus(GameStatus.Disconnected);
            return;
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ||
            "http://localhost:3000";
        const WS_URL = API_BASE_URL.replace(/^http/, "ws");

        let socketURL = `${WS_URL}/api/game/socket?token=${accessToken}`;
        if (matchId) {
            socketURL += `&matchId=${matchId}`;
        }

        const socket = new WebSocket(socketURL);
        socketRef.current = socket;
        setStatus(GameStatus.Connecting);

        socket.onopen = () => {
            setStatus(GameStatus.Waiting);
        };

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            switch (message.type) {
                case "gameStart":
                    setStatus(GameStatus.InProgress);
                    setPlayer1(message.payload.player1);
                    setPlayer2(message.payload.player2);
                    setWinnerId(null);
                    break;
                case "gameState":
                    setGameState(message.payload);
                    break;
                case "gameOver":
                    setStatus(GameStatus.GameOver);
                    setWinnerId(message.payload.winnerId);
                    socket.close();
                    break;
                case "queue_timeout":
                    setErrorMessage("Matchmaking timed out. Please try again.");
                    setStatus(GameStatus.Error);
                    socket.close();
                    break;
                case "error":
                    setErrorMessage(message.payload);
                    setStatus(GameStatus.Error);
                    socket.close();
                    break;
            }
        };

        socket.onclose = () => {
            setStatus((currentStatus) => {
                if (
                    currentStatus !== GameStatus.GameOver &&
                    currentStatus !== GameStatus.Error
                ) {
                    return GameStatus.Disconnected;
                }
                return currentStatus;
            });
        };

        socket.onerror = (err) => {
            console.error("WebSocket error:", err);
            setErrorMessage("A connection error occurred.");
            setStatus(GameStatus.Error);
        };

        return () => {
            if (
                socketRef.current?.readyState === WebSocket.OPEN ||
                socketRef.current?.readyState === WebSocket.CONNECTING
            ) {
                socketRef.current.close();
            }
        };
    }, [accessToken, matchId]);

    const movePaddle = (y: number) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const PADDLE_HEIGHT = 100;
            const CANVAS_HEIGHT = 600;
            const clampedY = Math.max(
                0,
                Math.min(y, CANVAS_HEIGHT - PADDLE_HEIGHT),
            );
            socketRef.current.send(
                JSON.stringify({
                    type: "paddleMove",
                    payload: { y: clampedY },
                }),
            );
        }
    };

    return {
        status,
        errorMessage,
        gameState,
        winnerId,
        movePaddle,
        player1,
        player2,
    };
};
