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

interface FloatingFeedback {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
}

export default function BalloonGame() {
  const [gameState, setGameState] = useState<'setup' | 'camera-check' | 'playing' | 'round-result' | 'ranking' | 'done'>('setup');
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
  const [combo, setCombo] = useState(0);
  
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
  const wordAttemptsRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const comboRef = useRef(0);
  const feedbackRef = useRef<FloatingFeedback[]>([]);
  // Ref to always hold the latest gameState inside the game loop (prevents stale closures)
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

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

  const playSound = (type: 'pop' | 'correct' | 'wrong') => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
      }
    } catch (e) {}
  };

  const createExplosion = (x: number, y: number, color: string, count = 15) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        alpha: 1,
        color
      });
    }
  };

  // --- Lane-based spawn system: 4 lanes across the 640px canvas ---
  const LANE_COUNT = 4;
  const lastCharPerLane = useRef<string[]>(new Array(LANE_COUNT).fill(''));
  const laneLastSpawnTime = useRef<number[]>(new Array(LANE_COUNT).fill(0));

  const spawnBalloonInLane = useCallback((laneIdx: number, correctChar: string, time: number) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const laneWidth = 640 / LANE_COUNT;
    const radius = 36;
    const padding = 8;
    const laneCenter = laneIdx * laneWidth + laneWidth / 2;
    const x = laneCenter + (Math.random() - 0.5) * (laneWidth - radius * 2 - padding);

    // Don't spawn if lane already has a balloon near the top
    const nearTop = balloonsRef.current.some(b => {
      const inLane = Math.abs(b.x - laneCenter) < laneWidth / 2;
      return inLane && b.y < radius * 3;
    });
    if (nearTop) return;

    // Decide char: ~25% chance correct, but only 1 correct balloon per lane at a time
    const correctInLane = balloonsRef.current.filter(b => b.char === correctChar && Math.abs(b.x - laneCenter) < laneWidth / 2).length;
    const totalCorrect = balloonsRef.current.filter(b => b.char === correctChar).length;
    const wantCorrect = Math.random() > 0.75 && correctInLane === 0 && totalCorrect < 2;
    
    let char = wantCorrect ? correctChar : '';
    if (!char) {
      // Pick a random char different from: correctChar (unless wantCorrect) and the last char in this lane
      let tries = 0;
      do {
        char = alphabet[Math.floor(Math.random() * 26)];
        tries++;
      } while (
        (char === correctChar || char === lastCharPerLane.current[laneIdx]) &&
        tries < 20
      );
    }

    lastCharPerLane.current[laneIdx] = char;
    laneLastSpawnTime.current[laneIdx] = time;

    const colors = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6C5CE7', '#A8E6CF', '#FF8B94', '#C084FC', '#38BDF8'];
    
    balloonsRef.current.push({
      id: balloonIdCounter.current++,
      char,
      x,
      y: -radius - Math.random() * 30,
      r: radius,
      speed: 1.2 + Math.random() * 1.0 + (currentTeamScoreRef.current / 600),
      color: colors[laneIdx % colors.length],
      isCorrect: char === correctChar
    });
  }, []);

  const nextWord = useCallback(() => {
    wordAttemptsRef.current = 0;
    // Reset combo if word skipped or finished naturally? 
    // Usually combo is per mission streak.
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
    if (cameraRef.current) cameraRef.current.stop();
    setIsCameraReady(false);
    
    // Immediately clear all in-flight game objects to prevent bleed-through
    balloonsRef.current = [];
    particlesRef.current = [];
    feedbackRef.current = [];
    comboRef.current = 0;
    setCombo(0);
    wordAttemptsRef.current = 0;

    const currentTeam = teams[currentTeamIdx];
    setScore(prev => ({ ...prev, [currentTeam]: currentTeamScoreRef.current }));

    setGameState('round-result');
  };

  const prepareRound = (idx: number) => {
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, maxQuestions);
    setActiveQuestions(shuffled);
    setCurrentWordIdx(0);
    setHiddenIdx(Math.floor(Math.random() * shuffled[0].word.length));
    setCurrentTeamIdx(idx);
    currentTeamScoreRef.current = 0;
    wordAttemptsRef.current = 0;
    comboRef.current = 0;
    setCombo(0);
    setTimeLeft(initialTime);
    balloonsRef.current = [];
    particlesRef.current = [];
    feedbackRef.current = [];
    // Reset lane timers and last chars for clean fresh start
    laneLastSpawnTime.current = new Array(LANE_COUNT).fill(0);
    lastCharPerLane.current = new Array(LANE_COUNT).fill('');
    setGameState('playing');
  };

  // --- 2. MediaPipe & Camera ---
  const initMediaPipe = async () => {
    // Retry logic if refs are not yet available
    if (!videoRef.current || !canvasRef.current) {
      setTimeout(initMediaPipe, 100);
      return;
    }
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

    // 3.5 Floating Feedbacks
    for (let i = feedbackRef.current.length - 1; i >= 0; i--) {
       const f = feedbackRef.current[i];
       f.y -= 1.2; f.alpha -= 0.015;
       if (f.alpha <= 0) { feedbackRef.current.splice(i, 1); continue; }
       ctx.globalAlpha = f.alpha;
       ctx.fillStyle = f.color;
       ctx.font = 'bold 24px sans-serif';
       ctx.textAlign = 'center';
       ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(0,0,0,0.5)';
       ctx.fillText(f.text, f.x, f.y);
       ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1.0;

    // 4. Balloons - ONLY active during 'playing', never during camera-check
    const currentWord = activeQuestions[currentWordIdx]?.word || "";
    const correctChar = currentWord[hiddenIdx] || "";
    
    const finger = indexFingerRef.current;

    if (gameStateRef.current === 'playing') {
      // Spawn across 8 lanes with staggered intervals per lane
      const baseInterval = Math.max(600, 1400 - currentTeamScoreRef.current * 5);
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        // Each lane has a slightly different spawn interval for a natural staggered look
        const laneInterval = baseInterval + lane * 80;
        if (time - laneLastSpawnTime.current[lane] > laneInterval) {
          spawnBalloonInLane(lane, correctChar, time);
        }
      }

      for (let i = balloonsRef.current.length - 1; i >= 0; i--) {
        const b = balloonsRef.current[i];
        b.y += b.speed;
        
        // Collision
        if (finger.active) {
          const d = Math.sqrt((finger.x - b.x) ** 2 + (finger.y - b.y) ** 2);
          if (d < b.r + 5) {
            if (b.isCorrect) {
              createExplosion(b.x, b.y, '#10B981', 25);
              playSound('correct');
              
              const attemptText = ["1ST", "2ND", "3RD"][wordAttemptsRef.current] || "???";
              feedbackRef.current.push({ x: b.x, y: b.y, text: `${attemptText} CORRECT!`, color: '#34D399', alpha: 1.5 });

              const points = [5, 3, 1];
              const basePoints = points[wordAttemptsRef.current] || 0;
              const comboBonus = Math.floor(comboRef.current / 3);
              currentTeamScoreRef.current += basePoints + comboBonus;
              
              comboRef.current++;
              setCombo(comboRef.current);
              nextWord();
            } else {
              createExplosion(b.x, b.y, '#F43F5E', 15);
              playSound('wrong');

              const attemptText = ["1ST", "2ND", "3RD"][wordAttemptsRef.current] || "???";
              feedbackRef.current.push({ x: b.x, y: b.y, text: `${attemptText} WRONG`, color: '#FB7185', alpha: 1.5 });

              wordAttemptsRef.current++;
              comboRef.current = 0;
              setCombo(0);
              if (wordAttemptsRef.current >= 3) {
                nextWord();
              }
            }
            balloonsRef.current.splice(i, 1);
            continue;
          }
        }

        if (b.y > 530) { 
          if (b.isCorrect) {
            const attemptText = ["1ST", "2ND", "3RD"][wordAttemptsRef.current] || "???";
            feedbackRef.current.push({ x: b.x, y: 460, text: `MISSED ${attemptText}!`, color: '#94A3B8', alpha: 1.5 });

            wordAttemptsRef.current++;
            comboRef.current = 0;
            setCombo(0);
            if (wordAttemptsRef.current >= 3) {
              nextWord();
              balloonsRef.current.splice(i, 1);
              continue;
            }
          }
          balloonsRef.current.splice(i, 1); 
          continue; 
        }

        // Draw Balloon Body
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = b.isCorrect ? 'rgba(79, 209, 197, 0.4)' : 'rgba(255, 255, 255, 0.2)';
        
        ctx.fillStyle = 'white';
        ctx.beginPath(); 
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); 
        ctx.fill();
        
        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#0F172A'; 
        ctx.font = 'bold 32px sans-serif'; 
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle';
        ctx.fillText(b.char, b.x, b.y + 1);
        ctx.restore();
      }
    } // end if (gameState === 'playing')

    // 5. Camera Guide Brackets
    const margin = 30;
    const bracketLen = 40;
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
    ctx.lineWidth = 3;
    
    // Top Left
    ctx.beginPath();
    ctx.moveTo(margin, margin + bracketLen); ctx.lineTo(margin, margin); ctx.lineTo(margin + bracketLen, margin);
    ctx.stroke();
    // Top Right
    ctx.beginPath();
    ctx.moveTo(640 - margin - bracketLen, margin); ctx.lineTo(640 - margin, margin); ctx.lineTo(640 - margin, margin + bracketLen);
    ctx.stroke();
    // Bottom Left
    ctx.beginPath();
    ctx.moveTo(margin, 480 - margin - bracketLen); ctx.lineTo(margin, 480 - margin); ctx.lineTo(margin + bracketLen, 480 - margin);
    ctx.stroke();
    // Bottom Right
    ctx.beginPath();
    ctx.moveTo(640 - margin - bracketLen, 480 - margin); ctx.lineTo(640 - margin, 480 - margin); ctx.lineTo(640 - margin, 480 - margin - bracketLen);
    ctx.stroke();

    // 5. Finger Pointer UI
    if (finger.active) {
       // Outer Ring
       ctx.strokeStyle = '#4FD1C5'; 
       ctx.lineWidth = 2;
       ctx.beginPath(); ctx.arc(finger.x, finger.y, 22, 0, Math.PI * 2); ctx.stroke();
       
       // Inner Pulse
       ctx.fillStyle = 'rgba(79, 209, 197, 0.4)';
       ctx.beginPath(); ctx.arc(finger.x, finger.y, 8 + Math.sin(time/100)*4, 0, Math.PI * 2); ctx.fill();

       // Crosshair
       ctx.lineWidth = 1;
       ctx.beginPath();
       ctx.moveTo(finger.x - 30, finger.y); ctx.lineTo(finger.x + 30, finger.y);
       ctx.moveTo(finger.x, finger.y - 30); ctx.lineTo(finger.x, finger.y + 30);
       ctx.stroke();
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [activeQuestions, currentWordIdx, hiddenIdx, nextWord, spawnBalloonInLane]);

  useEffect(() => {
    if (gameState === 'camera-check') {
      // Stop any previous camera session cleanly before reinitializing
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handsRef.current) { handsRef.current.close(); handsRef.current = null; }
      if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
      indexFingerRef.current = { x: 0, y: 0, active: false };
      setIsCameraReady(false);
      initMediaPipe();
    }
  }, [gameState]);

  // Camera-check preview loop: ONLY draws feed + finger cursor, zero game logic
  useEffect(() => {
    if (gameState !== 'camera-check' || !isCameraReady) return;

    let animId: number;
    const cameraPreviewLoop = (time: number) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw mirrored video
      ctx.save();
      ctx.translate(640, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, 640, 480);
      ctx.restore();

      // Dark overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(0, 0, 640, 480);

      // LIVE indicator
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(25, 25, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
      ctx.fillText('SENSOR CHECK : INDEX_FINGER_TRACKING', 38, 28);

      // Camera guide brackets
      const margin = 30; const bracketLen = 40;
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(margin, margin + bracketLen); ctx.lineTo(margin, margin); ctx.lineTo(margin + bracketLen, margin); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(640-margin-bracketLen, margin); ctx.lineTo(640-margin, margin); ctx.lineTo(640-margin, margin+bracketLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(margin, 480-margin-bracketLen); ctx.lineTo(margin, 480-margin); ctx.lineTo(margin+bracketLen, 480-margin); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(640-margin-bracketLen, 480-margin); ctx.lineTo(640-margin, 480-margin); ctx.lineTo(640-margin, 480-margin-bracketLen); ctx.stroke();

      // Finger cursor only
      const finger = indexFingerRef.current;
      if (finger.active) {
        ctx.strokeStyle = '#4FD1C5'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(finger.x, finger.y, 22, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(79, 209, 197, 0.4)';
        ctx.beginPath(); ctx.arc(finger.x, finger.y, 8 + Math.sin(time/100)*4, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(finger.x - 30, finger.y); ctx.lineTo(finger.x + 30, finger.y);
        ctx.moveTo(finger.x, finger.y - 30); ctx.lineTo(finger.x, finger.y + 30);
        ctx.stroke();
      }

      animId = requestAnimationFrame(cameraPreviewLoop);
    };

    animId = requestAnimationFrame(cameraPreviewLoop);
    return () => { cancelAnimationFrame(animId); };
  }, [gameState, isCameraReady]);

  // Game loop: ONLY runs during 'playing'
  useEffect(() => {
    if (gameState !== 'playing' || !isCameraReady) return;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(gameLoop);
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
    
    setCurrentTeamIdx(0);
    setScore({});
    currentTeamScoreRef.current = 0;
    setIsCameraReady(false);
    setGameState('camera-check');
  };

  const startActualGame = () => {
    prepareRound(currentTeamIdx);
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
               <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm flex-1 min-h-0 flex flex-col transition-all duration-300 ${words.length >= maxQuestions ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[12px] font-[1000] text-pink-700 uppercase tracking-widest bg-pink-50 px-3 py-1 rounded-full">단어 데이터 관리</h3>
                    <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-black uppercase ${words.length >= maxQuestions ? 'text-emerald-500' : 'text-slate-300'}`}>{words.length} / {maxQuestions}</span>
                       <button onClick={() => setWords([])} className="text-[10px] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase">✕ 비우기</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-col gap-2 custom-scrollbar-light shadow-inner min-h-0">
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

               <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm flex-1 min-h-0 flex flex-col transition-all duration-300 ${teams.length >= (matchMode === 'team' ? 2 : 1) ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[12px] font-[1000] text-pink-700 uppercase tracking-widest bg-pink-50 px-3 py-1 rounded-full">참가 명단 등록</h3>
                    <button onClick={() => setTeams([])} className="text-[10px] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase">✕ 초기화</button>
                  </div>
                  <div className="flex gap-2 mb-4 shrink-0">
                    <input value={newTeam} onChange={e => setNewTeam(e.target.value)} 
                       onKeyDown={e => { 
                          if(e.key === 'Enter' && newTeam.trim()) { 
                             const name = newTeam.trim();
                             if (teams.includes(name)) {
                                alert("이미 등록된 이름입니다.");
                                return;
                             }
                             setTeams([...teams, name]); 
                             setNewTeam(''); 
                          } 
                       }}
                       placeholder={matchMode === "team" ? "팀 또는 분원명..." : "참여자 이름..."} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-pink-500 font-bold text-sm shadow-inner" />
                    <button onClick={() => { 
                       if(newTeam.trim()) { 
                          const name = newTeam.trim();
                          if (teams.includes(name)) {
                             alert("이미 등록된 이름입니다.");
                             return;
                          }
                          setTeams([...teams, name]); 
                          setNewTeam(''); 
                       } 
                    }} className="px-5 rounded-xl bg-pink-500 text-white font-black text-xl hover:scale-105 transition-all shadow-lg">+</button>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-wrap content-start gap-2 custom-scrollbar-light shadow-inner min-h-[160px]">
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
                onClick={() => { 
                  if(cameraRef.current) cameraRef.current.stop(); 
                  setIsCameraReady(false);
                  setGameState('setup'); 
                }}
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

  if (gameState === 'playing') {
    const currentWord = activeQuestions[currentWordIdx]?.word || "";
    const currentMeaning = activeQuestions[currentWordIdx]?.meaning || "";
    const fmtTime = (s: number) => {
      const m = Math.floor(s / 60);
      const res = s % 60;
      return `${m}:${res.toString().padStart(2, '0')}`;
    };

    return (
      <div className="w-full h-full bg-[#0B0E14] text-white font-sans flex flex-col p-4 overflow-hidden rounded-[2.5rem] animate-in fade-in duration-700">
         <video ref={videoRef} className="hidden" playsInline autoPlay />
         
         {/* Top Header */}
         <div className="flex bg-[#161B22] border border-white/5 rounded-3xl p-4 px-8 mb-4 items-center justify-between shadow-2xl">
            <div className="flex flex-col">
               <h1 className="text-2xl font-[1000] text-cyan-400 italic tracking-tighter uppercase leading-none">풍선 터뜨리기</h1>
               <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mt-1">Balloon Pop Mission</p>
            </div>

            <div className="flex gap-12">
               <div className="text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Stage Progress</p>
                  <p className="text-2xl font-[1000] italic text-white tracking-widest">{String(currentWordIdx + 1).padStart(2, '0')} <span className="text-white/20">/</span> {activeQuestions.length}</p>
               </div>
               <div className="text-center">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Remaining Time</p>
                  <p className="text-2xl font-[1000] italic text-white tracking-widest">{fmtTime(timeLeft)}</p>
               </div>
               <div className="text-center">
                  <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">Total Score</p>
                  <p className="text-2xl font-[1000] italic text-white tracking-widest">{currentTeamScoreRef.current} <span className="text-xs text-white/40 not-italic ml-1">점</span></p>
               </div>
            </div>
         </div>

         {/* Main Content Area */}
         <div className="flex-1 flex gap-4 min-h-0">
            {/* Right Column: Game Canvas (Occupies 6/7 proportionally) */}
            <div className="flex-[6] bg-[#0F172A] border-[8px] border-[#1C212E] rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.6)] relative">
               <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.5em] whitespace-nowrap animate-pulse">Index finger tracking active</p>
               </div>

               {/* Combo Overlay */}
               {combo > 1 && (
                 <div className="absolute top-10 right-10 animate-bounce pointer-events-none">
                    <p className="text-4xl font-[1000] italic text-yellow-400 tracking-tighter drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">COMBO X{combo}</p>
                 </div>
               )}
            </div>

            {/* Right Column: Player Info & Hint Cards (Expanded) */}
            <div className="flex-[4] flex flex-col gap-3 shrink-0">
               <div className="flex-1 bg-[#161B22] border border-white/5 rounded-[2rem] p-6 flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden group">
                  <div className="absolute top-4 left-0 w-full text-center">
                     <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] opacity-60">Active Player</p>
                  </div>
                  <h2 className="text-4xl font-[1000] italic text-white tracking-tight drop-shadow-md group-hover:scale-105 transition-transform">{teams[currentTeamIdx]}</h2>
               </div>

               <div className="flex-1 bg-[#161B22] border border-white/5 rounded-[2rem] p-6 flex flex-col justify-center items-center text-center shadow-lg relative">
                  <div className="absolute top-4 left-0 w-full text-center">
                     <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] opacity-60">Word Meaning</p>
                  </div>
                  <p className="text-3xl font-black text-white leading-tight whitespace-nowrap px-4 w-full overflow-hidden text-ellipsis">「 {currentMeaning} 」</p>
               </div>

               <div className="flex-1 bg-[#161B22] border border-white/5 rounded-[2rem] p-6 flex flex-col justify-center items-center text-center shadow-lg relative">
                  <div className="absolute top-4 left-0 w-full text-center">
                     <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] opacity-60">Target Word</p>
                  </div>
                  <div className="flex gap-1 flex-nowrap w-full justify-center overflow-hidden">
                     {currentWord.split('').map((char, i) => (
                       <div key={i} className={`flex-1 min-w-[30px] max-w-[60px] h-14 rounded-xl flex items-center justify-center border-2 transition-all duration-500
                        ${i === hiddenIdx 
                          ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_15px_rgba(79,209,197,0.3)]' 
                          : 'bg-[#0B0E14] border-white/10 opacity-70'}`}>
                          <span className={`${currentWord.length > 8 ? 'text-lg' : 'text-2xl'} font-black ${i === hiddenIdx ? 'text-cyan-400' : 'text-white'}`}>
                             {i === hiddenIdx ? '?' : char}
                          </span>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  }

  // --- Round Result Section ---
  if (gameState === 'round-result') {
    const currentTeam = teams[currentTeamIdx];
    const currentScore = score[currentTeam] || 0;
    const isLast = currentTeamIdx === teams.length - 1;

    return (
      <div className="fixed inset-0 z-50 bg-[#0B0E14]/90 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-500">
         <div className="bg-white border-[12px] border-cyan-500/10 rounded-[4rem] p-12 max-w-xl w-full text-center shadow-2xl relative animate-in zoom-in-95">
            <div className="w-24 h-24 bg-cyan-500 rounded-3xl flex items-center justify-center text-5xl mb-8 mx-auto shadow-2xl text-white transform -rotate-3">📊</div>
            <h2 className="text-xl font-black text-slate-400 uppercase tracking-[0.3em] mb-2 leading-none">Round Result</h2>
            <h1 className="text-5xl font-[1000] text-slate-900 tracking-tighter uppercase italic mb-8 overflow-hidden text-ellipsis whitespace-nowrap px-4">{currentTeam}</h1>
            
            <div className="bg-slate-50 rounded-3xl p-8 mb-10 border border-slate-100 shadow-inner">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-2 font-sans">Current Total Score</p>
               <p className="text-7xl font-[1000] text-cyan-500 italic tracking-tighter">{currentScore}<span className="text-xl not-italic ml-2 opacity-50 font-black">PTS</span></p>
            </div>

            <div className="flex flex-col gap-4">
               <button 
                 onClick={() => {
                   if (isLast) {
                     setGameState('ranking');
                   } else {
                     setCurrentTeamIdx(prev => prev + 1);
                     setGameState('camera-check');
                   }
                 }}
                 className="w-full py-6 rounded-3xl bg-pink-500 text-white font-black text-2xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-pink-500/30">
                 {isLast ? "View Final Ranking 🏆" : "Next Player Check →"}
               </button>
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">{isLast ? "All missions completed" : `Next: ${teams[currentTeamIdx+1]}`}</p>
            </div>
         </div>
      </div>
    );
  }

  // --- Ranking Section ---
  if (gameState === 'ranking') {
    const sorted = Object.entries(score).sort((a,b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3);
    const others = sorted.slice(3);
    // Pair others into rows of 2 for the 2-column grid
    const othersRows: [string, number][][] = [];
    for (let i = 0; i < others.length; i += 2) {
      othersRows.push(others.slice(i, i + 2) as [string, number][]);
    }

    return (
      <div className="fixed inset-0 z-50 bg-[#1a0d2e] flex items-stretch justify-center p-4 animate-in fade-in duration-700 font-sans">
         <div className="bg-white border-[8px] border-pink-300/60 rounded-[2.5rem] w-full max-w-2xl text-center shadow-2xl animate-in zoom-in-95 flex flex-col overflow-hidden">

            {/* Title — compact */}
            <div className="pt-5 pb-3 shrink-0">
               <h1 className="text-3xl font-[1000] text-slate-900 tracking-tighter uppercase italic leading-none border-b-4 border-pink-500 inline-block pb-0.5">RANKING</h1>
            </div>

            {/* Top 3 Podium — pushed down ~4cm total */}
            <div className="flex justify-center items-end gap-3 px-6 shrink-0 pb-4 mt-16">

               {/* 2nd Place */}
               {top3[1] ? (
                 <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom-6 duration-700 delay-100">
                    <div className="relative">
                       <div className="w-16 h-16 rounded-full bg-slate-100 border-[4px] border-slate-200 flex items-center justify-center text-3xl shadow-lg">🥈</div>
                       <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-slate-400 rounded-full text-[10px] flex items-center justify-center text-white font-black">2</div>
                    </div>
                    <div className="w-[175px] bg-white border border-slate-200 rounded-2xl py-5 px-4 shadow-md">
                       <p className="text-base font-[1000] text-slate-800 italic truncate">{top3[1][0]}</p>
                       <p className="text-3xl font-black text-sky-500 leading-tight">{top3[1][1]}</p>
                    </div>
                 </div>
               ) : <div className="w-[175px]" />}

               {/* 1st Place — center, largest */}
               {top3[0] && (
                 <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom-10 duration-700 -mt-5">
                    <div className="relative">
                       <div className="w-20 h-20 rounded-full bg-pink-100 border-[5px] border-pink-300 flex items-center justify-center text-4xl shadow-xl shadow-pink-200">🥇</div>
                       <div className="absolute -top-2 -right-2 w-7 h-7 bg-pink-500 rounded-full text-xs flex items-center justify-center text-white font-black shadow-md">1</div>
                    </div>
                    <div className="w-[200px] bg-pink-500 rounded-3xl py-6 px-5 shadow-2xl">
                       <p className="text-2xl font-[1000] text-white italic truncate">{top3[0][0]}</p>
                       <p className="text-4xl font-black text-white leading-tight">{top3[0][1]}</p>
                    </div>
                 </div>
               )}

               {/* 3rd Place */}
               {top3[2] ? (
                 <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom-6 duration-700 delay-200">
                    <div className="relative">
                       <div className="w-16 h-16 rounded-full bg-orange-50 border-[4px] border-orange-200 flex items-center justify-center text-3xl shadow-lg">🥉</div>
                       <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-orange-400 rounded-full text-[10px] flex items-center justify-center text-white font-black">3</div>
                    </div>
                    <div className="w-[175px] bg-orange-50 border border-orange-200 rounded-2xl py-5 px-4 shadow-md">
                       <p className="text-base font-[1000] text-slate-700 italic truncate">{top3[2][0]}</p>
                       <p className="text-3xl font-black text-orange-500 leading-tight">{top3[2][1]}</p>
                    </div>
                 </div>
               ) : <div className="w-[175px]" />}
            </div>

            {/* 4th+ List — auto-fit all players, icons 1.3x bigger */}
            {others.length > 0 && (() => {
              // Dynamically scale font/icon based on row count so all players fit
              const rowCount = othersRows.length;
              const iconSize = rowCount <= 4 ? 'w-[26px] h-[26px] text-xs' : rowCount <= 6 ? 'w-[24px] h-[24px] text-[10px]' : 'w-[22px] h-[22px] text-[9px]';
              const nameSize = rowCount <= 4 ? 'text-sm' : rowCount <= 6 ? 'text-xs' : 'text-[10px]';
              const scoreSize = rowCount <= 4 ? 'text-base' : rowCount <= 6 ? 'text-sm' : 'text-xs';
              return (
                <div className="shrink-0 max-w-[75%] mx-auto w-full flex flex-col mt-8">
                   {othersRows.map((row, rowIdx) => (
                     <div key={rowIdx} className="flex h-[45px]">
                        {row.map(([name, s], colIdx) => (
                          <div key={colIdx} className="flex-1 flex items-center justify-between px-3 bg-slate-50 border border-slate-100 overflow-hidden">
                             <div className="flex items-center gap-2 min-w-0">
                                <span className={`${iconSize} rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-500 shrink-0`}>
                                  {rowIdx * 2 + colIdx + 4}
                                </span>
                                <span className={`${nameSize} font-[1000] text-slate-700 italic truncate`}>{name}</span>
                             </div>
                             <span className={`${scoreSize} font-black text-pink-500 italic shrink-0 ml-2`}>{s}</span>
                          </div>
                        ))}
                        {row.length === 1 && <div className="flex-1 bg-slate-50 border border-slate-100" />}
                     </div>
                   ))}
                </div>
              );
            })()}

            {/* Dashboard Button — 3cm below last rank */}
            <div className="px-5 pb-5 mt-12 shrink-0">
               <button onClick={() => setGameState('setup')}
                 className="w-full py-4 rounded-[1.5rem] bg-slate-900 text-white font-[1000] text-xl hover:bg-black active:scale-95 transition-all shadow-xl">
                 대시보드
               </button>
            </div>
         </div>
      </div>
    );
  }

  return null;
}
