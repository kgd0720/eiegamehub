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

  const handleDownloadTemplate = () => {
    const wsData = [
      ["질문 (Question)", "정답 (Answer)"],
      ["What is the capital of South Korea?", "Seoul"],
      ["Which fruit is red and crunchy?", "Apple"],
      ["How many legs does a spider have?", "8"]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Speed_Quiz_List");
    XLSX.writeFile(wb, "speed_template.xlsx");
  };

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
        data.forEach((row, idx) => {
           if (!row) return;
           const q = String(row[0] !== undefined && row[0] !== null ? row[0] : '').trim();
           const a = String(row[1] !== undefined && row[1] !== null ? row[1] : '').trim();
           
           // 헤더 행 필터링 (첫 번째 행에 '질문', '정답', 'Question' 등의 키워드가 있으면 스킵)
           if (idx === 0 && (q.includes('질문') || q.includes('문제') || q.includes('Question'))) return;

           // 첫 번째 열(문제)이 존재하는 경우에만 데이터 추가 (두 번째 열인 답이 빈 칸이어도 추가)
           if (q.length > 0) {
              imported.push({ q, a });
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
  };

  const totalSteps = 3;
  const step1Done = !!matchMode;
  const step2Done = questionsPerTeam > 0 && timeLimit > 0;
  const step3Done = questions.length >= questionsPerTeam && (matchMode === 'team' ? teams.length >= 2 : teams.length >= 1);
  const isReady = step2Done && step3Done;

  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const getButtonText = () => {
    if (questions.length < questionsPerTeam) return `문항 ${questionsPerTeam - questions.length}개 더 필요`;
    if (matchMode === 'team' && teams.length < 2) return "팀을 등록해주세요 (최소 2팀)";
    if (matchMode === 'single' && teams.length < 1) return "참가자를 등록해주세요";
    return "START MISSION ▶";
  };

  if (gameState === 'setup') {
    return (
      <div className="max-w-[1160px] mx-auto w-[75%] h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1 no-print overflow-hidden min-h-0">
        {/* Header with Title and Global Progress */}
        <div className="flex items-center justify-between mb-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
           <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-2xl shadow-lg text-white">⚡</div>
              <div>
                <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 leading-none mb-1">스피드게임 설정</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">High-Energy Speed Hub</p>
              </div>
           </div>
           
           {/* Step Navigation Bar */}
           <div className="hidden md:flex items-center gap-8 mr-10">
              {[
                { label: '대전 모드', done: step1Done },
                { label: '미션 설정', done: step2Done },
                { label: '데이터 등록', done: step3Done }
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all
                    ${s.done ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20' : 
                      (i === completedSteps ? 'border-amber-500 text-amber-500 animate-pulse' : 'border-slate-200 text-slate-300')}`}>
                    {s.done ? '✓' : i + 1}
                  </div>
                  <span className={`text-[11px] font-[1000] uppercase tracking-widest ${s.done ? 'text-slate-900' : 'text-slate-300'}`}>
                    {s.label}
                  </span>
                  {i < 2 && <div className="w-8 h-px bg-slate-100 mx-2" />}
                </div>
              ))}
           </div>

           <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-100 rounded-full">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isReady ? 'bg-emerald-500' : 'bg-orange-500'}`} />
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none">
                {isReady ? '준비완료' : '설정 진행중'}
              </span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-stretch flex-1 overflow-hidden custom-scrollbar-light pb-10 lg:pb-0 min-h-0">
          <div className="col-span-1 lg:col-span-9 flex flex-col gap-2 overflow-visible lg:overflow-hidden min-h-0">
            {/* Step 1 & 2 Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
                {/* Mode Selection Cards */}
                <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm flex flex-col transition-all duration-300 ${matchMode ? 'border-amber-500 ring-4 ring-amber-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <label className="text-[11px] font-[1000] text-amber-900 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full">STEP 01. 대전 모드 선택</label>
                    {step1Done && <span className="text-emerald-500 text-sm">✓</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setMatchMode('single')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                        ${matchMode === 'single' ? 'bg-amber-500 border-amber-600 text-white shadow-xl shadow-amber-500/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200'}`}>
                      <span className={`text-2xl transition-transform group-hover:scale-110 ${matchMode === 'single' ? 'grayscale-0' : 'grayscale'}`}>👤</span>
                      <span className="text-[12px] font-black">개인전</span>
                      <span className={`text-[10px] font-bold ${matchMode === 'single' ? 'text-amber-100' : 'text-slate-300'}`}>참가자 VS 진행자</span>
                    </button>
                    <button onClick={() => setMatchMode('team')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                        ${matchMode === 'team' ? 'bg-amber-500 border-amber-600 text-white shadow-xl shadow-amber-500/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200'}`}>
                      <span className={`text-2xl transition-transform group-hover:scale-110 ${matchMode === 'team' ? 'grayscale-0' : 'grayscale'}`}>👥</span>
                      <span className="text-[12px] font-black">단체전</span>
                      <span className={`text-[10px] font-bold ${matchMode === 'team' ? 'text-amber-100' : 'text-slate-300'}`}>팀 간 기록 대결</span>
                    </button>
                  </div>
                </div>

                {/* Mission Config settings */}
                <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm flex flex-col transition-all duration-300 ${step2Done ? 'border-amber-500 ring-4 ring-amber-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[11px] font-[1000] text-amber-900 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full">STEP 02. 미션 상세 설정</label>
                    <span className="text-[10px] font-black text-slate-400">CONFIG CARD</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-3">
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">출제 문항 수</span>
                          <span className="text-xl font-[1000] italic text-amber-600 leading-none mt-1">{questionsPerTeam} Q/Team</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <button onClick={() => setQuestionsPerTeam(Math.max(2, questionsPerTeam - 2))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-900 font-black text-xl shadow-sm hover:border-amber-500 transition-all active:scale-95">－</button>
                          <button onClick={() => setQuestionsPerTeam(Math.min(30, questionsPerTeam + 2))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-900 font-black text-xl shadow-sm hover:border-amber-500 transition-all active:scale-95">＋</button>
                       </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">제한 시간 (SECONDS)</p>
                      <div className="grid grid-cols-6 gap-1.5">
                        {[30, 60, 90, 120, 150, 180].map(t => (
                          <button key={t} onClick={() => setTimeLimit(t)}
                            className={`py-1.5 rounded-lg text-[11px] font-black border-2 transition-all
                              ${timeLimit === t ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-300 hover:border-amber-200'}`}>
                            {t}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            {/* Step 3: Registration Section */}
            <div className={`flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-h-0`}>
               {/* Question Data Catalog Card */}
               <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm min-h-0 flex-1 flex flex-col transition-all duration-300 ${questions.length >= questionsPerTeam ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[12px] font-[1000] text-amber-700 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full shrink-0">퀴즈 데이터 관리</h3>
                    <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-black uppercase ${questions.length >= questionsPerTeam ? 'text-emerald-500' : 'text-slate-300'}`}>{questions.length} / {questionsPerTeam}</span>
                       <button onClick={() => setQuestions([])} className="text-[10px] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase">✕ 비우기</button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-col gap-2 custom-scrollbar-light shadow-inner min-h-0">
                    {questions.length === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-slate-200 rounded-2xl py-8">
                        <span className="text-3xl mb-2 grayscale">⚡</span>
                        <p className="text-sm font-black uppercase tracking-widest italic leading-none mb-2 text-center text-slate-400">Excel needed</p>
                        <p className="text-[10px] font-bold text-slate-300 text-center">엑셀 파일을 업로드하여 문항을 로드해 주세요</p>
                      </div>
                    ) : (
                      questions.slice(0, 50).map((q, idx) => (
                        <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:border-amber-300 transition-all animate-in slide-in-from-left-2">
                           <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter shrink-0 bg-amber-50 px-2 rounded-md">Q{idx+1}</span>
                              <span className="text-xs font-black text-slate-800 truncate">{q.q}</span>
                           </div>
                           <div className="flex items-center gap-2 pl-1">
                              <span className="text-[9px] font-black text-emerald-500 uppercase">A.</span>
                              <span className="text-[10px] font-bold text-slate-400 truncate">{q.a}</span>
                           </div>
                        </div>
                      ))
                    )}
                    {questions.length > 50 && (
                      <div className="text-center py-2 text-[10px] font-black text-slate-300 uppercase italic">... {questions.length - 50} more questions ...</div>
                    )}
                  </div>
               </div>

               {/* Team Participant List Registration */}
               <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm min-h-0 flex flex-col transition-all duration-300 ${teams.length >= (matchMode === 'team' ? 2 : 1) ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[12px] font-[1000] text-amber-700 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full shrink-0">참가 명단 등록</h3>
                    <button onClick={() => setTeams([])} className="text-[10px] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase">✕ 초기화</button>
                  </div>
                  <div className="flex gap-2 mb-4 shrink-0">
                    <input value={newTeam} onChange={e => setNewTeam(e.target.value)} 
                       onKeyDown={e => { if(e.key === 'Enter' && newTeam.trim()) { handleAddTeam(); } }}
                       placeholder={matchMode === "team" ? "팀 또는 분원명..." : "참여자 이름..."} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500 font-bold text-sm shadow-inner" />
                    <button onClick={() => handleAddTeam()} className="px-5 rounded-xl bg-amber-500 text-white font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-lg">+</button>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 shrink-0 flex flex-wrap content-start gap-2 custom-scrollbar-light shadow-inner min-h-[160px]">
                    {teams.length === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-slate-200 rounded-2xl py-8">
                        <span className="text-2xl mb-2 grayscale">👥</span>
                        <p className="text-[10px] font-black uppercase tracking-widest italic text-center">No participants</p>
                      </div>
                    ) : (
                      teams.map((t, idx) => (
                        <div key={idx} className="h-10 rounded-xl border bg-white border-slate-200 text-slate-700 px-3 flex items-center gap-2 font-black text-sm shadow-sm hover:border-amber-500 transition-all animate-in zoom-in-95 group">
                           <span className="text-amber-500/40 italic">#T{idx+1}</span> <span>{t}</span>
                           <button onClick={() => setTeams(teams.filter((_, i) => i !== idx))} className="w-6 h-6 rounded-full bg-slate-50 text-slate-300 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center text-[10px]">✕</button>
                        </div>
                      ))
                    )}
                  </div>
               </div>
            </div>
          </div>

          {/* Right Status Panel */}
          <div className="col-span-1 lg:col-span-3 flex flex-col gap-2 overflow-visible lg:overflow-hidden">
             <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="mb-6">
                  <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" /> SETTING STATUS
                  </h2>
                  <div className="flex items-end justify-between mb-2">
                    <p className="text-4xl font-[1000] italic tracking-tighter text-amber-600 leading-none">{progressPercent}%</p>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">설정 완료율</p>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700 shadow-lg" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  {[
                    { label: '대전 모드 선택', done: step1Done },
                    { label: '미션 상세 설정', done: step2Done },
                    { label: '데이터/명단 등록', done: step3Done }
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
                    <h3 className="text-[10px] font-[1000] text-amber-600 uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-amber-500 rounded-sm" /> MISSION GUIDE
                    </h3>
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">게임소개</p>
                        <p className="text-[11px] font-bold text-slate-600 leading-snug tracking-tighter">진행자가 제시어의 정오답을 클릭하여 점수를 쌓는 스피드 퀴즈</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">진행방법</p>
                        <p className="text-[11px] font-bold text-slate-600 leading-snug tracking-tighter">문항수 설정 후 엑셀 데이터를 로드하고 참가팀과 함께 시작</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex gap-2 mb-3 shrink-0">
                     <button onClick={handleDownloadTemplate} className="flex-1 py-3 text-[10px] font-black text-yellow-900 bg-yellow-400 border border-yellow-500 rounded-xl hover:bg-yellow-500 hover:shadow-lg transition-all uppercase tracking-widest leading-none">Template 📥</button>
                     <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 text-[10px] font-black text-white bg-slate-900 rounded-xl hover:bg-black transition-all uppercase tracking-widest leading-none">Excel Upload 📂</button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                  
                  <button onClick={() => startRound()} 
                    disabled={!isReady}
                    className={`w-full py-5 rounded-[2rem] font-[1000] text-xl transition-all shadow-2xl relative overflow-hidden group
                      ${isReady ? 'bg-orange-500 text-white hover:scale-105 active:scale-95 shadow-orange-500/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                    <span className="relative z-10">{getButtonText()}</span>
                    {isReady && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    )}
                  </button>
                  <p className="text-[9px] font-bold text-slate-300 text-center mt-4 uppercase tracking-[0.2em] leading-none">
                    * {questionsPerTeam}개 이상의 문항과 등록된 이름이 필요합니다
                  </p>
                </div>
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
             <h3 className={`text-3xl lg:text-4xl font-[1000] tracking-tighter leading-none italic px-4 drop-shadow-sm border-y-2 border-slate-50 py-16 min-h-[160px] flex flex-col items-center justify-center transition-colors duration-300 ${isRevealing ? (revealStatus === 'correct' ? 'text-emerald-500' : 'text-rose-500') : 'text-rose-900'}`}>
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
