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
    // Centralized State and Actions
    chats: Map<number, ChatMessage[]>;
    chatPartners: ChatPartner[];
    friendIds: Set<number>;
    pendingRequests: FriendRequest[];
    requestStatuses: FriendRequestStatus;
    unreadFrom: Set<number>;
    sendChatMessage: (to: number, content: string) => void;
    loadChatHistory: (partnerId: number) => Promise<void>;
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
    fetchFriendData: () => Promise<void>;
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
    const [chats, setChats] = useState<Map<number, ChatMessage[]>>(new Map());
    const [friendIds, setFriendIds] = useState<Set<number>>(new Set());
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [requestStatuses, setRequestStatuses] = useState<FriendRequestStatus>(
        { sent: [], received: [] },
    );
    const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
    const [unreadFrom, setUnreadFrom] = useState<Set<number>>(new Set());
    const socketRef = useRef<WebSocket | null>(null);
    const activeChatPartnerId = useRef<number | null>(null);

    const fetchFriendData = useCallback(async (token: string) => {
        try {
            const [friendsRes, requestsRes, statusesRes, partnersRes] =
                await Promise.all([
                    fetch(`${API_BASE_URL}/api/friendships/ids`, {
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
                await fetchFriendData(accessToken);
            } catch (error) {
                console.error(`Friend action '${action}' failed:`, error);
            }
        },
        [accessToken, fetchFriendData],
    );

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

    const userId = user?.id;
    useEffect(() => {
        if (accessToken && userId) {
            fetchFriendData(accessToken);

            if (socketRef.current) socketRef.current.close();

            const WS_URL = API_BASE_URL.replace(/^http/, "ws");
            const socket = new WebSocket(
                `${WS_URL}/api/chat/socket?token=${accessToken}`,
            );
            socketRef.current = socket;
            socket.onmessage = (event) => {
                const message: ChatMessage = JSON.parse(event.data);
                const partnerId = message.from === userId
                    ? message.to
                    : message.from;

                setChats((prevChats) => {
                    const newChats = new Map(prevChats);
                    const currentMessages = newChats.get(partnerId) || [];
                    if (!currentMessages.some((m) => m.id === message.id)) {
                        newChats.set(partnerId, [...currentMessages, message]);
                    }
                    return newChats;
                });

                if (message.from !== activeChatPartnerId.current) {
                    setUnreadFrom((prev) => new Set(prev).add(message.from));
                }
            };
            return () => socket.close();
        }
    }, [accessToken, fetchFriendData, userId]);

    const login = useCallback(async (email: string, password: string) => {
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
        localStorage.setItem("accessToken", access_token);
        localStorage.setItem("refreshToken", refresh_token);
        const decoded = jwtDecode<DecodedToken>(access_token);
        setAccessToken(access_token);
        setUser(decoded.payload);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setAccessToken(null);
        setChats(new Map());
        setFriendIds(new Set());
        setPendingRequests([]);
        setRequestStatuses({ sent: [], received: [] });
        setChatPartners([]);
        if (socketRef.current) socketRef.current.close();
        localStorage.clear();
    }, []);

    const loadChatHistory = useCallback(async (partnerId: number) => {
        if (!accessToken || chats.has(partnerId)) return;

        const response = await fetch(`${API_BASE_URL}/api/chat/${partnerId}`, {
            headers: { "Authorization": `Bearer ${accessToken}` },
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.result)) {
            setChats((prevChats) => {
                const newChats = new Map(prevChats);
                const sortedHistory = data.result.sort((
                    a: ChatMessage,
                    b: ChatMessage,
                ) => new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime()
                );
                newChats.set(partnerId, sortedHistory);
                return newChats;
            });
        }
    }, [accessToken, chats]);

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

    const memoizedFetchFriendData = useCallback(() => {
        if (accessToken) {
            return fetchFriendData(accessToken);
        }
        return Promise.resolve();
    }, [accessToken, fetchFriendData]);

    const value = useMemo(() => ({
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        logout,
        chats,
        chatPartners,
        sendChatMessage,
        loadChatHistory,
        friendIds,
        pendingRequests,
        requestStatuses,
        friendAction,
        unreadFrom,
        clearUnreadMessages,
        fetchFriendData: memoizedFetchFriendData,
    }), [
        user,
        accessToken,
        isLoading,
        login,
        logout,
        chats,
        chatPartners,
        sendChatMessage,
        loadChatHistory,
        friendIds,
        pendingRequests,
        requestStatuses,
        friendAction,
        unreadFrom,
        clearUnreadMessages,
        memoizedFetchFriendData,
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
    // Centralized State and Actions
    chats: Map<number, ChatMessage[]>;
    chatPartners: ChatPartner[];
    friendIds: Set<number>;
    pendingRequests: FriendRequest[];
    requestStatuses: FriendRequestStatus;
    unreadFrom: Set<number>;
    sendChatMessage: (to: number, content: string) => void;
    loadChatHistory: (partnerId: number) => Promise<void>;
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
    fetchFriendData: () => Promise<void>;
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
    const [chats, setChats] = useState<Map<number, ChatMessage[]>>(new Map());
    const [friendIds, setFriendIds] = useState<Set<number>>(new Set());
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [requestStatuses, setRequestStatuses] = useState<FriendRequestStatus>(
        { sent: [], received: [] },
    );
    const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
    const [unreadFrom, setUnreadFrom] = useState<Set<number>>(new Set());
    const socketRef = useRef<WebSocket | null>(null);
    const activeChatPartnerId = useRef<number | null>(null);

    const fetchFriendData = useCallback(async (token: string) => {
        try {
            const [friendsRes, requestsRes, statusesRes, partnersRes] =
                await Promise.all([
                    fetch(`${API_BASE_URL}/api/friendships/ids`, {
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
                await fetchFriendData(accessToken);
            } catch (error) {
                console.error(`Friend action '${action}' failed:`, error);
            }
        },
        [accessToken, fetchFriendData],
    );

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
    
    const userId = user?.id;
    useEffect(() => {
        if (accessToken && userId) {
            fetchFriendData(accessToken);

            if (socketRef.current) socketRef.current.close();

            const WS_URL = API_BASE_URL.replace(/^http/, "ws");
            const socket = new WebSocket(
                `${WS_URL}/api/chat/socket?token=${accessToken}`,
            );
            socketRef.current = socket;
            socket.onmessage = (event) => {
                const message: ChatMessage = JSON.parse(event.data);
                const partnerId = message.from === userId
                    ? message.to
                    : message.from;

                setChats((prevChats) => {
                    const newChats = new Map(prevChats);
                    const currentMessages = newChats.get(partnerId) || [];
                    if (!currentMessages.some((m) => m.id === message.id)) {
                        newChats.set(partnerId, [...currentMessages, message]);
                    }
                    return newChats;
                });

                if (message.from !== activeChatPartnerId.current) {
                    setUnreadFrom((prev) => new Set(prev).add(message.from));
                }
            };
            return () => socket.close();
        }
    }, [accessToken, fetchFriendData, userId]);

    const login = useCallback(async (email: string, password: string) => {
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
        localStorage.setItem("accessToken", access_token);
        localStorage.setItem("refreshToken", refresh_token);
        const decoded = jwtDecode<DecodedToken>(access_token);
        setAccessToken(access_token);
        setUser(decoded.payload);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setAccessToken(null);
        setChats(new Map());
        setFriendIds(new Set());
        setPendingRequests([]);
        setRequestStatuses({ sent: [], received: [] });
        setChatPartners([]);
        if (socketRef.current) socketRef.current.close();
        localStorage.clear();
    }, []);

    const loadChatHistory = useCallback(async (partnerId: number) => {
        if (!accessToken || chats.has(partnerId)) return;

        const response = await fetch(`${API_BASE_URL}/api/chat/${partnerId}`, {
            headers: { "Authorization": `Bearer ${accessToken}` },
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.result)) {
            setChats((prevChats) => {
                const newChats = new Map(prevChats);
                const sortedHistory = data.result.sort((
                    a: ChatMessage,
                    b: ChatMessage,
                ) => new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime()
                );
                newChats.set(partnerId, sortedHistory);
                return newChats;
            });
        }
    }, [accessToken, chats]);

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
    
    const memoizedFetchFriendData = useCallback(() => {
        if (accessToken) {
            return fetchFriendData(accessToken);
        }
        return Promise.resolve();
    }, [accessToken, fetchFriendData]);
    
    const value = useMemo(() => ({
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        logout,
        chats,
        chatPartners,
        sendChatMessage,
        loadChatHistory,
        friendIds,
        pendingRequests,
        requestStatuses,
        friendAction,
        unreadFrom,
        clearUnreadMessages,
        fetchFriendData: memoizedFetchFriendData,
    }), [
        user, accessToken, isLoading, login, logout, chats, chatPartners,
        sendChatMessage, loadChatHistory, friendIds, pendingRequests,
        requestStatuses, friendAction, unreadFrom, clearUnreadMessages,
        memoizedFetchFriendData
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
