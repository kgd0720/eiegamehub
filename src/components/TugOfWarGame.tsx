import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import * as XLSX from 'xlsx';

interface Question {
  question: string;
  choices: string[];
  answer: number;
}

interface MatchResult {
  p1: string;
  p2: string;
  winner: string;
  roundName: string;
}

interface Point {
  x: number;
  y: number;
}

export default function TugOfWarGame() {
  const [gameState, setGameState] = useState<'setup' | 'bracket' | 'playing' | 'tournament_done'>('setup');
  
  // Game Setup Data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [matchQuestions, setMatchQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [initialTime, setInitialTime] = useState(60);
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [tournamentSize, setTournamentSize] = useState<4 | 8 | 16>(8);

  // Tournament Flow
  const [activePlayers, setActivePlayers] = useState<string[]>([]); 
  const [nextRoundQueue, setNextRoundQueue] = useState<string[]>([]); 
  const [roundName, setRoundName] = useState('');
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  
  // Hover & Animation State
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

  // Current Match Playing
  const [currentMatchP1, setCurrentMatchP1] = useState('');
  const [currentMatchP2, setCurrentMatchP2] = useState('');
  const [winner, setWinner] = useState<string | null>(null);
  const [tournamentSeed, setTournamentSeed] = useState<string[]>([]);

  // Geometric Precision State
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [coords, setCoords] = useState<Record<string, Point>>({});
  const [showChampionReveal, setShowChampionReveal] = useState(false);

  // Game Logic
  const [ropePos, setRopePos] = useState(0); 
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Combo, setP1Combo] = useState(0);
  const [p2Combo, setP2Combo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [p1Idx, setP1Idx] = useState(0);
  const [p2Idx, setP2Idx] = useState(0);
  
  const [p1Selected, setP1Selected] = useState<number | null>(null);
  const [p2Selected, setP2Selected] = useState<number | null>(null);
  const [p1Answering, setP1Answering] = useState(false);
  const [p2Answering, setP2Answering] = useState(false);

  // --- 봇 이름 표시 헬퍼 ---
  const fmtName = (name: string | undefined | null): string => {
    if (!name || typeof name !== 'string' || name === '미정' || name === '-') return name || '-';
    return name.startsWith('[COM]') ? name.replace('[COM]', '') : name;
  };

  // --- COORDINATE UPDATE LOGIC ---
  const updateCoords = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newCoords: Record<string, Point> = {};

    Object.entries(nodeRefs.current).forEach(([id, el]) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        newCoords[id] = {
           x: (rect.left - containerRect.left) + rect.width / 2,
           y: (rect.top - containerRect.top) + rect.height / 2
        };
      }
    });
    setCoords(newCoords);
  };

  useLayoutEffect(() => {
    if (gameState === 'bracket') {
      const timer = setTimeout(updateCoords, 150);
      window.addEventListener('resize', updateCoords);
      return () => {
         window.removeEventListener('resize', updateCoords);
         clearTimeout(timer);
      };
    }
  }, [gameState, activePlayers, tournamentSeed, matchResults, tournamentSize]);

  // --- AI BOT LOGIC ---
  useEffect(() => {
    if (gameState !== 'playing' || winner) return;

    const botLoop = (player: 1 | 2) => {
       const playerName = player === 1 ? currentMatchP1 : currentMatchP2;
       const answering = player === 1 ? p1Answering : p2Answering;
       const currentIdx = player === 1 ? p1Idx : p2Idx;

       if (playerName.startsWith('[COM]') && !answering && currentIdx < maxQuestions) {
          const delay = 2000 + Math.random() * 3000;
          return setTimeout(() => {
             const q = (matchQuestions.length > 0 ? matchQuestions : questions)[currentIdx % (matchQuestions.length > 0 ? matchQuestions.length : questions.length)];
             const accuracy = 0.5;
             let choiceIdx = q.answer;
             if (Math.random() > accuracy) {
                const wrongChoices = [0, 1, 2, 3].filter(i => i !== q.answer);
                choiceIdx = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
             }
             handleChoice(player, choiceIdx);
          }, delay);
       }
    };

    const t1 = botLoop(1);
    const t2 = botLoop(2);

    return () => {
       if (t1) clearTimeout(t1);
       if (t2) clearTimeout(t2);
    };
  }, [gameState, p1Answering, p2Answering, p1Idx, p2Idx, winner, currentMatchP1, currentMatchP2]);

  // --- EXCEL LOGIC ---
  const handleDownloadTemplate = () => {
     const wsData = [
        ["문제", "보기1", "보기2", "보기3", "보기4", "정답번호(1~4)"],
        ["최초의 인공위성 이름은?", "스푸트니크 1호", "익스플로러 1호", "보스토크 1호", "루나 1호", 1],
        ["세계에서 가장 높은 산은?", "K2", "에베레스트", "한라산", "백두산", 2],
        ["대한민국의 수도는?", "부산", "제주", "서울", "광주", 3],
     ];
     const wb = XLSX.utils.book_new();
     const ws = XLSX.utils.aoa_to_sheet(wsData);
     XLSX.utils.book_append_sheet(wb, ws, `Questions`);
     XLSX.writeFile(wb, "tug_of_war_template.xlsx");
  };

  const handleUploadExcel = (e: any) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        let list: Question[] = [];
        wb.SheetNames.forEach((sheetName) => {
           const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheetName], { header: 1 });
           rows.forEach((row, rIx) => {
              if (rIx === 0) return;
              if (row[0] && row[1]) {
                 list.push({ 
                    question: String(row[0]).trim(), 
                    choices: [String(row[1]||''), String(row[2]||''), String(row[3]||''), String(row[4]||'')], 
                    answer: (parseInt(String(row[5])) || 1) - 1 
                 });
              }
           });
        });
        if (list.length > 0) {
           list = list.sort(() => Math.random() - 0.5); 
           setQuestions(list);
           alert(`${list.length}개의 문제가 등록되었습니다!`);
        } else alert('문제를 찾을 수 없습니다.');
      } catch (err: any) { alert('오류: ' + err.message); }
      finally { e.target.value = ''; }
    };
    reader.readAsArrayBuffer(f);
  };

  const addPlayer = () => {
      const name = newPlayerName.trim();
      if(!name) return;
      if(players.includes(name)) return alert('이미 등록된 이름입니다.');
      if(players.length >= 16) return alert('최대 16명까지 가능합니다.');
      setPlayers([...players, name]);
      setNewPlayerName('');
  };

  const updateRoundName = (count: number) => {
     if(count <= 2) setRoundName('결승');
     else if(count <= 4) setRoundName('준결승');
     else if(count <= 8) setRoundName('8강');
     else setRoundName('16강');
  };

  const startTournament = () => {
      if(questions.length === 0) return alert('문제를 먼저 업로드해주세요.');
      
      let finalPlayers = [...players];
      const neededBots = tournamentSize - finalPlayers.length;
      
      if (neededBots > 0) {
        for(let i=1; i<=neededBots; i++) {
           finalPlayers.push(`[COM]COM${i}`);
        }
      } else if (finalPlayers.length > tournamentSize) {
         finalPlayers = finalPlayers.slice(0, tournamentSize);
      }

      const shuffled = [...finalPlayers].sort(() => Math.random() - 0.5);
      setTournamentSeed(shuffled);
      setActivePlayers(shuffled);
      setNextRoundQueue([]);
      setMatchResults([]);
      setShowChampionReveal(false);
      updateRoundName(shuffled.length);
      setGameState('bracket');
  };

   const handleNextMatch = () => {
      // Shuffle questions for this specific match
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      setMatchQuestions(shuffled);

      setCurrentMatchP1(activePlayers[0]);
      setCurrentMatchP2(activePlayers[1]);
      setRopePos(0); setP1Score(0); setP2Score(0); setP1Combo(0); setP2Combo(0);
      setTimeLeft(initialTime); setWinner(null);
      setP1Answering(false); setP2Answering(false); setP1Selected(null); setP2Selected(null);
      setP1Idx(0); setP2Idx(0);
      setGameState('playing');
   };

  const handleBye = () => {
      const byePlayer = activePlayers[0];
      setMatchResults(prev => [...prev, { p1: byePlayer, p2: '부전승(Bye)', winner: byePlayer, roundName }]);
      setNextRoundQueue(prev => [...prev, byePlayer]);
      setActivePlayers(prev => prev.slice(2)); 
  };

  const nextRoundAdvance = () => {
      setActivePlayers(nextRoundQueue);
      updateRoundName(nextRoundQueue.length);
      setNextRoundQueue([]);
  };

  useEffect(() => {
    let timer: any;
    if (gameState === 'playing') {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { finalizeMatch(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState]);

  const finalizeMatch = (earlyWinner?: string) => {
      if(winner) return;
      let finalW = earlyWinner;
      if (!finalW) {
         if (ropePos > 0) finalW = currentMatchP1; // P1 is Blue, on Right
         else if (ropePos < 0) finalW = currentMatchP2; // P2 is Red, on Left
         else if (p1Score > p2Score) finalW = currentMatchP1;
         else if (p2Score > p1Score) finalW = currentMatchP2;
         else finalW = Math.random() > 0.5 ? currentMatchP1 : currentMatchP2;
      }
      setWinner(finalW!);
      setMatchResults(prev => [...prev, { p1: currentMatchP1, p2: currentMatchP2, winner: finalW!, roundName }]);
      setNextRoundQueue(prev => [...prev, finalW!]);
      setActivePlayers(prev => prev.slice(2));
      setGameState('bracket');
  };

  const handleChoice = (player: 1 | 2, idx: number) => {
    if (gameState !== 'playing' || winner) return;
    if (player === 1 && (p1Answering || p1Idx >= maxQuestions)) return;
    if (player === 2 && (p2Answering || p2Idx >= maxQuestions)) return;

    const pool = matchQuestions.length > 0 ? matchQuestions : questions;
    const q = pool[(player === 1 ? p1Idx : p2Idx) % pool.length];
    const correct = q.answer === idx;

    if (player === 1) {
        setP1Selected(idx); setP1Answering(true);
        if (correct) { 
            setP1Score(prev => prev + 1); setP1Combo(c=>c+1);
        } else {
            setP1Combo(0);
        }
        moveRope(1, correct);
        setTimeout(() => { 
            setP1Selected(null); setP1Answering(false); 
            const nextIdx = p1Idx + 1;
            setP1Idx(nextIdx);
            const p2IsBot = currentMatchP2.startsWith('[COM]');
            if (nextIdx >= maxQuestions && p2IsBot) finalizeMatch();
            else if (nextIdx >= maxQuestions && p2Idx >= maxQuestions) finalizeMatch();
        }, 100);
    } else {
        setP2Selected(idx); setP2Answering(true);
        if (correct) { 
            setP2Score(prev => prev + 1); setP2Combo(c=>c+1);
        } else {
            setP2Combo(0);
        }
        moveRope(2, correct);
        setTimeout(() => { 
            setP2Selected(null); setP2Answering(false); 
            const nextIdx = p2Idx + 1;
            setP2Idx(nextIdx);
            const p1IsBot = currentMatchP1.startsWith('[COM]');
            if (nextIdx >= maxQuestions && p1IsBot) finalizeMatch();
            else if (nextIdx >= maxQuestions && p1Idx >= maxQuestions) finalizeMatch();
        }, 100);
    }
  };

  const moveRope = (player: 1 | 2, correct: boolean) => {
    const step = 5;
    const comboBonus = player === 1 ? Math.min(p1Combo, 5) : Math.min(p2Combo, 5);
    const amount = correct ? (step + comboBonus) : -step;
    setRopePos(prev => {
      // P1 (Blue) is on the Right side (+ direction)
      // P2 (Red) is on the Left side (- direction)
      const next = player === 1 ? prev + amount : prev - amount;
      const clamped = Math.max(-100, Math.min(100, next));
      if (clamped >= 100) finalizeMatch(currentMatchP1);
      if (clamped <= -100) finalizeMatch(currentMatchP2);
      return clamped;
    });
  };

  // --- GAME UI HELPERS ---
  const isMatchActive = (p1: string, p2: string) => {
    return (activePlayers[0] === p1 && activePlayers[1] === p2) || (activePlayers[0] === p2 && activePlayers[1] === p1);
  };

  const getWinnerByRoundMatch = (rName: string, matchIdx: number): string | null => {
    const roundMatches = matchResults.filter(m => m.roundName === rName);
    return roundMatches[matchIdx]?.winner ?? null;
  };

  const getRoundNames = (): string[] => {
    if (tournamentSize === 4) return ['준결승', '결승'];
    if (tournamentSize === 8) return ['8강', '준결승', '결승'];
    return ['16강', '8강', '준결승', '결승'];
  };
  const roundNames = getRoundNames();

  const roundIdxToName = (rIdx: number): string => roundNames[rIdx - 1] ?? '';

  const getWinnerForMatch = (roundIdx: number, matchIdx: number): string | null => {
    const rName = roundIdxToName(roundIdx);
    return getWinnerByRoundMatch(rName, matchIdx);
  };

  const resolveParticipant = (roundIdx: number, matchIdx: number, slotIdx: number): string => {
    if (roundIdx === 1) {
      return tournamentSeed[matchIdx * 2 + slotIdx] || '미정';
    }
    const prevMatchIdx = matchIdx * 2 + slotIdx;
    return getWinnerForMatch(roundIdx - 1, prevMatchIdx) || '미정';
  };

  const renderMatchNode = (id: string, p1: string, p2: string, roundIdx: number) => {
    const res = matchResults.find(m => (m.p1 === p1 && m.p2 === p2) || (m.p1 === p2 && m.p2 === p1));
    const isActive = isMatchActive(p1, p2);
    const isReady = p1 !== '미정' && p2 !== '미정';
    const isDone = !!res?.winner;
    const isHovered = hoveredTeam === p1 || hoveredTeam === p2;

    const getRoundColor = (idx: number) => {
      if (idx === 1) return 'bg-[#ef4444] border-rose-300';
      if (idx === 2) return 'bg-[#f59e0b] border-amber-200';
      if (idx === 3 && tournamentSize === 16) return 'bg-[#10b981] border-emerald-300';
      if (roundIdx === roundNames.length) return 'bg-[#3b82f6] border-blue-400';
      return 'bg-[#10b981] border-emerald-300';
    };

    const colorClass = getRoundColor(roundIdx);
    const opacityClass = (isReady || isDone) ? 'opacity-100' : 'opacity-40 grayscale-[0.8]';
    const ringClass = isActive ? 'ring-4 ring-orange-500 ring-offset-2 animate-pulse' : '';

    return (
      <div className={`relative flex flex-col items-center transition-all duration-500 ${isHovered ? 'scale-[1.05] z-30' : ''} ${opacityClass}`}>
        <div ref={el => nodeRefs.current[id] = el} className="absolute inset-0 pointer-events-none" />
        <div className={`flex flex-col items-center gap-1 min-w-[130px] p-1.5 rounded-xl border-2 ${colorClass} ${ringClass} shadow-xl`}>
          {/* P1 */}
          <div className={`w-full min-h-[30px] px-2 py-0.5 rounded-lg border transition-all flex items-center justify-center font-[1000] text-[10px] leading-tight text-center ${res?.winner === p1 ? 'bg-white/95 text-rose-600 shadow-sm border-white' : 'bg-black/10 text-white border-transparent'}`}>
            {fmtName(p1)}
          </div>
          {/* VS */}
          {!res?.winner ? <div className="text-[7px] font-black text-white/70 italic leading-none my-0.5">VS</div> : <div className="h-2" />}
          {/* P2 */}
          <div className={`w-full min-h-[30px] px-2 py-0.5 rounded-lg border transition-all flex items-center justify-center font-[1000] text-[10px] leading-tight text-center ${res?.winner === p2 ? 'bg-white/95 text-rose-600 shadow-sm border-white' : 'bg-black/10 text-white border-transparent'}`}>
            {fmtName(p2)}
          </div>
          {isDone && <div className="absolute -top-2 -right-2 bg-white text-[8px] px-1.5 py-0.5 rounded-full border border-slate-200 font-black text-emerald-600 shadow-sm z-20">확정</div>}
        </div>
      </div>
    );
  };

  const renderSVGPath = (fromId: string, toId: string, color = "#94a3b8", side: 'left' | 'right' | 'center' = 'center') => {
    const start = coords[fromId];
    const end = coords[toId];
    if (!start || !end) return null;

    let midX;
    if (side === 'left') {
      midX = start.x + (end.x - start.x) * 0.5;
      return (
        <path key={`${fromId}-${toId}`} d={`M ${start.x} ${start.y} H ${midX} V ${end.y} H ${end.x}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="transition-all duration-700" />
      );
    } else if (side === 'right') {
      midX = start.x - (start.x - end.x) * 0.5;
      return (
        <path key={`${fromId}-${toId}`} d={`M ${start.x} ${start.y} H ${midX} V ${end.y} H ${end.x}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="transition-all duration-700" />
      );
    }

    const midY = start.y + (end.y - start.y) * 0.5;
    return (
      <path key={`${fromId}-${toId}`} d={`M ${start.x} ${start.y} V ${midY} H ${end.x} V ${end.y}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="transition-all duration-700" />
    );
  };

  const finalWinner = matchResults.find(m => m.roundName === '결승')?.winner ?? null;

  // --- RENDER BRANCHES ---
  if (gameState === 'setup') {
    const isReady = questions.length > 0;
    return (
      <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1 bg-white/50 rounded-[3rem] shadow-inner overflow-hidden">
        <div className="flex items-center justify-between mb-2 bg-white border border-slate-200 rounded-2xl px-6 py-2 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-2xl shadow-lg text-white">🪘</div>
            <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 border-l-4 border-orange-500 pl-3 leading-none">줄다리기 토너먼트 설정</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch flex-1 overflow-y-auto lg:overflow-hidden pb-10 lg:pb-0 min-h-0 px-2 mt-2">
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-3 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[300px] shrink-0">
              <div className="col-span-1 lg:col-span-7 flex flex-col gap-3 h-full">
                <div className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm flex items-center gap-8">
                  <label className="text-[14px] font-[1000] text-orange-800 uppercase tracking-widest shrink-0">토너먼트 규모</label>
                  <div className="flex-1 flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    {[4, 8, 16].map(s => (
                      <button key={s} onClick={() => setTournamentSize(s as any)} className={`flex-1 py-5 rounded-xl font-[1000] text-base transition-all ${tournamentSize === s ? 'bg-orange-500 text-white shadow-md' : 'text-slate-300'}`}>{s}강</button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm flex items-center gap-8">
                  <label className="text-[14px] font-[1000] text-orange-800 uppercase tracking-widest mb-1 shrink-0">문항 수</label>
                  <div className="flex-1 flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-2">
                    <button onClick={() => setMaxQuestions(Math.max(2, maxQuestions - 1))} className="w-12 h-12 rounded-lg bg-white border border-slate-200 font-black">－</button>
                    <span className="flex-1 text-center text-4xl font-[1000] text-orange-500">{maxQuestions}</span>
                    <button onClick={() => setMaxQuestions(Math.min(30, maxQuestions + 1))} className="w-12 h-12 rounded-lg bg-white border border-slate-200 font-black">＋</button>
                  </div>
                </div>
              </div>
              <div className="col-span-1 lg:col-span-5 bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm flex flex-col justify-center text-center">
                <label className="text-[11px] font-[1000] text-orange-800 uppercase tracking-widest mb-3">제한 시간</label>
                <div className="grid grid-cols-2 gap-2 flex-1">
                  {[30, 60, 90, 120, 150, 180].map(t => (
                    <button key={t} onClick={() => setInitialTime(t)} className={`rounded-2xl text-xl font-[1000] border-2 ${initialTime === t ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-50 text-slate-200'}`}>{t}s</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-[1000] text-slate-900 border-l-4 border-orange-500 pl-4">참가자 명단 ({players.length}/{tournamentSize})</h2>
              </div>
              <div className="flex gap-2 mb-4">
                <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPlayer()} placeholder="이름 입력..." className="flex-1 bg-slate-50 border rounded-xl px-5 py-2.5 font-black text-lg shadow-inner" />
                <button onClick={addPlayer} className="px-8 rounded-xl bg-orange-500 text-white font-black text-xl">+</button>
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-50 rounded-2xl p-4 flex flex-wrap content-start gap-2 shadow-inner">
                {players.map((t, i) => (
                  <div key={i} className="h-9 rounded-xl border-2 bg-white border-slate-200 px-4 flex items-center gap-3 font-black text-sm">
                    <span className="text-orange-500/40 italic">#P{i + 1}</span> {t}
                    <button onClick={() => setPlayers(players.filter(p => p !== t))} className="text-orange-300 hover:text-orange-500 text-xl ml-1">✕</button>
                  </div>
                ))}
                {players.length < tournamentSize && (
                  <div className="h-9 rounded-xl border-2 border-dashed bg-slate-100/50 border-slate-300 px-4 flex items-center font-black text-xs text-slate-400 italic">
                    + {tournamentSize - players.length} Bots will be filled
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-span-1 lg:col-span-4 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col items-center text-center">
            <button onClick={handleDownloadTemplate} className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg mb-6">📥 엑셀 양식</button>
            <div className="w-24 h-24 bg-orange-500 rounded-2xl flex items-center justify-center text-4xl shadow-xl text-white mb-6">🏆</div>
            <h2 className={`text-4xl font-[1000] italic transition-colors mb-6 ${isReady ? 'text-orange-500' : 'text-slate-200'}`}>{isReady ? '준비완료' : '준비중'}</h2>
            <div className="w-full bg-slate-50 rounded-2xl p-6 space-y-3 mb-6 font-black text-left">
              <div className="flex justify-between border-b border-slate-200 pb-2"><span>규모</span><span className="text-orange-600">{tournamentSize}강</span></div>
              <div className="flex justify-between border-b border-slate-200 pb-2"><span>문항</span><span className="font-black">{maxQuestions} Q</span></div>
              <div className="flex justify-between"><span>등록</span><span className="text-slate-500">{players.length} / {tournamentSize}</span></div>
            </div>
            <label className="w-full py-5 bg-slate-800 text-white rounded-3xl text-lg font-black uppercase mb-4 cursor-pointer hover:bg-orange-600 transition-all flex items-center justify-center gap-3">📂 엑셀 업로드 <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleUploadExcel} /></label>
            {isReady ? <button onClick={startTournament} className="w-full py-5 bg-orange-500 text-white rounded-3xl text-xl font-black shadow-xl hover:scale-105 transition-all">토너먼트 시작</button> : <div className="w-full py-5 bg-slate-100 text-slate-400 rounded-3xl text-sm font-black italic">문제를 등록해주세요</div>}
          </div>
        </div>
      </div>
    );
  }

  const isRoundDone = activePlayers.length === 0;

  if (gameState !== 'playing') {
    return (
      <div ref={containerRef} className="w-full h-full flex flex-col items-center bg-[#f8fafc] rounded-[3rem] p-6 relative overflow-hidden animate-in fade-in duration-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_100%)] pointer-events-none" />
        
        {/* ============ OVERLAY SVG (CONNECTIONS) ============ */}
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
          {Object.entries(coords).length > 0 && (
            <>
              {tournamentSize === 16 && (
                <>
                  {[0,1,2,3].map(i => renderSVGPath(`M1-${i}`, `M2-${Math.floor(i/2)}`, (getWinnerForMatch(1,i) && getWinnerForMatch(2,Math.floor(i/2))===getWinnerForMatch(1,i))?'#ef4444':'#cbd5e1', 'left'))}
                  {[0,1].map(i => renderSVGPath(`M2-${i}`, `M3-0`, (getWinnerForMatch(2,i) && getWinnerForMatch(3,0)===getWinnerForMatch(2,i))?'#ef4444':'#cbd5e1', 'left'))}
                  {renderSVGPath('M3-0', 'M4-0', (getWinnerForMatch(3,0) && getWinnerForMatch(4,0)===getWinnerForMatch(3,0))?'#ef4444':'#cbd5e1', 'left')}
                  
                  {[4,5,6,7].map(i => renderSVGPath(`M1-${i}`, `M2-${2+Math.floor((i-4)/2)}`, (getWinnerForMatch(1,i) && getWinnerForMatch(2,2+Math.floor((i-4)/2))===getWinnerForMatch(1,i))?'#ef4444':'#cbd5e1', 'right'))}
                  {[2,3].map(i => renderSVGPath(`M2-${i}`, `M3-1`, (getWinnerForMatch(2,i) && getWinnerForMatch(3,1)===getWinnerForMatch(2,i))?'#ef4444':'#cbd5e1', 'right'))}
                  {renderSVGPath('M3-1', 'M4-0', (getWinnerForMatch(3,1) && getWinnerForMatch(4,0)===getWinnerForMatch(3,1))?'#ef4444':'#cbd5e1', 'right')}
                  
                  {renderSVGPath('M4-0', 'CHAMPION', (getWinnerForMatch(4,0) && finalWinner===getWinnerForMatch(4,0))?'#ef4444':'#cbd5e1')}
                </>
              )}
              {tournamentSize === 8 && (
                <>
                  {[0,1].map(i => renderSVGPath(`M1-${i}`, `M2-0`, (getWinnerForMatch(1,i) && getWinnerForMatch(2,0)===getWinnerForMatch(1,i))?'#ef4444':'#cbd5e1', 'left'))}
                  {renderSVGPath('M2-0', 'M3-0', (getWinnerForMatch(2,0) && getWinnerForMatch(3,0)===getWinnerForMatch(2,0))?'#ef4444':'#cbd5e1', 'left')}
                  
                  {[2,3].map(i => renderSVGPath(`M1-${i}`, `M2-1`, (getWinnerForMatch(1,i) && getWinnerForMatch(2,1)===getWinnerForMatch(1,i))?'#ef4444':'#cbd5e1', 'right'))}
                  {renderSVGPath('M2-1', 'M3-0', (getWinnerForMatch(2,1) && getWinnerForMatch(3,0)===getWinnerForMatch(2,1))?'#ef4444':'#cbd5e1', 'right')}
                  
                  {renderSVGPath('M3-0', 'CHAMPION', (getWinnerForMatch(3,0) && finalWinner===getWinnerForMatch(3,0))?'#ef4444':'#cbd5e1')}
                </>
              )}
              {tournamentSize === 4 && (
                <>
                  {renderSVGPath('M1-0', 'M2-0', (getWinnerForMatch(1,0) && getWinnerForMatch(2,0)===getWinnerForMatch(1,0))?'#ef4444':'#cbd5e1', 'left')}
                  {renderSVGPath('M1-1', 'M2-0', (getWinnerForMatch(1,1) && getWinnerForMatch(2,0)===getWinnerForMatch(1,1))?'#ef4444':'#cbd5e1', 'right')}
                  {renderSVGPath('M2-0', 'CHAMPION', (getWinnerForMatch(2,0) && finalWinner===getWinnerForMatch(2,0))?'#ef4444':'#cbd5e1')}
                </>
              )}
            </>
          )}
        </svg>

        {/* ============ HEADER ============ */}
        <div className="flex flex-col items-center mb-8 relative z-20">
           <h2 className="text-[12px] font-black tracking-[0.6em] text-slate-400 uppercase mb-1">Tug of War Tournament</h2>
           <h1 className="text-4xl font-[1000] italic text-slate-800 tracking-tighter uppercase">{roundName} 진행중</h1>
        </div>

        {/* ============ CONTROL PANEL ============ */}
        <div className="absolute top-6 right-6 z-50">
          {!isRoundDone ? (
            <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-4 flex flex-col items-center gap-3 min-w-[300px] animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between w-full px-2 border-b border-slate-100 pb-3">
                 <span className="text-sm font-black text-rose-500 truncate max-w-[100px]">{fmtName(activePlayers[0])}</span>
                 <div className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-full italic">VS</div>
                 <span className="text-sm font-black text-blue-500 truncate max-w-[100px]">{fmtName(activePlayers[1] || '부전승')}</span>
              </div>
              <button onClick={activePlayers[1] ? handleNextMatch : handleBye} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-lg hover:scale-[1.03] transition-all shadow-lg hover:shadow-orange-200">대전 시작 →</button>
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-xl border border-emerald-200 rounded-3xl shadow-2xl p-4 flex flex-col items-center gap-3 min-w-[280px]">
               <div className="text-emerald-600 text-[10px] font-black uppercase tracking-widest border-b border-emerald-50 w-full text-center pb-2">라운드 결과 확정</div>
               <div className="flex flex-col gap-1.5 w-full max-h-[120px] overflow-hideen">
                  {nextRoundQueue.slice(-3).map((n,i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg text-xs font-bold text-emerald-700">🏆 {fmtName(n)}</div>
                  ))}
               </div>
               {nextRoundQueue.length === 1 ? (
                 <button onClick={() => setShowChampionReveal(true)} className="w-full py-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-2xl font-black text-lg shadow-xl animate-bounce">최종 결과 발표 🎊</button>
               ) : (
                 <button onClick={nextRoundAdvance} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-lg">다음 라운드 진입 →</button>
               )}
            </div>
          )}
        </div>

        {/* ============ SYMMETRIC BRACKET CONTENT ============ */}
        <div className="flex-1 w-full flex items-center justify-center relative z-10 px-2 overflow-hidden">
          <div className="flex items-center justify-center gap-[0.5vw] w-full max-w-full h-full pt-10 px-1">
            
            {/* LEFT SIDE: RO16 -> QF -> SF */}
            <div className="flex items-center gap-[1.2vw]">
               {tournamentSize === 16 && (
                 <div className="flex flex-col justify-around h-[500px] gap-2">
                    {[0,1,2,3].map(i => renderMatchNode(`M1-${i}`, resolveParticipant(1,i,0), resolveParticipant(1,i,1), 1))}
                 </div>
               )}
               {tournamentSize >= 8 && (
                 <div className="flex flex-col justify-around h-[540px] gap-2">
                    {tournamentSize===16 ? [0,1].map(i => renderMatchNode(`M2-${i}`, resolveParticipant(2,i,0), resolveParticipant(2,i,1), 2))
                    : [0,1].map(i => renderMatchNode(`M1-${i}`, resolveParticipant(1,i,0), resolveParticipant(1,i,1), 1))}
                 </div>
               )}
               <div className="flex flex-col justify-around h-[580px] gap-2">
                  {tournamentSize === 16 ? renderMatchNode('M3-0', resolveParticipant(3,0,0), resolveParticipant(3,0,1), 3)
                  : tournamentSize === 8 ? renderMatchNode('M2-0', resolveParticipant(2,0,0), resolveParticipant(2,0,1), 2)
                  : renderMatchNode('M1-0', resolveParticipant(1,0,0), resolveParticipant(1,0,1), 1)}
               </div>
            </div>

            {/* CENTER: FINAL & CHAMPION */}
            <div className="flex flex-col items-center gap-16 pt-20">
               {/* GRAND FINAL NODE */}
               <div className="relative group">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-[1000] text-blue-500 uppercase tracking-[0.4em] whitespace-nowrap">Grand Final</div>
                  {tournamentSize === 16 ? renderMatchNode('M4-0', resolveParticipant(4,0,0), resolveParticipant(4,0,1), 4)
                  : tournamentSize === 8 ? renderMatchNode('M3-0', resolveParticipant(3,0,0), resolveParticipant(3,0,1), 3)
                  : renderMatchNode('M2-0', resolveParticipant(2,0,0), resolveParticipant(2,0,1), 2)}
               </div>

               {/* CHAMPION BOX */}
               <div className="relative">
                  <div ref={el => nodeRefs.current["CHAMPION"] = el} className="w-56 h-[160px] bg-gradient-to-br from-[#fcd34d] via-[#fbbf24] to-[#d97706] rounded-[2.5rem] border-[6px] border-[#fde68a] shadow-[0_25px_60px_-10px_rgba(251,191,36,0.6)] flex items-center justify-center p-2 transition-all hover:scale-110 active:scale-95 z-20">
                    <div className="w-full h-full bg-white/10 rounded-[2rem] flex flex-col items-center justify-center border border-white/20">
                       <span className="text-6xl filter drop-shadow-lg mb-2">💎</span>
                       <span className="text-[18px] font-[1000] text-[#78350f] italic uppercase tracking-tighter">THE LEGEND</span>
                    </div>
                  </div>
                  {showChampionReveal && winner && (
                    <div className="absolute top-[180px] left-1/2 -translate-x-1/2 w-max text-center animate-in fade-in zoom-in slide-in-from-top-8 duration-1000">
                       <h3 className="text-4xl font-[1000] text-amber-600 italic tracking-tighter filter drop-shadow-md mb-2">{fmtName(winner)}</h3>
                       <div className="px-8 py-2 bg-slate-900 text-white rounded-full text-sm font-black tracking-widest uppercase">Tournament Champion</div>
                    </div>
                  )}
               </div>
            </div>

            {/* RIGHT SIDE: RO16 -> QF -> SF (Symmetric) */}
            <div className="flex items-center gap-[1.2vw]">
               <div className="flex flex-col justify-around h-[580px] gap-2">
                  {tournamentSize === 16 ? renderMatchNode('M3-1', resolveParticipant(3,1,0), resolveParticipant(3,1,1), 3)
                  : tournamentSize === 8 ? renderMatchNode('M2-1', resolveParticipant(2,1,0), resolveParticipant(2,1,1), 2)
                  : renderMatchNode('M1-1', resolveParticipant(1,1,0), resolveParticipant(1,1,1), 1)}
               </div>
               {tournamentSize >= 8 && (
                 <div className="flex flex-col justify-around h-[540px] gap-2">
                    {tournamentSize===16 ? [2,3].map(i => renderMatchNode(`M2-${i}`, resolveParticipant(2,i,0), resolveParticipant(2,i,1), 2))
                    : [2,3].map(i => renderMatchNode(`M1-${i}`, resolveParticipant(1,i,0), resolveParticipant(1,i,1), 1))}
                 </div>
               )}
               {tournamentSize === 16 && (
                 <div className="flex flex-col justify-around h-[500px] gap-2">
                    {[4,5,6,7].map(i => renderMatchNode(`M1-${i}`, resolveParticipant(1,i,0), resolveParticipant(1,i,1), 1))}
                 </div>
               )}
            </div>

          </div>
        </div>
      </div>
    );
  }

  // --- PLAYING STATE RENDER ---
  const q1 = questions[p1Idx % questions.length];
  const q2 = questions[p2Idx % questions.length];

  return (
    <div className="h-full flex flex-col font-sans p-4 bg-[#e2e8f0] rounded-[3.5rem] shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-black/5 opacity-10" />
      <div className="flex flex-col items-center gap-2 mb-6 relative z-20">
        <div className="bg-amber-400 px-16 py-3 rounded-2xl border-b-4 border-amber-600 shadow-xl">
          <h1 className="text-4xl font-[1000] text-white italic uppercase tracking-tighter">줄다리기</h1>
        </div>
        <div className="bg-slate-900 border-4 border-white px-8 py-2 rounded-2xl shadow-2xl">
          <span className={`text-4xl font-mono font-[1000] ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </span>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-[1.03fr_1.04fr_1.03fr] gap-6 min-h-0 relative z-10 px-4">
        {/* P2 Section (RED - LEFT) */}
        <div className="bg-[#ef4444] rounded-[3rem] border-8 border-white p-8 flex flex-col shadow-2xl relative h-full">
          <div className="flex flex-col items-center mb-4">
            <div className="flex items-center gap-4 mb-2">
              <span className="inline-block px-8 py-2.5 bg-rose-900/40 text-white rounded-full text-base font-black uppercase">{fmtName(activePlayers[1] || '부전승')}</span>
              <div className="text-3xl font-[1000] text-white italic drop-shadow-sm tracking-tighter shrink-0">SCORE: {p2Score}</div>
            </div>
            <div className="flex gap-3 w-full px-2">
              <span className="flex-1 text-center text-white text-[13px] font-bold bg-emerald-600/60 py-2 rounded-full border border-white/30 shadow-sm">정답: {p2Score}</span>
              <span className="flex-1 text-center text-white text-[13px] font-bold bg-rose-600/60 py-2 rounded-full border border-white/30 shadow-sm">오답: {p2Idx - p2Score}</span>
              <span className="flex-1 text-center text-white text-[13px] font-bold bg-white/10 py-2 rounded-full border border-white/20 shadow-sm">전체: {maxQuestions}</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-start gap-5 min-h-0 pt-2">
            <div className="w-full bg-white rounded-[2.5rem] p-8 flex items-center justify-center text-center flex-1 min-h-[160px] shadow-inner overflow-hidden">
                <h3 className={`font-[1000] text-slate-800 leading-tight break-words text-center line-clamp-3 ${ 
                  ((matchQuestions[p2Idx] || questions[p2Idx])?.question?.length || 0) > 70 ? 'text-xl' : 
                  ((matchQuestions[p2Idx] || questions[p2Idx])?.question?.length || 0) > 50 ? 'text-2xl' : 
                  ((matchQuestions[p2Idx] || questions[p2Idx])?.question?.length || 0) > 30 ? 'text-3xl' : 'text-4xl'}`}> {(matchQuestions[p2Idx] || questions[p2Idx])?.question} </h3>
            </div>
            <div className="w-full grid grid-cols-2 grid-rows-2 gap-4 pb-2">
              {(matchQuestions[p2Idx] || questions[p2Idx])?.choices.map((c, i) => {
                const fontSize = c.length > 30 ? 'text-[10px]' : c.length > 20 ? 'text-xs' : c.length > 15 ? 'text-sm' : c.length > 10 ? 'text-base' : 'text-lg';
                return (
                  <button key={i} onClick={() => handleChoice(2, i)} disabled={p2Answering} className={`h-[80px] rounded-[1.5rem] border-4 border-white font-[1000] text-white transition-all ${fontSize} px-2 flex items-center justify-center text-center leading-tight break-words ${p2Answering ? (i===q2.answer ? 'bg-emerald-500 scale-105' : p2Selected===i?'bg-rose-500':'bg-slate-400/20') : 'bg-orange-500 hover:brightness-110 active:scale-95'} ${p2Selected===i?'ring-4 ring-white':''}`}>
                    <span className="w-full line-clamp-3">{c}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rope Section */}
        <div className="flex flex-col relative overflow-hidden bg-transparent">
          <div className="flex-1 relative flex items-center justify-center pt-20">
            {/* The combined image moves left/right based on ropePos */}
            <div 
              className="relative transition-transform duration-300 ease-out flex items-center justify-center w-full"
              style={{ transform: `translateX(${ropePos * 2.5}px)` }}
            >
              <img 
                src="/assets/games/tug-of-war.png" 
                className="max-h-[1420px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)] mix-blend-multiply"
                alt="Tug of War"
              />
            </div>
          </div>
          <div className="flex justify-between px-16 pb-12">
            <div className={`transition-all duration-300 ${p2Combo > 1 ? 'scale-110 opacity-100' : 'opacity-0'}`}><span className="text-blue-600 font-[1000] italic text-2xl">{p2Combo} COMBO!</span></div>
            <div className={`transition-all duration-300 ${p1Combo > 1 ? 'scale-110 opacity-100' : 'opacity-0'}`}><span className="text-rose-600 font-[1000] italic text-2xl">{p1Combo} COMBO!</span></div>
          </div>
        </div>

        {/* P1 Section (BLUE - RIGHT) */}
        <div className="bg-[#3b82f6] rounded-[3rem] border-8 border-white p-8 flex flex-col shadow-2xl relative h-full">
          <div className="flex flex-col items-center mb-4">
            <div className="flex items-center gap-4 mb-2">
              <span className="inline-block px-8 py-2.5 bg-blue-900/40 text-white rounded-full text-base font-black uppercase">{fmtName(currentMatchP1)}</span>
              <div className="text-3xl font-[1000] text-white italic drop-shadow-sm tracking-tighter shrink-0">SCORE: {p1Score}</div>
            </div>
            <div className="flex gap-3 w-full px-2">
              <span className="flex-1 text-center text-white text-[13px] font-bold bg-emerald-600/60 py-2 rounded-full border border-white/30 shadow-sm">정답: {p1Score}</span>
              <span className="flex-1 text-center text-white text-[13px] font-bold bg-rose-600/60 py-2 rounded-full border border-white/30 shadow-sm">오답: {p1Idx - p1Score}</span>
              <span className="flex-1 text-center text-white text-[13px] font-bold bg-white/10 py-2 rounded-full border border-white/20 shadow-sm">전체: {maxQuestions}</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-start gap-5 min-h-0 pt-2">
            <div className="w-full bg-white rounded-[2.5rem] p-8 flex items-center justify-center text-center flex-1 min-h-[160px] shadow-inner overflow-hidden">
              <h3 className={`font-[1000] text-slate-800 leading-tight break-words text-center line-clamp-3 ${ 
                ((matchQuestions[p1Idx] || questions[p1Idx])?.question?.length || 0) > 70 ? 'text-xl' : 
                ((matchQuestions[p1Idx] || questions[p1Idx])?.question?.length || 0) > 50 ? 'text-2xl' : 
                ((matchQuestions[p1Idx] || questions[p1Idx])?.question?.length || 0) > 30 ? 'text-3xl' : 'text-4xl'}`}> {(matchQuestions[p1Idx] || questions[p1Idx])?.question} </h3>
            </div>
            <div className="w-full grid grid-cols-2 grid-rows-2 gap-4 pb-2">
              {(matchQuestions[p1Idx] || questions[p1Idx])?.choices.map((c, i) => {
                const fontSize = c.length > 30 ? 'text-[10px]' : c.length > 20 ? 'text-xs' : c.length > 15 ? 'text-sm' : c.length > 10 ? 'text-base' : 'text-lg';
                return (
                  <button key={i} onClick={() => handleChoice(1, i)} disabled={p1Answering} className={`h-[80px] rounded-[1.5rem] border-4 border-white font-[1000] text-white transition-all ${fontSize} px-2 flex items-center justify-center text-center leading-tight break-words ${p1Answering ? (i===q1.answer ? 'bg-emerald-500 scale-105' : p1Selected===i?'bg-rose-500':'bg-slate-400/20') : 'bg-orange-500 hover:brightness-110 active:scale-95'} ${p1Selected===i?'ring-4 ring-white':''}`}>
                    <span className="w-full line-clamp-3">{c}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
