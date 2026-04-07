import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface Question { q: string; a: string; }

export default function SpeedGame() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'done' | 'ranking'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsPerTeam, setQuestionsPerTeam] = useState(10);
  const [matchMode, setMatchMode] = useState<'single' | 'team'>('team');
  const [timeLimit, setTimeLimit] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [teams, setTeams] = useState<string[]>([]);
  const [newTeam, setNewTeam] = useState('');
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [teamScores, setTeamScores] = useState<Record<string, number>>({});
  const [teamTimes, setTeamTimes] = useState<Record<string, number>>({});
  const [teamQuestions, setTeamQuestions] = useState<Question[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealStatus, setRevealStatus] = useState<'correct'|'pass'|null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let t: any;
    if (gameState === 'playing') {
      t = setInterval(() => {
        setTimeLeft(prev => {
           if (prev <= 1) return 0;
           return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(t);
  }, [gameState]);

  useEffect(() => {
    if (timeLeft === 0 && gameState === 'playing') {
      const activeTeam = teams[currentTeamIdx];
      setTeamScores(prev => ({ ...prev, [activeTeam]: score }));
      setTeamTimes(prev => ({ ...prev, [activeTeam]: 0 }));
      setGameState('done');
    }
  }, [timeLeft, gameState, score, currentTeamIdx, teams]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const result = evt.target?.result;
        const wb = XLSX.read(result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const imported: Question[] = [];
        data.slice(1).forEach(row => {
           if (row && row[0]) {
              const q = String(row[0] || '').trim();
              const a = String(row[1] || '').trim();
              if (q && a) imported.push({ q, a });
           }
        });
        if (imported.length > 0) {
           const combined = [...questions, ...imported].sort(() => Math.random() - 0.5);
           setQuestions(combined);
           alert(`${imported.length}개의 문제를 성공적으로 불러왔습니다.`);
           
           // Auto start if ready
           if (combined.length >= questionsPerTeam && (matchMode === "team" ? teams.length >= 2 : teams.length >= 1)) {
              startRound(combined);
           }
        } else {
           alert('불러올 수 있는 유효한 문제가 없습니다. 엑셀 형식을 확인해 주세요.');
        }
      } catch { alert('파일을 읽는 중 오류가 발생했습니다.'); }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddTeam = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newTeam.trim() && !teams.includes(newTeam.trim())) {
      const t = newTeam.trim();
      setTeams([...teams, t]);
      setTeamScores(prev => ({ ...prev, [t]: 0 }));
      setNewTeam('');
    }
  };

  const startRound = (customQs?: Question[]) => {
    const qSource = customQs || questions;
    const isActuallyReady = qSource.length >= questionsPerTeam && (matchMode === 'team' ? teams.length >= 2 : teams.length >= 1);
    if (!isActuallyReady) return;
    
    setCurrentTeamIdx(0);
    setTeamScores(teams.reduce((acc, t) => ({ ...acc, [t]: 0 }), {}));
    setTeamTimes(teams.reduce((acc, t) => ({ ...acc, [t]: 0 }), {}));
    prepareRound(0, qSource);
  }

  const prepareRound = (idx: number, qSource?: Question[]) => {
    const source = qSource || questions;
    const shuffled = [...source].sort(() => Math.random() - 0.5).slice(0, questionsPerTeam);
    setTeamQuestions(shuffled);
    setScore(0);
    setCurrentIdx(0);
    setGameState('playing');
    setTimeLeft(timeLimit);
    setCurrentTeamIdx(idx);
    setIsRevealing(false);
    setRevealStatus(null);
  }

  const handleChoice = (type: 'correct' | 'pass') => {
    if (isRevealing) return;
    setIsRevealing(true);
    setRevealStatus(type);
    
    let curScore = score;
    if (type === 'correct') {
      curScore += 1;
      setScore(curScore);
    }

    setTimeout(() => {
      setIsRevealing(false);
      setRevealStatus(null);
      const next = currentIdx + 1;
      if (next >= questionsPerTeam) {
        setTeamScores(prev => ({ ...prev, [teams[currentTeamIdx]]: curScore }));
        setTeamTimes(prev => ({ ...prev, [teams[currentTeamIdx]]: timeLeft }));
        setGameState('done');
      } else {
        setCurrentIdx(next);
      }
    }, 700);
  };

  const handleNextStep = () => {
     if (currentTeamIdx < teams.length - 1) {
        prepareRound(currentTeamIdx + 1);
     } else {
        setGameState('ranking');
     }
  }

  const isReady = questions.length >= questionsPerTeam && (matchMode === 'team' ? teams.length >= 2 : teams.length >= 1);

  if (gameState === 'setup') {
    return (
      <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1">
        <div className="flex items-center justify-between mb-2 bg-white border border-slate-200 rounded-2xl px-6 py-2 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffca28] flex items-center justify-center text-2xl shadow-lg text-white">⚡</div>
              <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 border-l-4 border-amber-500 pl-3 leading-none">스피드게임 설정</h1>
           </div>
           <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-100 rounded-full">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none">HIGH ENERGY</span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch flex-1 overflow-y-auto lg:overflow-hidden custom-scrollbar-light pb-10 lg:pb-0">
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-3 overflow-visible lg:overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
               
                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm col-span-1">
                  <label className="text-[11px] font-[1000] text-rose-800 uppercase tracking-widest mb-3 block text-center">대전 모드 설정</label>
                   <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    <button onClick={() => setMatchMode('single')}
                      className={`flex-1 py-5 rounded-xl font-[1000] text-base transition-all ${matchMode === 'single' ? 'bg-yellow-400 text-yellow-900 shadow-md border border-yellow-500' : 'text-slate-300 hover:text-slate-500'}`}>
                      개인전
                    </button>
                    <button onClick={() => setMatchMode('team')}
                      className={`flex-1 py-5 rounded-xl font-[1000] text-base transition-all ${matchMode === 'team' ? 'bg-yellow-400 text-yellow-900 shadow-md border border-yellow-500' : 'text-slate-300 hover:text-slate-500'}`}>
                      단체전
                    </button>
                  </div>
                </div>
  <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">제한 시간 (S)</label>
                  <div className="grid grid-cols-3 gap-1 w-full">
                    {[30, 60, 90, 120, 150, 180].map(t => (
                       <button key={t} onClick={() => setTimeLimit(t)}
                        className={`py-2 rounded-lg text-xs font-[1000] border-2 transition-all ${timeLimit === t ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                        {t}s
                      </button>
                    ))}
                  </div>
               </div>
               <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm flex flex-col justify-center">
                    <label className="text-[11px] font-[1000] text-rose-800 uppercase tracking-widest mb-3 block text-center">출제 문항 수 (2~30)</label>
                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-2 shadow-inner">
                       <button onClick={() => setQuestionsPerTeam(Math.max(2, questionsPerTeam - 2))} className="w-10 h-10 rounded-lg bg-white border border-slate-200 font-black text-xl shadow-sm">－</button>
                       <span className="flex-1 text-center text-4xl font-[1000] italic text-amber-500 tabular-nums">{questionsPerTeam}</span>
                       <button onClick={() => setQuestionsPerTeam(Math.min(30, questionsPerTeam + 2))} className="w-10 h-10 rounded-lg bg-white border border-slate-200 font-black text-xl shadow-sm">＋</button>
                    </div>
                 </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col flex-1 overflow-hidden">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-[1000] italic uppercase tracking-widest text-slate-900 border-l-4 border-amber-500 pl-4 leading-none">{matchMode === "team" ? "단체전 명단 (최소 2팀)" : "참가자 이름"} <span className="text-[10px] ml-2 text-slate-300">MIN 1 TEAM</span></h2>
                   <button onClick={() => setTeams([])} className="px-4 py-2 bg-rose-50 text-rose-500 border border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm leading-none">✕ 목록 초기화</button>
               </div>
               
               <div className="flex gap-2 mb-4">
                  <input type="text" value={newTeam} onChange={e => setNewTeam(e.target.value)}
                    placeholder={matchMode === "team" ? "참가 팀 이름 입력..." : "참가자 이름 입력..."} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTeam())}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-2.5 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-amber-500 font-black text-lg shadow-inner" />
                  <button onClick={() => handleAddTeam()}
                    className="px-6 rounded-xl bg-amber-500 text-white font-black text-lg shadow-lg active:scale-95 transition-all outline-none">+</button>
               </div>
               
               <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-wrap content-start gap-2 custom-scrollbar-light shadow-inner overflow-hidden">
                  {teams.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                       <p className="text-lg font-black uppercase tracking-widest italic">{matchMode === "team" ? "No teams in pool" : "No players in pool"}</p>
                    </div>
                  ) : (
                    teams.map((t, idx) => (
                      <div key={idx} className="h-10 rounded-xl border-2 bg-white border-slate-200 text-slate-700 px-4 flex items-center gap-3 font-black text-base shadow-sm group hover:border-amber-500 transition-all">
                         <span className="text-amber-500/40 italic">#T{idx + 1}</span> {t}
                         <button onClick={() => setTeams(teams.filter((_, i) => i !== idx))} className="text-slate-200 hover:text-rose-500 ml-1 text-xl">✕</button>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-4 flex flex-col gap-3 overflow-visible lg:overflow-hidden">
             <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-full items-center text-center overflow-hidden">
                <div className="w-20 h-20 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mb-4 shrink-0 relative">
                   <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center text-3xl shadow-xl text-white">⚡</div>
                </div>
                <div className="mb-4">
                   <h2 className={`text-3xl font-[1000] tracking-tighter mb-1 italic transition-colors ${isReady ? 'text-amber-500' : 'text-slate-200'}`}>
                      {isReady ? '준비완료' : '준비중'}
                   </h2>
                </div>
                <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-3 mb-3 text-left shadow-inner font-black">
                   <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-400 text-[10px] uppercase tracking-widest">제한 시간</span>
                      <span className="text-slate-900 text-lg italic">{timeLimit}S</span>
                   </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                       <span className="text-slate-400 text-[10px] uppercase tracking-widest">팀별 문항</span>
                       <span className="text-amber-500 text-lg">{questionsPerTeam} Q/Team</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                       <span className="text-slate-400 text-[10px] uppercase tracking-widest">등록 문제</span>
                       <span className="text-slate-600 text-lg italic">{questions.length} Quizzes</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-slate-400 text-[10px] uppercase tracking-widest">참가 팀</span>
                       <span className={`text-lg ${teams.length > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{teams.length} Teams</span>
                    </div>
                </div>

                <div className="w-full bg-amber-50 rounded-2xl p-5 border border-amber-100 space-y-2 mb-4 text-left shadow-sm">
                   <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.4em] italic mb-1">GAME GUIDE</h3>
                   <ul className="space-y-1.5 text-xs font-bold text-slate-500 leading-tight">
                      <li className="flex gap-2 items-start"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" /> 문제를 보고 정답/패스 선택</li>
                      <li className="flex gap-2 items-start"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" /> 모든 팀 문항 완료시 종료</li>
                   </ul>
                </div>

                <div className="w-full mb-2">
                   <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-slate-900 text-white rounded-3xl text-xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-amber-500 transition-all flex items-center justify-center gap-3">
                      <span className="text-xl">📂</span> 엑셀 파일 업로드
                   </button>
                </div>

                <button onClick={() => startRound()} disabled={!isReady}
                  className={`w-full py-4 mt-4 rounded-3xl font-[1000] text-2xl transition-all shadow-2xl ${isReady ? 'bg-amber-500 text-white hover:scale-105 active:scale-95 shadow-amber-500/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                  {isReady ? '게임 시작' : '팀 및 문제를 확인해 주세요'}
                </button>
             </div>
          </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
      </div>
    );
  }

  if (gameState === 'done') {
    const isLastTeam = currentTeamIdx === teams.length - 1;
    return (
      <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-3xl flex items-center justify-center p-4">
        <div className="bg-white border-4 border-amber-500 rounded-[3rem] lg:rounded-[4rem] p-8 lg:p-12 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95">
           <div className="text-[100px] mb-6 drop-shadow-2xl">⚡</div>
            <h2 className="text-4xl lg:text-6xl font-[1000] text-amber-500 mb-2 leading-none uppercase italic tracking-tighter">라운드 종료</h2>
           <p className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">{teams[currentTeamIdx]} TEAM</p>
           <p className="text-xl font-black text-slate-400 mb-10 uppercase tracking-[0.4em]">성공: <span className="text-amber-500 text-2xl ml-3">{score} / {questionsPerTeam}</span></p>
            <div className="flex flex-col gap-3">
              {isLastTeam ? (
                 <button onClick={handleNextStep}
                   className="w-full py-5 rounded-2xl bg-rose-500 text-white font-[1000] text-xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">최종 순위</button>
              ) : (
                 <button onClick={handleNextStep}
                   className="w-full py-5 rounded-2xl bg-amber-500 text-white font-[1000] text-xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">다음 팀 (Next Team)</button>
              )}
              <button onClick={() => setGameState('setup')}
                className="w-full py-5 rounded-2xl bg-slate-100 text-slate-400 font-[1000] text-lg uppercase tracking-widest hover:bg-slate-200 transition-all">대시보드</button>
            </div>
        </div>
      </div>
    );
  }

  if (gameState === 'ranking') {
     const sortedTeams = [...teams].sort((a, b) => {
        const scoreA = teamScores[a] || 0;
        const scoreB = teamScores[b] || 0;
        const timeA = teamTimes[a] || 0;
        const timeB = teamTimes[b] || 0;

        if (scoreB !== scoreA) {
           return scoreB - scoreA; // Sort by score descending
        }
        return timeB - timeA; // If scores are equal, sort by time remaining descending
     });
     const top3 = sortedTeams.slice(0, 3);
     
     return (
       <div className="fixed inset-0 z-50 bg-[#120614]/95 flex items-center justify-center p-4 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden">
          <div className="bg-white border-[12px] border-amber-500/20 rounded-[3rem] lg:rounded-[5rem] p-6 lg:p-10 max-w-4xl w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col h-[90vh] max-h-[900px]">
             <div className="shrink-0 mb-6 pt-2">
                <h2 className="text-4xl font-[1000] text-slate-900 italic tracking-tighter uppercase leading-none mb-6 border-b-4 border-amber-500 pb-2 inline-block">Ranking</h2>
                
                {/* Podiums */}
                <div className="flex items-end justify-center gap-4 mb-6 h-44 relative px-4">
                   {/* 2nd Place */}
                   {top3[1] && (
                     <div className="flex flex-col items-center flex-1 animate-in slide-in-from-bottom-10 duration-700">
                        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-2xl mb-2 border-4 border-slate-300 shadow-lg relative shrink-0">🥈
                           <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-400 rounded-full flex items-center justify-center text-[10px] text-white font-black">2</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl w-full text-center">
                           <p className="text-lg font-black text-slate-800 truncate mb-1">{top3[1]}</p>
                           <p className="text-lg font-[1000] text-slate-500 italic leading-none">{teamScores[top3[1]] || 0} / {questionsPerTeam}</p>
                        </div>
                     </div>
                   )}

                   {/* 1st Place */}
                   {top3[0] && (
                     <div className="flex flex-col items-center flex-[1.2] relative z-10 animate-in slide-in-from-bottom-20 duration-1000">
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-3xl mb-3 border-4 border-amber-500 shadow-2xl shadow-amber-500/30 relative shrink-0">🥇
                           <div className="absolute -top-3 -right-3 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-xs text-white font-black shadow-lg">1</div>
                        </div>
                        <div className="bg-amber-500 p-3 rounded-2xl w-full text-center shadow-xl border-4 border-white text-white">
                           <p className="text-2xl font-black truncate mb-0.5 uppercase tracking-tight">{top3[0]}</p>
                           <p className="text-2xl font-[1000] italic leading-none drop-shadow-md">{teamScores[top3[0]] || 0} / {questionsPerTeam}</p>
                        </div>
                     </div>
                   )}

                   {/* 3rd Place */}
                   {top3[2] && (
                     <div className="flex flex-col items-center flex-1 animate-in slide-in-from-bottom-5 duration-500">
                        <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-xl mb-2 border-4 border-orange-300 shadow-lg relative shrink-0">🥉
                           <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center text-[10px] text-white font-black">3</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 p-2 rounded-xl w-full text-center">
                           <p className="text-base font-black text-orange-800 truncate mb-1">{top3[2]}</p>
                           <p className="text-base font-[1000] text-orange-500 italic leading-none">{teamScores[top3[2]] || 0} / {questionsPerTeam}</p>
                        </div>
                     </div>
                   )}
                </div>
             </div>

             {/* Remaining Teams Grid */}
             <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar grid grid-cols-2 gap-2 content-start auto-rows-min">
                {sortedTeams.slice(3).map((t, idx) => (
                   <div key={t} className="flex items-center justify-between p-3 px-5 rounded-xl border bg-slate-50 border-slate-100 text-slate-600 transition-all">
                      <div className="flex items-center gap-4">
                         <span className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs bg-slate-200 text-slate-500">{idx + 4}</span>
                         <span className="text-xl font-black uppercase tracking-tight truncate max-w-[180px]">{t}</span>
                      </div>
                       <div className="flex items-center gap-4">
                          <div className="text-right">
                             <span className="text-xl font-[1000] italic block leading-none text-amber-500">{teamScores[t] || 0} / {questionsPerTeam}</span>
                             <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">{teamTimes[t] || 0}s LEFT</span>
                          </div>
                       </div>
                   </div>
                ))}
             </div>

             <button onClick={() => setGameState('setup')} className="shrink-0 w-full py-6 rounded-[2.5rem] bg-slate-900 text-white font-[1000] text-2xl uppercase tracking-widest shadow-2xl hover:bg-amber-600 hover:scale-[1.02] transition-all">대시보드</button>
          </div>
       </div>
     );
  }

  const currentQ = teamQuestions[currentIdx];

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col h-full animate-in fade-in py-3 text-slate-900 font-sans overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-6 bg-white border border-slate-200 rounded-2xl py-4 shadow-sm min-h-[90px]">
        <button onClick={() => setGameState('setup')} className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-rose-500 transition-all">← 나가기</button>
        <div className="text-center">
           <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 italic">{teams[currentTeamIdx]} Active</p>
            <h2 className="text-2xl font-[1000] text-slate-900 uppercase italic tracking-tighter">스피드게임</h2>
        </div>
        <div className="flex flex-col items-center border-l-4 border-slate-100 pl-6">
           <div className={`text-4xl font-mono font-black ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`}>{timeLeft}S</div>
            <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 italic">남은 시간</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-[3rem] lg:rounded-[4rem] border border-slate-100 shadow-xl relative overflow-hidden">
         <div className="mb-8 text-center relative z-10 w-full px-10">
            <span className="text-sm font-black text-slate-300 uppercase tracking-[0.4em] mb-3 block italic">Question ({currentIdx + 1} / {questionsPerTeam})</span>
             <h3 className={`text-3xl lg:text-4xl font-[1000] tracking-tighter leading-none italic uppercase px-4 drop-shadow-sm border-y-2 border-slate-50 py-16 min-h-[160px] flex flex-col items-center justify-center transition-colors duration-300 ${isRevealing ? (revealStatus === 'correct' ? 'text-emerald-500' : 'text-rose-500') : 'text-rose-900'}`}>
                {currentQ?.q}
                {isRevealing && (
                   <div className={`mt-8 text-xl lg:text-2xl font-black px-6 py-4 rounded-2xl animate-in zoom-in-75 duration-200 ${revealStatus === 'correct' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-emerald-500/20 shadow-lg' : 'bg-rose-100 text-rose-500 border border-rose-200 shadow-rose-500/20 shadow-lg'}`}>
                      정답: {currentQ?.a}
                   </div>
                )}
             </h3>
         </div>

         <div className="w-full grid grid-cols-2 gap-6 relative z-10 px-10">
            <button onClick={() => handleChoice('correct')} disabled={isRevealing}
               className={`py-10 rounded-[2.5rem] font-[1000] text-3xl shadow-2xl transition-all flex flex-col items-center gap-2 uppercase ${isRevealing ? (revealStatus === 'correct' ? 'bg-emerald-500 text-white scale-105 z-10 shadow-emerald-500/50 ring-4 ring-emerald-300 ring-offset-4' : 'bg-slate-100 text-slate-300 opacity-50 scale-95') : 'bg-emerald-500 text-white hover:scale-105 active:scale-95'}`}>
               <span className="text-3xl lg:text-5xl">✓</span>
                <span>정답 (CORRECT)</span>
            </button>
            <button onClick={() => handleChoice('pass')} disabled={isRevealing}
               className={`py-10 rounded-[2.5rem] font-[1000] text-3xl shadow-2xl transition-all flex flex-col items-center gap-2 uppercase ${isRevealing ? (revealStatus === 'pass' ? 'bg-rose-500 text-white scale-105 z-10 shadow-rose-500/50 ring-4 ring-rose-300 ring-offset-4' : 'bg-slate-100 text-slate-300 opacity-50 scale-95') : 'bg-rose-500 text-white hover:scale-105 active:scale-95'}`}>
               <span className="text-3xl lg:text-5xl">➜</span>
                <span>패스 (PASS)</span>
            </button>
         </div>

         <div className="absolute top-6 lg:p-10 right-10 text-center opacity-30">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">SUCCESS</span>
            <div className="text-3xl lg:text-5xl font-mono font-black text-amber-500">{score}</div>
         </div>
      </div>
    </div>
  );
}
