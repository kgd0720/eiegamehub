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
  };

  const totalSteps = 3;
  const step1Done = !!matchMode;
  const step2Done = !!startWord;
  const step3Done = (matchMode === 'team' ? players.length >= 2 : players.length >= 1);
  const isReady = step2Done && step3Done;

  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const getButtonText = () => {
    if (!step2Done) return "시작 단어를 입력해주세요";
    if (matchMode === 'team' && players.length < 2) return "팀을 등록해주세요 (최소 2팀)";
    if (matchMode === 'single' && players.length < 1) return "참가자를 등록해주세요";
    return "START MISSION ▶";
  };

  if (gameState === 'setup') {
    return (
      <div className="max-w-[1160px] mx-auto w-[75%] h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1 no-print overflow-hidden min-h-0">
        {/* Header with Title and Global Progress */}
        <div className="flex items-center justify-between mb-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
           <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-2xl shadow-lg text-white">💬</div>
              <div>
                <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 leading-none mb-1">끝말잇기 설정</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Speed Word Chain Hub</p>
              </div>
           </div>
           
           {/* Step Navigation Bar */}
           <div className="hidden md:flex items-center gap-8 mr-10">
              {[
                { label: '대전 모드', done: step1Done },
                { label: '단어/시간', done: step2Done },
                { label: '명단 등록', done: step3Done }
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all
                    ${s.done ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 
                      (i === completedSteps ? 'border-blue-500 text-blue-500 animate-pulse' : 'border-slate-200 text-slate-300')}`}>
                    {s.done ? '✓' : i + 1}
                  </div>
                  <span className={`text-[11px] font-[1000] uppercase tracking-widest ${s.done ? 'text-slate-900' : 'text-slate-300'}`}>
                    {s.label}
                  </span>
                  {i < 2 && <div className="w-8 h-px bg-slate-100 mx-2" />}
                </div>
              ))}
           </div>

           <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isReady ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">
                {isReady ? '준비완료' : '설정 진행중'}
              </span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-stretch flex-1 overflow-hidden custom-scrollbar-light pb-10 lg:pb-0 min-h-0">
          <div className="col-span-1 lg:col-span-9 flex flex-col gap-2 overflow-visible lg:overflow-hidden min-h-0">
            {/* Step 1 & 2 Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
                {/* Mode Selection Cards */}
                <div className={`bg-white border rounded-[2rem] py-5 px-2 lg:px-3 lg:py-5 shadow-sm flex flex-col transition-all duration-300 ${matchMode ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <label className="text-[11px] font-[1000] text-blue-900 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">STEP 01. 대전 모드 선택</label>
                    {step1Done && <span className="text-emerald-500 text-sm">✓</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setMatchMode('single')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                        ${matchMode === 'single' ? 'bg-blue-500 border-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-200'}`}>
                      <span className={`text-2xl transition-transform group-hover:scale-110 ${matchMode === 'single' ? 'grayscale-0' : 'grayscale'}`}>👤</span>
                      <span className="text-[12px] font-black">개인전</span>
                      <span className={`text-[10px] font-bold ${matchMode === 'single' ? 'text-blue-100' : 'text-slate-300'}`}>플레이어들 VS 진행자</span>
                    </button>
                    <button onClick={() => setMatchMode('team')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                        ${matchMode === 'team' ? 'bg-blue-500 border-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-200'}`}>
                      <span className={`text-2xl transition-transform group-hover:scale-110 ${matchMode === 'team' ? 'grayscale-0' : 'grayscale'}`}>👥</span>
                      <span className="text-[12px] font-black">단체전</span>
                      <span className={`text-[10px] font-bold ${matchMode === 'team' ? 'text-blue-100' : 'text-slate-300'}`}>팀 간 대결</span>
                    </button>
                  </div>
                </div>

                {/* Start Word & Timer Settings */}
                <div className={`bg-white border rounded-[2rem] py-5 px-2 lg:px-3 lg:py-5 shadow-sm flex flex-col transition-all duration-300 ${step2Done ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[11px] font-[1000] text-blue-900 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">STEP 02. 시작 설정</label>
                    <span className="text-[10px] font-black text-slate-400">CONFIG CARD</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">시작 단어 (START WORD)</p>
                      <input type="text" value={startWord} onChange={(e) => setStartWord(e.target.value.toUpperCase())}
                        placeholder="APPLE"
                        className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-5 py-3 text-slate-900 placeholder:text-slate-200 focus:outline-none focus:bg-white focus:border-blue-500 font-black uppercase text-2xl shadow-inner transition-all" />
                    </div>
                    
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">제한 시간 (S)</p>
                      <div className="grid grid-cols-6 gap-1.5">
                        {[30, 60, 90, 120, 150, 180].map(time => (
                          <button key={time} onClick={() => setTimeLimit(time)}
                            className={`py-1.5 rounded-lg text-[13px] font-black border-2 transition-all
                              ${timeLimit === time ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-300 hover:border-blue-200'}`}>
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            {/* Step 3: Registration Section */}
            <div className={`bg-white border rounded-[2rem] py-5 px-2 lg:px-3 lg:py-5 shadow-sm min-h-0 flex flex-col flex-1 transition-all duration-300 ${step3Done ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[12px] font-[1000] text-blue-700 uppercase tracking-widest bg-blue-50 px-4 py-1 rounded-full">참가 명단 등록</h3>
                <button onClick={() => setPlayers([])} className="text-[10px] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase tracking-widest">✕ 목록 초기화</button>
              </div>
              
              <div className="flex gap-2 mb-4 shrink-0">
                <input type="text" value={newPlayer} onChange={e => setNewPlayer(e.target.value)}
                  placeholder={matchMode === "team" ? "참가 팀 이름 입력..." : "참가자 이름 입력..."} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPlayer())}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 font-black text-lg shadow-inner min-w-0" />
                <button onClick={() => handleAddPlayer()}
                  className="px-6 rounded-xl bg-blue-500 text-white font-black text-2xl shadow-lg active:scale-95 transition-all outline-none flex-shrink-0">+</button>
              </div>
              
              <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-wrap content-start gap-2 custom-scrollbar-light shadow-inner min-h-0">
                {players.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-slate-200 rounded-2xl py-8">
                     <p className="text-sm font-black uppercase tracking-widest italic leading-none mb-2">No active participants</p>
                     <p className="text-[10px] font-bold">명단을 등록하면 게임을 시작할 수 있습니다</p>
                  </div>
                ) : (
                  players.map((p, idx) => (
                    <div key={idx} className="h-10 rounded-xl border bg-white border-slate-200 text-slate-700 px-4 flex items-center gap-2 font-black text-sm shadow-sm hover:border-blue-500 transition-all animate-in zoom-in-95 group">
                       <span className="text-blue-500/40 italic">#T{idx + 1}</span> {p}
                       <button onClick={() => setPlayers(players.filter((_, i) => i !== idx))} className="w-6 h-6 rounded-full bg-slate-50 text-slate-300 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center text-[10px]">✕</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-3 flex flex-col gap-2 overflow-visible lg:overflow-hidden">
             <div className="bg-white border border-slate-200 rounded-[2rem] py-5 px-2 lg:px-3 lg:py-5 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="mb-6">
                  <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" /> SETTING STATUS
                  </h2>
                  <div className="flex items-end justify-between mb-2">
                    <p className="text-4xl font-[1000] italic tracking-tighter text-blue-600 leading-none">{progressPercent}%</p>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">설정 완료율</p>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700 shadow-lg" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  {[
                    { label: '대전 모드 선택', done: step1Done },
                    { label: '시작 단어/시간', done: step2Done },
                    { label: '참가 명단 등록', done: step3Done }
                  ].map((s, i) => (
                    <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${s.done ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className={`w-3 h-3 rounded-full shadow-sm ${s.done ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-slate-300'}`} />
                      <div className="flex-1">
                        <p className={`text-[11px] font-black uppercase tracking-widest ${s.done ? 'text-emerald-700' : 'text-slate-400'}`}>{s.label}</p>
                        <p className={`text-[9px] font-bold ${s.done ? 'text-emerald-500' : 'text-slate-300 italics'}`}>{s.done ? 'Ready' : 'Pending'}</p>
                      </div>
                      {s.done && <span className="text-emerald-500 font-black">✓</span>}
                    </div>
                  ))}

                  <div className="mt-4 w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] p-4 text-left shadow-inner">
                    <h3 className="text-[10px] font-[1000] text-blue-600 uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-blue-500 rounded-sm" /> MISSION GUIDE
                    </h3>
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">게임소개</p>
                        <p className="text-[11px] font-bold text-slate-600 leading-snug tracking-tighter">진행자 시작단어 기입 후 참가자 순서대로 끝말잇기</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">진행방법</p>
                        <p className="text-[11px] font-bold text-slate-600 leading-snug tracking-tighter">모드, 시작단어, 제한시간, 명단 기입 후 시작</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <button onClick={handleStart} 
                    disabled={!isReady}
                    className={`w-full py-5 rounded-[1.5rem] font-[1000] text-xl transition-all shadow-2xl relative overflow-hidden group
                      ${isReady ? 'bg-blue-600 text-white hover:scale-105 active:scale-95 shadow-blue-600/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                    <span className="relative z-10">{getButtonText()}</span>
                    {isReady && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    )}
                  </button>
                  <p className="text-[9px] font-bold text-slate-300 text-center mt-4 uppercase tracking-[0.2em] leading-none">
                    * {matchMode === 'team' ? '최소 2팀 등록 시 활성화' : '참가자 1명 등록 시 활성화'}
                  </p>
                </div>
             </div>
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
