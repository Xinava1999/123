import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, HelpCircle, CheckCircle2, XCircle } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

const QUESTIONS: Question[] = [
  {
    question: "“希尔瓦娜斯·风行者”在被移入荣誉室之前的最后一次平衡调整中，法力消耗从5点增加到了多少点？",
    options: ["5", "6", "7", "8"],
    correctAnswer: 1
  },
  {
    question: "哪张卡牌是炉石传说历史上第一张拥有“吸血”机制的随从（尽管当时该关键字尚未正式命名）？",
    options: ["燃鬃·自走炮", "痛苦女王", "吸血鬼药剂师", "自爆绵羊"],
    correctAnswer: 1
  },
  {
    question: "在炉石传说的底层机制中，双方场上随从数量的总和上限是多少？",
    options: ["7", "10", "14", "15"],
    correctAnswer: 2
  },
  {
    question: "哪张卡牌的卡牌背景描述是：“他总是觉得自己是个大人物”？",
    options: ["微型战斗机甲", "马格曼达", "格鲁尔", "砰砰博士"],
    correctAnswer: 0
  },
  {
    question: "随从“米尔豪斯·法力风暴”在内测（Alpha/Beta）时期的战吼效果是什么？",
    options: ["下回合对手法术消耗为0", "将一张“末日降临”加入你的手牌", "随机施放三个法术", "消灭所有法力消耗为1的随从"],
    correctAnswer: 1
  }
];

export const HearthstoneQuiz: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished' | 'leaderboard'>('idle');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quiz/questions');
      const data = await res.json();
      if (Array.isArray(data)) {
        setQuestions(data);
      } else {
        console.error('Questions data is not an array:', data);
        setQuestions([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/quiz/leaderboard');
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeaderboard(data);
      } else {
        console.error('Leaderboard data is not an array:', data);
        setLeaderboard([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startQuiz = async () => {
    await fetchQuestions();
    setCurrentQuestion(0);
    setScore(0);
    setGameState('playing');
    setSelectedOption(null);
    setIsCorrect(null);
  };

  const handleOptionClick = async (index: number) => {
    if (selectedOption !== null) return;

    setSelectedOption(index);
    const correct = index === questions[currentQuestion].correctAnswer;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);

    setTimeout(async () => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(c => c + 1);
        setSelectedOption(null);
        setIsCorrect(null);
      } else {
        setGameState('finished');
        // Submit score
        const nickname = localStorage.getItem('user_nickname') || '匿名炉友';
        await fetch('/api/quiz/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname, score: correct ? score + 1 : score })
        });
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="w-full max-w-2xl bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-2">
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-400 border-2 border-black px-3 py-1 font-black italic">
              得分: {score} / {questions.length || 5}
            </div>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest opacity-50">
            <HelpCircle size={14} />
            <span>炉石知识问答</span>
          </div>
        </div>

        <div className="relative min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
          ) : gameState === 'idle' ? (
            <div className="flex flex-col items-center justify-center space-y-6 py-10">
              <button
                onClick={startQuiz}
                className="bg-yellow-400 text-black px-12 py-4 font-black text-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                开始答题
              </button>
              <button
                onClick={() => {
                  setGameState('leaderboard');
                  fetchLeaderboard();
                }}
                className="bg-white text-black px-8 py-2 font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                查看排行榜
              </button>
            </div>
          ) : gameState === 'playing' && questions.length > 0 ? (
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">问题 {currentQuestion + 1}</div>
                <h4 className="text-2xl font-black">{questions[currentQuestion].question}</h4>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {questions[currentQuestion].options.map((option, index) => {
                  let bgColor = 'bg-white';
                  let borderColor = 'border-black';
                  
                  if (selectedOption === index) {
                    if (isCorrect) {
                      bgColor = 'bg-green-400';
                    } else {
                      bgColor = 'bg-red-400';
                    }
                  } else if (selectedOption !== null && index === questions[currentQuestion].correctAnswer) {
                    bgColor = 'bg-green-200';
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleOptionClick(index)}
                      disabled={selectedOption !== null}
                      className={`w-full text-left p-4 border-2 ${borderColor} ${bgColor} font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex justify-between items-center ${
                        selectedOption === null ? 'hover:bg-yellow-50 hover:translate-x-1 hover:translate-y-1 hover:shadow-none' : ''
                      }`}
                    >
                      <span>{option}</span>
                      {selectedOption === index && (
                        isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : gameState === 'finished' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center space-y-6 py-10 text-center"
            >
              <Trophy size={64} className="text-yellow-400" />
              <div className="space-y-2">
                <h3 className="text-4xl font-black italic tracking-tighter">答题结束！</h3>
                <p className="text-2xl font-bold">你的最终得分: {score} / {questions.length}</p>
                <p className="text-sm font-medium opacity-60">
                  {score === questions.length ? "太强了！你是真正的炉石传说！" : 
                   score >= 3 ? "很不错，你对炉石很了解。" : "还需要多加练习哦，炉友！"}
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={startQuiz}
                  className="bg-yellow-400 text-black px-8 py-4 font-black text-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center space-x-2"
                >
                  <RotateCcw />
                  <span>再来一局</span>
                </button>
                <button
                  onClick={() => {
                    setGameState('leaderboard');
                    fetchLeaderboard();
                  }}
                  className="bg-white text-black px-8 py-4 font-black text-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                >
                  排行榜
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-2xl font-black italic border-b-2 border-black pb-2">积分排行榜 (Top 10)</h3>
              <div className="space-y-2">
                {leaderboard.length === 0 ? (
                  <p className="text-center py-10 font-bold opacity-50">暂无排名，快去答题吧！</p>
                ) : (
                  leaderboard.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border-2 border-black bg-gray-50 font-bold">
                      <div className="flex items-center space-x-4">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full border-2 border-black ${idx < 3 ? 'bg-yellow-400' : 'bg-white'}`}>
                          {idx + 1}
                        </span>
                        <span>{entry.nickname}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-yellow-600">{entry.score} 分</span>
                        <span className="text-[10px] opacity-40">{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => setGameState('idle')}
                className="w-full bg-black text-white py-3 font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
              >
                返回主页
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
