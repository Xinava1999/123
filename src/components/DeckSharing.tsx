import React, { useState, useEffect } from 'react';
import { db } from '../tcb';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Copy, Check, Search, MessageSquare } from 'lucide-react';

interface Deck {
  _id: string;
  code: string;
  title: string;
  authorName: string;
  createdAt: any;
}

export const DeckSharing: React.FC<{ nickname: string }> = ({ nickname }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newDeck, setNewDeck] = useState({ code: '', title: '' });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const watcher = db.collection('decks')
      .orderBy('createdAt', 'desc')
      .watch({
        onChange: (snapshot) => {
          const docs = snapshot.docs.map(doc => ({ _id: doc._id, ...doc } as unknown as Deck));
          setDecks(docs);
        },
        onError: (err) => {
          console.error('TCB Watch Error:', err);
        }
      });
    
    return () => {
      watcher.close();
    };
  }, []);

  const handleShare = async () => {
    if (!newDeck.code || !newDeck.title) return;
    try {
      await db.collection('decks').add({
        ...newDeck,
        authorName: nickname || '匿名炉友',
        createdAt: db.serverDate(),
      });
      setShowModal(false);
      setNewDeck({ code: '', title: '' });
    } catch (error) {
      console.error("Error sharing deck:", error);
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

  return (
    <div className="space-y-6 pb-24">
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
            key={deck._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-black italic tracking-tighter">{deck.title}</h3>
              <span className="text-[10px] font-bold bg-yellow-400 px-2 py-1 border border-black">
                {deck.authorName || '匿名炉友'}
              </span>
            </div>

            <div className="mt-auto flex items-center space-x-2">
              <div className="flex-1 bg-gray-100 border-2 border-black p-2 font-mono text-[10px] overflow-hidden whitespace-nowrap text-ellipsis">
                {deck.code}
              </div>
              <button
                onClick={() => copyToClipboard(deck.code, deck._id)}
                className={`p-2 border-2 border-black transition-all ${
                  copiedId === deck._id ? 'bg-green-400' : 'bg-yellow-400 hover:bg-black hover:text-white'
                }`}
              >
                {copiedId === deck._id ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
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
                  className="w-full bg-black text-white p-4 font-bold tracking-widest hover:bg-yellow-400 hover:text-black transition-colors flex items-center justify-center space-x-2"
                >
                  <MessageSquare size={20} />
                  <span>确认发布</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
