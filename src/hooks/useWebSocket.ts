/**
 * WebSocket hook for real-time communication.
 * 
 * Provides WebSocket connection management with automatic reconnection
 * and message handling for the CI/CD dashboard.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  sendMessage: ((message: string) => void) | null;
  lastMessage: MessageEvent | null;
  readyState: number;
  isConnected: boolean;
}

export function useWebSocket(
  url: string = `ws://${window.location.host}/ws`,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
  } = options;

  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);
      websocketRef.current = ws;

      ws.onopen = () => {
        setReadyState(WebSocket.OPEN);
        setReconnectAttempts(0);
        onOpen?.();
      };

      ws.onclose = () => {
        setReadyState(WebSocket.CLOSED);
        onClose?.();

        // Attempt to reconnect if we should and haven't exceeded max attempts
        if (shouldReconnectRef.current && reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        setReadyState(WebSocket.CLOSED);
        onError?.(error);
      };

      ws.onmessage = (event) => {
        setLastMessage(event);
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
      setReadyState(WebSocket.CLOSED);
    }
  }, [url, reconnectAttempts, maxReconnectAttempts, reconnectInterval, onOpen, onClose, onError]);

  const sendMessage = useCallback((message: string) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(message);
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle page visibility changes to reconnect when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && readyState === WebSocket.CLOSED) {
        if (shouldReconnectRef.current && reconnectAttempts < maxReconnectAttempts) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect, readyState, reconnectAttempts, maxReconnectAttempts]);

  return {
    sendMessage: readyState === WebSocket.OPEN ? sendMessage : null,
    lastMessage,
    readyState,
    isConnected: readyState === WebSocket.OPEN,
  };
}

