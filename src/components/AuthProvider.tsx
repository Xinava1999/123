import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../tcb';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const loginState: any = await auth.getLoginState();
        if (loginState) {
          setUser(loginState.user);
        } else {
          // 默认尝试匿名登录
          const anonymousAuth = auth.anonymousAuthProvider();
          const state: any = await anonymousAuth.signIn();
          setUser(state.user);
        }
      } catch (error) {
        console.error("TCB Auth Error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkLogin();
  }, []);

  const login = async () => {
    // 腾讯云开发支持多种登录方式，这里默认使用匿名登录
    const anonymousAuth = auth.anonymousAuthProvider();
    const state: any = await anonymousAuth.signIn();
    setUser(state.user);
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
