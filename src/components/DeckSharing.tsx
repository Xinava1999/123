import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Copy, Check, Search, MessageSquare, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from './Toast';
import { CommentSection } from './CommentSection';

interface Deck {
  id: string;
  code: string;
  title: string;
  authorName: string;
  createdAt: any;
}

export const DeckSharing: React.FC<{ nickname: string }> = ({ nickname }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [newDeck, setNewDeck] = useState({ code: '', title: '' });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>(null);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    const fetchDecks = async () => {
      console.log('Fetching decks from API...');
      try {
        const response = await fetch('/api/decks');
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (Array.isArray(data)) {
              console.log(`Fetched ${data.length} decks`);
              setDecks(data);
            } else {
              console.error('Data is not an array:', data);
              setDecks([]);
            }
          } else {
            const text = await response.text();
            console.error('Expected JSON but got:', text.substring(0, 100));
          }
        } else {
          console.error('API response not ok:', response.status);
        }
      } catch (error) {
        console.error('Error fetching decks:', error);
      }
    };

    fetchDecks();
    const interval = setInterval(fetchDecks, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleShare = async () => {
    console.log('Starting deck share process...');
    if (!newDeck.code || !newDeck.title) {
      showToast('请填写卡组标题和代码！', 'error');
      return;
    }

    setIsSharing(true);
    try {
      console.log('Sending POST request to /api/decks...');
      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDeck,
          authorName: nickname || '匿名炉友',
        }),
      });
      
      console.log('POST response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Deck shared successfully, ID:', result.id);
        showToast('卡组分享成功！', 'success');
        
        setTimeout(async () => {
          setShowModal(false);
          setNewDeck({ code: '', title: '' });
          setIsSharing(false);
          
          // 立即刷新列表
          const res = await fetch('/api/decks');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setDecks(data);
            }
          }
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || 'Share failed');
      }
    } catch (error: any) {
      console.error('Error adding deck:', error);
      showToast(`发布失败: ${error.message}`, 'error');
      setIsSharing(false);
    }
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDecks = decks.filter(deck => 
    deck.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const adminToken = localStorage.getItem('admin_token') || '';
  const isAdmin = !!adminToken;

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个卡组吗？')) return;
    try {
      const response = await fetch(`/api/decks/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
      });
      if (response.ok) {
        setDecks(prev => prev.filter(d => d.id !== id));
      } else {
        alert('删除失败，权限不足。');
      }
    } catch (error) {
      console.error('Error deleting deck:', error);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <ToastComponent />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" size={18} />
          <input
            type="text"
            placeholder="搜索卡组..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-black focus:outline-none focus:bg-yellow-50 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-black text-white px-6 py-3 font-black shadow-[4px_4px_0px_0px_rgba(254,240,138,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center space-x-2 border-2 border-black"
        >
          <Plus size={20} />
          <span>分享卡组</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredDecks.map((deck) => (
          <motion.div
            key={deck.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-black italic tracking-tighter">{deck.title}</h3>
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(deck.id)}
                    className="p-1 text-red-500 hover:bg-red-50 transition-colors rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <span className="text-[10px] font-bold bg-yellow-400 px-2 py-1 border border-black">
                  {deck.authorName || '匿名炉友'}
                </span>
              </div>
            </div>

            <div className="mt-auto flex items-center space-x-2">
              <div className="flex-1 bg-gray-100 border-2 border-black p-2 font-mono text-[10px] overflow-hidden whitespace-nowrap text-ellipsis">
                {deck.code}
              </div>
              <button
                onClick={() => copyToClipboard(deck.code, deck.id)}
                className={`p-2 border-2 border-black transition-all ${
                  copiedId === deck.id ? 'bg-green-400' : 'bg-yellow-400 hover:bg-black hover:text-white'
                }`}
              >
                {copiedId === deck.id ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            <button
              onClick={() => setExpandedDeckId(expandedDeckId === deck.id ? null : deck.id)}
              className="mt-4 flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-widest hover:text-yellow-600 transition-colors"
            >
              <MessageSquare size={14} />
              <span>{expandedDeckId === deck.id ? '收起评论' : '查看评论'}</span>
              {expandedDeckId === deck.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
              {expandedDeckId === deck.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <CommentSection type="decks" id={deck.id} nickname={nickname} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-4 border-black w-full max-w-md p-6 shadow-[12px_12px_0px_0px_rgba(254,240,138,1)]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black italic tracking-tighter">分享卡组</h3>
                <button onClick={() => setShowModal(false)} className="hover:rotate-90 transition-transform">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold tracking-widest">卡组标题</label>
                  <input
                    type="text"
                    value={newDeck.title}
                    onChange={(e) => setNewDeck({...newDeck, title: e.target.value})}
                    placeholder="例如：传说前百宇宙暗牧"
                    className="w-full p-3 border-2 border-black focus:outline-none focus:bg-yellow-50 font-bold"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold tracking-widest">卡组代码</label>
                  <textarea
                    value={newDeck.code}
                    onChange={(e) => setNewDeck({...newDeck, code: e.target.value})}
                    placeholder="粘贴卡组代码..."
                    className="w-full p-3 border-2 border-black focus:outline-none focus:bg-yellow-50 font-mono text-xs h-32 resize-none"
                  />
                </div>

                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="w-full bg-black text-white p-4 font-bold tracking-widest hover:bg-yellow-400 hover:text-black transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isSharing ? <Loader2 className="animate-spin" /> : <MessageSquare size={20} />}
                  <span>{isSharing ? '正在发布...' : '确认发布'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
