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

  const handleDownloadTemplate = () => {
    const wsData = [
      ["질문 (Question)", "보기1 (Choice1)", "보기2 (Choice2)", "보기3 (Choice3)", "보기4 (Choice4)", "정답번호 (1~4)"],
      ["What is the capital of South Korea?", "Seoul", "Tokyo", "Beijing", "Bangkok", 1],
      ["Which fruit is known for having seeds on the outside?", "Apple", "Strawberry", "Orange", "Banana", 2]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Quiz_List");
    XLSX.writeFile(wb, "quiz_template.xlsx");
  };

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


  const totalSteps = 3;
  const step1Done = !!matchMode;
  const step2Done = maxQuestions > 0 && initialTime > 0;
  const step3Done = questions.length >= maxQuestions && (matchMode === 'team' ? teams.length >= 2 : teams.length >= 1);
  const isReady = step2Done && step3Done;

  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const getButtonText = () => {
    if (questions.length < maxQuestions) return `단어 ${maxQuestions - questions.length}개 더 필요`;
    if (matchMode === 'team' && teams.length < 2) return "팀을 등록해주세요 (최소 2팀)";
    if (matchMode === 'single' && teams.length < 1) return "참가자를 등록해주세요";
    return "START MISSION ▶";
  };

  if (gameState === 'setup') {
    return (
      <div className="max-w-screen-2xl mx-auto w-full px-4 h-[calc(100vh-100px)] flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1 no-print overflow-hidden min-h-0">
        {/* Header with Title and Global Progress */}
        <div className="flex items-center justify-between mb-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
           <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-2xl shadow-lg text-white font-serif">?</div>
              <div>
                <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 leading-none mb-1">퀴즈맞추기 설정</h1>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest leading-none">High-Energy Quiz Hub</p>
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
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-black border-2 transition-all
                    ${s.done ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20' : 
                      (i === completedSteps ? 'border-rose-500 text-rose-500 animate-pulse' : 'border-slate-200 text-slate-300')}`}>
                    {s.done ? '✓' : i + 1}
                  </div>
                  <span className={`text-[0.6875rem] font-[1000] uppercase tracking-widest ${s.done ? 'text-slate-900' : 'text-slate-300'}`}>
                    {s.label}
                  </span>
                  {i < 2 && <div className="w-8 h-px bg-slate-100 mx-2" />}
                </div>
              ))}
           </div>

           <div className="flex items-center gap-2 px-4 py-1.5 bg-rose-50 border border-rose-100 rounded-full">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isReady ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-[0.625rem] font-black text-rose-600 uppercase tracking-widest leading-none">
                {isReady ? '준비완료' : '설정 진행중'}
              </span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-2 items-stretch flex-1 overflow-y-auto custom-scrollbar-light pb-10 lg:pb-0 min-h-0">
          <div className="col-span-1 lg:col-span-7 flex flex-col gap-2 overflow-visible lg:overflow-y-auto min-h-0">
            {/* Step 1 & 2 Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
                {/* Mode Selection Cards */}
                <div className={`bg-white border rounded-[2.5rem] px-6 py-4 shadow-sm flex flex-col transition-all duration-300 ${matchMode ? 'border-rose-500 ring-4 ring-rose-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <label className="text-[0.6875rem] font-[1000] text-rose-900 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full">STEP 01. 대전 모드 선택</label>
                    {step1Done && <span className="text-emerald-500 text-sm">✓</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setMatchMode('single')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                        ${matchMode === 'single' ? 'bg-rose-500 border-rose-600 text-white shadow-xl shadow-rose-500/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-rose-200'}`}>
                      <span className={`text-2xl transition-transform group-hover:scale-110 ${matchMode === 'single' ? 'grayscale-0' : 'grayscale'}`}>👤</span>
                      <span className="text-[0.75rem] font-black">개인전</span>
                      <span className={`text-[0.625rem] font-bold ${matchMode === 'single' ? 'text-rose-100' : 'text-slate-300'}`}>참가자 VS 진행자</span>
                    </button>
                    <button onClick={() => setMatchMode('team')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                        ${matchMode === 'team' ? 'bg-rose-500 border-rose-600 text-white shadow-xl shadow-rose-500/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-rose-200'}`}>
                      <span className={`text-2xl transition-transform group-hover:scale-110 ${matchMode === 'team' ? 'grayscale-0' : 'grayscale'}`}>👥</span>
                      <span className="text-[0.75rem] font-black">단체전</span>
                      <span className={`text-[0.625rem] font-bold ${matchMode === 'team' ? 'text-rose-100' : 'text-slate-300'}`}>팀 간 기록 대결</span>
                    </button>
                  </div>
                </div>

                {/* Mission Config settings */}
                <div className={`bg-white border rounded-[2.5rem] px-6 py-4 shadow-sm flex flex-col transition-all duration-300 ${step2Done ? 'border-rose-500 ring-4 ring-rose-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[0.6875rem] font-[1000] text-rose-900 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full">STEP 02. 미션 상세 설정</label>
                    <span className="text-[0.625rem] font-black text-slate-400">CONFIG CARD</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-3">
                       <div className="flex flex-col">
                          <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest">출제 문항 수</span>
                          <span className="text-xl font-[1000] italic text-rose-600 leading-none mt-1">{maxQuestions} Quizzes</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <button onClick={() => setMaxQuestions(Math.max(2, maxQuestions - 2))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-900 font-black text-xl shadow-sm hover:border-rose-500 transition-all active:scale-95">－</button>
                          <button onClick={() => setMaxQuestions(Math.min(30, maxQuestions + 2))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-900 font-black text-xl shadow-sm hover:border-rose-500 transition-all active:scale-95">＋</button>
                       </div>
                    </div>

                    <div>
                      <p className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">제한 시간 (SECONDS)</p>
                      <div className="grid grid-cols-6 gap-1.5">
                        {[30, 60, 90, 120, 150, 180].map(t => (
                          <button key={t} onClick={() => { setInitialTime(t); setTimeLeft(t); }}
                            className={`py-1.5 rounded-lg text-[0.6875rem] font-black border-2 transition-all
                              ${initialTime === t ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-300 hover:border-rose-200'}`}>
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
               {/* Quiz Data Stats Card */}
               <div className={`bg-white border rounded-[2.5rem] px-6 py-4 shadow-sm min-h-0 flex-1 flex flex-col transition-all duration-300 ${questions.length >= maxQuestions ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[0.75rem] font-[1000] text-rose-700 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full shrink-0">퀴즈 데이터 관리</h3>
                    <div className="flex items-center gap-2">
                       <span className={`text-[0.625rem] font-black uppercase ${questions.length >= maxQuestions ? 'text-emerald-500' : 'text-slate-300'}`}>{questions.length} / {maxQuestions}</span>
                       <button onClick={() => setQuestions([])} className="text-[0.625rem] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase">✕ 비우기</button>
                    </div>
                  </div>
                  
                  <div className="flex-1 max-h-[60vh] overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-col gap-2 custom-scrollbar-light shadow-inner min-h-0">
                    {questions.length === 0 ? (
                      <div className="w-full h-[calc(100vh-100px)] flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-slate-200 rounded-2xl py-8">
                        <span className="text-3xl mb-2 grayscale">📂</span>
                        <p className="text-sm font-black uppercase tracking-widest italic leading-none mb-2 text-center text-slate-400">Excel needed</p>
                        <p className="text-[0.625rem] font-bold text-slate-300 text-center">엑셀 파일을 업로드하여 퀴즈를 로드해 주세요</p>
                      </div>
                    ) : (
                      questions.slice(0, 50).map((q, idx) => (
                        <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:border-rose-300 transition-all animate-in slide-in-from-left-2">
                           <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[0.625rem] font-black text-rose-500 uppercase tracking-tighter shrink-0 bg-rose-50 px-2 rounded-md">Q{idx+1}</span>
                              <span className="text-xs font-black text-slate-800 truncate">{q.question}</span>
                           </div>
                           <div className="grid grid-cols-2 gap-1 px-1">
                              {q.choices.map((c, ci) => (
                                <div key={ci} className={`text-[0.5625rem] truncate font-bold ${q.answer === ci ? 'text-emerald-500' : 'text-slate-300'}`}>
                                   {['①','②','③','④'][ci]} {c}
                                </div>
                              ))}
                           </div>
                        </div>
                      ))
                    )}
                    {questions.length > 50 && (
                      <div className="text-center py-2 text-[0.625rem] font-black text-slate-300 uppercase italic">... {questions.length - 50} more questions ...</div>
                    )}
                  </div>
               </div>

               {/* Participant List Registration */}
               <div className={`bg-white border rounded-[2.5rem] px-6 py-4 shadow-sm min-h-0 flex flex-col transition-all duration-300 ${teams.length >= (matchMode === 'team' ? 2 : 1) ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[0.75rem] font-[1000] text-rose-700 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full shrink-0">참가 명단 등록</h3>
                    <button onClick={() => setTeams([])} className="text-[0.625rem] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase">✕ 초기화</button>
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
                             setScore(s => ({...s, [name]: 0})); 
                             setNewTeam(''); 
                          } 
                       }}
                       placeholder={matchMode === "team" ? "팀 또는 분원명..." : "참여자 이름..."} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-rose-500 font-bold text-sm shadow-inner" />
                    <button onClick={() => { 
                       if(newTeam.trim()) { 
                          const name = newTeam.trim();
                          if (teams.includes(name)) {
                             alert("이미 등록된 이름입니다.");
                             return;
                          }
                          setTeams([...teams, name]); 
                          setScore(s => ({...s, [name]: 0})); 
                          setNewTeam(''); 
                       } 
                    }} className="px-5 rounded-xl bg-rose-500 text-white font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-lg">+</button>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 shrink-0 flex flex-wrap content-start gap-2 custom-scrollbar-light shadow-inner min-h-[160px]">
                    {teams.length === 0 ? (
                      <div className="w-full h-[calc(100vh-100px)] flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-slate-200 rounded-2xl py-8">
                        <span className="text-2xl mb-2 grayscale">👤</span>
                        <p className="text-[0.625rem] font-black uppercase tracking-widest italic text-center">No participants</p>
                      </div>
                    ) : (
                      teams.map((t, idx) => (
                        <div key={idx} className="h-10 rounded-xl border bg-white border-slate-200 text-slate-700 px-3 flex items-center gap-2 font-black text-sm shadow-sm hover:border-rose-500 transition-all animate-in zoom-in-95 group">
                           <span className="text-rose-500/40 italic">#T{idx+1}</span> <span>{t}</span>
                           <button onClick={() => setTeams(teams.filter((_, i) => i !== idx))} className="w-6 h-6 rounded-full bg-slate-50 text-slate-300 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center text-[0.625rem]">✕</button>
                        </div>
                      ))
                    )}
                  </div>
               </div>
            </div>
          </div>

          {/* Right Status Panel */}
          <div className="col-span-1 lg:col-span-3 flex flex-col gap-2 overflow-visible lg:overflow-y-auto">
             <div className="bg-white border border-slate-200 rounded-[2.5rem] px-6 py-4 shadow-sm flex flex-col h-full overflow-y-auto">
  <input type="checkbox" id="setting-accordion-QuizGame" className="peer hidden" />
  <label htmlFor="setting-accordion-QuizGame" className="mb-6 cursor-pointer lg:cursor-default flex items-center justify-between">
    <h2 className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50" /> SETTING STATUS
                  </h2>
    <span className="text-slate-400 peer-checked:rotate-180 transition-transform lg:hidden">▼</span>
  </label>
  <div className="hidden peer-checked:flex lg:!flex flex-col flex-1">
    <div className="mb-6">
                  <div className="flex items-end justify-between mb-2">
                    <p className="text-4xl font-[1000] italic tracking-tighter text-rose-600 leading-none">{progressPercent}%</p>
                    <p className="text-[0.625rem] font-black text-slate-300 uppercase tracking-widest leading-none">설정 완료율</p>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-700 shadow-lg" style={{ width: `${progressPercent}%` }} />
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
                        <p className={`text-[0.6875rem] font-black uppercase tracking-widest ${s.done ? 'text-emerald-700' : 'text-slate-400'}`}>{s.label}</p>
                        <p className={`text-[0.5625rem] font-bold ${s.done ? 'text-emerald-500' : 'text-slate-300 italics'}`}>{s.done ? 'Ready' : 'Pending'}</p>
                      </div>
                      {s.done && <span className="text-emerald-500 font-black">✓</span>}
                    </div>
                  ))}

                  <div className="mt-4 w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] p-4 text-left shadow-inner">
                    <h3 className="text-[0.625rem] font-[1000] text-rose-600 uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-rose-500 rounded-sm" /> MISSION GUIDE
                    </h3>
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest mb-0.5">게임소개</p>
                        <p className="text-[0.6875rem] font-bold text-slate-600 leading-snug tracking-tighter">엑셀로 출제된 지식 서바이벌 4지선다 퀴즈 게임</p>
                      </div>
                      <div>
                        <p className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest mb-0.5">진행방법</p>
                        <p className="text-[0.6875rem] font-bold text-slate-600 leading-snug tracking-tighter">모드 및 문항수 설정 후 엑셀 파일을 업로드하고 시작</p>
                      </div>
                    </div>
                  </div>
                </div>

  </div> {/* End accordion content */}
          </div>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 -mx-4 -mb-1 mt-auto z-50 flex flex-col items-center shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
           <div className="w-full max-w-4xl mx-auto">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 mb-3 shrink-0">
                     <button onClick={handleDownloadTemplate} className="flex-1 py-3 text-[0.625rem] font-black text-yellow-900 bg-yellow-400 border border-yellow-500 rounded-xl hover:bg-yellow-500 hover:shadow-lg transition-all uppercase tracking-widest leading-none">Template 📥</button>
                     <button onClick={() => fileRef.current?.click()} className="flex-1 py-3 text-[0.625rem] font-black text-white bg-slate-900 rounded-xl hover:bg-black transition-all uppercase tracking-widest leading-none">Excel Upload 📂</button>
                  </div>
                  <input type="file" ref={fileRef} className="hidden" accept=".xlsx,.xls" onChange={handleExcel} />
                  
                  <button onClick={() => handleStart()} 
                    disabled={!isReady}
                    className={`w-full py-5 rounded-[2rem] font-[1000] text-xl transition-all shadow-2xl relative overflow-hidden group
                      ${isReady ? 'bg-rose-600 text-white hover:scale-105 active:scale-95 shadow-rose-600/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                    <span className="relative z-10">{getButtonText()}</span>
                    {isReady && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    )}
                  </button>
                  <p className="text-[0.5625rem] font-bold text-slate-300 text-center mt-4 uppercase tracking-[0.2em] leading-none">
                    * {maxQuestions}개 이상의 문항과 등록된 이름이 필요합니다
                  </p>
                </div>
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
                           <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-400 rounded-full flex items-center justify-center text-[0.625rem] text-white font-black">2</div>
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
                           <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center text-[0.625rem] text-white font-black">3</div>
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
                             <span className="text-[0.5rem] font-black uppercase tracking-widest text-slate-300">{teamTimes[t] || 0}s LEFT</span>
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
    <div className="max-w-6xl mx-auto w-full h-[calc(100vh-100px)] flex flex-col py-2 font-sans animate-in fade-in overflow-hidden">
       <div className="flex items-center justify-between mb-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[90px] shrink-0">
          <button onClick={() => setGameState('setup')} className="px-5 py-2.5 rounded-xl bg-slate-50 text-slate-400 font-black text-[0.625rem] uppercase tracking-widest border border-slate-100 hover:text-rose-500 transition-all">← 나가기</button>
          <div className="text-center">
             <p className="text-[0.625rem] font-black text-rose-500 uppercase tracking-widest mb-1 italic">팀 대결</p>
             <h2 className="text-2xl font-[1000] text-slate-900 uppercase italic tracking-tighter border-b-2 border-rose-500 pb-1 leading-none">{teams[currentTeamIdx]} TEAM</h2>
          </div>
          <div className="flex flex-col items-center border-l-4 border-slate-100 pl-8">
             <div className={`text-4xl font-mono font-black border-slate-100 leading-none ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-900'}`}>{fmt(timeLeft)}</div>
             <div className="text-[0.5625rem] font-black text-slate-300 uppercase tracking-widest mt-1 italic">제한 시간</div>
          </div>
       </div>

       <div className="flex-1 flex flex-col bg-white border border-slate-100 p-8 lg:p-12 rounded-[3rem] lg:rounded-[4rem] text-center shadow-xl justify-center relative overflow-hidden mb-6">
          <div className="absolute top-6 lg:top-8 left-6 lg:left-8 px-5 py-3 bg-rose-50 rounded-2xl flex items-center justify-center shadow-inner border border-rose-100 flex-col">
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Question</span>
             <span className="text-2xl font-[1000] text-rose-500 italic leading-none">{currentIdx + 1} <span className="text-base text-rose-300">/ {activeQuestions.length}</span></span>
          </div>
          <h2 className="text-2xl lg:text-5xl font-[1000] text-rose-900 italic tracking-tighter break-words leading-tight px-10 mt-28 lg:mt-12">{q?.question}</h2>
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
                  <span className={`block text-[0.625rem] font-black uppercase mb-3 italic tracking-widest relative z-10 ${isAnswering ? 'text-white/80' : 'text-slate-400'}`}>보기 {['A','B','C','D'][i]}</span>
                  <p className="text-2xl font-[1000] italic tracking-tight leading-none truncate relative z-10">{c}</p>
                  
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
          <p className="text-[0.625rem] font-black text-slate-300 uppercase tracking-[1em] italic">Select one of four choices before time runs out</p>
       </div>
    </div>
  );
}
