import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { getToken, getRefreshToken, refreshToken } from '@/app/utils/auth';
import Cookies from 'js-cookie';

interface SocketStore {
  socket: Socket | null;
  isConnected: boolean;
  error: string;
  connect: (userId: string) => void;
  disconnect: () => void;
  setError: (error: string) => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  error: '',
  connect: (userId: string) => {
    const { socket, isConnected } = get();
    if (socket?.connected || isConnected) {
      console.log('Socket already connected, skipping connect');
      return;
    }

    const token = getToken();
    const refreshToken = getRefreshToken();
    if (!token || !userId) {
      set({ error: 'No token or user ID available. Please log in.' });
      return;
    }

    const newSocket = io('http://localhost:3001', {
      auth: { token, refreshToken, userId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server:', newSocket.id);
      set({ isConnected: true, error: '' });
      newSocket.emit('join', userId, (error?: string) => {
        if (error) {
          console.error('Failed to join user room:', error);
        } else {
          console.log('Joined user room for notifications:', userId);
        }
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      set({ isConnected: false });
      if (reason === 'io server disconnect') {
        setTimeout(() => get().connect(userId), 1000);
      }
    });

    newSocket.on('connect_error', async (err) => {
      console.error('Connection error:', err.message);
      set({ error: 'Connection error - retrying...', isConnected: false });
      if (err.message.includes('jwt expired') || err.message.includes('invalid token')) {
        try {
          const newToken = await refreshToken();
          if (newToken) {
            set({ error: '' });
            get().connect(userId);
          } else {
            set({ error: 'Session expired. Please log in again.' });
          }
        } catch (refreshError: any) {
          console.error('Token refresh failed:', refreshError);
          set({ error: 'Failed to refresh token. Please log in again.' });
        }
      }
    });

    newSocket.on('token_refreshed', ({ token, refreshToken: newRefreshToken }) => {
      console.log('Received refreshed token');
      if (token) {
        localStorage.setItem('token', token);
        Cookies.set('accessToken', token, {
          expires: 1,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
        });
      }
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
        Cookies.set('refreshToken', newRefreshToken, {
          expires: 7,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
        });
      }
    });

    newSocket.on('ping', () => {
      console.log('Received ping from server');
      newSocket.emit('pong');
      console.log('Sent pong to server');
    });

    set({ socket: newSocket });
  },
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('token_refreshed');
      socket.off('ping');
      socket.disconnect();
      set({ socket: null, isConnected: false, error: '' });
    }
  },
  setError: (error: string) => set({ error }),
}));