import { useState } from 'react';

type GuessEntry = { team: string; value: number; result: 'UP' | 'DOWN' | 'CORRECT' };

export default function NumberGuess() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'done'>('setup');
  const [maxNum] = useState(100);
  const [targetNum, setTargetNum] = useState(50);
  const [matchMode, setMatchMode] = useState<'single' | 'team'>('team');
  const [teams, setTeams] = useState<string[]>([]);
  const [newTeam, setNewTeam] = useState('');
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [history, setHistory] = useState<GuessEntry[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [currentMin, setCurrentMin] = useState(1);
  const [currentMax, setCurrentMax] = useState(100);

  const addTeam = () => {
    const t = newTeam.trim();
    if (!t || teams.includes(t)) return;
    setTeams([...teams, t]);
    setNewTeam('');
  };

  const handleGuess = () => {
    const val = parseInt(manualInput);
    if (isNaN(val) || val < currentMin || val > currentMax) { alert(`${currentMin}~${currentMax} 사이의 숫자를 입력하세요.`); return; }
    
    let res: 'UP' | 'DOWN' | 'CORRECT' = 'UP';
    if (val === targetNum) {
      res = 'CORRECT';
    } else if (val < targetNum) {
      res = 'UP';
      setCurrentMin(Math.max(currentMin, val + 1));
    } else {
      res = 'DOWN';
      setCurrentMax(Math.min(currentMax, val - 1));
    }

    const entry: GuessEntry = { team: teams[currentTeamIdx], value: val, result: res };
    setHistory([entry, ...history]);
    setManualInput('');

    if (res === 'CORRECT') {
      setWinner(teams[currentTeamIdx]);
      setGameState('done');
    } else {
      setCurrentTeamIdx((currentTeamIdx + 1) % teams.length);
    }
  };

  const totalSteps = 3;
  const step1Done = !!matchMode;
  const step2Done = targetNum >= 1 && targetNum <= maxNum;
  const step3Done = (matchMode === 'team' ? teams.length >= 2 : teams.length >= 1);
  
  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const getButtonText = () => {
    if (!step1Done) return "대전 모드를 선택해주세요";
    if (matchMode === 'team' && teams.length < 2) return "팀을 등록해주세요 (최소 2팀)";
    if (matchMode === 'single' && teams.length < 1) return "참가자를 등록해주세요";
    return "게임 시작하기 ▶";
  };

  if (gameState === 'setup') {
    return (
      <div className="max-w-[1160px] mx-auto w-[75%] h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1 overflow-hidden min-h-0">
        <div className="flex items-center justify-between mb-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
           <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-2xl shadow-lg text-white">🔢</div>
              <div>
                <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 leading-none mb-1">숫자맞추기 설정</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Smart Setup Environment</p>
              </div>
           </div>
           
           <div className="hidden md:flex items-center gap-8 mr-10">
              {[
                { label: '대전 모드', done: step1Done },
                { label: '목표 숫자', done: step2Done },
                { label: '참가 등록', done: step3Done }
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all
                    ${s.done ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 
                      (i === completedSteps ? 'border-indigo-500 text-indigo-500 animate-pulse' : 'border-slate-200 text-slate-300')}`}>
                    {s.done ? '✓' : i + 1}
                  </div>
                  <span className={`text-[11px] font-[1000] uppercase tracking-widest ${s.done ? 'text-slate-900' : 'text-slate-300'}`}>
                    {s.label}
                  </span>
                  {i < 2 && <div className="w-8 h-px bg-slate-100 mx-2" />}
                </div>
              ))}
           </div>

           <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
              <span className={`w-2 h-2 rounded-full animate-pulse ${step3Done ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">
                {step3Done ? '게임 준비완료' : '설정 진행중'}
              </span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-stretch flex-1 overflow-hidden custom-scrollbar-light pb-10 lg:pb-0 min-h-0">
          <div className="col-span-1 lg:col-span-9 flex flex-col gap-2 overflow-visible lg:overflow-hidden min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
                <div className={`bg-white border rounded-[2rem] py-5 px-2 lg:px-3 lg:py-5 shadow-sm flex flex-col shrink-0 transition-all duration-300 ${matchMode ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <label className="text-[11px] font-[1000] text-indigo-900 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">STEP 01. 대전 모드 선택</label>
                    {step1Done && <span className="text-emerald-500 text-sm">✓</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setMatchMode('single')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                        ${matchMode === 'single' ? 'bg-indigo-500 border-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200'}`}>
                      <span className={`text-2xl transition-transform group-hover:scale-110 ${matchMode === 'single' ? 'grayscale-0' : 'grayscale'}`}>👤</span>
                      <span className="text-[12px] font-black">개인전</span>
                      <span className={`text-[10px] font-bold ${matchMode === 'single' ? 'text-indigo-100' : 'text-slate-300'}`}>플레이어들 VS 진행자</span>
                    </button>
                    <button onClick={() => setMatchMode('team')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                        ${matchMode === 'team' ? 'bg-indigo-500 border-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200'}`}>
                      <span className={`text-2xl transition-transform group-hover:scale-110 ${matchMode === 'team' ? 'grayscale-0' : 'grayscale'}`}>👥</span>
                      <span className="text-[12px] font-black">단체전</span>
                      <span className={`text-[10px] font-bold ${matchMode === 'team' ? 'text-indigo-100' : 'text-slate-300'}`}>팀 간 대결</span>
                    </button>
                  </div>
                </div>

                <div className={`bg-white border rounded-[2rem] py-5 px-2 lg:px-3 lg:py-5 shadow-sm flex flex-col shrink-0 transition-all duration-300 ${targetNum ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[11px] font-[1000] text-indigo-900 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">STEP 02. 목표 숫자 설정</label>
                    <span className="text-[10px] font-black text-slate-400">RANGE: 1-100</span>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center gap-6">
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl shadow-inner">
                       <div className="text-left">
                          <p className="text-[24px] font-[1000] text-indigo-600 leading-none italic">{targetNum}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Current Target</p>
                       </div>
                       <div className="flex items-center gap-1.5">
                          <button onClick={() => setTargetNum(n => Math.max(1, n - 1))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-indigo-500 font-black text-xl hover:bg-slate-50 active:scale-90 transition-all shadow-sm">－</button>
                          <button onClick={() => setTargetNum(n => Math.min(100, n + 1))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-indigo-500 font-black text-xl hover:bg-slate-50 active:scale-90 transition-all shadow-sm">＋</button>
                       </div>
                    </div>
                    
                    <div className="px-2 pb-2">
                      <input type="range" min="1" max="100" value={targetNum} onChange={e => setTargetNum(parseInt(e.target.value))} 
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-600 transition-all" />
                      <div className="flex justify-between mt-2 px-1">
                        {[1, 25, 50, 75, 100].map(v => (
                          <div key={v} className="flex flex-col items-center gap-1">
                            <div className={`w-0.5 h-1.5 rounded-full ${targetNum === v ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                            <span className={`text-[8px] font-black ${targetNum === v ? 'text-indigo-600' : 'text-slate-300'}`}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            <div className={`bg-white border rounded-[2rem] py-5 px-3 lg:px-4 lg:py-6 shadow-sm min-h-0 flex-1 flex flex-col transition-all duration-300 ${step3Done ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'border-slate-200'}`}>
               <div className="flex items-center justify-between mb-6">
                 <div>
                    <label className="text-[11px] font-[1000] text-indigo-900 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full mb-2 inline-block">STEP 03. 참가 명단 등록</label>
                    <h2 className="text-xl font-[1000] italic uppercase tracking-widest text-slate-900 border-l-4 border-indigo-500 pl-4 mt-2 leading-none">
                      {matchMode === "team" ? "단체전 명단 (최소 2팀)" : "플레이어 명단 등록"}
                    </h2>
                 </div>
                 <button onClick={() => setTeams([])} className="px-4 py-2 bg-rose-50 text-rose-500 border border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-rose-100 transition-all">✕ 전체 초기화</button>
               </div>
               
               <div className="flex gap-2 mb-6">
                  <input type="text" value={newTeam} onChange={e => setNewTeam(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTeam()}
                     placeholder={matchMode === "team" ? "추가할 팀 이름 입력..." : "추가할 플레이어 이름 입력..."} 
                     className="flex-1 bg-slate-50 border border-slate-200 rounded-[1.2rem] px-6 py-4 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:border-indigo-500 font-bold text-lg shadow-inner" />
                  <button onClick={addTeam} className="px-10 rounded-[1.2rem] bg-indigo-500 text-white font-black text-2xl shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all outline-none">추가</button>
               </div>
               
               <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-[1.5rem] border border-slate-100 p-6 flex flex-wrap content-start gap-2 custom-scrollbar-light shadow-inner min-h-0">
                  {teams.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-40 border-2 border-dashed border-slate-200 rounded-xl py-10">
                       <span className="text-3xl mb-3">👥</span>
                       <p className="text-sm font-black uppercase tracking-widest italic text-slate-400">참가자를 추가해주세요</p>
                       <p className="text-[10px] font-bold text-slate-300 mt-1 italic">* {matchMode === 'team' ? '최소 2팀 필요' : '최소 1명 필요'}</p>
                    </div>
                  ) : (
                    teams.map((t, idx) => (
                      <div key={idx} className="h-12 rounded-full border bg-white border-slate-200 text-slate-700 pl-2 pr-4 flex items-center gap-2 font-bold text-sm shadow-sm hover:border-indigo-500 transition-all animate-in zoom-in-95">
                         <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-black italic">#{idx + 1}</div>
                         <span className="max-w-[120px] truncate">{t}</span>
                         <button onClick={() => setTeams(teams.filter((_, i) => i !== idx))} className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center text-xs">✕</button>
                      </div>
                    ))
                  )}
               </div>
               <p className="text-[10px] font-bold text-slate-400 mt-4 italic ml-2">
                 * 등록된 이름 순서대로 게임이 진행됩니다.
               </p>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-3 flex flex-col gap-2 overflow-visible lg:overflow-hidden">
             <div className="bg-white border border-slate-200 rounded-[2rem] py-5 px-2 lg:px-3 lg:py-5 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="mb-6">
                  <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" /> SETTING STATUS
                  </h2>
                  <div className="flex items-end justify-between mb-2">
                    <p className="text-4xl font-[1000] italic tracking-tighter text-indigo-600 leading-none">{progressPercent}%</p>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">설정 완료율</p>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-700 shadow-lg" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {[
                    { label: '대전 모드 선택', done: step1Done },
                    { label: '목표 숫자 설정', done: step2Done },
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
                </div>

                <div className="mt-4 w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] p-4 text-left shadow-inner">
                  <h3 className="text-[10px] font-[1000] text-indigo-600 uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-indigo-500 rounded-sm" /> MISSION GUIDE
                  </h3>
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">게임소개</p>
                      <p className="text-[11px] font-bold text-slate-600 leading-snug tracking-tighter">진행자의 숫자를 플레이어가 맞추는 심리전</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">진행방법</p>
                      <p className="text-[11px] font-bold text-slate-600 leading-snug tracking-tighter">모드, 숫자, 참가자 설정 후 게임 시작</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <button onClick={() => { setGameState('playing'); setHistory([]); setCurrentTeamIdx(0); setCurrentMin(1); setCurrentMax(maxNum); }} 
                    disabled={!step3Done}
                    className={`w-full py-5 rounded-[1.5rem] font-[1000] text-xl transition-all shadow-2xl relative overflow-hidden group
                      ${step3Done ? 'bg-indigo-600 text-white hover:scale-105 active:scale-95 shadow-indigo-600/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                    <span className="relative z-10">{getButtonText()}</span>
                    {step3Done && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    )}
                  </button>
                  <p className="text-[9px] font-bold text-slate-300 text-center mt-4 uppercase tracking-[0.2em] leading-none">
                    * 모든 조건이 충족되면 활성화됩니다.
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
      <div className="fixed inset-0 z-50 bg-[#120614]/95 flex items-center justify-center p-4 backdrop-blur-3xl animate-in fade-in duration-700">
        <div className="bg-white border-[10px] border-indigo-500/20 rounded-[3rem] lg:rounded-[5rem] p-8 lg:p-16 max-w-lg w-full text-center shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95">
           <div className="w-32 h-32 bg-indigo-500 rounded-[2.5rem] flex items-center justify-center text-3xl lg:text-5xl lg:text-7xl mb-10 mx-auto shadow-2xl shadow-indigo-500/30 text-white italic">🏆</div>
           <p className="text-xl font-black text-indigo-500 mb-2 uppercase tracking-[0.5em] italic">정답 발견! (WINNER FOUND)</p>
           <h2 className="text-3xl lg:text-5xl lg:text-7xl font-[1000] text-slate-900 mb-4 leading-none uppercase italic tracking-tighter border-b-8 border-indigo-500 pb-4 inline-block">{winner}</h2>
           <p className="text-2xl font-black text-slate-300 mb-12 uppercase tracking-widest mt-4">목표 숫자: <span className="text-indigo-600 ml-2">{targetNum}</span></p>
           <button onClick={() => setGameState('setup')} className="w-full py-6 rounded-3xl bg-slate-900 text-white font-[1000] text-2xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">설정 화면</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col h-full animate-in fade-in py-2 font-sans text-slate-900 overflow-hidden">
      <div className="flex items-center justify-between mb-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[90px] shrink-0">
         <button onClick={() => setGameState('setup')} className="px-5 py-2.5 rounded-xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] border border-slate-100 hover:text-rose-500 transition-all font-sans">← 나가기</button>
        <div className="text-center">
           <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 italic">현재 순서</p>
           <h2 className="text-2xl font-[1000] text-slate-900 uppercase italic tracking-tighter border-b-2 border-indigo-500 pb-1 leading-none">{teams[currentTeamIdx]} TEAM</h2>
        </div>
        <div className="flex flex-col items-center border-l-4 border-slate-100 pl-8 transition-all">
           <div className="text-4xl font-mono font-black text-indigo-600 leading-none">{currentMin} - {currentMax}</div>
           <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 italic">숫자 범위</div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden min-h-0">
         <div className="col-span-12 lg:col-span-4 bg-white rounded-[2.5rem] p-6 lg:p-10 shadow-xl border border-slate-100 flex flex-col items-center justify-center text-center overflow-hidden shrink-0">
            <p className="text-sm font-black text-slate-300 uppercase tracking-[0.5em] mb-8 italic">팀의 예측값 입력</p>
            <div className="w-full max-w-md space-y-8">
               <input type="number" min={currentMin} max={currentMax} value={manualInput} onChange={e => setManualInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGuess()}
                  className="w-full text-center bg-slate-50 border-4 border-slate-100 rounded-[3rem] py-12 text-8xl font-[1000] focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-indigo-600 shadow-inner" placeholder="?" autoFocus />
               <button onClick={handleGuess} className="w-full py-8 rounded-[2.5rem] bg-indigo-500 text-white font-[1000] text-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase italic">숫자 제출</button>
            </div>
         </div>

         <div className="col-span-12 lg:col-span-8 flex flex-col bg-slate-900 rounded-[2.5rem] border border-white/5 p-6 lg:p-8 shadow-2xl overflow-hidden min-h-0">
            <h3 className="text-sm font-[1000] italic text-white/40 uppercase tracking-[0.3em] mb-4 border-l-2 border-indigo-500 pl-4 leading-none shrink-0">도전 기록 (CHALLENGE LOG)</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 content-start pb-4">
               {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 text-white">
                     <p className="font-black italic uppercase tracking-[0.4em]">추측할 준비 완료</p>
                  </div>
               ) : (
                  history.map((h, i) => (
                     <div key={i} className={`flex items-center justify-between p-2 px-3 rounded-xl border transition-all ${h.result === 'CORRECT' ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white animate-in slide-in-from-right duration-500'}`}>
                        <div className="flex items-center gap-3">
                           <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-black text-xs ${h.result === 'CORRECT' ? 'bg-white text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                              {history.length - i}
                           </span>
                           <div>
                              <p className={`text-[8px] font-black uppercase tracking-widest leading-none mb-1 opacity-50`}>
                                 {h.team}
                              </p>
                              <p className={`text-2xl font-[1000] italic leading-none ${h.result === 'CORRECT' ? 'text-white' : 'text-indigo-400/90'}`}>{h.value}</p>
                           </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-[1000] uppercase tracking-widest shadow-md ${h.result === 'CORRECT' ? 'bg-white text-emerald-500' : h.result === 'UP' ? 'bg-indigo-500 text-white ring-1 ring-indigo-400/30' : 'bg-rose-500 text-white ring-1 ring-rose-400/30'}`}>{h.result}</div>
                     </div>
                  ))
               )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
