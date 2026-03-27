'use client';

import { useState, useCallback, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, RotateCcw, CheckCircle2, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Printer, Eye, EyeOff } from 'lucide-react';

interface Props {
  onBack: () => void;
}

type GridSize = 10 | 20 | 30;
type Difficulty = 'easy' | 'medium' | 'hard';
type Phase = 'setup' | 'playing';

interface PlacedWord {
  word: string;
  positions: [number, number][];
  found: boolean;
}

interface Cell {
  letter: string;
  wordIndices: number[];
}

const DIRECTIONS_EASY: [number, number][] = [[0, 1]];
const DIRECTIONS_MEDIUM: [number, number][] = [[0, 1], [1, 0]];
const DIRECTIONS_HARD: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function buildGrid(size: number, words: string[], difficulty: Difficulty): { grid: Cell[][], placed: PlacedWord[] } {
  const grid: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ letter: '', wordIndices: [] }))
  );

  const dirs = difficulty === 'easy' ? DIRECTIONS_EASY : difficulty === 'medium' ? DIRECTIONS_MEDIUM : DIRECTIONS_HARD;
  const placed: PlacedWord[] = [];

  const validWords = words
    .map(w => w.toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(w => w.length >= 2 && w.length <= size)
    .slice(0, difficulty === 'easy' ? 8 : difficulty === 'medium' ? 14 : 20);

  for (const word of validWords) {
    let success = false;
    for (let attempt = 0; attempt < 200; attempt++) {
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      const positions: [number, number][] = [];
      let fits = true;

      for (let i = 0; i < word.length; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) { fits = false; break; }
        const existing = grid[nr][nc].letter;
        if (existing && existing !== word[i]) { fits = false; break; }
        positions.push([nr, nc]);
      }

      if (fits) {
        const wordIdx = placed.length;
        for (let i = 0; i < word.length; i++) {
          const [nr, nc] = positions[i];
          grid[nr][nc].letter = word[i];
          grid[nr][nc].wordIndices.push(wordIdx);
        }
        placed.push({ word, positions, found: false });
        success = true;
        break;
      }
    }
    if (!success) {
      // Try to place but skip if cannot fit
    }
  }

  // Fill remaining cells with random letters
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c].letter) {
        grid[r][c].letter = ALPHABET[Math.floor(Math.random() * 26)];
      }
    }
  }

  return { grid, placed };
}

interface ExcelStatus {
  type: 'idle' | 'checking' | 'ok' | 'error';
  message: string;
  details: string[];
}

