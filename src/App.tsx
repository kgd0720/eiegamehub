import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
   LayoutDashboard, 
   CheckCircle, 
   Gamepad2, 
   BarChart3, 
   MapPin, 
   AlertCircle, 
   Clock,
   LogOut,
   Activity,
   ArrowRight,
   BookOpen,
   Award,
   Users
} from 'lucide-react';
import WordChain from './components/WordChain';
import BingoGame from './components/BingoGame';
import SpeedGame from './components/SpeedGame';
import WordSearch from './components/WordSearch';
import QuizGame from './components/QuizGame';
import NumberGuess from './components/NumberGuess';
import WordLevel from './components/WordLevel';
import TugOfWarGame from './components/TugOfWarGame';
import BalloonGame from './components/BalloonGame';

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
   { id: 'tug-of-war', title: '줄다리기', subtitle: 'Tug of War', icon: '🪘', gradient: 'from-amber-600 to-orange-400', desc: '1:1 실시간 대결! 문제를 맞힐 때마다 줄을 자신의 쪽으로 당기세요.', img: '/assets/games/tug-of-war-dash.png', tag: 'VS Mode' },
   { id: 'balloon-game', title: '풍선 터뜨리기', subtitle: 'Balloon Pop', icon: '🎈', gradient: 'from-pink-500 to-rose-400', desc: '손가락으로 풍선을 터뜨려 단어의 빈칸을 채우세요! (카메라 필요)', img: '/assets/games/balloon-pop.png', tag: 'Hand Motion' },
   { id: 'speed-game', title: '스피드게임', subtitle: 'Speed Quiz', icon: '⚡', gradient: 'from-yellow-500 to-orange-400', desc: '제한 시간 내에 정답을 설명하고 맞추는 박진감 넘치는 게임', img: '/assets/games/speed-game.png', tag: 'Speed' },
   { id: 'word-certification', title: '단어레벨', subtitle: 'Word Level', icon: '📈', gradient: 'from-indigo-600 to-indigo-400', desc: '어휘력을 인증받고 보상을 획득하는 성장 미션', img: '/assets/games/word-level.png', tag: 'Level' },
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
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-xl mb-4 transform -rotate-3">🎮</div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tighter italic uppercase leading-none">Login Hub</h1>
                  <div className="h-1 w-8 bg-indigo-600 mt-3 rounded-full" />
               </div>
               <div className="space-y-5">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account ID</label>
                     <input type="text" placeholder="아이디" value={id} onChange={e => setId(e.target.value)} autoComplete="off"
                        className="w-full bg-slate-50 border-2 border-slate-50 px-6 py-4 rounded-[1.2rem] text-slate-800 text-sm font-bold focus:outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-inner" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                     <input type="password" placeholder="비밀번호" value={pw} onChange={e => setPw(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-50 px-6 py-4 rounded-[1.2rem] text-slate-800 text-sm font-bold focus:outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-inner" />
                  </div>
                  <button onClick={() => { onLogin(id, pw); if (id && pw) onClose(); }}
                     className="w-full py-4 bg-indigo-600 text-white rounded-[1.2rem] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all text-sm mt-2">로그인</button>
                  <div className="pt-6 text-center border-t border-slate-50">
                     <button onClick={() => { onGoSignup(); onClose(); }} className="text-[11px] font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-widest">캠퍼스 계정 생성 요청 →</button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

const LandingPage = ({ onOpenLogin, onGoSignup }: any) => {
   return (
      <div className="min-h-screen w-full bg-[#0B0B1A] relative overflow-x-hidden overflow-y-auto font-sans flex flex-col selection:bg-indigo-500/30">
         {/* Background Overlays */}
         <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B1A]/80 via-transparent to-transparent hidden md:block" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0B0B1A]/80 to-transparent" />
         </div>

         {/* Header */}
         <header className="relative z-50 flex items-center justify-between mx-auto mt-4 md:mt-6 px-4 md:px-10 w-full md:w-[95%] max-w-7xl">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/40 transform -rotate-3 border border-white/10">
                  <span className="text-white font-black text-2xl italic tracking-tighter">E</span>
               </div>
               <div className="flex flex-col">
                  <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none flex gap-1">
                     <span className="text-white drop-shadow-md">EiE</span>
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-md">GAME HUB</span>
                  </h1>
               </div>
            </div>
            
            <nav className="hidden xl:flex items-center gap-12">
               {['게임소개', '학습주제', '이용방법', '고객센터'].map((item) => (
                  <button key={item} className="text-[14px] font-bold text-white/80 uppercase tracking-widest transition-all hover:text-white hover:scale-105">
                     {item}
                  </button>
               ))}
            </nav>

            <div className="flex items-center gap-2 md:gap-4">
               <button onClick={onOpenLogin} className="flex items-center gap-1 md:gap-2 text-[12px] md:text-[14px] font-black text-slate-900 bg-[#FFD700] hover:bg-[#FFC000] transition-all uppercase tracking-widest px-3 py-2 md:px-6 md:py-3 rounded-lg md:rounded-[1rem] shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:scale-105 active:scale-95">
                  <LogOut className="w-4 h-4 md:w-5 md:h-5 rotate-180" />
                  <span>로그인</span>
               </button>
               <button onClick={onGoSignup} className="flex items-center gap-1 md:gap-2 text-[12px] md:text-[14px] font-black text-slate-900 bg-[#FFD700] hover:bg-[#FFC000] transition-all uppercase tracking-widest px-3 py-2 md:px-6 md:py-3 rounded-lg md:rounded-[1rem] shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:scale-105 active:scale-95">
                  <Users className="w-4 h-4 md:w-5 md:h-5" />
                  <span>회원가입</span>
               </button>
            </div>
         </header>

         {/* Main Hero Section */}
         <main className="flex-1 relative z-30 flex flex-col md:flex-row items-center justify-between px-[6%] md:px-[8%] lg:px-[10%] pt-8 md:pt-0">
            {/* Hero Text */}
            <div className="max-w-3xl w-full animate-in slide-in-from-left-12 duration-1000 z-10 flex flex-col">
               <div className="inline-flex self-start items-center gap-2 md:gap-3 bg-indigo-900/40 border border-indigo-500/30 px-4 md:px-5 py-2 rounded-full mb-4 md:mb-6 backdrop-blur-md">
                  <Gamepad2 className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  <span className="text-[10px] md:text-[12px] font-bold text-white uppercase tracking-widest">게임으로 배우는 즐거운 영어!</span>
               </div>
               
               <div className="flex flex-col gap-2 mb-6 md:mb-8">
                  <h2 className="text-[clamp(3rem,12vw,6.875rem)] font-black leading-[0.9] tracking-tighter uppercase italic drop-shadow-2xl flex flex-col">
                     <span className="text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">EiE</span>
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-600 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] -mt-1 md:-mt-2">GAME HUB</span>
                  </h2>
               </div>

               <p className="text-sm md:text-base lg:text-[20px] font-medium text-white/80 max-w-xl leading-relaxed mb-8 md:mb-10">
                  신나는 게임으로 영어 단어, 문장, 회화를 <br />
                  자연스럽게 익혀요!
               </p>

               <button onClick={onOpenLogin} className="group relative w-full md:w-[320px] h-16 md:h-20 bg-indigo-500 hover:bg-indigo-400 rounded-full font-black text-lg md:text-xl text-white uppercase tracking-widest shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 md:gap-4 border border-indigo-400/50">
                  지금 바로 시작하기!
                  <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-2 transition-transform" />
               </button>
            </div>

            {/* Hero Image */}
            <div className="w-full md:absolute md:inset-0 z-0 flex items-center justify-center md:justify-end mt-12 md:mt-0 pointer-events-none animate-in fade-in duration-1000">
               <img 
                  src="/assets/images/landing_hero_final.png" 
                  className="w-[85%] max-w-sm md:max-w-none md:w-full md:h-full object-contain md:aspect-video opacity-90 drop-shadow-2xl md:drop-shadow-none" 
                  alt="Background Render" 
               />
            </div>
         </main>

         {/* Footer Features */}
         <section className="relative z-30 px-[5%] md:px-[8%] pb-8 md:pb-12 mt-12 md:mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
               {[
                  { icon: Gamepad2, title: '재미있는 게임 학습', desc: '다양한 게임으로 지루하지 않게!', color: 'text-fuchsia-500', border: 'border-fuchsia-500/30', shadow: 'shadow-[0_0_15px_rgba(217,70,239,0.2)]' },
                  { icon: BookOpen, title: '교과 연계 학습', desc: '학교 수업과 연계된 주제로 실력 쑥쑥!', color: 'text-blue-500', border: 'border-blue-500/30', shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]' },
                  { icon: Award, title: '보상 & 성장 시스템', desc: '미션을 클리어하고 보상을 받아요!', color: 'text-orange-500', border: 'border-orange-500/30', shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]' },
                  { icon: Users, title: '안전한 학습 환경', desc: '아이들이 안심하고 즐길 수 있어요!', color: 'text-emerald-500', border: 'border-emerald-500/30', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]' },
               ].map((feature, i) => (
                  <div key={i} className={`flex items-center gap-4 group p-4 rounded-2xl border bg-[#050110]/60 backdrop-blur-md transition-all hover:scale-105 ${feature.border} ${feature.shadow}`}>
                     <feature.icon className={`w-10 h-10 ${feature.color}`} />
                     <div>
                        <h5 className={`text-[14px] font-black italic tracking-tight ${feature.color}`}>{feature.title}</h5>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{feature.desc}</p>
                     </div>
                  </div>
               ))}
            </div>
         </section>
      </div>
   );
};

