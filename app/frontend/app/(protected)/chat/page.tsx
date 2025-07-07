'use client';

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const ChatMessageContent = ({ content }: { content: string }) => {
    const urlRegex = /(\[Play Now\]\(\/play\))/g;
    const parts = content.split(urlRegex);
    return (
        <p className="message-content">
            {parts.map((part, index) => {
                const isGameInvite = part.match(urlRegex);
                if (isGameInvite) return <Link key={index} href="/play" className="text-blue-400 font-bold hover:underline">Play Now</Link>;
                return part;
            })}
        </p>
    );
};

interface ConversationPartner { id: number; name: string; avatar: string; }
interface Message { id: number; from: number; to: number; content: string; timestamp: string; }

export default function ChatPage() {
    const { user, accessToken, isLoading, chatMessages, sendChatMessage, loadChatHistory, chatPartners, friendAction, unreadFrom, clearUnreadMessages } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activePartner, setActivePartner] = useState<ConversationPartner | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [isBlockedByMe, setIsBlockedByMe] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const fetchBlockStatus = useCallback(async (partnerId: number) => {
        if (!accessToken) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/friendships/block/${partnerId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            const data = await res.json();
            if (data.success) setIsBlockedByMe(data.result.isBlocked);
        } catch (e) { console.error("Failed to fetch block status", e); }
    }, [accessToken, API_BASE_URL]);

    useEffect(() => {
        const partnerIdStr = searchParams.get('with');
        if (partnerIdStr) {
            const partnerId = parseInt(partnerIdStr, 10);
            const partner = chatPartners.find(p => p.id === partnerId);
            if (partner) {
                setActivePartner(partner);
                loadChatHistory(partnerId);
                clearUnreadMessages(partnerId);
                fetchBlockStatus(partnerId);
            } else { setActivePartner(null); }
        } else { setActivePartner(null); }
    }, [searchParams, chatPartners, loadChatHistory, clearUnreadMessages, fetchBlockStatus]);

    const handleSendMessage = () => {
        if (!newMessage.trim() || !activePartner) return;
        sendChatMessage(activePartner.id, newMessage);
        setNewMessage("");
    };

    const handleFriendAndBlockAction = async (action: 'remove' | 'block' | 'unblock') => {
        if (!activePartner) return;
        let confirmText = `Are you sure you want to ${action} ${activePartner.name}?`;
        if (action === 'block') confirmText += " This will also remove them as a friend.";
        if (window.confirm(confirmText)) {
            await friendAction(activePartner.id, action);
            if (action === 'remove' || action === 'block') router.push('/chat');
            else fetchBlockStatus(activePartner.id); // Re-fetch status on unblock
        }
    };

    const activeChatMessages = chatMessages.filter(msg => (msg.from === user?.id && msg.to === activePartner?.id) || (msg.from === activePartner?.id && msg.to === user?.id));
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChatMessages.length]);

    if (isLoading) return <div className="p-10 text-center text-white">Loading...</div>;

    return (
        <div className="page-container">
            <div className="chat-main-container">
                <div className="sidebar-gradient">
                    <div className="sidebar solid-effect">
                        <div className="sidebar-header"><h2 className="sidebar-title">Conversations</h2></div>
                        <div className="conversation-list">
                            {chatPartners.map((partner) => (
                                <div key={partner.id} onClick={() => router.push(`/chat?with=${partner.id}`)} className={`conversation-item ${activePartner?.id === partner.id ? "active" : ""}`}>
                                    <div className="relative">
                                        <img src={partner.avatar || "/avatars/default.png"} alt={partner.name} className="avatar" />
                                        {unreadFrom.has(partner.id) && <span className="absolute top-0 left-0 block h-3 w-3 rounded-full bg-green-400 ring-2 ring-gray-800"></span>}
                                    </div>
                                    <div className="conversation-user-info"><p className="conversation-username">{partner.name}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="chat-area-gradient">
                    <div className="chat-area solid-effect">
                        {activePartner ? (
                            <>
                                <div className="chat-header">
                                    <p className="chat-header-name">{activePartner.name}</p>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => sendChatMessage(activePartner.id, `Let's play Pong! [Play Now](/play)`)} className="btn btn-primary text-xs px-3 py-1">Invite</button>
                                        <button onClick={() => handleFriendAndBlockAction('remove')} className="btn btn-secondary text-xs px-3 py-1">Remove Friend</button>
                                        <button onClick={() => handleFriendAndBlockAction(isBlockedByMe ? 'unblock' : 'block')} className={`btn text-xs px-3 py-1 ${isBlockedByMe ? 'bg-yellow-500 hover:bg-yellow-600' : 'btn-danger'}`}>
                                            {isBlockedByMe ? 'Unblock' : 'Block'}
                                        </button>
                                    </div>
                                </div>
                                <div className="messages-container">
                                    {activeChatMessages.map((msg) => (
                                        <div key={msg.id} className={`message-wrapper ${msg.from === user?.id ? "sent" : "received"}`}><div className="message-gradient"><div className="message-bubble"><ChatMessageContent content={msg.content} /><p className="message-timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div></div></div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="input-area"><div className="input-wrapper"><div className="input-gradient"><input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={`Message ${activePartner.name}...`} className="message-input" /></div></div></div>
                            </>
                        ) : (<div className="empty-chat-state"><p className="empty-chat-text">Select a conversation.</p></div>)}
                    </div>
                </div>
            </div>
        </div>
    );
}
