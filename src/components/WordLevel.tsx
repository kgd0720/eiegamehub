import { useState, useEffect, useRef } from 'react';

interface Question {
   level: number;
   q: string;
   choices: string[];
   answer: number;
}

function shuffleArray<T>(array: T[]): T[] {
   const arr = [...array];
   for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
   }
   return arr;
}

export default function WordLevel({ onBack, maxLevel = 12, user }: { onBack: () => void, maxLevel?: number, user?: any }) {
   const [gameState, setGameState] = useState<'setup' | 'playing' | 'interstitial' | 'result'>('setup');
   const [questions, setQuestions] = useState<Question[]>([]);
   const [playerInfo, setPlayerInfo] = useState({ name: '', campus: '', grade: '' });

   const [currentLevel, setCurrentLevel] = useState(1);
   const [levelQuestions, setLevelQuestions] = useState<Question[]>([]);
   const [currentQIdx, setCurrentQIdx] = useState(0);

   const [levelScore, setLevelScore] = useState(0);
   const [totalScore, setTotalScore] = useState(0);

   const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
   const [isAnswering, setIsAnswering] = useState(false);
   const [timeLeft, setTimeLeft] = useState(180);
   const hasSavedResult = useRef(false);
   const nextTimeoutRef = useRef<any>(null);

   useEffect(() => {
      if (gameState === 'result' && !hasSavedResult.current) {
         hasSavedResult.current = true;
         import('../../lib/api').then(api => {
            api.saveWordLevelResult({
               campus_id: user?.login_id || 'Unknown',
               campus_name: user?.name || 'Unknown',
               student_name: playerInfo.name,
               grade: playerInfo.grade,
               final_level: currentLevel,
               score: levelScore,
               total_questions: levelQuestions.length || 20
            }).then(success => {
               if (success) console.log('Successfully saved word level test result.');
            });
         }).catch(err => console.error("Error importing API for saving result:", err));
      }
   }, [gameState, user, playerInfo, currentLevel, levelScore, levelQuestions]);

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

   useEffect(() => {
      import('../../lib/api').then(api => {
         api.getWordLevels().then(parsed => {
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
               setQuestions(parsed);
            } else {
               try {
                  const stored = localStorage.getItem('eie_word_level_dict');
                  if (stored) {
                     const p = JSON.parse(stored);
                     if (Array.isArray(p) && p.length > 0) {
                        setQuestions(p);
                     }
                  }
               } catch (e) { }
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

      const shuffled = shuffleArray(qForLvl).slice(0, 20);
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
      }, 600); // Super snappy 600ms feedback transition to next question
   };

   const handleNextLevelFlow = () => {
      const passThreshold = Math.min(18, Math.floor(levelQuestions.length * 0.9));
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
         <div className="max-w-[620px] mx-auto w-full h-auto min-h-0 flex flex-col justify-center p-4 font-sans animate-in fade-in text-slate-900 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-2xl flex flex-col py-6 px-5 sm:px-6 w-full max-h-[90vh] overflow-y-auto custom-scrollbar-light relative gap-4">
               
               {/* Header (20% Margins Reduced) */}
               <div className="flex flex-col items-center mb-1">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-lg mb-2 shadow-sm border border-indigo-100">📈</div>
                  <h1 className="text-xl sm:text-2xl font-[1000] text-slate-900 mb-0.5 tracking-tight">단어 레벨 테스트</h1>
                  <p className="text-[11px] font-bold text-slate-500">전국의 <span className="text-indigo-600 font-[1000]">EIE</span> 학생들과 함께하는 실력 검정</p>
               </div>

               {/* Single Unified Card/Flow Structure */}
               <div className="w-full flex flex-col gap-3.5">
                  
                  {/* Section 1: Participant Input (No Labels, Clean Placeholder) */}
                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40">
                     <div className="flex items-center gap-2 mb-2">
                        <span className="text-indigo-500 text-sm">👤</span>
                        <span className="text-xs font-[1000] text-slate-700">참가자명 입력</span>
                     </div>
                     <input 
                        type="text" 
                        value={playerInfo.name} 
                        onChange={e => setPlayerInfo({ ...playerInfo, name: e.target.value })}
                        className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-black focus:outline-none focus:border-indigo-500 shadow-sm text-indigo-900 placeholder:text-slate-400" 
                        placeholder="참가자명을 입력해 주세요 (STUDENT NAME)" 
                     />
                  </div>

                  {/* Section 2: Grade Selection Toggle UI */}
                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40">
                     <div className="flex items-center gap-2 mb-2">
                        <span className="text-indigo-500 text-sm">🎓</span>
                        <span className="text-xs font-[1000] text-slate-700">학년 선택</span>
                     </div>
                     <div className="grid grid-cols-3 gap-2">
                        {['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3'].map(g => {
                           const isSelected = playerInfo.grade === g;
                           return (
                              <button 
                                 key={g} 
                                 onClick={() => setPlayerInfo({ ...playerInfo, grade: isSelected ? '' : g })}
                                 className={`py-2.5 rounded-xl font-black text-xs transition-all duration-200 border ${isSelected ? 'bg-[#4B4EDE] text-white border-[#4B4EDE] shadow-md scale-[1.02]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#4B4EDE]/40 hover:bg-slate-50'}`}
                              >
                                 {g}
                              </button>
                           );
                        })}
                     </div>
                  </div>

                  {questions.length === 0 && (
                     <div className="w-full bg-orange-50 border border-orange-200 rounded-xl p-3 text-orange-600 font-bold text-center text-xs shadow-sm flex items-center justify-center gap-2">
                        <span className="text-lg">⚠️</span> 본사 데이터가 로딩 중입니다...
                     </div>
                  )}

                  {/* Notice box with icons and highlight accent color */}
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 flex items-start gap-2.5 shadow-sm">
                     <span className="text-base text-indigo-600 shrink-0 leading-none mt-0.5">📢</span>
                     <p className="text-[11px] sm:text-[12px] font-black text-indigo-950/90 leading-relaxed break-keep">
                        E1부터 E12까지 총 12단계로 진행되며, 각 단계마다 20문제 중 <span className="text-[#4B4EDE] font-[1000]">18문제 이상</span>을 맞추면 다음 레벨로 넘어갈 수 있습니다.
                     </p>
                  </div>
               </div>

               {/* CTA Buttons - Flex Layout (Left: Prev / Right: Start CTA always prominent) */}
               <div className="w-full flex gap-3 border-t border-slate-100 pt-3 mt-1">
                  <button 
                     onClick={onBack} 
                     className="w-[90px] h-[48px] rounded-xl bg-slate-100 text-slate-500 font-black text-sm flex items-center justify-center hover:bg-slate-200 transition-all shrink-0"
                  >
                     ← 이전
                  </button>
                  <button 
                     onClick={handleStart} 
                     disabled={!isReady || !playerInfo.name.trim() || !playerInfo.grade}
                     className={`flex-1 h-[48px] rounded-xl font-[1000] text-sm flex items-center justify-center gap-2 transition-all ${(isReady && playerInfo.name.trim() && playerInfo.grade) ? 'bg-[#4B4EDE] text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                     ▷ 테스트 시작하기
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
         <div className="max-w-4xl mx-auto w-full h-full flex items-center justify-center p-4 py-8 animate-in slide-in-from-bottom duration-500 font-sans">
            <div className={`w-full max-w-2xl border-8 rounded-[3rem] p-8 lg:p-12 text-center shadow-2xl ${passed ? 'bg-white border-emerald-500' : 'bg-white border-rose-500'}`}>
               <div className="text-[64px] mb-4 drop-shadow-lg">{passed ? '🎉' : '💔'}</div>
               <h2 className={`text-3xl lg:text-4xl font-[1000] tracking-tighter uppercase italic leading-none mb-3 ${passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {passed ? 'LEVEL CLEAR!' : 'LEVEL FAILED'}
               </h2>
               <p className="text-xl font-black text-slate-700 mb-6 uppercase tracking-widest">
                  E{currentLevel} <span className="text-slate-300 mx-2">|</span> <span className="whitespace-nowrap">정답: {levelScore} / {levelQuestions.length}</span>
               </p>

               <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl mb-8 text-slate-500 font-bold text-sm">
                  {passed ? '축하합니다! 다음 단계에 도전할 자격을 획득했습니다.' : (timeLeft <= 0 ? '시간이 초과되어 도전이 종료되었습니다. (18문제 이상 정답 필요)' : '아쉽습니다. 다음 단계에 도전하려면 18개 이상 맞혀야 합니다.')}
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
                        {currentLevel === 1 ? '초3 수준' :
                           currentLevel === 2 ? '초4 수준' :
                              currentLevel === 3 ? '초5 수준' :
                                 currentLevel === 4 ? '초6 수준' :
                                    currentLevel === 5 ? '중1 수준' :
                                       currentLevel === 6 ? '중2 수준' :
                                          currentLevel === 7 ? '중3 수준' :
                                             currentLevel === 8 ? '고1 수준' :
                                                currentLevel === 9 ? '고2 수준' :
                                                   currentLevel === 10 ? '고3 수준' :
                                                      currentLevel === 11 ? '수능기초 수준' : currentLevel >= 12 ? '수능심화 수준' : ''}
                     </span>
                  </div>

                  <div className="flex items-center justify-between py-2 mt-2">
                     <span className="text-slate-500 font-black text-sm">캠퍼스명</span>
                     <span className="text-lg font-black text-indigo-900">{user?.name || '지정되지 않음'}</span>
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
      <div className="max-w-5xl mx-auto w-full h-full flex flex-col py-6 font-sans animate-in fade-in overflow-hidden px-4 justify-center items-center relative gap-5 sm:gap-6">
         
                   {/* 헤더 - 좌우 여백 없이 꽉 채움 (header-wrap) */}
         <div className="w-full sticky top-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl shadow-sm shrink-0 mb-1 flex flex-col overflow-hidden relative">
            
            {/* Elegant Floating Exit Button */}
            <button 
               onClick={() => setGameState('setup')} 
               className="absolute top-2.5 right-2.5 z-40 p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200 transition-all shadow-sm shrink-0"
               title="테스트 중단"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
               </svg>
            </button>

            {/* 1행: test-header (5칸 균등 그리드) */}
            <div className="grid grid-cols-5 border-b border-slate-200/80 w-full">
               
               {/* 1번째 칸: 이름 */}
               <div className="flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 gap-0.5">
                  <span className="text-[10px] sm:text-xs text-[#888] font-black tracking-tight whitespace-nowrap">이름</span>
                  <span className="text-[13px] sm:text-base md:text-lg font-[900] text-slate-800 whitespace-nowrap leading-none mt-1">{playerInfo.name}</span>
               </div>

               {/* 2번째 칸: 현재 테스트 레벨 */}
               <div className="flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 gap-0.5 border-l border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-[#888] font-black tracking-tight whitespace-nowrap">현재 테스트 레벨</span>
                  <span className="text-[13px] sm:text-base md:text-lg font-[900] text-[#4B4EDE] whitespace-nowrap leading-none mt-1">E{currentLevel}</span>
               </div>

               {/* 3번째 칸: 남은시간 */}
               <div className="flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 gap-0.5 border-l border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-[#888] font-black tracking-tight whitespace-nowrap">남은시간</span>
                  <span className={`text-[13px] sm:text-base md:text-lg font-[900] whitespace-nowrap leading-none mt-1 transition-all duration-300 ${
                     timeLeft <= 10 ? 'text-red-500 animate-pulse-red' : 'text-[#4B4EDE]'
                  }`}>
                     {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
               </div>

               {/* 4번째 칸: Progress */}
               <div className="flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 gap-0.5 border-l border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-[#888] font-black tracking-tight whitespace-nowrap">Progress</span>
                  <span className="text-[13px] sm:text-base md:text-lg font-[900] text-slate-800 whitespace-nowrap leading-none mt-1">{currentQIdx + 1} / {levelQuestions.length}</span>
               </div>

               {/* 5번째 칸: Score */}
               <div className="flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 gap-0.5 border-l border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-[#888] font-black tracking-tight whitespace-nowrap">Score</span>
                  <span className="text-[13px] sm:text-base md:text-lg font-[900] text-emerald-600 whitespace-nowrap leading-none mt-1">{levelScore} / 20</span>
               </div>

            </div>

            {/* 2행: Progress Row (프로그레스 바 + 퍼센티지) */}
            <div className="flex items-center gap-3 px-4 h-8 sm:h-9 w-full bg-slate-50/50">
               {/* prog-track */}
               <div className="flex-1 h-[5px] bg-slate-200/80 rounded-full overflow-hidden">
                  {/* prog-fill */}
                  <div 
                     className="bg-[#4B4EDE] h-full rounded-full transition-all duration-300"
                     style={{ width: `${((currentQIdx + 1) / levelQuestions.length) * 100}%` }}
                  />
               </div>
               <span className="text-[10px] sm:text-xs font-black text-slate-400 shrink-0 select-none">
                  {Math.round(((currentQIdx + 1) / levelQuestions.length) * 100)}%
               </span>
            </div>

         </div>

{/* Centered Compact Word Question Card (문제 영역 세로 여백 및 글자 크기 최적화) */}
         <div className="w-full h-[150px] sm:h-[220px] md:h-[260px] max-h-[280px] flex flex-col bg-white border border-slate-100/85 px-8 rounded-[2rem] text-center shadow-md justify-center items-center relative overflow-hidden shrink-0 transition-all duration-300">
            <h2 className="text-glow-purple text-[2.8rem] sm:text-5xl md:text-6xl lg:text-[4.5rem] font-[1000] text-indigo-950 italic tracking-tighter break-all leading-none select-none px-2 animate-pulse-soft">
               {q?.q}
            </h2>
         </div>

         {/* Choices Panel (모바일 1열 4행 가로 정렬 vs 데스크톱 2열 분할 최적화) */}
         <div className="grid grid-cols-1 grid-rows-4 md:grid-rows-none md:grid-cols-2 gap-[5px] md:gap-4 px-3 pb-3 md:px-0 md:pb-4 w-full flex-1 md:flex-initial min-h-0 md:max-h-[50vh] overflow-y-auto custom-scrollbar-light shrink-0">
            {q?.choices.map((c, i) => {
               const isCorrect = q.answer === i;
               const isWrong = selectedChoice === i && !isCorrect;

               return (
                  <button 
                     key={i} 
                     onClick={() => handleChoice(i)} 
                     disabled={isAnswering}
                     className={`px-3.5 py-2 md:px-6 md:py-5 min-h-0 h-full md:min-h-[110px] md:h-auto border-2 md:border-[2.5px] rounded-[1.25rem] md:rounded-[1.75rem] flex items-center text-left shadow-sm md:shadow-md relative overflow-hidden transition-all duration-250 whitespace-normal break-keep cursor-pointer
                    ${isAnswering
                           ? (isCorrect ? 'bg-emerald-500 border-emerald-500 text-white z-10 shadow-md md:shadow-lg shadow-emerald-500/30 scale-[1.02]'
                              : (isWrong ? 'bg-rose-500 border-rose-500 text-white opacity-95 shadow-md md:shadow-lg shadow-rose-500/30 scale-[1.02]' : 'bg-slate-50 border-slate-100 text-slate-300 opacity-30'))
                           : 'bg-white border-slate-200 text-slate-700 hover:border-[#4B4EDE] hover:bg-slate-50 hover:shadow-lg active:scale-[0.98]'}`}
                  >
                     <div className="flex items-center w-full gap-2.5 md:gap-6 relative z-10">
                        <span className={`text-base sm:text-lg md:text-4xl font-[1000] italic shrink-0 ${isAnswering ? 'text-white/50' : 'text-indigo-200'}`}>
                           {i + 1}
                        </span>
                        <p className="text-[11px] sm:text-sm md:text-xl font-[1000] leading-snug break-keep flex-1">
                           {c}
                        </p>
                     </div>

                     {isAnswering && isCorrect && (
                        <>
                           <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none scale-[2]">
                              <span className="text-6xl drop-shadow-xl text-emerald-100">⭕</span>
                           </div>
                           <div className="absolute top-1.5 right-2 px-1.5 py-0.5 bg-white text-emerald-500 rounded-md text-[8px] font-black uppercase shadow-md animate-bounce z-20 whitespace-nowrap">정답 ✓</div>
                        </>
                     )}
                     {isAnswering && isWrong && (
                        <>
                           <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none scale-[2]">
                              <span className="text-6xl drop-shadow-xl text-rose-100">❌</span>
                           </div>
                           <div className="absolute top-1.5 right-2 px-1.5 py-0.5 bg-white text-rose-500 rounded-md text-[8px] font-black uppercase shadow-md z-20 whitespace-nowrap opacity-95">오답 ✕</div>
                        </>
                     )}
                  </button>
               );
            })}
         </div>

         {/* Optional Skip / Force Next Button */}
         {isAnswering && (
            <div className="absolute bottom-16 right-6 z-30 animate-in slide-in-from-bottom duration-300">
               <button 
                  onClick={handleForceNext}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#4B4EDE] text-white text-xs font-[1000] rounded-full shadow-lg shadow-indigo-500/35 hover:bg-indigo-700 scale-100 active:scale-95 hover:scale-105 transition-all"
               >
                  다음 문항으로 즉시 건너뛰기 ➜
               </button>
            </div>
         )}
      </div>
   );
}
