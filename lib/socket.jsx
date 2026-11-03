'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext({ socket: null, connected: false });

// Socket.io connects straight to the backend (WebSockets can't go through Next rewrites).
// The session cookie is host-scoped, so it is sent to the backend port as well.
const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function SocketProvider({ children }) {
  const [state, setState] = useState({ socket: null, connected: false });

  useEffect(() => {
    const socket = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'] });
    setState({ socket, connected: socket.connected });
    const on = () => setState({ socket, connected: true });
    const off = () => setState({ socket, connected: false });
    socket.on('connect', on);
    socket.on('disconnect', off);
    socket.on('connect_error', off);
    return () => socket.close();
  }, []);

  return <SocketContext.Provider value={state}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

/** Subscribes to a socket event for the component's lifetime; the handler can change freely. */
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!socket) return undefined;
    const fn = (payload) => ref.current(payload);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [socket, event]);
}
