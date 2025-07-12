"use client";

import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";

// Interfaces
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
export interface Friend {
    id: number;
    name: string;
    avatar: string;
}

// Context Type Definition
interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    friends: Friend[];
    friendIds: Set<number>;
    blockedUserIds: Set<number>;
    pendingRequests: FriendRequest[];
    requestStatuses: FriendRequestStatus;
    chatPartners: ChatPartner[];
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    handleOauthLogin: (accessToken: string, refreshToken: string) => void;
    refreshUserData: () => Promise<void>;
    friendAction: (
        targetUserId: number,
        action: "invite" | "remove" | "accept" | "decline" | "cancel" | "block",
        requestId?: number,
    ) => Promise<void>;
    chats: Map<number, ChatMessage[]>;
    unreadFrom: Set<number>;
    sendChatMessage: (to: number, content: string) => void;
    loadChatHistory: (partnerId: number) => Promise<void>;
    clearUnreadMessages: (partnerId: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendIds, setFriendIds] = useState<Set<number>>(new Set());
    const [blockedUserIds, setBlockedUserIds] = useState<Set<number>>(
        new Set(),
    ); // <<< NEW
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [requestStatuses, setRequestStatuses] = useState<FriendRequestStatus>(
        { sent: [], received: [] },
    );
    const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
    const [chats, setChats] = useState<Map<number, ChatMessage[]>>(new Map());
    const [unreadFrom, setUnreadFrom] = useState<Set<number>>(new Set());
    const socketRef = useRef<WebSocket | null>(null);
    const activeChatPartnerId = useRef<number | null>(null);
    const router = useRouter();

    const logout = useCallback(() => {
        setUser(null);
        setAccessToken(null);
        setFriends([]);
        setFriendIds(new Set());
        setBlockedUserIds(new Set()); 
        setPendingRequests([]);
        setRequestStatuses({ sent: [], received: [] });
        setChatPartners([]);
        setChats(new Map());
        setUnreadFrom(new Set());
        if (socketRef.current) socketRef.current.close();
        localStorage.clear();
        router.push("/login");
    }, [router]);

    const fetchSocialData = useCallback(async (token: string) => {
        if (!API_BASE_URL) return;
        try {
            const [friendsRes, reqsRes, statusesRes, partnersRes, blockedRes] = 
                await Promise.all([
                    fetch(`${API_BASE_URL}/api/friendships`, {
                        headers: { "Authorization": `Bearer ${token}` },
                    }),
                    fetch(`${API_BASE_URL}/api/friendships/requests`, {
                        headers: { "Authorization": `Bearer ${token}` },
                    }),
                    fetch(`${API_BASE_URL}/api/friendships/requests/statuses`, {
                        headers: { "Authorization": `Bearer ${token}` },
                    }),
                    fetch(`${API_BASE_URL}/api/chat/`, {
                        headers: { "Authorization": `Bearer ${token}` },
                    }),
                    fetch(`${API_BASE_URL}/api/friendships/blocked`, {
                        headers: { "Authorization": `Bearer ${token}` },
                    }), 
                ]);
            const [
                friendsData,
                reqsData,
                statusesData,
                partnersData,
                blockedData,
            ] = 
                await Promise.all([
                    friendsRes.json(),
                    reqsRes.json(),
                    statusesRes.json(),
                    partnersRes.json(),
                    blockedRes.json(), 
                ]);
            setFriends(friendsData.success ? friendsData.result : []);
            setFriendIds(
                friendsData.success
                    ? new Set(friendsData.result.map((f: Friend) => f.id))
                    : new Set(),
            );
            setPendingRequests(reqsData.success ? reqsData.result : []);
            setRequestStatuses(
                statusesData.success
                    ? statusesData.result
                    : { sent: [], received: [] },
            );
            setChatPartners(partnersData.success ? partnersData.result : []);
            setBlockedUserIds(
                blockedData.success ? new Set(blockedData.result) : new Set(),
            ); 
        } catch (error) {
            console.error("Failed to fetch social data", error);
            logout();
        }
    }, [logout]);

    const friendAction = useCallback(
        async (targetUserId: number, action: any, requestId?: number) => {
            if (!accessToken || !API_BASE_URL) return;
            let url = `${API_BASE_URL}/api/friendships`;
            let method = "POST";
            let body: any = {};
            let needsBody = false;

            switch (action) {
                case "invite":
                    url += "/requests";
                    body = { receiver_id: targetUserId };
                    needsBody = true;
                    break;
                case "remove":
                    method = "DELETE";
                    url += `/${targetUserId}`;
                    break;
                case "accept":
                    url += `/requests/${requestId}/accept`;
                    break;
                case "decline":
                    method = "DELETE";
                    url += `/requests/${requestId}/decline`;
                    break;
                case "cancel":
                    method = "DELETE";
                    url += `/requests/${requestId}/cancel`;
                    break;
                case "block":
                    url += "/block";
                    body = { blocked_id: targetUserId };
                    needsBody = true;
                    break;
            }

            const fetchOptions: RequestInit = {
                method,
                headers: { "Authorization": `Bearer ${accessToken}` },
            };
            if (needsBody) {
                fetchOptions.headers = {
                    ...fetchOptions.headers,
                    "Content-Type": "application/json",
                };
                fetchOptions.body = JSON.stringify(body);
            }

            try {
                const response = await fetch(url, fetchOptions);
                if (!response.ok) {
                    throw new Error(
                        (await response.json()).result ||
                            `Action ${action} failed`,
                    );
                }
            } catch (error) {
                console.error(`Friend action '${action}' failed:`, error);
            }
        },
        [accessToken],
    );

    const refreshUserData = useCallback(async () => {
        const token = localStorage.getItem("accessToken");
        if (!token || !API_BASE_URL) {
            logout();
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: { "Authorization": `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.result);
                await fetchSocialData(token);
            } else logout();
        } catch (error) {
            console.error("Could not refresh user data", error);
            logout();
        }
    }, [logout, fetchSocialData]);

    const handleOauthLogin = useCallback(
        (newAccessToken: string, newRefreshToken: string) => {
            localStorage.setItem("accessToken", newAccessToken);
            localStorage.setItem("refreshToken", newRefreshToken);
            try {
                const decoded: DecodedToken = jwtDecode(newAccessToken);
                setAccessToken(newAccessToken);
                setUser(decoded.payload);
                router.push("/dashboard");
            } catch (error) {
                console.error("Failed to decode OAuth token", error);
                logout();
            }
        },
        [logout, router],
    );

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            try {
                const decoded: DecodedToken = jwtDecode(token);
                if (new Date(decoded.exp * 1000) > new Date()) {
                    setAccessToken(token);
                    setUser(decoded.payload);
                } else logout();
            } catch (e) {
                logout();
            }
        }
        setIsLoading(false);
    }, [logout]);

    const userId = user?.id;
    useEffect(() => {
        if (accessToken && userId && API_BASE_URL) {
            fetchSocialData(accessToken);
            if (socketRef.current) socketRef.current.close();

            const WS_URL = API_BASE_URL.replace(/^http/, "ws");
            const socket = new WebSocket(
                `${WS_URL}/api/chat/socket?token=${accessToken}`,
            );
            socketRef.current = socket;

            socket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === "social_update") {
                    fetchSocialData(accessToken);
                } else {
                    const partnerId = message.from === userId
                        ? message.to
                        : message.from;
                    setChats((prev) =>
                        new Map(prev).set(partnerId, [
                            ...(prev.get(partnerId) || []),
                            message,
                        ])
                    );
                    if (
                        message.from !== userId &&
                        partnerId !== activeChatPartnerId.current
                    ) {
                        setUnreadFrom((prev) =>
                            new Set(prev).add(message.from)
                        );
                    }
                }
            };
            return () => {
                if (socketRef.current) socketRef.current.close();
            };
        }
    }, [accessToken, userId, fetchSocialData]);

    const login = useCallback(async (email, password) => {
        if (!API_BASE_URL) throw new Error("API URL not configured.");
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.result || "Authentication failed.");
        }
        handleOauthLogin(data.result.access_token, data.result.refresh_token);
    }, [handleOauthLogin]);

    const loadChatHistory = useCallback(async (partnerId: number) => {
        if (!accessToken || !API_BASE_URL) return;
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/chat/${partnerId}`,
                { headers: { "Authorization": `Bearer ${accessToken}` } },
            );
            const data = await response.json();
            if (data.success && Array.isArray(data.result)) {
                setChats((prev) =>
                    new Map(prev).set(
                        partnerId,
                        data.result.sort((a: ChatMessage, b: ChatMessage) =>
                            new Date(a.timestamp).getTime() -
                            new Date(b.timestamp).getTime()
                        ),
                    )
                );
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
        }
    }, [accessToken]);

    const sendChatMessage = useCallback((to: number, content: string) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ to, content }));
        }
    }, []);

    const clearUnreadMessages = useCallback((partnerId: number) => {
        activeChatPartnerId.current = partnerId;
        setUnreadFrom((prev) => {
            const newSet = new Set(prev);
            newSet.delete(partnerId);
            return newSet;
        });
    }, []);

    const value = useMemo(() => ({
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        friends,
        friendIds,
        blockedUserIds,
        pendingRequests,
        requestStatuses,
        chatPartners,
        chats,
        unreadFrom,
        login,
        logout,
        handleOauthLogin,
        refreshUserData,
        friendAction,
        loadChatHistory,
        sendChatMessage,
        clearUnreadMessages,
    }), [
        user,
        accessToken,
        isLoading,
        friends,
        friendIds,
        blockedUserIds,
        pendingRequests,
        requestStatuses,
        chatPartners,
        chats,
        unreadFrom,
        login,
        logout,
        handleOauthLogin,
        refreshUserData,
        friendAction,
        loadChatHistory,
        sendChatMessage,
        clearUnreadMessages,
    ]);

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
