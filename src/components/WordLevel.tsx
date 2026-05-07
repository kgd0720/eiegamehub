import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

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
   const getWordTimeLimit = () => {
      try {
         const stored = localStorage.getItem('eie_time_limit_word');
         if (stored) return parseInt(stored, 10);
      } catch (e) {}
      return 180;
   };

   const [timeLeft, setTimeLeft] = useState(getWordTimeLimit());
   const hasSavedResult = useRef(false);
   const nextTimeoutRef = useRef<any>(null);

   const [animatedScore, setAnimatedScore] = useState(0);
   const [animatedLevel, setAnimatedLevel] = useState(1);

   useEffect(() => {
      if (gameState === 'result') {
         setAnimatedScore(0);
         setAnimatedLevel(0);

         let levelStart = 0;
         const levelEnd = currentLevel;
         const levelStep = Math.max(Math.floor(700 / Math.max(levelEnd, 1)), 40);
         const levelTimer = setInterval(() => {
            levelStart += 1;
            if (levelStart >= levelEnd) {
               setAnimatedLevel(levelEnd);
               clearInterval(levelTimer);
            } else {
               setAnimatedLevel(levelStart);
            }
         }, levelStep);

         let scoreStart = 0;
         const scoreEnd = totalScore;
         const scoreStep = Math.max(Math.floor(1000 / Math.max(scoreEnd, 1)), 30);
         const scoreTimer = setInterval(() => {
            scoreStart += 1;
            if (scoreStart >= scoreEnd) {
               setAnimatedScore(scoreEnd);
               clearInterval(scoreTimer);
            } else {
               setAnimatedScore(scoreStart);
            }
         }, scoreStep);

         return () => {
            clearInterval(levelTimer);
            clearInterval(scoreTimer);
         };
      }
   }, [gameState, currentLevel, totalScore]);

   useEffect(() => {
      if (gameState === 'result' && !hasSavedResult.current) {
         hasSavedResult.current = true;
         import('../../lib/api').then(api => {
            api.saveWordLevelResult({
               campus_id: user?.id || 'Unknown',
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
         Promise.all([api.getWordLevels(), api.getGlobalSettings()]).then(([parsed, settings]) => {
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
            if (settings && settings.word_time_limit) {
               setTimeLeft(settings.word_time_limit);
               localStorage.setItem('eie_time_limit_word', String(settings.word_time_limit));
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

      const shuffled = shuffleArray(uniqueQList).slice(0, 20);
      setLevelQuestions(shuffled);
      setCurrentLevel(lvl);
      setCurrentQIdx(0);
      setLevelScore(0);
      setSelectedChoice(null);
      setIsAnswering(false);
      setTimeLeft(getWordTimeLimit());
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
         <div className="w-full h-full min-h-0 flex items-center justify-center p-3 sm:p-6 font-sans animate-in fade-in text-slate-900 overflow-hidden">
            <div className="max-w-[500px] w-full bg-white border border-slate-200 rounded-[2.25rem] shadow-[0_8px_30px_rgba(0,0,0,0.05)] flex flex-col p-5 sm:py-11 sm:px-8 relative gap-4.5 sm:gap-6 justify-center animate-in zoom-in-95 duration-200">
               
               {/* Header */}
               <div className="flex flex-col items-center mb-0.5 sm:mb-1.5">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl mb-2 sm:mb-2.5 shadow-sm border border-indigo-100">📈</div>
                  <h1 className="text-lg sm:text-2xl font-[1000] text-slate-900 mb-0.5 sm:mb-1 tracking-tight">단어 레벨 테스트</h1>
                  <p className="text-[11px] sm:text-sm font-bold text-slate-500">전국의 <span className="text-indigo-600 font-[1000]">EIE</span> 학생들과 함께하는 실력 검정</p>
               </div>

               {/* Single Unified Card/Flow Structure */}
               <div className="w-full flex flex-col gap-0.5 sm:gap-1">
                  
                  {/* Section 1: Participant Input (form-card) */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:py-4.5 sm:px-4 mb-2 shadow-sm">
                     <div className="flex items-center gap-2 mb-2 sm:mb-2.5">
                        <span className="text-indigo-500 text-sm">👤</span>
                        <span className="text-xs sm:text-sm font-[1000] text-slate-700">참가자명 입력</span>
                     </div>
                     <input 
                        type="text" 
                        value={playerInfo.name} 
                        onChange={e => setPlayerInfo({ ...playerInfo, name: e.target.value })}
                        className="w-full bg-white border border-slate-200 focus:border-[#4B4EDE] focus:ring-4 focus:ring-[#4B4EDE]/15 outline-none transition-all px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-base font-black text-indigo-950 placeholder:text-slate-400" 
                        placeholder="참가자명을 입력해 주세요" 
                     />
                  </div>

                  {/* Section 2: Grade Selection (grade-card) */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:py-4.5 sm:px-4 mb-2 shadow-sm">
                     <div className="flex items-center gap-2 mb-2 sm:mb-2.5">
                        <span className="text-indigo-500 text-sm">🎓</span>
                        <span className="text-xs sm:text-sm font-[1000] text-slate-700">학년 선택</span>
                     </div>
                     <div className="grid grid-cols-3 gap-2">
                        {['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3'].map(g => {
                           const isSelected = playerInfo.grade === g;
                           return (
                              <button 
                                 key={g} 
                                 onClick={() => setPlayerInfo({ ...playerInfo, grade: isSelected ? '' : g })}
                                 className={`py-2 sm:py-3.25 rounded-lg sm:rounded-xl font-[1000] text-xs sm:text-sm transition-all duration-200 border ${isSelected ? 'bg-[#4B4EDE] text-white border-[#4B4EDE] shadow-sm scale-[1.02]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#4B4EDE]/40 hover:bg-slate-50'}`}
                              >
                                 {g}
                              </button>
                           );
                        })}
                     </div>
                  </div>

                  {questions.length === 0 && (
                     <div className="w-full bg-orange-50 border border-orange-200 rounded-xl p-2.5 mb-2 text-orange-600 font-bold text-center text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2">
                        <span className="text-lg">⚠️</span> 본사 데이터가 로딩 중입니다...
                     </div>
                  )}

                  {/* Notice box */}
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 sm:py-4 sm:px-4 flex items-start gap-2.5 shadow-sm">
                     <span className="text-xs text-indigo-600 shrink-0 leading-none mt-0.5">📢</span>
                     <p className="text-[10px] sm:text-[13px] font-black text-indigo-950/90 leading-relaxed break-keep">
                        W1부터 W12까지 총 12단계로 진행되며, 각 단계마다 20문제 중 <span className="text-[#4B4EDE] font-[1000]">18문제 이상</span>을 맞추면 다음 레벨로 넘어갈 수 있습니다.
                     </p>
                  </div>
               </div>

               {/* CTA Buttons - Start Button 강조 */}
               <div className="w-full flex gap-3 border-t border-slate-100 pt-3.5 sm:pt-4.5 mt-0.5 sm:mt-1.5">
                  <button 
                     onClick={onBack} 
                     className="w-[85px] h-[40px] sm:h-[48px] rounded-lg bg-slate-100 text-slate-500 font-black text-xs sm:text-sm flex items-center justify-center hover:bg-slate-200 transition-all shrink-0"
                  >
                     ← 뒤로
                  </button>
                  <button 
                     onClick={handleStart} 
                     disabled={!isReady || !playerInfo.name.trim() || !playerInfo.grade}
                     className={`flex-1 h-[40px] sm:h-[48px] rounded-lg font-[1000] text-xs sm:text-base flex items-center justify-center gap-2 transition-all duration-200
                        ${(isReady && playerInfo.name.trim() && playerInfo.grade)
                           ? 'bg-[#4B4EDE] text-white hover:bg-[#3f42cf] hover:scale-[1.01] active:scale-[0.99] shadow-[0_3px_10px_rgba(75,78,222,0.35)] cursor-pointer'
                           : 'bg-[#c5c5d0] text-slate-400 cursor-not-allowed shadow-none'}`}
                  >
                     테스트 시작하기
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
                  W{currentLevel} <span className="text-slate-300 mx-2">|</span> <span className="whitespace-nowrap">정답: {levelScore} / {levelQuestions.length}</span>
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
      const handleDownload = () => {
         const element = document.getElementById('certificate-card');
         if (!element) return;
         
         // Force-set final level and score in DOM before capture to guarantee correct values
         const levelEl = document.getElementById('cert-level-val');
         const scoreEl = document.getElementById('cert-score-val');
         const oldLevelText = levelEl ? levelEl.textContent : ''; const oldScoreText = scoreEl ? scoreEl.textContent : '';
         if (levelEl) levelEl.textContent = 'W' + currentLevel; if (scoreEl) scoreEl.textContent = String(totalScore);

         html2canvas(element, {
            scale: 2.5, // 2.5x high-definition rendering for premium crisp quality
            backgroundColor: '#060515',
            useCORS: true,
            logging: false
         }).then((canvas) => {
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `${playerInfo.name}_단어레벨테스트_인증서.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (levelEl && oldLevelText) levelEl.textContent = oldLevelText;
            if (scoreEl && oldScoreText) scoreEl.textContent = oldScoreText;
         }).catch((err) => {
            console.error('Error generating certificate image:', err);
            alert('이미지 생성 중 오류가 발생했습니다.');
            if (levelEl && oldLevelText) levelEl.textContent = oldLevelText;
            if (scoreEl && oldScoreText) scoreEl.textContent = oldScoreText;
         });
      };

      return (
         <div className="fixed inset-0 z-[100] bg-[#0c0a21]/95 backdrop-blur-3xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-700 font-sans custom-scrollbar cert-result-screen-overlay">
            <div className="w-full max-w-[500px] flex flex-col items-center gap-5 my-auto cert-result-container">
               <div id="certificate-card" className="relative w-full bg-gradient-to-b from-[#0e0d29] to-[#060515] border border-amber-500/30 rounded-[2.5rem] p-5 sm:p-7 text-center shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_50px_rgba(99,102,241,0.2)_inset] overflow-hidden flex flex-col items-center cert-card">
               
               {/* Confetti / Sparkle items with elegant pulsing motions - ignored during capture to avoid overlapping with text */}
               <div data-html2canvas-ignore="true" className="absolute top-8 left-12 w-2.5 h-2.5 bg-amber-400 rounded-sm rotate-12 opacity-70 animate-bounce" />
               <div data-html2canvas-ignore="true" className="absolute top-16 right-16 w-1.5 h-3 bg-indigo-400 rounded-full rotate-45 opacity-60 animate-pulse" />
               <div data-html2canvas-ignore="true" className="absolute top-32 left-20 w-1.5 h-1.5 bg-amber-300 rounded-full opacity-50 animate-pulse" />
               <div data-html2canvas-ignore="true" className="absolute top-48 right-12 w-2.5 h-2 bg-purple-400 rounded-sm -rotate-12 opacity-70" />
               <div data-html2canvas-ignore="true" className="absolute bottom-24 left-16 w-2 h-2 bg-amber-500 rounded-full rotate-45 opacity-60 animate-ping duration-1000" />
               <div data-html2canvas-ignore="true" className="absolute bottom-40 right-20 w-3 h-1.5 bg-indigo-300 rounded-sm -rotate-45 opacity-50 animate-pulse" />

               {/* SVG Golden Laurel Wreath with rotating dash outline & pulsing glow */}
               <div className="relative w-28 h-28 mx-auto flex items-center justify-center mb-1 animate-in zoom-in duration-1000 cert-laurel-wreath">
                  <svg className="absolute inset-0 w-full h-full animate-pulse" viewBox="0 0 120 120">
                     <path d="M 60 110 A 50 50 0 0 1 15 50" fill="none" stroke="url(#gold-grad-cert)" strokeWidth="3" strokeLinecap="round" />
                     <path d="M 60 110 A 50 50 0 0 0 105 50" fill="none" stroke="url(#gold-grad-cert)" strokeWidth="3" strokeLinecap="round" />
                     <path d="M 22 88 Q 18 84 15 86 Q 18 92 22 88 Z" fill="url(#gold-grad-cert)" />
                     <path d="M 14 74 Q 8 72 7 75 Q 11 80 14 74 Z" fill="url(#gold-grad-cert)" />
                     <path d="M 12 58 Q 5 58 5 62 Q 9 65 12 58 Z" fill="url(#gold-grad-cert)" />
                     <path d="M 15 42 Q 10 44 11 48 Q 16 48 15 42 Z" fill="url(#gold-grad-cert)" />
                     <path d="M 23 28 Q 19 32 21 36 Q 26 33 23 28 Z" fill="url(#gold-grad-cert)" />
                     <path d="M 98 88 Q 102 84 105 86 Q 102 92 98 88 Z" fill="url(#gold-grad-cert)" />
                     <path d="M 106 74 Q 112 72 113 75 Q 109 80 106 74 Z" fill="url(#gold-grad-cert)" />
                     <path d="M 108 58 Q 115 58 115 62 Q 111 65 108 58 Z" fill="url(#gold-grad-cert)" />
                     <path d="M 105 42 Q 110 44 109 48 Q 104 48 105 42 Z" fill="url(#gold-grad-cert)" />
                     <path d="M 97 28 Q 101 32 99 36 Q 94 33 97 28 Z" fill="url(#gold-grad-cert)" />
                     <defs>
                        <linearGradient id="gold-grad-cert" x1="0%" y1="0%" x2="100%" y2="100%">
                           <stop offset="0%" stopColor="#ffe082" />
                           <stop offset="50%" stopColor="#ffb300" />
                           <stop offset="100%" stopColor="#ff6f00" />
                        </linearGradient>
                     </defs>
                  </svg>
                  <div className="w-18 h-18 rounded-full bg-gradient-to-b from-[#1f1d47] to-[#0b0a21] border border-amber-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)] relative z-10 hover:scale-105 transition-transform duration-300 cert-trophy-circle">
                     <span className="text-3xl drop-shadow-[0_2px_8px_rgba(245,158,11,0.65)] cert-trophy-icon">🏆</span>
                  </div>
               </div>

               {/* Five Stars */}
               <div className="flex justify-center gap-1 mb-2.5">
                  {[1, 2, 3, 4, 5].map(i => (
                     <span key={i} className="text-amber-400 text-sm drop-shadow-[0_0_6px_rgba(251,191,36,0.85)]">★</span>
                  ))}
               </div>

               {/* 1. VISUAL STEP 1: Focal Center - 최종 도달 레벨 (My Level) */}
               <div className="relative my-2.5 flex flex-col items-center select-none animate-in zoom-in-75 duration-700">
                  {/* Glowing background aura - ignored during html2canvas capture to avoid rendering glitch */}
                  <div data-html2canvas-ignore="true" className="absolute inset-0 w-36 h-36 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 rounded-full blur-3xl opacity-50 animate-pulse" />
                  <div className="relative w-36 h-36 rounded-full bg-gradient-to-b from-[#14123d] to-[#07051a] border-2 border-indigo-400/50 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(129,140,248,0.4)] cert-level-circle">
                     <span className="text-[9px] font-bold tracking-[0.25em] text-[#818cf8] uppercase mb-1">FINAL LEVEL</span>
                     <div className="h-12 flex items-center justify-center">
                        <span id="cert-level-val" className="text-4xl sm:text-5xl font-black italic text-indigo-100 leading-none whitespace-nowrap pr-2 drop-shadow-[0_0_15px_rgba(129,140,248,0.7)]">
                           <span className="cert-level-value">W{animatedLevel}</span>
                        </span>
                     </div>
                     <span className="text-[11px] font-bold text-indigo-300/90 mt-1.5">
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
                     
                     {/* Pulsing spark icons */}
                     <span className="absolute top-4 right-4 text-xs text-amber-300 animate-ping">✦</span>
                     <span className="absolute bottom-4 left-5 text-[10px] text-cyan-300 animate-pulse">✦</span>
                  </div>
               </div>

               {/* Title & Subtitle */}
               <div className="flex items-center justify-center gap-3 mb-3.5 w-full">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-indigo-500/50" />
                  <span className="text-[#818cf8] font-black uppercase tracking-[0.25em] text-[10px] sm:text-xs drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]">WORD LEVEL TEST REPORT</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-indigo-500/50" />
               </div>

               <p className="text-slate-300/80 font-bold text-xs sm:text-sm mb-3 leading-relaxed">
                  레벨 테스트에 참여해 주셔서 감사합니다.<br />
                  당신의 영어 실력을 확인해보세요!
               </p>

               {/* 2. VISUAL STEP 2: Translucent Info Box & Score */}
               <div className="w-full bg-[#111029]/85 border border-indigo-500/30 rounded-[1.75rem] p-3 sm:p-4 text-left shadow-[0_0_30px_rgba(75,78,222,0.15)_inset] cert-info-box">
                  {/* Item 1: Student Info */}
                  <div className="flex items-center justify-between py-1.5 border-b border-indigo-500/30">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-300">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                           </svg>
                        </div>
                        <span className="text-indigo-200 font-bold text-xs sm:text-sm">학생 정보</span>
                     </div>
                     <div className="text-right leading-none flex items-center gap-1">
                        <span className="text-base sm:text-lg font-bold text-white">{playerInfo.name}</span>
                        <span className="text-xs sm:text-sm font-bold text-[#818cf8]">({playerInfo.grade})</span>
                     </div>
                  </div>

                  {/* Item 2: Campus */}
                  <div className="flex items-center justify-between py-1.5 border-b border-indigo-500/30">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-300">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21h10.5V3.75H6.75V21z" />
                           </svg>
                        </div>
                        <span className="text-indigo-200 font-bold text-xs sm:text-sm">캠퍼스명</span>
                     </div>
                     {/* Removed max-w truncation and heavy font weights to prevent character overlap glitches in html2canvas */}
                     <span className="text-xs sm:text-sm font-bold text-white text-right whitespace-nowrap">
                        {user?.name ? user.name.replace(/^\[[^\]]+\]\s*/, '') : '지정되지 않음'}
                     </span>
                  </div>

                  {/* Item 3: Total Score (Step 2 Focal) */}
                  <div className="flex items-center justify-between py-2">
                     <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                           <svg className="w-4.5 h-4.5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.173-.443.843-.443 1.016 0l2.036 5.206a1 1 0 00.757.643l5.632.736c.48.062.673.65.317.986l-4.225 4.004a1 1 0 00-.284.878l1.106 5.568c.094.475-.411.842-.829.578l-4.821-3.056a1 1 0 00-1.017 0l-4.821 3.056c-.418.264-.922-.103-.829-.578l1.106-5.568a1 1 0 00-.284-.878l-4.225-4.004c-.356-.336-.163-.924.317-.986l5.632-.736a1 1 0 00.757-.643l2.036-5.206z" />
                           </svg>
                        </div>
                        <span className="text-amber-200 font-bold text-xs sm:text-sm">총 획득 점수</span>
                     </div>
                     <div className="flex items-center gap-1 animate-pulse">
                        <span id="cert-score-val" className="text-3xl sm:text-4xl font-bold text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                           {animatedScore}
                        </span>
                        <span className="text-xs sm:text-sm font-black italic text-amber-400/80">pts</span>
                     </div>
                  </div>
               </div>
               </div>

               {/* 🎮 Controls Area (Placed completely OUTSIDE the certificate-card, so they NEVER show in captured JPG!) */}
               <div className="w-full flex flex-col gap-3.5 select-none animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300 cert-controls">
                  {/* Primary Download Button */}
                  <button 
                     onClick={handleDownload} 
                     className="w-full py-4.5 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-[1000] text-sm uppercase tracking-wider rounded-2xl shadow-[0_8px_25px_rgba(245,158,11,0.3)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer cert-btn-download"
                  >
                     <svg className="w-7 h-9 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                     </svg>
                     인증서 이미지 저장 (JPG)
                  </button>

                  {/* Secondary Back/Lobby Buttons */}
                  <div className="flex gap-4 w-full">
                     <button 
                        onClick={() => setGameState('setup')} 
                        className="flex-1 py-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-300 font-[1000] uppercase tracking-widest text-xs sm:text-sm hover:bg-[#151235] hover:text-white hover:border-indigo-400/50 transition-all shadow-md active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2 cert-btn-secondary"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        처음으로
                     </button>
                     <button 
                        onClick={onBack} 
                        className="flex-1 py-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-300 font-[1000] uppercase tracking-widest text-xs sm:text-sm hover:bg-[#151235] hover:text-white hover:border-indigo-400/50 transition-all shadow-md active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        대시보드
                     </button>
                  </div>
               </div>

            </div>
         </div>
      );
   }

   const q = levelQuestions[currentQIdx];

   return (
      <div className="max-w-5xl mx-auto w-full h-full flex flex-col py-3 sm:py-6 font-sans animate-in fade-in overflow-hidden px-4 justify-center items-center relative gap-3.5 sm:gap-6">
         
         {/* 헤더 - 좌우 여백 없이 꽉 채움 (header-wrap) */}
         <div className="w-full sticky top-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl shadow-sm shrink-0 mb-1 flex flex-col overflow-hidden relative">
            
            {/* Desktop Header: 5 columns */}
            <div className="hidden sm:grid grid-cols-5 border-b border-slate-200/80 w-full">
               {/* 1번째 칸: 이름 */}
               <div className="flex flex-col items-center justify-center py-3 px-2 gap-0.5">
                  <span className="text-xs text-[#888] font-black tracking-tight whitespace-nowrap">이름</span>
                  <span className="text-base md:text-lg font-[900] text-slate-800 whitespace-nowrap leading-none mt-1">{playerInfo.name}</span>
               </div>
               {/* 2번째 칸: 현재 테스트 레벨 */}
               <div className="flex flex-col items-center justify-center py-3 px-2 gap-0.5 border-l border-slate-200/80">
                  <span className="text-xs text-[#888] font-black tracking-tight whitespace-nowrap">현재 테스트 레벨</span>
                  <span className="text-base md:text-lg font-[900] text-[#4B4EDE] whitespace-nowrap leading-none mt-1">W{currentLevel}</span>
               </div>
               {/* 3번째 칸: 남은시간 */}
               <div className="flex flex-col items-center justify-center py-3 px-2 gap-0.5 border-l border-slate-200/80">
                  <span className="text-xs text-[#888] font-black tracking-tight whitespace-nowrap">남은시간</span>
                  <span className={`text-base md:text-lg font-[900] whitespace-nowrap leading-none mt-1 transition-all duration-300 ${
                     timeLeft <= 10 ? 'text-red-500 animate-pulse-red' : 'text-[#4B4EDE]'
                  }`}>
                     {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
               </div>
               {/* 4번째 칸: Progress */}
               <div className="flex flex-col items-center justify-center py-3 px-2 gap-0.5 border-l border-slate-200/80">
                  <span className="text-xs text-[#888] font-black tracking-tight whitespace-nowrap">Progress</span>
                  <span className="text-base md:text-lg font-[900] text-slate-800 whitespace-nowrap leading-none mt-1">{currentQIdx + 1} / {levelQuestions.length}</span>
               </div>
               {/* 5번째 칸: Score */}
               <div className="flex flex-col items-center justify-center py-3 px-2 gap-0.5 border-l border-slate-200/80">
                  <span className="text-xs text-[#888] font-black tracking-tight whitespace-nowrap">Score</span>
                  <span className="text-base md:text-lg font-[900] text-emerald-600 whitespace-nowrap leading-none mt-1">{levelScore} / 20</span>
               </div>
            </div>

            {/* Mobile Header: 2 rows (Row 1: 3 columns, Row 2: 2 columns) to match mockup */}
            <div className="grid sm:hidden w-full border-b border-slate-200/80 divide-y divide-slate-100 bg-white">
               {/* Row 1: 3 columns */}
               <div className="grid grid-cols-3 w-full divide-x divide-slate-200/80">
                  <div className="flex flex-col items-center justify-center py-2 gap-0.5">
                     <span className="text-[9px] text-[#888] font-black tracking-tight">이름</span>
                     <span className="text-[13px] font-black text-slate-800 leading-none mt-0.5">{playerInfo.name}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 gap-0.5 border-l border-slate-200/80">
                     <span className="text-[9px] text-[#888] font-black tracking-tight">현재 레벨</span>
                     <span className="text-[13px] font-black text-[#4B4EDE] leading-none mt-0.5">W{currentLevel}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 gap-0.5 border-l border-slate-200/80">
                     <span className="text-[9px] text-[#888] font-black tracking-tight">남은시간</span>
                     <span className={`text-[13px] font-black leading-none mt-0.5 ${
                        timeLeft <= 10 ? 'text-red-500 animate-pulse-red' : 'text-[#4B4EDE]'
                     }`}>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                     </span>
                  </div>
               </div>
               {/* Row 2: 2 columns */}
               <div className="grid grid-cols-2 w-full divide-x divide-slate-200/80">
                  <div className="flex flex-col items-center justify-center py-2 gap-0.5">
                     <span className="text-[9px] text-[#888] font-black tracking-tight">Progress</span>
                     <span className="text-[13px] font-black text-slate-800 leading-none mt-0.5">{currentQIdx + 1} / {levelQuestions.length}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 gap-0.5 border-l border-slate-200/80">
                     <span className="text-[9px] text-[#888] font-black tracking-tight">Score</span>
                     <span className="text-[13px] font-black text-emerald-600 leading-none mt-0.5">{levelScore} / 20</span>
                  </div>
               </div>
            </div>

            {/* 2행: Progress Row (프로그레스 바 + 퍼센티지) */}
            <div className="flex items-center gap-3 px-4 h-6 sm:h-9 w-full bg-slate-50/50">
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

         {/* Centered Soft Blue Word Question Card (mockup과 100% 매칭) */}
         <div className="w-full h-[155px] sm:h-[220px] md:h-[260px] max-h-[280px] flex flex-col bg-[#eef2ff] border border-indigo-100 px-8 rounded-[2rem] text-center shadow-sm justify-center items-center relative overflow-hidden shrink-0 transition-all duration-300">
            <h2 className="text-[3.2rem] sm:text-5xl md:text-6xl lg:text-[4.5rem] font-[1000] text-indigo-950 italic tracking-tighter break-all leading-none select-none px-2 mb-2">
               {q?.q}
            </h2>
            <span className="text-[11px] sm:text-xs font-bold text-indigo-400 select-none">뜻을 고르세요</span>
         </div>

         {/* Choices Panel (모바일 1열 4행 가로 정렬 및 한줄 출력 최적화) */}
         <div className="grid grid-cols-1 grid-rows-4 md:grid-rows-none md:grid-cols-2 gap-[7px] md:gap-4 px-3 pb-2 md:px-0 md:pb-4 w-full flex-1 md:flex-initial min-h-0 md:max-h-[50vh] overflow-y-auto custom-scrollbar-light shrink-0">
            {q?.choices.map((c, i) => {
               const isCorrect = q.answer === i;
               const isWrong = selectedChoice === i && !isCorrect;

               return (
                  <button 
                     key={i} 
                     onClick={() => handleChoice(i)} 
                     disabled={isAnswering}
                     className={`px-4 py-2.5 sm:py-3.5 md:px-6 md:py-5 min-h-0 md:min-h-[110px] md:h-auto border border-slate-200/60 rounded-2xl md:rounded-[1.75rem] flex items-center text-left shadow-sm md:shadow-md relative overflow-hidden transition-all duration-250 cursor-pointer
                    ${isAnswering
                           ? (isCorrect ? 'bg-[#10B981] border-[#10B981] text-white z-10 shadow-md md:shadow-lg shadow-emerald-500/30 scale-[1.01]'
                              : (isWrong ? 'bg-rose-500 border-rose-500 text-white opacity-95 shadow-md md:shadow-lg shadow-rose-500/30 scale-[1.01]' : 'bg-slate-50 border-slate-100 text-slate-300 opacity-30'))
                           : 'bg-white border-slate-200 text-slate-700 hover:border-[#4B4EDE] hover:bg-slate-50 hover:shadow-lg active:scale-[0.99]'}`}
                  >
                     <div className="flex items-center w-full gap-4 md:gap-6 relative z-10 overflow-hidden">
                        <span className={`text-sm sm:text-base md:text-3xl font-[1000] italic shrink-0 ${isAnswering ? 'text-white/60' : 'text-indigo-400'}`}>
                           {i + 1}
                        </span>
                        <p className="text-[12px] sm:text-[13px] md:text-lg font-[1000] text-slate-800 leading-none truncate flex-1 select-none">
                           {c}
                        </p>
                     </div>

                     {isAnswering && isCorrect && (
                        <>
                           <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none scale-[2]">
                              <span className="text-6xl drop-shadow-xl text-emerald-100">⭕</span>
                           </div>
                           <div className="absolute top-1 right-2 px-1 py-0.5 bg-white text-[#10B981] rounded text-[7px] font-black uppercase shadow-sm z-20 whitespace-nowrap">정답 ✓</div>
                        </>
                     )}
                     {isAnswering && isWrong && (
                        <>
                           <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none scale-[2]">
                              <span className="text-6xl drop-shadow-xl text-rose-100">❌</span>
                           </div>
                           <div className="absolute top-1 right-2 px-1 py-0.5 bg-white text-rose-500 rounded text-[7px] font-black uppercase shadow-sm z-20 whitespace-nowrap opacity-95">오답 ✕</div>
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
