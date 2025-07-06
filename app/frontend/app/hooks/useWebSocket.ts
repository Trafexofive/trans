import { useState, useEffect, useRef } from 'react';

export enum ConnectionStatus {
  Connecting = 'Connecting',
  Connected = 'Connected',
  Disconnected = 'Disconnected',
  Error = 'Error',
}

interface Message {
  from: number;
  content: string;

  timestamp: string;
}

export const useWebSocket = (accessToken: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.Disconnected);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const socket = new WebSocket(`ws://localhost:13333/api/chat/socket?token=${accessToken}`);
    socketRef.current = socket;
    setConnectionStatus(ConnectionStatus.Connecting);

    socket.onopen = () => {
      console.log('WebSocket connection established.');
      setConnectionStatus(ConnectionStatus.Connected);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, message]);
      } catch (error) {
        console.error('Failed to parse incoming message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus(ConnectionStatus.Error);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed.');
      setConnectionStatus(ConnectionStatus.Disconnected);
    };

    // THE FIX: The cleanup function now closes the 'socket' instance from its
    // own closure. This is not vulnerable to the race condition because it
    // doesn't depend on the mutable `socketRef`.
    return () => {
      socket.close();
    };
  }, [accessToken]);

  const sendMessage = (message: { to: number; content: string }) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket is not connected.');
    }
  };

  return { messages, sendMessage, connectionStatus };
};
