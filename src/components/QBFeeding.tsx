import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Zap, Trophy, Settings2 } from 'lucide-react';

interface FeedingParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
}

type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

export const QBFeeding: React.FC = () => {
  const [hunger, setHunger] = useState(0); // 0 为空腹，100 为撑死
  const [happiness, setHappiness] = useState(50);
  const [particles, setParticles] = useState<FeedingParticle[]>([]);
  const [message, setMessage] = useState('QB 饿了，快喂它！');
  const [score, setScore] = useState(0);

  const qbImg = "https://www.imgur.la/images/2026/03/22/b_c109d49755778eb143ae04a3685db2a1.jpg";

  const feed = () => {
    // 疯狂弹出动画：每次点击生成 3 个随机位置的蟑螂
    const newParticles: FeedingParticle[] = Array.from({ length: 3 }).map(() => ({
      id: Math.random(),
      x: (Math.random() - 0.5) * 160,
      y: (Math.random() - 0.5) * 160,
      rotation: Math.random() * 360
    }));
    
    setParticles(prev => [...prev, ...newParticles].slice(-15));

    // 概率增加饱食度：饱食度越高概率越低
    const currentFullness = hunger / 100;
    const successProbability = Math.max(0.05, 1 - currentFullness);
    
    if (Math.random() < successProbability) {
      setHunger(prev => Math.min(100, prev + 2));
      setHappiness(prev => Math.min(100, prev + 5));
      setScore(prev => prev + 50);
      setMessage('好吃！再来点！');
    } else {
      setMessage('QB 好像吃不下了...');
    }
  };

  const play = () => {
    setHappiness(prev => Math.min(100, prev + 15));
    setHunger(prev => Math.max(0, prev - 5));
    setMessage('嘿嘿，真好玩！');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setHunger(prev => Math.max(0, prev - 1));
      setHappiness(prev => Math.max(0, prev - 1));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-12">
      {/* Header Stats */}
      <div className="flex justify-between w-full max-w-md px-4">
        <div className="bg-black text-white px-4 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(254,240,138,1)] flex items-center space-x-2">
          <Trophy size={16} className="text-yellow-400" />
          <span className="font-black italic">{score}</span>
        </div>
      </div>

      <div className="relative">
        {/* Main QB Avatar */}
        <motion.div
          animate={hunger > 90 ? { scale: [1, 1.05, 1] } : { y: [0, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="w-48 h-48 rounded-full border-8 border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white relative z-10"
        >
          <img src={qbImg} alt="QB" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          {hunger >= 100 && (
            <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center">
              <span className="text-white font-black text-2xl rotate-12">撑死了!</span>
            </div>
          )}
        </motion.div>
        
        {/* Rapid Cockroach Particles */}
        <AnimatePresence>
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0.5, 1.5, 0.8], 
                x: p.x, 
                y: p.y,
                rotate: p.rotation 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 text-4xl pointer-events-none z-20"
            >
              🪳
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-2xl font-black italic tracking-tighter mb-2 h-8">{message}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-black uppercase">
              <span>饱食度</span>
              <span>{hunger}%</span>
            </div>
            <div className="h-6 bg-gray-200 border-2 border-black overflow-hidden relative">
              <motion.div 
                className={`h-full transition-colors ${hunger > 80 ? 'bg-red-500' : 'bg-yellow-400'}`}
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
                className="h-full bg-green-400" 
                initial={{ width: 0 }}
                animate={{ width: `${happiness}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={feed}
            disabled={hunger >= 100}
            className="flex items-center justify-center space-x-2 bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all border-2 border-black active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            <Utensils size={18} />
            <span>喂食</span>
          </button>
          <button
            onClick={play}
            className="flex items-center justify-center space-x-2 bg-white text-black py-4 font-black uppercase tracking-widest hover:bg-yellow-400 transition-all border-2 border-black active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <Zap size={18} />
            <span>玩耍</span>
          </button>
        </div>
        
        <p className="text-[10px] font-bold text-center text-black/40 italic">
          提示：饱食度越高，喂食成功的机会越低！
        </p>
      </div>
    </div>
  );
};
