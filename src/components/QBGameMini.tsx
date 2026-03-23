import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Heart } from 'lucide-react';

export const QBGameMini: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
  const [difficulty, setDifficulty] = useState<'EASY' | 'NORMAL' | 'HARD'>('NORMAL');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Difficulty Config
  const difficultyConfig = {
    EASY: { speed: 1.5, paddleWidth: 100 },
    NORMAL: { speed: 2.5, paddleWidth: 80 },
    HARD: { speed: 4.0, paddleWidth: 60 },
  };

  // Game Constants
  const PADDLE_WIDTH = difficultyConfig[difficulty].paddleWidth;
  const PADDLE_HEIGHT = 10;
  const BALL_RADIUS = 8;
  const BRICK_ROWS = 4;
  const BRICK_COLS = 6;
  const BRICK_HEIGHT = 30;
  const BRICK_PADDING = 10;
  const BRICK_OFFSET_TOP = 40;
  const BRICK_OFFSET_LEFT = 30;

  const qbImg = new Image();
  qbImg.src = "https://www.imgur.la/images/2026/03/22/b_c109d49755778eb143ae04a3685db2a1.jpg";

  useEffect(() => {
    const saved = localStorage.getItem('qb_game_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let x = canvas.width / 2;
    let y = canvas.height - 30;
    let dx = difficultyConfig[difficulty].speed;
    let dy = -difficultyConfig[difficulty].speed;
    let paddleX = (canvas.width - PADDLE_WIDTH) / 2;
    let rightPressed = false;
    let leftPressed = false;

    const bricks: any[] = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks[c] = [];
      for (let r = 0; r < BRICK_ROWS; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
      }
    }

    const keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
      else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
    };

    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
      else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
    };

    const mouseMoveHandler = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      if (relativeX > 0 && relativeX < canvas.width) {
        paddleX = (relativeX / rect.width) * canvas.width - PADDLE_WIDTH / 2;
      }
    };

    const touchMoveHandler = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const relativeX = touch.clientX - rect.left;
      if (relativeX > 0 && relativeX < canvas.width) {
        paddleX = (relativeX / rect.width) * canvas.width - PADDLE_WIDTH / 2;
      }
    };

    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);
    document.addEventListener("mousemove", mouseMoveHandler, false);
    document.addEventListener("touchmove", touchMoveHandler, { passive: false });

    const collisionDetection = () => {
      for (let c = 0; c < BRICK_COLS; c++) {
        for (let r = 0; r < BRICK_ROWS; r++) {
          const b = bricks[c][r];
          if (b.status === 1) {
            if (x > b.x && x < b.x + (canvas.width - BRICK_OFFSET_LEFT * 2) / BRICK_COLS - BRICK_PADDING && y > b.y && y < b.y + BRICK_HEIGHT) {
              dy = -dy;
              b.status = 0;
              setScore(s => s + 10);
              
              // Check if all bricks are cleared
              let allCleared = true;
              for (let c2 = 0; c2 < BRICK_COLS; c2++) {
                for (let r2 = 0; r2 < BRICK_ROWS; r2++) {
                  if (bricks[c2][r2].status === 1) allCleared = false;
                }
              }
              if (allCleared) {
                // Reset bricks for endless play
                for (let c2 = 0; c2 < BRICK_COLS; c2++) {
                  for (let r2 = 0; r2 < BRICK_ROWS; r2++) {
                    bricks[c2][r2].status = 1;
                  }
                }
                dx *= 1.02; // Speed up
                dy *= 1.02;
              }
            }
          }
        }
      }
    };

    const drawBall = () => {
      ctx.beginPath();
      ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#000000";
      ctx.fill();
      ctx.closePath();
      
      // Draw cockroach emoji on ball
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🪳", x, y);
    };

    const drawPaddle = () => {
      ctx.beginPath();
      ctx.rect(paddleX, canvas.height - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillStyle = "#FACC15"; // Yellow-400
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.closePath();
    };

    const drawBricks = () => {
      const brickWidth = (canvas.width - BRICK_OFFSET_LEFT * 2) / BRICK_COLS - BRICK_PADDING;
      for (let c = 0; c < BRICK_COLS; c++) {
        for (let r = 0; r < BRICK_ROWS; r++) {
          if (bricks[c][r].status === 1) {
            const brickX = (c * (brickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
            const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
            bricks[c][r].x = brickX;
            bricks[c][r].y = brickY;
            
            // Draw QB head
            ctx.save();
            ctx.beginPath();
            ctx.rect(brickX, brickY, brickWidth, BRICK_HEIGHT);
            ctx.clip();
            if (qbImg.complete) {
              ctx.drawImage(qbImg, brickX, brickY, brickWidth, BRICK_HEIGHT);
            } else {
              ctx.fillStyle = "#FFFFFF";
              ctx.fill();
            }
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBricks();
      drawBall();
      drawPaddle();
      collisionDetection();

      if (x + dx > canvas.width - BALL_RADIUS || x + dx < BALL_RADIUS) {
        dx = -dx;
      }
      if (y + dy < BALL_RADIUS) {
        dy = -dy;
      } else if (y + dy > canvas.height - BALL_RADIUS - 10 - PADDLE_HEIGHT) {
        if (x > paddleX && x < paddleX + PADDLE_WIDTH) {
          dy = -dy;
        } else if (y + dy > canvas.height - BALL_RADIUS) {
          setGameState('gameOver');
          return;
        }
      }

      if (rightPressed && paddleX < canvas.width - PADDLE_WIDTH) {
        paddleX += 7;
      } else if (leftPressed && paddleX > 0) {
        paddleX -= 7;
      }

      x += dx;
      y += dy;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener("keydown", keyDownHandler);
      document.removeEventListener("keyup", keyUpHandler);
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("touchmove", touchMoveHandler);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'gameOver') {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('qb_game_highscore', score.toString());
      }
    }
  }, [gameState, score, highScore]);

  const startGame = () => {
    setScore(0);
    setGameState('playing');
  };

  return (
    <div className="flex flex-col items-center space-y-6 pb-24">
      <div className="w-full max-w-2xl bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4">
        <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-400 border-2 border-black px-3 py-1 font-black italic">
              分数: {score}
            </div>
            <div className="bg-black text-white px-3 py-1 font-black italic flex items-center space-x-2">
              <Trophy size={14} />
              <span>最高: {highScore}</span>
            </div>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
            弹射蟑螂，击打QB
          </div>
        </div>

        <div className="relative bg-gray-50 border-2 border-black overflow-hidden aspect-[4/3] md:aspect-[16/9]">
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            className="w-full h-full"
          />

          <AnimatePresence>
            {gameState !== 'playing' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white"
              >
                {gameState === 'idle' ? (
                  <div className="text-center space-y-6">
                    <h3 className="text-4xl font-black italic tracking-tighter">弹射蟑螂</h3>
                    
                    <div className="flex bg-white/20 border-2 border-white p-1 rounded-lg">
                      {(['EASY', 'NORMAL', 'HARD'] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`px-4 py-2 font-black text-xs transition-all rounded ${
                            difficulty === d ? 'bg-yellow-400 text-black' : 'hover:bg-white/20'
                          }`}
                        >
                          {d === 'EASY' ? '简单' : d === 'NORMAL' ? '普通' : '困难'}
                        </button>
                      ))}
                    </div>

                    <p className="text-sm font-medium opacity-80">使用鼠标或触摸控制挡板</p>
                    <button
                      onClick={startGame}
                      className="bg-yellow-400 text-black px-8 py-4 font-black text-xl shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center space-x-2 w-full"
                    >
                      <Play fill="currentColor" />
                      <span>开始游戏</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-6">
                    <h3 className="text-4xl font-black italic tracking-tighter text-red-500">游戏结束</h3>
                    <div className="text-2xl font-black">最终得分: {score}</div>
                    <button
                      onClick={startGame}
                      className="bg-white text-black px-8 py-4 font-black text-xl shadow-[4px_4px_0px_0px_rgba(250,204,21,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center space-x-2"
                    >
                      <RotateCcw />
                      <span>再来一次</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
