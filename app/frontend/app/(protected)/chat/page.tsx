"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter, useSearchParams } from 'next/navigation';

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

    useEffect(() => {
        if (isLoading || !accessToken) return;
        const fetchPartners = async () => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/chat/`, {
                headers: { "Authorization": `Bearer ${accessToken}` },
            });
            const data = await response.json();
            if (data.success) setPartners(data.result);
        };
        fetchPartners();
    }, [isLoading, accessToken]);

    useEffect(() => {
        const partnerId = searchParams.get('with');
        if (partnerId && partners.length > 0) {
            const partner = partners.find(p => p.id === parseInt(partnerId, 10));
            if (partner) {
                setActivePartner(partner);
                loadChatHistory(partner.id);
            }
        } else {
            setActivePartner(null);
        }
    }, [searchParams, partners, loadChatHistory]);

    const handleSendMessage = () => {
        if (!newMessage.trim() || !activePartner) return;
        sendChatMessage(activePartner.id, newMessage);
        setNewMessage("");
    };

    const activeChatMessages = chatMessages.filter(msg =>
        (msg.from === user?.id && msg.to === activePartner?.id) ||
        (msg.from === activePartner?.id && msg.to === user?.id)
    );

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeChatMessages.length]);

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
                                    <div className="conversation-user-info">
                                        <p className="conversation-username">{p.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="chat-area-gradient">
                    <div className="chat-area solid-effect">
                        {activePartner ? (
                            <>
                                <div className="chat-header"><p className="chat-header-name">{activePartner.name}</p></div>
                                <div className="messages-container">
                                    {activeChatMessages.map((msg) => (
                                        <div key={msg.id} className={`message-wrapper ${msg.from === user?.id ? "sent" : "received"}`}>
                                            <div className="message-gradient">
                                                <div className="message-bubble">
                                                    <p className="message-content">{msg.content}</p>
                                                    <p className="message-timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="input-area">
                                    <div className="input-wrapper">
                                        <div className="input-gradient">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                                placeholder={`Message ${activePartner.name}`}
                                                className="message-input"
                                            />
                                        </div>
                                        {/* The Send button has been removed */}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="empty-chat-state"><p className="empty-chat-text">Select a conversation.</p></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
