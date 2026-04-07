import { useState, useEffect } from 'react';

interface Question {
  level: number;
  q: string;
  choices: string[];
  answer: number;
}

export default function WordLevel({ onBack, maxLevel = 11 }: { onBack: () => void, maxLevel?: number }) {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'interstitial' | 'result'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [playerInfo, setPlayerInfo] = useState({ name: '', grade: '' });
  
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelQuestions, setLevelQuestions] = useState<Question[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  
  const [levelScore, setLevelScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [matchMode, setMatchMode] = useState<'single' | 'team'>('single');



  useEffect(() => {
    let timer: any;
    if (gameState === 'playing' && timeLeft > 0) {
       timer = setInterval(() => {
          setTimeLeft(prev => prev - 1);
       }, 1000);
    } else if (gameState === 'playing' && timeLeft <= 0) {
       setGameState('interstitial');
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  // 컴포넌트 마운트 시 본사에서 올린 데이터 가져오기
  // 컴포넌트 마운트 시 본사에서 올린 데이터 가져오기
  useEffect(() => {
     import('../../lib/api').then(api => {
        api.getWordLevels().then(parsed => {
           if (parsed && Array.isArray(parsed) && parsed.length > 0) {
              setQuestions(parsed);
           } else {
              // Try localstorage fallback
              try {
                const stored = localStorage.getItem('eie_word_level_dict');
                if (stored) {
                  const p = JSON.parse(stored);
                  if (Array.isArray(p) && p.length > 0) {
                     setQuestions(p);
                  }
                }
              } catch(e) {}
           }
        });
     }).catch(err => {
        console.error("API Fetch Error:", err);
     });
  }, []);

  const startLevel = (lvl: number) => {
     const qForLvl = questions.filter(q => q.level === lvl);
     if (qForLvl.length === 0) {
        alert(`레벨 ${lvl}의 문제 데이터가 부족합니다.`);
        setGameState('result');
        return;
     }

     // 랜덤으로 최대 20문제 추출 (데이터가 부족하면 있는 만큼만 사용, 요청사항엔 20문제라고 되어있음)
     const shuffled = [...qForLvl].sort(() => Math.random() - 0.5).slice(0, 20);
     setLevelQuestions(shuffled);
     setCurrentLevel(lvl);
     setCurrentQIdx(0);
     setLevelScore(0);
     setSelectedChoice(null);
     setIsAnswering(false);
     setTimeLeft(180);
     setGameState('playing');
  };

  const handleStart = () => {
    if (!playerInfo.name.trim() || !playerInfo.grade.trim()) {
       alert('학생 이름과 학년을 모두 선택 및 입력해 주세요.');
       return;
    }
    setTotalScore(0);
    startLevel(1);
  };

  const handleChoice = (idx: number) => {
    if (isAnswering) return;
    setSelectedChoice(idx);
    setIsAnswering(true);

    const isCorrect = levelQuestions[currentQIdx].answer === idx;
    if (isCorrect) {
       setLevelScore(prev => prev + 1);
       setTotalScore(prev => prev + 1);
    }

    setTimeout(() => {
       const next = currentQIdx + 1;
       if (next < levelQuestions.length) {
          setSelectedChoice(null);
          setIsAnswering(false);
          setCurrentQIdx(next);
       } else {
          // 레벨 종료 확인
          setIsAnswering(false);
          setGameState('interstitial');
       }
    }, 600);
  };

  const handleNextLevelFlow = () => {
     // 18문제 이상 맞춰야 다음 단계: 예외로 전체 문제가 20문제가 안되는 테스트 상황 고려
     const passThreshold = Math.min(18, Math.floor(levelQuestions.length * 0.9)); 
     const passed = levelScore >= passThreshold;

     if (passed) {
        if (currentLevel >= Math.min(11, maxLevel)) {
           // 제한된 레벨까지 클리어
           setGameState('result');
        } else {
           startLevel(currentLevel + 1);
        }
     } else {
        // 통과 실패 -> 종료
        setGameState('result');
     }
  };

  if (gameState === 'setup') {
    const isReady = questions.length > 0;
    
    return (
      <div className="max-w-4xl mx-auto w-full h-full flex flex-col pt-8 pb-12 font-sans animate-in fade-in text-slate-900 px-4">
        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-2xl flex flex-col items-center">
           <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-inner border border-indigo-100">📈</div>
           <h1 className="text-4xl lg:text-5xl font-[1000] italic uppercase tracking-tighter text-indigo-900 mb-2 leading-none">단어 레벨 테스트</h1>
           <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mb-12 text-center">도전! 단어 인증 마스터</p>

           <div className="w-full max-w-xl bg-indigo-50 border border-indigo-100 rounded-[2rem] p-8 mb-8 space-y-6 shadow-sm">
              <div className="grid grid-cols-2 gap-6 mb-4"><div className="space-y-2">
                  <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest px-2">대전 모드</label>
                  <div className="flex bg-white border border-indigo-100 p-1 rounded-2xl shadow-sm">
                    <button onClick={() => setMatchMode('single')}
                      className={`flex-1 py-3 rounded-xl font-black text-base transition-all ${matchMode === 'single' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-300 hover:text-slate-500'}`}>
                      개인전
                    </button>
                    <button onClick={() => setMatchMode('team')}
                      className={`flex-1 py-3 rounded-xl font-black text-base transition-all ${matchMode === 'team' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-300 hover:text-slate-500'}`}>
                      단체전
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                 <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest px-2">학생 이름 (Name)</label>
                 <input type="text" value={playerInfo.name} onChange={e => setPlayerInfo({...playerInfo, name: e.target.value})} 
                   className="w-full bg-white border border-indigo-100 px-6 py-4 rounded-2xl text-lg font-black focus:outline-none focus:border-indigo-500 shadow-sm" placeholder={matchMode === "team" ? "팀 이름 입력" : "학생 이름 입력"} />
                </div>
              </div>
              <div className="space-y-4 pt-4">
                 <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest px-2">학년 선택 (Grade)</label>
                 <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3'].map(g => (
                       <button key={g} onClick={() => setPlayerInfo({...playerInfo, grade: g})} 
                          className={`py-3 rounded-2xl font-black text-lg transition-all shadow-sm border ${playerInfo.grade === g ? 'bg-indigo-500 text-white border-indigo-500 shadow-xl shadow-indigo-500/30 scale-105' : 'bg-white text-slate-400 border-indigo-100 hover:border-indigo-300'}`}>
                          {g}
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           {questions.length === 0 && (
              <div className="w-full max-w-xl bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 text-orange-600 font-bold text-center text-sm shadow-sm flex items-center justify-center gap-3">
                 <span className="text-xl">⚠️</span> 본사 데이터가 단말에 캐싱되지 않았습니다.
              </div>
           )}

           <div className="w-full max-w-xl flex gap-4">
              <button onClick={onBack} className="px-8 py-5 rounded-[2rem] bg-slate-100 text-slate-500 font-black text-lg uppercase shadow-sm hover:bg-slate-200 transition-all">뒤로가기</button>
              <button onClick={handleStart} disabled={!isReady} 
                className={`flex-1 py-5 rounded-[2rem] font-[1000] text-xl transition-all shadow-xl ${isReady ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02]' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                {isReady ? '테스트 시작하기' : '데이터 준비중'}
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (gameState === 'interstitial') {
     const passThreshold = Math.min(18, Math.floor(levelQuestions.length * 0.9)); 
     const passed = levelScore >= passThreshold;
     
     return (
        <div className="max-w-4xl mx-auto w-full h-full flex items-center justify-center p-4 py-12 animate-in slide-in-from-bottom duration-500 font-sans">
           <div className={`w-full max-w-2xl border-8 rounded-[3rem] p-12 text-center shadow-2xl ${passed ? 'bg-white border-emerald-500' : 'bg-white border-rose-500'}`}>
              <div className="text-[80px] mb-6 drop-shadow-lg">{passed ? '🎉' : '💔'}</div>
              <h2 className={`text-4xl lg:text-5xl font-[1000] tracking-tighter uppercase italic leading-none mb-4 ${passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                 {passed ? 'LEVEL CLEAR!' : 'LEVEL FAILED'}
              </h2>
              <p className="text-2xl font-black text-slate-700 mb-8 uppercase tracking-widest">
                 E{currentLevel} <span className="text-slate-300 mx-2">|</span> 정답: {levelScore} / {levelQuestions.length}
              </p>
              
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl mb-10 text-slate-500 font-bold text-sm">
                 {passed ? '축하합니다! 다음 단계에 도전할 자격을 획득했습니다.' : (timeLeft <= 0 ? '시간이 초과되어 도전이 종료되었습니다. (18문제 이상 정답 필요)' : '아쉽습니다. 다음 단계에 도전하려면 18개 이상 맞혀야 합니다.')}
              </div>

              <button onClick={handleNextLevelFlow} className={`w-full py-6 rounded-full font-[1000] text-2xl uppercase tracking-widest text-white shadow-xl transition-all hover:scale-105 ${passed ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                 {passed ? (currentLevel >= Math.min(11, maxLevel) ? '최대 레벨 도달 (결과 확인)' : '다음 레벨 도전') : '결과 확인하기'}
              </button>
           </div>
        </div>
     );
  }

  if (gameState === 'result') {
     return (
       <div className="fixed inset-0 z-[100] bg-[#120614]/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-700 font-sans">
          <div className="bg-white border-[12px] border-indigo-500/20 rounded-[3rem] p-10 lg:p-14 max-w-xl w-full text-center shadow-2xl relative animate-in zoom-in-95">
             <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-600 rounded-full border-8 border-white flex items-center justify-center text-5xl shadow-xl">🏆</div>
             
             <div className="mt-14 mb-8">
                <h1 className="text-5xl font-[1000] text-slate-900 tracking-tighter italic uppercase leading-none mb-2">도전 결과</h1>
                <p className="text-indigo-500 font-black uppercase tracking-[0.4em] text-sm">Word Level Test Report</p>
             </div>

             <div className="bg-indigo-50 rounded-[2rem] p-8 mb-10 text-left border border-indigo-100 shadow-inner">
                <div className="flex items-end justify-between border-b-2 border-indigo-100 pb-4 mb-4">
                   <span className="text-slate-400 font-black text-xs uppercase tracking-widest">학생 정보</span>
                   <div className="text-right leading-none">
                      <span className="text-2xl font-[1000] text-indigo-900">{playerInfo.name}</span>
                      <span className="text-sm font-black text-indigo-400 ml-2">({playerInfo.grade})</span>
                   </div>
                </div>
                
                <div className="flex items-center justify-between py-2">
                   <span className="text-slate-500 font-black text-sm">최종 도달 레벨</span>
                   <span className="text-3xl font-[1000] italic text-indigo-600">E{currentLevel}</span>
                </div>

                <div className="flex items-center justify-between py-2 mt-2">
                   <span className="text-slate-500 font-black text-sm">학년 수준</span>
                   <span className="text-lg font-[900] text-indigo-500">
                      {currentLevel === 1 ? '초등 1학년 수준' :
                       currentLevel === 2 ? '초등 2학년 수준' :
                       currentLevel === 3 ? '초등 3학년 수준' :
                       currentLevel === 4 ? '초등 4학년 수준' :
                       currentLevel === 5 ? '초등 5학년 수준' :
                       currentLevel === 6 ? '초등 6학년 수준' :
                       currentLevel === 7 ? '중등 1학년 수준' :
                       currentLevel === 8 ? '중등 2학년 수준' :
                       currentLevel === 9 ? '중등 3학년 수준' :
                       currentLevel === 10 ? '고등 1학년 수준' :
                       currentLevel >= 11 ? '고등 2학년 이상 수준' : ''}
                   </span>
                </div>
                
                <div className="flex items-center justify-between py-2 mt-2">
                   <span className="text-slate-500 font-black text-sm">총 획득 점수</span>
                   <span className="text-3xl font-[1000] italic text-orange-500">{totalScore} <span className="text-sm text-orange-300">pts</span></span>
                </div>
             </div>

             <div className="flex gap-4">
                <button onClick={() => setGameState('setup')} className="flex-1 py-5 rounded-[2rem] bg-slate-100 text-slate-400 font-black uppercase tracking-widest text-lg hover:bg-slate-200 transition-all">처음으로</button>
                <button onClick={onBack} className="flex-1 py-5 rounded-[2rem] bg-indigo-600 text-white font-black uppercase tracking-widest text-lg hover:bg-indigo-700 shadow-xl transition-all">대시보드</button>
             </div>
          </div>
       </div>
     );
  }

  const q = levelQuestions[currentQIdx];

  return (
    <div className="max-w-5xl mx-auto w-full h-full flex flex-col py-4 font-sans animate-in fade-in overflow-hidden px-4">
       {/* Header */}
       <div className="flex flex-wrap items-center justify-between mb-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[90px] shrink-0 gap-4">
          <button onClick={() => setGameState('setup')} className="px-5 py-2.5 rounded-xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border border-slate-100 hover:text-indigo-500 transition-all shrink-0">← 중단하기</button>
          
          <div className="flex-1 flex justify-center text-center">
             <div className="flex items-center gap-3 border-b-4 border-indigo-500 pb-1 px-4">
                <p className="text-2xl lg:text-3xl font-[1000] text-indigo-700 italic tracking-tighter leading-none line-clamp-1 break-all">{playerInfo.name}({playerInfo.grade})</p>
                <h2 className="text-2xl lg:text-3xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none line-clamp-1 break-all">E{currentLevel}</h2>
             </div>
          </div>
          
          <div className="flex items-center gap-6 border-l-4 border-slate-100 pl-6 shrink-0">
             <div className="text-center">
                <div className={`text-3xl font-[1000] italic leading-none ${timeLeft <= 60 ? 'text-rose-500 animate-pulse' : 'text-slate-800'}`}>
                   {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Time Left</div>
             </div>
             <div className="text-center border-l-2 border-slate-100 pl-6">
                <div className="text-3xl font-[1000] text-orange-500 italic leading-none">{totalScore}</div>
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Total Score</div>
             </div>
          </div>
       </div>

       {/* Question Area */}
       <div className="flex-1 flex flex-col bg-white border border-slate-100 px-6 py-12 lg:p-14 rounded-[3rem] lg:rounded-[4rem] text-center shadow-xl justify-center relative overflow-hidden mb-8">
          <div className="absolute top-6 lg:top-8 left-6 lg:left-8 px-5 py-3 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-inner border border-indigo-100 flex-col">
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Question</span>
             <span className="text-2xl font-[1000] text-indigo-600 italic leading-none">{currentQIdx + 1} <span className="text-base text-indigo-300">/ {levelQuestions.length}</span></span>
          </div>
          
          <div className="absolute top-6 lg:top-8 right-6 lg:right-8 px-5 py-3 bg-slate-50 rounded-2xl flex items-center justify-center shadow-inner border border-slate-200 flex-col">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">단원 점수</span>
             <span className="text-2xl font-[1000] text-slate-700 italic leading-none">{levelScore} <span className="text-base text-slate-300">/ 20</span></span>
          </div>

          <h2 className="text-2xl lg:text-3xl lg:text-4xl font-[1000] text-rose-900 italic tracking-tighter break-words leading-tight px-4 mt-28 md:mt-12 lg:mt-12">{q?.q}</h2>
       </div>

       {/* Choices Grid */}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0 pb-4">
          {q?.choices.map((c, i) => {
             const isCorrect = q.answer === i;
             const isWrong = selectedChoice === i && !isCorrect;
             
             return (
               <button key={i} onClick={() => handleChoice(i)} disabled={isAnswering}
                 className={`p-6 lg:p-8 border-4 rounded-[2rem] lg:rounded-[2.5rem] flex items-center text-left shadow-xl relative overflow-hidden transition-all duration-300
                   ${isAnswering 
                      ? (isCorrect ? 'bg-emerald-500 border-emerald-400 text-white scale-[1.02] z-10 shadow-emerald-500/30' 
                         : (isWrong ? 'bg-rose-500 border-rose-400 text-white scale-95 opacity-90' : 'bg-slate-50 border-slate-100 text-slate-300 opacity-40'))
                      : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-500 hover:bg-indigo-50/50 hover:-translate-y-1'}`}>
                  
                  <div className="flex items-center w-full gap-4 relative z-10">
                     <span className={`text-4xl lg:text-5xl font-[1000] italic ${isAnswering ? 'text-white/50' : 'text-indigo-200'}`}>
                        {i + 1}
                     </span>
                     <p className="text-2xl lg:text-3xl font-[1000] italic tracking-tight leading-none truncate flex-1">{c}</p>
                  </div>
                  
                  {isAnswering && isCorrect && (
                     <>
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none scale-[2]">
                           <span className="text-8xl drop-shadow-xl text-emerald-100">⭕</span>
                        </div>
                        <div className="absolute top-4 right-5 px-3 py-1.5 bg-white text-emerald-500 rounded-xl text-xs font-black uppercase shadow-lg animate-bounce z-20 whitespace-nowrap">정답 ✓</div>
                     </>
                  )}
                  {isAnswering && isWrong && (
                     <>
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none scale-[2]">
                           <span className="text-8xl drop-shadow-xl text-rose-100">❌</span>
                        </div>
                        <div className="absolute top-4 right-5 px-3 py-1.5 bg-white text-rose-500 rounded-xl text-xs font-black uppercase shadow-lg z-20 whitespace-nowrap opacity-90">오답 ✕</div>
                     </>
                  )}
               </button>
             );
          })}
       </div>
    </div>
  );
}
