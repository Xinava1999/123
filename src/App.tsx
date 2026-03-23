import React, { useState, useEffect } from 'react';
import { FirebaseProvider, useAuth } from './components/FirebaseProvider';
import { Layout } from './components/Layout';
import { Gallery } from './components/Gallery';
import { DeckSharing } from './components/DeckSharing';
import { QBGameMini } from './components/QBGameMini';
import { QBFeeding } from './components/QBFeeding';
import { Image, LayoutGrid, Gamepad2, Utensils, User } from 'lucide-react';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

import { HearthstoneQuiz } from './components/HearthstoneQuiz';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'decks' | 'gallery' | 'game' | 'feed'>('decks');
  const [activeGame, setActiveGame] = useState<'breakout' | 'quiz'>('breakout');
  const [nickname, setNickname] = useState('');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token') || '');

  useEffect(() => {
    const saved = localStorage.getItem('user_nickname');
    if (saved) setNickname(saved);
  }, []);

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setNickname(newName);
    localStorage.setItem('user_nickname', newName);
  };

  const handleAdminLogin = () => {
    const pass = window.prompt('请输入管理员密码:');
    if (pass) {
      localStorage.setItem('admin_token', pass);
      setAdminToken(pass);
      window.location.reload(); // 刷新以更新所有组件的权限状态
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    setAdminToken('');
    window.location.reload();
  };

  const tabs = [
    { id: 'decks', label: '卡组分享', icon: <LayoutGrid size={20} /> },
    { id: 'gallery', label: '每日大赛', icon: <Image size={20} /> },
    { id: 'game', label: '小游戏', icon: <Gamepad2 size={20} /> },
    { id: 'feed', label: '投喂', icon: <Utensils size={20} /> },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Secondary Menu / Navigation */}
        <nav className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b-4 border-black pb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center space-x-2 px-4 h-16 font-black italic tracking-tighter transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                activeTab === tab.id 
                  ? 'bg-yellow-400 text-black' 
                  : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              <div className="flex-shrink-0">{tab.icon}</div>
              <span className="text-lg md:text-xl truncate">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="min-h-[60vh]">
          {activeTab === 'decks' && (
            <DeckSharing nickname={nickname} />
          )}

          {activeTab === 'gallery' && (
            <Gallery nickname={nickname} />
          )}

          {activeTab === 'game' && (
            <div className="space-y-6">
              <div className="flex justify-center space-x-4 mb-8">
                <button
                  onClick={() => setActiveGame('breakout')}
                  className={`px-6 py-2 font-black italic border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
                    activeGame === 'breakout' ? 'bg-yellow-400' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  弹射蟑螂
                </button>
                <button
                  onClick={() => setActiveGame('quiz')}
                  className={`px-6 py-2 font-black italic border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
                    activeGame === 'quiz' ? 'bg-yellow-400' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  炉石问答
                </button>
              </div>
              {activeGame === 'breakout' && <QBGameMini />}
              {activeGame === 'quiz' && <HearthstoneQuiz />}
            </div>
          )}

          {activeTab === 'feed' && (
            <QBFeeding />
          )}
        </div>

        {/* Nickname Input & Auth */}
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2 font-black italic text-xl">
            <User size={24} />
            <span>我的昵称:</span>
          </div>
          <input
            type="text"
            value={nickname}
            onChange={handleNicknameChange}
            placeholder="输入你的大名..."
            className="flex-1 w-full bg-gray-100 border-2 border-black px-4 py-2 font-bold focus:bg-yellow-400 focus:outline-none transition-colors"
          />
          <div className="flex items-center space-x-2">
            {adminToken ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold opacity-50">管理员已登录</span>
                <button
                  onClick={handleAdminLogout}
                  className="bg-red-500 text-white px-4 py-2 font-black text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  退出
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdminLogin}
                className="bg-white text-black px-4 py-2 font-black text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center space-x-2"
              >
                <User size={14} />
                <span>管理员登录</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <AppContent />
      </FirebaseProvider>
    </ErrorBoundary>
  );
}

