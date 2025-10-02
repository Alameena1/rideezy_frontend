import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { getToken, refreshToken } from '@/app/utils/auth';

interface SocketStore {
  socket: Socket | null;
  isConnected: boolean;
  error: string;
  connect: (userId: string) => Promise<void>;
  disconnect: () => void;
  setError: (error: string) => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  error: '',
  connect: async (userId: string) => {
    const { socket, isConnected } = get();
    
    // If already connected or connecting, return
    if (socket?.connected || isConnected) {
      console.log('Socket already connected, skipping connect');
      return;
    }

    try {
      const token = await getToken();
      console.log('🔑 Token available:', !!token);
      
      if (!token || !userId) {
        console.error('❌ No token or user ID available');
        set({ error: 'No token or user ID available. Please log in.' });
        return;
      }

      console.log('🔌 Connecting to socket server...');
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
        auth: { 
          token, 
          userId,
          refreshToken: await getToken() // Ensure refresh token is available
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        transports: ['websocket', 'polling'], // Add polling as fallback
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to chat server:', newSocket.id);
        set({ isConnected: true, error: '' });
        
        // Join user's personal room for notifications
        newSocket.emit('join', userId, (error?: string) => {
          if (error) {
            console.error('❌ Failed to join user room:', error);
          } else {
            console.log('✅ Joined user room for notifications:', userId);
          }
        });
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected:', reason);
        set({ isConnected: false });
        
        // Auto-reconnect on server disconnect
        if (reason === 'io server disconnect') {
          console.log('🔄 Server disconnected, attempting reconnect...');
          setTimeout(() => get().connect(userId), 1000);
        }
      });

      newSocket.on('connect_error', async (err) => {
        console.error('❌ Connection error:', err.message);
        set({ error: `Connection error: ${err.message}`, isConnected: false });
        
        // Handle token expiration
        if (err.message.includes('jwt expired') || err.message.includes('invalid token')) {
          try {
            console.log('🔄 Token expired, attempting refresh...');
            const newToken = await refreshToken();
            if (newToken) {
              console.log('✅ Token refreshed successfully');
              set({ error: '' });
              // Reconnect with new token
              await get().connect(userId);
            } else {
              set({ error: 'Session expired. Please log in again.' });
            }
          } catch (refreshError: any) {
            console.error('❌ Token refresh failed:', refreshError);
            set({ error: 'Failed to refresh token. Please log in again.' });
          }
        }
      });

      newSocket.on('token_refreshed', ({ token: newToken }) => {
        console.log('✅ Received refreshed token from server');
      });

      newSocket.on('ping', () => {
        console.log('📡 Received ping from server');
        newSocket.emit('pong');
      });

      // Set socket immediately
      set({ socket: newSocket });

    } catch (error) {
      console.error('❌ Failed to initialize socket:', error);
      set({ error: 'Failed to connect to chat server' });
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      console.log('🔌 Disconnecting socket...');
      socket.removeAllListeners();
      socket.disconnect();
      set({ socket: null, isConnected: false, error: '' });
    }
  },

  setError: (error: string) => set({ error }),
}));