import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { urlHelpers } from '../src/config/environment';

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  beforeAddress?: string;
  userCi?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string, phone: string, beforeAddress: string, agreeMarketing: boolean) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// 백엔드 서버 주소 (새로운 environment 시스템 사용)
const API_BASE_URL = urlHelpers.getCurrentApiUrl();

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      // 저장된 인증 정보 로딩 오류 - 로그 제거됨
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: username,
        password
      });

      const { token: newToken, username: responseUsername, role, email, name, id, phone, beforeAddress, userCi } = response.data;
      
      const userData: User = {
        id,
        username: responseUsername,
        email,
        name,
        role,
        phone,
        beforeAddress,
        userCi
      };
      
      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setToken(newToken);
      setUser(userData);
      
      return true;
    } catch (error: any) {
      // 로그인 오류 - 로그 제거됨
      return false;
    }
  };

  const register = async (email: string, password: string, name: string, phone: string, beforeAddress: string, agreeMarketing: boolean): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        email,
        password,
        phone,
        name,
        beforeAddress,
        agreeMarketing
      });

      const { token: newToken, username: responseUsername, role, email: responseEmail, name: responseName, id, phone: responsePhone, beforeAddress: responseBeforeAddress, userCi } = response.data;
      
      const userData: User = {
        id,
        username: responseUsername,
        email: responseEmail,
        name: responseName,
        role,
        phone: responsePhone,
        beforeAddress: responseBeforeAddress,
        userCi
      };
      
      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setToken(newToken);
      setUser(userData);
      
      return true;
    } catch (error: any) {
      // 회원가입 오류 - 로그 제거됨
      return false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      // 로그아웃 오류 - 로그 제거됨
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

