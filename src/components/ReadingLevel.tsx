import { useState, useEffect, useRef } from 'react';

interface Question {
   id: string;
   level: number;
   q: string;
   choices: string[];
   answer: number;
}

interface User {
   id: string;
   name: string;
   role: string;
   status: string;
   level: number;
}

interface PlayerInfo {
   name: string;
   grade: string;
}

interface ReadingLevelProps {
   onBack: () => void;
   maxLevel?: number;
   user?: User | null;
}

const GRADES = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3'];

const shuffleArray = (array: any[]) => {
   const arr = [...array];
   for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
   }
   return arr;
};

export default function ReadingLevel({ onBack, maxLevel = 7, user }: ReadingLevelProps) {
   const [questions, setQuestions] = useState<Question[]>([]);
   const [gameState, setGameState] = useState<'setup' | 'playing' | 'interstitial' | 'result'>('setup');
   const [playerInfo, setPlayerInfo] = useState<PlayerInfo>({ name: '', grade: '초1' });
   const [currentLevel, setCurrentLevel] = useState(1);
   const [levelQuestions, setLevelQuestions] = useState<Question[]>([]);
   const [currentQIdx, setCurrentQIdx] = useState(0);
   const [levelScore, setLevelScore] = useState(0);
   const [totalScore, setTotalScore] = useState(0);
   const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
   const [isAnswering, setIsAnswering] = useState(false);

   const getReadingTimeLimit = () => {
      try {
         const stored = localStorage.getItem('eie_time_limit_reading');
         if (stored) return parseInt(stored, 10);
      } catch (e) {}
      return 180;
   };

   const [timeLeft, setTimeLeft] = useState(getReadingTimeLimit());
   const hasSavedResult = useRef(false);
   const nextTimeoutRef = useRef<any>(null);

   useEffect(() => {
      let timer: any;
      if (gameState === 'playing') {
         timer = setInterval(() => {
            setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
         }, 1000);
      }
      return () => clearInterval(timer);
   }, [gameState]);

   useEffect(() => {
      if (gameState === 'playing' && timeLeft <= 0) {
         setGameState('interstitial');
      }
   }, [gameState, timeLeft]);

   useEffect(() => {
      import('../../lib/api').then(api => {
         Promise.all([api.getReadingLevels(), api.getGlobalSettings()]).then(([parsed, settings]) => {
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
               setQuestions(parsed);
            } else {
               try {
                  const stored = localStorage.getItem('eie_reading_level_dict');
                  if (stored) {
                     const p = JSON.parse(stored);
                     if (Array.isArray(p) && p.length > 0) {
                        setQuestions(p);
                     }
                  }
               } catch (e) { }
            }
            if (settings && settings.reading_time_limit) {
               setTimeLeft(settings.reading_time_limit);
               localStorage.setItem('eie_time_limit_reading', String(settings.reading_time_limit));
            }
         });
      }).catch(err => {
         console.error("API Fetch Error:", err);
      });
   }, []);

   useEffect(() => {
      if (gameState === 'result' && !hasSavedResult.current) {
         hasSavedResult.current = true;
         import('../../lib/api').then(api => {
            api.saveReadingLevelResult({
               campus_id: user?.id || 'Unknown',
               campus_name: user?.name || 'Unknown',
               student_name: playerInfo.name,
               grade: playerInfo.grade,
               final_level: currentLevel,
               score: levelScore,
               total_questions: levelQuestions.length || 3
            }).then(success => {
               if (success) console.log('Successfully saved reading level test result.');
            });
         }).catch(err => console.error("Error importing API for saving result:", err));
      }
   }, [gameState, user, playerInfo, currentLevel, levelScore, levelQuestions]);

   const startLevel = (lvl: number) => {
      const qForLvl = questions.filter(q => q.level === lvl);
      if (qForLvl.length === 0) {
         alert(`레벨 ${lvl}의 문제 데이터가 부족합니다.`);
         setGameState('result');
         return;
      }

      // Filter out duplicate questions (same 'q' text)
      const uniqueQMap = new Map();
      qForLvl.forEach(item => {
         const key = String(item.q || '').trim().toLowerCase();
         if (key && !uniqueQMap.has(key)) {
            uniqueQMap.set(key, item);
         }
      });
      const uniqueQList = Array.from(uniqueQMap.values());

      if (uniqueQList.length === 0) {
         alert(`레벨 ${lvl}의 문제 데이터가 부족합니다.`);
         setGameState('result');
         return;
      }

      const shuffled = shuffleArray(uniqueQList).slice(0, 3);
      setLevelQuestions(shuffled);
      setCurrentLevel(lvl);
      setCurrentQIdx(0);
      setLevelScore(0);
      setSelectedChoice(null);
      setIsAnswering(false);
      setTimeLeft(getReadingTimeLimit());
      setGameState('playing');
   };

   const handleStart = () => {
      if (!playerInfo.name.trim() || !playerInfo.grade.trim()) {
         alert('참가자명과 학년을 모두 입력 및 선택해 주세요.');
         return;
      }
      setTotalScore(0);
      startLevel(1);
   };

   const goToNextQuestion = () => {
      const next = currentQIdx + 1;
      if (next < levelQuestions.length) {
         setSelectedChoice(null);
         setIsAnswering(false);
         setCurrentQIdx(next);
      } else {
         setIsAnswering(false);
         setGameState('interstitial');
      }
   };

   const handleForceNext = () => {
      if (nextTimeoutRef.current) {
         clearTimeout(nextTimeoutRef.current);
      }
      goToNextQuestion();
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

      nextTimeoutRef.current = setTimeout(() => {
         goToNextQuestion();
      }, 600);
   };

   const handleNextLevelFlow = () => {
      const passThreshold = 2;
      const passed = levelScore >= passThreshold;

      if (passed) {
         if (currentLevel >= Math.min(12, maxLevel)) {
            setGameState('result');
         } else {
            startLevel(currentLevel + 1);
         }
      } else {
         setGameState('result');
      }
   };

   if (gameState === 'setup') {
      const isReady = questions.length > 0;
      return (
         <div className="w-full h-full min-h-0 flex items-center justify-center p-3 sm:p-6 font-sans animate-in fade-in text-slate-900 overflow-hidden">
            <div className="max-w-[500px] w-full bg-white border border-slate-200 rounded-[2.25rem] shadow-[0_8px_30px_rgba(0,0,0,0.05)] flex flex-col p-5 sm:py-11 sm:px-8 relative gap-4.5 sm:gap-6 justify-center animate-in zoom-in-95 duration-200">
               
               {/* Header */}
               <div className="flex flex-col items-center mb-0.5 sm:mb-1.5">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-emerald-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl mb-2 sm:mb-2.5 shadow-sm border border-emerald-100">📚</div>
                  <h1 className="text-lg sm:text-2xl font-[1000] text-slate-900 mb-0.5 sm:mb-1 tracking-tight">리딩 레벨 테스트</h1>
                  <p className="text-[11px] sm:text-sm font-bold text-slate-500">전국의 <span className="text-emerald-600 font-[1000]">EIE</span> 학생들과 함께하는 독해 실력 검정</p>
               </div>

               {/* Single Unified Card/Flow Structure */}
               <div className="w-full flex flex-col gap-0.5 sm:gap-1">
                  
                  {/* Section 1: Participant Input */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:py-4.5 sm:px-4 mb-2 shadow-sm">
                     <div className="flex items-center gap-2 mb-2 sm:mb-2.5">
                        <span className="text-emerald-500 text-sm">👤</span>
                        <span className="text-xs sm:text-sm font-[1000] text-slate-700">참가자명 입력</span>
                     </div>
                     <input 
                        type="text" 
                        value={playerInfo.name} 
                        onChange={e => setPlayerInfo({ ...playerInfo, name: e.target.value })}
                        className="w-full bg-white border border-slate-200 focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15 outline-none transition-all px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-base font-black text-emerald-950 placeholder:text-slate-400" 
                        placeholder="참가자명을 입력해 주세요" 
                     />
                  </div>

                  {/* Section 2: Grade Selection */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:py-4.5 sm:px-4 mb-2 shadow-sm">
                     <div className="flex items-center gap-2 mb-2 sm:mb-2.5">
                        <span className="text-emerald-500 text-sm">🎓</span>
                        <span className="text-xs sm:text-sm font-[1000] text-slate-700">학년 선택</span>
                     </div>
                     <div className="grid grid-cols-3 gap-2">
                        {GRADES.map(g => {
                           const isSelected = playerInfo.grade === g;
                           return (
                              <button 
                                 key={g} 
                                 onClick={() => setPlayerInfo({ ...playerInfo, grade: isSelected ? '' : g })}
                                 className={`py-2 sm:py-3.25 rounded-lg sm:rounded-xl font-[1000] text-xs sm:text-sm transition-all duration-200 border ${
                                    isSelected 
                                       ? 'bg-[#10B981] text-white border-[#10B981] shadow-sm scale-[1.02]' 
                                       : 'bg-white text-slate-600 border-slate-200 hover:border-[#10B981]/40 hover:bg-slate-50'
                                 }`}
                              >
                                 {g}
                              </button>
                           );
                        })}
                     </div>
                  </div>

                  {/* Start Button */}
                  <button 
                     onClick={handleStart}
                     disabled={!isReady || !playerInfo.name.trim() || !playerInfo.grade}
                     className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-[1000] text-sm sm:text-lg uppercase tracking-widest text-white transition-all duration-300 mt-2 flex items-center justify-center gap-2 ${
                        isReady && playerInfo.name.trim() && playerInfo.grade
                           ? 'bg-[#10B981] hover:scale-[1.02] shadow-[0_3px_12px_rgba(16,185,129,0.35)] cursor-pointer' 
                           : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                     }`}
                  >
                     <span>{isReady ? 'START MISSION →' : 'LOADING DICTIONARY...'}</span>
                  </button>

                  <button 
                     onClick={onBack}
                     className="w-full py-2.5 sm:py-3.5 rounded-xl border border-slate-200 bg-white text-slate-400 font-extrabold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all mt-1"
                  >
                     뒤로 가기
                  </button>
               </div>
            </div>
         </div>
      );
   }

   if (gameState === 'interstitial') {
      const passThreshold = 2;
      const passed = levelScore >= passThreshold;
      return (
         <div className="max-w-4xl mx-auto w-full h-full flex items-center justify-center p-4 py-8 animate-in slide-in-from-bottom duration-500 font-sans">
            <div className={`w-full max-w-2xl border-8 rounded-[3rem] p-8 lg:p-12 text-center shadow-2xl ${passed ? 'bg-white border-emerald-500' : 'bg-white border-rose-500'}`}>
               <div className="text-[64px] mb-4 drop-shadow-lg">{passed ? '🎉' : '💔'}</div>
               <h2 className={`text-3xl lg:text-4xl font-[1000] tracking-tighter uppercase italic leading-none mb-3 ${passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {passed ? 'LEVEL CLEAR!' : 'LEVEL FAILED'}
               </h2>
               <p className="text-xl font-black text-slate-700 mb-6 uppercase tracking-widest">
                  R{currentLevel} <span className="text-slate-300 mx-2">|</span> <span className="whitespace-nowrap">정답: {levelScore} / {levelQuestions.length}</span>
               </p>

               <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl mb-8 text-slate-500 font-bold text-sm">
                  {passed ? '축하합니다! 다음 단계에 도전할 자격을 획득했습니다.' : (timeLeft <= 0 ? '시간이 초과되어 도전이 종료되었습니다. (2문제 이상 정답 필요)' : '아쉽습니다. 다음 단계에 도전하려면 2개 이상 맞혀야 합니다.')}
               </div>

               {passed ? (
                  <button 
                     onClick={handleNextLevelFlow} 
                     className="w-full py-5 rounded-full font-[1000] text-xl uppercase tracking-widest text-white shadow-xl bg-emerald-500 hover:scale-105 transition-all"
                  >
                     {currentLevel >= Math.min(12, maxLevel) ? '최대 레벨 도달 (결과 확인)' : '다음 레벨 도전'}
                  </button>
               ) : (
                  <button 
                     onClick={handleNextLevelFlow} 
                     className="w-full py-5 rounded-full font-[1000] text-xl uppercase tracking-widest text-white shadow-xl bg-rose-500 hover:bg-rose-600 hover:scale-105 transition-all"
                  >
                     결과 확인하기
                  </button>
               )}
            </div>
         </div>
      );
   }

   if (gameState === 'result') {
      return (
         <div className="fixed inset-0 z-[100] bg-[#0c140e]/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-700 font-sans">
            <div className="bg-white border-[12px] border-emerald-500/20 rounded-[3rem] p-10 lg:p-14 max-w-xl w-full text-center shadow-2xl relative animate-in zoom-in-95">
               <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-600 rounded-full border-8 border-white flex items-center justify-center text-5xl shadow-xl">🏆</div>

               <div className="mt-14 mb-8">
                  <h1 className="text-5xl font-[1000] text-slate-900 tracking-tighter italic uppercase leading-none mb-2">도전 결과</h1>
                  <p className="text-emerald-500 font-black uppercase tracking-[0.4em] text-sm">Reading Level Test Report</p>
               </div>

               <div className="bg-emerald-50 rounded-[2rem] p-8 mb-10 text-left border border-emerald-100 shadow-inner">
                  <div className="flex items-end justify-between border-b-2 border-emerald-100 pb-4 mb-4">
                     <span className="text-slate-400 font-black text-xs uppercase tracking-widest">학생 정보</span>
                     <div className="text-right leading-none">
                        <span className="text-2xl font-[1000] text-emerald-900">{playerInfo.name}</span>
                        <span className="text-sm font-black text-emerald-400 ml-2">({playerInfo.grade})</span>
                     </div>
                  </div>

                  <div className="flex items-center justify-between py-2">
                     <span className="text-slate-500 font-black text-sm">최종 도달 레벨</span>
                     <span className="text-3xl font-[1000] italic text-emerald-600">R{currentLevel}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 mt-2">
                     <span className="text-slate-500 font-black text-sm">학년 수준</span>
                     <span className="text-lg font-[900] text-emerald-500">
                        {currentLevel === 1 ? 'R1 수준' :
                           currentLevel === 2 ? 'R2 수준' :
                              currentLevel === 3 ? 'R3 수준' :
                                 currentLevel === 4 ? 'R4 수준' :
                                    currentLevel === 5 ? 'R5 수준' :
                                       currentLevel === 6 ? 'R6 수준' :
                                          currentLevel >= 7 ? 'R7 수준' : ''}
                     </span>
                  </div>

                  <div className="flex items-center justify-between py-2 mt-2">
                     <span className="text-slate-500 font-black text-sm">캠퍼스명</span>
                     <span className="text-lg font-black text-emerald-900">{user?.name || '지정되지 않음'}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 mt-2">
                     <span className="text-slate-500 font-black text-sm">총 획득 점수</span>
                     <span className="text-3xl font-[1000] italic text-orange-500">{totalScore} <span className="text-sm text-orange-300">pts</span></span>
                  </div>
               </div>

               <div className="flex gap-4">
                  <button onClick={() => setGameState('setup')} className="flex-1 py-5 rounded-[2rem] bg-slate-100 text-slate-400 font-black uppercase tracking-widest text-lg hover:bg-slate-200 transition-all">처음으로</button>
                  <button onClick={onBack} className="flex-1 py-5 rounded-[2rem] bg-emerald-600 text-white font-black uppercase tracking-widest text-lg hover:bg-emerald-700 shadow-xl transition-all">대시보드</button>
               </div>
            </div>
         </div>
      );
   }

   const q = levelQuestions[currentQIdx];

   return (
      <div className="max-w-5xl mx-auto w-full h-full flex flex-col py-6 font-sans animate-in fade-in overflow-hidden px-4 justify-center items-center relative gap-5 sm:gap-6">
         
         {/* Header */}
         <div className="w-full sticky top-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl shadow-sm shrink-0 mb-1 flex flex-col overflow-hidden relative">
            
            {/* 1st Row: Stats */}
            <div className="grid grid-cols-5 border-b border-slate-200/80 w-full">
               
               <div className="flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 gap-0.5">
                  <span className="text-[10px] sm:text-xs text-[#888] font-black tracking-tight whitespace-nowrap">이름</span>
                  <span className="text-[13px] sm:text-base md:text-lg font-[900] text-slate-800 whitespace-nowrap leading-none mt-1">{playerInfo.name}</span>
               </div>

               <div className="flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 gap-0.5 border-l border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-[#888] font-black tracking-tight whitespace-nowrap">현재 테스트 레벨</span>
                  <span className="text-[13px] sm:text-base md:text-lg font-[900] text-[#10B981] whitespace-nowrap leading-none mt-1">R{currentLevel}</span>
               </div>

               <div className="flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 gap-0.5 border-l border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-[#888] font-black tracking-tight whitespace-nowrap">남은시간</span>
                  <span className={`text-[13px] sm:text-base md:text-lg font-[900] whitespace-nowrap leading-none mt-1 transition-all duration-300 ${
                     timeLeft <= 10 ? 'text-red-500 animate-pulse-red' : 'text-[#10B981]'
                  }`}>
                     {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
               </div>

               <div className="flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 gap-0.5 border-l border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-[#888] font-black tracking-tight whitespace-nowrap">Progress</span>
                  <span className="text-[13px] sm:text-base md:text-lg font-[900] text-slate-800 whitespace-nowrap leading-none mt-1">{currentQIdx + 1} / {levelQuestions.length}</span>
               </div>

               <div className="flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 gap-0.5 border-l border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-[#888] font-black tracking-tight whitespace-nowrap">Score</span>
                  <span className="text-[13px] sm:text-base md:text-lg font-[900] text-orange-500 whitespace-nowrap leading-none mt-1">{levelScore} / 3</span>
               </div>
            </div>

            {/* 2nd Row: Progress bar */}
            <div className="w-full h-1 bg-slate-50 relative overflow-hidden">
               <div 
                  className="h-full bg-gradient-to-r from-[#10B981] to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQIdx + 1) / levelQuestions.length) * 100}%` }}
               />
            </div>
         </div>

         {/* Gameplay Grid Layout */}
         <div className="w-full flex-1 min-h-0 bg-slate-50 border border-slate-200 rounded-[2.5rem] flex flex-col md:flex-row shadow-inner overflow-hidden max-h-[500px]">
            
            {/* Left Column: Question Screen */}
            <div className="flex-[1.2] flex flex-col p-6 sm:p-10 justify-center items-center bg-white border-b md:border-b-0 md:border-r border-slate-200/80 relative">
               <div className="absolute top-4 left-6 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[10px] sm:text-xs font-black uppercase text-emerald-500 tracking-widest italic">Mission {String(currentQIdx + 1).padStart(2, '0')}</span>
               </div>
               
               <div className="w-full text-center px-4">
                  <h3 className="text-2xl sm:text-4xl md:text-5xl font-[1000] text-[#10B981] leading-tight tracking-tight max-w-[420px] mx-auto break-all py-4">
                     {q?.q}
                  </h3>
               </div>
               
               <button 
                  onClick={handleForceNext} 
                  className="absolute bottom-4 right-6 text-[10px] sm:text-xs font-black text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest"
               >
                  다음 문제 ➔
               </button>
            </div>

            {/* Right Column: Choices Screen */}
            <div className="flex-1 flex flex-col bg-slate-50/50">
               <div className="grid grid-cols-1 grid-rows-4 gap-2.5 p-4 sm:p-6 flex-1 min-h-0">
                  {q?.choices.map((choice, idx) => {
                     const isSelected = selectedChoice === idx;
                     const isAnsweringSelected = isAnswering && isSelected;
                     const isCorrect = q.answer === idx;
                     
                     let btnStyle = "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300";
                     if (isAnsweringSelected) {
                        btnStyle = isCorrect 
                           ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[0.98]" 
                           : "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20 scale-[0.98]";
                     }

                     return (
                        <button
                           key={idx}
                           onClick={() => handleChoice(idx)}
                           disabled={isAnswering}
                           className={`w-full flex flex-row items-center border-2 rounded-2xl px-5 sm:px-6 transition-all duration-200 outline-none text-left font-bold text-xs sm:text-sm md:text-base gap-4 ${btnStyle}`}
                        >
                           <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs sm:text-sm shrink-0 border ${
                              isAnsweringSelected
                                 ? 'bg-white/20 border-white text-white'
                                 : isSelected ? 'bg-emerald-50 border-[#10B981] text-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-400'
                           }`}>
                              {idx + 1}
                           </div>
                           <span className="truncate leading-none py-1">{choice}</span>
                        </button>
                     );
                  })}
               </div>
            </div>
         </div>
      </div>
   );
}
