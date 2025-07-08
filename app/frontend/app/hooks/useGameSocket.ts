import { useEffect, useRef, useState } from "react";

export interface GameState {
    matchId: number | null; // Can be null for public games
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
}

export interface PlayerInfo {
    id: number;
    name: string;
}

export const useGameSocket = (
    accessToken: string | null,
    matchId: string | null,
) => {
    const [status, setStatus] = useState<GameStatus>(GameStatus.Connecting);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [winner, setWinner] = useState<PlayerInfo | null>(null);
    const [player1, setPlayer1] = useState<PlayerInfo | null>(null);
    const [player2, setPlayer2] = useState<PlayerInfo | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const playerInfoRef = useRef<
        { p1: PlayerInfo | null; p2: PlayerInfo | null }
    >({ p1: null, p2: null });

    useEffect(() => {
        if (!accessToken) {
            setStatus(GameStatus.Disconnected);
            return;
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ||
            "http://localhost:3000";
        const WS_URL = API_BASE_URL.replace(/^http/, "ws");

        // Conditionally add matchId to the URL only if it exists.
        const socketURL = matchId
            ? `${WS_URL}/api/game/socket?token=${accessToken}&matchId=${matchId}`
            : `${WS_URL}/api/game/socket?token=${accessToken}`;

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
                    playerInfoRef.current = {
                        p1: message.payload.player1,
                        p2: message.payload.player2,
                    };
                    setWinner(null);
                    break;
                case "gameState":
                    setGameState(message.payload);
                    break;
                case "gameOver":
                    setStatus(GameStatus.GameOver);
                    const winnerId = message.payload.winner;
                    const { p1, p2 } = playerInfoRef.current;
                    if (winnerId === p1?.id) setWinner(p1);
                    else if (winnerId === p2?.id) setWinner(p2);
                    socket.close();
                    break;
                case "error":
                    console.error("Game server error:", message.payload);
                    setStatus(GameStatus.Disconnected);
                    socket.close();
                    break;
            }
        };

        socket.onclose = (event) => {
            // Only set to disconnected if it's not a clean close after a game is over
            if (status !== GameStatus.GameOver) {
                setStatus(GameStatus.Disconnected);
            }
        };

        socket.onerror = (err) => {
            console.error("WebSocket error:", err);
            setStatus(GameStatus.Disconnected);
        };

        return () => {
            if (
                socketRef.current &&
                socketRef.current.readyState === WebSocket.OPEN
            ) {
                socketRef.current.close();
            }
        };
        // The dependency on 'status' is removed to prevent re-connections on status change.
    }, [accessToken, matchId]);

    const movePaddle = (y: number) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const PADDLE_HEIGHT = 100;
            const CANVAS_HEIGHT = 600;
            const clampedY = Math.max(
                0,
                Math.min(y, CANVAS_HEIGHT - PADDLE_HEIGHT),
            );

            socketRef.current.send(JSON.stringify({
                type: "paddleMove",
                payload: { y: clampedY },
            }));
        }
    };

    return { status, gameState, winner, movePaddle, player1, player2 };
};
