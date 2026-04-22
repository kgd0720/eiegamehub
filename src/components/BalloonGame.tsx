import { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Activity } from 'lucide-react';

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
  const [gameState, setGameState] = useState<'setup' | 'camera-check' | 'playing' | 'ranking' | 'done'>('setup');
  const [matchMode, setMatchMode] = useState<'single' | 'team' | null>(null);
  const [words, setWords] = useState<WordItem[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [newTeam, setNewTeam] = useState('');
  
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [initialTime, setInitialTime] = useState(60);
  
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [activeQuestions, setActiveQuestions] = useState<WordItem[]>([]);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [hiddenIdx, setHiddenIdx] = useState(0);
  const [score, setScore] = useState<Record<string, number>>({});
  
  const [timeLeft, setTimeLeft] = useState(60);
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
  const currentTeamScoreRef = useRef(0);
  const lastSpawnTimeRef = useRef(0);
  const balloonIdCounter = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- 1. Utilities ---
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
    const isCorrect = Math.random() > 0.7; // ~30% chance for correct letter
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const char = isCorrect ? correctChar : alphabet[Math.floor(Math.random() * 26)];
    
    // Constraint: Max 2 correct char balloons simultaneously
    if (char === correctChar) {
      if (balloonsRef.current.filter(b => b.char === correctChar).length >= 2) {
        return; // Don't spawn more if limit reached
      }
    }

    const x = Math.random() * (640 - 100) + 50;
    const colors = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6C5CE7', '#A8E6CF', '#FF8B94'];
    
    balloonsRef.current.push({
      id: balloonIdCounter.current++,
      char,
      x,
      y: 530,
      r: 38,
      speed: 2.2 + (currentTeamScoreRef.current / 400),
      color: colors[Math.floor(Math.random() * colors.length)],
      isCorrect: char === correctChar
    });
  }, []);

  const nextWord = useCallback(() => {
    const nextIdx = currentWordIdx + 1;
    if (nextIdx < activeQuestions.length) {
      setCurrentWordIdx(nextIdx);
      setHiddenIdx(Math.floor(Math.random() * activeQuestions[nextIdx].word.length));
      balloonsRef.current = [];
    } else {
      finishRound();
    }
  }, [activeQuestions, currentWordIdx]);

  const finishRound = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    const currentTeam = teams[currentTeamIdx];
    setScore(prev => ({ ...prev, [currentTeam]: currentTeamScoreRef.current }));

    if (currentTeamIdx < teams.length - 1) {
       // Transition to next team/person is handled by a "Next Round" button usually,
       // but here we can just reset or show a brief overlay.
       // For simplicity, we'll go to next round preparation.
       prepareRound(currentTeamIdx + 1);
    } else {
       setGameState('ranking');
    }
  };

  const prepareRound = (idx: number) => {
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, maxQuestions);
    setActiveQuestions(shuffled);
    setCurrentWordIdx(0);
    setHiddenIdx(Math.floor(Math.random() * shuffled[0].word.length));
    setCurrentTeamIdx(idx);
    currentTeamScoreRef.current = 0;
    setTimeLeft(initialTime);
    balloonsRef.current = [];
    particlesRef.current = [];
    setGameState('playing');
  };

  // --- 2. MediaPipe & Camera ---
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
          const tip = landmarks[8];
          indexFingerRef.current = {
            x: (1 - tip.x) * 640, // Canvas is 640x480
            y: tip.y * 480,
            active: true
          };
        } else {
          indexFingerRef.current.active = false;
        }
      });

      handsRef.current = hands;

      const camera = new Camera(videoRef.current, {
        onFrame: async () => { if (handsRef.current) await handsRef.current.send({ image: videoRef.current! }); },
        width: 640,
        height: 480
      });
      cameraRef.current = camera;
      await camera.start();
      
      // Wait for video to actually start playing
      if (videoRef.current) {
        videoRef.current.onplay = () => {
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      alert("카메라 시스템 초기화 실패");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. Game Engine Loop ---
  const gameLoop = useCallback((time: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !videoRef.current) return;

    // 1. Draw Mirrored Video
    ctx.save();
    ctx.translate(640, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    ctx.restore();

    // Dark Overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, 0, 640, 480);

    // 2. LIVE Indicator
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(25, 25, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'white'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
    ctx.fillText('LIVE CAM FEED : INDEX_FINGER_TRACKING', 38, 28);

    // 3. Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx; p.y += p.vy; p.alpha -= 0.025;
      if (p.alpha <= 0) { particlesRef.current.splice(i, 1); continue; }
      ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 4. Balloons
    const currentWord = activeQuestions[currentWordIdx]?.word || "";
    const correctChar = currentWord[hiddenIdx] || "";
    
    if (time - lastSpawnTimeRef.current > 900) {
      spawnBalloon(correctChar);
      lastSpawnTimeRef.current = time;
    }

    const finger = indexFingerRef.current;
    
    for (let i = balloonsRef.current.length - 1; i >= 0; i--) {
      const b = balloonsRef.current[i];
      b.y -= b.speed;
      
      // Collision
      if (finger.active) {
        const d = Math.sqrt((finger.x - b.x) ** 2 + (finger.y - b.y) ** 2);
        if (d < b.r + 5) {
          createExplosion(b.x, b.y, b.color);
          if (b.isCorrect) {
            currentTeamScoreRef.current += 10;
            nextWord();
          } else {
            currentTeamScoreRef.current = Math.max(0, currentTeamScoreRef.current - 5);
          }
          balloonsRef.current.splice(i, 1);
          continue;
        }
      }

      if (b.y < -60) { balloonsRef.current.splice(i, 1); continue; }

      // Draw Balloon Body
      ctx.shadowBlur = 15; ctx.shadowColor = b.color + '44';
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      
      // White Border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'white'; ctx.lineWidth = 3;
      ctx.stroke();

      // Tail/String (Vertical line down)
      ctx.beginPath(); ctx.moveTo(b.x, b.y + b.r); ctx.lineTo(b.x, b.y + b.r + 30);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();

      // Highlight/Reflect
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.ellipse(b.x - b.r/3, b.y - b.r/3, b.r/4, b.r/6, Math.PI/4, 0, Math.PI*2); ctx.fill();

      // Char
      ctx.fillStyle = 'white'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.char, b.x, b.y + 2);
    }

    // 5. Finger Pointer UI
    if (finger.active) {
       ctx.strokeStyle = '#4FD1C5'; ctx.lineWidth = 3;
       ctx.beginPath(); ctx.arc(finger.x, finger.y, 18, 0, Math.PI * 2); ctx.stroke();
       ctx.beginPath(); ctx.moveTo(finger.x - 25, finger.y); ctx.lineTo(finger.x + 25, finger.y);
       ctx.moveTo(finger.x, finger.y - 25); ctx.lineTo(finger.x, finger.y + 25);
       ctx.stroke();
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [activeQuestions, currentWordIdx, hiddenIdx, nextWord, spawnBalloon]);

  useEffect(() => {
    if ((gameState === 'playing' || gameState === 'camera-check') && isCameraReady) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, isCameraReady, gameLoop]);

  // Timer Effect
  useEffect(() => {
    if (gameState !== 'playing') return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { finishRound(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [gameState]);

  // --- 4. Setup Logic ---
  const handleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const list: WordItem[] = [];
        XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1).forEach(row => {
          if (row[0] && row[1]) list.push({ word: String(row[0]).trim().toUpperCase(), meaning: String(row[1]).trim() });
        });
        setWords(list);
        alert(`${list.length}개의 단어가 로드되었습니다.`);
      } catch { alert('파일 형식 오류'); }
    };
    reader.readAsBinaryString(f);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([["Word", "Meaning"], ["APPLE", "사과"], ["BANANA", "바나나"]]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Words");
    XLSX.writeFile(wb, "balloon_pop_template.xlsx");
  };

  const handleStart = () => {
    if (words.length < maxQuestions) return alert(`단어가 ${maxQuestions}개 이상 필요합니다.`);
    if (matchMode === 'team' && teams.length < 2) return alert('최소 2팀이 필요합니다.');
    if (matchMode === 'single' && teams.length < 1) return alert('참가자를 등록해 주세요.');
    
    currentTeamScoreRef.current = 0;
    initMediaPipe();
    setGameState('camera-check');
  };

  const startActualGame = () => {
    prepareRound(0);
  };

  // --- Render Sections ---
  if (gameState === 'setup') {
    const step1Done = !!matchMode;
    const step2Done = maxQuestions > 0 && initialTime > 0;
    const step3Done = words.length >= maxQuestions && (matchMode === 'team' ? teams.length >= 2 : teams.length >= 1);
    const isReady = step2Done && step3Done;
    const progress = Math.round(([step1Done, step2Done, step3Done].filter(Boolean).length / 3) * 100);

    return (
      <div className="max-w-[1160px] mx-auto w-[75%] h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1 no-print overflow-hidden min-h-0">
        <div className="flex items-center justify-between mb-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
           <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center text-2xl shadow-lg text-white">🎈</div>
              <div>
                <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 leading-none mb-1">풍선 터뜨리기 설정</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Interactive Alphabet Pop</p>
              </div>
           </div>
           
           <div className="hidden md:flex items-center gap-8 mr-10">
              {['대전 모드', '미션 설정', '데이터 등록'].map((label, i) => {
                const done = [step1Done, step2Done, step3Done][i];
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${done ? 'bg-pink-500 border-pink-400 text-white' : 'border-slate-200 text-slate-300'}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-[11px] font-[1000] uppercase tracking-widest ${done ? 'text-slate-900' : 'text-slate-300'}`}>{label}</span>
                    {i < 2 && <div className="w-8 h-px bg-slate-100 mx-2" />}
                  </div>
                );
              })}
           </div>

           <div className="flex items-center gap-2 px-4 py-1.5 bg-pink-50 border border-pink-100 rounded-full">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isReady ? 'bg-emerald-500' : 'bg-pink-500'}`} />
              <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest leading-none">
                {isReady ? '준비완료' : '설정 진행중'}
              </span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-stretch flex-1 overflow-hidden custom-scrollbar-light pb-10 lg:pb-0 min-h-0">
          <div className="col-span-1 lg:col-span-9 flex flex-col gap-2 overflow-visible lg:overflow-hidden min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
                <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm flex flex-col transition-all duration-300 ${matchMode ? 'border-pink-500 ring-4 ring-pink-500/5' : 'border-slate-200'}`}>
                  <label className="text-[11px] font-[1000] text-pink-900 uppercase tracking-widest bg-pink-50 px-3 py-1 rounded-full w-fit mb-6">STEP 01. 대전 모드 선택</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{id:'single', label:'개인전', icon:'👤', desc:'참가자 VS 진행자'}, {id:'team', label:'단체전', icon:'👥', desc:'팀 간 기록 대결'}].map(m => (
                      <button key={m.id} onClick={() => setMatchMode(m.id as any)}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${matchMode === m.id ? 'bg-pink-500 border-pink-600 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-pink-200'}`}>
                        <span className="text-2xl">{m.icon}</span>
                        <span className="text-[12px] font-black">{m.label}</span>
                        <span className={`text-[10px] font-bold ${matchMode === m.id ? 'text-pink-100' : 'text-slate-300'}`}>{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm flex flex-col transition-all duration-300 ${step2Done ? 'border-pink-500 ring-4 ring-pink-500/5' : 'border-slate-200'}`}>
                  <label className="text-[11px] font-[1000] text-pink-900 uppercase tracking-widest bg-pink-50 px-3 py-1 rounded-full w-fit mb-4">STEP 02. 미션 상세 설정</label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-3">
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">출제 문항 수</span>
                          <span className="text-xl font-[1000] italic text-pink-600 mt-1">{maxQuestions} Words</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <button onClick={() => setMaxQuestions(Math.max(2, maxQuestions - 2))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-900 font-black text-xl hover:border-pink-500 shadow-sm active:scale-90 transition-all">-</button>
                          <button onClick={() => setMaxQuestions(Math.min(30, maxQuestions + 2))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-900 font-black text-xl hover:border-pink-500 shadow-sm active:scale-90 transition-all">+</button>
                       </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">제한 시간 (SECONDS)</p>
                      <div className="grid grid-cols-6 gap-1.5">
                        {[30, 60, 90, 120, 150, 180].map(t => (
                          <button key={t} onClick={() => setInitialTime(t)}
                            className={`py-1.5 rounded-lg text-[11px] font-black border-2 transition-all ${initialTime === t ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-300 hover:border-pink-200'}`}>{t}s</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-h-0">
               <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm flex flex-col transition-all duration-300 ${words.length >= maxQuestions ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[12px] font-[1000] text-pink-700 uppercase tracking-widest bg-pink-50 px-3 py-1 rounded-full">단어 데이터 관리</h3>
                    <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-black uppercase ${words.length >= maxQuestions ? 'text-emerald-500' : 'text-slate-300'}`}>{words.length} / {maxQuestions}</span>
                       <button onClick={() => setWords([])} className="text-[10px] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase">✕ 비우기</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-col gap-2 custom-scrollbar-light shadow-inner">
                    {words.length === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-slate-200 rounded-2xl py-8">
                        <span className="text-3xl mb-2">📂</span>
                        <p className="text-[10px] font-black uppercase tracking-widest italic text-center">Excel registration needed</p>
                      </div>
                    ) : (
                      words.map((w, idx) => (
                        <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:border-pink-300 transition-all flex items-center justify-between">
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-pink-500 uppercase tracking-tighter">WORD {idx+1}</span>
                              <span className="text-xs font-black text-slate-800">{w.word}</span>
                           </div>
                           <span className="text-[10px] font-bold text-slate-400 italic">{w.meaning}</span>
                        </div>
                      ))
                    )}
                  </div>
               </div>

               <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm flex flex-col transition-all duration-300 ${teams.length >= (matchMode === 'team' ? 2 : 1) ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[12px] font-[1000] text-pink-700 uppercase tracking-widest bg-pink-50 px-3 py-1 rounded-full">참가 명단 등록</h3>
                    <button onClick={() => setTeams([])} className="text-[10px] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase">✕ 초기화</button>
                  </div>
                  <div className="flex gap-2 mb-4 shrink-0">
                    <input value={newTeam} onChange={e => setNewTeam(e.target.value)} 
                       onKeyDown={e => { if(e.key === 'Enter' && newTeam.trim()) { setTeams([...teams, newTeam.trim()]); setNewTeam(''); } }}
                       placeholder={matchMode === "team" ? "팀 또는 분원명..." : "참여자 이름..."} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-pink-500 font-bold text-sm shadow-inner" />
                    <button onClick={() => { if(newTeam.trim()) { setTeams([...teams, newTeam.trim()]); setNewTeam(''); } }} className="px-5 rounded-xl bg-pink-500 text-white font-black text-xl hover:scale-105 transition-all shadow-lg">+</button>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-wrap content-start gap-2 custom-scrollbar-light shadow-inner">
                    {teams.map((t, idx) => (
                      <div key={idx} className="h-10 rounded-xl border bg-white border-slate-200 text-slate-700 px-3 flex items-center gap-2 font-black text-sm shadow-sm hover:border-pink-500 transition-all animate-in zoom-in-95 group">
                         <span className="text-pink-500/40 italic">#T{idx+1}</span> <span>{t}</span>
                         <button onClick={() => setTeams(teams.filter((_, i) => i !== idx))} className="w-6 h-6 rounded-full bg-slate-50 text-slate-300 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center text-[10px]">✕</button>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-3 flex flex-col gap-2 overflow-visible lg:overflow-hidden">
             <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="mb-6">
                  <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-pink-500 shadow-lg shadow-pink-500/50" /> SETTING STATUS</h2>
                  <div className="flex items-end justify-between mb-2">
                    <p className="text-4xl font-[1000] italic tracking-tighter text-pink-600 leading-none">{progress}%</p>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">설정 완료율</p>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all duration-700 shadow-lg" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  {['대전 모드 선택', '미션 상세 설정', '데이터/명단 등록'].map((label, i) => {
                    const done = [step1Done, step2Done, step3Done][i];
                    return (
                      <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${done ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={`w-3 h-3 rounded-full ${done ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-slate-300'}`} />
                        <div className="flex-1">
                          <p className={`text-[11px] font-black uppercase tracking-widest ${done ? 'text-emerald-700' : 'text-slate-400'}`}>{label}</p>
                          <p className={`text-[9px] font-bold ${done ? 'text-emerald-500' : 'text-slate-300 italics'}`}>{done ? 'Ready' : 'Pending'}</p>
                        </div>
                        {done && <span className="text-emerald-500 font-black">✓</span>}
                      </div>
                    );
                  })}
                  <div className="mt-4 w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] p-4 text-left shadow-inner">
                    <h3 className="text-[10px] font-[1000] text-pink-600 uppercase tracking-[0.3em] mb-3 flex items-center gap-2 italic"><span className="w-1.5 h-3 bg-pink-500 rounded-sm" /> MISSION GUIDE</h3>
                    <p className="text-[11px] font-bold text-slate-600 leading-snug tracking-tighter">단어 빈칸에 맞는 풍선을 터뜨리는 인터랙티브 챌린지! 개인/팀 모드 설정 후 시작하세요.</p>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex gap-2 mb-3">
                     <button onClick={handleDownloadTemplate} className="flex-1 py-3 text-[10px] font-black text-yellow-900 bg-yellow-400 border border-yellow-500 rounded-xl hover:bg-yellow-500 shadow-md transition-all uppercase tracking-widest leading-none">Template 📥</button>
                     <button onClick={() => fileRef.current?.click()} className="flex-1 py-3 text-[10px] font-black text-white bg-slate-900 rounded-xl hover:bg-black shadow-lg transition-all uppercase tracking-widest leading-none">Excel Upload 📂</button>
                  </div>
                  <input type="file" ref={fileRef} className="hidden" accept=".xlsx,.xls" onChange={handleExcel} />
                  <button onClick={handleStart} disabled={!isReady} className={`w-full py-5 rounded-[2rem] font-[1000] text-xl transition-all shadow-2xl relative overflow-hidden group ${isReady ? 'bg-pink-600 text-white hover:scale-105 active:scale-95 shadow-pink-600/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                    <span className="relative z-10">START MISSION ▶</span>
                    {isReady && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />}
                  </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Camera Check Section ---
  if (gameState === 'camera-check') {
    return (
      <div className="w-full h-full bg-[#0B0E14] text-white font-sans flex flex-col p-8 overflow-hidden rounded-[3rem] animate-in fade-in duration-700">
        <video ref={videoRef} className="hidden" playsInline autoPlay />
        
        <div className="flex flex-col items-center mb-6">
           <h1 className="text-3xl font-[1000] text-cyan-400 italic tracking-tighter uppercase mb-2">Camera & Sensor Check</h1>
           <p className="text-sm font-bold text-white/40 uppercase tracking-widest">손가락 인식이 잘 되는지 확인해 주세요</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-8 min-h-0">
           <div className="relative w-full max-w-2xl aspect-[4/3] rounded-[2.5rem] overflow-hidden border-[6px] border-[#1C212E] shadow-2xl bg-black">
              {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xl">
                   <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
                   <p className="text-sm font-black italic tracking-widest uppercase">Connecting to Camera...</p>
                </div>
              )}
              <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />
           </div>

           <div className="flex gap-4">
              <button 
                onClick={() => { if(cameraRef.current) cameraRef.current.stop(); setGameState('setup'); }}
                className="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                Cancel
              </button>
              <button 
                onClick={startActualGame}
                disabled={isLoading || !isCameraReady}
                className={`px-16 py-5 rounded-2xl font-[1000] text-xl uppercase tracking-widest shadow-2xl transition-all
                  ${isCameraReady ? 'bg-cyan-500 text-white hover:scale-105 active:scale-95 shadow-cyan-500/30' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                Start Mission ▶
              </button>
           </div>
        </div>
      </div>
    );
  }

  // --- Playing Section ---
  if (gameState === 'playing') {
    const currentWord = activeQuestions[currentWordIdx]?.word || "";
    const currentMeaning = activeQuestions[currentWordIdx]?.meaning || "";
    const progressPercent = Math.round(((currentWordIdx + 1) / activeQuestions.length) * 100);

    return (
      <div className="w-full h-full bg-[#0B0E14] text-white font-sans flex flex-col p-6 overflow-hidden rounded-[3rem] animate-in fade-in duration-700">
         <video ref={videoRef} className="hidden" playsInline autoPlay />
         
         <div className="flex justify-between items-center mb-6 px-4">
            <div className="flex flex-col gap-1 min-w-[150px]">
               <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest opacity-60">Current Mission</p>
               <div className="bg-[#1C212E] border border-white/10 px-4 py-2 rounded-2xl flex items-baseline gap-2 shadow-2xl">
                  <span className="text-2xl font-[1000] italic text-white uppercase tracking-tighter">Stage {String(currentWordIdx + 1).padStart(2, '0')}</span>
                  <span className="text-xs font-black text-white/30">/ {activeQuestions.length}</span>
               </div>
            </div>

            <div className="text-center">
               <h1 className="text-2xl font-[1000] text-cyan-400 italic tracking-tighter uppercase leading-none mb-1">Alphabet Pop</h1>
               <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em] leading-none">Interactive Gesture Quiz</p>
            </div>

            <div className="flex flex-col gap-1 items-end min-w-[150px]">
               <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest opacity-60">Score</p>
               <div className="bg-[#1C212E] border border-white/10 px-6 py-2 rounded-2xl shadow-2xl">
                  <span className="text-3xl font-mono font-[1000] italic text-white tracking-widest">{String(currentTeamScoreRef.current).padStart(6, '0')}</span>
               </div>
            </div>
         </div>

         <div className="flex-1 flex items-center justify-center relative mb-8 min-h-0">
            <div className="relative w-full h-full max-w-[80vh] aspect-[4/3] rounded-[2.5rem] overflow-hidden border-[6px] border-[#1C212E] shadow-[0_0_80px_rgba(0,0,0,0.5)]">
               <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />
            </div>
         </div>

         <div className="bg-[#1C212E] border border-white/10 rounded-[2.5rem] p-5 flex items-center gap-8 shadow-2xl shrink-0">
            <div className="flex flex-col gap-1 shrink-0 px-6 border-r border-white/5 max-w-[200px]">
               <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest opacity-60">Word Hint</p>
               <p className="text-2xl font-black text-white truncate">{currentMeaning}</p>
            </div>

            <div className="flex-1 flex justify-center gap-2 overflow-x-auto custom-scrollbar-light py-2">
               {currentWord.split('').map((char, i) => (
                 <div key={i} className={`min-w-[50px] h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shrink-0
                  ${i === hiddenIdx 
                    ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_20px_rgba(79,209,197,0.3)] animate-pulse' 
                    : 'bg-[#0B0E14] border-white/10 opacity-70'}`}>
                    <span className={`text-3xl font-black ${i === hiddenIdx ? 'text-cyan-400' : 'text-white'}`}>
                       {i === hiddenIdx ? '?' : char}
                    </span>
                 </div>
               ))}
            </div>

            <div className="w-56 flex flex-col gap-2 px-6 border-l border-white/5">
                <div className="flex justify-between items-center px-1">
                   <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest opacity-60">Progress</p>
                   <p className="text-[10px] font-black text-white/40 italic">{progressPercent}%</p>
                </div>
                <div className="h-3 w-full bg-[#0B0E14] rounded-full overflow-hidden p-[2px]">
                   <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(79,209,197,0.5)]" style={{ width: `${progressPercent}%` }} />
                </div>
            </div>
         </div>

         <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.6em] text-center mt-6 animate-pulse">Place your hand in front of the camera to play</p>
      </div>
    );
  }

  // --- Ranking Section ---
  if (gameState === 'ranking') {
    const sorted = Object.entries(score).sort((a,b) => b[1] - a[1]);
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0E14]/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-500 font-sans">
         <div className="bg-white border-[12px] border-pink-500/10 rounded-[4rem] p-12 max-w-xl w-full text-center shadow-2xl relative animate-in zoom-in-95">
            <div className="w-24 h-24 bg-pink-500 rounded-3xl flex items-center justify-center text-5xl mb-8 mx-auto shadow-2xl text-white transform rotate-3">🏆</div>
            <h1 className="text-4xl font-[1000] text-slate-900 tracking-tighter uppercase italic leading-none mb-2">Final Ranking</h1>
            <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.4em] mb-10">Mission Accomplished</p>
            <div className="space-y-3 mb-10 text-left">
               {sorted.map(([name, s], idx) => (
                 <div key={idx} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${idx === 0 ? 'bg-pink-50 border-pink-100 scale-105 shadow-lg' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                    <div className="flex items-center gap-4">
                       <span className={`text-2xl font-black ${idx === 0 ? 'text-pink-500' : 'text-slate-300'}`}>#{idx + 1}</span>
                       <span className="text-xl font-[1000] text-slate-800 italic uppercase">{name}</span>
                    </div>
                    <span className="text-2xl font-black text-slate-900 tracking-widest">{String(s).padStart(6, '0')}</span>
                 </div>
               ))}
            </div>
            <button onClick={() => setGameState('setup')} className="w-full py-6 rounded-3xl bg-slate-900 text-white font-black text-2xl uppercase tracking-widest hover:scale-105 transition-all shadow-2xl">Return to Lobby</button>
         </div>
      </div>
    );
  }

  return null;
}
