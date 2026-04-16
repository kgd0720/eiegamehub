import { useState, useRef, useEffect } from 'react';

type MatchMode = 'single' | 'team';

export default function WordChain() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'done'>('setup');
  const [matchMode, setMatchMode] = useState<MatchMode>('single');
  const [players, setPlayers] = useState<string[]>([]);
  const [newPlayer, setNewPlayer] = useState('');
  const [startWord, setStartWord] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [words, setWords] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState(0);
  
  const timerRef = useRef<any>(null);
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('done');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, timeLeft]);

  const handleStart = () => {
    if (!startWord) return;
    setWords([startWord.toUpperCase()]);
    setTimeLeft(timeLimit);
    setCurrentPlayer(0);
    setGameState('playing');
  };

  const lastChar = (str: string) => str.charAt(str.length - 1);

  const handleAddPlayer = () => {
    if (!newPlayer.trim() || players.includes(newPlayer.trim())) return;
    setPlayers([...players, newPlayer.trim()]);
    setNewPlayer('');
  };

  const submitWord = () => {
    const val = input.trim().toUpperCase();
    if (!val) return;
    
    const prevWord = words[words.length - 1];
    if (val[0] !== lastChar(prevWord)) { alert(`"${lastChar(prevWord)}"로 시작해야 합니다!`); return; }
    if (words.includes(val)) { alert('이미 나온 단어입니다!'); return; }
    
    setWords([...words, val]);
    setInput('');
    setCurrentPlayer((currentPlayer + 1) % (players.length || 1));
    setTimeLeft(timeLimit);
  };

  const isReady = startWord && (matchMode === 'team' ? players.length >= 2 : true);

  if (gameState === 'setup') {
    return (
      <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1 overflow-hidden min-h-0">
        <div className="flex items-center justify-between mb-2 bg-white border border-slate-200 rounded-2xl px-6 py-2 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-2xl shadow-lg text-white">💬</div>
              <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 border-l-4 border-blue-500 pl-3 leading-none">끝말잇기 설정</h1>
           </div>
           <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">연결 준비</span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch flex-1 overflow-y-auto lg:overflow-hidden custom-scrollbar-light pb-10 lg:pb-0 min-h-0">
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-3 overflow-visible lg:overflow-hidden h-full min-h-0">
            <div className="grid grid-cols-8 gap-3 h-[180px] shrink-0">
                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm col-span-2 flex flex-col justify-center">
                  <label className="text-[11px] font-[1000] text-rose-800 uppercase tracking-widest mb-3 block text-center">대전 모드 설정</label>
                  <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    <button onClick={() => setMatchMode('single')}
                      className={`flex-1 py-1.5 rounded-lg font-[1000] text-xs transition-all ${matchMode === 'single' ? 'bg-yellow-400 text-yellow-900 shadow-md border border-yellow-500' : 'text-slate-300 hover:text-slate-500'}`}>
                      개인전
                    </button>
                    <button onClick={() => setMatchMode('team')}
                      className={`flex-1 py-1.5 rounded-lg font-[1000] text-xs transition-all ${matchMode === 'team' ? 'bg-yellow-400 text-yellow-900 shadow-md border border-yellow-500' : 'text-slate-300 hover:text-slate-500'}`}>
                      단체전
                    </button>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-7 shadow-sm col-span-3 flex flex-col justify-center">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">시작 단어</label>
                  <input type="text" value={startWord} onChange={(e) => setStartWord(e.target.value.toUpperCase())}
                    placeholder="APPLE"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 font-black uppercase text-3xl shadow-inner transition-all" />
               </div>
               <div className="bg-white border border-slate-200 rounded-[1.5rem] p-7 shadow-sm col-span-3 flex flex-col justify-center">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">제한 시간 (S)</label>
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {[30, 60, 90, 120, 150, 180].map(time => (
                      <button key={time} onClick={() => setTimeLimit(time)}
                        className={`rounded-xl text-sm font-black border transition-all flex items-center justify-center ${timeLimit === time ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-slate-50 border-slate-100 text-slate-300 hover:bg-white hover:border-rose-300 hover:text-rose-500'}`}>
                        {time}s
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm min-h-0 grid grid-rows-[auto_auto_minmax(0,1fr)]">
               <div className="flex items-center justify-between mb-4 align-top">
                   <h2 className="text-xl font-[1000] italic uppercase tracking-widest text-slate-900 border-l-4 border-blue-500 pl-4 leading-none">{matchMode === "team" ? "단체전 명단 (최소 2팀)" : "참가자 이름"}</h2>
                  <button onClick={() => setPlayers([])} className="px-4 py-2 bg-rose-50 text-rose-500 border border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm leading-none">✕ 목록 초기화</button>
               </div>
               
               <div className="flex gap-2 mb-4 align-top">
                  <input type="text" value={newPlayer} onChange={e => setNewPlayer(e.target.value)}
                    placeholder={matchMode === "team" ? "참가 팀 이름 입력..." : "참가자 이름 입력..."} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPlayer())}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-2.5 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 font-black text-lg shadow-inner min-w-0" />
                  <button onClick={() => handleAddPlayer()}
                    className="px-6 rounded-xl bg-blue-500 text-white font-black text-lg shadow-lg active:scale-95 transition-all outline-none flex-shrink-0">+</button>
               </div>
               
               <div className="overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-wrap content-start gap-2 custom-scrollbar-light shadow-inner">
                  {players.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center opacity-20 py-10">
                       <p className="text-lg font-black uppercase tracking-widest italic">No teams registered</p>
                    </div>
                  ) : (
                    players.map((p, idx) => (
                      <div key={idx} className="h-10 rounded-xl border-2 bg-white border-slate-200 text-slate-700 px-4 flex items-center gap-3 font-black text-base shadow-sm group hover:border-blue-500 transition-all">
                         <span className="text-blue-500/40 italic">#T{idx + 1}</span> {p}
                         <button onClick={() => setPlayers(players.filter((_, i) => i !== idx))} className="text-slate-200 hover:text-rose-500 ml-1 text-xl">✕</button>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-4 bg-white border border-slate-200 rounded-[2rem] p-5 shadow-sm flex flex-col h-full items-center text-center overflow-hidden">
                <div className="flex items-center gap-5 mb-3 w-full px-2">
                   <div className="w-14 h-14 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center shrink-0 shadow-lg relative">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-2xl shadow-xl text-white">💬</div>
                   </div>
                   <div className="text-left flex-1">
                      <h2 className={`text-2xl font-[1000] tracking-tighter italic transition-colors leading-none mb-1.5 ${isReady ? 'text-blue-500' : 'text-slate-200'}`}>
                         {isReady ? '준비완료' : '준비중'}
                      </h2>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Status Report</p>
                   </div>
                </div>

                <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 mb-3 text-left shadow-inner font-black">
                   <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 text-[9px] uppercase tracking-widest underline decoration-blue-100 uppercase">시작 단어</span>
                      <span className="text-blue-600 text-lg italic uppercase leading-none">{startWord || '---'}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                        <span className="text-slate-400 text-[9px] uppercase tracking-widest leading-none">제한 시간</span>
                        <span className="text-slate-900 text-base italic leading-none">{timeLimit}S</span>
                     </div>
                   <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[9px] uppercase tracking-widest leading-none">참가 팀</span>
                      <span className={`text-base leading-none ${players.length >= 2 ? 'text-blue-500' : 'text-rose-500'}`}>{players.length} Teams</span>
                   </div>
                </div>

                 <div className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] p-4 mb-auto text-left shadow-inner">
                    <h3 className="text-[10px] font-[1000] text-blue-600 uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                       <span className="w-1.5 h-3 bg-blue-500 rounded-sm" /> MISSION GUIDE
                    </h3>
                    <div className="space-y-2.5">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">게임소개</p>
                          <p className="text-[11px] font-bold text-slate-600 leading-tight">진행자 시작단어 기입 후 참가자 순서대로 끝말잇기</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">진행방법</p>
                          <p className="text-[11px] font-bold text-slate-600 leading-tight">모드, 시작단어, 제한시간, 참가자이름 기입 후 시작</p>
                       </div>
                    </div>
                 </div>

                <button onClick={handleStart} disabled={!isReady}
                  className={`w-full py-4 rounded-[1.2rem] font-[1000] text-xl transition-all shadow-2xl mt-4 ${isReady ? 'bg-blue-500 text-white hover:scale-105 active:scale-95 shadow-blue-500/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                  {isReady ? '게임 시작' : '설정을 완료해 주세요'}
                </button>
             </div>
          </div>
        </div>
    );
  }

  if (gameState === 'done') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0f1e]/95 flex items-center justify-center p-4 backdrop-blur-3xl animate-in fade-in duration-500">
        <div className="bg-white border-[12px] border-blue-500/20 rounded-[3rem] lg:rounded-[5rem] p-8 lg:p-16 max-w-lg w-full text-center shadow-2xl animate-in zoom-in-95">
           <div className="w-32 h-32 bg-blue-500 rounded-[2.5rem] flex items-center justify-center text-3xl lg:text-5xl lg:text-7xl mb-10 mx-auto shadow-2xl text-white italic">🎮</div>
           <h2 className="text-4xl lg:text-6xl font-[1000] text-slate-900 mb-4 leading-none uppercase italic tracking-tighter">시간 종료!</h2>
           <p className="text-2xl font-black text-blue-500 mb-12 uppercase tracking-[0.4em]">총 {words.length}개 단어 연결</p>
           <button onClick={() => setGameState('setup')} className="w-full py-6 rounded-3xl bg-slate-900 text-white font-[1000] text-2xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">대시보드</button>
        </div>
      </div>
    );
  }

  const currentWord = words[words.length - 1];
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-6xl mx-auto w-full h-full flex flex-col py-1 font-sans text-slate-900 animate-in fade-in duration-500 overflow-hidden">
       <div className="flex items-center justify-between mb-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm shrink-0">
          <button onClick={() => setGameState('setup')} className="px-5 py-2.5 rounded-xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] border border-slate-100 hover:text-rose-500 transition-all font-sans">← 나가기</button>
          
          <div className="flex-1 flex flex-col items-center">
             <div className="px-6 py-1 bg-blue-50 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-1">Current Word</div>
             <h2 className="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter border-b-4 border-blue-500 leading-none pb-1">{currentWord}</h2>
          </div>

          <div className="flex items-center gap-6 border-l-4 border-slate-100 pl-8">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 italic">Time Remaining</p>
                <div className={`text-4xl font-mono font-[1000] leading-none ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-blue-600'}`}>
                   {fmt(timeLeft)}
                </div>
             </div>
          </div>
       </div>

       <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden">
           <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-[3rem] p-6 shadow-sm flex flex-col relative overflow-hidden">
             {/* History Area */}
             <div className="w-full flex flex-col items-center mb-auto pt-4 overflow-hidden">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4 italic leading-none">연결 중인 단어 기록 (Word History)</p>
                <div className="w-full overflow-x-auto flex items-center justify-center gap-2 custom-scrollbar-light pb-4 px-10">
                   {words.map((w, idx) => (
                      <div key={idx} className="flex items-center gap-1 shrink-0">
                         <div className={`px-4 py-2 rounded-2xl border-2 font-black text-sm italic transition-all ${idx === words.length - 1 ? 'bg-blue-500 border-blue-400 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                            {w}
                         </div>
                         {idx < words.length - 1 && <span className="text-slate-200 text-xl font-bold mx-1">→</span>}
                      </div>
                   ))}
                </div>
             </div>

             <div className="w-full max-w-2xl space-y-12 mb-auto pb-12 text-center mx-auto">
                <div>
                   <p className="text-sm font-black text-slate-300 uppercase tracking-[0.5em] mb-4 italic">다음 단어를 입력하세요</p>
                   <form onSubmit={e => { e.preventDefault(); submitWord(); }} className="relative group">
                      <input type="text" value={input} onChange={e => setInput(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] px-10 py-8 text-5xl font-[1000] text-slate-900 placeholder:text-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-center shadow-inner uppercase italic" placeholder="..." autoFocus />
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-200 text-sm font-black italic uppercase tracking-widest pointer-events-none group-focus-within:opacity-0 transition-opacity">Type and Enter</div>
                   </form>
                </div>
             </div>
          </div>

          <div className="col-span-12 lg:col-span-4 bg-slate-900 rounded-[3rem] p-8 flex flex-col shadow-2xl border border-white/5 overflow-hidden">
             <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                <h3 className="text-xl font-[1000] italic text-white uppercase tracking-widest flex items-center gap-3">
                   <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                   플레이 목록
                </h3>
                <span className="text-blue-500 font-black text-sm italic">{words.length} WORDS</span>
             </div>

             <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 mb-6">
                {players.length > 0 && players.map((p, idx) => (
                   <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${idx === currentPlayer ? 'bg-blue-600 border-blue-400 scale-[1.02] shadow-xl shadow-blue-500/20' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex items-center gap-4">
                         <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${idx === currentPlayer ? 'bg-white text-blue-600' : 'bg-slate-800 text-slate-400 italic'}`}>#T{idx+1}</span>
                         <span className={`font-black text-lg ${idx === currentPlayer ? 'text-white' : 'text-slate-300'}`}>{p}</span>
                      </div>
                      {idx === currentPlayer && <span className="text-white font-[1000] italic animate-pulse px-3 py-1 bg-white/20 rounded-lg text-[10px]">입력 중...</span>}
                   </div>
                ))}
                {players.length === 0 && <p className="text-center text-white/20 italic font-black uppercase tracking-widest py-10">No Players</p>}
             </div>

             <div className="mt-auto space-y-4">
                <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic mb-3">연결 정보</p>
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400 text-[10px] font-black uppercase">다음 시작 문자</span>
                      <span className="text-white text-2xl font-[1000] italic bg-blue-600 px-4 py-1 rounded-lg shadow-lg">{lastChar(currentWord)}</span>
                   </div>
                </div>
             </div>
          </div>
       </div>

       <div className="px-6 flex gap-3 overflow-x-auto py-2 custom-scrollbar-light shrink-0">
          {[...words].reverse().slice(1).map((w, idx) => (
             <div key={idx} className="shrink-0 h-9 px-4 bg-white border border-slate-200 rounded-full flex items-center text-slate-400 font-bold text-xs italic shadow-sm opacity-60">
                {w}
             </div>
          ))}
       </div>
    </div>
  );
}
