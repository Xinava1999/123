import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: { uid: string; displayName: string | null } | null;
  loading: boolean;
  login: () => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ uid: string; displayName: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟匿名登录，使用 localStorage 保持用户 ID
    let mockUid = localStorage.getItem('mock_uid');
    if (!mockUid) {
      mockUid = 'user_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('mock_uid', mockUid);
    }
    
    setUser({ uid: mockUid, displayName: '匿名炉友' });
    setLoading(false);
  }, []);

  const login = async () => {
    // 模拟登录
    console.log("Mock Login");
  };

  const googleLogin = async () => {
    // 模拟 Google 登录 (在中国大陆不可用)
    console.log("Mock Google Login - Not available in China");
  };

  const logout = async () => {
    // 模拟退出
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context;
};
