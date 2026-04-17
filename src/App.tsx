import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import WordChain from './components/WordChain';
import BingoGame from './components/BingoGame';
import SpeedGame from './components/SpeedGame';
import WordSearch from './components/WordSearch';
import QuizGame from './components/QuizGame';
import NumberGuess from './components/NumberGuess';
import WordLevel from './components/WordLevel';
import TugOfWarGame from './components/TugOfWarGame';

// 엑셀 셀값을 안전하게 문자열로 변환 (숫자 소수점 제거)
const toSafeStr = (val: any): string => {
   if (val === null || val === undefined) return '';
   if (typeof val === 'number') return Number.isInteger(val) ? String(val) : String(Math.round(val));
   return String(val).trim();
};

// --- Types ---
type UserRole = 'hq' | 'campus';
type UserStatus = 'approved' | 'pending' | 'suspended';

interface User {
   id: string;
   pw: string;
   name: string;
   role: UserRole;
   status: UserStatus;
   level: number;
   email?: string;
   phone?: string;
}

interface Campus {
   region: string;
   name: string;
}

const games = [
   { id: 'number-guess', title: '숫자맞추기', subtitle: 'Guess', icon: '🔢', gradient: 'from-indigo-500 to-violet-400', desc: '상대방의 숫자를 업&다운 힌트로 추론해내는 심리 게임', img: '/assets/games/number-guess.png', tag: 'Numbers' },
   { id: 'word-search', title: '낱말찾기', subtitle: 'Word Search', icon: '🔍', gradient: 'from-purple-500 to-pink-400', desc: '격자 속에 숨겨진 단어들을 찾아내는 집중력 게임', img: '/assets/games/word-search.png', tag: 'Observation' },
   { id: 'word-chain', title: '끝말잇기', subtitle: 'Word Chain', icon: '🔄', gradient: 'from-blue-500 to-cyan-400', desc: '단어를 돌파하며 앞뒤를 맞춰가는 어휘력 게임', img: '/assets/games/word-chain.png', tag: 'Vocabulary' },
   { id: 'bingo', title: '빙고게임', subtitle: 'Bingo', icon: '🎰', gradient: 'from-emerald-500 to-green-400', desc: '직접 단어를 배치하고 빙고 라인을 완성하는 게임', img: '/assets/games/bingo.png', tag: 'Strategy' },
   { id: 'quiz', title: '퀴즈맞추기', subtitle: 'Quiz', icon: '❓', gradient: 'from-red-500 to-rose-400', desc: '다양한 문제를 4지선다 형식으로 풀어보는 퀴즈 쇼', img: '/assets/games/quiz.png', tag: 'Puzzle' },
   { id: 'speed-game', title: '스피드게임', subtitle: 'Speed Quiz', icon: '⚡', gradient: 'from-yellow-500 to-orange-400', desc: '제한 시간 내에 정답을 설명하고 맞추는 박진감 넘치는 게임', img: '/assets/games/speed-game.png', tag: 'Speed' },
   { id: 'word-certification', title: '단어레벨', subtitle: 'Word Level', icon: '📈', gradient: 'from-indigo-600 to-indigo-400', desc: '어휘력을 인증받고 보상을 획득하는 성장 미션', img: '/assets/games/word-level.png', tag: 'Level' },
   { id: 'tug-of-war', title: '줄다리기', subtitle: 'Tug of War', icon: '🪘', gradient: 'from-amber-600 to-orange-400', desc: '1:1 실시간 대결! 문제를 맞힐 때마다 줄을 자신의 쪽으로 당기세요.', img: '/assets/games/tug-of-war-dash.png', tag: 'VS Mode' },
];


// --- Authentication Components ---