export function WordSearch({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [gridSize, setGridSize] = useState<GridSize>(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [wordInput, setWordInput] = useState('');
  const [wordList, setWordList] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [placed, setPlaced] = useState<PlacedWord[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<[number, number][]>([]);
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [successMsg, setSuccessMsg] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [excelStatus, setExcelStatus] = useState<ExcelStatus>({ type: 'idle', message: '', details: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const handlePrint = () => {
    const el = document.getElementById('word-search-print');
    if (el) el.style.display = 'block';
    window.print();
    if (el) el.style.display = 'none';
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelStatus({ type: 'checking', message: '파일을 검사 중입니다...', details: [] });

    const issues: string[] = [];
    const checks: string[] = [];

    try {
      // Check 1: File type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        issues.push('파일 형식이 올바르지 않습니다. (.xlsx, .xls, .csv만 허용)');
      } else {
        checks.push('파일 형식 확인');
      }

      // Check 2: File size
      if (file.size > 5 * 1024 * 1024) {
        issues.push('파일 크기가 5MB를 초과합니다.');
      } else {
        checks.push('파일 크기 확인');
      }

      // Check 3: Parse data
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];

      const rawWords = rows
        .flat()
        .map((v: string) => String(v).trim().toUpperCase().replace(/[^A-Z]/g, ''))
        .filter(Boolean);

      if (rawWords.length === 0) {
        issues.push('파일에서 영어 단어를 찾을 수 없습니다. 셀에 영어 단어를 입력해주세요.');
      } else {
        checks.push(`총 ${rawWords.length}개의 단어 감���`);
      }

      // Check 4: Duplicates
      const uniqueWords = [...new Set(rawWords)];
      const dupCount = rawWords.length - uniqueWords.length;
      if (dupCount > 0) {
        checks.push(`중복 단어 ${dupCount}개 자동 제거됨`);
      } else {
        checks.push('중복 단어 없음');
      }

      // Check 5: Word length vs grid
      const tooLong = uniqueWords.filter(w => w.length > gridSize);
      if (tooLong.length > 0) {
        issues.push(`격자 크기(${gridSize})보다 긴 단어가 ${tooLong.length}개 있습니다: ${tooLong.slice(0, 3).join(', ')}${tooLong.length > 3 ? '...' : ''}`);
      } else {
        checks.push('단어 길이 확인');
      }

      // Check 6: At least 1 valid word
      const validWords = uniqueWords.filter(w => w.length <= gridSize && w.length >= 2);
      if (validWords.length === 0 && issues.length === 0) {
        issues.push('배치 가능한 단어(2자 이상)가 없습니다.');
      } else if (validWords.length > 0) {
        checks.push(`배치 가능한 단어: ${validWords.length}개`);
      }

      await new Promise(r => setTimeout(r, 600));

      if (issues.length > 0) {
        setExcelStatus({ type: 'error', message: '파일에 문제가 있습니다.', details: [...checks.map(c => `✓ ${c}`), ...issues.map(i => `✗ ${i}`)] });
      } else {
        setWordList(validWords);
        setExcelStatus({ type: 'ok', message: `파일 확인 완료! ${validWords.length}개의 단어가 로드되었습니다.`, details: checks.map(c => `✓ ${c}`) });
      }
    } catch {
      setExcelStatus({ type: 'error', message: '파일을 읽는 중 오류가 발생했습니다.', details: ['파일이 손상되었거나 지원하지 않는 형식입니다.'] });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addWord = () => {
    const w = wordInput.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (!w) return;
    if (wordList.includes(w)) { setError('이미 추가된 단어입니다.'); return; }
    if (w.length > gridSize) { setError(`단어는 ${gridSize}자 이하여야 합니다.`); return; }
    setWordList(prev => [...prev, w]);
    setWordInput('');
    setError('');
  };

  const removeWord = (i: number) => setWordList(prev => prev.filter((_, idx) => idx !== i));

  const startGame = () => {
    if (wordList.length === 0) { setError('단어를 최소 1개 이상 입력하세요.'); return; }
    const { grid: newGrid, placed: newPlaced } = buildGrid(gridSize, wordList, difficulty);
    setGrid(newGrid);
    setPlaced(newPlaced);
    setFoundCells(new Set());
    setSelection([]);
    setSelecting(false);
    setSuccessMsg('');
    setPhase('playing');
  };

  const resetGame = () => {
    setPhase('setup');
    setGrid([]);
    setPlaced([]);
    setFoundCells(new Set());
    setSelection([]);
    setSelecting(false);
    setSuccessMsg('');
    setWordList([]);
    setError('');
  };

  const getCellKey = (r: number, c: number) => `${r},${c}`;

  const getSelectionBetween = useCallback((start: [number, number], end: [number, number]): [number, number][] => {
    const [r1, c1] = start;
    const [r2, c2] = end;
    const dr = r2 - r1;
    const dc = c2 - c1;
    const len = Math.max(Math.abs(dr), Math.abs(dc));
    if (len === 0) return [start];
    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
    // Only allow straight lines
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return [start];
    const cells: [number, number][] = [];
    for (let i = 0; i <= len; i++) {
      cells.push([r1 + stepR * i, c1 + stepC * i]);
    }
    return cells;
  }, []);

  const startSelect = (r: number, c: number) => {
    setSelecting(true);
    setSelection([[r, c]]);
  };

  const moveSelect = (r: number, c: number) => {
    if (!selecting || selection.length === 0) return;
    const newSel = getSelectionBetween(selection[0], [r, c]);
    setSelection(newSel);
  };

  const endSelect = () => {
    if (!selecting || selection.length < 2) { setSelecting(false); setSelection([]); return; }
    const selectedWord = selection.map(([r, c]) => grid[r][c].letter).join('');
    const selectedWordRev = selectedWord.split('').reverse().join('');

    let matched = false;
    const newPlaced = placed.map((pw, pwIdx) => {
      if (pw.found) return pw;
      if (pw.word === selectedWord || pw.word === selectedWordRev) {
        // Verify positions match
        const posKeys = new Set(pw.positions.map(([r, c]) => getCellKey(r, c)));
        const selKeys = new Set(selection.map(([r, c]) => getCellKey(r, c)));
        const matches = [...selKeys].every(k => posKeys.has(k)) && selKeys.size === posKeys.size;
        if (matches) {
          matched = true;
          const newFoundCells = new Set(foundCells);
          selection.forEach(([r, c]) => newFoundCells.add(getCellKey(r, c)));
          setFoundCells(newFoundCells);
          setSuccessMsg(`"${pw.word}" 찾았습니다!`);
          setTimeout(() => setSuccessMsg(''), 2000);
          return { ...pw, found: true };
        }
      }
      return pw;
    });

    setPlaced(newPlaced);
    setSelecting(false);
    setSelection([]);
  };

  const isSelected = (r: number, c: number) => selection.some(([sr, sc]) => sr === r && sc === c);
  const isFound = (r: number, c: number) => foundCells.has(getCellKey(r, c));
  const isAnswer = (r: number, c: number) => showAnswer && placed.some(pw => pw.positions.some(([pr, pc]) => pr === r && pc === c));

  const foundCount = placed.filter(p => p.found).length;
  const allFound = placed.length > 0 && foundCount === placed.length;

  const cellPx = gridSize === 10 ? 'w-9 h-9 text-sm' : gridSize === 20 ? 'w-5 h-5 text-[9px]' : 'w-3.5 h-3.5 text-[7px]';

  // === SETUP ===
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-6 py-4">
            <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> 홈으로
            </button>
          </div>
        </header>

        <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-purple-500/20">
              🔍
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>낱말찾기</h1>
            <p className="text-muted-foreground">격자 크기와 난이도를 선택하고 단어를 입력하세요</p>
          </div>

          {/* Grid Size */}
          <div className="bg-card border border-border/40 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">격자 크기</h2>
            <div className="flex gap-3">
              {([10, 20, 30] as GridSize[]).map(s => (
                <button
                  key={s}
                  onClick={() => { setGridSize(s); setWordList([]); setError(''); }}
                  className={`flex-1 py-3 rounded-xl border font-bold text-lg transition-all ${
                    gridSize === s
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                      : 'bg-secondary/30 border-border/40 text-muted-foreground hover:border-purple-500/30'
                  }`}
                  style={{ fontFamily: 'var(--font-fredoka)' }}
                >
                  {s}×{s}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="bg-card border border-border/40 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">난이도</h2>
            <div className="flex gap-3">
              {([
                { id: 'easy', label: '쉬움', desc: '가로만', color: 'emerald' },
                { id: 'medium', label: '중간', desc: '가로+세로', color: 'yellow' },
                { id: 'hard', label: '어려움', desc: '가로+세로+대각선', color: 'red' },
              ] as const).map(d => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`flex-1 py-3 px-2 rounded-xl border transition-all text-center ${
                    difficulty === d.id
                      ? `bg-${d.color}-500/20 border-${d.color}-500/50 text-${d.color}-400`
                      : 'bg-secondary/30 border-border/40 text-muted-foreground hover:border-border/60'
                  }`}
                >
                  <div className="font-bold text-sm">{d.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Excel Upload */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-foreground">엑셀 파일로 단어 불러오기</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              셀에 영어 단어를 입력한 .xlsx / .xls / .csv 파일을 업로드하면 자동으로 단어 목록에 추가됩니다.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={excelStatus.type === 'checking'}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {excelStatus.type === 'checking' ? '검사 중...' : '파일 선택'}
            </button>

            {excelStatus.type !== 'idle' && (
              <div className={`rounded-xl border p-3 space-y-1.5 ${
                excelStatus.type === 'checking' ? 'bg-secondary/30 border-border/40' :
                excelStatus.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30' :
                'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  {excelStatus.type === 'checking' && (
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  {excelStatus.type === 'ok' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  {excelStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                  <p className={`text-xs font-semibold ${
                    excelStatus.type === 'ok' ? 'text-emerald-400' :
                    excelStatus.type === 'error' ? 'text-red-400' :
                    'text-muted-foreground'
                  }`}>{excelStatus.message}</p>
                </div>
                {excelStatus.details.map((d, i) => (
                  <p key={i} className={`text-xs pl-6 ${d.startsWith('✓') ? 'text-muted-foreground' : 'text-red-400'}`}>{d}</p>
                ))}
              </div>
            )}
          </div>

          {/* Words */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">단어 목록 (직접 입력)</h2>
              <span className="text-sm text-muted-foreground">{wordList.length}개</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={wordInput}
                onChange={e => { setWordInput(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && addWord()}
                placeholder={`최대 ${gridSize}자 영어 단어`}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono uppercase text-sm"
              />
              <button
                onClick={addWord}
                className="px-4 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            {wordList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {wordList.map((w, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-secondary/50 border border-border/40 rounded-lg px-2.5 py-1">
                    <span className="text-xs font-mono font-semibold text-foreground">{w}</span>
                    <button onClick={() => removeWord(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={startGame}
            disabled={wordList.length === 0}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-md shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            퍼즐 생성!
          </button>
        </div>
      </div>
    );
  }

  // === PLAYING ===
  return (
    <div className="min-h-screen bg-background flex flex-col select-none">
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> 홈으로
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              <span className="text-purple-400 font-semibold">{foundCount}</span> / {placed.length} 찾음
            </span>
            <button
              onClick={() => setShowAnswer(v => !v)}
              className={`flex items-center gap-1.5 text-sm transition-colors border rounded-lg px-3 py-1.5 print:hidden ${
                showAnswer
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                  : 'bg-secondary/50 border-border/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showAnswer ? '답 숨기기' : '답 보기'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 border border-border/40 rounded-lg px-3 py-1.5 print:hidden"
            >
              <Printer className="w-3.5 h-3.5" /> 인쇄
            </button>
            <button
              onClick={resetGame}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 border border-border/40 rounded-lg px-3 py-1.5 print:hidden"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 처음으로
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 py-5 flex flex-col lg:flex-row gap-5">
        {/* Grid */}
        <div className="flex-1 flex flex-col items-center gap-3">
          {successMsg && (
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl px-5 py-2.5 text-purple-300 font-semibold text-sm animate-slide-up">
              {successMsg}
            </div>
          )}

          {allFound && (
            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-5 py-3 text-center w-full">
              <p className="text-emerald-400 font-bold text-lg" style={{ fontFamily: 'var(--font-fredoka)' }}>
                모든 단어를 찾았습니다!
              </p>
            </div>
          )}

          <div
            ref={containerRef}
            className="bg-card border border-border/40 rounded-2xl p-3 overflow-auto"
            onMouseLeave={endSelect}
          >
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
            >
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const sel = isSelected(r, c);
                  const found = isFound(r, c);
                  return (
                    <button
                      key={`${r}-${c}`}
                      className={`${cellPx} flex items-center justify-center rounded font-bold font-mono transition-colors ${
                        found
                          ? 'bg-purple-500/30 text-purple-200'
                          : sel
                          ? 'bg-yellow-400/30 text-yellow-200'
                          : isAnswer(r, c)
                          ? 'bg-amber-400/25 text-amber-300'
                          : 'text-foreground hover:bg-secondary/50'
                      }`}
                      onMouseDown={() => startSelect(r, c)}
                      onMouseEnter={() => moveSelect(r, c)}
                      onMouseUp={endSelect}
                      onTouchStart={() => startSelect(r, c)}
                      onTouchMove={(e) => {
                        const touch = e.touches[0];
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        if (el) {
                          const rowAttr = el.getAttribute('data-row');
                          const colAttr = el.getAttribute('data-col');
                          if (rowAttr && colAttr) moveSelect(parseInt(rowAttr), parseInt(colAttr));
                        }
                      }}
                      onTouchEnd={endSelect}
                      data-row={r}
                      data-col={c}
                    >
                      {cell.letter}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Word list */}
        <div className="lg:w-52 bg-card border border-border/40 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">찾을 단어</h2>
          <div className="space-y-1.5">
            {placed.map((pw, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-mono font-semibold transition-all ${
                  pw.found
                    ? 'bg-purple-500/10 text-purple-400 line-through opacity-60'
                    : 'bg-secondary/30 text-foreground'
                }`}
              >
                {pw.found && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                {pw.word}
              </div>
            ))}
            {placed.length === 0 && wordList.filter(w => !placed.some(p => p.word === w.toUpperCase())).map((w, i) => (
              <div key={i} className="px-3 py-2 rounded-xl text-sm font-mono font-semibold bg-red-500/10 text-red-400">
                {w} (배치 실패)
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              {difficulty === 'easy' && '가로 방향만'}
              {difficulty === 'medium' && '가로 + 세로'}
              {difficulty === 'hard' && '가로 + 세로 + 대각선'}
            </p>
          </div>
        </div>
      </div>

      {/* Print layout: rendered off-screen, shown only when printing */}
      <div id="word-search-print" className="print:block" style={{ display: 'none' }}>
        {/* Page 1: Question */}
        <div className="print-page">
          <div className="print-title">EiE Game Hub — 낱말찾기</div>
          <div className="print-sub">
            {gridSize}x{gridSize} / {difficulty === 'easy' ? '쉬움 (가로)' : difficulty === 'medium' ? '중간 (가로+세로)' : '어려움 (가로+세로+대각선)'} / 단어 {placed.length}개
          </div>
          <div
            className="print-grid"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, 22px)`, gap: '2px', width: 'fit-content', marginBottom: '16px' }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`pq-${r}-${c}`}
                  style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, border: '1px solid #ddd', fontFamily: 'monospace' }}
                >
                  {cell.letter}
                </div>
              ))
            )}
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '10px 0' }} />
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>찾을 단어 목록</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {placed.map((pw, i) => (
              <span key={i} style={{ border: '1px solid #ccc', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{pw.word}</span>
            ))}
          </div>
        </div>

        {/* Page 2: Answer */}
        <div className="print-page" style={{ pageBreakBefore: 'always' }}>
          <div className="print-title">EiE Game Hub — 낱말찾기 (정답)</div>
          <div className="print-sub">
            {gridSize}x{gridSize} / {difficulty === 'easy' ? '쉬움 (가로)' : difficulty === 'medium' ? '중간 (가로+세로)' : '어려움 (가로+세로+대각선)'} / 노란색 = 단어 위치
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, 22px)`, gap: '2px', width: 'fit-content', marginBottom: '16px' }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const isAns = placed.some(pw => pw.positions.some(([pr, pc]) => pr === r && pc === c));
                return (
                  <div
                    key={`pa-${r}-${c}`}
                    style={{
                      width: 22, height: 22,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      border: isAns ? '1px solid #f59e0b' : '1px solid #ddd',
                      background: isAns ? '#fef3c7' : 'transparent',
                      color: isAns ? '#92400e' : 'inherit',
                      fontFamily: 'monospace',
                    }}
                  >
                    {cell.letter}
                  </div>
                );
              })
            )}
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '10px 0' }} />
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>단어 목록</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {placed.map((pw, i) => (
              <span key={i} style={{ border: '1px solid #ccc', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{pw.word}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
