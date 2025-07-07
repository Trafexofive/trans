"use client";

import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { jwtDecode } from "jwt-decode";

// --- Interfaces ---
interface User {
    id: number;
    name: string;
    email: string;
    avatar: string;
    wins: number;
    loses: number;
}
interface DecodedToken {
    payload: User;
    iat: number;
    exp: number;
}
interface ChatMessage {
    id: number;
    from: number;
    to: number;
    content: string;
    timestamp: string;
}
export interface FriendRequest {
    id: number;
    sender_id: number;
    sender_name: string;
    sender_avatar: string;
}
export interface FriendRequestStatus {
    sent: { receiver_id: number; id: number }[];
    received: { sender_id: number; id: number }[];
}
export interface ChatPartner {
    id: number;
    name: string;
    avatar: string;
}

interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    chatMessages: ChatMessage[];
    chatPartners: ChatPartner[];
    sendChatMessage: (to: number, content: string) => void;
    loadChatHistory: (partnerId: number) => Promise<void>;
    friendIds: Set<number>;
    pendingRequests: FriendRequest[];
    requestStatuses: FriendRequestStatus;
    friendAction: (
        targetUserId: number,
        action:
            | "invite"
            | "remove"
            | "accept"
            | "decline"
            | "cancel"
            | "block"
            | "unblock",
        requestId?: number,
    ) => Promise<void>;
    clearUnreadMessages: (partnerId: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error("FATAL_ERROR: NEXT_PUBLIC_API_BASE_URL is not defined.");
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [friendIds, setFriendIds] = useState<Set<number>>(new Set());
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [requestStatuses, setRequestStatuses] = useState<FriendRequestStatus>(
        { sent: [], received: [] },
    );
    const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
    const [unreadFrom, setUnreadFrom] = useState<Set<number>>(new Set());
    const socketRef = useRef<WebSocket | null>(null);
    const activeChatPartnerId = useRef<number | null>(null);

    const fetchAllData = useCallback(async () => {
        if (!accessToken) return;
        try {
            const [friendsRes, requestsRes, statusesRes, partnersRes] =
                await Promise.all([
                    fetch(`${API_BASE_URL}/api/friendships/ids`, {
                        headers: { "Authorization": `Bearer ${accessToken}` },
                    }),
                    fetch(`${API_BASE_URL}/api/friendships/requests`, {
                        headers: { "Authorization": `Bearer ${accessToken}` },
                    }),
                    fetch(`${API_BASE_URL}/api/friendships/requests/statuses`, {
                        headers: { "Authorization": `Bearer ${accessToken}` },
                    }),
                    fetch(`${API_BASE_URL}/api/chat/`, {
                        headers: { "Authorization": `Bearer ${accessToken}` },
                    }),
                ]);
            const [friendsData, requestsData, statusesData, partnersData] =
                await Promise.all([
                    friendsRes.json(),
                    requestsRes.json(),
                    statusesRes.json(),
                    partnersRes.json(),
                ]);

            if (friendsData.success) setFriendIds(new Set(friendsData.result));
            if (requestsData.success) setPendingRequests(requestsData.result);
            if (statusesData.success) setRequestStatuses(statusesData.result);
            if (partnersData.success) setChatPartners(partnersData.result);
        } catch (error) {
            console.error("Failed to fetch social data", error);
        }
    }, [accessToken, API_BASE_URL]);

    useEffect(() => {
        const storedToken = localStorage.getItem("accessToken");
        if (storedToken) {
            try {
                const decoded = jwtDecode<DecodedToken>(storedToken);
                if (new Date(decoded.exp * 1000) > new Date()) {
                    setAccessToken(storedToken);
                    setUser(decoded.payload);
                } else localStorage.clear();
            } catch (error) {
                localStorage.clear();
            }
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!accessToken) {
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
            return;
        }

        fetchAllData();

        const WS_URL = API_BASE_URL.replace(/^http/, "ws");
        const socket = new WebSocket(
            `${WS_URL}/api/chat/socket?token=${accessToken}`,
        );
        socketRef.current = socket;
        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            setChatMessages((prev) => [...prev, message]);
            if (message.from !== activeChatPartnerId.current) {
                setUnreadFrom((prev) => new Set(prev).add(message.from));
            }
        };
        return () => socket.close();
    }, [accessToken, fetchAllData]);

    const login = async (email: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.result || "Authentication failed.");
        }

        const { access_token, refresh_token } = data.result;
        const decoded = jwtDecode<DecodedToken>(access_token);
        localStorage.setItem("accessToken", access_token);
        localStorage.setItem("refreshToken", refresh_token);
        setAccessToken(access_token);
        setUser(decoded.payload);
    };

    const logout = () => {
        setUser(null);
        setAccessToken(null);
        setChatMessages([]);
        setFriendIds(new Set());
        setPendingRequests([]);
        setRequestStatuses({ sent: [], received: [] });
        setChatPartners([]);
        if (socketRef.current) socketRef.current.close();
        localStorage.clear();
    };

    const loadChatHistory = useCallback(async (partnerId: number) => {
        if (!accessToken) return;
        const response = await fetch(`${API_BASE_URL}/api/chat/${partnerId}`, {
            headers: { "Authorization": `Bearer ${accessToken}` },
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.result)) {
            setChatMessages((prev) => {
                const existingIds = new Set(prev.map((msg) => msg.id));
                const newHistory = data.result.filter((msg: ChatMessage) =>
                    !existingIds.has(msg.id)
                );
                return [...prev, ...newHistory].sort((a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime()
                );
            });
        }
    }, [accessToken, API_BASE_URL]);

    const sendChatMessage = useCallback((to: number, content: string) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ to, content }));
        }
    }, []);

    const clearUnreadMessages = useCallback((partnerId: number) => {
        setUnreadFrom((prev) => {
            const newSet = new Set(prev);
            newSet.delete(partnerId);
            return newSet;
        });
        activeChatPartnerId.current = partnerId;
    }, []);

    const friendAction = useCallback(
        async (
            targetUserId: number,
            action:
                | "invite"
                | "remove"
                | "accept"
                | "decline"
                | "cancel"
                | "block"
                | "unblock",
            requestId?: number,
        ) => {
            if (!accessToken) return;
            let url = `${API_BASE_URL}/api/friendships`;
            let method = "POST";
            const body = JSON.stringify({
                receiver_id: targetUserId,
                friend_id: targetUserId,
                blocked_id: targetUserId,
            });

            switch (action) {
                case "invite":
                    url += "/requests";
                    break;
                case "remove":
                    method = "DELETE";
                    break;
                case "accept":
                    url += `/requests/${requestId}/accept`;
                    break;
                case "decline":
                    url += `/requests/${requestId}/decline`;
                    method = "DELETE";
                    break;
                case "cancel":
                    url += `/requests/${requestId}/cancel`;
                    method = "DELETE";
                    break;
                case "block":
                    url += "/block";
                    break;
                case "unblock":
                    url += "/block";
                    method = "DELETE";
                    break;
            }
            try {
                const response = await fetch(url, {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`,
                    },
                    body,
                });
                if (!response.ok) throw new Error("Action failed");
                await fetchAllData();
            } catch (error) {
                console.error(`Friend action '${action}' failed:`, error);
            }
        },
        [accessToken, API_BASE_URL, fetchAllData],
    );

    const value = {
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        logout,
        chatMessages,
        chatPartners,
        sendChatMessage,
        loadChatHistory,
        friendIds,
        pendingRequests,
        requestStatuses,
        friendAction,
        clearUnreadMessages,
    };

    return <AuthContext.Provider value={value}>{children}
    </AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
