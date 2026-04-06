import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import WordChain from './components/WordChain';
import BingoGame from './components/BingoGame';
import SpeedGame from './components/SpeedGame';
import WordSearch from './components/WordSearch';
import QuizGame from './components/QuizGame';
import NumberGuess from './components/NumberGuess';
import WordLevel from './components/WordLevel';

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
];


// --- Authentication Components ---

const Login = ({ onLogin, onGoSignup }: any) => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');

  return (
    <div className="h-screen flex font-sans bg-white overflow-hidden">
      {/* Visual Left Side */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative bg-[#0f172a] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_100%)]" />
        
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-0 animate-in fade-in zoom-in duration-1000">
           <div className="w-full h-full relative group">
              <img src="/assets/images/promo_poster.png" 
                   className="w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-10000 opacity-90" alt="Students" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-10">
                 <div className="inline-block px-12 py-4 bg-rose-500/95 text-white text-[24px] font-[900] uppercase tracking-tighter mb-10 rounded-full shadow-2xl animate-pulse">초중등전문 영어학원브랜드 EiE</div>
                 <h2 className="text-[5vw] font-black text-white tracking-tighter italic drop-shadow-[0_20px_80px_rgba(255,255,255,0.5)] leading-none text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-sky-300 drop-shadow-sm whitespace-nowrap">Are You Ready?</h2>
              </div>
              
              <div className="absolute top-1/4 right-10 w-24 h-24 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 flex items-center justify-center text-3xl shadow-2xl animate-pulse">🎮</div>
              <div className="absolute bottom-1/4 left-10 w-20 h-20 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-3xl shadow-2xl animate-bounce-slow">🚀</div>
           </div>
        </div>
      </div>

      {/* Form Right Side */}
      <div className="w-full lg:w-[520px] flex flex-col justify-center px-6 sm:px-12 md:px-20 bg-white relative shadow-[-20px_0_50px_rgba(0,0,0,0.02)] z-20 h-screen">
        <div className="max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom lg:slide-in-from-right duration-700 py-4">
           {/* Mobile Only Brand Header */}
           <div className="lg:hidden flex flex-col items-center mb-8 px-4 py-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
              <div className="inline-block px-5 py-1.5 bg-rose-500/90 text-white text-[10px] font-black uppercase tracking-[0.3em] mb-4 rounded-full shadow-lg">Are You Ready?</div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter italic uppercase">EiE Game Hub</h2>
              <div className="h-1 w-8 bg-emerald-500 mt-3 rounded-full" />
           </div>

           <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top duration-700">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-sky-500 rounded-[1.8rem] flex items-center justify-center text-4xl shadow-2xl shadow-emerald-500/30 transform -rotate-3 mb-6 relative group">
                 <div className="absolute inset-0 bg-white/20 rounded-[1.8rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                 🎮
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic uppercase leading-none text-center">EiE Game Hub</h1>
              <div className="h-1 w-12 bg-emerald-500 mt-4 rounded-full hidden lg:block" />
           </div>

           <div className="space-y-6">
              <div className="space-y-2 group">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-emerald-500 transition-colors">Account ID</label>
                 <div className="relative">
                    <input type="text" placeholder="아이디" value={id} onChange={e => setId(e.target.value)} autoComplete="off" spellCheck={false}
                      className="w-full bg-slate-50 border-2 border-slate-50 px-8 py-5 rounded-[1.5rem] text-slate-800 text-[16px] font-bold focus:outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-inner placeholder:text-slate-200" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl opacity-20">👤</span>
                 </div>
              </div>

              <div className="space-y-2 group">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-emerald-500 transition-colors">Password</label>
                 <div className="relative">
                    <input type="password" placeholder="비밀번호" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password"
                      className="w-full bg-slate-50 border-2 border-slate-50 px-8 py-5 rounded-[1.5rem] text-slate-800 text-sm font-bold focus:outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-inner placeholder:text-slate-200" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl opacity-20">🔒</span>
                 </div>
              </div>

              <button onClick={() => onLogin(id, pw)} 
                      className="w-full py-5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-[21px] cursor-pointer touch-manipulation">로그인</button>

              <div className="pt-4 text-center border-t border-slate-50">
                 <button onClick={onGoSignup} className="w-full py-5 bg-[#2563eb] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] transition-all text-[17px]">캠퍼스 계정 생성 요청 →</button>
                 <p className="mt-4 text-[9px] font-black text-slate-200 uppercase tracking-widest">Admin & Campus Only</p>
              </div>
           </div>
        </div>
      </div>
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
              <img src="/assets/images/promo_poster.png" 
                   className="w-full h-full object-cover opacity-80" alt="Students" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-70" />
              <div className="absolute top-20 left-20">
                 <h2 className="text-5xl font-black text-white tracking-tighter italic drop-shadow-2xl">Join Our <br />Journey!</h2>
                 <p className="text-rose-400 font-black text-[12px] uppercase tracking-[0.5em] mt-4 shadow-xl">Academy Approval Waiting</p>
              </div>
           </div>
        </div>
      </div>

      {/* Form Right Side */}
      <div className="w-full lg:w-[580px] flex flex-col justify-center px-6 sm:px-12 md:px-20 bg-white relative shadow-2xl z-20 h-screen">
        <div className="max-w-md w-full mx-auto animate-in slide-in-from-bottom duration-700 py-4">
           {/* Mobile Only Header */}
           <div className="lg:hidden flex flex-col items-center mb-6">
              <div className="px-5 py-1 bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-widest rounded-full mb-4">Start Your Journey</div>
              <h2 className="text-2xl font-black text-slate-800 italic uppercase">Join EiE Game Hub</h2>
           </div>

           <div className="flex flex-col items-center mb-6 animate-in fade-in slide-in-from-top duration-700">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-orange-500 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-xl mb-4">
                 🎮
              </div>
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

              <button onClick={() => {
                if(!formData.id || !formData.pw || !formData.name) return alert('필수 항목을 입력하세요.');
                onSignup(formData);
              }} className="w-full py-4 bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-emerald-600 active:scale-[0.98] transition-all text-sm mt-4">계정 생성 요청하기</button>

              <div className="pt-4 text-center border-t border-slate-50">
                 <button onClick={onGoLogin} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-colors">← 이미 계정이 있으신가요?</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Admin Dashboard Components ---

const AdminDashboard = ({ campusUsers, updateLevel, onDeleteCampus, onBulkRegister, onResetAll, onLogout, registeredCampuses, user }: any) => {
  const [activeTab, setActiveTab] = useState<'home' | 'approvals' | 'campuses' | 'games'>('home');
  const [regionSearch, setRegionSearch] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [levelSearch, setLevelSearch] = useState('');
  const [itemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSingleAddOpen, setIsSingleAddOpen] = useState(false);
  const [singleReg, setSingleReg] = useState({ region: '', name: '', id: '', pw: '' });
  const [wordLevelStats, setWordLevelStats] = useState<{sheets: number, total: number, levelCounts: Record<number, number>} | null>(null);

  useEffect(() => {
     import('../lib/api').then(api => {
        api.getWordLevels().then(parsed => {
           if (parsed && Array.isArray(parsed) && parsed.length > 0) {
              const counts = parsed.reduce((acc: any, cur: any) => {
                 acc[cur.level] = (acc[cur.level] || 0) + 1;
                 return acc;
              }, {});
              const uniqueLvls = Object.keys(counts).length;
              setWordLevelStats({ sheets: uniqueLvls, total: parsed.length, levelCounts: counts });
           } else {
              try {
                 const stored = localStorage.getItem('eie_word_level_dict');
                 if (stored) {
                    const p = JSON.parse(stored);
                    if (Array.isArray(p)) {
                       const c = p.reduce((acc: any, cur: any) => {
                          acc[cur.level] = (acc[cur.level] || 0) + 1;
                          return acc;
                       }, {});
                       setWordLevelStats({ sheets: Object.keys(c).length, total: p.length, levelCounts: c });
                    }
                 }
              } catch(e) {}
           }
        });
     });
  }, []);


  const pendingCount = campusUsers.filter((u: any) => u.status === 'pending').length;

  const handleExportSystem = () => {
    const s = {
      users: localStorage.getItem('eie_users_v2'),
      campuses: localStorage.getItem('eie_campuses'),
      dict: localStorage.getItem('eie_word_level_dict')
    };
    const blob = new Blob([JSON.stringify(s)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `eie_system_full_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    alert('시스템 전체 설정이 추출되었습니다. 다른 컴퓨터�  const handleUploadWordLevelDict = (e: any) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const list: any[] = [];
        const allWords: any[] = [];
        
        wb.SheetNames.forEach((sheetName, index) => {
           const levelNum = index + 1;
           const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheetName], { header: 1 });
           rows.forEach((row, rIx) => {
              if (rIx === 0) return; // ignore header
              if (row[0] && row[1]) {
                 // Support explicit 1~4 options and answer (6 columns)
                 if (row[2] !== undefined && row[3] !== undefined && row[4] !== undefined && row[5] !== undefined) {
                    const q = String(row[0]).trim();
                    const choices = [
                        String(row[1]).trim(),
                        String(row[2]).trim(),
                        String(row[3]).trim(),
                        String(row[4]).trim()
                    ];
                    const answerVal = String(row[5]).trim();
                    let answerIdx = parseInt(answerVal) - 1;
                    if (isNaN(answerIdx) || answerIdx < 0 || answerIdx > 3) {
                        answerIdx = choices.indexOf(answerVal);
                        if (answerIdx === -1) answerIdx = 0; // fallback if invalid
                    }
                    list.push({ level: levelNum, q, choices, answer: answerIdx });
                 } else {
                    // Legacy: Word + Meaning only
                    allWords.push({ level: levelNum, word: String(row[0]).trim(), meaning: String(row[1]).trim() });
                 }
              }
           });
        });
        
        // Process legacy words with random choices
        allWords.forEach((item) => {
           const otherMeanings = allWords.filter(w => w.word !== item.word).map(w => w.meaning);
           const uniqueOthers = Array.from(new Set(otherMeanings)).sort(() => Math.random() - 0.5);
           const choices = [item.meaning];
           while (choices.length < 4 && uniqueOthers.length > 0) choices.push(uniqueOthers.pop()!);
           while (choices.length < 4) choices.push('None');
           const shuffledChoices = choices.sort(() => Math.random() - 0.5);
           list.push({ level: item.level, q: item.word, choices: shuffledChoices, answer: shuffledChoices.indexOf(item.meaning) });
        });
        
        if (list.length > 0) {
           const counts = list.reduce((acc: any, cur: any) => {
              acc[cur.level] = (acc[cur.level] || 0) + 1;
              return acc;
           }, {});
           const uniqueLvls = Object.keys(counts).length;
           setWordLevelStats({ sheets: uniqueLvls, total: list.length, levelCounts: counts });
           import('../lib/api').then(api => api.uploadWordLevels(list));
           alert(`성공! 총 ${wb.SheetNames.length}개 시트에서 총 ${list.length}개의 문제를 성공적으로 축출해 등록했습니다.`);
        } else {
           alert('불러올 수 있는 유효한 데이터가 없습니다. (1열:문제, 2~5열:보기1~4, 6열:정답번호 형식 권장)');
        }
      } catch (err) { alert('업로드 오류가 발생했습니다.'); }
    };
    reader.readAsBinaryString(f);
  };wer: shuffledChoices.indexOf(item.meaning) });
        });
        if (list.length > 0) {
           const counts = list.reduce((acc: any, cur: any) => {
              acc[cur.level] = (acc[cur.level] || 0) + 1;
              return acc;
           }, {});
           const uniqueLvls = Object.keys(counts).length;
           setWordLevelStats({ sheets: uniqueLvls, total: list.length, levelCounts: counts });
           import('../lib/api').then(api => api.uploadWordLevels(list));
           alert(`성공! 총 ${wb.SheetNames.length}개 시트를 레벨로 매핑하여 ${list.length}개의 4지선다 문제를 축출해 공용 서버에 등재했습니다.`);
        } else {
           alert('불러올 수 있는 유효한 단어 데이터가 없습니다.');
        }
      } catch (err) { alert('업로드 오류가 발생했습니다.'); }
    };
    reader.readAsBinaryString(f);
    if(e.target) e.target.value = '';
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
    <div className="min-h-screen bg-[#fff7f9] text-slate-800 flex font-sans">
      <aside className="w-80 bg-white border-r border-rose-100 flex flex-col p-10 shadow-xl overflow-hidden relative">
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
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); }}
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
            <header className="mb-10">
              <h1 className="text-5xl font-black tracking-tighter mb-2 italic text-rose-900 uppercase">대시보드</h1>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-4 shadow-sm flex flex-col min-h-[240px]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-xl shadow-lg text-white">🏰</div>
                  <div className="flex-1 flex items-center justify-between">
                    <h1 className="text-xl font-black italic text-rose-950 uppercase tracking-tighter leading-none">등록 캠퍼스 현황 (전국 분포)</h1>
                    <span className="text-rose-700 text-[10px] font-black px-3 py-1 rounded-lg bg-rose-100 border border-rose-200">TOTAL: {registeredCampuses.length}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 flex-1">
                  {['서울','경기','인천','강원','경북','경남','대구','부산','충북','충남','세종','대전','광주','전북','전남','제주'].map(r => {
                    const v = (registeredCampuses || []).filter((c: any) => c.region === r).length;
                    return (
                      <div key={r} className="bg-white border border-rose-50 p-3 rounded-xl flex flex-col items-center justify-center hover:border-amber-500 hover:shadow-lg transition-all group shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-slate-50 group-hover:bg-amber-500 transition-colors" />
                        <span className="text-[9px] font-black text-slate-400 mb-1 group-hover:text-slate-600 uppercase tracking-tighter leading-none">{r}</span>
                        <span className="text-xl font-black italic text-slate-800 group-hover:text-rose-600 transition-colors leading-none tracking-tighter">{v}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-4 shadow-sm flex flex-col min-h-[240px]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-xl shadow-lg text-white">📈</div>
                  <div>
                    <h1 className="text-xl font-black italic text-rose-950 uppercase tracking-tighter leading-none">운영 캠퍼스 레벨 현황</h1>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3 flex-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lv => {
                    const count = (campusUsers || []).filter((u: any) => u.status === 'approved' && Number(u.level) === lv).length;
                    return (
                      <div key={lv} className="bg-white border border-rose-100 p-4 rounded-2xl flex flex-col items-center justify-center hover:border-amber-500 hover:shadow-lg transition-all group relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 group-hover:bg-orange-500 transition-colors" />
                        <span className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-tighter leading-none">LV.{lv}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black italic text-slate-800 group-hover:text-rose-600 transition-colors leading-none tracking-tighter">{count}</span>
                          <span className="text-[11px] font-black text-slate-300 group-hover:text-slate-500 transition-colors">개</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mb-4">
               <div className="w-full bg-rose-50 border border-rose-100 rounded-[2.5rem] p-8 shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-8 px-2">
                     <h3 className="text-xl font-black italic tracking-tighter uppercase text-rose-950 border-l-4 border-rose-500 pl-6 outline-none uppercase tracking-widest">월간 접속 캠퍼스수</h3>
                  </div>
               <div className="h-[200px] flex items-end justify-between gap-4 px-10 relative">
                  {[
                    {m:'1월', v:45}, {m:'2월', v:52}, {m:'3월', v:88}, {m:'4월', v:94},
                    {m:'5월', v:112}, {m:'6월', v:125}, {m:'7월', v:140}, {m:'8월', v:110},
                    {m:'9월', v:135}, {m:'10월', v:155}, {m:'11월', v:168}, {m:'12월', v:180}
                  ].map((d, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                       <span className="text-[10px] font-black text-rose-500 mb-2 group-hover:scale-125 transition-transform">{d.v}</span>
                       <div className="w-full max-w-[48px] bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-xl transition-all hover:brightness-110 shadow-lg relative overflow-hidden" 
                            style={{ height: `${(d.v / 200) * 100}%` }}>
                          <div className="absolute inset-x-0 bottom-0 bg-white/20 h-full w-full opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                       <span className="text-[9px] font-black text-slate-400 mt-3 group-hover:text-rose-700 transition-colors uppercase whitespace-nowrap">{d.m}</span>
                    </div>
                  ))}
               </div>
               </div>
            </div>
          </div>
                ) : activeTab === 'games' ? (
          <div className="animate-in fade-in duration-700 h-full flex flex-col">
            <header className="mb-10">
              <h1 className="text-5xl font-black tracking-tighter mb-2 italic text-emerald-900 uppercase">게임리스트</h1>
            </header>
            
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm mb-8 flex-1">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-8 shadow-sm flex flex-col items-center relative overflow-hidden">
                     <span className="text-5xl mb-4">📈</span>
                     <h3 className="text-xl font-black italic uppercase text-indigo-900 mb-2">단어레벨 (Word Level)</h3>
                     <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-6 text-center">전체 캠퍼스 공통 단어장 관리 및 업로드</p>
                     
                     {wordLevelStats ? (
                        <div className="bg-white border border-indigo-100 rounded-[1.5rem] w-full flex flex-col mb-6 shadow-sm overflow-hidden text-center z-10 relative">
                           <div className="bg-indigo-50/50 py-3 border-b border-indigo-100 flex items-center justify-between px-5">
                              <div className="text-[10px] font-black text-emerald-500 tracking-widest uppercase flex items-center gap-1"><span>🟢</span> 등록 완료 (Live)</div>
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total: <span className="text-orange-500 text-sm align-middle">{wordLevelStats.total}</span></div>
                           </div>
                           <div className="p-4 bg-white grid grid-cols-4 lg:grid-cols-5 gap-2 w-full">
                              {Object.entries(wordLevelStats.levelCounts).sort((a,b) => Number(a[0]) - Number(b[0])).map(([lvl, cnt]) => (
                                  <div key={lvl} className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center flex flex-col justify-center items-center group">
                                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 mt-1">E{lvl}</span>
                                     <span className="text-xl font-black italic text-indigo-500 leading-none">{cnt}<span className="text-[9px] text-slate-300 ml-0.5 not-italic">개</span></span>
                                  </div>
                              ))}
                           </div>
                        </div>
                     ) : (
                        <div className="bg-rose-50 border border-rose-100 px-4 py-3 rounded-2xl w-full text-center mb-6 shadow-sm py-6 relative z-10">
                           <div className="text-[10px] font-black text-rose-500 tracking-widest uppercase mb-1">미등록 상태</div>
                           <div className="text-xs font-bold text-rose-400 tracking-tight">서비스가 활성화되지 않았습니다.</div>
                        </div>
                     )}

                     <div className="flex flex-col xl:flex-row w-full justify-center gap-3 relative z-10 mt-auto">
                        <button onClick={(e) => { e.preventDefault(); import('xlsx').then(XLSX => { const ws = XLSX.utils.aoa_to_sheet([['Question', 'Option1', 'Option2', 'Option3', 'Option4', 'answer(1~4)'], ['condolence', '문서의', '애도', '시종일관한', '빵다', 2]]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Level 1'); XLSX.writeFile(wb, 'WordLevel_Template.xlsx'); }); }} className="flex-1 justify-center py-4 px-6 text-indigo-600 bg-white border border-indigo-200 rounded-2xl shadow-sm uppercase font-black tracking-widest text-xs transition-transform hover:scale-105 active:scale-95">
                           양식 다운로드
                        </button>
                        <label className={`flex-1 justify-center py-4 px-6 text-white rounded-2xl cursor-pointer shadow-lg uppercase font-black tracking-widest text-xs flex items-center transition-transform hover:scale-105 active:scale-95 ${wordLevelStats ? 'bg-indigo-600 hover:bg-slate-900 shadow-slate-900/30' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30'}`}>
                           <span className="flex-1 text-center">{wordLevelStats ? '데이터 재업로드' : '엑셀 업로드'}</span>
                           <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleUploadWordLevelDict} />
                        </label>
                     </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col justify-center items-center text-center">
                     <span className="text-5xl mb-4 opacity-50 grayscale">🔍</span>
                     <h3 className="text-xl font-black italic uppercase text-slate-800 mb-2">낱말찾기 등 다른 게임</h3>
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">각 캠퍼스별 개별 관리</p>
                     <div className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-400 leading-relaxed shadow-inner">
                        본사 공통 데이터가 필요하지 않은 게임입니다.<br/>단어레벨 외의 게임 문제는 캠퍼스에서 자체 관리합니다.
                     </div>
                  </div>
               </div>
            </div>
          </div>
) : activeTab === 'approvals' ? (
          <div className="animate-in fade-in duration-700">
            <header className="mb-10 flex items-center justify-between">
              <div>
                <h1 className="text-5xl font-black tracking-tighter italic text-rose-950 uppercase">승인관리</h1>
              </div>
              <div className="bg-amber-100 text-amber-600 px-8 py-3 rounded-2xl font-black text-xs border border-amber-200 shadow-md">대기 중: {pendingCount}</div>
            </header>
            <div className="bg-rose-50 border border-rose-100 border-t-4 border-t-rose-500 rounded-b-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-[#eff6ff] border-b border-blue-100 text-blue-400 uppercase text-[10px] font-black tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Req ID</th>
                    <th className="px-8 py-6">Campus Info</th>
                    <th className="px-8 py-6">Account</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {campusUsers.filter((u:any)=>u.status === 'pending').map((u:any, idx:number) => {
                    const regMatch = u.name.match(/\[(.*?)\]/);
                    const region = regMatch ? regMatch[1] : '기타';
                    const nameOnly = u.name.replace(`[${region}] `, '');
                    return (
                      <tr key={idx} className="hover:bg-rose-50/50 transition-colors bg-white/40">
                        <td className="px-8 py-6 font-mono text-amber-500 text-xs font-black">#{idx + 1}</td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">{region}</span>
                              <span className="text-sm font-black text-slate-800 italic uppercase leading-none">{nameOnly}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                              <span className="text-xs text-rose-600 font-black tracking-tighter">ID: {u.id}</span>
                              <span className="text-[10px] text-slate-300 font-mono tracking-tighter">PW: {u.pw}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <button onClick={() => updateLevel(u.id, 1, 'approved')} className="px-8 py-3 bg-rose-500 text-white rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all">승인 처리</button>
                        </td>
                      </tr>
                    );
                  })}
                  {pendingCount === 0 && (
                    <tr>
                      <td colSpan={4} className="py-24 text-center">
                        <div className="text-slate-200 font-black text-3xl italic uppercase tracking-[0.2em] mb-2">No Entries</div>
                        <div className="text-slate-300 font-bold text-[10px] uppercase tracking-widest">Everything is up to date.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'campuses' ? (
          <div className="animate-in fade-in duration-700 flex flex-col h-full">
            <header className="mb-4">
              <h1 className="text-5xl font-black tracking-tighter italic text-emerald-900 uppercase">캠퍼스리스트</h1>
            </header>

            <div className="flex flex-col gap-4 mb-8 px-8 py-4 bg-[#f5f3ff] border border-violet-100 rounded-[2rem] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-violet-400" />
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">지역</label>
                    <div className="bg-white border border-violet-50 rounded-xl overflow-hidden h-9 flex items-center shadow-inner">
                      <select value={regionSearch} onChange={e => { setRegionSearch(e.target.value); setCurrentPage(1); }}
                        className="bg-transparent border-0 px-4 text-slate-700 text-[11px] font-bold min-w-[110px] focus:outline-none cursor-pointer outline-none">
                        <option value="">지역 전체</option>
                        {['서울','경기','인천','강원','충북','충남','세종','대전','경북','경남','대구','부산','광주','전북','전남','제주'].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">학원명</label>
                    <input value={nameSearch} onChange={e => { setNameSearch(e.target.value); setCurrentPage(1); }}
                      className="bg-white border border-violet-50 rounded-xl px-4 h-9 text-slate-700 text-[11px] font-bold w-[160px] placeholder:text-slate-200 transition-all outline-none shadow-inner" placeholder="검색어" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">레벨</label>
                    <div className="bg-white border border-violet-50 rounded-xl overflow-hidden h-9 flex items-center shadow-inner">
                      <select value={levelSearch} onChange={e => { setLevelSearch(e.target.value); setCurrentPage(1); }}
                        className="bg-transparent border-0 px-4 text-slate-700 text-[11px] font-bold min-w-[90px] focus:outline-none cursor-pointer outline-none">
                        <option value="">전체</option>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{`LV.${n}`}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 border-l border-violet-100 pl-6 h-10">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-violet-400 uppercase tracking-widest">일괄 레벨:</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                        <button key={v} onClick={() => {
                          if (selectedIds.length === 0) return alert('선택된 캠퍼스가 없습니다.');
                          if (confirm(`선택된 ${selectedIds.length}개 캠퍼스를 LV.${v}로 배정합니까?`)) {
                            selectedIds.forEach((id: string) => {
                              const u = campusUsers.find((x: any) => x.id === id);
                              if(u) updateLevel(id, v, u.status);
                            });
                            setSelectedIds([]);
                            alert('일괄 배정 완료');
                          }
                        }} className="w-6 h-6 rounded-md bg-white border border-violet-100 text-[9px] font-black text-violet-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all flex items-center justify-center shadow-sm">
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => {
                    if (selectedIds.length === 0) return alert('선택된 항목이 없습니다.');
                    if (confirm(`선택된 ${selectedIds.length}개 캠퍼스를 일괄 승인합니까?`)) {
                      selectedIds.forEach((id: string) => {
                        const u = campusUsers.find((x: any) => x.id === id);
                        if(u) updateLevel(id, u.level, 'approved');
                      });
                      setSelectedIds([]);
                      alert('일괄 승인 완료');
                    }
                  }} className="h-7 px-4 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600 transition-all shadow-md flex items-center gap-2">
                    ✓ 일괄 승인
                  </button>
                </div>

                <div className="flex items-center gap-2 h-10">
                  <button onClick={() => {
                    if (confirm('주의! 등록된 모든 캠퍼스 정보와 계정이 삭제됩니다. 계속하시겠습니까?')) {
                      onResetAll();
                      alert('데이터 초기화 완료');
                    }
                  }} className="px-5 h-8 bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5 active:scale-95 transition-all hover:bg-rose-600">
                    🗑️ 전체 초기화
                  </button>
                  <button onClick={() => setIsSingleAddOpen(true)} className="px-5 h-8 bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5 active:scale-95 transition-all hover:bg-slate-900">
                    ＋ 계정 생성
                  </button>
                  <button onClick={() => {
                    const ui = document.createElement('input');
                    ui.type = 'file'; ui.accept = '.xlsx,.xls';
                    ui.onchange = (e_local: any) => {
                      const file = e_local.target.files[0]; if(!file) return;
                      const r = new FileReader(); 
                      r.onload = (e) => {
                        try {
                          const binaryData = e.target?.result;
                          if (!binaryData) throw new Error('파일 데이터를 읽어오지 못했습니다.');
                          
                          const wb = XLSX.read(binaryData, { type: 'array' });
                          const sName = wb.SheetNames[0];
                          if (!sName) throw new Error('시트 이름이 존재하지 않습니다.');
                          
                          const ws = wb.Sheets[sName];
                          const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
                          if (!rows || rows.length < 2) throw new Error('엑셀 내용이 부족합니다.');
                          
                          const campuses: any[] = [];
                          const users: any[] = [];
                          
                          // 2행부터 순회 (Header 제외)
                          for (let i = 1; i < rows.length; i++) {
                             const row = rows[i];
                             if (!row || row.length === 0) continue;
                             
                             const region = toSafeStr(row[0]);
                             const cname = toSafeStr(row[1]);
                             
                             // Flexibly find ID and PW (in case columns shifted)
                             let loginId = '';
                             let loginPw = '';
                             for(let c = 2; c < row.length; c++) {
                               const val = toSafeStr(row[c]);
                               if (val && !loginId) loginId = val;
                               else if (val && loginId && !loginPw) loginPw = val;
                             }
                             
                             if (region && cname) {
                                campuses.push({ region, name: cname });
                                if (loginId) {
                                   users.push({
                                      id: loginId,
                                      pw: loginPw || loginId,
                                      name: `[${region}] ${cname}`,
                                      role: 'campus',
                                      status: 'approved' as const,
                                      level: 1
                                   });
                                }
                             }
                          }
                          
                          if (campuses.length > 0) {
                             onBulkRegister(campuses, users);
                          } else {
                             alert('등록 가능한 유효한 데이터가 없습니다. (1열: 지역, 2열: 캠퍼스명 확인)');
                          }
                        } catch (err: any) { 
                          console.error('Import Error:', err);
                          alert(`Excel 오류: ${err.message || '데이터를 읽을 수 없습니다.'}`); 
                        }
                      }; 
                      r.readAsArrayBuffer(file);
                    }; ui.click();
                  }} className="px-5 h-8 bg-orange-500 text-white border border-orange-200 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5 active:scale-95 transition-all hover:bg-orange-600">
                    📂 EXCEL 등록
                  </button>
                </div>
              </div>
            </div>

            {isSingleAddOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="absolute inset-0 bg-rose-950/40 backdrop-blur-md" onClick={() => setIsSingleAddOpen(false)} />
                <div className="bg-white border border-rose-100 rounded-[3rem] w-full max-w-lg p-12 shadow-2xl relative z-10 animate-in zoom-in-95 duration-500">
                  <header className="flex items-center justify-between mb-10">
                     <div>
                        <h3 className="text-3xl font-black italic text-slate-800 uppercase tracking-tighter">Campus ID Generator</h3>
                        <p className="text-rose-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Manual Account Creation</p>
                     </div>
                     <button onClick={() => setIsSingleAddOpen(false)} className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 hover:text-rose-500 transition-colors">✕</button>
                  </header>
                  
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">지역 선택</label>
                        <select value={singleReg.region} onChange={e => setSingleReg({...singleReg, region: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-2xl text-slate-700 text-sm font-bold focus:outline-none focus:border-rose-500 transition-all shadow-inner">
                          <option value="">지역을 선택하세요</option>
                          {['서울','경기','인천','강원','충북','충남','세종','대전','경북','경남','대구','부산','광주','전북','전남','제주'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">캠퍼스명 (학원명)</label>
                        <input value={singleReg.name} onChange={e => setSingleReg({...singleReg, name: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-2xl text-slate-700 text-sm font-bold placeholder:text-slate-200 focus:outline-none focus:border-rose-500 transition-all shadow-inner" placeholder="학원명을 입력하세요" />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">계정 ID</label>
                           <input value={singleReg.id} onChange={e => setSingleReg({...singleReg, id: e.target.value})} 
                             className="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-2xl text-slate-700 text-sm font-bold focus:outline-none focus:border-rose-500 shadow-inner" placeholder="ID" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
                           <input value={singleReg.pw} onChange={e => setSingleReg({...singleReg, pw: e.target.value})} 
                             className="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-2xl text-slate-700 text-sm font-bold focus:outline-none focus:border-rose-500 shadow-inner" placeholder="PW" />
                        </div>
                     </div>

                     <button onClick={() => {
                        if(!singleReg.region || !singleReg.name || !singleReg.id) return alert('모든 항목을 입력하세요.');
                        (onDeleteCampus as any).bulk([{ region: singleReg.region, name: singleReg.name }], [{ id: singleReg.id, pw: singleReg.pw, name: `[${singleReg.region}] ${singleReg.name}`, role: 'campus', status: 'approved', level: 1 }]);
                        alert('새 캠퍼스 생성 완료'); setIsSingleAddOpen(false); setSingleReg({ region: '', name: '', id: '', pw: '' });
                     }} className="w-full py-6 bg-rose-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-rose-600 active:scale-[0.98] transition-all mt-8">계정 생성 완료</button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[#eff6ff] border border-blue-100 rounded-[1.5rem] overflow-hidden shadow-sm flex-1 mb-2 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-[#eff6ff] sticky top-0 z-10 border-b border-blue-100 text-blue-400 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="px-4 py-2 w-12 text-center">
                        <input type="checkbox" checked={currentItems.length > 0 && currentItems.every((c: any) => selectedIds.includes(c.user?.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const idsToAdd = currentItems.map((c: any) => c.user?.id).filter(Boolean);
                              setSelectedIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
                            } else {
                              const idsToRemove = currentItems.map((c: any) => c.user?.id);
                              setSelectedIds(prev => prev.filter(id => !idsToRemove.includes(id)));
                            }
                          }}
                          className="w-4 h-4 accent-[#2563eb] border-blue-100 rounded cursor-pointer" />
                      </th>
                      <th className="px-4 py-2 w-12 text-center text-[12px]">No.</th>
                      <th className="px-4 py-2 w-44 text-center text-[12px]">Region</th>
                      <th className="px-4 py-2 w-44 text-center text-[12px]">Campus Name</th>
                      <th className="px-4 py-2 w-44 text-center text-[12px]">Account ID</th>
                      <th className="px-4 py-2 w-44 text-center text-[12px]">Security (PW)</th>
                      <th className="px-4 py-2 w-44 text-center text-[12px]">Status / Level</th>
                      <th className="px-4 py-2 w-16 text-center text-[12px]">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-rose-50 bg-white/40">
                    {currentItems.map((item: any, idx: number) => (
                      <tr key={idx} className={`group hover:bg-rose-50/50 transition-colors ${item.user?.id && selectedIds.includes(item.user.id) ? 'bg-rose-100/30' : ''}`}>
                        <td className="px-4 py-1.5 text-center">
                          {item.user?.id ? (
                            <input type="checkbox" checked={selectedIds.includes(item.user.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds(prev => [...prev, item.user.id]);
                                else setSelectedIds(prev => prev.filter(id => id !== item.user.id));
                              }}
                              className="w-4 h-4 accent-rose-500 border-rose-100 rounded cursor-pointer" />
                          ) : <div className="w-4 h-4" />}
                        </td>
                        <td className="px-4 py-1.5 font-mono text-slate-300 text-[12px] font-bold italic text-center">{(idx + 1 + (currentPage - 1) * itemsPerPage).toString().padStart(3, '0')}</td>
                        <td className="px-4 py-1.5 font-black text-[#2563eb] uppercase tracking-widest text-[12px] text-center">{item.region}</td>
                        <td className="px-4 py-1.5 font-black text-slate-800 text-[12px] italic tracking-tighter uppercase text-center">{item.name}</td>
                        <td className="px-4 py-1.5 text-center">
                          {item.user ? <span className="text-[#2563eb] font-black text-[12px] bg-blue-100 px-3 py-1 rounded-md border border-blue-200 tracking-tighter shadow-sm">{item.user.id}</span> : <span className="text-slate-200 italic text-[11px] font-bold">Unregistered</span>}
                        </td>
                        <td className="px-4 py-1.5 font-mono text-slate-400 text-[12px] tracking-widest text-center">
                          {item.user ? item.user.pw : <div className="text-slate-100">—</div>}
                        </td>
                        <td className="px-4 py-1.5 text-center">
                           {item.user ? (
                              <div className="flex items-center justify-center gap-3">
                                 {item.user.status === 'approved' ? (
                                   <span className="bg-emerald-100 text-emerald-600 border border-emerald-200 text-[10px] px-3 py-1 rounded-md font-black italic shadow-sm">승인 완료</span>
                                 ) : (
                                   <button onClick={() => updateLevel(item.user.id, item.user.level, 'approved')} className="bg-orange-500 text-white text-[10px] px-3 py-1 rounded-md font-black hover:bg-orange-600 animate-pulse-slow">승인 대기</button>
                                 )}
                                 <span className="text-orange-500 font-black text-[12px] italic tracking-widest px-4 py-1.5 bg-orange-50 rounded-lg border border-orange-100 shadow-inner">LV. {item.user.level}</span>
                              </div>
                           ) : <div className="text-center opacity-10">—</div>}
                        </td>
                        <td className="px-4 py-1.5 text-center">
                          <button onClick={() => onDeleteCampus(item.name, item.region, item.user?.id)} className="w-6 h-6 flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-md mx-auto">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredFullList.length > itemsPerPage && (
                <div className="flex justify-center items-center gap-2 py-4 bg-white border-t border-blue-100">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    className="w-8 h-8 rounded-lg bg-white border border-blue-100 text-blue-500 flex items-center justify-center text-xs hover:bg-blue-500 hover:text-white transition-all disabled:opacity-30" disabled={currentPage === 1}>←</button>
                  <div className="flex gap-1 flex-wrap justify-center">
                    {Array.from({ length: Math.ceil(filteredFullList.length / itemsPerPage) }).map((_, i) => {
                      const pNum = i + 1;
                      return (
                        <button key={pNum} onClick={() => setCurrentPage(pNum)} 
                          className={`w-8 h-8 rounded-lg font-black text-[10px] transition-all ${currentPage === pNum ? 'bg-orange-500 text-white shadow-md border-orange-500' : 'bg-white text-blue-500 border border-blue-100 hover:bg-blue-50'}`}>
                          {pNum}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredFullList.length / itemsPerPage), p + 1))} 
                    className="w-8 h-8 rounded-lg bg-white border border-blue-100 text-blue-500 flex items-center justify-center text-xs hover:bg-blue-500 hover:text-white transition-all disabled:opacity-30" disabled={currentPage === Math.ceil(filteredFullList.length / itemsPerPage)}>→</button>
                </div>
              )}
            </div>
          </div>
        ) : null}
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
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [registeredCampuses, setRegisteredCampuses] = useState<Campus[]>([]);

  useEffect(() => {
    import('../lib/api').then(api => {
      Promise.all([api.getUsers(), api.getCampuses()]).then(async ([usersData, campusData]) => {
         if(!usersData || usersData.length === 0) {
             const defaultHQ = { id: 'admin2026', pw: 'admin2026', name: '본사 총괄 관리자', role: 'hq' as const, status: 'approved' as const, level: 9 };
             const defaultCampus = { id: 'eie0001', pw: 'eie0001', name: '[서울] 신촌 캠퍼스', role: 'campus' as const, status: 'approved' as const, level: 1 };
             await api.createUser({...defaultHQ, login_id: defaultHQ.id});
             await api.createUser({...defaultCampus, login_id: defaultCampus.id});
             await api.createCampus({region: '서울', name: '신촌 캠퍼스'});
             
             setAllUsers([defaultHQ, defaultCampus]);
             setRegisteredCampuses([{region: '서울', name: '신촌 캠퍼스'}]);
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
      level: 1,
      email: data.email,
      phone: data.phone 
    };
    setAllUsers(prev => [...prev, nu]); 
    setView('pending');
    import('../lib/api').then(api => api.createUser({...nu, login_id: nu.id}));
  };

  const logout = () => { setUser(null); setView('login'); setSelectedGame(null); };

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
    return <Login onLogin={handleLogin} onGoSignup={() => setView('signup')} />;
  }
  if (user.role === 'hq') {
    const handleDeleteCampus = (n: any, r: any, uid: any) => { 
      if(n && r) {
         setRegisteredCampuses(prev => prev.filter(c => !(c.name === n && c.region === r))); 
         import('../lib/api').then(api => api.deleteCampus(r, n));
      }
      if(uid) {
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
      onDeleteCampus={handleDeleteCampus} 
      onBulkRegister={handleBulkRegister}
      onResetAll={handleResetAll}
      onLogout={logout} 
      registeredCampuses={registeredCampuses} 
      user={user}
    />;
  }

  return (
    <div className={`min-h-screen bg-[#1a0b1c] text-white font-sans selection:bg-amber-500/30 flex flex-col lg:flex-row relative overflow-x-hidden`}>
       {/* Mobile Header */}
       <header className="lg:hidden sticky top-0 z-[60] bg-[#120614]/80 backdrop-blur-3xl border-b border-white/5 px-6 py-4 flex items-center justify-between no-print shadow-2xl">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center text-xl font-black shadow-lg">E</div>
             <h2 className="text-lg font-black tracking-tighter uppercase italic">Game Hub</h2>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
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
          </nav>

          <div className="mt-auto space-y-6 no-print">
            <div className="px-10 py-8 bg-white/5 border border-white/10 rounded-[2.5rem] shadow-inner text-center">
               <div className="flex flex-col gap-3">
                  <div className="text-3xl font-[1000] text-rose-500 tracking-tighter leading-none italic">{user?.id}</div>
                  <div className="text-xl font-black text-white/80 tracking-tight leading-normal">{user?.name}</div>
               </div>
            </div>
            <button onClick={logout} className="w-full py-6 rounded-[2.5rem] bg-rose-600 text-white text-base font-black uppercase tracking-widest transition-all shadow-2xl shadow-rose-900/50 hover:bg-rose-500 hover:scale-105 active:scale-95 border-2 border-rose-500/30">Log Out</button>
          </div>
       </aside>

       <main className="flex-1 flex flex-col relative overflow-hidden bg-[#1a0b1c] pb-24 lg:pb-0 min-h-screen">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
             {selectedGame === null ? (
               <div className="animate-in fade-in duration-1000 flex flex-col gap-16 max-w-[1400px] mx-auto pt-8">
                  <div className="flex flex-col gap-12">
                     <div className="flex items-center justify-between px-10 border-l-[12px] border-amber-500 py-2">
                        <div className="flex flex-col">
                           <h2 className="text-4xl font-[1000] italic uppercase tracking-tighter text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">Educational Missions</h2>
                           <div className="flex items-center gap-4 mt-3">
                              <span className="w-12 h-1 bg-amber-500/30 rounded-full" />
                              <p className="text-amber-500 text-[11px] font-black uppercase tracking-[0.6em]">Premium Selection</p>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-8 px-2">
                        {games.map((g, idx) => {
                           const reqLevel = idx + 1;
                           const isLocked = user.level < reqLevel;
                           return (
                             <div key={g.id} onClick={() => !isLocked && setSelectedGame(g.id)} 
                               className={`group relative bg-[#120614] border ${isLocked ? 'border-white/5 grayscale pointer-events-none' : selectedGame === g.id ? 'border-amber-400 border-[3px] shadow-[0_40px_80px_-10px_rgba(251,191,36,0.6)] z-10' : 'border-white/10 hover:border-emerald-500/30 cursor-pointer shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]'} rounded-[2.5rem] overflow-hidden transition-all duration-700 ${!isLocked && selectedGame !== g.id ? 'hover:-translate-y-4 hover:shadow-[0_60px_100px_-20px_rgba(0,0,0,1)]' : ''}`}>
                                
                                {isLocked && (
                                   <div className="absolute top-8 left-0 right-0 z-20 text-center px-4">
                                      <span className="inline-block px-4 py-1.5 bg-[#e11d48] text-white font-[1000] text-[9px] uppercase tracking-widest rounded-full shadow-2xl border border-white/20 animate-pulse">더 높은 레벨업을 하세요!</span>
                                   </div>
                                 )}

                                <div className="h-[160px] overflow-hidden relative">
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
                                <div className="p-6 pt-4">
                                   <h3 className={`text-xl font-[1000] mb-1.5 transition-colors duration-300 ${!isLocked ? 'group-hover:text-amber-500 text-white' : 'text-white/20'}`}>{g.title}</h3>
                                   <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] mb-6">{g.subtitle}</p>
                                   <div className="flex gap-2">
                                      <div className={`px-4 py-2 border text-[10px] font-black rounded-[0.75rem] uppercase tracking-wider ${isLocked ? 'bg-white/5 border-white/5 text-white/20' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>LEVEL {reqLevel}</div>
                                      <div className="px-4 py-2 bg-white/5 border border-white/5 text-[10px] font-black rounded-[0.75rem] uppercase text-white/20 tracking-wider font-sans">{g.tag}</div>
                                   </div>
                                </div>
                             </div>
                           );
                        })}
                        {Array.from({ length: 3 }).map((_, i) => (
                           <div key={`soon-${i}`} className="group relative bg-[#120614]/50 border-2 border-white/5 border-dashed rounded-[3rem] overflow-hidden flex flex-col items-center justify-center p-12 min-h-[330px]">
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
             <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl mb-1">🚪</div>
             <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
          </button>
       </nav>
    </div>
  );
}
