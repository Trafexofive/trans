"use client";

import { useCallback, useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// --- Reusable Components defined in-file to work around file creation limitations ---

const ChatMessageContent = ({ content }: { content: string }) => {
    const tournamentInviteRegex =
        /You have been invited to the tournament "([^"]+)". Join here: (\/tournaments\/\d+)/;
    const tournamentMatch = content.match(tournamentInviteRegex);
    if (tournamentMatch) {
        const tournamentName = tournamentMatch[1];
        const tournamentUrl = tournamentMatch[2];
        return (
            <p className="message-content">
                Invite to{" "}
                <Link
                    href={tournamentUrl}
                    className="text-blue-400 font-bold hover:underline"
                >
                    {tournamentName}
                </Link>
            </p>
        );
    }

    const gameInviteRegex = /Let's play Pong! \[Play Now\]\(\/play\)/;
    if (gameInviteRegex.test(content)) {
        return (
            <p className="message-content">
                Let's play Pong!{" "}
                <Link
                    href="/play"
                    className="text-blue-400 font-bold hover:underline"
                >
                    Play Now
                </Link>
            </p>
        );
    }

    return <p className="message-content">{content}</p>;
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; children: ReactNode; }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal solid-effect" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                </div>
                <div className="modal-content">
                    {children}
                </div>
                <div className="modal-actions">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={onConfirm} className="btn btn-danger">Confirm</button>
                </div>
            </div>
        </div>
    );
};

interface ConversationPartner {
    id: number;
    name: string;
    avatar: string;
}

export default function ChatPage() {
    const {
        user,
        accessToken,
        isLoading,
        chats,
        sendChatMessage,
        loadChatHistory,
        chatPartners,
        friendAction,
        unreadFrom,
        clearUnreadMessages,
    } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [activePartner, setActivePartner] = useState<ConversationPartner | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [isBlockedByMe, setIsBlockedByMe] = useState(false);
    
    const [modalState, setModalState] = useState({
      isOpen: false,
      title: '',
      content: '',
      onConfirm: () => {},
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchBlockStatus = useCallback(async (partnerId: number) => {
        if (!accessToken) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/friendships/block/${partnerId}`, {
                headers: { "Authorization": `Bearer ${accessToken}` },
            });
            const data = await res.json();
            if (data.success) setIsBlockedByMe(data.result.isBlocked);
        } catch (e) {
            console.error("Failed to fetch block status", e);
        }
    }, [accessToken, API_BASE_URL]);

    useEffect(() => {
        const partnerIdStr = searchParams.get("with");
        if (partnerIdStr) {
            const partnerId = parseInt(partnerIdStr, 10);
            const partner = chatPartners.find((p) => p.id === partnerId);
            if (partner) {
                setActivePartner(partner);
                loadChatHistory(partnerId);
                clearUnreadMessages(partnerId);
                fetchBlockStatus(partnerId);
            } else {
                setActivePartner(null);
            }
        } else {
            setActivePartner(null);
        }
    }, [searchParams, chatPartners, loadChatHistory, clearUnreadMessages, fetchBlockStatus]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chats, activePartner]);

    const handleSendMessage = () => {
        if (!newMessage.trim() || !activePartner) return;
        sendChatMessage(activePartner.id, newMessage);
        setNewMessage("");
    };

    const handleFriendAndBlockAction = (action: "remove" | "block" | "unblock") => {
        if (!activePartner) return;

        let title = '';
        let content = '';

        switch (action) {
            case 'remove':
                title = `Unfriend ${activePartner.name}?`;
                content = `Are you sure you want to remove ${activePartner.name} as a friend? This action cannot be undone.`;
                break;
            case 'block':
                title = `Block ${activePartner.name}?`;
                content = `This will block all communication and remove them as a friend. Are you sure?`;
                break;
            case 'unblock':
                title = `Unblock ${activePartner.name}?`;
                content = `You will be able to communicate with ${activePartner.name} again.`;
                break;
        }

        setModalState({
            isOpen: true,
            title: title,
            content: content,
            onConfirm: async () => {
                await friendAction(activePartner.id, action);
                if (action === 'remove' || action === 'block') {
                    router.push('/chat');
                } else {
                    fetchBlockStatus(activePartner.id);
                }
                closeModal();
            },
        });
    };
    
    const closeModal = () => {
      setModalState({ isOpen: false, title: '', content: '', onConfirm: () => {} });
    };

    const activeChatMessages = (activePartner && chats.get(activePartner.id)) || [];

    if (isLoading) {
        return <div className="p-10 text-center text-white">Loading...</div>;
    }

    return (
        <div className="page-container">
            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
            >
                <p>{modalState.content}</p>
            </ConfirmationModal>

            <div className="chat-main-container">
                <div className="sidebar-gradient">
                    <div className="sidebar solid-effect">
                        <div className="sidebar-header">
                            <h2 className="sidebar-title">Conversations</h2>
                        </div>
                        <div className="conversation-list">
                            {chatPartners.map((partner) => (
                                <div
                                    key={partner.id}
                                    onClick={() => router.push(`/chat?with=${partner.id}`)}
                                    className={`conversation-item ${activePartner?.id === partner.id ? "active" : ""}`}
                                >
                                    <div className="relative flex items-center gap-3">
                                        <Link href={`/profile/${partner.id}`} onClick={(e) => e.stopPropagation()}>
                                            <img
                                                src={partner.avatar || "/avatars/default.png"}
                                                alt={partner.name}
                                                className="avatar"
                                            />
                                        </Link>
                                        {unreadFrom.has(partner.id) && (
                                            <span className="absolute top-0 left-8 block h-3 w-3 rounded-full bg-green-400 ring-2 ring-gray-800"></span>
                                        )}
                                        <div className="conversation-user-info">
                                            <p className="conversation-username">{partner.name}</p>
                                        </div>
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
                                <div className="chat-header">
                                    <div className="flex items-center gap-4">
                                        <Link href={`/profile/${activePartner.id}`}>
                                          <img src={activePartner.avatar || '/avatars/default.png'} alt={activePartner.name} className="avatar h-10 w-10"/>
                                        </Link>
                                        <p className="chat-header-name">{activePartner.name}</p>
                                    </div>
                                    {/* FIX: Button container with flex properties for uniform size */}
                                    <div className="flex items-stretch gap-2" style={{minWidth: '320px'}}>
                                        <button onClick={() => sendChatMessage(activePartner.id, "Let's play Pong! [Play Now](/play)")} className="btn btn-primary btn-sm">Invite to Game</button>
                                        <button onClick={() => handleFriendAndBlockAction("remove")} className="btn btn-secondary btn-sm">Unfriend</button>
                                        <button onClick={() => handleFriendAndBlockAction(isBlockedByMe ? "unblock" : "block")} className={`btn btn-sm ${isBlockedByMe ? "bg-yellow-500 hover:bg-yellow-600" : "btn-danger"}`}>
                                            {isBlockedByMe ? "Unblock" : "Block"}
                                        </button>
                                    </div>
                                </div>
                                <div className="messages-container">
                                    {activeChatMessages.map((msg, index) => (
                                        <div key={index} className={`message-wrapper ${msg.from === user?.id ? "sent" : "received"}`}>
                                            <div className="message-gradient">
                                                <div className="message-bubble">
                                                    <ChatMessageContent content={msg.content} />
                                                    <p className="message-timestamp">
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
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
                                                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                                placeholder={`Message ${activePartner.name}...`}
                                                className="message-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="empty-chat-state">
                                <p className="empty-chat-text">Select a conversation to begin.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