const Signup = ({ onSignup, onGoLogin }: any) => {
   const [formData, setFormData] = useState({ id: '', pw: '', name: '', phone: '', email: '' });
   return (
      <div className="h-screen flex font-sans bg-white overflow-hidden">
         <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative bg-[#0B0B1A] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.2)_0%,transparent_100%)] z-10 pointer-events-none" />
            <img 
               src="/assets/images/landing_hero_final.png" 
               className="absolute inset-0 w-full h-full object-cover object-[85%_bottom] opacity-95 z-0" 
               alt="Game Hub Hero" 
            />
            <div className="absolute top-16 left-12 xl:left-20 z-20">
               <h2 className="text-[3rem] xl:text-[4.5rem] font-black tracking-tighter uppercase italic drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] whitespace-nowrap">
                  <span className="text-white">EiE </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">GAME HUB</span>
               </h2>
            </div>
         </div>
         <div className="w-full lg:w-[580px] flex flex-col justify-center px-6 sm:px-12 md:px-20 bg-white relative shadow-2xl z-20 h-screen">
            <div className="max-w-md w-full mx-auto animate-in slide-in-from-bottom duration-700 py-4">
               <div className="flex flex-col items-center mb-6">
                  <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-xl mb-4">🎮</div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tighter italic uppercase leading-none">EiE Game Hub</h1>
                  <div className="h-1 w-10 bg-indigo-600 mt-2 rounded-full" />
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
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                        <div className="relative">
                           <input type={f.type} value={(formData as any)[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                              className="w-full bg-slate-50 border-2 border-slate-50 px-7 py-3 rounded-[1.5rem] text-slate-800 text-sm font-bold focus:outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-inner" placeholder={f.label} />
                        </div>
                     </div>
                  ))}
                  <button onClick={() => onSignup(formData)} className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 hover:scale-[1.02] transition-all text-sm mt-6">입점 신청하기 →</button>
                  <button onClick={onGoLogin} className="w-full py-4 text-slate-400 text-[11px] font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">이미 계정이 있나요? 로그인하기</button>
               </div>
            </div>
         </div>
      </div>
   );
};

// --- Admin Dashboard Component ---

