import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

type PlacedWord = { word: string; cells: { r: number; c: number }[] };

export default function WordSearch() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'done'>('setup');
  const [gridSize, setGridSize] = useState(10); 
  const [maxWordsToFind, setMaxWordsToFind] = useState(10);
  const [words, setWords] = useState<string[]>([]);
  const [grid, setGrid] = useState<string[][]>([]);
  const [placedObjects, setPlacedObjects] = useState<PlacedWord[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [newTeam, setNewTeam] = useState('');
  const [currentTeamIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [matchMode, setMatchMode] = useState<'single' | 'team'>('team');
  const [newWord, setNewWord] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  
  const handleDownloadTemplate = () => {
    const wsData = [
      ["단어 목록 (Word List)"],
      ["APPLE"], ["BANANA"], ["ORANGE"], ["GRAPES"], ["MANGO"],
      ["STRAWBERRY"], ["PEACH"], ["MELON"], ["CHERRY"], ["KIWI"]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "WordSearch_Words");
    XLSX.writeFile(wb, "word_search_template.xlsx");
  };

  const handleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const list: string[] = [];
        XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1).forEach(row => {
          if (row[0]) list.push(String(row[0]).trim().toUpperCase());
        });
        const combined = Array.from(new Set([...words, ...list]));
        setWords(combined);
        alert(`${list.length}개의 단어를 불러왔습니다.`);
      } catch { alert('오류'); }
    };
    reader.readAsBinaryString(f);
    if(e.target) e.target.value = '';
  };

  const handleAddTeam = () => {
    const name = newTeam.trim();
    if (!name) return;
    if (teams.includes(name)) {
      alert("이미 등록된 이름입니다.");
      return;
    }
    setTeams([...teams, name]);
    setNewTeam('');
  };

  const generateGrid = (customWords?: string[]) => {
    const wordList = customWords || words;
    const targetWords = wordList.filter(w => w.length <= gridSize).sort(() => Math.random() - 0.5);
    const newGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
    const newlyPlaced: PlacedWord[] = [];

    for (const word of targetWords) {
      if (newlyPlaced.length >= maxWordsToFind) break;
      
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 100) {
        const directions = ['H', 'V', 'DR', 'DL'];
        const dir = directions[Math.floor(Math.random() * directions.length)];
        
        let r, c, dr, dc;
        if (dir === 'H') { r = Math.floor(Math.random() * gridSize); c = Math.floor(Math.random() * (gridSize - word.length + 1)); dr = 0; dc = 1; }
        else if (dir === 'V') { r = Math.floor(Math.random() * (gridSize - word.length + 1)); c = Math.floor(Math.random() * gridSize); dr = 1; dc = 0; }
        else if (dir === 'DR') { r = Math.floor(Math.random() * (gridSize - word.length + 1)); c = Math.floor(Math.random() * (gridSize - word.length + 1)); dr = 1; dc = 1; }
        else { r = Math.floor(Math.random() * (gridSize - word.length + 1)); c = Math.floor(Math.random() * (gridSize - word.length) + word.length - 1); dr = 1; dc = -1; }
        
        let conflict = false;
        const wordCells: { r: number; c: number }[] = [];
        for (let i = 0; i < word.length; i++) {
          const currR = r + i * dr;
          const currC = c + i * dc;
          if (newGrid[currR][currC] && newGrid[currR][currC] !== word[i]) { conflict = true; break; }
          wordCells.push({ r: currR, c: currC });
        }

        if (!conflict) {
          wordCells.forEach((cell, i) => newGrid[cell.r][cell.c] = word[i]);
          newlyPlaced.push({ word, cells: wordCells });
          placed = true;
        }
        attempts++;
      }
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (!newGrid[i][j]) newGrid[i][j] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }

    setGrid(newGrid);
    setPlacedObjects(newlyPlaced);
    setFoundWords([]);
    setShowAnswer(false);
    setGameState('playing');
  };

  const totalSteps = 3;
  const step1Done = !!matchMode;
  const step2Done = words.length >= 1;
  const step3Done = (matchMode === 'team' ? teams.length >= 2 : teams.length >= 1);
  const isReady = words.length > 0 && step3Done;

  const handlePrint = () => {
    window.print();
  };

  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const getButtonText = () => {
    if (!step2Done) return "단어를 등록해주세요 (최소 1개)";
    if (matchMode === 'team' && teams.length < 2) return "팀을 등록해주세요 (최소 2팀)";
    if (matchMode === 'single' && teams.length < 1) return "참가자를 등록해주세요";
    return "START MISSION ▶";
  };

  if (gameState === 'setup') {
    return (
      <div className="max-w-screen-2xl mx-auto w-full p-[2cm] h-[calc(100vh-100px)] flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 no-print overflow-x-hidden overflow-y-auto min-h-0 relative">
        <div className="flex items-center justify-between mb-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm shrink-0">
           <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-2xl shadow-lg text-white">🔍</div>
              <div>
                <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 leading-none mb-1">낱말찾기 설정</h1>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest leading-none">High-Density Word Finder</p>
              </div>
           </div>
           
           <div className="hidden md:flex items-center gap-8 mr-10">
              {[
                { label: '대전 모드', done: step1Done },
                { label: '단어/격자', done: step2Done },
                { label: '명단 등록', done: step3Done }
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-black border-2 transition-all
                    ${s.done ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 
                      (i === completedSteps ? 'border-purple-500 text-purple-500 animate-pulse' : 'border-slate-200 text-slate-300')}`}>
                    {s.done ? '✓' : i + 1}
                  </div>
                  <span className={`text-[0.6875rem] font-[1000] uppercase tracking-widest ${s.done ? 'text-slate-900' : 'text-slate-300'}`}>
                    {s.label}
                  </span>
                  {i < 2 && <div className="w-8 h-px bg-slate-100 mx-2" />}
                </div>
              ))}
           </div>

           <div className="flex items-center gap-2 px-4 py-1.5 bg-purple-50 border border-purple-100 rounded-full">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isReady ? 'bg-emerald-500' : 'bg-purple-500'}`} />
              <span className="text-[0.625rem] font-black text-purple-600 uppercase tracking-widest leading-none">
                {isReady ? '준비완료' : '설정 진행중'}
              </span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-2 items-stretch flex-1 overflow-y-auto custom-scrollbar-light pb-10 lg:pb-0 min-h-0">
          <div className="col-span-1 lg:col-span-7 flex flex-col gap-2 overflow-visible lg:overflow-y-auto min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
                <div className={`bg-white border rounded-[2.5rem] px-6 py-4 shadow-sm flex flex-col shrink-0 transition-all duration-300 ${matchMode ? 'border-purple-500 ring-4 ring-purple-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <label className="text-[0.6875rem] font-[1000] text-purple-900 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full">STEP 01. 대전 모드 선택</label>
                    {step1Done && <span className="text-emerald-500 text-sm">✓</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setMatchMode('single')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                        ${matchMode === 'single' ? 'bg-purple-500 border-purple-600 text-white shadow-xl shadow-purple-500/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-purple-200'}`}>
                      <span className={`text-2xl transition-transform group-hover:scale-110 ${matchMode === 'single' ? 'grayscale-0' : 'grayscale'}`}>👤</span>
                      <span className="text-[0.75rem] font-black">개인전</span>
                      <span className={`text-[0.625rem] font-bold ${matchMode === 'single' ? 'text-purple-100' : 'text-slate-300'}`}>플레이어들 VS 진행자</span>
                    </button>
                    <button onClick={() => setMatchMode('team')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                        ${matchMode === 'team' ? 'bg-purple-500 border-purple-600 text-white shadow-xl shadow-purple-500/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-purple-200'}`}>
                      <span className={`text-2xl transition-transform group-hover:scale-110 ${matchMode === 'team' ? 'grayscale-0' : 'grayscale'}`}>👥</span>
                      <span className="text-[0.75rem] font-black">단체전</span>
                      <span className={`text-[0.625rem] font-bold ${matchMode === 'team' ? 'text-purple-100' : 'text-slate-300'}`}>팀 간 대결</span>
                    </button>
                  </div>
                </div>

                <div className={`bg-white border rounded-[2.5rem] px-6 py-4 shadow-sm flex flex-col shrink-0 transition-all duration-300 ${gridSize ? 'border-purple-500 ring-4 ring-purple-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[0.6875rem] font-[1000] text-purple-900 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full">STEP 02. 게임 상세 설정</label>
                    <span className="text-[0.625rem] font-black text-slate-400">CONFIG CARD</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div className="text-left">
                        <p className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">찾을 문항 수</p>
                        <p className="text-2xl font-[1000] italic text-purple-600 leading-none mt-1">{maxWordsToFind} Q</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setMaxWordsToFind(n => Math.max(1, n - 1))} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-purple-500 font-black hover:bg-slate-50 active:scale-90 transition-all shadow-sm">－</button>
                        <button onClick={() => setMaxWordsToFind(n => Math.min(20, n + 1))} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-purple-500 font-black hover:bg-slate-50 active:scale-90 transition-all shadow-sm">＋</button>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">격자 차원 (GRID SIZE)</p>
                      <div className="grid grid-cols-6 gap-1.5">
                        {[5, 10, 15, 20, 25, 30].map(sz => (
                          <button key={sz} onClick={() => setGridSize(sz)}
                            className={`py-1.5 rounded-lg text-[0.8125rem] font-black border-2 transition-all
                              ${gridSize === sz ? 'bg-purple-100 border-purple-500 text-purple-700 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-300 hover:border-purple-200'}`}>
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-h-0">
               <div className={`bg-white border rounded-[2.5rem] px-6 py-4 shadow-sm min-h-0 flex flex-col transition-all duration-300 ${step2Done ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[0.75rem] font-[1000] text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full shrink-0">단어 목록 등록</h3>
                    <button onClick={() => setWords([])} className="text-[0.625rem] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase">✕ 초기화</button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <input value={newWord} onChange={e => setNewWord(e.target.value.toUpperCase())} 
                       onKeyDown={e => { if(e.key === 'Enter') { if(newWord.trim()) setWords([...words, newWord.trim()]); setNewWord(''); } }}
                       placeholder="단어 입력..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 font-bold text-sm shadow-inner" />
                    <button onClick={() => { if(newWord.trim()) setWords([...words, newWord.trim()]); setNewWord(''); }} className="px-4 rounded-xl bg-emerald-500 text-white font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20">+</button>
                  </div>
                  <div className="flex-1 max-h-[60vh] overflow-y-auto bg-slate-50/50 rounded-xl border border-slate-100 p-4 flex flex-wrap content-start gap-1.5 custom-scrollbar-light shadow-inner min-h-0 scrollable-panel">
                    {words.length === 0 ? (
                      <div className="w-full h-[calc(100vh-100px)] flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-slate-200 rounded-lg py-6">
                        <span className="text-[0.625rem] font-black uppercase tracking-widest italic">No words registered</span>
                      </div>
                    ) : (
                      words.map((w, i) => (
                        <div key={i} className="h-8 rounded-lg border bg-white border-slate-200 text-slate-700 px-3 flex items-center gap-2 font-bold text-[0.6875rem] shadow-sm hover:border-emerald-500 transition-all animate-in zoom-in-95 group">
                           <span className="text-emerald-500/40 italic">#W{i+1}</span> <span>{w}</span>
                           <button onClick={() => setWords(words.filter((_, idx) => idx !== i))} className="w-5 h-5 rounded-full bg-slate-50 text-slate-300 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center text-[0.625rem]">✕</button>
                        </div>
                      ))
                    )}
                  </div>
               </div>

               <div className={`bg-white border rounded-[2.5rem] px-6 py-4 shadow-sm min-h-0 flex flex-col transition-all duration-300 ${step3Done ? 'border-purple-500 ring-4 ring-purple-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[0.75rem] font-[1000] text-purple-700 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full shrink-0">참가 명단 등록</h3>
                    <button onClick={() => setTeams([])} className="text-[0.625rem] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase">✕ 초기화</button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <input value={newTeam} onChange={e => setNewTeam(e.target.value)} 
                       onKeyDown={e => { if(e.key === 'Enter') handleAddTeam() }}
                       placeholder={matchMode === "team" ? "팀 이름..." : "참가자 이름..."} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-purple-500 font-bold text-sm shadow-inner" />
                    <button onClick={() => handleAddTeam()} className="px-4 rounded-xl bg-purple-500 text-white font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-500/20">+</button>
                  </div>
                  <div className="flex-1 max-h-[60vh] overflow-y-auto bg-slate-50/50 rounded-xl border border-slate-100 p-4 flex flex-wrap content-start gap-1.5 custom-scrollbar-light shadow-inner min-h-0 scrollable-panel">
                    {teams.length === 0 ? (
                      <div className="w-full h-[calc(100vh-100px)] flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-slate-200 rounded-lg py-6">
                        <span className="text-[0.625rem] font-black uppercase tracking-widest italic">No participants</span>
                      </div>
                    ) : (
                      teams.map((t, i) => (
                        <div key={i} className="h-8 rounded-lg border bg-white border-slate-200 text-slate-700 px-3 flex items-center gap-2 font-bold text-[0.6875rem] shadow-sm hover:border-purple-500 transition-all animate-in zoom-in-95 group">
                           <span className="text-purple-500/40 italic">#T{i+1}</span> <span>{t}</span>
                           <button onClick={() => setTeams(teams.filter((_, idx) => idx !== i))} className="w-5 h-5 rounded-full bg-slate-50 text-slate-300 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center text-[0.625rem]">✕</button>
                        </div>
                      ))
                    )}
                  </div>
               </div>
            </div>
          </div>

          {/* Right Status Panel */}
          <div className="col-span-1 lg:col-span-3 flex flex-col gap-3 min-h-0">
             <div className="bg-white border border-slate-200 rounded-[2.5rem] px-5 py-5 shadow-sm flex flex-col h-full relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 shrink-0">
                   <h2 className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" /> SETTING STATUS
                   </h2>
                </div>

                <div className="flex flex-col flex-1 min-h-0 gap-3">
                   {/* Progress Section - Compact Card */}
                   <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 shrink-0">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">설정 완료율</span>
                         <span className="text-xl font-[1000] italic text-purple-600">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-white rounded-full overflow-hidden shadow-inner">
                         <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-700" style={{ width: `${progressPercent}%` }} />
                      </div>
                   </div>

                   {/* Status Items - Badge Style */}
                   <div className="space-y-1.5 overflow-y-auto no-scrollbar shrink-0">
                      {[
                        { label: '대전 모드 선택', done: step1Done },
                        { label: '단어/격자 설정', done: step2Done },
                        { label: '참가 명단 등록', done: step3Done }
                      ].map((s, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-xl">
                           <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${s.done ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                              <span className={`text-[0.6875rem] font-black tracking-tight ${s.done ? 'text-slate-700' : 'text-slate-400'}`}>{s.label}</span>
                           </div>
                           <span className={`px-2 py-0.5 rounded-md text-[0.5625rem] font-black uppercase tracking-wider ${s.done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                              {s.done ? 'Ready' : 'Pending'}
                           </span>
                        </div>
                      ))}
                   </div>

                   {/* Mission Guide - Compact */}
                   <div className="bg-slate-50/30 border border-slate-100 rounded-2xl p-3 shrink-0">
                      <h3 className="text-[0.625rem] font-black text-purple-600 uppercase tracking-widest italic mb-2 flex items-center gap-2">
                         <span className="w-1 h-3 bg-purple-500 rounded-full" /> MISSION GUIDE
                      </h3>
                      <div className="space-y-1.5">
                         <p className="text-[0.625rem] font-bold text-slate-500 leading-tight tracking-tighter">
                            격자 속 단어를 팀별로 찾아내는 속도전 게임
                         </p>
                         <p className="text-[0.625rem] font-bold text-slate-500 leading-tight tracking-tighter">
                            단어 등록, 차원 설정 후 엑셀을 활용하세요
                         </p>
                      </div>
                   </div>

                   {/* Action Buttons - Sticky to bottom of panel */}
                   <div className="mt-auto pt-3 border-t border-slate-100 space-y-2 shrink-0 sticky bottom-0 bg-white">
                      <div className="flex gap-2">
                         <button onClick={handleDownloadTemplate} className="flex-1 h-[48px] text-[14px] font-semibold text-yellow-900 bg-yellow-400 border border-yellow-500 rounded-xl hover:bg-yellow-500 transition-all uppercase tracking-tight leading-none truncate px-1">Template 📥</button>
                         <button onClick={() => fileRef.current?.click()} className="flex-1 h-[48px] text-[14px] font-semibold text-white bg-slate-800 rounded-xl hover:bg-black transition-all uppercase tracking-tight leading-none truncate px-1">Excel Upload 📂</button>
                      </div>
                      <input type="file" ref={fileRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleExcel} />
                      
                      <button onClick={() => generateGrid()} 
                        disabled={!isReady}
                        className={`w-full h-[52px] rounded-2xl font-black text-lg transition-all relative overflow-hidden group
                          ${isReady ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-600/20' : 'bg-slate-100 text-slate-400 opacity-40 cursor-not-allowed'}`}>
                        <span className="relative z-10">{getButtonText()}</span>
                        {isReady && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />}
                      </button>
                      <p className="text-[0.5625rem] font-bold text-slate-300 text-center uppercase tracking-widest">
                         * 모든 조건 충족 시 활성화
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'done') {
     return (
        <div className="fixed inset-0 z-50 bg-[#120614]/95 flex items-center justify-center p-4 backdrop-blur-3xl no-print">
           <div className="bg-white border-[12px] border-purple-500/20 rounded-[3rem] lg:rounded-[5rem] p-8 lg:p-16 max-w-lg w-full text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-32 h-32 bg-rose-500 rounded-[2.5rem] flex items-center justify-center text-3xl lg:text-5xl lg:text-7xl mb-10 mx-auto shadow-2xl text-white italic">🏆</div>
            <p className="text-xl font-black text-rose-500 mb-2 uppercase tracking-[0.5em] italic">승리 (VICTORY)</p>
            <h2 className="text-4xl lg:text-6xl font-[1000] text-slate-900 mb-12 uppercase italic tracking-tighter leading-none border-b-8 border-rose-500 pb-4 inline-block">미션 성공!</h2>
            <div className="flex flex-col gap-3">
               <button onClick={() => setGameState('setup')} className="w-full py-6 rounded-3xl bg-slate-900 text-white font-[1000] text-2xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">나가기</button>
            </div>
           </div>
        </div>
     );
  }

  return (
    <>
    <div className="max-w-[1160px] mx-auto w-full h-[calc(100vh-100px)] flex flex-col animate-in fade-in pt-1 pb-[1cm] font-sans text-slate-900 overflow-hidden no-print">
       <div className="flex items-center justify-between mb-1.5 bg-white border border-slate-200 rounded-2xl px-6 py-2 shadow-sm min-h-[60px] shrink-0">
          <div className="flex items-center gap-2 lg:gap-3">
             <button onClick={() => setGameState('setup')} 
               className="min-w-[100px] h-[40px] flex items-center justify-center rounded-[0.8rem] bg-slate-50 text-slate-400 font-black text-[0.625rem] uppercase tracking-widest border border-slate-200 hover:text-rose-500 hover:border-rose-100 transition-all leading-none">← EXIT</button>
             <button onClick={() => setShowAnswer(!showAnswer)} 
               className={`min-w-[120px] h-[40px] flex items-center justify-center rounded-[0.8rem] text-[0.625rem] font-black uppercase tracking-widest transition-all border ${showAnswer ? 'bg-rose-500 border-rose-400 text-white' : 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'} leading-none`}>
                {showAnswer ? '🙈 숨기기' : '👁️ 정답 확인'}
             </button>
             <button onClick={handlePrint} 
               className="min-w-[100px] h-[40px] flex items-center justify-center rounded-[0.8rem] bg-slate-900 text-white text-[0.625rem] font-black uppercase tracking-widest hover:bg-purple-600 transition-all leading-none gap-2">
                🖨️ 출력
             </button>
          </div>
           <div className="text-center flex flex-col">
              <h1 className="text-xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-1">낱말찾기</h1>
              <h2 className="text-[0.625rem] font-bold text-rose-500 uppercase tracking-[0.3em] leading-none opacity-80">{teams[currentTeamIdx]} MISSION</h2>
           </div>
          <div className="flex items-center gap-4 border-l-2 border-slate-100 pl-6 h-full">
             <div className="text-right">
                <div className="text-2xl font-mono font-black text-rose-500 leading-none">{foundWords.length} / {placedObjects.length}</div>
                <div className="text-[0.5rem] font-black text-slate-300 uppercase tracking-widest mt-1 italic leading-none">MISSION PROGRESS</div>
             </div>
          </div>
       </div>

       <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden min-h-0">
          <div className="col-span-12 lg:col-span-8 bg-white rounded-[1.5rem] p-1 shadow-2xl border border-slate-100 flex items-center justify-center overflow-hidden h-full">
              <div className="w-full h-full flex items-center justify-center p-1 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner overflow-hidden">
                 <div className="grid border-[6px] border-slate-200 shadow-2xl overflow-hidden bg-white" 
                    style={{ 
                      gridTemplateColumns: `repeat(${gridSize}, 1fr)`, 
                      gridTemplateRows: `repeat(${gridSize}, 1fr)`,
                      width: '100%',
                      height: '100%',
                      maxWidth: 'calc(100vh - 220px)',
                      maxHeight: 'calc(100vh - 220px)',
                      aspectRatio: '1/1'
                    }}>
                     {grid.map((row, r) => row.map((cell, c) => {
                        const wordIdx = showAnswer ? placedObjects.findIndex(obj => obj.cells.some(co => co.r === r && co.c === c)) : -1;
                        const colors = [
                          'bg-rose-500/20 text-rose-600', 'bg-blue-500/20 text-blue-600', 'bg-emerald-500/20 text-emerald-600',
                          'bg-amber-500/20 text-amber-600', 'bg-purple-500/20 text-purple-600', 'bg-cyan-500/20 text-cyan-600',
                          'bg-pink-500/20 text-pink-600', 'bg-indigo-500/20 text-indigo-600', 'bg-orange-500/20 text-orange-600',
                          'bg-teal-500/20 text-teal-600'
                        ];
                        const cellColor = wordIdx !== -1 ? colors[wordIdx % colors.length] : 'bg-white text-slate-800';
                        
                        return (
                          <div key={`${r}-${c}`} 
                            className={`flex items-center justify-center font-[1000] border border-slate-100 transition-all select-none w-full h-full
                              ${cellColor} hover:bg-purple-100`}
                            style={{ 
                              fontSize: `calc((100vh - 220px) / ${gridSize} * 0.7)`,
                              maxHeight: '100%', 
                              minWidth: 0, 
                              minHeight: 0,
                              lineHeight: 1
                            }}>
                            {cell}
                          </div>
                        );
                     }))}
                  </div>
              </div>
           </div>

           <div className="col-span-12 lg:col-span-4 bg-slate-900 rounded-[1.5rem] border border-white/5 p-4 shadow-2xl flex flex-col overflow-hidden min-h-0">
              <div className="flex items-center justify-between mb-3 border-l-4 border-purple-500 pl-3 leading-none font-sans underline decoration-purple-500/20 underline-offset-8 shrink-0">
                 <h3 className="text-sm font-[1000] italic text-white uppercase tracking-widest">찾을 단어</h3>
                 <span className="text-purple-400 text-[0.625rem] font-black">{placedObjects.length} WORDS</span>
              </div>
              <div className="flex-1 overflow-y-auto content-start px-1 pr-1 pb-1 custom-scrollbar-dark flex flex-col gap-2">
                {placedObjects.map((obj, i) => (
                   <div key={i} onClick={() => { if(!foundWords.includes(obj.word)) { const nf = [...foundWords, obj.word]; setFoundWords(nf); if(nf.length === placedObjects.length) setGameState('done'); } }}
                     className={`flex items-center justify-between px-5 py-3 rounded-xl border transition-all cursor-pointer min-h-[48px] ${foundWords.includes(obj.word) ? 'bg-emerald-500 border-emerald-400 text-white opacity-40 scale-[0.98]' : 'bg-white/5 border-white/10 text-white shadow-lg hover:bg-white/10 hover:border-purple-500 hover:scale-[1.02]'}`}>
                      <span className="text-xl font-[1000] italic tracking-tight uppercase leading-none truncate pr-2">{obj.word}</span>
                       {foundWords.includes(obj.word) ? <span className="text-lg">✓</span> : <span className="text-purple-500 text-[0.625rem] font-black italic uppercase leading-none shrink-0">목표</span>}
                   </div>
                ))}
              </div>
           </div>
       </div>
    </div>
    
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        /* General Overrides */
        .no-print { display: none !important; }
        
        body { background: white !important; padding: 0 !important; margin: 0 !important; }
        
        .print-only { 
          display: block !important; 
          visibility: visible !important;
          position: static !important;
          width: 100%; 
          margin: 0;
          padding: 0;
          background: white !important;
        }

        .page-break { 
           display: block;
           page-break-after: always !important; 
           break-after: page !important;
           width: 100%;
        }
        
        .print-container {
           width: 100%;
           height: auto;
           display: flex;
           flex-direction: column;
           align-items: center;
           page-break-inside: avoid !important;
           margin: 0 !important;
           padding: 15mm !important;
           box-sizing: border-box;
           background: white !important;
         }

        .print-header {
           width: 100%;
           text-align: center;
           margin-bottom: 15px;
           border-bottom: 6px solid black;
           padding-bottom: 15px;
        }

        .print-grid { 
           display: grid;
           border: 4px solid black;
           border-radius: 0;
           width: 155mm !important;
           height: 155mm !important;
           aspect-ratio: 1 / 1;
           margin-bottom: 20px !important;
           background: white !important;
           padding: 5px;
           box-sizing: border-box;
        }

        .print-cell {
           border: 1px solid black;
           display: flex;
           align-items: center;
           justify-content: center;
           font-weight: 800;
           color: black !important;
           line-height: 1;
           box-sizing: border-box;
        }

        .print-words {
           display: grid;
           grid-template-columns: repeat(5, 1fr);
           gap: 4px 10px;
           width: 100%;
           border: 2px solid #000;
           padding: 12px;
           border-radius: 12px;
        }

        .answer-cell {
           background-color: #fef08a !important; /* Yellow 200 */
           color: black !important;
           font-weight: 900;
           border: 1px solid black !important;
        }
      }
      .print-only { display: none; }
    `}} />

    {/* Print View Content */}
    <div className="print-only text-black font-sans">
      {/* Page 1: Question */}
      <div className="print-container p-4 page-break">
        <div className="print-header mb-4">
          <div className="text-center">
             <h1 className="text-4xl font-[1000] uppercase tracking-tighter italic leading-none truncate max-w-[400px]">낱말찾기</h1>
             <p className="text-[0.625rem] text-rose-500 font-bold uppercase tracking-[0.4em] mt-2 opacity-70">Mission Module</p>
          </div>
          <p className="text-lg font-black uppercase tracking-[0.4em] mt-2 bg-black text-white inline-block px-5 py-1 rounded-lg italic">Mission: {teams[currentTeamIdx]}</p>
          <div className="block text-[0.5rem] font-black mt-1 opacity-30 tracking-[0.8em]">GRID: {gridSize}x{gridSize} | {placedObjects.length} WORDS</div>
        </div>
        
        <div className="print-grid" style={{ 
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`, 
          gridTemplateRows: `repeat(${gridSize}, 1fr)` 
        }}>
          {grid.map((row, r) => row.map((cell, c) => (
            <div key={`${r}-${c}`} className="print-cell" style={{ 
              fontSize: `calc(155mm / ${gridSize} * 0.85)`
            }}>
              {cell}
            </div>
          )))}
        </div>

        <div className="w-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-6 w-2 bg-black" />
             <h2 className="text-xl font-[1000] uppercase tracking-widest italic leading-none">찾을 단어 목록</h2>
          </div>
          <div className="print-words">
            {placedObjects.map((obj, i) => (
              <div key={i} className="text-[0.6875rem] font-[1000] uppercase italic border-b border-slate-100 py-0.5 flex items-center gap-1">
                <span className="text-slate-400 text-[0.5rem] shrink-0">[{String(i+1).padStart(2,'0')}]</span>
                <span className="truncate">{obj.word}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between items-center opacity-30 border-t border-black/10 pt-2">
            <p className="text-[0.5rem] font-black uppercase tracking-[0.4em]">EiE Premium English Academy</p>
            <p className="text-[0.5rem] font-black uppercase">Mission Pass Score: ALL</p>
          </div>
        </div>
      </div>

      {/* Page 2: Answer Key */}
      <div className="print-container p-4" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
        <div className="print-header border-yellow-500 mb-6 relative">
          <div className="absolute top-0 right-0 bg-yellow-500 text-white px-4 py-1 text-[0.625rem] font-black uppercase tracking-widest rounded-bl-xl shadow-sm">TEACHER'S COPY</div>
           <h1 className="text-4xl lg:text-6xl font-[1000] uppercase tracking-tighter italic text-yellow-600 underline decoration-yellow-400 decoration-8 underline-offset-8 leading-none">정답지</h1>
           <p className="text-xl font-black uppercase tracking-[0.3em] mt-5 text-slate-400">낱말찾기 정답 확인 센터</p>
        </div>
        
        <div className="print-grid border-yellow-500/20" style={{ 
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`, 
          gridTemplateRows: `repeat(${gridSize}, 1fr)` 
        }}>
          {grid.map((row, r) => row.map((cell, c) => {
            const wordIdx = placedObjects.findIndex(obj => obj.cells.some(co => co.r === r && co.c === c));
            const printColors = [
               '#fee2e2', '#dcfce7', '#dbeafe', '#fef9c3', '#f3e8ff', 
               '#ecfeff', '#fce7f3', '#e0e7ff', '#ffedd5', '#f1f5f9'
            ];
            const isAnswer = wordIdx !== -1;
            return (
               <div key={`${r}-${c}`} className={`print-cell ${isAnswer ? '' : 'text-slate-100 opacity-20'}`} style={{ 
                 fontSize: `calc(155mm / ${gridSize} * 0.85)`,
                 backgroundColor: isAnswer ? printColors[wordIdx % printColors.length] : 'transparent',
                 color: isAnswer ? '#000' : ''
               }}>
                  {cell}
               </div>
            );
          }))}
        </div>

        <div className="w-full mt-1.5">
          <div className="bg-yellow-50/50 p-3 rounded-2xl border border-yellow-100">
            <h3 className="text-[0.625rem] font-black text-yellow-700 mb-1.5 uppercase tracking-[0.2em] italic leading-none border-b border-yellow-200 pb-1">Verified Results ({placedObjects.length} Words)</h3>
            <div className="grid grid-cols-5 gap-x-6 gap-y-1">
              {placedObjects.map((obj, i) => (
                <div key={i} className="flex justify-between items-center font-[1000] italic border-b border-yellow-100/50 pb-0.5">
                  <span className="text-yellow-600/50 text-[0.5rem] uppercase">{String(i+1).padStart(2,'0')}</span>
                  <span className="text-[0.625rem] text-slate-800 uppercase truncate ml-1">{obj.word}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-center opacity-20">
          <p className="text-[0.5rem] font-black uppercase tracking-[0.8em]">EiE Premium Academy</p>
        </div>
      </div>
    </div>
    </>
  );
}
