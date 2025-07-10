'use client';

import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { jwtDecode } from "jwt-decode";
import { useRouter } from 'next/navigation';

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

// Context Type
interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const logout = useCallback(() => {
        setUser(null);
        setAccessToken(null);
        localStorage.clear();
        // No router push here; let the component calling logout decide
    }, []);

    useEffect(() => {
        setIsLoading(true);
        const token = localStorage.getItem("accessToken");
        if (token) {
            try {
                const decoded: DecodedToken = jwtDecode(token);
                if (new Date(decoded.exp * 1000) > new Date()) {
                    setAccessToken(token);
                    setUser(decoded.payload);
                } else {
                    logout();
                }
            } catch (e) {
                console.error("Token decode failed", e);
                logout();
            }
        }
        setIsLoading(false);
    }, [logout]);

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
        const { access_token, refresh_token } = data.result;
        localStorage.setItem("accessToken", access_token);
        localStorage.setItem("refreshToken", refresh_token);
        const decoded: DecodedToken = jwtDecode(access_token);
        setAccessToken(access_token);
        setUser(decoded.payload);
    }, []);

    const value = useMemo(() => ({
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        logout,
    }), [user, accessToken, isLoading, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