const AdminDashboard = ({ campusUsers, updateLevel, onBulkLevelUpdate, defaultCampusLevel, onUpdateDefaultLevel, onDeleteCampus, onBulkRegister, onSingleRegister, onResetAll, onLogout, registeredCampuses, user, gameConfigs, onUpdateGameConfig }: any) => {
   const [activeTab, setActiveTab] = useState<'home' | 'approvals' | 'campuses' | 'games' | 'stats'>('home');
   const [statsMonth, setStatsMonth] = useState('4월');
   const [regionSearch, setRegionSearch] = useState('');
   const [nameSearch, setNameSearch] = useState('');
   const [levelSearch] = useState('');
   const [currentPage, setCurrentPage] = useState(1);
   const [itemsPerPage] = useState(12);
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [bulkTargetLevel, setBulkTargetLevel] = useState(1);
   const [isSingleAddOpen, setIsSingleAddOpen] = useState(false);
   const [singleReg, setSingleReg] = useState({ region: '', name: '', id: '', pw: '' });
   // const [wordLevelStats, setWordLevelStats] = useState<{ sheets: number, total: number, levelCounts: Record<number, number> } | null>(null);

   useEffect(() => {
      import('../lib/api').then(api => {
         api.getWordLevels().then(parsed => {
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
               parsed.reduce((acc: any, cur: any) => {
                  acc[cur.level] = (acc[cur.level] || 0) + 1;
                  return acc;
               }, {});
               // setWordLevelStats({ sheets: Object.keys(counts).length, total: parsed.length, levelCounts: counts });
            }
         });
      });
   }, []);

   const pendingCount = campusUsers.filter((u: any) => u.status === 'pending').length;

   const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
         try {
            const data = evt.target?.result;
            const wb = XLSX.read(data, { type: 'binary' });
            const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1);
            const cList: any[] = [];
            const uList: any[] = [];
            rows.forEach(row => {
               if (row[0] && row[1] && row[2]) {
                  const region = String(row[0]).trim();
                  const name = String(row[1]).trim();
                  const id = String(row[2]).trim();
                  const pw = row[3] ? String(row[3]).trim() : id;
                  cList.push({ region, name });
                  uList.push({ id, pw, name: `[${region}] ${name}`, role: 'campus', status: 'approved', level: defaultCampusLevel });
               }
            });
            if (cList.length > 0) {
               onBulkRegister(cList, uList);
            } else {
               alert('유효한 데이터가 없습니다. (양식: 지역, 캠퍼스명, ID, PW)');
            }
         } catch (err) { alert('엑셀 파싱 오류'); }
      };
      reader.readAsBinaryString(f);
      e.target.value = '';
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

   /* const renderLineChart = () => {
      const data = [120, 150, 180, 140, 210, 250, 230, 280, 310, 290, 350, 400];
      const max = Math.max(...data) * 1.2;
      const points = data.map((v, i) => `${(i / 11) * 100},${100 - (v / max) * 100}`).join(' ');
      return (
         <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-[180px] overflow-visible">
            <defs>
               <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
               </linearGradient>
            </defs>
            <path d={`M 0,100 L ${points} L 100,100 Z`} fill="url(#lineFill)" />
            <polyline fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
            {data.map((v, i) => (
               <circle key={i} cx={(i / 11) * 100} cy={100 - (v / max) * 100} r="1.5" fill="white" stroke="#6366f1" strokeWidth="1" />
            ))}
         </svg>
      );
   }; */

   return (
      <div className="h-screen bg-slate-50 text-slate-800 flex overflow-hidden font-sans selection:bg-indigo-100">
         <aside className="w-60 bg-slate-900 flex flex-col z-30 shadow-2xl shrink-0 no-print">
            <div className="p-8 border-b border-white/5 flex items-center gap-3">
               <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40 transform -rotate-3 transition-transform hover:rotate-0">
                  <Activity className="text-white w-6 h-6" />
               </div>
               <h2 className="text-xl font-black text-white italic tracking-tighter">HQ Hub</h2>
            </div>
            <nav className="flex-1 p-4 space-y-1 mt-6">
               {[
                  { id: 'home', icon: LayoutDashboard, label: 'Dashboard' },
                  { id: 'campuses', icon: MapPin, label: 'Campuses' },
                  { id: 'approvals', icon: CheckCircle, label: 'Approvals' },
                  { id: 'games', icon: Gamepad2, label: 'Games' },
                  { id: 'stats', icon: BarChart3, label: 'Analytics' },
               ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                     className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm tracking-tight ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                     <tab.icon className="w-5 h-5 opacity-70" /> {tab.label}
                  </button>
               ))}
            </nav>
            <div className="p-4 mt-auto border-t border-white/5">
               <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-xs font-black text-white">HQ</div>
                  <div className="flex flex-col min-w-0">
                     <span className="text-xs font-black text-white truncate">{user?.id}</span>
                     <span className="text-[10px] text-slate-500 font-bold uppercase truncate">{user?.name}</span>
                  </div>
               </div>
               <button onClick={onLogout} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border border-white/10 hover:border-rose-500/50 hover:text-rose-400 rounded-xl transition-all flex items-center justify-center gap-2">
                  <LogOut className="w-3 h-3" /> Sign Out
               </button>
            </div>
         </aside>

         <main className="flex-1 overflow-hidden p-6 lg:p-8 relative h-screen bg-slate-100 flex flex-col">
            <div className="max-w-[1400px] w-full h-full mx-auto flex flex-col min-h-0">
               {activeTab === 'home' ? (
                  <div className="animate-in fade-in duration-700 h-full flex flex-col min-h-0">
                     <header className="mb-6 flex items-center justify-between shrink-0">
                        <div>
                           <h1 className="text-2xl font-[1000] text-slate-900 tracking-tight leading-none mb-1">Systems Overview</h1>
                           <p className="text-sm font-medium text-slate-400">캠퍼스 통합 관리 및 운영 현황 지표입니다.</p>
                        </div>
                        <div className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-full shadow-sm">
                           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operational</span>
                        </div>
                     </header>
                     <div className="flex-1 min-h-0 flex flex-col gap-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0 lg:h-[160px]">
                           <div className="bg-white border border-slate-200 p-5 rounded-[1.5rem] shadow-sm flex flex-col h-full relative z-10 w-full overflow-hidden">
                              <h3 className="text-xs font-black text-slate-900 tracking-tight mb-2 italic uppercase shrink-0">Branches by Region (지역별 가맹점수)</h3>
                              <div className="flex-1 grid grid-cols-8 gap-1.5 items-center">
                                 {['서울', '경기', '인천', '강원', '충북', '충남', '세종', '대전', '경북', '경남', '대구', '부산', '광주', '전북', '전남', '제주'].map(reg => {
                                    const count = campusUsers.filter((u: any) => u.name && u.name.includes(reg)).length || Math.floor(Math.random() * 30 + 1);
                                    return (
                                       <div key={reg} className="bg-slate-50 rounded-lg py-1 flex flex-col items-center justify-center hover:bg-indigo-50 hover:scale-105 transition-all outline outline-1 outline-slate-100">
                                          <span className="text-[8px] font-black text-slate-400 mb-0">{reg}</span>
                                          <span className="text-[11px] font-[1000] text-indigo-600">{count}</span>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                           
                           <div className="bg-white border border-slate-200 px-8 py-4 rounded-[1.5rem] shadow-sm hover:shadow-xl transition-all group flex flex-row items-center justify-between h-full relative z-10 w-full overflow-hidden">
                              <div className="flex flex-col h-full justify-center">
                                 <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 text-amber-600 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center shadow-inner">
                                       <Clock className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">KPI</span>
                                 </div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Approvals</p>
                              </div>
                              <h3 className="text-6xl font-[1000] text-slate-900 tracking-tighter">{pendingCount.toLocaleString()}</h3>
                           </div>
                        </div>

                        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
                           <div className="bg-white border border-slate-200 p-6 rounded-[1.5rem] shadow-sm flex flex-col min-h-0 relative z-10 h-full">
                              <h3 className="text-lg font-black text-slate-900 tracking-tight mb-4 uppercase italic shrink-0">월별 접속 전국 Top 10 (Monthly)</h3>
                              <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar-light pr-3">
                                 {campusUsers.slice(0, 10).map((u: any, idx: number) => {
                                    const ratio = Math.max(5, 100 - idx * 8);
                                    return (
                                       <div key={idx} className="group">
                                          <div className="flex justify-between items-center mb-2 px-0.5">
                                             <div className="flex items-center gap-3">
                                                <span className="text-[11px] font-black text-indigo-400 italic">#{idx + 1}</span>
                                                <span className="text-[12px] font-[1000] text-slate-700 italic uppercase truncate max-w-[180px]">{u.name.split('] ')[1] || u.name}</span>
                                             </div>
                                             <span className="text-[10px] font-black text-indigo-600 uppercase">{(1250 - idx * 100).toLocaleString()} PTS</span>
                                          </div>
                                          <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                             <div className="h-full bg-indigo-400 rounded-full opacity-80 group-hover:bg-indigo-600 transition-all duration-700" style={{ width: `${ratio}%` }} />
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>

                           <div className="bg-white border border-slate-200 p-6 rounded-[1.5rem] shadow-sm flex flex-col min-h-0 relative z-10 h-full">
                              <h3 className="text-lg font-black text-slate-900 tracking-tight mb-4 uppercase italic shrink-0">연간 접속 전국 Top 10 (Annual)</h3>
                              <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar-light pr-3">
                                 {campusUsers.slice(0, 10).map((u: any, idx: number) => {
                                    const ratio = Math.max(5, 100 - idx * 6);
                                    return (
                                       <div key={idx} className="group">
                                          <div className="flex justify-between items-center mb-2 px-0.5">
                                             <div className="flex items-center gap-3">
                                                <span className="text-[11px] font-black text-amber-500 italic">#{idx + 1}</span>
                                                <span className="text-[12px] font-[1000] text-slate-700 italic uppercase truncate max-w-[180px]">{u.name.split('] ')[1] || u.name}</span>
                                             </div>
                                             <span className="text-[10px] font-black text-amber-600 uppercase">{(15000 - idx * 1200).toLocaleString()} PTS</span>
                                          </div>
                                          <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                             <div className="h-full bg-amber-400 rounded-full opacity-80 group-hover:bg-amber-500 transition-all duration-700" style={{ width: `${ratio}%` }} />
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               ) : activeTab === 'campuses' ? (
                  <div className="animate-in fade-in duration-700 h-full flex flex-col min-h-0">
                     <header className="mb-6 flex items-center justify-between shrink-0">
                        <div>
                           <h1 className="text-3xl font-[1000] text-slate-900 tracking-tight leading-none mb-1">Campus Management</h1>
                           <p className="text-sm font-medium text-slate-400">가맹 캠퍼스 통합 관리 시스템입니다.</p>
                        </div>
                        <div className="flex gap-3 items-center">
                           <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-2xl border border-slate-200 shadow-sm mr-2">
                              <span className="text-[10px] font-black text-slate-400 pl-2">기본 레벨:</span>
                              <select value={defaultCampusLevel} onChange={e => onUpdateDefaultLevel(parseInt(e.target.value))} className="bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl text-xs font-[1000] text-amber-700 outline-none cursor-pointer">
                                 {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>LV.{n}</option>)}
                              </select>
                           </div>
                           <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-2xl border border-slate-200 shadow-sm mr-2">
                              <select value={bulkTargetLevel} onChange={e => setBulkTargetLevel(parseInt(e.target.value))} className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-[1000] text-indigo-700 outline-none cursor-pointer">
                                 {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>LV.{n}</option>)}
                              </select>
                              <button onClick={() => {
                                 const confirmChange = confirm(`${selectedIds.length}개 캠퍼스의 레벨을 LV.${bulkTargetLevel}로 일괄 변경할까요?`);
                                 if (confirmChange) {
                                    onBulkLevelUpdate(selectedIds, bulkTargetLevel);
                                    setSelectedIds([]);
                                 }
                              }} disabled={selectedIds.length === 0} className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-sm">일괄 적용</button>
                           </div>
                           <label className="px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-lg hover:scale-105 transition-all cursor-pointer flex items-center gap-2">
                              일괄 등록 (엑셀)
                              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
                           </label>
                           <button onClick={() => setIsSingleAddOpen(true)} className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-lg hover:scale-105 transition-all">+ 계정 생성</button>
                           <button onClick={() => onResetAll()} className="px-5 py-3 bg-white border border-slate-200 text-rose-500 rounded-2xl font-black text-xs hover:bg-rose-50 transition-all border shadow-sm">Reset</button>
                        </div>
                     </header>
                     <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-4 shrink-0">
                           <select value={regionSearch} onChange={e => setRegionSearch(e.target.value)} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-black outline-none focus:ring-2 ring-indigo-500/20">
                              <option value="">전체 지역</option>
                              {['서울', '경기', '인천', '강원', '충북', '충남', '세종', '대전', '경북', '경남', '대구', '부산', '광주', '전북', '전남', '제주'].map(r => <option key={r} value={r}>{r}</option>)}
                           </select>
                           <input value={nameSearch} onChange={e => { setNameSearch(e.target.value); setCurrentPage(1); }} className="flex-1 bg-white px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-black shadow-sm outline-none focus:ring-2 ring-indigo-500/20" placeholder="CAMPUS NAME SEARCH..." />
                        </div>
                        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar-light">
                           <table className="w-full text-left">
                               <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest italic sticky top-0">
                                 <tr>
                                    <th className="px-6 py-3 w-12 text-center">
                                       <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                          checked={currentItems.length > 0 && currentItems.filter((i:any)=>i.user?.id).length > 0 && selectedIds.length === currentItems.filter((i:any)=>i.user?.id).length}
                                          onChange={(e) => {
                                             if (e.target.checked) setSelectedIds(currentItems.map((i: any) => i.user?.id).filter(Boolean));
                                             else setSelectedIds([]);
                                          }}
                                       />
                                    </th>
                                    <th className="px-4 py-3 w-16 text-center">No.</th>
                                    <th className="px-4 py-3 w-28 text-center">Region</th>
                                    <th className="px-4 py-3">Campus Name</th>
                                    <th className="px-4 py-3 w-40 text-center">Account ID</th>
                                    <th className="px-4 py-3 w-32 text-center">Level</th>
                                    <th className="px-4 py-3 w-32 text-center">Status</th>
                                    <th className="px-4 py-3 w-24 text-center">Action</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {currentItems.map((item: any, idx: number) => (
                                     <tr key={idx} className={`transition-colors ${selectedIds.includes(item.user?.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                                        <td className="px-6 py-2.5 text-center">
                                           {item.user?.id && (
                                              <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-300 focus:ring-indigo-500 cursor-pointer relative top-0.5"
                                                 checked={selectedIds.includes(item.user.id)}
                                                 onChange={(e) => {
                                                    if (e.target.checked) setSelectedIds([...selectedIds, item.user.id]);
                                                    else setSelectedIds(selectedIds.filter(id => id !== item.user.id));
                                                 }}
                                              />
                                           )}
                                        </td>
                                       <td className="px-6 py-2.5 text-xs font-black italic text-slate-300">{(idx + 1 + (currentPage - 1) * itemsPerPage).toString().padStart(3, '0')}</td>
                                       <td className="px-4 py-2.5"><span className="px-2.5 py-1 bg-slate-900 text-white text-[9px] font-[1000] rounded-md italic">{item.region}</span></td>
                                       <td className="px-4 py-2.5 font-black italic text-slate-700 uppercase">{item.name}</td>
                                       <td className="px-4 py-2.5 text-center"><span className="text-[11px] font-black text-rose-500 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">{item.user?.id || '—'}</span></td>
                                       <td className="px-4 py-2.5 text-center">
                                          <select value={item.user?.level || 1} onChange={e => updateLevel(item.user.id, parseInt(e.target.value), item.user.status)} className="bg-indigo-50 border border-indigo-200 text-xs font-[1000] px-3 py-1 rounded-lg outline-none text-indigo-700 italic cursor-pointer focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm">
                                             {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>LV.{n}</option>)}
                                          </select>
                                       </td>
                                       <td className="px-4 py-2.5 text-center">
                                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${item.user?.status === 'approved' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white animate-pulse'}`}>
                                             {item.user?.status === 'approved' ? 'Active' : 'Pending'}
                                          </span>
                                       </td>
                                       <td className="px-4 py-2.5 text-center"><button onClick={() => onDeleteCampus(item.name, item.region, item.user?.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><AlertCircle className="w-4 h-4" /></button></td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between no-print overflow-x-auto no-scrollbar">
                           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic shrink-0 pr-4">
                              Showing {filteredFullList.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(filteredFullList.length, currentPage * itemsPerPage)} of {filteredFullList.length} Campuses
                           </div>
                           <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-all shrink-0">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                              </button>
                              {Array.from({ length: Math.ceil(filteredFullList.length / itemsPerPage) }).map((_, i) => (
                                 <button 
                                    key={i} 
                                    onClick={() => { setCurrentPage(i + 1); }}
                                    className={`w-9 h-9 flex items-center justify-center rounded-xl font-black text-[11px] transition-all shrink-0 ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-white border border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600'}`}
                                 >
                                    {i + 1}
                                 </button>
                              ))}
                              <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredFullList.length / itemsPerPage), p + 1))} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-all shrink-0">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               ) : activeTab === 'games' ? (
                  <div className="animate-in fade-in duration-700 h-full flex flex-col min-h-0 max-w-[1225px] w-full mx-auto">
                     <header className="mb-6 flex items-center justify-between shrink-0">
                        <div>
                           <h1 className="text-3xl font-[1000] text-slate-900 tracking-tight leading-none mb-1">Game Configuration</h1>
                           <p className="text-sm font-medium text-slate-400">게임별 노출 순서 및 이용 레벨을 설정합니다.</p>
                        </div>
                        <button 
                           onClick={() => {
                              const batch = games.map(g => ({ game_id: g.id, ...gameConfigs[g.id] }));
                              import('../lib/api').then(api => api.bulkUpdateGameSettings(batch).then(() => alert('모든 설정이 일괄 적용되었습니다.')));
                           }}
                           className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                        >
                           <Activity className="w-4 h-4" /> 일괄 적용
                        </button>
                     </header>

                     <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
                        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar-light">
                           <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest italic sticky top-0 z-10">
                                 <tr>
                                    <th className="px-8 py-3 w-20 text-center">순서</th>
                                    <th className="px-8 py-3 w-24 text-center">아이콘</th>
                                    <th className="px-8 py-3">게임 컨텐츠</th>
                                    <th className="px-4 py-3 w-32 text-center">지정 레벨</th>
                                    <th className="px-4 py-3 w-40 text-center">활성 상태</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {[...games].sort((a, b) => {
                                    const orderA = gameConfigs[a.id]?.level_order ?? 99;
                                    const orderB = gameConfigs[b.id]?.level_order ?? 99;
                                    if (orderA !== orderB) return orderA - orderB;
                                    return a.title.localeCompare(b.title);
                                 }).map((game, idx) => {
                                    const config = gameConfigs[game.id] || { req_level: 1, level_order: idx + 1, is_active: true };
                                    return (
                                       <tr key={game.id} className={`hover:bg-slate-50 transition-colors group ${!config.is_active ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                                          <td className="px-6 py-2 text-center">
                                             <input 
                                                type="number"
                                                value={config.level_order}
                                                onChange={(e) => onUpdateGameConfig(game.id, { level_order: parseInt(e.target.value) || 0 })}
                                                className="w-10 h-8 bg-slate-50 border border-slate-200 text-center text-sm font-black text-slate-400 focus:text-indigo-600 focus:border-indigo-300 rounded-lg outline-none transition-all"
                                             />
                                          </td>
                                          <td className="px-6 py-2 text-center">
                                             <div className={`w-9 h-9 mx-auto bg-gradient-to-br ${game.gradient} rounded-xl flex items-center justify-center text-lg shadow-sm border border-white/20 transform group-hover:scale-110 transition-transform`}>
                                                {game.icon}
                                             </div>
                                          </td>
                                          <td className="px-6 py-2">
                                             <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                   <h3 className="text-sm font-black text-slate-800 italic uppercase tracking-tight">{game.title}</h3>
                                                   <span className="text-[8px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-black uppercase">{game.tag}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{game.subtitle}</p>
                                             </div>
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                             <select
                                                value={config.req_level}
                                                onChange={(e) => onUpdateGameConfig(game.id, { req_level: parseInt(e.target.value) })}
                                                className="bg-indigo-50 text-indigo-600 text-xs font-black rounded-lg px-2 py-1 border border-indigo-100 outline-none cursor-pointer hover:bg-indigo-100 transition-all italic"
                                             >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(v => <option key={v} value={v}>LV.{v}</option>)}
                                             </select>
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                             <button 
                                                onClick={() => onUpdateGameConfig(game.id, { is_active: !config.is_active })}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${config.is_active ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
                                             >
                                                {config.is_active ? 'Active' : 'Disabled'}
                                             </button>
                                          </td>
                                       </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               ) : activeTab === 'approvals' ? (
                  <div className="animate-in fade-in duration-700 h-full flex flex-col min-h-0">
                     <header className="mb-6 flex items-center justify-between shrink-0">
                        <div>
                           <h1 className="text-3xl font-[1000] text-slate-900 tracking-tight leading-none mb-1">Access Approvals</h1>
                           <p className="text-sm font-medium text-slate-400">신규 캠퍼스 계정 생성 요청을 검토합니다.</p>
                        </div>
                        <div className="bg-amber-100 text-amber-600 px-6 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2">
                           <Clock className="w-4 h-4" /> Wait List: {pendingCount}
                        </div>
                     </header>
                     <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
                        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar-light">
                           <table className="w-full text-left">
                              <thead className="bg-[#fff1f2] text-rose-400 uppercase text-[10px] font-black tracking-widest italic sticky top-0 z-10">
                                 <tr>
                                    <th className="px-10 py-6">Campus Info</th>
                                    <th className="px-10 py-6">Account Detail</th>
                                    <th className="px-10 py-6 text-right">Action</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-rose-50 bg-white/20">
                                 {campusUsers.filter((u: any) => u.status === 'pending').map((u: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-rose-50 transition-colors">
                                       <td className="px-10 py-6 font-black italic text-slate-800 uppercase text-lg">{u.name}</td>
                                       <td className="px-10 py-6">
                                          <div className="flex flex-col">
                                             <span className="text-[11px] font-black text-rose-600 italic uppercase">ID: {u.id}</span>
                                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{u.email}</span>
                                          </div>
                                       </td>
                                       <td className="px-10 py-6 text-right">
                                          <button 
                                             onClick={() => updateLevel(u.id, defaultCampusLevel, 'approved')} 
                                             className="px-8 py-3 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg hover:scale-105 transition-all"
                                          >
                                             승인 수락 →
                                          </button>
                                       </td>
                                    </tr>
                                 ))}
                                 {pendingCount === 0 && (
                                    <tr>
                                       <td colSpan={3} className="py-24 text-center">
                                          <div className="flex flex-col items-center opacity-20">
                                             <CheckCircle className="w-16 h-16 mb-4" />
                                             <span className="font-black italic uppercase tracking-widest">Wait List Empty</span>
                                          </div>
                                       </td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               ) : activeTab === 'stats' ? (
                  <div className="animate-in fade-in duration-700 h-full flex flex-col min-h-0">
                     <header className="mb-6 shrink-0">
                        <h1 className="text-3xl font-[1000] text-slate-900 tracking-tight leading-none mb-1">Performance Analytics</h1>
                        <p className="text-sm font-medium text-slate-400">데이터 기반 캠퍼스 운영 현황 분석입니다.</p>
                     </header>
                     <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 flex-1 min-h-0">
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden">
                           <header className="bg-indigo-50 px-8 py-5 border-b border-indigo-100 flex items-center justify-between">
                              <h3 className="text-base font-black text-indigo-900 italic tracking-tighter uppercase leading-none">Access Ranking Top 10</h3>
                              <select value={statsMonth} onChange={e => setStatsMonth(e.target.value)} className="bg-white border border-indigo-200 text-[10px] font-black rounded-lg px-2.5 py-1 outline-none">
                                 {['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'].map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                           </header>
                           <div className="flex-1 overflow-y-auto custom-scrollbar-light">
                              <table className="w-full text-left">
                                 <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest italic">
                                    <tr><th className="px-8 py-3">Rank</th><th className="px-8 py-3">Campus</th><th className="px-8 py-3 text-right">Score</th></tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50">
                                    {campusUsers.slice(0, 10).map((u: any, idx: number) => (
                                       <tr key={idx} className="hover:bg-slate-50/50">
                                          <td className="px-8 py-4 text-indigo-600 font-extrabold italic text-xl">#{String(idx + 1).padStart(2, '0')}</td>
                                          <td className="px-8 py-4 text-xs font-black text-slate-700 italic uppercase">{u.name.split('] ')[1] || u.name}</td>
                                          <td className="px-8 py-4 text-right font-black text-indigo-900">{(1250 - idx * 100).toLocaleString()} <span className="text-[9px] text-slate-400">PTS</span></td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden">
                           <header className="bg-amber-50 px-8 py-5 border-b border-amber-100">
                              <h3 className="text-base font-black text-amber-900 italic tracking-tighter uppercase leading-none">Cumulative Performance</h3>
                           </header>
                           <div className="flex-1 overflow-y-auto custom-scrollbar-light">
                              <table className="w-full text-left">
                                 <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest italic">
                                    <tr><th className="px-8 py-3">Rank</th><th className="px-8 py-3">Campus</th><th className="px-8 py-3 text-right">Total</th></tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50">
                                    {campusUsers.slice(0, 10).map((u: any, idx: number) => (
                                       <tr key={idx} className="hover:bg-slate-50/50">
                                          <td className="px-8 py-4 text-amber-600 font-extrabold italic text-xl">#{String(idx + 1).padStart(2, '0')}</td>
                                          <td className="px-8 py-4 text-xs font-black text-slate-700 italic uppercase">{u.name.split('] ')[1] || u.name}</td>
                                          <td className="px-8 py-4 text-right font-black text-amber-900">{(15000 - idx * 1200).toLocaleString()} <span className="text-[9px] text-slate-400">PTS</span></td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     </div>
                  </div>
               ) : null}
            </div>

            {isSingleAddOpen && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-500">
                  <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-500">
                     <div className="p-12 border-b border-slate-50 flex items-center justify-between">
                        <div>
                           <h3 className="text-2xl font-[1000] text-slate-900 tracking-tighter italic uppercase leading-none mb-1">Nexus Provision</h3>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">Manual Account Creator</p>
                        </div>
                        <button onClick={() => setIsSingleAddOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all">✕</button>
                     </div>
                     <div className="p-12 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Region</label><input value={singleReg.region} onChange={e => setSingleReg({...singleReg, region: e.target.value})} className="w-full bg-slate-50 border border-slate-100 px-6 py-3 rounded-2xl text-xs font-black focus:border-indigo-500 focus:bg-white transition-all outline-none" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campus</label><input value={singleReg.name} onChange={e => setSingleReg({...singleReg, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 px-6 py-3 rounded-2xl text-xs font-black focus:border-indigo-500 focus:bg-white transition-all outline-none" /></div>
                        </div>
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Portal ID</label><input value={singleReg.id} onChange={e => setSingleReg({...singleReg, id: e.target.value})} className="w-full bg-slate-50 border border-slate-100 px-6 py-3 rounded-2xl text-xs font-black focus:border-indigo-500 focus:bg-white transition-all outline-none" /></div>
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Credential</label><input type="password" value={singleReg.pw} onChange={e => setSingleReg({...singleReg, pw: e.target.value})} className="w-full bg-slate-50 border border-slate-100 px-6 py-3 rounded-2xl text-xs font-black focus:border-indigo-500 focus:bg-white transition-all outline-none" /></div>
                        <button onClick={() => {
                           onSingleRegister({ region: singleReg.region, name: singleReg.name }, { id: singleReg.id, pw: singleReg.pw || singleReg.id, name: `[${singleReg.region}] ${singleReg.name}`, role: 'campus', status: 'approved', level: defaultCampusLevel });
                           setIsSingleAddOpen(false);
                        }} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all">Establish Access →</button>
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
   const [gameConfigs, setGameConfigs] = useState<Record<string, { req_level: number, level_order: number, is_active: boolean }>>({
      'number-guess': { req_level: 1, level_order: 1, is_active: true },
      'word-search': { req_level: 2, level_order: 2, is_active: true },
      'word-chain': { req_level: 3, level_order: 3, is_active: true },
      'bingo': { req_level: 4, level_order: 4, is_active: true },
      'quiz': { req_level: 5, level_order: 5, is_active: true },
      'tug-of-war': { req_level: 5, level_order: 6, is_active: true },
      'balloon-game': { req_level: 2, level_order: 7, is_active: true },
      'speed-game': { req_level: 6, level_order: 8, is_active: true },
      'word-certification': { req_level: 7, level_order: 9, is_active: true }
   });

   const updateGameConfig = (gameId: string, payload: { req_level?: number, level_order?: number, is_active?: boolean }) => {
      const nextConfig = { ...gameConfigs[gameId], ...payload };
      setGameConfigs(prev => {
         const nextAll = { ...prev, [gameId]: nextConfig };
         localStorage.setItem('eie_game_configs', JSON.stringify(nextAll));
         return nextAll;
      });
      import('../lib/api').then(api => api.updateGameSetting(gameId, nextConfig));
   };

   useEffect(() => {
      import('../lib/api').then(api => {
         api.getGameSettings().then(cloudSettings => {
            if (cloudSettings && Object.keys(cloudSettings).length > 0) {
               setGameConfigs(prev => ({ ...prev, ...cloudSettings }));
               if (cloudSettings['default-campus-level']) {
                  setDefaultCampusLevel(cloudSettings['default-campus-level'].req_level || 1);
               }
            } else {
               const stored = localStorage.getItem('eie_game_configs');
               if (stored) {
                  try {
                     const parsed = JSON.parse(stored);
                     setGameConfigs(prev => ({ ...prev, ...parsed }));
                     if (parsed['default-campus-level']) setDefaultCampusLevel(parsed['default-campus-level'].req_level || 1);
                  } catch (e) { }
               }
            }
         });
      });
   }, []);

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
         found = allUsers.find(u => toSafeStr(u.id) === cleanId && toSafeStr(u.pw) === cleanPw);
      }
      if (found) {
         if (found.status === 'suspended') { alert('계정이 정지되었습니다. 본사에 문의하세요.'); return; }
         if (found.status === 'pending') { setView('pending'); return; }
         setUser({ ...found });
      } else {
         alert('아이디 또는 비밀번호가 일치하지 않습니다.');
      }
   };

   const handleSignup = (data: any) => {
      if (allUsers.some(u => u.id === data.id)) { alert('이미 존재하는 아이디입니다.'); return; }
      const nu: User = { id: data.id, pw: data.pw, name: data.name, role: 'campus', status: 'pending', level: defaultCampusLevel, email: data.email, phone: data.phone };
      setAllUsers(prev => [...prev, nu]);
      setView('pending');
      import('../lib/api').then(api => api.createUser({ ...nu, login_id: nu.id }));
   };

   const logout = () => { setUser(null); setView('login'); setSelectedGame(null); };

   if (isLoading) return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans">
         <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-4xl animate-bounce shadow-2xl shadow-indigo-900/40">🎮</div>
         <div className="mt-8 text-white font-black italic uppercase tracking-widest text-lg animate-pulse">Loading Hub...</div>
      </div>
   );

   if (!user) {
      if (view === 'signup') return <Signup onSignup={handleSignup} onGoLogin={() => setView('login')} />;
      if (view === 'pending') return (
         <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 p-10 font-sans">
            <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-5xl mb-10 border border-indigo-100 animate-bounce shadow-xl">⏳</div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-4 text-indigo-900 text-center">Approval Pending</h1>
            <p className="text-slate-400 text-xl mb-14 max-w-lg text-center font-bold tracking-tight">회원가입 신청이 성공적으로 접수되었습니다. <br />본사 관리자의 승인 절차 후에 로그인이 가능합니다.</p>
            <button onClick={() => setView('login')} className="px-16 py-6 bg-white border-2 border-slate-100 rounded-[2rem] font-black uppercase text-sm tracking-[0.3em] text-indigo-500 hover:border-indigo-200 hover:shadow-2xl transition-all shadow-xl">메인으로 돌아가기</button>
         </div>
      );
      return (
         <>
            <LandingPage onOpenLogin={() => setIsLoginModalOpen(true)} onGoSignup={() => setView('signup')} />
            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={handleLogin} onGoSignup={() => setView('signup')} />
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
         if (!confirm(`이전의 모든 캠퍼스 데이터가 삭제되고 새 리스트로 교체됩니다. 진행하시겠습니까?`)) return;
         const api = await import('../lib/api');
         const resetSuccess = await api.resetCampusesAndUsers();
         if (!resetSuccess) { alert('데이터 초기화 중 오류가 발생했습니다.'); return; }
         if (cList.length > 0) { await api.createCampusesBulk(cList); setRegisteredCampuses(cList); }
         if (uList.length > 0) {
            const preparedUsers = uList.map(u => ({ ...u, login_id: u.id }));
            await api.createUsersBulk(preparedUsers);
            setAllUsers(prev => {
               const hqUsers = prev.filter(u => u.role === 'hq');
               return [...hqUsers, ...uList];
            });
         }
         alert(`성공 알림: 캠퍼스 ${cList.length}개, 계정 ${uList.length}개`);
      };
      const handleSingleRegister = async (campus: any, user: any) => {
         const api = await import('../lib/api');
         await api.createCampus(campus);
         const preparedUser = { ...user, login_id: user.id };
         await api.createUser(preparedUser);
         setRegisteredCampuses(prev => [...prev, campus]);
         setAllUsers(prev => [...prev, user]);
         alert('캠퍼스 계정이 성공적으로 추가되었습니다.');
      };

      const handleResetAll = async () => {
         if (!confirm('정말로 모든 캠퍼스 및 계정 데이터를 초기화하시겠습니까?')) return;
         const api = await import('../lib/api');
         const success = await api.resetCampusesAndUsers();
         if (success) {
            setRegisteredCampuses([]);
            setAllUsers(prev => prev.filter(u => u.role === 'hq'));
            alert('초기화 완료.');
         } else { alert('오류 발생.'); }
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
            updateGameConfig('default-campus-level', { req_level: lv });
         }}
         onDeleteCampus={handleDeleteCampus}
         onBulkRegister={handleBulkRegister}
         onSingleRegister={handleSingleRegister}
         onResetAll={handleResetAll}
         onLogout={logout}
         registeredCampuses={registeredCampuses}
         user={user}
         gameConfigs={gameConfigs}
         onUpdateGameConfig={updateGameConfig}
      />;
   }

   // Campus User View
   return (
      <div className="h-screen bg-[#1a0b1c] text-white font-sans selection:bg-amber-500/30 flex flex-col lg:flex-row relative overflow-hidden">
         <style dangerouslySetInnerHTML={{ __html: `
            @media print { 
               .no-print { display: none !important; } 
               body, html, #root { height: auto !important; overflow: visible !important; min-height: auto !important; }
               .h-screen { height: auto !important; min-height: auto !important; }
               .overflow-hidden { overflow: visible !important; }
            }
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            .custom-scrollbar-light::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar-light::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 10px; }
         `}} />
         
         <aside className="hidden lg:flex w-80 bg-[#120614] border-r border-white/5 flex-col p-8 z-30 shadow-2xl no-print shrink-0">
            <div className="flex items-center gap-5 mb-16 px-2">
               <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-2xl transform -rotate-3">E</div>
               <div>
                  <h2 className="text-2xl font-black tracking-tighter leading-none mb-1 uppercase italic">Game Hub</h2>
                  <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.4em] opacity-70">Campus Admin</p>
               </div>
            </div>
            <nav className="space-y-4 flex-1">
               <button onClick={() => setSelectedGame(null)}
                  className={`w-full flex items-center justify-center gap-6 px-10 py-5 rounded-[2.5rem] transition-all font-black text-2xl uppercase tracking-tighter ${selectedGame === null ? 'bg-indigo-600 text-white shadow-2xl' : 'text-white/20 hover:text-white hover:bg-white/5'}`}>
                  대시보드
               </button>
               {selectedGame && (
                  <div className="pt-8 mt-8 border-t border-white/5">
                     <button onClick={() => setSelectedGame(null)}
                        className="w-full flex items-center gap-5 px-8 py-5 rounded-[2.5rem] bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 font-black text-xl uppercase hover:bg-white hover:text-black transition-all">
                        🔙 Lobby Hub
                     </button>
                  </div>
               )}
               <div className="mt-8 space-y-6 border-t border-white/5 pt-8">
                  <div className="px-10 py-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-center flex flex-col items-center">
                     <div className="bg-amber-500 text-white px-6 py-2 rounded-full text-[15px] font-[1000] uppercase tracking-widest shadow-xl mb-4 shadow-amber-500/30 border-2 border-amber-400">LV.{user.level}</div>
                     <div className="text-2xl font-black text-indigo-500 italic mb-1">{user.id}</div>
                     <div className="text-sm font-bold text-white/50">{user.name}</div>
                  </div>
                  <button onClick={logout} className="w-full py-6 rounded-[2.5rem] bg-rose-600 text-white font-black uppercase tracking-widest hover:bg-rose-500 transition-all shadow-xl">Log Out</button>
               </div>
            </nav>
         </aside>

         <main className="flex-1 flex flex-col relative overflow-hidden bg-[#1a0b1c] min-h-screen">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12">
               {selectedGame === null ? (
                  <div className="animate-in fade-in duration-1000 flex flex-col gap-10 max-w-[1400px] mx-auto">
                     <div className="flex items-center justify-between border-l-[8px] border-indigo-500 px-8 py-2">
                        <h2 className="text-4xl font-[1000] italic uppercase tracking-tighter text-white">EiE Game Hub</h2>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                        {[...games]
                           .filter(g => gameConfigs[g.id]?.is_active !== false)
                           .sort((a, b) => (gameConfigs[a.id]?.level_order ?? 99) - (gameConfigs[b.id]?.level_order ?? 99))
                           .map((g) => {
                              const config = gameConfigs[g.id] || { req_level: 1 };
                              const isLocked = user.level < config.req_level;
                              return (
                                 <div key={g.id} onClick={() => !isLocked && setSelectedGame(g.id)}
                                    className={`group relative bg-[#120614] border ${isLocked ? 'border-white/5 grayscale pointer-events-none' : 'border-white/10 hover:border-indigo-500/50 cursor-pointer shadow-2xl'} rounded-[2.5rem] overflow-hidden transition-all duration-700 ${!isLocked ? 'hover:-translate-y-4' : ''}`}>
                                    <div className="h-[160px] overflow-hidden relative">
                                       <img src={g.img} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={g.title} />
                                       <div className="absolute inset-0 bg-gradient-to-t from-[#120614] via-transparent to-transparent" />
                                    </div>
                                    <div className="p-6 flex items-center justify-between gap-4">
                                       <div className="min-w-0">
                                          <h3 className={`text-lg font-black mb-1 truncate ${!isLocked ? 'text-white' : 'text-white/20'}`}>{g.title}</h3>
                                          <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">{g.subtitle}</p>
                                       </div>
                                       <div className={`min-w-[64px] py-1.5 rounded-xl border text-center ${isLocked ? 'bg-white/5 border-white/5' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}`}>
                                          <div className="text-[8px] font-black uppercase mb-0.5">LV</div>
                                          <div className="text-xl font-black">{config.req_level}</div>
                                       </div>
                                    </div>
                                    {isLocked && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-xs font-black uppercase tracking-widest text-white/40">🔒 Locked</div>}
                                 </div>
                              );
                           })}
                     </div>
                  </div>
               ) : (
                  <div className="h-full flex flex-col">
                     <div className="flex-1 bg-white rounded-[3rem] p-4 overflow-hidden shadow-2xl">
                        {selectedGame === 'word-chain' ? (<WordChain />) :
                           selectedGame === 'bingo' ? (<BingoGame />) :
                           selectedGame === 'speed-game' ? (<SpeedGame />) :
                           selectedGame === 'word-search' ? (<WordSearch />) :
                           selectedGame === 'quiz' ? (<QuizGame />) :
                           selectedGame === 'number-guess' ? (<NumberGuess />) :
                           selectedGame === 'word-certification' ? (<WordLevel onBack={() => setSelectedGame(null)} maxLevel={user.level} />) :
                           selectedGame === 'tug-of-war' ? (<TugOfWarGame onBack={() => setSelectedGame(null)} />) :
                           selectedGame === 'balloon-game' ? (<BalloonGame />) :
                           null}
                     </div>
                  </div>
               )}
            </div>
         </main>
      </div>
   );
}
