// src/app/utils/auth.ts
import jwt from 'jsonwebtoken';
import apiService from '@/services/api';

export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (!decoded?.exp) return true;
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
};

export const refreshToken = async (): Promise<string> => {
  try {
    const response = await apiService.auth.refreshToken();
    if (response.success && response.token) {
      setToken(response.token);
      return response.token;
    }
    throw new Error('Failed to refresh token');
  } catch (error) {
    removeToken();
    throw error;
  }
};

export const getValidToken = async (): Promise<string> => {
  const token = getToken();
  if (!token) {
    throw new Error('No token available');
  }

  if (isTokenExpired(token)) {
    return await refreshToken();
  }

  return token;
};