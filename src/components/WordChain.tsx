import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

export default function WordChain() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'done'>('setup');
  const [startWord, setStartWord] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [players, setPlayers] = useState<string[]>([]);
  const [newPlayer, setNewPlayer] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [dictionary, setDictionary] = useState<Record<string, string>>({}); // word -> meaning
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const result = evt.target?.result;
        const wb = XLSX.read(result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const dict: Record<string, string> = {};
        data.slice(1).forEach(row => {
          if (row[0]) {
             const w = String(row[0]).trim().toUpperCase();
             const m = String(row[1] || 'No meaning provided').trim();
             dict[w] = m;
          }
        });
        setDictionary(dict);
        alert(`${Object.keys(dict).length}개의 단어가 로드되었습니다.`);
      } catch { alert('파일 오류'); }
    };
    reader.readAsBinaryString(file);
    if(e.target) e.target.value = '';
  };

  useEffect(() => {
    let timer: any;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('done');
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const handleAddPlayer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newPlayer.trim() && !players.includes(newPlayer.trim())) {
      setPlayers([...players, newPlayer.trim()]);
      setNewPlayer('');
    }
  };

  const handleStart = () => {
    if (!startWord || players.length < 2) return;
    const sw = startWord.toUpperCase();
    if (Object.keys(dictionary).length > 0 && !dictionary[sw]) {
       alert('시작 단어가 사전에 정의되지 않았습니다!');
       return;
    }
    setWords([sw]);
    setCurrentPlayer(0);
    setTimeLeft(timeLimit);
    setGameState('playing');
  };

  const lastChar = (word: string) => word.slice(-1).toUpperCase();

  const handleInput = (e: React.FormEvent) => {
    e.preventDefault();
    const val = input.trim().toUpperCase();
    if (!val) return;
    
    // Check Dictionary
    if (Object.keys(dictionary).length > 0 && !dictionary[val]) {
       alert(`"${val}"은(는) 사전에 없는 단어입니다!`);
       return;
    }

    const prevWord = words[words.length - 1];
    if (val[0] !== lastChar(prevWord)) { alert(`"${lastChar(prevWord)}"로 시작해야 합니다!`); return; }
    if (words.includes(val)) { alert('이미 나온 단어입니다!'); return; }
    
    setWords([...words, val]);
    setInput('');
    setCurrentPlayer((currentPlayer + 1) % players.length);
  };

  const isReady = startWord && players.length >= 2;

  if (gameState === 'setup') {
    return (
      <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1">
        <div className="flex items-center justify-between mb-2 bg-white border border-slate-200 rounded-2xl px-6 py-2 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-2xl shadow-lg text-white">💬</div>
              <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 border-l-4 border-blue-500 pl-3 leading-none">끝말잇기 설정</h1>
           </div>
           <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">연결 준비</span>
           </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-stretch flex-1 overflow-hidden">
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-3 overflow-hidden">
            <div className="grid grid-cols-3 gap-3">
               <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">시작 단어</label>
                  <input type="text" value={startWord} onChange={(e) => setStartWord(e.target.value.toUpperCase())}
                    placeholder="APPLE"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 font-black uppercase text-2xl shadow-inner transition-all" />
               </div>
               <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm col-span-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">제한 시간 (S)</label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar-light">
                    {[30, 60, 90, 120, 150, 180].map(time => (
                      <button key={time} onClick={() => setTimeLimit(time)}
                        className={`min-w-[80px] py-3 rounded-xl text-lg font-[1000] border-2 transition-all ${timeLimit === time ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                        {time}s
                      </button>
                    ))}
                  </div>
               </div>

            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col flex-1 overflow-hidden">
               <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl font-[1000] italic uppercase tracking-widest text-slate-900 border-l-4 border-blue-500 pl-4">Team Match (최소 2팀 이상)</h2>
                  <button onClick={() => setPlayers([])} className="px-4 py-2 bg-rose-50 text-rose-500 border border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">✕ 목록 초기화</button>
               </div>
               
               <div className="flex gap-2 mb-4">
                  <input type="text" value={newPlayer} onChange={e => setNewPlayer(e.target.value)}
                    placeholder="참가 팀 이름 입력..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPlayer())}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-2.5 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 font-black text-lg shadow-inner" />
                  <button onClick={() => handleAddPlayer()}
                    className="px-6 rounded-xl bg-blue-500 text-white font-black text-lg shadow-lg active:scale-95 transition-all outline-none">+</button>
               </div>
               
               <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-wrap content-start gap-2 custom-scrollbar-light shadow-inner overflow-hidden">
                  {players.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                       <p className="text-lg font-black uppercase tracking-widest italic">No teams registered</p>
                    </div>
                  ) : (
                    players.map((p, idx) => (
                      <div key={idx} className="h-10 rounded-xl border-2 bg-white border-slate-200 text-slate-700 px-4 flex items-center gap-3 font-black text-base shadow-sm group hover:border-blue-500 transition-all">
                         <span className="text-blue-500/40 italic">#T{idx + 1}</span> {p}
                         <button onClick={() => setPlayers(players.filter((_, i) => i !== idx))} className="text-slate-200 hover:text-rose-500 ml-1 text-xl">✕</button>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
             <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-full items-center text-center overflow-hidden">
                <div className="w-20 h-20 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mb-4 shrink-0 relative">
                   <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center text-3xl shadow-xl text-white">💬</div>
                </div>

                <div className="mb-4">
                   <h2 className={`text-3xl font-[1000] tracking-tighter mb-1 italic transition-colors ${isReady ? 'text-blue-500' : 'text-slate-200'}`}>
                      {isReady ? '준비완료' : '준비중'}
                   </h2>
                </div>

                <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-3 mb-3 text-left shadow-inner font-black">
                   <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-400 text-[10px] uppercase tracking-widest">시작 단어</span>
                      <span className="text-blue-600 text-lg italic uppercase">{startWord || '---'}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                       <span className="text-slate-400 text-[10px] uppercase tracking-widest">제한 시간</span>
                       <span className="text-slate-900 text-lg italic">{timeLimit}S</span>
                    </div>
                   <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[10px] uppercase tracking-widest">참가 팀</span>
                      <span className={`text-lg ${players.length >= 2 ? 'text-blue-500' : 'text-slate-300'}`}>{players.length} Teams</span>
                   </div>
                </div>

                <div className="w-full bg-blue-50 rounded-2xl p-5 border border-blue-100 space-y-2 mb-auto text-left shadow-sm">
                   <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] italic mb-1">GAME GUIDE</h3>
                   <ul className="space-y-1.5 text-xs font-bold text-slate-500 leading-tight">
                      <li className="flex gap-2 items-start"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" /> 마지막 철자로 시작하는 단어 입력</li>
                      <li className="flex gap-2 items-start"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" /> 사전 업로드 시 유효 어휘만 인정</li>
                   </ul>
                </div>

                <div className="w-full mb-2">
                   <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-slate-900 text-white rounded-3xl text-xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">
                      <span className="text-xl">📂</span> 엑셀 파일 업로드
                   </button>
                   <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                </div>

                <button onClick={handleStart} disabled={!isReady}
                  className={`w-full py-4 rounded-3xl font-[1000] text-2xl transition-all shadow-2xl ${isReady ? 'bg-blue-500 text-white hover:scale-105 active:scale-95 shadow-blue-500/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                  {isReady ? '게임 시작' : '팀을 추가해 주세요'}
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'done') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0f1e]/95 flex items-center justify-center p-4 backdrop-blur-3xl animate-in fade-in duration-500">
        <div className="bg-white border-[12px] border-blue-500/20 rounded-[5rem] p-16 max-w-lg w-full text-center shadow-2xl animate-in zoom-in-95">
           <div className="w-32 h-32 bg-blue-500 rounded-[2.5rem] flex items-center justify-center text-7xl mb-10 mx-auto shadow-2xl text-white italic">🎮</div>
           <h2 className="text-6xl font-[1000] text-slate-900 mb-4 leading-none uppercase italic tracking-tighter">시간 종료!</h2>
           <p className="text-2xl font-black text-blue-500 mb-12 uppercase tracking-[0.4em]">총 {words.length}개 단어 연결</p>
           <button onClick={() => setGameState('setup')} className="w-full py-6 rounded-3xl bg-slate-900 text-white font-[1000] text-2xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">대시보드</button>
        </div>
      </div>
    );
  }

  const currentWord = words[words.length - 1];
  const meaning = dictionary[currentWord] || '';
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-6xl mx-auto w-full h-full flex flex-col py-2 font-sans animate-in fade-in overflow-hidden">
       {/* Gameplay Header */}
       <div className="flex items-center justify-between mb-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[90px] shrink-0">
          <button onClick={() => setGameState('setup')} className="px-5 py-2.5 rounded-xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border border-slate-100 hover:text-rose-500 transition-all">← 나가기</button>
          <div className="text-center">
             <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 italic">다음 순서</p>
             <h2 className="text-2xl font-[1000] text-slate-900 uppercase italic tracking-tighter border-b-2 border-blue-500 pb-1 leading-none">{players[currentPlayer]} TEAM</h2>
          </div>
          <div className="flex flex-col items-center border-l-4 border-slate-100 pl-8">
             <div className={`text-4xl font-mono font-black border-slate-100 leading-none ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-900'}`}>{fmt(timeLeft)}</div>
             <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 italic leading-none">전체 타이머</div>
          </div>
       </div>

       <div className="flex-1 flex flex-col bg-white border border-slate-100 p-10 rounded-[4rem] text-center shadow-xl justify-center relative overflow-hidden mb-6">
          <div className="absolute top-10 left-10 w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-blue-100 italic">🔗</div>
          <div className="flex flex-col gap-4 px-10">
             <h2 className="text-7xl font-[1000] text-slate-900 italic tracking-tighter break-words leading-none uppercase">{currentWord}</h2>
             {meaning && (
                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 animate-in fade-in slide-in-from-top-2 duration-700">
                   <p className="text-2xl font-black text-blue-600/60 leading-tight">"{meaning}"</p>
                </div>
             )}
          </div>
       </div>

       <form onSubmit={handleInput} className="flex gap-4 px-4 mb-4 shrink-0">
          <div className="relative flex-1">
             <input type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder={`${lastChar(currentWord)} 로 시작하는 단어...`}
                className="w-full bg-white border-4 border-slate-100 rounded-[2.5rem] px-10 py-6 text-3xl font-[1000] text-slate-900 placeholder:text-slate-200 focus:outline-none focus:border-blue-500 transition-all shadow-2xl uppercase italic" autoFocus />
             <div className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-200 text-sm font-black italic uppercase tracking-widest pointer-events-none">Type and Enter</div>
          </div>
       </form>

       <div className="px-6 flex gap-3 overflow-x-auto pb-4 custom-scrollbar-light shrink-0">
          {[...words].reverse().slice(1).map((w, idx) => (
             <div key={idx} className="shrink-0 h-10 px-5 bg-slate-50 border border-slate-100 rounded-full flex items-center text-slate-400 font-bold text-sm italic opacity-60">
                {w}
             </div>
          ))}
       </div>
    </div>
  );
}
