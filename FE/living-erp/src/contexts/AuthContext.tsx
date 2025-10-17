import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { ENV_CONFIG } from "../config/environment";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  employeeNumber?: string;
  department?: string;
  phone?: string;
  lastLoginAt?: string;
  expiresAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);

        // 사용자 데이터 유효성 검증
        if (parsedUser && parsedUser.username && parsedUser.role) {
          setToken(storedToken);
          setUser(parsedUser);
          axios.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${storedToken}`;
        } else {
          // 유효하지 않은 데이터 제거
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setToken(null);
        }
      }
    } catch (error) {
      console.error("Error loading stored auth:", error);
      // 에러 발생 시 저장된 데이터 제거
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post(
        `${ENV_CONFIG.API_BASE_URL}/api/admin/login`,
        {
          employeeNumber: username, // username을 employeeNumber로 매핑
          password,
        }
      );

      // 백엔드 응답 구조에 맞게 수정
      const { success, message, data } = response.data;

      if (!success) {
        // 백엔드에서 보낸 구체적인 에러 메시지를 사용
        throw new Error(message || "로그인에 실패했습니다.");
      }

      // data가 null인 경우 처리
      if (!data) {
        throw new Error("로그인 응답에 사용자 데이터가 없습니다.");
      }

      // data 객체에서 사용자 정보 추출 (백엔드 응답 구조에 맞게)
      const {
        token: newToken,
        username: userUsername,
        name: userName,
        email: userEmail,
        role: userRole,
        employeeNumber: userEmployeeNumber,
        adminId: userId,
      } = data;

      // 응답 데이터 유효성 검증
      if (!newToken || !userUsername || !userRole) {
        throw new Error(
          "로그인 응답에 필수 데이터가 없습니다. (토큰, 사용자명, 역할)"
        );
      }

      const newUser: User = {
        id: userId || Date.now(), // 백엔드에서 받은 adminId 사용
        username: userUsername,
        name: userName || userUsername, // 백엔드에서 받은 name 사용
        email: userEmail || `${userUsername}@hana.com`, // 백엔드에서 받은 email 사용
        role: userRole,
        employeeNumber: userEmployeeNumber,
        department: data.department,
        phone: data.phone,
        lastLoginAt: data.lastLoginAt,
        expiresAt: data.expiresAt,
      };

      setToken(newToken);
      setUser(newUser);

      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));

      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

    } catch (error: any) {
      // 네트워크 에러인지 확인
      if (error.code === "ERR_NETWORK") {
        throw new Error(
          "백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요."
        );
      }

      // HTTP 상태 코드별 에러 메시지
      if (error.response?.status === 404) {
        throw new Error("로그인 API 엔드포인트를 찾을 수 없습니다. (404)");
      } else if (error.response?.status === 500) {
        throw new Error("서버 내부 오류가 발생했습니다. (500)");
      } else if (error.response?.status === 401) {
        throw new Error("사용자명 또는 비밀번호가 올바르지 않습니다. (401)");
      }

      throw error;
    }
  };

  const logout = async () => {
    try {
      // 로컬 스토리지 정리
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // axios 헤더 정리
      delete axios.defaults.headers.common["Authorization"];

      // 상태 정리
      setUser(null);
      setToken(null);

    } catch (error) {
      // 에러가 발생해도 상태는 정리
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      delete axios.defaults.headers.common["Authorization"];
      setUser(null);
      setToken(null);
      throw error; // 에러를 다시 던져서 호출자가 처리할 수 있도록
    }
  };

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
