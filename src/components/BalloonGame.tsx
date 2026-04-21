import { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';

// --- MediaPipe CDN URLs ---
const HANDS_JS = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
const CAMERA_UTILS_JS = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';

interface WordItem {
  word: string;
  meaning: string;
}

interface Balloon {
  id: number;
  char: string;
  x: number;
  y: number;
  r: number;
  speed: number;
  color: string;
  isCorrect: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}

export default function BalloonGame() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'done'>('setup');
  const [words, setWords] = useState<WordItem[]>([]);
  const [score, setScore] = useState(0);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [hiddenIdx, setHiddenIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Refs for Game Engine
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const indexFingerRef = useRef<{ x: number, y: number, active: boolean }>({ x: 0, y: 0, active: false });
  
  const balloonsRef = useRef<Balloon[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const gameStartTimeRef = useRef(0);
  const balloonIdCounter = useRef(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. Load MediaPipe Scripts ---
  const loadScript = (src: string) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve(true);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };

  const initMediaPipe = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsLoading(true);
    try {
      await loadScript(HANDS_JS);
      await loadScript(CAMERA_UTILS_JS);

      const Hands = (window as any).Hands;
      const Camera = (window as any).Camera;

      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults((results: any) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          // Index Finger Tip is index 8
          const tip = landmarks[8];
          indexFingerRef.current = {
            x: (1 - tip.x) * canvasRef.current!.width, 
            y: tip.y * canvasRef.current!.height,
            active: true
          };
        } else {
          indexFingerRef.current.active = false;
        }
      });

      handsRef.current = hands;

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current! });
        },
        width: 640,
        height: 480
      });
      cameraRef.current = camera;
      await camera.start();
      setIsCameraReady(true);
    } catch (err) {
      console.error("MediaPipe Init Error:", err);
      alert("카메라 및 AI 모델을 불러오는 도중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. Excel Upload ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const list: WordItem[] = [];
        XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1).forEach(row => {
          if (row[0] && row[1]) {
            list.push({ word: String(row[0]).trim().toUpperCase(), meaning: String(row[1]).trim() });
          }
        });
        if (list.length === 0) {
           alert("데이터가 없습니다. 첫째 줄은 제목, 이후 [단어, 뜻] 순서로 작성해 주세요.");
           return;
        }
        setWords(list);
        alert(`${list.length}개의 단어가 등록되었습니다.`);
      } catch (err) {
        alert("엑셀 파일 파싱 중 오류가 발생했습니다.");
      }
    };
    reader.readAsBinaryString(f);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const wsData = [
      ["Word", "Meaning"],
      ["APPLE", "사과"],
      ["BANANA", "바나나"],
      ["CHERRY", "체리"],
      ["DOG", "개"],
      ["ELEPHANT", "코끼리"]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Words");
    XLSX.writeFile(wb, "balloon_pop_template.xlsx");
  };

  // --- 3. Game Engine ---
  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        alpha: 1,
        color
      });
    }
  };

  const spawnBalloon = useCallback((correctChar: string) => {
    const isCorrect = Math.random() > 0.6; // 40% chance of being the correct one
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const char = isCorrect ? correctChar : alphabet[Math.floor(Math.random() * 26)];
    
    // Check limit: Max 2 of the same correct alphabet
    if (char === correctChar) {
      const count = balloonsRef.current.filter(b => b.char === correctChar).length;
      if (count >= 2) {
        // If we already have 2, try to spawn a wrong one instead
        return spawnBalloon(correctChar); 
      }
    }

    const x = Math.random() * (640 - 80) + 40;
    const colors = ['#FF5E5E', '#5E8BFF', '#5EFF8B', '#FFD25E', '#D95EFF', '#5EFFF2'];
    
    balloonsRef.current.push({
      id: balloonIdCounter.current++,
      char,
      x,
      y: 530,
      r: 35,
      speed: 2 + (scoreRef.current / 50), // Speed increases with score
      color: colors[Math.floor(Math.random() * colors.length)],
      isCorrect: char === correctChar
    });
  }, []);

  const nextWord = useCallback(() => {
    if (words.length === 0) return;
    const nextIdx = (currentWordIdx + 1) % words.length;
    setCurrentWordIdx(nextIdx);
    setHiddenIdx(Math.floor(Math.random() * words[nextIdx].word.length));
    balloonsRef.current = []; // Clear current balloons
  }, [words, currentWordIdx]);

  const gameLoop = useCallback((time: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !videoRef.current) return;

    // 1. Draw Background (Webcam)
    ctx.save();
    ctx.translate(640, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    ctx.restore();

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, 640, 480);

    // 2. Head UI (Current Word)
    const currentWord = words[currentWordIdx].word;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    
    let displayStr = "";
    for(let i=0; i<currentWord.length; i++) {
      displayStr += (i === hiddenIdx ? "_ " : currentWord[i] + " ");
    }
    
    ctx.fillStyle = 'white';
    ctx.fillText(displayStr, 320, 70);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText(words[currentWordIdx].meaning, 320, 105);

    // 3. Update & Draw Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;
      if (p.alpha <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 4. Update & Draw Balloons
    const correctChar = currentWord[hiddenIdx];
    if (time - gameStartTimeRef.current > 1000) {
        spawnBalloon(correctChar);
        gameStartTimeRef.current = time;
    }

    const finder = indexFingerRef.current;

    for (let i = balloonsRef.current.length - 1; i >= 0; i--) {
      const b = balloonsRef.current[i];
      b.y -= b.speed;
      
      // Collision detection
      if (finder.active) {
        const dist = Math.sqrt((finder.x - b.x) ** 2 + (finder.y - b.y) ** 2);
        if (dist < b.r + 10) {
          createExplosion(b.x, b.y, b.color);
          if (b.isCorrect) {
            scoreRef.current += 10;
            setScore(scoreRef.current);
            nextWord();
          } else {
            scoreRef.current = Math.max(0, scoreRef.current - 5); // Penalty
            setScore(scoreRef.current);
          }
          balloonsRef.current.splice(i, 1);
          continue;
        }
      }

      if (b.y < -50) {
        balloonsRef.current.splice(i, 1);
        continue;
      }

      // Draw Balloon
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.stroke();

      // String at bottom
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.r);
      ctx.lineTo(b.x, b.y + b.r + 20);
      ctx.stroke();

      // Char
      ctx.fillStyle = 'white';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.char, b.x, b.y);
    }

    // 5. Draw Target Marker (Finger)
    if (finder.active) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(finder.x, finder.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6366F1';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Crosshair lines
      ctx.beginPath();
      ctx.moveTo(finder.x - 25, finder.y); ctx.lineTo(finder.x + 25, finder.y);
      ctx.moveTo(finder.x, finder.y - 25); ctx.lineTo(finder.x, finder.y + 25);
      ctx.stroke();
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [words, currentWordIdx, hiddenIdx, nextWord, spawnBalloon]);

  useEffect(() => {
    if (gameState === 'playing' && isCameraReady) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, isCameraReady, gameLoop]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
        if (cameraRef.current) cameraRef.current.stop();
        if (handsRef.current) handsRef.current.close();
    };
  }, []);

  const handleStart = async () => {
    if (words.length === 0) return alert("단어를 먼저 등록해 주세요.");
    setHiddenIdx(Math.floor(Math.random() * words[0].word.length));
    initMediaPipe();
    setGameState('playing');
  };

  if (gameState === 'setup') {
    return (
      <div className="max-w-[1160px] mx-auto w-[75%] h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1 no-print overflow-hidden min-h-0">
        <div className="flex items-center justify-between mb-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm shrink-0">
           <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-2xl shadow-lg text-white">🎈</div>
              <div>
                <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 leading-none mb-1">풍선 터뜨리기 설정</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Balloon Popping & Spelling</p>
              </div>
           </div>
           <div className="flex items-center gap-2 px-4 py-1.5 bg-rose-50 border border-rose-100 rounded-full text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none">
             Camera Calibration Needed
           </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 overflow-y-auto pb-4 custom-scrollbar-light">
           <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-slate-50 flex items-center justify-center text-4xl rounded-2xl mb-4 grayscale">📂</div>
             <h2 className="text-xl font-black text-slate-800 mb-2 uppercase italic tracking-tighter">단어 목록 등록</h2>
             <p className="text-sm text-slate-400 mb-8 px-4 leading-relaxed font-medium">엑셀 양식에 맞춰 단어(Spelling)와 뜻(Meaning)을 입력한 뒤 업로드해 주세요.</p>
             <div className="flex gap-2 w-full">
               <button onClick={handleDownloadTemplate} className="flex-1 py-3 bg-yellow-400 text-yellow-900 border border-yellow-500 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-yellow-500 transition-all">양식 다운로드</button>
               <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all">엑셀 업로드</button>
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
             {words.length > 0 && <div className="mt-4 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full font-black text-[10px] uppercase tracking-widest border border-emerald-100">Ready: {words.length} Words Loaded</div>}
           </div>

           <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col h-full overflow-hidden">
             <h2 className="text-xs font-black text-slate-300 uppercase tracking-[0.3em] mb-6 flex items-center gap-2 italic">
               <span className="w-2 h-2 rounded-full bg-rose-500" /> Game Mission
             </h2>
             <div className="space-y-6 flex-1 text-left">
                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 border border-slate-100">1</span>
                  <div>
                    <p className="font-black text-slate-800 text-sm mb-1 uppercase tracking-tighter">카메라 준비</p>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed">웹캠이 달린 환경에서 검지 손가락이 잘 보이도록 준비하세요.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 border border-slate-100">2</span>
                  <div>
                    <p className="font-black text-slate-800 text-sm mb-1 uppercase tracking-tighter">풍선 터뜨리기</p>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed">화면에 나오는 단어의 빈칸에 알맞은 알파벳 풍선을 검지 손가락으로 건드려 터뜨리세요.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-emerald-500 italic">
                  <span className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-xs font-black text-emerald-400 border border-emerald-100">✓</span>
                  <div>
                    <p className="font-black text-sm mb-1 uppercase tracking-tighter">보너스 & 페널티</p>
                    <p className="text-[10px] font-black leading-relaxed opacity-70 uppercase tracking-widest">맞출수록 풍선의 속도가 빨라지며, 오답 풍선 클릭 시 점수가 감점됩니다.</p>
                  </div>
                </div>
             </div>
             <button onClick={handleStart} className="w-full py-5 bg-rose-500 text-white rounded-[1.5rem] font-black text-xl uppercase tracking-widest shadow-2xl shadow-rose-500/30 hover:scale-105 transition-all mt-8">Start Mission ▶</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center bg-[#0F172A] relative overflow-hidden rounded-[3rem] p-4 text-white">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
           <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
           <p className="text-xl font-black italic tracking-tighter uppercase">AI Camera System Initializing...</p>
        </div>
      )}

      {/* --- Main Game Layout --- */}
      <div className="flex-1 w-full grid grid-cols-12 gap-4 overflow-hidden min-h-0">
        {/* Canvas Area */}
        <div className="col-span-12 lg:col-span-9 bg-black rounded-[2rem] relative overflow-hidden border-4 border-slate-800 shadow-2xl flex items-center justify-center">
           <video ref={videoRef} className="hidden" playsInline autoPlay />
           <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-contain" />
        </div>

        {/* Stats Area */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
           <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-2 italic">Current Score</span>
              <div className="text-6xl font-[1000] italic text-rose-500 tracking-tighter leading-none mb-1">{score}</div>
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic leading-none">Mission Total Points</span>
           </div>

           <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-[2rem] p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Game Status</span>
                 <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest leading-none shadow-lg shadow-emerald-500/20">Active</div>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Hidden Letter</p>
                    <p className="text-2xl font-black italic text-white uppercase">{words[currentWordIdx].word[hiddenIdx]}</p>
                    <div className="absolute top-4 right-4 text-2xl grayscale opacity-20">🎯</div>
                 </div>
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Speed Factor</p>
                    <p className="text-2xl font-black italic text-amber-500 uppercase">x{(1 + score/500).toFixed(1)}</p>
                 </div>
              </div>
              <button onClick={() => { if(cameraRef.current) cameraRef.current.stop(); setGameState('setup'); }} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all mt-4">Quit Hub →</button>
           </div>
        </div>
      </div>
    </div>
  );
}
