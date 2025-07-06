'use client';

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const ChatMessageContent = ({ content }: { content: string }) => {
    const urlRegex = /(\[Play Now\]\(\/play\))/g;
    const parts = content.split(urlRegex);
    return (
        <p className="message-content">
            {parts.map((part, index) => {
                if (part.match(urlRegex)) {
                    return <Link key={index} href="/play" className="text-blue-400 font-bold hover:underline">Play Now</Link>;
                }
                return part;
            })}
        </p>
    );
};

interface ConversationPartner { id: number; name: string; avatar: string; }
interface Message { id: number; from: number; to: number; content: string; timestamp: string; }

export default function ChatPage() {
    const { user, accessToken, isLoading, chatMessages, sendChatMessage, loadChatHistory } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [partners, setPartners] = useState<ConversationPartner[]>([]);
    const [activePartner, setActivePartner] = useState<ConversationPartner | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    useEffect(() => {
        if (isLoading || !accessToken) return;
        const fetchPartners = async () => {
            const response = await fetch(`${API_BASE_URL}/api/chat/`, { headers: { "Authorization": `Bearer ${accessToken}` } });
            const data = await response.json();
            if (data.success) setPartners(data.result);
        };
        fetchPartners();
    }, [isLoading, accessToken, API_BASE_URL]);

    useEffect(() => {
        const partnerId = searchParams.get('with');
        if (partnerId && partners.length > 0) {
            const partner = partners.find(p => p.id === parseInt(partnerId, 10));
            if (partner) {
                setActivePartner(partner);
                loadChatHistory(partner.id);
            }
        } else { setActivePartner(null); }
    }, [searchParams, partners, loadChatHistory]);

    const handleSendMessage = () => {
        if (!newMessage.trim() || !activePartner) return;
        sendChatMessage(activePartner.id, newMessage);
        setNewMessage("");
    };

    const handleInviteToGame = () => {
        if (!activePartner) return;
        const message = `I challenge you to a game of Pong! [Play Now](/play)`;
        sendChatMessage(activePartner.id, message);
    };

    const handleBlockUser = async () => {
        if (!activePartner || !window.confirm(`Are you sure you want to block ${activePartner.name}?`)) return;
        try {
            await fetch(`${API_BASE_URL}/api/friendships/block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ blocked_id: activePartner.id })
            });
            alert(`${activePartner.name} has been blocked.`);
        } catch (err) { alert('Failed to block user.'); }
    };

    const activeChatMessages = chatMessages.filter(msg => (msg.from === user?.id && msg.to === activePartner?.id) || (msg.from === activePartner?.id && msg.to === user?.id));

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChatMessages.length]);

    if (isLoading) return <div className="text-center text-white p-10">Loading...</div>;

    return (
        <div className="page-container">
            <div className="chat-main-container">
                <div className="sidebar-gradient">
                    <div className="sidebar solid-effect">
                        <div className="sidebar-header"><h2 className="sidebar-title">Conversations</h2></div>
                        <div className="conversation-list">
                            {partners.map((p) => (
                                <div key={p.id} onClick={() => router.push(`/chat?with=${p.id}`)} className={`conversation-item ${activePartner?.id === p.id ? "active" : ""}`}>
                                    <img src={p.avatar || "/avatars/default.png"} alt={p.name} className="avatar" />
                                    <div className="conversation-user-info"><p className="conversation-username">{p.name}</p></div>
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
                                        <button onClick={handleInviteToGame} className="btn btn-primary text-xs px-3 py-1">Invite to Game</button>
                                        <button onClick={handleBlockUser} className="btn btn-danger text-xs px-3 py-1">Block</button>
                                    </div>
                                </div>
                                <div className="messages-container">
                                    {activeChatMessages.map((msg) => (
                                        <div key={msg.id} className={`message-wrapper ${msg.from === user?.id ? "sent" : "received"}`}>
                                            <div className="message-gradient">
                                                <div className="message-bubble">
                                                    <ChatMessageContent content={msg.content} />
                                                    <p className="message-timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="input-area">
                                    <div className="input-wrapper">
                                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={`Message ${activePartner.name}`} className="message-input" />
                                    </div>
                                </div>
                            </>
                        ) : (<div className="empty-chat-state"><p className="empty-chat-text">Select a conversation.</p></div>)}
                    </div>
                </div>
            </div>
        </div>
    );
}
