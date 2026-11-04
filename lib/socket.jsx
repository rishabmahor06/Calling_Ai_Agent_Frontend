'use client';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext({ socket: null, connected: false });

// Socket.io connects straight to the backend (WebSockets can't go through Next rewrites).
// The session cookie belongs to the dashboard origin, so the backend may not receive it;
// a short-lived token fetched through the /api proxy authenticates every (re)connect instead.
const FALLBACK_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

async function fetchSocketToken() {
  const res = await fetch('/api/auth/socket-token', { credentials: 'include', cache: 'no-store' });
  if (!res.ok) throw new Error(`socket token HTTP ${res.status}`);
  return res.json();
}

export function SocketProvider({ children }) {
  const [state, setState] = useState({ socket: null, connected: false });

  useEffect(() => {
    let socket = null;
    let cancelled = false;
    fetchSocketToken()
      .catch(() => ({}))
      .then(({ url }) => {
        if (cancelled) return;
        socket = io(url || FALLBACK_URL, {
          withCredentials: true,
          transports: ['websocket', 'polling'],
          auth: (cb) => fetchSocketToken().then(({ token }) => cb({ token }), () => cb({})),
        });
        const on = () => setState({ socket, connected: true });
        const off = () => setState({ socket, connected: false });
        socket.on('connect', on);
        socket.on('disconnect', off);
        socket.on('connect_error', off);
        off();
      });
    return () => {
      cancelled = true;
      socket?.close();
    };
  }, []);

  return <SocketContext.Provider value={state}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

/** Subscribes to a socket event for the component's lifetime; the handler can change freely. */
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const ref = useRef(handler);
  useLayoutEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!socket) return undefined;
    const fn = (payload) => ref.current(payload);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [socket, event]);
}
