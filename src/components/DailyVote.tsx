import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Vote, Plus, Trash2, User, ShieldCheck, BarChart3, X } from 'lucide-react';
import { useToast } from './Toast';

interface VoteItem {
  id: string;
  title: string;
  options: string[];
  counts: number[];
  type: 'official' | 'user';
  authorName: string;
  createdAt: string;
}

export const DailyVote: React.FC<{ nickname: string }> = ({ nickname }) => {
  const [votes, setVotes] = useState<VoteItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVoteTitle, setNewVoteTitle] = useState('');
  const [newVoteOptions, setNewVoteOptions] = useState(['', '']);
  const [isOfficial, setIsOfficial] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const adminToken = localStorage.getItem('admin_token') || '';
  const isAdmin = !!adminToken;
  const mockUid = localStorage.getItem('mock_uid') || 'anonymous';

  const fetchVotes = async () => {
    try {
      const res = await fetch('/api/votes');
      const data = await res.json();
      if (Array.isArray(data)) {
        setVotes(data);
      } else {
        console.error('Votes data is not an array:', data);
        setVotes([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchVotes();
  }, []);

  const handleAddOption = () => {
    if (newVoteOptions.length < 6) {
      setNewVoteOptions([...newVoteOptions, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (newVoteOptions.length > 2) {
      setNewVoteOptions(newVoteOptions.filter((_, i) => i !== index));
    }
  };

  const handleCreateVote = async () => {
    if (!newVoteTitle.trim()) return showToast('请输入投票标题', 'error');
    if (newVoteOptions.some(o => !o.trim())) return showToast('请输入所有选项', 'error');

    setLoading(true);
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          title: newVoteTitle,
          options: newVoteOptions,
          type: isOfficial ? 'official' : 'user',
          authorName: nickname || '匿名炉友'
        })
      });

      if (res.ok) {
        showToast('发布成功！', 'success');
        setShowCreateModal(false);
        setNewVoteTitle('');
        setNewVoteOptions(['', '']);
        setIsOfficial(false);
        fetchVotes();
      } else {
        const data = await res.json();
        showToast(data.error || '发布失败', 'error');
      }
    } catch (e) {
      showToast('网络错误', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (voteId: string, optionIndex: number) => {
    try {
      const res = await fetch(`/api/votes/${voteId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: mockUid, optionIndex })
      });

      if (res.ok) {
        showToast('投票成功！', 'success');
        fetchVotes();
      } else {
        const data = await res.json();
        showToast(data.error || '投票失败', 'error');
      }
    } catch (e) {
      showToast('网络错误', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除此投票吗？')) return;
    try {
      const res = await fetch(`/api/votes/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
      });
      if (res.ok) {
        showToast('删除成功', 'success');
        fetchVotes();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <ToastComponent />
      
      <div className="flex justify-between items-center border-b-4 border-black pb-4">
        <h2 className="text-3xl font-black italic tracking-tighter flex items-center gap-2">
          <Vote size={32} />
          每日投票
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-yellow-400 text-black px-6 py-2 font-black italic border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          发起投票
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Official Votes */}
        <div className="space-y-6">
          <h3 className="text-xl font-black italic flex items-center gap-2 text-blue-600">
            <ShieldCheck size={24} />
            官方投票
          </h3>
          <div className="space-y-6">
            {votes.filter(v => v.type === 'official').map(vote => (
              <VoteCard key={vote.id} vote={vote} onVote={handleVote} onDelete={handleDelete} isAdmin={isAdmin} />
            ))}
            {votes.filter(v => v.type === 'official').length === 0 && (
              <p className="text-center py-10 border-2 border-dashed border-black/20 font-bold opacity-40">暂无官方投票</p>
            )}
          </div>
        </div>

        {/* User Votes */}
        <div className="space-y-6">
          <h3 className="text-xl font-black italic flex items-center gap-2 text-green-600">
            <User size={24} />
            玩家投票
          </h3>
          <div className="space-y-6">
            {votes.filter(v => v.type === 'user').map(vote => (
              <VoteCard key={vote.id} vote={vote} onVote={handleVote} onDelete={handleDelete} isAdmin={isAdmin} />
            ))}
            {votes.filter(v => v.type === 'user').length === 0 && (
              <p className="text-center py-10 border-2 border-dashed border-black/20 font-bold opacity-40">暂无玩家投票</p>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-4 border-black w-full max-w-lg p-6 shadow-[12px_12px_0px_0px_rgba(254,240,138,1)]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black italic tracking-tighter">发起新投票</h3>
                <button onClick={() => setShowCreateModal(false)} className="hover:rotate-90 transition-transform">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase">投票标题</label>
                  <input
                    type="text"
                    value={newVoteTitle}
                    onChange={(e) => setNewVoteTitle(e.target.value)}
                    placeholder="例如：你最喜欢的卡背是哪个？"
                    className="w-full p-3 border-2 border-black focus:bg-yellow-50 font-bold"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold tracking-widest uppercase">选项 (最多6个)</label>
                  {newVoteOptions.map((option, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const next = [...newVoteOptions];
                          next[idx] = e.target.value;
                          setNewVoteOptions(next);
                        }}
                        placeholder={`选项 ${idx + 1}`}
                        className="flex-1 p-2 border-2 border-black font-medium"
                      />
                      {newVoteOptions.length > 2 && (
                        <button onClick={() => handleRemoveOption(idx)} className="text-red-500 hover:bg-red-50 p-1">
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  {newVoteOptions.length < 6 && (
                    <button 
                      onClick={handleAddOption}
                      className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> 添加选项
                    </button>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isOfficial"
                      checked={isOfficial}
                      onChange={(e) => setIsOfficial(e.target.checked)}
                      className="w-5 h-5 border-2 border-black accent-yellow-400"
                    />
                    <label htmlFor="isOfficial" className="font-bold italic">设为官方投票</label>
                  </div>
                )}

                <button
                  onClick={handleCreateVote}
                  disabled={loading}
                  className="w-full bg-black text-white p-4 font-black italic text-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(254,240,138,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
                >
                  {loading ? '发布中...' : '确认发布'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const VoteCard: React.FC<{ 
  vote: VoteItem, 
  onVote: (id: string, idx: number) => void,
  onDelete: (id: string) => void,
  isAdmin: boolean 
}> = ({ vote, onVote, onDelete, isAdmin }) => {
  const total = vote.counts.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 relative">
      <div className="flex justify-between items-start">
        <h4 className="text-xl font-black leading-tight">{vote.title}</h4>
        {isAdmin && (
          <button onClick={() => onDelete(vote.id)} className="text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {vote.options.map((option, idx) => {
          const count = vote.counts[idx];
          const percent = total === 0 ? 0 : Math.round((count / total) * 100);
          
          return (
            <button
              key={idx}
              onClick={() => onVote(vote.id, idx)}
              className="w-full group relative"
            >
              <div className="relative z-10 flex justify-between items-center p-3 border-2 border-black font-bold group-hover:bg-yellow-50 transition-colors">
                <span>{option}</span>
                <span className="text-sm opacity-60">{count} 票 ({percent}%)</span>
              </div>
              <div 
                className="absolute inset-0 bg-yellow-200/50 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-40">
        <div className="flex items-center gap-1">
          <BarChart3 size={12} />
          <span>总计 {total} 票</span>
        </div>
        <div className="flex items-center gap-1">
          <User size={12} />
          <span>{vote.authorName}</span>
        </div>
      </div>
    </div>
  );
};
