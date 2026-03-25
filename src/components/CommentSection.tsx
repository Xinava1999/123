import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Loader2, User } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface Comment {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

interface CommentSectionProps {
  type: 'decks' | 'images';
  id: string;
  nickname: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ type, id, nickname }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/${type}/${id}/comments`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setComments(data);
        } else {
          console.error('Comments data is not an array:', data);
          setComments([]);
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [type, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/${type}/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newComment,
          authorName: nickname || '匿名炉友'
        })
      });

      if (response.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 border-t-2 border-black pt-4">
      <div className="flex items-center space-x-2 mb-4">
        <MessageSquare size={18} className="text-black/60" />
        <h4 className="font-black text-sm uppercase tracking-wider">评论 ({comments.length})</h4>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="说点什么吧..."
            className="flex-1 p-2 border-2 border-black focus:outline-none focus:bg-yellow-50 font-bold text-sm"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="bg-black text-white px-4 py-2 font-bold text-sm hover:bg-yellow-400 hover:text-black transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>

      <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-black/20" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-black/40 text-xs font-bold py-4">暂无评论，快来抢沙发！</p>
        ) : (
          comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-50 border-l-4 border-black p-3"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-black bg-black text-white px-1.5 py-0.5">
                  {comment.authorName}
                </span>
                <span className="text-[10px] text-black/40 font-bold">
                  {format(new Date(comment.createdAt), 'MM-dd HH:mm')}
                </span>
              </div>
              <p className="text-xs font-bold text-black/80 leading-relaxed">{comment.text}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
