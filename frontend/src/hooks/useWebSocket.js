import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url, options = {}) => {
  const [socket, setSocket] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [readyState, setReadyState] = useState(WebSocket.CONNECTING);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;
  const reconnectInterval = options.reconnectInterval || 3000;
  const shouldReconnect = options.shouldReconnect !== false;

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}${url}`;
  }, [url]);

  const connect = useCallback(() => {
    try {
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = (event) => {
        setReadyState(WebSocket.OPEN);
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        if (options.onOpen) options.onOpen(event);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage({ data: JSON.stringify(data), timestamp: Date.now() });
          if (options.onMessage) options.onMessage(data);
        } catch (err) {
          setLastMessage({ data: event.data, timestamp: Date.now() });
        }
      };
      
      ws.onclose = (event) => {
        setReadyState(WebSocket.CLOSED);
        setConnected(false);
        setSocket(null);
        if (options.onClose) options.onClose(event);
        
        if (shouldReconnect && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const timeout = reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, timeout);
        }
      };
      
      ws.onerror = (event) => {
        setError('WebSocket connection error');
        setConnected(false);
        if (options.onError) options.onError(event);
      };
      
      setSocket(ws);
    } catch (err) {
      setError('Failed to create WebSocket connection');
      setConnected(false);
    }
  }, [getWebSocketUrl, options, shouldReconnect, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socket) socket.close(1000, 'Manual disconnect');
  }, [socket]);

  const sendMessage = useCallback((message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        socket.send(messageStr);
        return true;
      } catch (err) {
        setError('Failed to send message');
        return false;
      }
    }
    return false;
  }, [socket]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    socket,
    lastMessage,
    readyState,
    connected,
    error,
    sendMessage,
    connect,
    disconnect,
    isConnecting: readyState === WebSocket.CONNECTING,
    isOpen: readyState === WebSocket.OPEN,
    isClosing: readyState === WebSocket.CLOSING,
    isClosed: readyState === WebSocket.CLOSED,
  };
};

export { useWebSocket };

