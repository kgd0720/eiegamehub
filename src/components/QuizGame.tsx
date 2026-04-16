import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

type Question = {
  question: string;
  choices: string[];
  answer: number; // 0, 1, 2, 3
};

export default function QuizGame() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'done' | 'ranking'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState<Record<string, number>>({});
  const [teamTimes, setTeamTimes] = useState<Record<string, number>>({});
  const [teams, setTeams] = useState<string[]>([]);
  const [newTeam, setNewTeam] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [initialTime, setInitialTime] = useState(60);
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [matchMode, setMatchMode] = useState<'single' | 'team'>('team');
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const list: Question[] = [];
        XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1).forEach(row => {
          if (row[0] && row[1]) {
            list.push({
              question: String(row[0]),
              choices: [String(row[1]), String(row[2]), String(row[3]), String(row[4])],
              answer: parseInt(row[5]) - 1 // Assume column 6 has 1, 2, 3, or 4
            });
          }
        });
        const sorted = list.sort(() => Math.random() - 0.5); setQuestions(sorted); if (sorted.length >= maxQuestions && (matchMode === "team" ? teams.length >= 2 : teams.length >= 1)) { handleStart(sorted); }
        alert(`${list.length}개의 퀴즈를 불러왔습니다.`);
      } catch { alert('엑셀 형식을 확인해 주세요. (질문, 1, 2, 3, 4, 정답번호)'); }
    };
    reader.readAsBinaryString(f);
    if(e.target) e.target.value = '';
  };

  useEffect(() => {
    let timer: any;
    if (gameState === 'playing') {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState]);

  useEffect(() => {
    if (timeLeft === 0 && gameState === 'playing') {
      const activeTeam = teams[currentTeamIdx];
      setTeamTimes(prev => ({ ...prev, [activeTeam]: 0 }));
      setGameState('done');
    }
  }, [timeLeft, gameState, currentTeamIdx, teams]);

  const handleChoiceClick = (idx: number) => {
    if (isAnswering) return;
    setSelectedChoice(idx);
    setIsAnswering(true);
    
    const correct = activeQuestions[currentIdx].answer === idx;
    if (correct) {
      setScore(prev => ({ ...prev, [teams[currentTeamIdx]]: (prev[teams[currentTeamIdx]] || 0) + 1 }));
    }

    setTimeout(() => {
      const next = currentIdx + 1;
      if (next < activeQuestions.length) {
        setSelectedChoice(null);
        setIsAnswering(false);
        setCurrentIdx(next);
      } else {
        const activeTeam = teams[currentTeamIdx];
        setTeamTimes(prev => ({ ...prev, [activeTeam]: timeLeft }));
        setGameState('done');
      }
    }, 600);
  };

  const handleStart = (customQuestions?: Question[]) => {
     const qList = customQuestions || questions; 
     if (qList.length < maxQuestions || (matchMode === "team" ? teams.length < 2 : teams.length < 1)) return;
     setScore(teams.reduce((acc, t) => ({ ...acc, [t]: 0 }), {})); 
     setTeamTimes(teams.reduce((acc, t) => ({ ...acc, [t]: 0 }), {})); 
     prepareRound(0, qList);
  };

  const prepareRound = (idx: number, qList?: Question[]) => {
      const source = qList || questions;
     setActiveQuestions([...source].sort(() => Math.random() - 0.5).slice(0, maxQuestions));
     setCurrentIdx(0);
     setTimeLeft(initialTime);
     setCurrentTeamIdx(idx);
     setSelectedChoice(null);
     setIsAnswering(false);
     setGameState('playing');
  }

  const handleNextStep = () => {
     if (currentTeamIdx < teams.length - 1) {
        prepareRound(currentTeamIdx + 1);
     } else {
        setGameState('ranking');
     }
  }

  const isReady = questions.length >= maxQuestions && (matchMode === 'team' ? teams.length >= 2 : teams.length >= 1);

  if (gameState === 'setup') {
    return (
      <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1 overflow-hidden min-h-0">
        <div className="flex items-center justify-between mb-2 bg-white border border-slate-200 rounded-2xl px-6 py-2 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-2xl shadow-lg text-white">❓</div>
               <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 border-l-4 border-rose-500 pl-3 leading-none">퀴즈맞추기 설정</h1>
           </div>
           <div className="flex items-center gap-2 px-4 py-1.5 bg-rose-50 border border-rose-100 rounded-full">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none">멀티플레이 활성화</span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch flex-1 overflow-y-auto lg:overflow-hidden custom-scrollbar-light pb-10 lg:pb-0 min-h-0">
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-3 overflow-visible lg:overflow-hidden min-h-0">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[300px] shrink-0">
                {/* Left Column: Match Mode + Questions Count */}
                <div className="col-span-1 lg:col-span-7 flex flex-col gap-3 h-full">
                   <div className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm flex items-center gap-8 justify-between">
                    <label className="text-[14px] font-[1000] text-rose-800 uppercase tracking-widest shrink-0">대전 모드 설정</label>
                    <div className="flex-1 max-w-lg flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
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
                   <div className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm flex items-center gap-8 justify-between">
                    <label className="text-[14px] font-[1000] text-rose-800 uppercase tracking-widest shrink-0">출제 문항 수 (2~30)</label>
                    <div className="flex-1 max-w-lg flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-2 shadow-inner">
                       <button onClick={() => setMaxQuestions(Math.max(2, maxQuestions - 2))} className="w-12 h-12 rounded-lg bg-white border border-slate-200 font-black text-xl shadow-sm">－</button>
                       <span className="flex-1 text-center text-4xl font-[1000] italic text-rose-500 tabular-nums">{maxQuestions}</span>
                       <button onClick={() => setMaxQuestions(Math.min(30, maxQuestions + 2))} className="w-12 h-12 rounded-lg bg-white border border-slate-200 font-black text-xl shadow-sm">＋</button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Time Limit */}
                <div className="col-span-1 lg:col-span-5 bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm flex flex-col justify-center">
                   <label className="text-[11px] font-[1000] text-rose-800 uppercase tracking-widest mb-3 block text-center">제한 시간 (TIME LIMIT)</label>
                    <div className="grid grid-cols-2 gap-2 flex-1 items-stretch">
                       {[30, 60, 90, 120, 150, 180].map(t => (
                         <button key={t} onClick={() => { setInitialTime(t); setTimeLeft(t); }}
                           className={`rounded-2xl text-xl font-[1000] border-2 transition-all flex items-center justify-center ${initialTime === t ? 'bg-rose-500 border-rose-500 text-white shadow-xl shadow-rose-500/20' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                           {t}s
                         </button>
                       ))}
                    </div>
                </div>
             </div>

             <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm min-h-0 grid grid-rows-[auto_auto_minmax(0,1fr)]">
                <div className="flex items-center justify-between mb-4 align-top">
                    <h2 className="text-xl font-[1000] italic uppercase tracking-widest text-slate-900 border-l-4 border-rose-500 pl-4 leading-none underline decoration-rose-500/20 underline-offset-8">{matchMode === "team" ? "단체전 명단 (최소 2팀)" : "참가자 이름"}</h2>
                   <button onClick={() => setTeams([])} className="px-4 py-2 bg-rose-50 text-rose-500 border border-rose-100 rounded-lg text-[10px] font-black uppercase shadow-sm leading-none">✕ 목록 초기화</button>
                </div>
                <div className="flex gap-2 mb-4 align-top">
                   <input value={newTeam} onChange={e => setNewTeam(e.target.value)} 
                      onKeyDown={e => { if(e.key === 'Enter') { if(newTeam.trim()) { setTeams([...teams, newTeam.trim()]); setScore(s => ({...s, [newTeam.trim()]: 0})); setNewTeam(''); } } }}
                      placeholder={matchMode === "team" ? "참가 팀 또는 분원 이름..." : "참가자 이름 입력..."} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-2.5 text-slate-900 focus:outline-none focus:border-rose-500 font-black text-lg shadow-inner min-w-0" />
                   <button onClick={() => { if(newTeam.trim()) { setTeams([...teams, newTeam.trim()]); setScore(s => ({...s, [newTeam.trim()]: 0})); setNewTeam(''); } }} className="px-8 rounded-xl bg-rose-500 text-white font-black text-xl shadow-lg active:scale-95 transition-all outline-none shadow-rose-500/30 flex-shrink-0">+</button>
                </div>
                <div className="overflow-y-auto bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-wrap content-start gap-2 custom-scrollbar-light shadow-inner">
                   {teams.map((t, i) => (
                      <div key={i} className="h-9 rounded-xl border-2 bg-white border-slate-200 text-slate-700 px-4 flex items-center gap-3 font-black text-sm shadow-sm">
                         <span className="text-rose-500/40 italic">#T{i+1}</span> {t}
                         <button onClick={() => setTeams(teams.filter((_, idx) => idx !== i))} className="text-rose-300 hover:text-rose-500 text-xl ml-1">✕</button>
                      </div>
                   ))}
                   {teams.length === 0 && <p className="w-full text-center py-10 text-slate-200 font-black italic uppercase tracking-widest leading-none">{matchMode === "team" ? "Register Teams First" : "Register Name First"}</p>}
                </div>
             </div>
          </div>

          <div className="col-span-1 lg:col-span-4 flex flex-col gap-3 overflow-visible lg:overflow-hidden">
             <div className="bg-white border border-slate-200 rounded-[2rem] p-5 shadow-sm flex flex-col h-full items-center text-center overflow-hidden">
                <div className="flex items-center gap-5 mb-3 w-full px-2">
                   <div className="w-14 h-14 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-center shrink-0 shadow-lg relative">
                      <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center text-2xl shadow-xl text-white font-serif">?</div>
                   </div>
                   <div className="text-left flex-1">
                      <h2 className={`text-2xl font-[1000] tracking-tighter italic transition-colors leading-none mb-1.5 ${isReady ? 'text-rose-500' : 'text-slate-200'}`}>
                         {isReady ? '준비완료' : '준비중'}
                      </h2>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Status Report</p>
                   </div>
                </div>

                <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 mb-3 text-left shadow-inner font-black">
                   <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 text-[9px] uppercase tracking-widest leading-none">제한 시간</span>
                      <span className="text-slate-900 text-lg italic leading-none">{initialTime} SEC</span>
                   </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                       <span className="text-slate-400 text-[9px] uppercase tracking-widest leading-none">출제 문항</span>
                       <span className="text-rose-600 text-lg leading-none">{maxQuestions} Q</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                       <span className="text-slate-400 text-[9px] uppercase tracking-widest leading-none">등록 문제</span>
                       <span className="text-slate-600 text-base italic leading-none">{questions.length} Quizzes</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-slate-400 text-[9px] uppercase tracking-widest leading-none underline decoration-rose-200">참가 인원</span>
                       <span className={`text-base leading-none ${teams.length >= 2 ? 'text-emerald-500' : 'text-rose-500'}`}>{teams.length} Teams</span>
                    </div>
                </div>

                 <div className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] p-4 mb-auto text-left shadow-inner">
                    <h3 className="text-[10px] font-[1000] text-rose-600 uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                       <span className="w-1.5 h-3 bg-rose-500 rounded-sm" /> MISSION GUIDE
                    </h3>
                    <div className="space-y-2.5">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">게임소개</p>
                          <p className="text-[11px] font-bold text-slate-600 leading-tight">제한시간 내 출제한 문제(4지선다)를 빠르게 맞추는 게임</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">진행방법</p>
                          <p className="text-[11px] font-bold text-slate-600 leading-tight">대전모드, 제한시간, 참가자이름, 엑셀파일 등록 후 시작</p>
                       </div>
                    </div>
                 </div>

                <div className="w-full mb-1.5">
                   <button onClick={() => fileRef.current?.click()} className="w-full py-4 bg-slate-900 text-white rounded-[1.2rem] text-lg font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">
                      <span className="text-lg">📂</span> 엑셀 업로드
                   </button>
                   <input type="file" ref={fileRef} className="hidden" accept=".xlsx,.xls" onChange={handleExcel} />
                </div>

                <button onClick={() => handleStart()} disabled={!isReady}
                  className={`w-full py-4 mt-1 rounded-[1.2rem] font-[1000] text-xl transition-all shadow-2xl ${isReady ? 'bg-rose-500 text-white hover:scale-105 active:scale-95 shadow-rose-500/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                  {isReady ? '게임 시작' : '설정을 완료해 주세요'}
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'done') {
    const isLastTeam = currentTeamIdx === teams.length - 1;
    return (
      <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in duration-500 overflow-hidden">
         <div className="bg-white border-[12px] border-rose-500/20 rounded-[3rem] lg:rounded-[5rem] p-8 lg:p-16 max-w-lg w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
            <div className="w-24 h-24 bg-rose-500 rounded-[2rem] flex items-center justify-center text-3xl lg:text-5xl mb-6 shadow-2xl text-white italic">🎯</div>
            <h2 className="text-3xl lg:text-5xl font-[1000] text-slate-900 italic tracking-tighter uppercase leading-none border-b-4 border-rose-500 pb-2 mb-4">라운드 종료</h2>
            <p className="text-2xl font-black text-rose-500 mb-2 uppercase tracking-tight">{teams[currentTeamIdx]} TEAM</p>
            <p className="text-xl font-black text-slate-400 mb-10 uppercase tracking-[0.4em]">성공: <span className="text-rose-600 text-3xl ml-3">{score[teams[currentTeamIdx]] || 0} / {maxQuestions}</span></p>
            
            <div className="flex flex-col gap-3 w-full">
              {isLastTeam ? (
                <button onClick={handleNextStep} className="w-full py-6 rounded-3xl bg-rose-500 text-white font-[1000] text-2xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">최종 순위 발표</button>
              ) : (
                <button onClick={handleNextStep} className="w-full py-6 rounded-3xl bg-emerald-500 text-white font-[1000] text-2xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">다음 팀 (Next Team)</button>
              )}
              <button onClick={() => setGameState('setup')} className="w-full py-6 rounded-3xl bg-slate-100 text-slate-400 font-[1000] text-xl uppercase tracking-widest hover:bg-slate-200 transition-all">대시보드</button>
            </div>
         </div>
      </div>
    );
  }

  if (gameState === 'ranking') {
    const sortedTeams = [...teams].sort((a, b) => {
       const scoreA = score[a] || 0;
       const scoreB = score[b] || 0;
       const timeA = teamTimes[a] || 0;
       const timeB = teamTimes[b] || 0;
       
       if (scoreA !== scoreB) return scoreB - scoreA;
       return timeB - timeA;
    });
    const top3 = sortedTeams.slice(0, 3);

    return (
       <div className="fixed inset-0 z-50 bg-[#120614]/95 flex items-center justify-center p-4 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden">
          <div className="bg-white border-[12px] border-rose-500/20 rounded-[3rem] lg:rounded-[5rem] p-6 lg:p-10 max-w-4xl w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col h-[90vh] max-h-[900px]">
             <div className="shrink-0 mb-6 pt-2">
                <h2 className="text-4xl font-[1000] text-slate-900 italic tracking-tighter uppercase leading-none mb-6 border-b-4 border-rose-500 pb-2 inline-block">Ranking</h2>
                
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
                           <p className="text-lg font-[1000] text-slate-500 italic leading-none">{score[top3[1]] || 0} / {maxQuestions}</p>
                        </div>
                     </div>
                   )}

                   {/* 1st Place */}
                   {top3[0] && (
                     <div className="flex flex-col items-center flex-[1.2] relative z-10 animate-in slide-in-from-bottom-20 duration-1000">
                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-3xl mb-3 border-4 border-rose-500 shadow-2xl shadow-rose-500/30 relative shrink-0">🥇
                           <div className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-xs text-white font-black shadow-lg">1</div>
                        </div>
                        <div className="bg-rose-500 p-3 rounded-2xl w-full text-center shadow-xl border-4 border-white text-white">
                           <p className="text-2xl font-black truncate mb-0.5 uppercase tracking-tight">{top3[0]}</p>
                           <p className="text-2xl font-[1000] italic leading-none drop-shadow-md">{score[top3[0]] || 0} / {maxQuestions}</p>
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
                           <p className="text-base font-[1000] text-orange-500 italic leading-none">{score[top3[2]] || 0} / {maxQuestions}</p>
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
                             <span className="text-xl font-[1000] italic block leading-none text-rose-500">{score[t] || 0} / {maxQuestions}</span>
                             <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">{teamTimes[t] || 0}s LEFT</span>
                          </div>
                       </div>
                   </div>
                ))}
             </div>
             <button onClick={() => setGameState('setup')} className="shrink-0 w-full py-6 rounded-[2.5rem] bg-slate-900 text-white font-[1000] text-2xl uppercase tracking-widest shadow-2xl hover:bg-rose-600 hover:scale-[1.02] transition-all">대시보드</button>
          </div>
       </div>
    );
  }

  const q = activeQuestions[currentIdx];
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-6xl mx-auto w-full h-full flex flex-col py-2 font-sans animate-in fade-in overflow-hidden">
       <div className="flex items-center justify-between mb-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[90px] shrink-0">
          <button onClick={() => setGameState('setup')} className="px-5 py-2.5 rounded-xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border border-slate-100 hover:text-rose-500 transition-all">← 나가기</button>
          <div className="text-center">
             <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 italic">팀 대결</p>
             <h2 className="text-2xl font-[1000] text-slate-900 uppercase italic tracking-tighter border-b-2 border-rose-500 pb-1 leading-none">{teams[currentTeamIdx]} TEAM</h2>
          </div>
          <div className="flex flex-col items-center border-l-4 border-slate-100 pl-8">
             <div className={`text-4xl font-mono font-black border-slate-100 leading-none ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-900'}`}>{fmt(timeLeft)}</div>
             <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 italic">제한 시간</div>
          </div>
       </div>

       <div className="flex-1 flex flex-col bg-white border border-slate-100 p-8 lg:p-12 rounded-[3rem] lg:rounded-[4rem] text-center shadow-xl justify-center relative overflow-hidden mb-6">
          <div className="absolute top-6 lg:top-8 left-6 lg:left-8 px-5 py-3 bg-rose-50 rounded-2xl flex items-center justify-center shadow-inner border border-rose-100 flex-col">
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Question</span>
             <span className="text-2xl font-[1000] text-rose-500 italic leading-none">{currentIdx + 1} <span className="text-base text-rose-300">/ {activeQuestions.length}</span></span>
          </div>
          <h2 className="text-2xl lg:text-5xl font-[1000] text-rose-900 italic tracking-tighter break-words leading-tight uppercase px-10 mt-28 lg:mt-12">{q?.question}</h2>
       </div>

       <div className="grid grid-cols-2 gap-4 shrink-0 px-4 mb-4">
          {q?.choices.map((c, i) => {
             const isCorrect = q.answer === i;
             const isWrong = selectedChoice === i && !isCorrect;
             
             return (
               <button key={i} onClick={() => handleChoiceClick(i)} disabled={isAnswering}
                 className={`p-8 border-4 rounded-[2.5rem] text-center shadow-xl relative overflow-hidden transition-all duration-300
                   ${isAnswering 
                      ? (isCorrect ? 'bg-emerald-500 border-emerald-400 text-white scale-105 z-10 shadow-emerald-500/30' 
                         : (isWrong ? 'bg-rose-500 border-rose-400 text-white scale-95 opacity-90' : 'bg-slate-50 border-slate-100 text-slate-300 opacity-40'))
                      : 'bg-white border-slate-100 text-slate-700 hover:border-rose-500 hover:bg-rose-50/50 hover:-translate-y-1'}`}>
                  <span className={`block text-[10px] font-black uppercase mb-3 italic tracking-widest relative z-10 ${isAnswering ? 'text-white/80' : 'text-slate-400'}`}>보기 {['A','B','C','D'][i]}</span>
                  <p className="text-2xl font-[1000] uppercase italic tracking-tight leading-none truncate relative z-10">{c}</p>
                  
                  {isAnswering && isCorrect && (
                     <>
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none scale-[2]">
                           <span className="text-8xl drop-shadow-xl text-emerald-100">⭕</span>
                        </div>
                        <div className="absolute top-4 right-5 px-3 py-1.5 bg-white text-emerald-500 rounded-xl text-sm font-black uppercase shadow-lg animate-bounce z-20 whitespace-nowrap">정답 ✓</div>
                     </>
                  )}
                  {isAnswering && isWrong && (
                     <>
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none scale-[2]">
                           <span className="text-8xl drop-shadow-xl text-rose-100">❌</span>
                        </div>
                        <div className="absolute top-4 right-5 px-3 py-1.5 bg-white text-rose-500 rounded-xl text-sm font-black uppercase shadow-lg z-20 whitespace-nowrap opacity-90">오답 ✕</div>
                     </>
                  )}
               </button>
             );
          })}
       </div>
       
       <div className="mt-2 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[1em] italic">Select one of four choices before time runs out</p>
       </div>
    </div>
  );
}
