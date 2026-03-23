import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Utensils, Zap } from 'lucide-react';

export const QBFeeding: React.FC = () => {
  const [hunger, setHunger] = useState(50);
  const [happiness, setHappiness] = useState(50);
  const [isEating, setIsEating] = useState(false);
  const [message, setMessage] = useState('QB 饿了，快喂它！');

  const qbImg = "https://www.imgur.la/images/2026/03/22/b_c109d49755778eb143ae04a3685db2a1.jpg";

  const feed = () => {
    setIsEating(true);
    setHunger(prev => Math.max(0, prev - 10));
    setHappiness(prev => Math.min(100, prev + 5));
    setMessage('好吃！再来点！');
    setTimeout(() => setIsEating(false), 1000);
  };

  const play = () => {
    setHappiness(prev => Math.min(100, prev + 15));
    setHunger(prev => Math.min(100, prev + 5));
    setMessage('嘿嘿，真好玩！');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setHunger(prev => Math.min(100, prev + 2));
      setHappiness(prev => Math.max(0, prev - 1));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (hunger > 80) setMessage('QB 快饿扁了...');
    else if (happiness < 20) setMessage('QB 觉得很无聊...');
  }, [hunger, happiness]);

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-12">
      <div className="relative">
        <motion.div
          animate={isEating ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : { y: [0, -10, 0] }}
          transition={{ duration: isEating ? 0.5 : 2, repeat: Infinity }}
          className="w-48 h-48 rounded-full border-8 border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white"
        >
          <img src={qbImg} alt="QB" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </motion.div>
        
        <AnimatePresence>
          {isEating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, x: 200, y: 100, rotate: 0 }}
              animate={{ opacity: 1, scale: 1.2, x: -20, y: -40, rotate: [0, 90, 180, 270, 360] }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 text-5xl"
            >
              🪳
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-2xl font-black italic tracking-tighter mb-2">{message}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-black uppercase">
              <span>饥饿度</span>
              <span>{hunger}%</span>
            </div>
            <div className="h-4 bg-gray-200 border-2 border-black overflow-hidden">
              <motion.div 
                className="h-full bg-red-500" 
                initial={{ width: 0 }}
                animate={{ width: `${hunger}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-black uppercase">
              <span>幸福感</span>
              <span>{happiness}%</span>
            </div>
            <div className="h-4 bg-gray-200 border-2 border-black overflow-hidden">
              <motion.div 
                className="h-full bg-yellow-400" 
                initial={{ width: 0 }}
                animate={{ width: `${happiness}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={feed}
            className="flex items-center justify-center space-x-2 bg-black text-white py-3 font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-colors border-2 border-black"
          >
            <Utensils size={18} />
            <span>喂食</span>
          </button>
          <button
            onClick={play}
            className="flex items-center justify-center space-x-2 bg-white text-black py-3 font-black uppercase tracking-widest hover:bg-yellow-400 transition-colors border-2 border-black"
          >
            <Zap size={18} />
            <span>玩耍</span>
          </button>
        </div>
      </div>
    </div>
  );
};
