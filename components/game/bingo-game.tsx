'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, RotateCcw, CheckCircle2, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  onBack: () => void;
}

type Phase = 'setup' | 'fill' | 'playing';
type GridSize = 4 | 5 | 6;

interface Cell {
  word: string;
  called: boolean;
}

interface ExcelStatus {
  type: 'idle' | 'checking' | 'ok' | 'error';
  message: string;
  details: string[];
}

export function BingoGame({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [gridSize, setGridSize] = useState<GridSize>(5);
  const [wordInput, setWordInput] = useState('');
  const [wordList, setWordList] = useState<string[]>([]);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [bingoCount, setBingoCount] = useState(0);
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [excelStatus, setExcelStatus] = useState<ExcelStatus>({ type: 'idle', message: '', details: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .map((v: string) => String(v).trim().toUpperCase().replace(/[^A-Z가-힣]/g, ''))
        .filter(Boolean);

      if (rawWords.length === 0) {
        issues.push('파일에서 단어를 찾을 수 없습니다.');
      } else {
        checks.push(`총 ${rawWords.length}개의 단어 감지`);
      }

      // Check 4: Duplicates
      const uniqueWords = [...new Set(rawWords)];
      const dupCount = rawWords.length - uniqueWords.length;
      if (dupCount > 0) {
        checks.push(`중복 단어 ${dupCount}개 자동 제거됨`);
      } else {
        checks.push('중복 단어 없음');
      }

      // Check 5: Word count vs grid
      const needed = gridSize * gridSize;
      if (uniqueWords.length < needed) {
        issues.push(`단어가 부족합니다. ${gridSize}×${gridSize} 빙고는 ${needed}개가 필요합니다. (현재 ${uniqueWords.length}개)`);
      } else {
        checks.push(`단어 수 적합 (${uniqueWords.length}개 / 필요 ${needed}개)`);
      }

      await new Promise(r => setTimeout(r, 600));

      if (issues.length > 0) {
        setExcelStatus({ type: 'error', message: '파일에 문제가 있습니다.', details: [...checks.map(c => `✓ ${c}`), ...issues.map(i => `✗ ${i}`)] });
      } else {
        setWordList(uniqueWords.slice(0, needed));
        setExcelStatus({ type: 'ok', message: `파일 확인 완료! ${Math.min(uniqueWords.length, needed)}개의 단어가 로드되었습니다.`, details: checks.map(c => `✓ ${c}`) });
      }
    } catch {
      setExcelStatus({ type: 'error', message: '파일을 읽는 중 오류가 발생했습니다.', details: ['파일이 손상되었거나 지원하지 않는 형식입니다.'] });
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalCells = gridSize * gridSize;

  const addWord = () => {
    const w = wordInput.trim().toUpperCase();
    if (!w) return;
    if (wordList.includes(w)) {
      setError('이미 추가된 단어입니다.');
      return;
    }
    if (wordList.length >= totalCells) {
      setError(`최대 ${totalCells}개 단어를 입력할 수 있습니다.`);
      return;
    }
    setWordList(prev => [...prev, w]);
    setWordInput('');
    setError('');
  };

  const removeWord = (index: number) => {
    setWordList(prev => prev.filter((_, i) => i !== index));
    setError('');
  };

  const buildGrid = () => {
    if (wordList.length < totalCells) {
      setError(`${totalCells}개의 단어가 모두 필요합니다. (현재 ${wordList.length}개)`);
      return;
    }
    // Shuffle words into the grid
    const shuffled = [...wordList].sort(() => Math.random() - 0.5).slice(0, totalCells);
    const newGrid: Cell[][] = [];
    for (let r = 0; r < gridSize; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < gridSize; c++) {
        row.push({ word: shuffled[r * gridSize + c], called: false });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    setCompletedLines([]);
    setBingoCount(0);
    setPhase('playing');
  };

  const checkBingo = (newGrid: Cell[][]) => {
    const lines: string[] = [];

    // Check rows
    for (let r = 0; r < gridSize; r++) {
      const key = `row-${r}`;
      if (newGrid[r].every(c => c.called) && !completedLines.includes(key)) {
        lines.push(key);
      }
    }
    // Check columns
    for (let c = 0; c < gridSize; c++) {
      const key = `col-${c}`;
      if (newGrid.every(row => row[c].called) && !completedLines.includes(key)) {
        lines.push(key);
      }
    }
    // Check diagonals
    const diagKey1 = 'diag-1';
    if (newGrid.every((row, i) => row[i].called) && !completedLines.includes(diagKey1)) {
      lines.push(diagKey1);
    }
    const diagKey2 = 'diag-2';
    if (newGrid.every((row, i) => row[gridSize - 1 - i].called) && !completedLines.includes(diagKey2)) {
      lines.push(diagKey2);
    }

    return lines;
  };

  const toggleCell = (r: number, c: number) => {
    const newGrid = grid.map((row, ri) =>
      row.map((cell, ci) =>
        ri === r && ci === c ? { ...cell, called: !cell.called } : cell
      )
    );
    setGrid(newGrid);

    const newLines = checkBingo(newGrid);
    if (newLines.length > 0) {
      const allCompleted = [...completedLines, ...newLines];
      setCompletedLines(allCompleted);
      setBingoCount(allCompleted.length);
    }
  };

  const isCellInBingo = (r: number, c: number): boolean => {
    for (const line of completedLines) {
      if (line === `row-${r}`) return true;
      if (line === `col-${c}`) return true;
      if (line === 'diag-1' && r === c) return true;
      if (line === 'diag-2' && r + c === gridSize - 1) return true;
    }
    return false;
  };

  const resetGame = () => {
    setPhase('setup');
    setWordList([]);
    setWordInput('');
    setGrid([]);
    setError('');
    setBingoCount(0);
    setCompletedLines([]);
    setGridSize(5);
  };

  const cellSize = gridSize === 4 ? 'h-16 text-sm' : gridSize === 5 ? 'h-14 text-xs' : 'h-12 text-xs';

  // === SETUP PHASE ===
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> 홈으로
            </button>
          </div>
        </header>

        <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              🎯
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>빙고게임</h1>
            <p className="text-muted-foreground">빙고판 크기를 선택하고 단어를 입력하세요</p>
          </div>

          {/* Grid Size Selection */}
          <div className="bg-card border border-border/40 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">빙고판 크기 선택</h2>
            <div className="flex gap-3">
              {([4, 5, 6] as GridSize[]).map(size => (
                <button
                  key={size}
                  onClick={() => { setGridSize(size); setWordList([]); setError(''); }}
                  className={`flex-1 py-3 rounded-xl border font-bold text-lg transition-all ${
                    gridSize === size
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-secondary/30 border-border/40 text-muted-foreground hover:border-emerald-500/30'
                  }`}
                  style={{ fontFamily: 'var(--font-fredoka)' }}
                >
                  {size}×{size}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              총 <span className="text-emerald-400 font-semibold">{totalCells}개</span>의 단어가 필요합니다
            </p>
          </div>

          {/* Excel Upload */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-foreground">엑셀 파일로 단어 불러오기</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              셀에 단어를 입력한 .xlsx / .xls / .csv 파일을 업로드하면 자동으로 단어 목록에 추가됩니다.
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium disabled:opacity-50"
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
                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
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

          {/* Word Input */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">단어 목록 (직접 입력)</h2>
              <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${
                wordList.length === totalCells
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-secondary/50 text-muted-foreground'
              }`}>
                {wordList.length} / {totalCells}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={wordInput}
                onChange={e => { setWordInput(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && addWord()}
                placeholder="단어 입력 후 Enter"
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono uppercase text-sm"
                disabled={wordList.length >= totalCells}
              />
              <button
                onClick={addWord}
                disabled={wordList.length >= totalCells}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            {wordList.length > 0 && (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto scrollbar-hide">
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
            onClick={buildGrid}
            disabled={wordList.length < totalCells}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {wordList.length < totalCells
              ? `단어 ${totalCells - wordList.length}개 더 입력하세요`
              : '빙고 시작!'}
          </button>
        </div>
      </div>
    );
  }

  // === PLAYING PHASE ===
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> 홈으로
          </button>
          <div className="flex items-center gap-3">
            {bingoCount > 0 && (
              <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-3 py-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">BINGO × {bingoCount}</span>
              </div>
            )}
            <button
              onClick={resetGame}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 border border-border/40 rounded-lg px-3 py-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              처음으로
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-4 py-6 flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-fredoka)' }}>
            빙고게임 ({gridSize}×{gridSize})
          </h1>
          <p className="text-sm text-muted-foreground mt-1">단어를 클릭하면 선택됩니다</p>
        </div>

        {bingoCount > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-6 py-4 text-center w-full">
            <p className="text-emerald-400 font-bold text-xl" style={{ fontFamily: 'var(--font-fredoka)' }}>
              BINGO! {bingoCount}줄 완성!
            </p>
          </div>
        )}

        {/* Bingo Grid */}
        <div
          className="w-full max-w-lg grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const inBingo = cell.called && isCellInBingo(r, c);
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => toggleCell(r, c)}
                  className={`${cellSize} rounded-xl border font-semibold transition-all duration-150 flex items-center justify-center text-center px-1 leading-tight ${
                    inBingo
                      ? 'bg-emerald-500/30 border-emerald-400/60 text-emerald-300 shadow-md shadow-emerald-500/20 scale-105'
                      : cell.called
                      ? 'bg-primary/20 border-primary/40 text-primary'
                      : 'bg-secondary/40 border-border/40 text-foreground hover:bg-secondary/60 hover:border-emerald-500/30'
                  }`}
                >
                  {cell.word}
                </button>
              );
            })
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          선택된 칸: {grid.flat().filter(c => c.called).length} / {totalCells}
        </p>
      </div>
    </div>
  );
}