const LoginModal = ({ isOpen, onClose, onLogin, onGoSignup }: any) => {
   const [id, setId] = useState('');
   const [pw, setPw] = useState('');

   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
         <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

         <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-rose-500 transition-colors z-10">✕</button>

            <div className="p-8 sm:p-12">
               <div className="flex flex-col items-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-sky-500 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-xl mb-4 transform -rotate-3">🎮</div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tighter italic uppercase leading-none">Login Hub</h1>
                  <div className="h-1 w-8 bg-emerald-500 mt-3 rounded-full" />
               </div>

               <div className="space-y-5">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account ID</label>
                     <div className="relative">
                        <input type="text" placeholder="아이디" value={id} onChange={e => setId(e.target.value)} autoComplete="off"
                           className="w-full bg-slate-50 border-2 border-slate-50 px-6 py-4 rounded-[1.2rem] text-slate-800 text-sm font-bold focus:outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-inner" />
                     </div>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                     <div className="relative">
                        <input type="password" placeholder="비밀번호" value={pw} onChange={e => setPw(e.target.value)}
                           className="w-full bg-slate-50 border-2 border-slate-50 px-6 py-4 rounded-[1.2rem] text-slate-800 text-sm font-bold focus:outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-inner" />
                     </div>
                  </div>

                  <button onClick={() => { onLogin(id, pw); if (id && pw) onClose(); }}
                     className="w-full py-4 bg-gradient-to-r from-emerald-500 to-sky-500 text-white rounded-[1.2rem] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all text-sm mt-2">로그인</button>

                  <div className="pt-6 text-center border-t border-slate-50">
                     <button onClick={() => { onGoSignup(); onClose(); }} className="text-[11px] font-bold text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest">캠퍼스 계정 생성 요청 →</button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

const LandingPage = ({ onOpenLogin }: any) => {
   return (
      <div className="h-screen w-screen bg-[#050110] relative overflow-hidden font-sans flex flex-col">
         {/* Fullscreen Hero Background */}
         <div className="absolute inset-0 z-0">
            <img
               src="/assets/images/landing_hero_final.png"
               className="w-full h-full object-cover transform scale-[1.01] animate-in fade-in duration-1000 contrast-[1.05] brightness-[1.02]"
               alt="EiE Game Hub Hero"
            />
            {/* Dark Overlays for Extreme Text Contrast */}
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/60 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
            {/* Center contrast boost */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.3)_0%,transparent_70%)]" />
         </div>

         {/* Top Navigation Bar - Premium Glassmorphism */}
         <header className="relative z-50 flex items-center justify-between mx-auto mt-6 px-10 py-3 w-[95%] max-w-7xl bg-black/40 backdrop-blur-3xl rounded-[2rem] border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-2xl border border-white/30">
                  <span className="text-white font-[1000] text-xl italic tracking-tighter">EiE</span>
               </div>
               <div>
                  <h1 className="text-lg font-[1000] text-white tracking-tighter uppercase italic leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">Game Hub</h1>
               </div>
            </div>

            <nav className="hidden lg:flex items-center gap-12">
               {['홈', 'EiE홈페이지'].map((item) => (
                  <button key={item} onClick={() => { if (item === 'EiE홈페이지') window.open('http://www.eie.co.kr', '_blank'); }}
                     className={`text-[14px] font-[1000] uppercase tracking-widest transition-all hover:text-white relative group ${item === '홈' ? 'text-white' : 'text-white/70'} drop-shadow-lg`}>
                     {item}
                     <span className={`absolute -bottom-1.5 left-0 w-full h-1 bg-[#bf953f] rounded-full transition-transform ${item === '홈' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                  </button>
               ))}
            </nav>

            <div className="flex items-center gap-6">
               <div className="hidden sm:flex items-center gap-5 text-white/90">
                  <button className="hover:text-white transition-colors text-xl drop-shadow-md">👤</button>
                  <button className="hover:text-white transition-colors text-xl drop-shadow-md">🔔</button>
                  <button className="hover:text-rose-500 transition-colors text-xl drop-shadow-md">🎬</button>
               </div>
               <div className="h-6 w-px bg-white/30 mx-2" />
               <button onClick={onOpenLogin} className="text-sm font-black text-white hover:text-[#fcf6ba] transition-colors uppercase tracking-widest drop-shadow-md">로그인</button>
            </div>
         </header>

         {/* Main Content Area - Optimized for Single Screen */}
         <main className="flex-1 relative z-20 flex flex-col items-center justify-center text-center pb-12 px-10">
            <div className="animate-in zoom-in-95 duration-700 flex flex-col items-center w-full max-w-7xl">
               {/* Main Logo Branding - Resized to 5/6 */}
               <div className="relative mb-6 group select-none px-4">
                  <h2 className="text-[75px] lg:text-[117px] font-[900] leading-none tracking-tighter uppercase italic
                     bg-gradient-to-b from-[#bf953f] via-[#fcf6ba] to-[#b38728] bg-clip-text text-transparent
                     drop-shadow-[0_8px_0_#1e1b4b] whitespace-nowrap" style={{ fontFamily: "'GmarketSansBold', sans-serif" }}>
                     EiE Game Hub
                  </h2>
                  <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 -rotate-12 bg-rose-500 text-white px-6 py-1.5 rounded-full text-xs font-black uppercase tracking-widest animate-pulse border-2 border-white/40 shadow-2xl">Beta Portal</div>
               </div>

               {/* Emotional Slogan - Moved down 1cm (~40px) */}
               <div className="flex flex-col items-center gap-3 mb-12 mt-10">
                  <h3 className="text-4xl lg:text-[72px] font-[900] text-white tracking-tight italic uppercase
                     [text-shadow:0_10px_20px_rgba(0,0,0,0.8),-3px_-3px_0_#1e1b4b,2px_-2px_0_#1e1b4b,-2px_2px_0_#1e1b4b,2px_2px_0_#1e1b4b]" style={{ fontFamily: "'GmarketSansBold', sans-serif" }}>
                     영어의 한계, 게임으로 넘다!
                  </h3>
                  <div className="flex items-center gap-5 mt-2">
                     <div className="h-0.5 w-16 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                     <p className="text-white text-sm lg:text-[17px] font-bold uppercase tracking-[0.4em] [text-shadow:0_4px_8px_rgba(0,0,0,0.8)]" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                        매년 4만명이 선택하는 초중등전문 영어학원 브랜드 EiE
                     </p>
                     <div className="h-0.5 w-16 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  </div>
               </div>

               {/* Central Login Button - Moved down 3cm (~114px) and more visible color */}
               <div className="mt-[114px]">
                  <button onClick={onOpenLogin} className="group relative w-80 h-20 bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-500 bg-[length:200%_auto] animate-gradient rounded-full font-black text-2xl text-white uppercase tracking-[0.2em] shadow-[0_20px_50px_-10px_rgba(16,185,129,0.5)] hover:scale-110 active:scale-95 transition-all border-4 border-white/30 overflow-hidden" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                     <span className="relative z-10">로그인</span>
                     <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
               </div>
            </div>
         </main>

         {/* Small Copyright Info */}
         <footer className="relative z-20 pb-8 text-center">
            <p className="text-[10px] font-medium text-white/20 uppercase tracking-[1em]" style={{ fontFamily: "'Pretendard', sans-serif" }}>Everything is English • AI Integrated Learning System</p>
         </footer>

         {/* Local global style for animation and fonts */}
         <style>{`
            @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
            @font-face {
                font-family: 'GmarketSansBold';
                src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff') format('woff');
                font-weight: normal;
                font-style: normal;
            }
            @keyframes gradient {
               0% { background-position: 0% 50%; }
               50% { background-position: 100% 50%; }
               100% { background-position: 0% 50%; }
            }
            .animate-gradient {
               animation: gradient 3s ease infinite;
            }
         `}</style>
      </div>
   );
};


const Signup = ({ onSignup, onGoLogin }: any) => {
   const [formData, setFormData] = useState({ id: '', pw: '', name: '', phone: '', email: '' });

   return (
      <div className="h-screen flex font-sans bg-white overflow-hidden">
         {/* Visual Left Side */}
         <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative bg-[#0f172a] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.1)_0%,transparent_100%)]" />
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-0 animate-in slide-in-from-top duration-700">
               <div className="w-full h-full relative">
                  <img src="/assets/images/promo_poster.png" className="w-full h-full object-cover opacity-80" alt="Students" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-70" />
                  <div className="absolute top-20 left-20">
                     <h2 className="text-4xl font-black text-white tracking-tighter italic drop-shadow-2xl">Join Our <br />Journey!</h2>
                     <p className="text-rose-400 font-black text-[12px] uppercase tracking-[0.5em] mt-4 shadow-xl">Academy Approval Waiting</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Form Right Side */}
         <div className="w-full lg:w-[580px] flex flex-col justify-center px-6 sm:px-12 md:px-20 bg-white relative shadow-2xl z-20 h-screen">
            <div className="max-w-md w-full mx-auto animate-in slide-in-from-bottom duration-700 py-4">
               <div className="flex flex-col items-center mb-6 animate-in fade-in slide-in-from-top duration-700">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-orange-500 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-xl mb-4">🎮</div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tighter italic uppercase leading-none">EiE Game Hub</h1>
                  <div className="h-1 w-10 bg-rose-500 mt-2 rounded-full hidden lg:block" />
               </div>

               <div className="space-y-4">
                  {[
                     { label: '학원명 (캠퍼스 명)', key: 'name', type: 'text', icon: '⛺' },
                     { label: '계정 ID', key: 'id', type: 'text', icon: '👤' },
                     { label: '아이디 비밀번호', key: 'pw', type: 'password', icon: '🔒' },
                     { label: '원장님 연락처', key: 'phone', type: 'text', icon: '📱' },
                     { label: '이메일 주소', key: 'email', type: 'text', icon: '✉️' }
                  ].map(f => (
                     <div key={f.key} className="space-y-1 group">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-rose-500 transition-colors">{f.label}</label>
                        <div className="relative">
                           <input type={f.type} value={(formData as any)[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                              autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                              className="w-full bg-slate-50 border-2 border-slate-50 px-7 py-3 rounded-[1.5rem] text-slate-800 text-sm font-bold focus:outline-none focus:border-rose-400 focus:bg-white transition-all shadow-inner placeholder:text-slate-200" placeholder={f.label} />
                           <span className="absolute right-6 top-1/2 -translate-y-1/2 text-lg opacity-20">{f.icon}</span>
                        </div>
                     </div>
                  ))}
                  <button onClick={() => onSignup(formData)} className="w-full py-4 bg-rose-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 hover:bg-rose-600 hover:scale-[1.02] transition-all text-sm mt-6">입점 신청하기 →</button>
                  <button onClick={onGoLogin} className="w-full py-4 text-slate-400 text-[11px] font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">이미 계정이 있나요? 로그인하기</button>
               </div>
            </div>
         </div>
      </div>
   );
};

const AdminDashboard = ({ campusUsers, updateLevel, onBulkLevelUpdate, defaultCampusLevel, onUpdateDefaultLevel, onDeleteCampus, onBulkRegister, onResetAll, onLogout, registeredCampuses, user, gameReqLevels, onUpdateGameLevel }: any) => {
   const [activeTab, setActiveTab] = useState<'home' | 'approvals' | 'campuses' | 'games' | 'stats'>('home');
   const [statsMonth, setStatsMonth] = useState('4월');
   const [regionSearch, setRegionSearch] = useState('');
   const [nameSearch, setNameSearch] = useState('');
   const [levelSearch, setLevelSearch] = useState('');
   const [currentPage, setCurrentPage] = useState(1);
   const [itemsPerPage] = useState(12);
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [bulkTargetLevel, setBulkTargetLevel] = useState(1);
   const [isSingleAddOpen, setIsSingleAddOpen] = useState(false);
   const [singleReg, setSingleReg] = useState({ region: '', name: '', id: '', pw: '' });
   const [wordLevelStats, setWordLevelStats] = useState<{ sheets: number, total: number, levelCounts: Record<number, number> } | null>(null);

   const handleDownloadTemplate = () => {
      const wsData = [
         ["단어", "뜻1", "뜻2", "뜻3", "뜻4", "정답번호(1~4)"],
         ["apple", "사과", "바나나", "포도", "딸기", 1],
         ["banana", "단감", "사과", "바나나", "기차", 3]
      ];
      const wb = XLSX.utils.book_new();
      for (let i = 1; i <= 10; i++) {
         const ws = XLSX.utils.aoa_to_sheet(wsData);
         XLSX.utils.book_append_sheet(wb, ws, `Level_${i}`);
      }
      XLSX.writeFile(wb, "word_level_template.xlsx");
   };

   const loadWordStats = () => {
      import('../lib/api').then(api => {
         api.getWordLevels().then(parsed => {
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
               const counts = parsed.reduce((acc: any, cur: any) => {
                  acc[cur.level] = (acc[cur.level] || 0) + 1;
                  return acc;
               }, {});
               setWordLevelStats({ sheets: Object.keys(counts).length, total: parsed.length, levelCounts: counts });
            }
         });
      });
   };

   useEffect(() => { loadWordStats(); }, []);

   const pendingCount = campusUsers.filter((u: any) => u.status === 'pending').length;

   const handleUploadWordLevelDict = (e: any) => {
      const f = e.target.files?.[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
         try {
            const data = evt.target?.result;
            const wb = XLSX.read(data, { type: 'array' });
            const list: any[] = [];

            wb.SheetNames.forEach((sheetName, index) => {
               const levelNum = index + 1;
               const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheetName], { header: 1 });
               rows.forEach((row, rIx) => {
                  if (rIx === 0) return;
                  if (row[0] && row[1]) {
                     const ch1 = row[1] ? String(row[1]).trim() : '';
                     const ch2 = row[2] ? String(row[2]).trim() : '';
                     const ch3 = row[3] ? String(row[3]).trim() : '';
                     const ch4 = row[4] ? String(row[4]).trim() : '';
                     const qIdx = row[5] ? String(row[5]).trim() : '1';

                     let answerIdx = parseInt(qIdx) - 1;
                     if (isNaN(answerIdx) || answerIdx < 0 || answerIdx > 3) answerIdx = 0;

                     list.push({ level: levelNum, q: String(row[0]).trim(), choices: [ch1, ch2, ch3, ch4], answer: answerIdx });
                  }
               });
            });

            if (list.length > 0) {
               import('../lib/api').then(api => {
                  api.uploadWordLevels(list).then((success) => {
                     if (success) {
                        loadWordStats();
                        alert(`성공! 총 ${list.length}개의 문제를 성공적으로 등록했습니다.`);
                     } else {
                        const detail = (window as any)._lastUploadError || '알 수 없는 DB 오류';
                        alert(`업로드 실패: ${detail}\n\n[도움말] SQL을 정상적으로 실행하셨는지 확인해 주세요.`);
                     }
                  }).catch((err) => {
                     alert('네트워크 또는 시스템 오류: ' + (err.message || 'Unknown'));
                  });
               });
            } else {
               alert('업로드할 문제가 없습니다. 엑셀 파일 형식을 확인해주세요.');
            }
         } catch (err: any) {
            alert('엑셀 파일 분석 오류: ' + err.message);
         } finally {
            e.target.value = ''; // Reset file input
         }
      };
      reader.readAsArrayBuffer(f);
   };


   const filteredFullList = (registeredCampuses || []).map((c: Campus) => {
      const associatedUser = (campusUsers || []).find((u: any) => u.name === `[${c.region}] ${c.name}`);
      return { ...c, user: associatedUser };
   }).filter((item: any) => {
      const rMatch = !regionSearch || (item.region || '').toLowerCase().includes(regionSearch.toLowerCase());
      const nMatch = !nameSearch || (item.name || '').toLowerCase().includes(nameSearch.toLowerCase());
      const lMatch = !levelSearch || (item.user?.level || '').toString().includes(levelSearch);
      return rMatch && nMatch && lMatch;
   });

   const currentItems = filteredFullList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

   return (
      <div className="h-screen bg-[#fff7f9] text-slate-800 flex overflow-hidden font-sans">
         <aside className="w-80 bg-white border-r border-rose-100 flex flex-col p-10 shadow-xl overflow-hidden relative no-print">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="flex items-center gap-4 mb-14 relative z-10">
               <div className="w-14 h-14 bg-rose-500 rounded-[1.2rem] flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-rose-500/20 transform -rotate-3 transition-transform hover:rotate-0">E</div>
               <div>
                  <h2 className="text-2xl font-black tracking-tighter text-rose-900 leading-tight uppercase italic">HQ Portal</h2>
                  <p className="text-[14px] text-rose-600 font-bold uppercase tracking-widest leading-none">Management</p>
               </div>
            </div>
            <nav className="space-y-2 flex-1 relative z-10">
               {[
                  { id: 'home', icon: '🏠', label: 'Dashboard' },
                  { id: 'campuses', icon: '⛺', label: '캠퍼스리스트' },
                  { id: 'approvals', icon: '⏳', label: '승인관리' },
                  { id: 'games', icon: '🎮', label: '게임관리' },
                  { id: 'stats', icon: '📊', label: '통계' },
               ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                     className={`w-full flex items-center gap-5 px-8 py-5 rounded-[1.2rem] transition-all font-black text-[17px] uppercase tracking-[0.05em] ${activeTab === tab.id ? 'bg-rose-100/50 text-rose-800 shadow-md border border-rose-200' : 'text-slate-400 hover:text-rose-700 hover:bg-rose-50'}`}>
                     <span className={`text-3xl transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`}>{tab.icon}</span> {tab.label}
                  </button>
               ))}
            </nav>
            <div className="mt-auto space-y-4 relative z-10">
               <div className="py-4 bg-[#fff1f2] border border-rose-100 rounded-[1.5rem] shadow-sm text-center">
                  <div className="text-lg font-black text-rose-800 tracking-tighter leading-none italic mb-1">{user?.id}</div>
                  <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-none">{user?.name}</div>
               </div>
               <button onClick={onLogout} className="w-full py-5 text-[11px] font-black uppercase tracking-[0.3em] text-rose-500 border border-rose-100 hover:bg-rose-50 rounded-[1.2rem] hover:border-rose-300 transition-all">Sign Out</button>
            </div>
         </aside>

         <main className="flex-1 p-10 overflow-y-auto custom-scrollbar h-screen">
            {activeTab === 'home' ? (
               <div className="animate-in fade-in duration-700">
                  <header className="mb-4">
                     <h1 className="text-4xl font-black tracking-tighter mb-2 italic text-rose-900 uppercase">대시보드</h1>
                  </header>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4 lg:px-[32px]">
                     <div className="bg-sky-50 border border-sky-100 rounded-[2rem] p-4 shadow-sm flex flex-col min-h-[148px]">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-xl shadow-lg text-white">🏰</div>
                           <div className="flex-1 flex items-center justify-between">
                              <h1 className="text-base font-black italic text-sky-950 uppercase tracking-tighter leading-none">캠퍼스현황</h1>
                              <span className="text-sky-700 text-[10px] font-black px-3 py-1 rounded-lg bg-sky-100 border border-sky-200">TOTAL: {registeredCampuses.length}</span>
                           </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 flex-1">
                           {['서울', '경기', '인천', '강원', '경북', '경남', '대구', '부산', '충북', '충남', '세종', '대전', '광주', '전북', '전남', '제주'].map(r => {
                              const v = (registeredCampuses || []).filter((c: any) => c.region === r).length;
                              return (
                                 <div key={r} className="bg-white/60 border border-slate-100 px-2 py-1.5 rounded-lg flex items-center justify-center gap-2 hover:border-rose-300 hover:shadow-sm transition-all group relative overflow-hidden text-[10px] font-black">
                                    {r} <span className="text-rose-600">{v}</span>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                     <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-4 shadow-sm flex flex-col min-h-[148px]">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-xl shadow-lg text-white">📈</div>
                           <h1 className="text-base font-black italic text-amber-950 uppercase tracking-tighter leading-none">캠퍼스레벨</h1>
                        </div>
                        <div className="grid grid-cols-5 gap-3 flex-1">
                           {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lv => {
                              const count = (campusUsers || []).filter((u: any) => u.status === 'approved' && Number(u.level) === lv).length;
                              return (
                                 <div key={lv} className="bg-white/60 border border-amber-100 p-1.5 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black hover:border-orange-500">
                                    LV.{lv} <span className="text-rose-600">{count}</span>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                     <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-4 shadow-sm flex flex-col min-h-[148px]">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-xl shadow-lg text-white">⏳</div>
                              <h1 className="text-base font-black italic text-emerald-950 uppercase tracking-tighter leading-none">대기계정 수</h1>
                           </div>
                           <div className="text-2xl font-[1000] text-emerald-600 italic leading-none">{campusUsers.filter((u: any) => u.status === 'pending').length}</div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-2">
                           {campusUsers.filter((u: any) => u.status === 'pending').slice(0, 5).map((u: any, i: number) => (
                              <div key={i} className="flex items-center justify-between bg-white/60 border border-emerald-100 px-4 py-2 rounded-xl">
                                 <span className="text-[10px] font-black text-emerald-800 italic uppercase">{u.name.split('] ')[1] || u.name}</span>
                                 <span className="text-[8px] font-black text-rose-500 animate-pulse">PENDING</span>
                              </div>
                           ))}
                           {campusUsers.filter((u: any) => u.status === 'pending').length === 0 && (
                              <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-emerald-300">대기중인 계정이 없습니다.</div>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="bg-white/80 border-2 border-rose-100 rounded-[2rem] p-5 shadow-2xl relative overflow-hidden group min-h-[270px] flex-1 flex flex-col">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                     <div className="flex items-center justify-between mb-4 flex-shrink-0">
                        <div>
                           <h3 className="text-2xl font-black text-rose-900 italic tracking-tighter uppercase leading-none mb-1">통합 가동 현황</h3>
                           <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest leading-none">System Operational Metrics</p>
                        </div>
                        <div className="flex gap-3">
                           <select value={statsMonth} onChange={e => setStatsMonth(e.target.value)} className="bg-white/80 border border-rose-200 text-rose-700 text-xs font-black rounded-xl px-3 py-2 outline-none cursor-pointer shadow-sm hover:border-rose-400 transition-all">
                              {['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'].map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                           <div className="px-6 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] border border-emerald-100 shadow-sm uppercase tracking-widest leading-none hidden sm:flex items-center">Server: Online</div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 min-h-0">
                        {/* 월별 전국 접속수 */}
                        <div className="bg-sky-50/50 border border-sky-100 rounded-3xl p-4 flex flex-col relative overflow-hidden group/card shadow-sm">
                           <div className="absolute top-4 right-4 text-6xl opacity-5 transform group-hover/card:scale-110 group-hover/card:rotate-12 transition-all">📈</div>
                           <div className="flex items-center justify-between mb-3 relative z-10 flex-shrink-0">
                              <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 bg-sky-500 text-white rounded-lg shadow-md flex items-center justify-center text-lg">🌐</div>
                                 <h4 className="text-base font-black text-sky-950 italic tracking-tighter">전국 접속 Top 10</h4>
                              </div>
                           </div>
                           <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1 relative z-10">
                              {campusUsers.slice(0, 10).map((u: any, idx: number) => (
                                 <div key={idx} className="flex items-center justify-between bg-white/60 border border-sky-100/50 px-2.5 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all focus-within:border-sky-300 group">
                                    <div className="flex items-center gap-2 truncate">
                                       <span className="text-[10px] font-black italic text-sky-400 w-3 flex-shrink-0">#{idx + 1}</span>
                                       <span className="text-[10px] font-[1000] text-slate-700 uppercase italic leading-none truncate">{u.name.split('] ')[1] || u.name}</span>
                                    </div>
                                    <div className="text-[9px] font-black text-sky-600 italic bg-sky-100/50 px-2 py-1 rounded flex-shrink-0 flex items-center gap-0.5 group-hover:bg-sky-100 transition-colors">
                                       {(10000 - idx * 735).toLocaleString()} <span className="opacity-50 not-italic text-[7px]">회</span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>

                        {/* 월별 인기 게임수 */}
                        <div className="bg-purple-50/50 border border-purple-100 rounded-3xl p-4 flex flex-col relative overflow-hidden group/card shadow-sm">
                           <div className="absolute top-4 right-4 text-6xl opacity-5 transform group-hover/card:-rotate-12 transition-all">🎮</div>
                           <div className="flex items-center justify-between mb-3 relative z-10 flex-shrink-0">
                              <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 bg-purple-500 text-white rounded-lg shadow-md flex items-center justify-center text-lg">🔥</div>
                                 <h4 className="text-base font-black text-purple-950 italic tracking-tighter">월별 인기 게임 Top 10</h4>
                              </div>
                           </div>
                           <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1 relative z-10">
                              {games.slice(0, 10).map((g, idx) => (
                                 <div key={g.id} className="flex items-center justify-between bg-white/60 border border-purple-100/50 px-2.5 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all group">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                       <span className="text-[10px] font-black italic text-purple-400 w-3 flex-shrink-0">#{idx + 1}</span>
                                       <div className="flex items-center gap-1.5 truncate">
                                          <span className="text-sm flex-shrink-0">{g.icon}</span>
                                          <span className="text-[10px] font-[1000] text-slate-800 uppercase italic leading-none truncate">{g.title}</span>
                                       </div>
                                    </div>
                                    <div className="text-[9px] font-[1000] text-purple-600 italic bg-purple-100/50 px-2 py-1 rounded flex-shrink-0 flex items-center gap-0.5 group-hover:bg-purple-100 transition-colors">
                                       {Math.floor(10000 / (idx + 1)).toLocaleString()}
                                       <span className="text-[7px] text-purple-400 font-bold not-italic">plays</span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            ) : activeTab === 'stats' ? (
               <div className="animate-in fade-in duration-700 h-full flex flex-col">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full min-h-0">
                     <div className="bg-white/80 border-2 border-violet-100 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
                        <header className="bg-violet-100 px-8 py-4 flex items-center justify-between">
                           <h3 className="text-lg font-[1000] text-violet-900 italic tracking-tighter uppercase leading-none">월간 접속 순위</h3>
                           <select value={statsMonth} onChange={e => setStatsMonth(e.target.value)} className="bg-white border border-violet-200 text-[10px] font-black rounded-lg px-2 py-1">
                              {['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'].map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                        </header>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                           <table className="w-full text-left">
                              <thead className="bg-violet-50 text-violet-400 text-[9px] font-black uppercase">
                                 <tr><th className="px-8 py-2">Rank</th><th className="px-8 py-2">Campus</th><th className="px-8 py-2 text-right">Access</th></tr>
                              </thead>
                              <tbody className="divide-y divide-violet-50">
                                 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                                    <tr key={i} className="hover:bg-violet-50/50">
                                       <td className="px-8 py-3 text-violet-500 font-black italic text-lg">0{i}</td>
                                       <td className="px-8 py-3 text-sm font-black text-slate-700 italic uppercase">캠퍼스 Sample {i}</td>
                                       <td className="px-8 py-3 text-right font-black text-violet-900">{1000 - i * 50} pts</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                     <div className="bg-white/80 border-2 border-amber-100 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
                        <header className="bg-amber-100 px-8 py-4">
                           <h3 className="text-lg font-[1000] text-amber-900 italic tracking-tighter uppercase leading-none">연간 누적 랭킹</h3>
                        </header>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                           <table className="w-full text-left">
                              <thead className="bg-amber-50 text-amber-400 text-[9px] font-black uppercase">
                                 <tr><th className="px-8 py-2">Rank</th><th className="px-8 py-2">Campus</th><th className="px-8 py-2 text-right">Total</th></tr>
                              </thead>
                              <tbody className="divide-y divide-amber-50">
                                 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                                    <tr key={i} className="hover:bg-amber-50/50">
                                       <td className="px-8 py-3 text-amber-500 font-black italic text-lg">0{i}</td>
                                       <td className="px-8 py-3 text-sm font-black text-slate-700 italic uppercase">캠퍼스 누적 Sample {i}</td>
                                       <td className="px-8 py-3 text-right font-black text-amber-900">{15000 - i * 400}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               </div>
            ) : activeTab === 'games' ? (
               <div className="animate-in fade-in duration-700 h-full flex flex-col">
                  <header className="mb-3 px-4">
                     <h1 className="text-3xl font-[1000] tracking-tighter mb-1 italic text-emerald-900 uppercase leading-none">게임 관리</h1>
                     <div className="flex items-center gap-4">
                        <span className="w-10 h-1 bg-emerald-200 rounded-full" />
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.4em]">Game Accessibility & Level Management</p>
                     </div>
                  </header>

                  <div className="grid grid-cols-4 gap-6 flex-1 min-h-0 mx-4 mb-4">
                     {/* 좌측: 게임 리스트 테이블 (col-span-3) */}
                     <div className="col-span-3 flex-1 overflow-y-auto custom-scrollbar bg-white border border-slate-100 rounded-[2rem] shadow-2xl shadow-slate-200/50">
                        <table className="w-full text-left border-collapse">
                           <thead className="bg-slate-50 border-b border-slate-100/50 text-slate-400 uppercase text-[9px] font-black tracking-widest sticky top-0 z-10">
                              <tr>
                                 <th className="px-8 py-3 w-16 text-center">No.</th>
                                 <th className="px-8 py-3 w-20 text-center">ICON</th>
                                 <th className="px-8 py-3">Content</th>
                                 <th className="px-4 py-3 w-32 text-center">지정 레벨</th>
                                 <th className="px-4 py-3 w-40 text-center">설정</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {games.map((game, idx) => (
                                 <tr key={game.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-2.5 text-center">
                                       <span className="text-base font-[1000] italic text-slate-200 group-hover:text-emerald-500 transition-colors">0{idx + 1}</span>
                                    </td>
                                    <td className="px-8 py-2.5 text-center">
                                       <div className={`w-12 h-12 mx-auto bg-gradient-to-br ${game.gradient} rounded-xl flex items-center justify-center text-xl shadow-lg border border-white/20 transform transition-transform group-hover:scale-110`}>
                                          {game.icon}
                                       </div>
                                    </td>
                                    <td className="px-8 py-2.5">
                                       <div className="flex flex-col">
                                          <h3 className="text-base font-[1000] text-slate-700 italic uppercase tracking-tighter leading-none mb-1 group-hover:text-emerald-600 transition-colors">{game.title}</h3>
                                          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">{game.subtitle}</p>
                                       </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                       <span className="text-base font-[1000] italic text-emerald-600">LV.{gameReqLevels[game.id] || (idx + 1)}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                       <div className="relative">
                                          <select
                                             value={gameReqLevels[game.id] || (idx + 1)}
                                             onChange={(e) => onUpdateGameLevel(game.id, parseInt(e.target.value))}
                                             className="w-full bg-slate-50 border-2 border-slate-100 text-slate-700 text-[11px] font-black rounded-lg px-4 py-2 outline-none cursor-pointer hover:border-emerald-300 transition-all appearance-none text-center"
                                          >
                                             {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                                                <option key={v} value={v}>LEVEL {v}</option>
                                             ))}
                                          </select>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>

                     {/* 우측: 고밀도 설정 패널 (col-span-1) */}
                     <div className="col-span-1 flex flex-col gap-4 self-start">
                        {/* 단어레벨 설정 카드 */}
                        <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] shadow-lg p-4 flex flex-col gap-3 overflow-hidden relative">
                           <div className="flex items-center justify-between border-b border-slate-200/50 pb-2 relative z-10 flex-shrink-0">
                              <div>
                                 <h3 className="text-xs font-[1000] text-slate-800 italic uppercase leading-none">단어레벨 설정</h3>
                                 <p className="text-[7px] text-indigo-500 font-black uppercase tracking-widest leading-none mt-0.5">Word Level Dict</p>
                              </div>
                              <div className="flex items-baseline gap-1 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                 <p className="text-[10px] font-[1000] italic text-indigo-600">{wordLevelStats?.total?.toLocaleString() || 0}</p>
                                 <p className="text-[7px] text-slate-300 font-bold uppercase">words</p>
                              </div>
                           </div>
                           <div className="grid grid-cols-4 gap-1.5 overflow-y-auto custom-scrollbar pr-1 min-h-0 relative z-10 max-h-[160px]">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((lv) => (
                                 <div key={lv} className="flex flex-col items-center justify-center bg-white py-1.5 rounded-lg border border-slate-100 shadow-sm">
                                    <span className="text-[8px] font-black text-slate-500 uppercase leading-none mb-0.5">E{lv}</span>
                                    <span className="text-[10px] text-indigo-600 font-[1000] leading-none">{wordLevelStats?.levelCounts?.[lv] || 0}</span>
                                 </div>
                              ))}
                           </div>
                           <div className="flex gap-2 relative z-10 flex-shrink-0">
                              <button onClick={handleDownloadTemplate} className="flex-1 py-3 bg-white text-slate-600 border border-slate-100 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-1 shadow-sm group">
                                 <span className="text-sm">📥</span>
                                 <span className="truncate">양식</span>
                              </button>
                              <label className="flex-1 flex flex-col items-center justify-center py-3 bg-indigo-500 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-600 cursor-pointer transition-all active:scale-95 gap-1 group text-center">
                                 <span className="text-sm">📤</span>
                                 <span className="truncate">업로드</span>
                                 <input type="file" accept=".xlsx,.xls" onChange={handleUploadWordLevelDict} className="hidden" />
                              </label>
                              <button onClick={() => { if (confirm('데이터를 초기화합니까?')) { import('../lib/api').then(api => api.resetWordLevels?.().then(() => { loadWordStats(); alert('초기화됨'); })) } }} className="w-10 h-11 bg-white text-rose-500 border border-rose-50 rounded-xl flex items-center justify-center shadow-sm shrink-0">🗑️</button>
                           </div>
                        </div>

                     </div>
                  </div>
               </div>
            ) : activeTab === 'approvals' ? (
               <div className="animate-in fade-in duration-700 h-full flex flex-col">
                  <header className="mb-6 flex items-center justify-between px-4">
                     <h1 className="text-4xl font-[1000] italic text-rose-950 uppercase leading-none">승인관리</h1>
                     <div className="bg-amber-100 text-amber-600 px-8 py-3 rounded-2xl font-[1000] text-xs">Wait List: {pendingCount}</div>
                  </header>
                  <div className="mx-4 bg-white/40 border-2 border-rose-100 rounded-[2.5rem] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
                     <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left">
                           <thead className="bg-[#fff1f2] sticky top-0 z-10 text-rose-400 uppercase text-[10px] font-black tracking-widest">
                              <tr><th className="px-10 py-6">Campus Info</th><th className="px-10 py-6">Account Detail</th><th className="px-10 py-6 text-right">Action</th></tr>
                           </thead>
                           <tbody className="divide-y divide-rose-50 bg-white/20">
                              {campusUsers.filter((u: any) => u.status === 'pending').map((u: any, idx: number) => (
                                 <tr key={idx} className="hover:bg-rose-50/50 transition-colors">
                                    <td className="px-10 py-6 font-black italic text-slate-800 uppercase">{u.name}</td>
                                    <td className="px-10 py-6 font-[1000] text-rose-600 italic uppercase">ID: {u.id}</td>
                                    <td className="px-10 py-6 text-right"><button onClick={() => updateLevel(u.id, 1, 'approved')} className="px-10 py-3.5 bg-rose-500 text-white rounded-[1.5rem] font-[1000] uppercase text-[11px] shadow-xl hover:scale-105 transition-all">승인 수락 →</button></td>
                                 </tr>
                              ))}
                              {pendingCount === 0 && (<tr><td colSpan={3} className="py-20 text-center opacity-30 font-black italic uppercase">대기중인 계정이 없습니다</td></tr>)}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            ) : activeTab === 'campuses' ? (
               <div className="animate-in fade-in duration-700 h-full flex flex-col">
                  <header className="mb-2 px-4 flex items-center justify-between">
                     <div>
                        <h1 className="text-3xl font-[1000] tracking-tighter italic text-emerald-900 uppercase leading-none mb-1">캠퍼스리스트</h1>
                        <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest leading-none">Registered Institution Management</p>
                     </div>
                     <div className="flex items-center gap-4">
                        <button onClick={() => setIsSingleAddOpen(true)} className="px-8 py-3 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-[1000] uppercase tracking-widest shadow-xl hover:scale-105 transition-all">+ 계정 생성</button>
                        <button
                           onClick={() => {
                              const ui = document.createElement('input'); ui.type = 'file'; ui.accept = '.xlsx,.xls';
                              ui.onchange = (e_local: any) => {
                                 const file = e_local.target.files?.[0]; if (!file) return;
                                 const r = new FileReader(); r.onload = (e_ev: any) => {
                                    try {
                                       const binaryData = e_ev.target?.result; if (!binaryData) throw new Error('ERR');
                                       const wb = XLSX.read(binaryData, { type: 'array' });
                                       const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
                                       const campusesToAdd: any[] = []; const usersToAdd: any[] = [];
                                       for (let i = 1; i < rows.length; i++) {
                                          const row = rows[i]; if (!row || row.length === 0) continue;
                                          const region = toSafeStr(row[0]); const cname = toSafeStr(row[1]);
                                          let loginId = ''; let loginPw = '';
                                          for (let c = 2; c < row.length; c++) { const val = toSafeStr(row[c]); if (val && !loginId) loginId = val; else if (val && loginId && !loginPw) loginPw = val; }
                                          if (region && cname) { campusesToAdd.push({ region, name: cname }); if (loginId) usersToAdd.push({ id: loginId, pw: loginPw || loginId, name: `[${region}] ${cname}`, role: 'campus', status: 'approved', level: defaultCampusLevel }); }
                                       }
                                       if (campusesToAdd.length > 0) onBulkRegister(campusesToAdd, usersToAdd);
                                    } catch (err: any) { alert('ERROR'); }
                                 }; r.readAsArrayBuffer(file);
                              }; ui.click();
                           }}
                           className="px-8 py-3 bg-white border-2 border-emerald-500 text-emerald-600 rounded-[1.5rem] text-[11px] font-[1000] uppercase tracking-widest shadow-xl hover:bg-emerald-50 transition-all flex items-center gap-3"
                        >
                           <span>📂 Bulk Import</span>
                        </button>
                     </div>
                  </header>

                  <div className="mx-4 flex flex-wrap items-center gap-4 mb-3 px-6 py-3 bg-white border border-slate-100 rounded-[2rem] shadow-xl relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
                     <div className="flex items-center gap-3 border-r border-slate-50 pr-8 mr-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Region</label>
                        <select value={regionSearch} onChange={e => { setRegionSearch(e.target.value); setCurrentPage(1); }} className="bg-slate-50 border-0 px-4 py-2 text-slate-700 text-xs font-[1000] italic rounded-xl focus:outline-none cursor-pointer uppercase min-w-[120px]">
                           <option value="">전체지역</option>
                           {['서울', '경기', '인천', '강원', '충북', '충남', '세종', '대전', '경북', '경남', '대구', '부산', '광주', '전북', '전남', '제주'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                     </div>
                     <div className="flex items-center gap-3 border-r border-slate-50 pr-8 mr-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Search</label>
                        <input value={nameSearch} onChange={e => { setNameSearch(e.target.value); setCurrentPage(1); }} className="bg-slate-50 border-0 px-6 py-2 text-slate-700 text-xs font-[1000] italic rounded-xl focus:outline-none w-[200px] placeholder:text-slate-200" placeholder="CAMPUS NAME..." />
                     </div>
                     <div className="flex items-center gap-3 border-r border-slate-50 pr-8 mr-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Level</label>
                        <div className="flex gap-1.5">
                           <select value={levelSearch} onChange={e => { setLevelSearch(e.target.value); setCurrentPage(1); }} className="bg-slate-50 border-0 px-4 py-2 text-slate-700 text-xs font-[1000] italic rounded-xl focus:outline-none cursor-pointer uppercase min-w-[100px]">
                              <option value="">ALL LV</option>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{`LV.${n}`}</option>)}
                           </select>
                        </div>
                     </div>
                     <div className="flex items-center gap-3 border-r border-slate-50 pr-8 mr-2">
                        <label className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Default Lv</label>
                        <select value={defaultCampusLevel} onChange={e => onUpdateDefaultLevel(parseInt(e.target.value))} className="bg-rose-50 border border-rose-100 px-4 py-2 text-rose-700 text-xs font-[1000] italic rounded-xl focus:outline-none cursor-pointer uppercase min-w-[90px]">
                           {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <option key={n} value={n}>{`LV.${n}`}</option>)}
                        </select>
                     </div>
                     {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 px-6 py-1.5 bg-emerald-500 rounded-2xl shadow-lg animate-in zoom-in duration-300">
                           <span className="text-[11px] font-black text-white px-2 border-r border-white/20 mr-1">{selectedIds.length}개 선택됨</span>
                           <select value={bulkTargetLevel} onChange={e => setBulkTargetLevel(parseInt(e.target.value))} className="bg-white/10 border-0 px-3 py-1 text-white text-[10px] font-black italic rounded-lg focus:outline-none cursor-pointer outline-none ring-1 ring-white/20">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <option key={n} value={n} className="text-slate-800">LV.{n}</option>)}
                           </select>
                           <button
                              onClick={() => {
                                 if (confirm(`${selectedIds.length}개 캠퍼스의 레벨을 LV.${bulkTargetLevel}로 변경하시겠습니까?`)) {
                                    onBulkLevelUpdate(selectedIds, bulkTargetLevel);
                                    setSelectedIds([]);
                                    alert('완료되었습니다.');
                                 }
                              }}
                              className="bg-white text-emerald-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm"
                           >
                              Apply
                           </button>
                           <button onClick={() => setSelectedIds([])} className="text-white/60 hover:text-white transition-colors text-[10px] font-black uppercase ml-2 px-1">✕</button>
                        </div>
                     )}
                     <button onClick={() => { if (confirm('데이터를 초기화합니까?')) { onResetAll(); alert('완료'); } }} className="ml-auto px-6 py-2.5 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all border border-rose-50">Reset All Data</button>
                  </div>

                  <div className="mx-4 bg-white/40 border border-slate-100 rounded-[2rem] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0 mb-2 transition-all focus-within:border-emerald-200">
                     <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left table-fixed">
                           <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-black tracking-widest">
                              <tr>
                                 <th className="px-2 py-1.5 w-[3%] text-center">
                                    <input type="checkbox" checked={currentItems.length > 0 && currentItems.every((c: any) => c.user?.id && selectedIds.includes(c.user.id))}
                                       onChange={(e) => {
                                          if (e.target.checked) {
                                             const idsToAdd = currentItems.map((c: any) => c.user?.id).filter(Boolean);
                                             setSelectedIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
                                          } else {
                                             const idsToRemove = currentItems.map((c: any) => c.user?.id);
                                             setSelectedIds(prev => prev.filter(id => !idsToRemove.includes(id)));
                                          }
                                       }}
                                       className="w-4 h-4 accent-emerald-500 rounded cursor-pointer transition-transform hover:scale-110" />
                                 </th>
                                 <th className="px-2 py-3 w-[5%] text-center italic">No.</th>
                                 <th className="px-4 py-3 w-[10%] text-center">지역명</th>
                                 <th className="px-4 py-3 w-[20%]">캠퍼스명</th>
                                 <th className="px-4 py-3 w-[15%] text-center">아이디</th>
                                 <th className="px-4 py-3 w-[15%] text-center">비번</th>
                                 <th className="px-2 py-3 w-[10%] text-center">레벨</th>
                                 <th className="px-2 py-3 w-[10%] text-center">승인여부</th>
                                 <th className="px-2 py-3 w-[10%] text-center">설정</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50 bg-white/30">
                              {currentItems.map((item: any, idx: number) => {
                                 const isSelected = item.user?.id && selectedIds.includes(item.user.id);
                                 return (
                                    <tr key={idx} className={`group transition-all ${isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50/40'}`}>
                                       <td className="px-1 py-2 text-center">
                                          {item.user?.id ? (
                                             <input type="checkbox" checked={selectedIds.includes(item.user.id)}
                                                onChange={(e) => {
                                                   if (e.target.checked) setSelectedIds(prev => [...prev, item.user.id]);
                                                   else setSelectedIds(prev => prev.filter(id => id !== item.user.id));
                                                }}
                                                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer transition-transform hover:scale-110" />
                                          ) : <div className="w-4 h-4" />}
                                       </td>
                                       <td className="px-1 py-1 text-center font-black italic text-slate-300 text-xs text-opacity-80">{(idx + 1 + (currentPage - 1) * itemsPerPage).toString().padStart(3, '0')}</td>
                                       <td className="px-2 py-2 text-center">
                                          <span className="bg-slate-800 text-white text-[9px] font-black px-2 mt-0.5 py-1 rounded-[0.4rem] italic shadow-sm uppercase truncate max-w-[90%] inline-block">{item.region}</span>
                                       </td>
                                       <td className="px-2 py-2 overflow-hidden">
                                          <div className="flex flex-col">
                                             <span className="text-[12px] font-[1000] text-slate-800 italic uppercase hover:text-emerald-600 transition-colors cursor-default leading-none truncate block">
                                                {item.name}
                                             </span>
                                          </div>
                                       </td>
                                       <td className="px-2 py-2 text-center overflow-hidden">
                                          {item.user?.id ? (
                                             <span className="text-[10px] font-[1000] text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md italic inline-block truncate max-w-[90%]">{item.user.id}</span>
                                          ) : <span className="opacity-20">—</span>}
                                       </td>
                                       <td className="px-2 py-2 text-center overflow-hidden">
                                          {item.user?.pw ? (
                                             <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md tracking-wider block truncate w-full">{item.user.pw}</span>
                                          ) : <span className="opacity-20">—</span>}
                                       </td>
                                       <td className="px-1 py-2 text-center">
                                          {item.user?.level ? (
                                             <select value={item.user.level} onChange={(e) => updateLevel(item.user.id, parseInt(e.target.value), item.user.status)} className="w-[50px] text-[10px] font-[1000] text-orange-600 bg-orange-50 border border-orange-200 rounded py-0.5 px-0.5 outline-none text-center italic cursor-pointer">
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(l => (
                                                   <option key={l} value={l}>LV.{l}</option>
                                                ))}
                                             </select>
                                          ) : <span className="opacity-20">—</span>}
                                       </td>
                                       <td className="px-1 py-2 text-center">
                                          {item.user?.status ? (
                                             <select value={item.user.status} onChange={(e) => updateLevel(item.user.id, item.user.level, e.target.value)} className={`w-[60px] outline-none text-[8px] font-[1000] uppercase text-center rounded py-1 cursor-pointer shadow-sm ${item.user.status === 'approved' ? 'bg-emerald-500 text-white border border-emerald-600' : 'bg-orange-500 text-white animate-pulse border border-orange-600'}`}>
                                                <option value="approved">승인완료</option>
                                                <option value="pending">대기중</option>
                                             </select>
                                          ) : <span className="text-[8px] font-black text-slate-300">미가입</span>}
                                       </td>
                                       <td className="px-1 py-2 text-center overflow-visible">
                                          <div className="relative group/dropdown inline-block text-left w-full h-full">
                                             <button className="px-2 py-1 mx-auto bg-white border border-slate-200 text-slate-600 rounded text-[10px] font-bold hover:bg-slate-50 flex items-center gap-1 transition-all shadow-sm">
                                                설정
                                                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                             </button>
                                             <div className="absolute top-1/2 -translate-y-1/2 right-[105%] w-24 bg-white border border-slate-200 shadow-xl rounded-xl z-50 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all flex flex-col overflow-hidden">
                                                <button onClick={() => {
                                                   const newPw = prompt(`[${item.name}] 캠퍼스의 새로운 비밀번호를 입력하세요:`, item.user?.pw || '');
                                                   if (newPw && item.user?.id && newPw !== item.user.pw) {
                                                      import('../lib/api').then(api => {
                                                         if (api.updateUserPassword) {
                                                            api.updateUserPassword(item.user.id, newPw).then(() => {
                                                               alert('비밀번호가 성공적으로 변경되었습니다!');
                                                               window.location.reload();
                                                            });
                                                         }
                                                      });
                                                   }
                                                }} className="px-3 py-2.5 text-[10px] font-black text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 text-left border-b border-slate-100 flex justify-between items-center group/btn">
                                                   비번수정 <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">✏️</span>
                                                </button>
                                                <button onClick={() => onDeleteCampus(item.name, item.region, item.user?.id)} className="px-3 py-2.5 text-[10px] font-black text-rose-500 hover:bg-rose-50 text-left flex justify-between items-center group/btn">
                                                   삭제 <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">🗑️</span>
                                                </button>
                                             </div>
                                          </div>
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                     {filteredFullList.length > itemsPerPage && (
                        <div className="flex justify-center items-center gap-3 py-5 bg-slate-50/50 backdrop-blur-sm border-t border-slate-100 mt-auto">
                           <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-emerald-500 hover:border-emerald-200 transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:pointer-events-none" disabled={currentPage === 1}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                           </button>
                           <div className="flex gap-2">
                              {Array.from({ length: Math.ceil(filteredFullList.length / itemsPerPage) }).map((_, i) => (
                                 <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-2xl font-black text-xs transition-all ${currentPage === i + 1 ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}>
                                    {i + 1}
                                 </button>
                              ))}
                           </div>
                           <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredFullList.length / itemsPerPage), p + 1))} className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-emerald-500 hover:border-emerald-200 transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:pointer-events-none" disabled={currentPage === Math.ceil(filteredFullList.length / itemsPerPage)}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            ) : null}

            {isSingleAddOpen && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500">
                  <div className="bg-white rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] w-full max-w-xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500">
                     <div className="bg-slate-50 px-14 py-10 border-b border-slate-100 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10">
                           <h3 className="text-3xl font-[1000] text-slate-800 italic uppercase leading-none mb-2 tracking-tighter">New Portal Access</h3>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] leading-none">Manual Campus Provisioning System</p>
                        </div>
                        <button onClick={() => setIsSingleAddOpen(false)} className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 hover:rotate-90 transition-all relative z-10 shadow-sm bg-white">✕</button>
                     </div>
                     <div className="p-14 space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Region</label>
                              <input value={singleReg.region} onChange={e => setSingleReg({ ...singleReg, region: e.target.value })} className="w-full bg-slate-50 border-2 border-transparent px-7 py-5 rounded-[2rem] text-slate-800 text-sm font-black focus:bg-white focus:border-emerald-400 focus:shadow-2xl focus:shadow-emerald-500/10 transition-all outline-none" placeholder="e.g. 서울" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campus Name</label>
                              <input value={singleReg.name} onChange={e => setSingleReg({ ...singleReg, name: e.target.value })} className="w-full bg-slate-50 border-2 border-transparent px-7 py-5 rounded-[2rem] text-slate-800 text-sm font-black focus:bg-white focus:border-emerald-400 focus:shadow-2xl focus:shadow-emerald-500/10 transition-all outline-none" placeholder="신촌 캠퍼스" />
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Portal Account ID</label>
                              <input value={singleReg.id} onChange={e => setSingleReg({ ...singleReg, id: e.target.value })} className="w-full bg-slate-50 border-2 border-transparent px-7 py-5 rounded-[2rem] text-slate-800 text-sm font-black focus:bg-white focus:border-emerald-400 focus:shadow-2xl focus:shadow-emerald-500/10 transition-all outline-none" placeholder="eie0001" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Credentials (PW)</label>
                              <input type="password" value={singleReg.pw} onChange={e => setSingleReg({ ...singleReg, pw: e.target.value })} className="w-full bg-slate-50 border-2 border-transparent px-7 py-5 rounded-[2rem] text-slate-800 text-sm font-black focus:bg-white focus:border-emerald-400 focus:shadow-2xl focus:shadow-emerald-500/10 transition-all outline-none" placeholder="••••••••" />
                           </div>
                        </div>
                        <button onClick={() => {
                           if (!singleReg.region || !singleReg.name || !singleReg.id) return alert('Fill all details.');
                           onBulkRegister([{ region: singleReg.region, name: singleReg.name }], [{ id: singleReg.id, pw: singleReg.pw || singleReg.id, name: `[${singleReg.region}] ${singleReg.name}`, role: 'campus', status: 'approved', level: defaultCampusLevel }]);
                           setSingleReg({ region: '', name: '', id: '', pw: '' }); setIsSingleAddOpen(false);
                        }} className="w-full py-5 bg-emerald-500 text-white rounded-[1.8rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all text-sm mt-4">Create Account →</button>
                     </div>
                  </div>
               </div>
            )}
         </main>
      </div>
   );
};

