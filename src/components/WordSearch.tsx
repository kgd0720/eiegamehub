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
        XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { header: 1 }).forEach(row => {
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

  const isReady = words.length > 0 && (matchMode === 'team' ? teams.length >= 2 : teams.length >= 1);

  const handlePrint = () => {
    window.print();
  };

  if (gameState === 'setup') {
    return (
      <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1 no-print">
        <div className="flex items-center justify-between mb-1 bg-white border border-slate-200 rounded-xl px-4 py-1.5 shadow-sm shrink-0">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center text-xl shadow-lg text-white">🔍</div>
              <h1 className="text-lg font-[1000] italic uppercase tracking-tighter text-slate-900 border-l-4 border-purple-500 pl-2.5 leading-none">WORD SEARCH SETTING</h1>
           </div>
           <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-100 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest leading-none">HIGH DENSITY SETUP</span>
           </div>
        </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch flex-1 overflow-y-auto lg:overflow-hidden custom-scrollbar-light pb-5 lg:pb-0 min-h-0">
           <div className="col-span-1 lg:col-span-8 flex flex-col gap-2.5 overflow-visible lg:overflow-hidden min-h-0 text-center">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 shrink-0">
                  <div className="lg:col-span-3 bg-white border border-slate-200 rounded-[1.2rem] px-5 py-2 shadow-sm flex items-center justify-between">
                    <label className="text-[10px] font-[1000] text-rose-800 uppercase tracking-widest shrink-0">대전 모드</label>
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 min-w-[120px]">
                      <button onClick={() => setMatchMode('single')}
                        className={`flex-1 py-1.5 rounded-lg font-[1000] text-[9px] transition-all ${matchMode === 'single' ? 'bg-yellow-400 text-yellow-900 shadow-md border border-yellow-500' : 'text-slate-300 hover:text-slate-500'}`}>
                        개인전
                      </button>
                      <button onClick={() => setMatchMode('team')}
                        className={`flex-1 py-1.5 rounded-lg font-[1000] text-[9px] transition-all ${matchMode === 'team' ? 'bg-yellow-400 text-yellow-900 shadow-md border border-yellow-500' : 'text-slate-300 hover:text-slate-500'}`}>
                        단체전
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-3 bg-white border border-slate-200 rounded-[1.2rem] px-5 py-2 shadow-sm flex items-center justify-between">
                    <label className="text-[10px] font-[1000] text-rose-800 uppercase tracking-widest shrink-0">찾을 단어 수</label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-1 min-w-[120px] shadow-inner">
                      <button onClick={() => setMaxWordsToFind(Math.max(1, maxWordsToFind - 1))} className="w-7 h-7 rounded-sm bg-white border border-slate-200 font-black text-sm shadow-sm">－</button>
                      <span className="flex-1 text-center text-lg font-[1000] italic text-purple-500 leading-none">{maxWordsToFind}</span>
                      <button onClick={() => setMaxWordsToFind(Math.min(10, maxWordsToFind + 1))} className="w-7 h-7 rounded-sm bg-white border border-slate-200 font-black text-sm shadow-sm">＋</button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-[1.2rem] p-4 shadow-sm lg:col-span-6">
                    <label className="text-[9px] font-[1000] text-rose-800 uppercase tracking-widest mb-1.5 block font-black">격자 차원 (GRID SIZE)</label>
                    <div className="grid grid-cols-6 gap-1">
                      {[5, 10, 15, 20, 25, 30].map(sz => (
                        <button key={sz} onClick={() => setGridSize(sz)}
                          className={`py-1.5 rounded-lg text-base font-[1000] border-2 transition-all ${gridSize === sz ? 'bg-purple-500 border-purple-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-hidden min-h-0">
                 <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-sm min-h-0 flex flex-col">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                       <h2 className="text-lg font-[1000] italic uppercase tracking-widest text-slate-900 border-l-4 border-purple-500 pl-3 leading-none text-left">{matchMode === "team" ? "단체전 명단" : "참가자 이름"}</h2>
                       <button onClick={() => setTeams([])} className="px-3 py-1 bg-rose-50 text-rose-500 border border-rose-100 rounded-lg text-[9px] font-black uppercase shadow-sm">✕ 초기화</button>
                    </div>
                     <div className="flex gap-2 mb-3 shrink-0">
                        <input value={newTeam} onChange={e => setNewTeam(e.target.value)} 
                           onKeyDown={e => { if(e.key === 'Enter') { if(newTeam.trim()) setTeams([...teams, newTeam.trim()]); setNewTeam(''); } }}
                           placeholder={matchMode === "team" ? "팀 이름..." : "참가자 이름..."} className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-purple-500 font-black text-sm shadow-inner" />
                        <button onClick={() => { if(newTeam.trim()) setTeams([...teams, newTeam.trim()]); setNewTeam(''); }} className="px-5 rounded-xl bg-purple-500 text-white font-black text-lg shadow-lg active:scale-95 transition-all outline-none flex-shrink-0">+</button>
                     </div>
                    <div className="h-[160px] overflow-y-auto bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex flex-wrap content-start gap-1.5 custom-scrollbar-light shadow-inner">
                       {teams.map((t, i) => (
                          <div key={i} className="h-8 rounded-lg border bg-white border-slate-200 text-slate-700 px-3 flex items-center gap-2 font-black text-[11px] shadow-sm group">
                             <span className="text-purple-500/30 italic">#{matchMode === "team" ? "T" : "P"}{i+1}</span> {t}
                             <button onClick={() => setTeams(teams.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-rose-500 ml-1 text-lg leading-none">✕</button>
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-sm min-h-0 flex flex-col">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                       <h2 className="text-lg font-[1000] italic uppercase tracking-widest text-slate-900 border-l-4 border-emerald-500 pl-3 leading-none text-left">등록 단어 목록</h2>
                       <button onClick={() => setWords([])} className="px-3 py-1 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-lg text-[9px] font-black uppercase shadow-sm">✕ 초기화</button>
                    </div>
                     <div className="flex gap-2 mb-3 shrink-0">
                        <input value={newWord} onChange={e => setNewWord(e.target.value.toUpperCase())} 
                           onKeyDown={e => { if(e.key === 'Enter') { if(newWord.trim()) setWords([...words, newWord.trim()]); setNewWord(''); } }}
                           placeholder="단어 입력..." className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-black text-sm shadow-inner" />
                        <button onClick={() => { if(newWord.trim()) setWords([...words, newWord.trim()]); setNewWord(''); }} className="px-5 rounded-xl bg-emerald-500 text-white font-black text-lg shadow-lg active:scale-95 transition-all outline-none flex-shrink-0">+</button>
                     </div>
                    <div className="h-[200px] overflow-y-auto bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex flex-wrap content-start gap-1.5 custom-scrollbar-light shadow-inner">
                       {words.map((w, i) => (
                          <div key={i} className="h-8 rounded-lg border bg-white border-slate-200 text-slate-700 px-3 flex items-center gap-2 font-black text-[11px] shadow-sm group">
                             <span className="text-emerald-500/30 italic">#W{i+1}</span> {w}
                             <button onClick={() => setWords(words.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-rose-500 ml-1 text-lg leading-none">✕</button>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           <div className="col-span-1 lg:col-span-4 bg-white border border-slate-200 rounded-[2rem] p-4 shadow-sm flex flex-col h-full items-center text-center overflow-hidden">
                <div className="flex items-center gap-5 mb-3 w-full px-2">
                   <div className="w-14 h-14 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-center shrink-0 shadow-lg relative">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-3xl shadow-xl text-white">🔍</div>
                   </div>
                   <div className="text-left flex-1">
                      <h2 className={`text-2xl font-[1000] tracking-tighter italic transition-colors leading-none mb-1.5 ${isReady ? 'text-purple-500' : 'text-slate-200'}`}>
                         {isReady ? '준비완료' : '준비중'}
                      </h2>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Status Report</p>
                   </div>
                </div>

                <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 mb-3 text-left shadow-inner font-black">
                   <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400 text-[9px] uppercase tracking-widest font-sans">격자 차원</span>
                      <span className="text-slate-900 text-lg italic leading-none">{gridSize} x {gridSize}</span>
                   </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                       <span className="text-slate-400 text-[9px] uppercase tracking-widest font-sans">찾을 문항</span>
                       <span className="text-purple-600 text-lg leading-none">{maxWordsToFind} Q</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                       <span className="text-slate-400 text-[9px] uppercase tracking-widest font-sans underline decoration-purple-200">등록 단어</span>
                       <span className="text-slate-600 text-base italic leading-none">{words.length} Words</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-slate-400 text-[9px] uppercase tracking-widest font-sans">참가 정보</span>
                       <span className={`text-base italic leading-none ${teams.length > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{teams.length} Teams</span>
                    </div>
                </div>

                 <div className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] p-4 mb-auto text-left shadow-inner shrink-0">
                    <h3 className="text-[10px] font-[1000] text-purple-600 uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                       <span className="w-1.5 h-3 bg-purple-500 rounded-sm" /> MISSION GUIDE
                    </h3>
                    <div className="space-y-2.5">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">게임소개</p>
                          <p className="text-[11px] font-bold text-slate-600 leading-tight">진행자 엑셀파일로 등록한 낱말을 지정된 개수에 맞게 찾는 게임</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">진행방법</p>
                          <p className="text-[11px] font-bold text-slate-600 leading-tight">설정(모드, 문항수, 격자차원) 후 엑셀 파일을 업로드하고 게임 시작</p>
                       </div>
                    </div>
                 </div>

                <div className="w-full mb-1.5 mt-2 shrink-0">
                    <button onClick={handleDownloadTemplate} className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg mb-1.5">📥 엑셀 양식 다운로드</button>
                    <button onClick={() => fileRef.current?.click()} className="w-full py-4 bg-slate-900 text-white rounded-[1.2rem] text-lg font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">
                       <span className="text-lg">📂</span> 엑셀 업로드
                    </button>
                </div>

                <button onClick={() => generateGrid()} disabled={!isReady}
                  className={`w-full py-3.5 mt-1 rounded-[1.2rem] font-[1000] text-xl transition-all shadow-2xl shrink-0 ${isReady ? 'bg-purple-500 text-white hover:scale-105 active:scale-95 shadow-purple-500/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                  {isReady ? 'START MISSION' : '설정을 완료해 주세요'}
                </button>
             </div>
           </div>
         <input type="file" ref={fileRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleExcel} />
       </div>
    );
  }

  if (gameState === 'done') {
     return (
        <div className="fixed inset-0 z-50 bg-[#120614]/95 flex items-center justify-center p-4 backdrop-blur-3xl">
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
    <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col animate-in fade-in py-1 font-sans text-slate-900 overflow-hidden no-print">
       <div className="flex items-center justify-between mb-1.5 bg-white border border-slate-200 rounded-2xl px-6 py-2 shadow-sm min-h-[60px] shrink-0">
          <div className="flex items-center gap-2 lg:gap-3">
             <button onClick={() => setGameState('setup')} 
               className="min-w-[100px] h-[40px] flex items-center justify-center rounded-[0.8rem] bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border border-slate-200 hover:text-rose-500 hover:border-rose-100 transition-all leading-none">← EXIT</button>
             <button onClick={() => setShowAnswer(!showAnswer)} 
               className={`min-w-[120px] h-[40px] flex items-center justify-center rounded-[0.8rem] text-[10px] font-black uppercase tracking-widest transition-all border ${showAnswer ? 'bg-rose-500 border-rose-400 text-white' : 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'} leading-none`}>
                {showAnswer ? '🙈 숨기기' : '👁️ 정답 확인'}
             </button>
             <button onClick={handlePrint} 
               className="min-w-[100px] h-[40px] flex items-center justify-center rounded-[0.8rem] bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 transition-all leading-none gap-2">
                🖨️ 출력
             </button>
          </div>
           <div className="text-center flex flex-col">
              <h1 className="text-xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-1">낱말찾기</h1>
              <h2 className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.3em] leading-none opacity-80">{teams[currentTeamIdx]} MISSION</h2>
           </div>
          <div className="flex items-center gap-4 border-l-2 border-slate-100 pl-6 h-full">
             <div className="text-right">
                <div className="text-2xl font-mono font-black text-rose-500 leading-none">{foundWords.length} / {placedObjects.length}</div>
                <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1 italic leading-none">MISSION PROGRESS</div>
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
                 <span className="text-purple-400 text-[10px] font-black">{placedObjects.length} WORDS</span>
              </div>
              <div className="flex-1 overflow-y-auto content-start px-1 pr-1 pb-1 custom-scrollbar-dark flex flex-col gap-2">
                {placedObjects.map((obj, i) => (
                   <div key={i} onClick={() => { if(!foundWords.includes(obj.word)) { const nf = [...foundWords, obj.word]; setFoundWords(nf); if(nf.length === placedObjects.length) setGameState('done'); } }}
                     className={`flex items-center justify-between px-5 py-3 rounded-xl border transition-all cursor-pointer min-h-[48px] ${foundWords.includes(obj.word) ? 'bg-emerald-500 border-emerald-400 text-white opacity-40 scale-[0.98]' : 'bg-white/5 border-white/10 text-white shadow-lg hover:bg-white/10 hover:border-purple-500 hover:scale-[1.02]'}`}>
                      <span className="text-xl font-[1000] italic tracking-tight uppercase leading-none truncate pr-2">{obj.word}</span>
                       {foundWords.includes(obj.word) ? <span className="text-lg">✓</span> : <span className="text-purple-500 text-[10px] font-black italic uppercase leading-none shrink-0">목표</span>}
                   </div>
                ))}
              </div>
           </div>
       </div>
    </div>
    
    {/* Print View Style */}
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        .no-print { display: none !important; }
        body, html { visibility: hidden; height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; }
        .print-only { visibility: visible; display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
        .print-only * { visibility: visible; }
        
        /* Reset all parent overflows for printing */
        * { overflow: visible !important; }
        
        .page-break { 
           display: block;
           page-break-after: always !important; 
           break-after: page !important;
           width: 100%;
        }
        
        .print-container {
           width: 100%;
           height: auto;
           min-height: 280mm;
           display: flex;
           flex-direction: column;
           align-items: center;
           page-break-inside: avoid !important;
           margin: 0;
           padding: 10mm;
           box-sizing: border-box;
         }

        .print-header {
           width: 100%;
           text-align: center;
           margin-bottom: 20px;
           border-bottom: 8px solid black;
           padding-bottom: 15px;
        }

             .print-grid { 
           display: grid;
           border: 6px solid black;
           border-radius: 0;
           width: 160mm !important;
           height: 160mm !important;
           margin-bottom: 30px !important;
           background: white !important;
           padding: 20px;
        }

        .print-cell {
           border: 1px solid black;
           display: flex;
           align-items: center;
           justify-content: center;
           font-weight: 900;
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
           background-color: #fde047 !important;
           color: #000 !important;
           font-weight: 1000;
           border: 1.5px solid #000 !important;
           z-index: 10;
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
             <p className="text-[10px] text-rose-500 font-bold uppercase tracking-[0.4em] mt-2 opacity-70">Mission Module</p>
          </div>
          <p className="text-lg font-black uppercase tracking-[0.4em] mt-2 bg-black text-white inline-block px-5 py-1 rounded-lg italic">Mission: {teams[currentTeamIdx]}</p>
          <div className="block text-[8px] font-black mt-1 opacity-30 tracking-[0.8em]">GRID: {gridSize}x{gridSize} | {placedObjects.length} WORDS</div>
        </div>
        
        <div className="print-grid" style={{ 
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`, 
          gridTemplateRows: `repeat(${gridSize}, 1fr)` 
        }}>
          {grid.map((row, r) => row.map((cell, c) => (
            <div key={`${r}-${c}`} className="print-cell" style={{ 
              fontSize: `calc(140mm / ${gridSize} * 0.75)`
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
              <div key={i} className="text-[11px] font-[1000] uppercase italic border-b border-slate-100 py-0.5 flex items-center gap-1">
                <span className="text-slate-400 text-[8px] shrink-0">[{String(i+1).padStart(2,'0')}]</span>
                <span className="truncate">{obj.word}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between items-center opacity-30 border-t border-black/10 pt-2">
            <p className="text-[8px] font-black uppercase tracking-[0.4em]">EiE Premium English Academy</p>
            <p className="text-[8px] font-black uppercase">Mission Pass Score: ALL</p>
          </div>
        </div>
      </div>

      {/* Page 2: Answer Key */}
      <div className="print-container p-4" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
        <div className="print-header border-yellow-500 mb-6 relative">
          <div className="absolute top-0 right-0 bg-yellow-500 text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-bl-xl shadow-sm">TEACHER'S COPY</div>
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
               <div key={`${r}-${c}`} className={`print-cell ${isAnswer ? '' : 'text-slate-50 opacity-10'}`} style={{ 
                 fontSize: `calc(140mm / ${gridSize} * 0.75)`,
                 backgroundColor: isAnswer ? printColors[wordIdx % printColors.length] : 'transparent',
                 color: isAnswer ? '#000' : ''
               }}>
                  {cell}
               </div>
            );
          }))}
        </div>

        <div className="w-full mt-2">
          <div className="bg-yellow-50/50 p-4 rounded-3xl border-2 border-yellow-100">
            <h3 className="text-sm font-black text-yellow-700 mb-3 uppercase tracking-[0.2em] italic leading-none border-b border-yellow-200 pb-1.5">Verified Results ({placedObjects.length} Words)</h3>
            <div className="grid grid-cols-5 gap-x-6 gap-y-1">
              {placedObjects.map((obj, i) => (
                <div key={i} className="flex justify-between items-center font-[1000] italic border-b border-yellow-100/50 pb-0.5">
                  <span className="text-yellow-600/50 text-[8px] uppercase">{String(i+1).padStart(2,'0')}</span>
                  <span className="text-[10px] text-slate-800 uppercase truncate ml-1">{obj.word}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-center opacity-20">
          <p className="text-[8px] font-black uppercase tracking-[0.8em]">EiE Premium Academy</p>
        </div>
      </div>
    </div>
    </>
  );
}
