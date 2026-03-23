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
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const startQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setGameState('playing');
    setSelectedOption(null);
    setIsCorrect(null);
  };

  const handleOptionClick = (index: number) => {
    if (selectedOption !== null) return;

    setSelectedOption(index);
    const correct = index === QUESTIONS[currentQuestion].correctAnswer;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);

    setTimeout(() => {
      if (currentQuestion < QUESTIONS.length - 1) {
        setCurrentQuestion(c => c + 1);
        setSelectedOption(null);
        setIsCorrect(null);
      } else {
        setGameState('finished');
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="w-full max-w-2xl bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-2">
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-400 border-2 border-black px-3 py-1 font-black italic">
              得分: {score} / {QUESTIONS.length}
            </div>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest opacity-50">
            <HelpCircle size={14} />
            <span>炉石知识问答</span>
          </div>
        </div>

        <div className="relative min-h-[300px]">
          {gameState === 'idle' ? (
            <div className="flex flex-col items-center justify-center space-y-6 py-10">
              <button
                onClick={startQuiz}
                className="bg-yellow-400 text-black px-12 py-4 font-black text-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                开始答题
              </button>
            </div>
          ) : gameState === 'playing' ? (
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">问题 {currentQuestion + 1}</div>
                <h4 className="text-2xl font-black">{QUESTIONS[currentQuestion].question}</h4>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {QUESTIONS[currentQuestion].options.map((option, index) => {
                  let bgColor = 'bg-white';
                  let borderColor = 'border-black';
                  
                  if (selectedOption === index) {
                    if (isCorrect) {
                      bgColor = 'bg-green-400';
                    } else {
                      bgColor = 'bg-red-400';
                    }
                  } else if (selectedOption !== null && index === QUESTIONS[currentQuestion].correctAnswer) {
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
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center space-y-6 py-10 text-center"
            >
              <Trophy size={64} className="text-yellow-400" />
              <div className="space-y-2">
                <h3 className="text-4xl font-black italic tracking-tighter">答题结束！</h3>
                <p className="text-2xl font-bold">你的最终得分: {score} / {QUESTIONS.length}</p>
                <p className="text-sm font-medium opacity-60">
                  {score === QUESTIONS.length ? "太强了！你是真正的炉石传说！" : 
                   score >= 3 ? "很不错，你对炉石很了解。" : "还需要多加练习哦，炉友！"}
                </p>
              </div>
              <button
                onClick={startQuiz}
                className="bg-yellow-400 text-black px-12 py-4 font-black text-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center space-x-2"
              >
                <RotateCcw />
                <span>重新开始</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