// --- App Container ---

export default function App() {
   const [user, setUser] = useState<User | null>(null);
   const [view, setView] = useState<'login' | 'signup' | 'pending'>('login');
   const [selectedGame, setSelectedGame] = useState<string | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
   const [defaultCampusLevel, setDefaultCampusLevel] = useState<number>(1);

   const [allUsers, setAllUsers] = useState<User[]>([]);
   const [registeredCampuses, setRegisteredCampuses] = useState<Campus[]>([]);
   const [gameReqLevels, setGameReqLevels] = useState<Record<string, number>>({
      'number-guess': 1, 'word-search': 2, 'word-chain': 3, 'bingo': 4, 'quiz': 5, 'speed-game': 6, 'word-certification': 7, 'tug-of-war': 1
   });

   useEffect(() => {
      import('../lib/api').then(api => {
         api.getGameSettings().then(cloudSettings => {
            if (cloudSettings && Object.keys(cloudSettings).length > 0) {
               setGameReqLevels(cloudSettings);
               if (cloudSettings['default-campus-level']) {
                  setDefaultCampusLevel(cloudSettings['default-campus-level']);
               }
            } else {
               // Fallback to local
               const stored = localStorage.getItem('eie_game_req_levels');
               if (stored) {
                  try {
                     const parsed = JSON.parse(stored);
                     setGameReqLevels(parsed);
                     if (parsed['default-campus-level']) setDefaultCampusLevel(parsed['default-campus-level']);
                  } catch (e) { }
               }
            }
         });
      });
   }, []);

   const updateGameLevel = (gameId: string, lv: number) => {
      const next = { ...gameReqLevels, [gameId]: lv };
      setGameReqLevels(next);
      localStorage.setItem('eie_game_req_levels', JSON.stringify(next));
      // Cloud Sync
      import('../lib/api').then(api => api.updateGameSetting(gameId, lv));
   };

   useEffect(() => {
      import('../lib/api').then(api => {
         Promise.all([api.getUsers(), api.getCampuses()]).then(async ([usersData, campusData]) => {
            if (!usersData || usersData.length === 0) {
               const defaultHQ = { id: 'admin2026', pw: 'admin2026', name: '본사 총괄 관리자', role: 'hq' as const, status: 'approved' as const, level: 9 };
               const defaultCampus = { id: 'eie0001', pw: 'eie0001', name: '[서울] 신촌 캠퍼스', role: 'campus' as const, status: 'approved' as const, level: 1 };
               await api.createUser({ ...defaultHQ, login_id: defaultHQ.id });
               await api.createUser({ ...defaultCampus, login_id: defaultCampus.id });
               await api.createCampus({ region: '서울', name: '신촌 캠퍼스' });

               setAllUsers([defaultHQ, defaultCampus]);
               setRegisteredCampuses([{ region: '서울', name: '신촌 캠퍼스' }]);
            } else {
               setAllUsers(usersData);
               setRegisteredCampuses(campusData || []);
            }
            setIsLoading(false);
         });
      }).catch(err => {
         console.warn("API Error:", err);
         setIsLoading(false);
      });
   }, []);

   const handleLogin = (id: string, pw: string) => {
      const cleanId = id.trim();
      const cleanPw = pw.trim();
      let found: User | undefined = undefined;
      if (cleanId === 'admin2026' && cleanPw === 'admin2026') {
         found = { id: 'admin2026', pw: 'admin2026', name: '본사 총괄 관리자', role: 'hq', status: 'approved', level: 9 };
      } else if (cleanId === 'campus2026' && cleanPw === 'campus2026') {
         found = { id: 'campus2026', pw: 'campus2026', name: '[서울] 강남 캠퍼스', role: 'campus', status: 'approved', level: 7 };
      } else {
         // 저장된 ID/PW도 trim 후 비교 (엑셀 등록 시 공백/소수점 이슈 방지)
         found = allUsers.find(u => toSafeStr(u.id) === cleanId && toSafeStr(u.pw) === cleanPw && u.role !== 'hq');
      }

      if (found) {
         if (found.status === 'suspended') { alert('계정이 정지되었습니다. 본사에 문의하세요.'); return; }
         if (found.status === 'pending') {
            setView('pending');
            return;
         }
         if (found.status === 'approved') {
            setUser({ ...found });
         } else {
            alert('승인되지 않은 계정입니다. 본사에 문의하세요.');
         }
      } else { alert('아이디 또는 비밀번호가 일치하지 않습니다.'); }
   };

   const handleSignup = (data: any) => {
      if (allUsers.some(u => u.id === data.id)) { alert('Exists.'); return; }
      const nu: User = {
         id: data.id,
         pw: data.pw,
         name: data.name,
         role: 'campus',
         status: 'pending',
         level: defaultCampusLevel,
         email: data.email,
         phone: data.phone
      };
      setAllUsers(prev => [...prev, nu]);
      setView('pending');
      import('../lib/api').then(api => api.createUser({ ...nu, login_id: nu.id }));
   };

   const logout = () => { setUser(null); setView('login'); setSelectedGame(null); };

   if (isLoading) return (
      <div className="min-h-screen bg-[#fff7f9] flex flex-col items-center justify-center font-sans uppercase">
         <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center text-4xl animate-bounce shadow-2xl shadow-rose-500/20">🎮</div>
         <div className="mt-8 text-rose-900 font-[1000] italic uppercase tracking-tighter text-2xl animate-pulse">Loading Hub...</div>
      </div>
   );

   if (!user) {
      if (view === 'signup') return <Signup onSignup={handleSignup} onGoLogin={() => setView('login')} />;
      if (view === 'pending') return (
         <div className="min-h-screen bg-[#fff7f9] flex flex-col items-center justify-center text-slate-800 p-10 font-sans">
            <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center text-5xl mb-10 border border-rose-100 animate-bounce shadow-xl">⏳</div>
            <h1 className="text-6xl font-[1000] italic uppercase tracking-tighter mb-4 text-rose-900">Approval Pending</h1>
            <p className="text-slate-400 text-xl mb-14 max-w-lg text-center font-bold tracking-tight">회원가입 신청이 성공적으로 접수되었습니다. <br />본사 관리자의 승인 절차 후에 로그인이 가능합니다.</p>
            <button onClick={() => setView('login')} className="px-16 py-6 bg-white border-2 border-slate-100 rounded-[2rem] font-black uppercase text-sm tracking-[0.3em] text-rose-500 hover:border-rose-200 hover:shadow-2xl transition-all shadow-xl">메인으로 돌아가기</button>
         </div>
      );
      return (
         <>
            <LandingPage onOpenLogin={() => setIsLoginModalOpen(true)} onGoSignup={() => setView('signup')} />
            <LoginModal
               isOpen={isLoginModalOpen}
               onClose={() => setIsLoginModalOpen(false)}
               onLogin={handleLogin}
               onGoSignup={() => setView('signup')}
            />
         </>
      );
   }
   if (user.role === 'hq') {
      const handleDeleteCampus = (n: any, r: any, uid: any) => {
         if (n && r) {
            setRegisteredCampuses(prev => prev.filter(c => !(c.name === n && c.region === r)));
            import('../lib/api').then(api => api.deleteCampus(r, n));
         }
         if (uid) {
            setAllUsers(prev => prev.filter(u => u.id !== uid));
            import('../lib/api').then(api => api.deleteUser(uid));
         }
      };

      const handleBulkRegister = async (cList: any[], uList: any[]) => {
         // name or region might be undefined in some cases, so safely handle with optional chaining or fallback
         const newC = cList.filter(c => !registeredCampuses.some(x =>
            (x.name || '').trim() === (c.name || '').trim() &&
            (x.region || '').trim() === (c.region || '').trim()
         ));

         const newU = uList.filter(u => !allUsers.some(x =>
            (x.id || '').trim() === (u.id || '').trim()
         ));

         if (newC.length > 0) {
            setRegisteredCampuses(prev => [...prev, ...newC]);
            const api = await import('../lib/api');
            await api.createCampusesBulk(newC);
         }
         if (newU.length > 0) {
            setAllUsers(prev => [...prev, ...newU]);
            const api = await import('../lib/api');
            const preparedUsers = newU.map(u => ({ ...u, login_id: u.id }));
            await api.createUsersBulk(preparedUsers);
         }

         alert(`캠퍼스 일괄 등록 결과:\n\n- 신규 캠퍼스: ${newC.length}개\n- 신규 계정: ${newU.length}개\n\n중복된 데이터(${cList.length - newC.length}건)는 자동으로 제외되었습니다.`);
      };

      const handleResetAll = async () => {
         setRegisteredCampuses([]);
         setAllUsers(prev => prev.filter(u => u.role === 'hq'));
         // Optional: This might be dangerous to have in production but matching original behavior
         // Doing a full delete via API would require deleting all, skipped for safety unless needed.
         alert('데이터 초기화 완료 (UI 초기화됨. DB 완전 삭제는 주의하세요!)');
      };

      return <AdminDashboard
         campusUsers={allUsers.filter(u => u.role === 'campus')}
         updateLevel={(id: any, lvl: any, stat: any) => {
            setAllUsers(prev => prev.map(u => u.id === id ? { ...u, level: lvl, status: stat || u.status } : u));
            import('../lib/api').then(api => api.updateUserLevel(id, lvl, stat));
         }}
         onBulkLevelUpdate={(ids: string[], lvl: number) => {
            setAllUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, level: lvl } : u));
            import('../lib/api').then(api => api.updateUsersLevelBulk(ids, lvl));
         }}
         defaultCampusLevel={defaultCampusLevel}
         onUpdateDefaultLevel={(lv: number) => {
            setDefaultCampusLevel(lv);
            updateGameLevel('default-campus-level', lv);
         }}
         onDeleteCampus={handleDeleteCampus}
         onBulkRegister={handleBulkRegister}
         onResetAll={handleResetAll}
         onLogout={logout}
         registeredCampuses={registeredCampuses}
         user={user}
         gameReqLevels={gameReqLevels}
         onUpdateGameLevel={updateGameLevel}
      />;
   }

   return (
      <div className={`h-screen bg-[#1a0b1c] text-white font-sans selection:bg-amber-500/30 flex flex-col lg:flex-row relative overflow-hidden`}>
         <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              .no-print { display: none !important; }
              div, main, section, #root { 
                overflow: visible !important; 
                height: auto !important; 
                display: block !important;
                position: static !important;
              }
            }
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

            .custom-scrollbar-light::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar-light::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.02); border-radius: 10px; }
            .custom-scrollbar-light::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 10px; }
            .custom-scrollbar-light::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.2); }
         `}} />
         {/* Mobile Header */}
         <header className="lg:hidden sticky top-0 z-[60] bg-[#120614]/80 backdrop-blur-3xl border-b border-white/5 px-6 py-4 flex items-center justify-between no-print shadow-2xl">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center text-xl font-black shadow-lg">E</div>
               <h2 className="text-lg font-black tracking-tighter uppercase italic">Game Hub</h2>
            </div>
            <div className="flex items-center gap-3 px-[32px] py-2 bg-white/5 rounded-full border border-white/10">
               <span className="text-xs font-black text-rose-500">{user?.id}</span>
            </div>
         </header>

         <aside className="hidden lg:flex w-80 bg-[#120614] border-r border-white/5 flex-col p-8 z-30 shadow-[20px_0_50px_rgba(0,0,0,0.8)] no-print shrink-0">
            <div className="flex items-center gap-5 mb-16 px-2">
               <div className="w-14 h-14 bg-gradient-to-br from-[#ff2e55] to-[#f43f5e] rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-rose-900/40 transform -rotate-3">E</div>
               <div>
                  <h2 className="text-2xl font-black tracking-tighter leading-none mb-1 uppercase italic">Game Hub</h2>
                  <p className="text-[10px] text-rose-500 font-bold uppercase tracking-[0.4em] opacity-70">Campus Admin</p>
               </div>
            </div>

            <nav className="space-y-4 flex-1">
               {[
                  { id: 'dash', label: '대시보드', active: selectedGame === null },
               ].map(item => (
                  <button key={item.id}
                     onClick={() => setSelectedGame(null)}
                     className={`w-full flex items-center justify-center gap-6 px-10 py-5 rounded-[2.5rem] transition-all font-black text-2xl uppercase tracking-tighter ${item.active ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-2xl shadow-rose-900/40' : 'text-white/20 hover:text-white hover:bg-white/5'}`}>
                     {item.label}
                  </button>
               ))}

               {selectedGame && (
                  <div className="pt-8 mt-8 border-t border-white/5 animate-in slide-in-from-left duration-500">
                     <button onClick={() => setSelectedGame(null)}
                        className="w-full flex items-center gap-5 px-8 py-5 rounded-[2.5rem] bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black text-xl uppercase tracking-tighter hover:bg-amber-50 hover:text-black transition-all shadow-xl group">
                        <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-black font-black text-xl transition-transform group-hover:-rotate-12 group-active:scale-90 shrink-0">🔙</div>
                        <span className="whitespace-nowrap">Lobby Hub</span>
                     </button>
                  </div>
               )}
               <div className="pt-8 mt-8 space-y-6 no-print border-t border-white/5">
                  <div className="px-10 py-8 bg-white/5 border border-white/10 rounded-[2.5rem] shadow-inner text-center">
                     <div className="flex flex-col gap-3">
                        <div className="text-3xl font-[1000] text-rose-500 tracking-tighter leading-none italic">{user?.id}</div>
                        <div className="text-xl font-black text-white/80 tracking-tight leading-normal">{user?.name}</div>
                     </div>
                  </div>
                  <button onClick={logout} className="w-full py-6 rounded-[2.5rem] bg-rose-600 text-white text-base font-black uppercase tracking-widest transition-all shadow-2xl shadow-rose-900/50 hover:bg-rose-500 hover:scale-105 active:scale-95 border-2 border-rose-500/30">Log Out</button>
               </div>
            </nav>
         </aside>

         <main className="flex-1 flex flex-col relative overflow-hidden bg-[#1a0b1c] pb-24 lg:pb-0 min-h-screen">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
               {selectedGame === null ? (
                  <div className="animate-in fade-in duration-1000 flex flex-col gap-6 max-w-[1400px] mx-auto h-full min-h-0 pt-2 pb-2 no-print">
                     <div className="flex flex-col gap-6 flex-shrink-0">
                        <div className="flex items-center justify-between px-8 border-l-[8px] border-amber-500 py-1">
                           <div className="flex flex-col">
                              <h2 className="text-[40px] font-[1000] italic uppercase tracking-tighter bg-gradient-to-r from-[#FFD700] via-[#FF8C00] to-[#FFD700] bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(255,215,0,0.3)] leading-tight">EiE Game Hub</h2>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 px-2">
                           {games.map((g, idx) => {
                              const reqLevel = gameReqLevels[g.id] || (idx + 1);
                              const isLocked = user.level < reqLevel;
                              return (
                                 <div key={g.id} onClick={() => !isLocked && setSelectedGame(g.id)}
                                    className={`group relative bg-[#120614] border ${isLocked ? 'border-white/5 grayscale pointer-events-none' : selectedGame === g.id ? 'border-amber-400 border-[3px] shadow-[0_40px_80px_-10px_rgba(251,191,36,0.6)] z-10' : 'border-white/10 hover:border-emerald-500/30 cursor-pointer shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]'} rounded-[2.5rem] overflow-hidden transition-all duration-700 ${!isLocked && selectedGame !== g.id ? 'hover:-translate-y-4 hover:shadow-[0_60px_100px_-20px_rgba(0,0,0,1)]' : ''}`}>

                                    {isLocked && (
                                       <div className="absolute top-8 left-0 right-0 z-20 text-center px-[32px]">
                                          <span className="inline-block px-[32px] py-1.5 bg-[#e11d48] text-white font-[1000] text-[9px] uppercase tracking-widest rounded-full shadow-2xl border border-white/20 animate-pulse">더 높은 레벨업을 하세요!</span>
                                       </div>
                                    )}

                                    <div className="h-[150px] overflow-hidden relative">
                                       <img src={g.img} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={g.title} />
                                       <div className="absolute inset-0 bg-gradient-to-t from-[#120614] via-transparent to-transparent opacity-100" />
                                       {!isLocked && (
                                          <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/80 backdrop-blur-3xl rounded-[0.75rem] text-[8px] font-black tracking-[0.2em] flex items-center gap-1.5 border border-white/10 text-emerald-400">
                                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" /> LIVE
                                          </div>
                                       )}
                                       {g.id === 'word-certification' && (
                                          <div className="absolute top-4 left-4 px-3 py-1.5 bg-[#ff2e55] rounded-[0.75rem] text-[8px] font-black tracking-[0.2em] text-white shadow-xl animate-bounce">
                                             NEW!
                                          </div>
                                       )}
                                    </div>
                                    <div className="p-6 pt-5 flex items-center justify-between gap-4">
                                       <div className="flex flex-col min-w-0">
                                          <h3 className={`text-lg font-[1000] mb-0.5 transition-colors duration-300 truncate ${!isLocked ? 'group-hover:text-amber-500 text-white' : 'text-white/20'}`}>{g.title}</h3>
                                          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] truncate">{g.subtitle}</p>
                                       </div>
                                       <div className={`flex flex-col items-center justify-center min-w-[64px] py-2 rounded-xl border transition-all ${isLocked ? 'bg-white/5 border-white/5' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                          <span className={`text-[8px] font-black uppercase tracking-widest leading-none mb-0.5 ${isLocked ? 'text-white/20' : 'text-amber-500'}`}>LEVEL</span>
                                          <span className={`text-xl font-[1000] leading-none italic ${isLocked ? 'text-white/20' : 'text-amber-500'}`}>{reqLevel}</span>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })}
                           {Array.from({ length: 3 }).map((_, i) => (
                              <div key={`soon-${i}`} className="group relative bg-[#120614]/50 border-2 border-white/5 border-dashed rounded-[3rem] overflow-hidden flex flex-col items-center justify-center p-12 min-h-[264px]">
                                 <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-3xl mb-4 opacity-20">🚀</div>
                                 <h3 className="text-2xl font-black text-white/40 uppercase tracking-tighter italic mb-1">Coming Soon</h3>
                                 <p className="text-[9px] text-white/10 font-bold uppercase tracking-[0.4em]">Stay Tuned for Update</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="h-full flex flex-col animate-in fade-in duration-500 overflow-hidden max-w-[1400px] mx-auto w-full pt-1 p-2 relative">
                     <div className="flex-1 bg-[#FAF9F6] rounded-[3rem] p-3 border border-slate-200 overflow-hidden flex flex-col shadow-[0_20px_40px_rgba(0,0,0,0.1)] mb-1 mt-4">
                        <div className="flex-1 overflow-hidden px-1 py-1">
                           {selectedGame === 'word-chain' ? (<WordChain />) :
                              selectedGame === 'bingo' ? (<BingoGame />) :
                                 selectedGame === 'speed-game' ? (<SpeedGame />) :
                                    selectedGame === 'word-search' ? (<WordSearch />) :
                                       selectedGame === 'quiz' ? (<QuizGame />) :
                                          selectedGame === 'number-guess' ? (<NumberGuess />) :
                                             selectedGame === 'word-certification' ? (<WordLevel onBack={() => setSelectedGame(null)} maxLevel={user.level} />) :
                                                selectedGame === 'tug-of-war' ? (<TugOfWarGame />) :
                                                   null}
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </main>

         {/* Mobile Bottom Navigation */}
         <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-black/40 backdrop-blur-3xl border-t border-white/5 px-8 py-4 flex items-center justify-around no-print shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <button onClick={() => setSelectedGame(null)}
               className={`flex flex-col items-center gap-1.5 transition-all ${selectedGame === null ? 'text-rose-500 scale-110' : 'text-white/40'}`}>
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-1 ${selectedGame === null ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/40' : 'bg-white/5'}`}>🏠</div>
               <span className="text-[10px] font-black uppercase tracking-widest">Lobby</span>
            </button>
            <button onClick={logout} className="flex flex-col items-center gap-1.5 text-white/40">
               <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center text-2xl mb-1 shadow-lg shadow-amber-900/20">🚪</div>
               <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
            </button>
         </nav>
      </div>
   );
}
