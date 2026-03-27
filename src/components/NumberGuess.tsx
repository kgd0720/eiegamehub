import { useState } from 'react';

type GuessEntry = { team: string; value: number; result: 'UP' | 'DOWN' | 'CORRECT' };

export default function NumberGuess() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'done'>('setup');
  const [maxNum] = useState(100);
  const [targetNum, setTargetNum] = useState(50);
  const [teams, setTeams] = useState<string[]>([]);
  const [newTeam, setNewTeam] = useState('');
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [history, setHistory] = useState<GuessEntry[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('');

  const addTeam = () => {
    const t = newTeam.trim();
    if (!t || teams.includes(t)) return;
    setTeams([...teams, t]);
    setNewTeam('');
  };

  const handleGuess = () => {
    const val = parseInt(manualInput);
    if (isNaN(val) || val < 1 || val > maxNum) { alert(`1~${maxNum} 사이의 숫자를 입력하세요.`); return; }
    
    let res: 'UP' | 'DOWN' | 'CORRECT' = 'UP';
    if (val === targetNum) res = 'CORRECT';
    else if (val < targetNum) res = 'UP';
    else res = 'DOWN';

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

  const isReady = teams.length >= 2;

  if (gameState === 'setup') {
    return (
      <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1">
        <div className="flex items-center justify-between mb-2 bg-white border border-slate-200 rounded-2xl px-6 py-2 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-2xl shadow-lg text-white">🔢</div>
              <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 border-l-4 border-indigo-500 pl-3 leading-none">숫자맞추기 설정</h1>
           </div>
           <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">심리 게임 활성화</span>
           </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-stretch flex-1 overflow-hidden">
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-3 overflow-hidden">
            <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm">
               <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block underline decoration-indigo-200 underline-offset-4">진행자 설정 (Mod Only)</label>
               <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex items-center justify-between gap-8 shadow-inner">
                  <div className="flex-1">
                     <p className="text-sm font-black text-slate-900 mb-1">🎯 목표 숫자 설정 (범위: 1~100)</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">이 숫자를 먼저 맞추는 팀이 승리합니다.</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                     <button onClick={() => setTargetNum(n => Math.max(1, n - 1))} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 font-black text-xl active:scale-95 transition-all">－</button>
                     <input type="number" min="1" max="100" value={targetNum} onChange={e => setTargetNum(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))} 
                        className="w-20 text-center text-3xl font-[1000] text-indigo-600 focus:outline-none bg-transparent" />
                     <button onClick={() => setTargetNum(n => Math.min(100, n + 1))} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 font-black text-xl active:scale-95 transition-all">＋</button>
                  </div>
               </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col flex-1 overflow-hidden">
               <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl font-[1000] italic uppercase tracking-widest text-slate-900 border-l-4 border-indigo-500 pl-4 leading-none">Team Match (최소 2팀 이상)</h2>
                  <button onClick={() => setTeams([])} className="px-4 py-2 bg-rose-50 text-rose-500 border border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm leading-none">✕ 초기화</button>
               </div>
               
               <div className="flex gap-2 mb-6">
                  <input type="text" value={newTeam} onChange={e => setNewTeam(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTeam()}
                     placeholder="참가 팀 이름 입력..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 font-black text-lg shadow-inner" />
                  <button onClick={addTeam} className="px-8 rounded-xl bg-indigo-500 text-white font-black text-xl shadow-lg active:scale-95 transition-all outline-none">+</button>
               </div>
               
               <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-6 flex flex-wrap content-start gap-3 custom-scrollbar-light shadow-inner">
                  {teams.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center py-20 opacity-20">
                       <p className="text-xl font-black uppercase tracking-[0.4em] italic leading-none">No Teams Pool</p>
                    </div>
                  ) : (
                    teams.map((t, idx) => (
                      <div key={idx} className="h-10 rounded-xl border-2 bg-white border-slate-200 text-slate-700 px-5 flex items-center gap-3 font-black text-base shadow-sm group hover:border-indigo-500 transition-all">
                         <span className="text-indigo-500/40 italic">#T{idx + 1}</span> <span>{t}</span>
                         <button onClick={() => setTeams(teams.filter((_, i) => i !== idx))} className="text-slate-200 hover:text-rose-500 transition-colors ml-1 text-xl">✕</button>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
             <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col h-full items-center text-center overflow-hidden">
                <div className="w-24 h-24 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center mb-6 shrink-0 shadow-lg relative">
                   <div className="w-16 h-16 bg-indigo-500 rounded-[1.5rem] flex items-center justify-center text-4xl shadow-xl text-white italic">#</div>
                </div>

                <div className="mb-6">
                   <h2 className={`text-3xl font-[1000] tracking-tighter mb-1 italic transition-colors ${isReady ? 'text-indigo-500' : 'text-slate-200'}`}>
                      {isReady ? '준비완료' : '준비중'}
                   </h2>
                </div>

                <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4 mb-6 text-left shadow-inner font-black">
                   <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                      <span className="text-slate-400 text-[10px] uppercase tracking-widest leading-none">목표 숫자</span>
                      <span className="text-indigo-600 text-2xl italic leading-none">{targetNum}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                      <span className="text-slate-400 text-[10px] uppercase tracking-widest leading-none">최대 범위</span>
                      <span className="text-slate-900 text-lg italic leading-none">1 - {maxNum}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[10px] uppercase tracking-widest leading-none underline decoration-indigo-200">참가 팀</span>
                      <span className={`text-lg leading-none ${teams.length >= 2 ? 'text-emerald-500' : 'text-rose-500'}`}>{teams.length} Teams</span>
                   </div>
                </div>

                <div className="w-full bg-indigo-50/50 rounded-3xl p-6 border-2 border-indigo-100 mb-auto text-left shadow-inner group-hover:border-indigo-500/20 transition-all">
                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] italic mb-3">MISSION GUIDE</h3>
                    <ul className="space-y-4 text-[11px] font-bold text-slate-400 leading-none">
                       <li className="flex gap-2 items-center"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 최저/최고 범위 내 숫자를 맞추는 게임입니다</li>
                       <li className="flex gap-2 items-center"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 팀별로 돌아가며 숫자를 입력해 정답을 찾으세요</li>
                    </ul>
                 </div>

                <button onClick={() => { setGameState('playing'); setHistory([]); setCurrentTeamIdx(0); }} disabled={!isReady}
                  className={`w-full py-5 mt-6 rounded-[2rem] font-[1000] text-2xl transition-all shadow-2xl ${isReady ? 'bg-indigo-500 text-white hover:scale-105 active:scale-95 shadow-indigo-500/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                  {isReady ? '게임 시작' : '팀을 추가해 주세요'}
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'done') {
    return (
      <div className="fixed inset-0 z-50 bg-[#120614]/95 flex items-center justify-center p-4 backdrop-blur-3xl animate-in fade-in duration-700">
        <div className="bg-white border-[10px] border-indigo-500/20 rounded-[5rem] p-16 max-w-lg w-full text-center shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95">
           <div className="w-32 h-32 bg-indigo-500 rounded-[2.5rem] flex items-center justify-center text-7xl mb-10 mx-auto shadow-2xl shadow-indigo-500/30 text-white italic">🏆</div>
           <p className="text-xl font-black text-indigo-500 mb-2 uppercase tracking-[0.5em] italic">정답 발견! (WINNER FOUND)</p>
           <h2 className="text-7xl font-[1000] text-slate-900 mb-4 leading-none uppercase italic tracking-tighter border-b-8 border-indigo-500 pb-4 inline-block">{winner}</h2>
           <p className="text-2xl font-black text-slate-300 mb-12 uppercase tracking-widest mt-4">목표 숫자: <span className="text-indigo-600 ml-2">{targetNum}</span></p>
           <button onClick={() => setGameState('setup')} className="w-full py-6 rounded-3xl bg-slate-900 text-white font-[1000] text-2xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">설정 화면</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col h-full animate-in fade-in py-2 font-sans text-slate-900 overflow-hidden">
      <div className="flex items-center justify-between mb-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[90px]">
         <button onClick={() => setGameState('setup')} className="px-5 py-2.5 rounded-xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] border border-slate-100 hover:text-rose-500 transition-all font-sans">← 나가기</button>
        <div className="text-center">
           <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 italic">현재 순서</p>
           <h2 className="text-2xl font-[1000] text-slate-900 uppercase italic tracking-tighter border-b-2 border-indigo-500 pb-1 leading-none">{teams[currentTeamIdx]} TEAM</h2>
        </div>
        <div className="flex flex-col items-center border-l-4 border-slate-100 pl-8">
           <div className="text-4xl font-mono font-black text-slate-900 leading-none">1 - {maxNum}</div>
           <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 italic">숫자 범위</div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
         <div className="col-span-12 lg:col-span-7 bg-white rounded-[3.5rem] p-10 shadow-xl border border-slate-100 flex flex-col items-center justify-center text-center overflow-hidden">
            <p className="text-sm font-black text-slate-300 uppercase tracking-[0.5em] mb-8 italic">팀의 예측값 입력</p>
            <div className="w-full max-w-md space-y-8">
               <input type="number" min="1" max="100" value={manualInput} onChange={e => setManualInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGuess()}
                  className="w-full text-center bg-slate-50 border-4 border-slate-100 rounded-[3rem] py-12 text-8xl font-[1000] focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-indigo-600 shadow-inner" placeholder="?" autoFocus />
               <button onClick={handleGuess} className="w-full py-8 rounded-[2.5rem] bg-indigo-500 text-white font-[1000] text-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase italic">숫자 제출</button>
            </div>
         </div>

         <div className="col-span-12 lg:col-span-5 flex flex-col bg-slate-900 rounded-[3.5rem] border border-white/5 p-10 shadow-2xl overflow-hidden min-h-0">
            <h3 className="text-xl font-[1000] italic text-white uppercase tracking-widest mb-6 border-l-4 border-indigo-500 pl-4 leading-none">도전 기록</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar overflow-hidden">
               {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 text-white">
                     <p className="font-black italic uppercase tracking-[0.4em]">추측할 준비 완료</p>
                  </div>
               ) : (
                  history.map((h, i) => (
                     <div key={i} className={`flex items-center justify-between p-5 rounded-2xl border ${h.result === 'CORRECT' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-white/5 border-white/10 text-white/50 animate-in slide-in-from-right'}`}>
                        <div className="flex items-center gap-4">
                           <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs ${h.result === 'CORRECT' ? 'bg-white text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>T{history.length - i}</span>
                           <div>
                              <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${h.result === 'CORRECT' ? 'text-white' : 'text-indigo-500'}`}>{h.team}</p>
                              <p className={`text-2xl font-[1000] italic leading-none ${h.result === 'CORRECT' ? 'text-white' : 'text-white/90'}`}>{h.value}</p>
                           </div>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-xs font-[1000] uppercase tracking-widest shadow-lg ${h.result === 'CORRECT' ? 'bg-white text-emerald-500' : h.result === 'UP' ? 'bg-indigo-500 text-white' : 'bg-rose-500 text-white'}`}>{h.result}</div>
                     </div>
                  ))
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
