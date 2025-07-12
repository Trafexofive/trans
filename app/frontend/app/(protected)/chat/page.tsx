"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Gamepad2, MessageSquare, ShieldBan, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn, getAvatarSrc } from "@/lib/utils"; // <<< IMPORT CENTRALIZED HELPER

const RenderChatMessage = memo(({ content }: { content: string }) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            parts.push(content.substring(lastIndex, match.index));
        }
        const [fullMatch, text, url] = match;
        parts.push(
            <Link
                key={match.index}
                href={url}
                className="text-blue-400 hover:underline font-bold"
            >
                {text}
            </Link>,
        );
        lastIndex = match.index + fullMatch.length;
    }

    if (lastIndex < content.length) parts.push(content.substring(lastIndex));
    return (
        <div className="text-sm break-words">
            {parts.map((part, i) => <span key={i}>{part}</span>)}
        </div>
    );
});
RenderChatMessage.displayName = "RenderChatMessage";

interface ChatPartner {
    id: number;
    name: string;
    avatar: string;
}

export default function ChatPage() {
    const {
        user,
        chats,
        sendChatMessage,
        loadChatHistory,
        chatPartners,
        friendAction,
        unreadFrom,
        clearUnreadMessages,
        blockedUserIds,
    } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activePartner, setActivePartner] = useState<ChatPartner | null>(
        null,
    );
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const selectPartner = useCallback((partner: ChatPartner) => {
        router.push(`/chat?with=${partner.id}`, { scroll: false });
    }, [router]);

    useEffect(() => {
        const partnerIdStr = searchParams.get("with");
        if (partnerIdStr) {
            const partnerId = parseInt(partnerIdStr, 10);
            if (activePartner?.id !== partnerId) {
                const partner = chatPartners.find((p) => p.id === partnerId);
                if (partner) {
                    setActivePartner(partner);
                    loadChatHistory(partner.id);
                    clearUnreadMessages(partner.id);
                }
            }
        }
    }, [
        searchParams,
        chatPartners,
        activePartner?.id,
        loadChatHistory,
        clearUnreadMessages,
    ]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chats, activePartner]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activePartner) return;
        sendChatMessage(activePartner.id, newMessage);
        setNewMessage("");
    };

    const isBlocked = activePartner
        ? blockedUserIds.has(activePartner.id)
        : false;
    const activeChatMessages = (activePartner && chats.get(activePartner.id)) ||
        [];

    return (
        <Card className="w-full h-full flex shadow-2xl rounded-none border-none">
            <div className="w-1/3 min-w-[300px] border-r border-border flex flex-col">
                <div className="p-4 border-b border-border">
                    <h2 className="text-xl font-semibold">Conversations</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {chatPartners.map((partner) => (
                        <button
                            key={partner.id}
                            onClick={() => selectPartner(partner)}
                            className={cn(
                                "w-full text-left p-3 flex items-center gap-4 transition-colors hover:bg-muted",
                                activePartner?.id === partner.id &&
                                    "bg-secondary",
                            )}
                        >
                            <img
                                src={getAvatarSrc(partner.avatar)}
                                alt={partner.name}
                                className="h-10 w-10 rounded-full object-cover"
                            />
                            <span className="font-medium flex-1 truncate">
                                {partner.name}
                            </span>
                            {unreadFrom.has(partner.id) && (
                                <span className="ml-auto h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
            <div className="w-2/3 flex flex-col bg-muted/20">
                {activePartner
                    ? (
                        <>
                            <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                                <Link
                                    href={`/profile/${activePartner.id}`}
                                    className="flex items-center gap-3 hover:underline"
                                >
                                    <img
                                        src={getAvatarSrc(activePartner.avatar)}
                                        alt={activePartner.name}
                                        className="h-10 w-10 rounded-full object-cover"
                                    />
                                    <h2 className="text-xl font-semibold">
                                        {activePartner.name}
                                    </h2>
                                </Link>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Invite to Game"
                                        onClick={() =>
                                            sendChatMessage(
                                                activePartner.id,
                                                `Let's play Pong! [Play Now](/play?invite=${user?.id})`,
                                            )}
                                    >
                                        <Gamepad2 className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Block User"
                                        onClick={() =>
                                            friendAction(
                                                activePartner.id,
                                                "block",
                                            )}
                                    >
                                        <UserX className="h-5 w-5 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {activeChatMessages.map((msg, index) => (
                                    <div
                                        key={msg.id || `msg-${index}`}
                                        className={cn(
                                            "flex items-end gap-2",
                                            msg.from === user?.id
                                                ? "justify-end"
                                                : "justify-start",
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "max-w-[70%] p-3 rounded-lg shadow",
                                                msg.from === user?.id
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-secondary",
                                            )}
                                        >
                                            <RenderChatMessage
                                                content={msg.content}
                                            />
                                            <p className="text-xs text-right opacity-60 mt-1">
                                                {new Date(msg.timestamp)
                                                    .toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            {isBlocked
                                ? (
                                    <div className="p-4 border-t border-border flex items-center justify-center gap-2 bg-destructive/10 text-destructive-foreground">
                                        <ShieldBan className="h-5 w-5" />
                                        <span>You have blocked this user.</span>
                                    </div>
                                )
                                : (
                                    <form
                                        onSubmit={handleSendMessage}
                                        className="p-4 border-t border-border flex items-center gap-4 bg-card"
                                    >
                                        <Input
                                            value={newMessage}
                                            onChange={(e) =>
                                                setNewMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            className="flex-1"
                                            autoComplete="off"
                                        />
                                        <Button type="submit">Send</Button>
                                    </form>
                                )}
                        </>
                    )
                    : (
                        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground text-center p-8">
                            <MessageSquare className="h-16 w-16 mb-4" />
                            <h2 className="text-xl font-semibold">
                                Select a conversation
                            </h2>
                            <p>
                                Start a new chat from the leaderboard or a
                                user's profile.
                            </p>
                        </div>
                    )}
            </div>
        </Card>
    );
}
