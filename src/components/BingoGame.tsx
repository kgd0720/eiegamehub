import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function BingoGame() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'done'>('setup');
  const [gridSize, setGridSize] = useState<number>(4);
  const [words, setWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [targetBingo, setTargetBingo] = useState<number>(3);
  const [matchMode, setMatchMode] = useState<'single' | 'team'>('team');
  const [teams, setTeams] = useState<string[]>([]);
  const [newTeam, setNewTeam] = useState('');
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [bingoLines, setBingoLines] = useState<number[][]>([]);
  const [completedBingos, setCompletedBingos] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const requiredCount = gridSize * gridSize;
  const isReady = words.length >= requiredCount && (matchMode === 'team' ? teams.length >= 2 : teams.length >= 1);

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
        const sorted = imported.sort(() => Math.random() - 0.5); setWords(sorted); if (sorted.length >= requiredCount && (matchMode === "team" ? teams.length >= 2 : teams.length >= 1)) { beginGame(); }
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

  if (gameState === 'setup') {
    return (
      <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1">
        {/* Header - Compact */}
        <div className="flex items-center justify-between mb-2 bg-white border border-slate-200 rounded-2xl px-6 py-2 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-2xl shadow-lg text-white">🎯</div>
              <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-900 border-l-4 border-emerald-500 pl-3 leading-none">빙고게임 설정</h1>
           </div>
           <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">LIVE ACTIVE</span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch flex-1 overflow-y-auto lg:overflow-hidden custom-scrollbar-light pb-10 lg:pb-0">
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-3 overflow-visible lg:overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
               
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
               
                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm col-span-1 flex flex-col justify-center gap-3">
                  <label className="text-[11px] font-[1000] text-rose-800 uppercase tracking-widest block text-center">대전 모드 설정</label>
                  <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    <button onClick={() => setMatchMode('single')}
                      className={`flex-1 py-4 rounded-xl font-[1000] text-xs transition-all ${matchMode === 'single' ? 'bg-yellow-400 text-yellow-900 shadow-md border border-yellow-500' : 'text-slate-300 hover:text-slate-500'}`}>
                      개인전
                    </button>
                    <button onClick={() => setMatchMode('team')}
                      className={`flex-1 py-4 rounded-xl font-[1000] text-xs transition-all ${matchMode === 'team' ? 'bg-yellow-400 text-yellow-900 shadow-md border border-yellow-500' : 'text-slate-300 hover:text-slate-500'}`}>
                      단체전
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm flex flex-col justify-center gap-3">
                   <div className="flex justify-between items-center px-1">
                      <label className="text-[11px] font-[1000] text-rose-800 uppercase tracking-widest">빙고판 크기 (SIZE)</label>
                      <span className="text-xl font-black text-emerald-600 italic tracking-tighter leading-none">{gridSize}×{gridSize}</span>
                   </div>
                   <div className="flex gap-2">
                     {[3, 4, 5, 6].map(size => (
                       <button key={size} onClick={() => { setGridSize(size); setTargetBingo(Math.min(targetBingo, size)); }}
                         className={`flex-1 py-3.5 rounded-xl text-xl font-[1000] border-2 transition-all ${gridSize === size ? 'bg-purple-500 border-purple-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                         {size}
                       </button>
                     ))}
                   </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm flex flex-col justify-center gap-3">
                   <div className="flex justify-between items-center px-1">
                      <label className="text-[11px] font-[1000] text-rose-800 uppercase tracking-widest">목표 빙고 (GOAL)</label>
                      <span className="text-xl font-black text-emerald-600 italic tracking-tighter leading-none">{targetBingo} LINES</span>
                   </div>
                   <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100 shadow-inner max-h-[64px] overflow-y-auto custom-scrollbar-light">
                     {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                       <button key={n} onClick={() => setTargetBingo(n)}
                         className={`flex-1 min-w-[32px] py-2 rounded-lg border text-sm font-black transition-all ${targetBingo === n ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-200 hover:text-slate-400'}`}>
                         {n}
                       </button>
                     ))}
                   </div>
                </div>
            </div>
            </div>


            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col flex-1 overflow-hidden">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-[1000] italic uppercase tracking-widest text-slate-900 border-l-4 border-emerald-500 pl-4 leading-none">{matchMode === 'team' ? '단체전 명단 (최소 2팀)' : '참가자 이름'}</h2>
                  <button onClick={() => setTeams([])} className="px-4 py-2 bg-rose-50 text-rose-500 border border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm leading-none">✕ 목록 초기화</button>
               </div>
               <div className="flex gap-2 mb-4">
                  <input type="text" value={newTeam} onChange={e => setNewTeam(e.target.value)}
                    placeholder={matchMode === 'team' ? "참가 팀 이름 입력..." : "참가자 이름 입력..."} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTeam())}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-2.5 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-emerald-500 font-black text-lg shadow-inner" />
                  <button onClick={() => handleAddTeam()}
                    className="px-6 rounded-xl bg-emerald-500 text-white font-black text-lg shadow-lg active:scale-95 transition-all outline-none">+</button>
               </div>
               <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-wrap content-start gap-2 custom-scrollbar-light shadow-inner overflow-hidden">
                  {teams.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                       <p className="text-lg font-black uppercase tracking-widest italic">{matchMode === 'team' ? "No teams pool" : "No players pool"}</p>
                    </div>
                  ) : (
                    teams.map((t, idx) => (
                      <div key={idx} className="h-10 rounded-xl border-2 bg-white border-slate-200 text-slate-700 px-4 flex items-center gap-3 font-black text-base shadow-sm group hover:border-emerald-500 transition-all">
                         <span className="text-emerald-500/40 italic">#{matchMode === 'team' ? 'T' : 'P'}{idx + 1}</span> {t}
                         <button onClick={() => setTeams(teams.filter((_, i) => i !== idx))} className="text-slate-200 hover:text-rose-500 ml-1 text-xl">✕</button>
                      </div>
                    ))
                  )}
               </div>
            </div>
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col flex-1 overflow-hidden">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-[1000] italic uppercase tracking-widest text-slate-900 border-l-4 border-emerald-500 pl-4 leading-none underline decoration-emerald-500/20 underline-offset-8">단어 목록</h2>
                  <button onClick={() => setWords([])} className="px-4 py-2 bg-rose-50 text-rose-500 border border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">✕ 목록 초기화</button>
               </div>
               
               <div className="flex gap-2 mb-4">
                  <input type="text" value={newWord} onChange={e => setNewWord(e.target.value)}
                     placeholder="빙고판에 넣을 단어 입력..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddWord())}
                     className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-2 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-emerald-500 font-black text-lg shadow-inner" />
                  <button onClick={() => handleAddWord()}
                     className="px-6 rounded-xl bg-emerald-500 text-white font-black text-lg shadow-lg active:scale-95 transition-all">추가</button>
               </div>
               
               <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-4 custom-scrollbar-light">
                  <div className="flex flex-wrap content-start gap-2">
                     {words.map((w, idx) => (
                        <div key={idx} className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 transition-all">
                           <span className="text-base font-black text-slate-700">{w}</span>
                           <button onClick={() => handleRemoveWord(idx)} className="text-slate-300 hover:text-rose-500 transition-colors text-lg">✕</button>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-4 flex flex-col gap-3 overflow-visible lg:overflow-hidden">
             <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-full items-center text-center overflow-hidden">
                <div className="w-20 h-20 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mb-4 shrink-0 relative">
                   <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center text-3xl shadow-xl text-white">🎯</div>
                   {isReady && <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-4 border-white animate-bounce shadow-md" />}
                </div>

                <div className="mb-4">
                   <h2 className={`text-3xl font-[1000] tracking-tighter italic transition-colors ${isReady ? 'text-emerald-500' : 'text-slate-200'}`}>
                      {isReady ? '준비완료' : '준비중'}
                   </h2>
                </div>

                <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-3 mb-3 text-left shadow-inner">
                   <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">판 크기</span>
                      <span className="text-slate-900 font-black text-lg italic">{gridSize}×{gridSize}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">목표 빙고</span>
                      <span className="text-slate-900 font-black text-lg italic">{targetBingo} LINES</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">등록 단어</span>
                      <span className={`font-black text-lg ${isReady ? 'text-emerald-500' : 'text-slate-300'}`}>
                         {words.length} <span className="text-slate-200 text-xs">/ {requiredCount}</span>
                      </span>
                   </div>
                </div>

                 <div className="w-full bg-emerald-50 rounded-2xl p-5 border border-emerald-100 space-y-2 mb-4 text-left shadow-inner">
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] italic mb-1">GAME GUIDE</h3>
                    <ul className="space-y-1.5 text-xs font-bold text-slate-500 leading-tight">
                       <li className="flex gap-2 items-start"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" /> 단어 체크 및 빙고 완성</li>
                       <li className="flex gap-2 items-start"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" /> 목표치 도달 시 즉시 승리</li>
                    </ul>
                 </div>

                 <div className="w-full mb-2">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-slate-900 text-white rounded-3xl text-xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">
                       <span className="text-xl">📂</span> 엑셀 파일 업로드
                    </button>
                 </div>

                <button onClick={() => beginGame()} disabled={!isReady}
                   className={`w-full py-4 rounded-3xl font-[1000] text-2xl transition-all shadow-2xl ${isReady ? 'bg-emerald-500 text-white hover:scale-105 active:scale-95 shadow-emerald-500/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                   {isReady ? '게임 시작' : '단어를 채워주세요'}
                </button>
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
