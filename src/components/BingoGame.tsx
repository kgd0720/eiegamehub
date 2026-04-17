import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function BingoGame() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'done'>('setup');
  const [gridSize, setGridSize] = useState<number>(4);
  const [words, setWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [targetBingo, setTargetBingo] = useState<number>(3);
  const [teams, setTeams] = useState<string[]>([]);
  const [newTeam, setNewTeam] = useState('');
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [bingoLines, setBingoLines] = useState<number[][]>([]);
  const [completedBingos, setCompletedBingos] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const calcBingoLines = (selected: Set<number>, size: number) => {
    const lines: number[][] = [];
    for (let r = 0; r < size; r++) {
      const row = Array.from({ length: size }, (_, c) => r * size + c);
      if (row.every(i => selected.has(i))) lines.push(row);
    }
    for (let c = 0; c < size; c++) {
      const col = Array.from({ length: size }, (_, r) => r * size + c);
      if (col.every(i => selected.has(i))) lines.push(col);
    }
    const diag1 = Array.from({ length: size }, (_, i) => i * size + i);
    if (diag1.every(i => selected.has(i))) lines.push(diag1);
    const diag2 = Array.from({ length: size }, (_, i) => i * size + (size - 1 - i));
    if (diag2.every(i => selected.has(i))) lines.push(diag2);
    return lines;
  };

  const handleDownloadTemplate = () => {
    const wsData = [
      ["단어 (Word List)"],
      ["APPLE"], ["BANANA"], ["ORANGE"], ["GRAPES"], ["MANGO"],
      ["STRAWBERRY"], ["PEACH"], ["MELON"], ["CHERRY"], ["KIWI"]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Bingo_Words");
    XLSX.writeFile(wb, "bingo_template.xlsx");
  };

  useEffect(() => {
    if (gameState !== 'playing') return;
    const lines = calcBingoLines(selectedIndices, gridSize);
    setBingoLines(lines);
    setCompletedBingos(lines.length);
    if (lines.length >= targetBingo) {
      setGameState('done');
    }
  }, [selectedIndices, gameState, gridSize, targetBingo]);

  const handleAddWord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const word = newWord.trim().toUpperCase();
    if (word && !words.includes(word)) {
      setWords([...words, word]);
      setNewWord('');
    }
  };

  const handleRemoveWord = (index: number) => setWords(words.filter((_, i) => i !== index));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const result = evt.target?.result;
        const wb = XLSX.read(result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const imported = [...new Set(data.flat().map(c => String(c || '').trim().toUpperCase()).filter(c => c.length > 0))];
        const sorted = imported.sort(() => Math.random() - 0.5); setWords(sorted); if (sorted.length >= requiredCount && teams.length >= 1) { beginGame(); }
      } catch (err) { alert('파일 오류'); }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleCell = (index: number) => {
    const s = new Set(selectedIndices);
    if (s.has(index)) s.delete(index); else s.add(index);
    setSelectedIndices(s);
  };

  const handleAddTeam = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newTeam.trim() && !teams.includes(newTeam.trim())) {
      setTeams([...teams, newTeam.trim()]);
      setNewTeam('');
    }
  };

  const beginGame = () => {
    setSelectedIndices(new Set());
    setBingoLines([]);
    setCompletedBingos(0);
    setGameState('playing');
    setCurrentTeamIdx(0);
  };

  const isBingoCell = (idx: number) => bingoLines.some(line => line.includes(idx));

  const [matchMode, setMatchMode] = useState<'single' | 'team'>('team');
  const requiredCount = gridSize * gridSize;
  
  const totalSteps = 3;
  const step1Done = !!matchMode;
  const step2Done = gridSize > 0 && targetBingo > 0;
  const step3Done = words.length >= requiredCount && teams.length >= 1;
  const isReady = step2Done && step3Done;

  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const getButtonText = () => {
    if (words.length < requiredCount) return `단어 ${requiredCount - words.length}개 더 필요`;
    if (teams.length < 1) return "참가자를 등록해주세요";
    return "START MISSION ▶";
  };

  if (gameState === 'setup') {
    return (
      <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1 no-print overflow-hidden min-h-0 relative">
        {/* Header with Title and Global Progress */}
        <div className="flex items-center justify-between mb-3 bg-white border border-slate-200 rounded-2xl px-6 py-3 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-2xl shadow-lg text-white">🎯</div>
              <div>
                <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 leading-none mb-1">빙고게임 설정</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">High-Precision Bingo Hub</p>
              </div>
           </div>
           
           {/* Step Navigation Bar */}
           <div className="hidden md:flex items-center gap-8 mr-10">
              {[
                { label: '대전 모드', done: step1Done },
                { label: '판/목표 설정', done: step2Done },
                { label: '데이터 등록', done: step3Done }
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all
                    ${s.done ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 
                      (i === completedSteps ? 'border-emerald-500 text-emerald-500 animate-pulse' : 'border-slate-200 text-slate-300')}`}>
                    {s.done ? '✓' : i + 1}
                  </div>
                  <span className={`text-[11px] font-[1000] uppercase tracking-widest ${s.done ? 'text-slate-900' : 'text-slate-300'}`}>
                    {s.label}
                  </span>
                  {i < 2 && <div className="w-8 h-px bg-slate-100 mx-2" />}
                </div>
              ))}
           </div>

           <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isReady ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                {isReady ? '준비완료' : '설정 진행중'}
              </span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch flex-1 overflow-hidden custom-scrollbar-light pb-10 lg:pb-0 min-h-0">
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-3 overflow-visible lg:overflow-hidden min-h-0">
            {/* Step 1 & 2 Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                {/* Mode Selection Cards */}
                <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm flex flex-col shrink-0 transition-all duration-300 ${matchMode ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <label className="text-[11px] font-[1000] text-emerald-900 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">STEP 01. 대전 모드 선택</label>
                    {step1Done && <span className="text-emerald-500 text-sm">✓</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setMatchMode('single')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                        ${matchMode === 'single' ? 'bg-emerald-500 border-emerald-600 text-white shadow-xl shadow-emerald-500/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-200'}`}>
                      <span className={`text-2xl transition-transform group-hover:scale-110 ${matchMode === 'single' ? 'grayscale-0' : 'grayscale'}`}>👤</span>
                      <span className="text-[12px] font-black">개인전</span>
                      <span className={`text-[10px] font-bold ${matchMode === 'single' ? 'text-emerald-100' : 'text-slate-300'}`}>플레이어들 VS 진행자</span>
                    </button>
                    <button onClick={() => setMatchMode('team')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                        ${matchMode === 'team' ? 'bg-emerald-500 border-emerald-600 text-white shadow-xl shadow-emerald-500/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-200'}`}>
                      <span className={`text-2xl transition-transform group-hover:scale-110 ${matchMode === 'team' ? 'grayscale-0' : 'grayscale'}`}>👥</span>
                      <span className="text-[12px] font-black">단체전</span>
                      <span className={`text-[10px] font-bold ${matchMode === 'team' ? 'text-emerald-100' : 'text-slate-300'}`}>팀 간 대결</span>
                    </button>
                  </div>
                </div>

                {/* Grid & Bingo Goal settings */}
                <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm flex flex-col shrink-0 transition-all duration-300 ${step2Done ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-5">
                    <label className="text-[11px] font-[1000] text-emerald-900 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">STEP 02. 빙고판 설정</label>
                    <span className="text-[10px] font-black text-slate-400">CONFIG CARD</span>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">빙고판 크기</span>
                          <span className="text-xl font-[1000] italic text-emerald-600 leading-none mt-1">{gridSize}×{gridSize}</span>
                       </div>
                       <div className="flex gap-1">
                         {[3, 4, 5, 6].map(sz => (
                            <button key={sz} onClick={() => { setGridSize(sz); setTargetBingo(Math.min(targetBingo, sz)); }}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black border-2 transition-all
                                ${gridSize === sz ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-300 hover:border-emerald-200'}`}>
                              {sz}
                            </button>
                         ))}
                       </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">목표 빙고 라인</span>
                          <span className="text-xl font-[1000] italic text-emerald-600 leading-none mt-1">{targetBingo} LINES</span>
                       </div>
                       <div className="flex gap-1 max-w-[160px] flex-wrap justify-end">
                         {[1, 2, 3, 4, 5, 6].filter(n => n <= gridSize).map(n => (
                            <button key={n} onClick={() => setTargetBingo(n)}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black border-2 transition-all
                                ${targetBingo === n ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-300 hover:border-emerald-200'}`}>
                              {n}
                            </button>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
            </div>

            {/* Step 3: Registration Section */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-0">
               {/* Word List Registration */}
               <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm min-h-0 flex flex-col transition-all duration-300 ${words.length >= requiredCount ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[12px] font-[1000] text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full shrink-0">단어 목록 등록</h3>
                    <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-black uppercase ${words.length >= requiredCount ? 'text-emerald-500' : 'text-slate-300'}`}>{words.length} / {requiredCount}</span>
                       <button onClick={() => setWords([])} className="text-[10px] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase">✕ 싹비우기</button>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <input value={newWord} onChange={e => setNewWord(e.target.value.toUpperCase())} 
                       onKeyDown={e => { if(e.key === 'Enter') handleAddWord(); }}
                       placeholder="단어 입력..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 font-bold text-sm shadow-inner" />
                    <button onClick={() => handleAddWord()} className="px-4 rounded-xl bg-emerald-500 text-white font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-lg">+</button>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-3 flex flex-wrap content-start gap-1 custom-scrollbar-light shadow-inner min-h-0">
                    {words.length === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-slate-200 rounded-xl py-6">
                        <span className="text-[10px] font-black uppercase tracking-widest italic">Dictionary is empty</span>
                      </div>
                    ) : (
                      words.map((w, idx) => (
                        <div key={idx} className="h-8 rounded-lg border bg-white border-slate-200 text-slate-700 px-2.5 flex items-center gap-2 font-bold text-[10px] shadow-sm hover:border-emerald-500 transition-all animate-in zoom-in-95 group">
                           <span className="text-emerald-500/40 italic">#W{idx+1}</span> <span>{w}</span>
                           <button onClick={() => handleRemoveWord(idx)} className="w-5 h-5 rounded-full bg-slate-50 text-slate-300 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center text-[8px]">✕</button>
                        </div>
                      ))
                    )}
                  </div>
               </div>

               {/* Team registration */}
               <div className={`bg-white border rounded-[2.5rem] p-6 shadow-sm min-h-0 flex flex-col transition-all duration-300 ${teams.length >= 1 ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[12px] font-[1000] text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full shrink-0">참가 명단 등록</h3>
                    <button onClick={() => setTeams([])} className="text-[10px] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase">✕ 초기화</button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <input value={newTeam} onChange={e => setNewTeam(e.target.value)} 
                       onKeyDown={e => { if(e.key === 'Enter') handleAddTeam(); }}
                       placeholder={matchMode === "team" ? "팀 이름..." : "참여자 이름..."} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 font-bold text-sm shadow-inner" />
                    <button onClick={() => handleAddTeam()} className="px-4 rounded-xl bg-emerald-500 text-white font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-lg">+</button>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-3 flex flex-wrap content-start gap-1 custom-scrollbar-light shadow-inner min-h-0">
                    {teams.length === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-slate-200 rounded-xl py-6">
                        <span className="text-[10px] font-black uppercase tracking-widest italic leading-none mb-1">No participants</span>
                        <span className="text-[8px] font-bold">참가자를 등록해주세요</span>
                      </div>
                    ) : (
                      teams.map((t, idx) => (
                        <div key={idx} className="h-9 rounded-xl border bg-white border-slate-200 text-slate-700 px-3 flex items-center gap-2 font-bold text-xs shadow-sm hover:border-emerald-500 transition-all animate-in zoom-in-95 group">
                           <span className="text-emerald-500/40 italic">#T{idx+1}</span> <span>{t}</span>
                           <button onClick={() => setTeams(teams.filter((_, i) => i !== idx))} className="w-6 h-6 rounded-full bg-slate-50 text-slate-300 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center text-[10px]">✕</button>
                        </div>
                      ))
                    )}
                  </div>
               </div>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-4 flex flex-col gap-3 overflow-visible lg:overflow-hidden">
             <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="mb-6">
                  <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" /> SETTING STATUS
                  </h2>
                  <div className="flex items-end justify-between mb-2">
                    <p className="text-4xl font-[1000] italic tracking-tighter text-emerald-600 leading-none">{progressPercent}%</p>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">설정 완료율</p>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700 shadow-lg" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  {[
                    { label: '대전 모드 선택', done: step1Done },
                    { label: '판/목표 설정', done: step2Done },
                    { label: '데이터 등록', done: step3Done }
                  ].map((s, i) => (
                    <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${s.done ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className={`w-3 h-3 rounded-full shadow-sm ${s.done ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-slate-300'}`} />
                      <div className="flex-1">
                        <p className={`text-[11px] font-black uppercase tracking-widest ${s.done ? 'text-emerald-700' : 'text-slate-400'}`}>{s.label}</p>
                        <p className={`text-[9px] font-bold ${s.done ? 'text-emerald-500' : 'text-slate-300 italics'}`}>{s.done ? 'Ready' : 'Pending'}</p>
                      </div>
                      {s.done && <span className="text-emerald-500 font-black">✓</span>}
                    </div>
                  ))}

                  <div className="mt-4 w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] p-4 text-left shadow-inner">
                    <h3 className="text-[10px] font-[1000] text-emerald-600 uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-emerald-500 rounded-sm" /> MISSION GUIDE
                    </h3>
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">게임소개</p>
                        <p className="text-[11px] font-bold text-slate-600 leading-snug tracking-tighter">진행자의 단어로 빠르게 빙고를 완성하는 팀워크 게임</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">진행방법</p>
                        <p className="text-[11px] font-bold text-slate-600 leading-snug tracking-tighter">설정 후 엑셀 파일을 업로드하거나 단어를 직접 입력</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex gap-2 mb-3 shrink-0">
                     <button onClick={handleDownloadTemplate} className="flex-1 py-3 text-[10px] font-black text-yellow-900 bg-yellow-400 border border-yellow-500 rounded-xl hover:bg-yellow-500 hover:shadow-lg transition-all uppercase tracking-widest leading-none">Template 📥</button>
                     <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 text-[10px] font-black text-white bg-slate-900 rounded-xl hover:bg-black transition-all uppercase tracking-widest leading-none">Upload Excel 📂</button>
                  </div>
                  
                  <button onClick={() => beginGame()} 
                    disabled={!isReady}
                    className={`w-full py-5 rounded-[1.8rem] font-[1000] text-xl transition-all shadow-2xl relative overflow-hidden group
                      ${isReady ? 'bg-emerald-600 text-white hover:scale-105 active:scale-95 shadow-emerald-600/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                    <span className="relative z-10">{getButtonText()}</span>
                    {isReady && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    )}
                  </button>
                  <p className="text-[9px] font-bold text-slate-300 text-center mt-4 uppercase tracking-[0.2em] leading-none">
                    * {requiredCount}개 이상의 단어와 1명 이상의 명단이 필요합니다
                  </p>
                </div>
             </div>
          </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
      </div>
    );
  }

  if (gameState === 'done') {
    return (
      <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-3xl flex items-center justify-center p-4 text-slate-900 font-sans">
        <div className="bg-white border-4 border-emerald-500 rounded-[3rem] p-8 lg:p-12 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-400">
           <div className="text-[100px] mb-6 drop-shadow-2xl">🏆</div>
           <h2 className="text-4xl lg:text-6xl font-[1000] text-emerald-500 mb-2 tracking-tighter uppercase italic leading-none">빙고 성공!</h2>
           <p className="text-xl font-black text-slate-400 mb-10 uppercase tracking-[0.4em]">미션 완료 (COMPLETED)</p>
           <div className="flex flex-col gap-3">
              <button onClick={() => setGameState('playing')}
                className="w-full py-5 rounded-2xl bg-emerald-500 text-white font-[1000] text-xl uppercase tracking-widest shadow-xl hover:scale-105 transition-all">다시 하기</button>
              <button onClick={() => setGameState('setup')}
                className="w-full py-5 rounded-2xl bg-slate-100 text-slate-400 font-[1000] text-lg uppercase tracking-widest hover:bg-slate-200 transition-all">설정 화면</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 py-3 h-full flex flex-col text-slate-900 font-sans overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-6 bg-white border border-slate-200 rounded-2xl py-4 shadow-sm">
        <button onClick={() => setGameState('setup')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-rose-500 transition-all">← 나가기</button>
        <div className="flex flex-col"><p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 italic leading-none">{teams[currentTeamIdx]} ACTIVE</p><h2 className="text-2xl font-[1000] text-slate-900 italic uppercase tracking-tighter border-l-4 border-emerald-500 pl-4 leading-none">BINGO<span className="text-emerald-500 text-sm ml-2">{gridSize}×{gridSize}</span></h2></div>
        <div className="flex items-center gap-2">
            {Array.from({ length: targetBingo }).map((_, i) => (
              <div key={i} className={`w-10 h-10 rounded-lg border flex items-center justify-center text-lg font-black transition-all ${i < completedBingos ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-200 font-black'}`}>{i < completedBingos ? '✓' : i + 1}</div>
            ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-2 overflow-hidden">
        <div className="grid gap-3 p-8 bg-white rounded-[3.5rem] border border-slate-100 shadow-xl w-full h-full max-h-[720px]" 
             style={{ 
               gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
               gridTemplateRows: `repeat(${gridSize}, 1fr)`
             }}>
          {words.slice(0, requiredCount).map((word, idx) => {
            const isSelected = selectedIndices.has(idx);
            const isBingo = isBingoCell(idx);
            return (
              <button key={idx} onClick={() => toggleCell(idx)}
                className={`flex items-center justify-center p-2 rounded-2xl border-2 transition-all duration-300 font-black shadow-sm ${isBingo ? 'bg-emerald-500 border-white text-white scale-105' : isSelected ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                <span className="text-xs sm:text-sm md:text-lg uppercase text-center leading-tight break-all font-black px-1">{word}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
