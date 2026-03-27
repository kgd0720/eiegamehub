'use client';

import { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Upload, CheckCircle2, XCircle, RotateCcw, FileSpreadsheet, AlertCircle, ChevronRight, ChevronLeft, Trophy } from 'lucide-react';

interface Props {
  onBack: () => void;
}

interface Question {
  question: string;
  answer: string;
}

interface Result {
  question: Question;
  correct: boolean;
}

type Phase = 'upload' | 'playing' | 'result';

export function SpeedGame({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('upload');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [teamName, setTeamName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const parseExcel = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const parsed: Question[] = [];
      const errors: string[] = [];

      // Validate header row
      if (rows.length === 0) {
        setUploadError('파일이 비어있습니다.');
        setUploading(false);
        return;
      }

      // Check if first row looks like a header
      const startRow = (String(rows[0]?.[0] || '').toLowerCase().includes('question') || String(rows[0]?.[0] || '').toLowerCase().includes('문제')) ? 1 : 0;

      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        const q = String(row?.[0] || '').trim();
        const a = String(row?.[1] || '').trim();
        if (!q && !a) continue; // skip empty rows
        if (!q) { errors.push(`${i + 1}행: 질문이 없습니다`); continue; }
        if (!a) { errors.push(`${i + 1}행: 답변이 없습니다`); continue; }
        parsed.push({ question: q, answer: a });
      }

      if (errors.length > 0) {
        setUploadError(`파일 오류:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... 외 ${errors.length - 5}개` : ''}`);
        setUploading(false);
        return;
      }

      if (parsed.length === 0) {
        setUploadError('유효한 문제가 없습니다. A열: 질문, B열: 정답 형식으로 입력해주세요.');
        setUploading(false);
        return;
      }

      setQuestions(parsed);
      setFileName(file.name);
      setUploadError('');
    } catch {
      setUploadError('파일을 읽는 중 오류가 발생했습니다. .xlsx 또는 .xls 파일인지 확인해주세요.');
    }
    setUploading(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseExcel(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseExcel(file);
  };

  const startGame = () => {
    setCurrentIndex(0);
    setResults([]);
    setShowAnswer(false);
    setPhase('playing');
  };

  const judge = (correct: boolean) => {
    const result: Result = { question: questions[currentIndex], correct };
    const newResults = [...results, result];
    setResults(newResults);
    setShowAnswer(false);

    if (currentIndex + 1 >= questions.length) {
      setPhase('result');
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const resetGame = () => {
    setPhase('upload');
    setQuestions([]);
    setCurrentIndex(0);
    setResults([]);
    setShowAnswer(false);
    setFileName('');
    setTeamName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // === UPLOAD PHASE ===
  if (phase === 'upload') {
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-yellow-500/20">
              ⚡
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>스피드게임</h1>
            <p className="text-muted-foreground">엑셀 파일로 문제를 업로드하세요</p>
          </div>

          {/* Excel Format Guide */}
          <div className="bg-card border border-border/40 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-yellow-400" />
              엑셀 파일 형식 안내
            </h2>
            <div className="bg-secondary/30 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">A열 (질문)</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">B열 (정답)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['What is the capital of Korea?', 'Seoul'],
                    ['How do you say "apple" in Korean?', '사과'],
                    ['What color is the sky?', 'Blue'],
                  ].map(([q, a], i) => (
                    <tr key={i} className="border-b border-border/20 last:border-0">
                      <td className="px-4 py-2 text-foreground">{q}</td>
                      <td className="px-4 py-2 text-yellow-400 font-medium">{a}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * 1행을 헤더로 사용해도 됩니다 (자동으로 건너뜁니다)
            </p>
          </div>

          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              uploading
                ? 'border-yellow-500/50 bg-yellow-500/5'
                : fileName
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-border/40 hover:border-yellow-500/40 hover:bg-yellow-500/5'
            }`}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {uploading ? (
              <div className="space-y-2">
                <div className="w-10 h-10 border-2 border-yellow-500/50 border-t-yellow-400 rounded-full animate-spin mx-auto" />
                <p className="text-yellow-400 font-medium">파일 분석 중...</p>
              </div>
            ) : fileName && questions.length > 0 ? (
              <div className="space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-emerald-400 font-semibold">{fileName}</p>
                <p className="text-sm text-muted-foreground">총 <strong className="text-foreground">{questions.length}개</strong> 문제 로드 완료</p>
                <p className="text-xs text-muted-foreground">다른 파일을 업로드하려면 클릭하세요</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-foreground font-medium">파일을 여기에 드래그하거나 클릭하세요</p>
                <p className="text-sm text-muted-foreground">.xlsx, .xls, .csv 파일 지원</p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm whitespace-pre-line">{uploadError}</p>
            </div>
          )}

          {questions.length > 0 && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">팀/참여자 이름 (선택)</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="예: 1팀, 홍길동"
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                />
              </div>
              <button
                onClick={startGame}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-400 text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-md shadow-yellow-500/20"
              >
                게임 시작! ({questions.length}문제)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // === PLAYING PHASE ===
  if (phase === 'playing') {
    const current = questions[currentIndex];
    const progress = ((currentIndex) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> 홈으로
            </button>
            <div className="text-sm font-medium text-muted-foreground">
              {currentIndex + 1} / {questions.length}
            </div>
          </div>
          <div className="h-1 bg-secondary/50">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <div className="max-w-2xl mx-auto w-full px-6 py-10 flex flex-col items-center gap-8">
          {teamName && (
            <div className="text-sm font-medium text-muted-foreground bg-secondary/40 border border-border/30 rounded-full px-4 py-1.5">
              {teamName}
            </div>
          )}

          {/* Question Card */}
          <div className="w-full bg-card border border-yellow-500/20 rounded-2xl p-8 text-center shadow-lg shadow-yellow-500/10">
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-4">Q {currentIndex + 1}</p>
            <p className="text-2xl font-bold text-foreground leading-relaxed text-balance">
              {current.question}
            </p>
          </div>

          {/* Answer reveal */}
          {showAnswer ? (
            <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">정답</p>
              <p className="text-2xl font-bold text-emerald-300">{current.answer}</p>
            </div>
          ) : (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full py-3 rounded-xl bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all text-sm font-medium"
            >
              정답 보기
            </button>
          )}

          {/* Judge Buttons */}
          <div className="w-full grid grid-cols-2 gap-4">
            <button
              onClick={() => judge(true)}
              className="flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 text-white font-bold text-xl hover:opacity-90 transition-opacity shadow-md shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-6 h-6" />
              정답
            </button>
            <button
              onClick={() => judge(false)}
              className="flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-400 text-white font-bold text-xl hover:opacity-90 transition-opacity shadow-md shadow-red-500/20"
            >
              <XCircle className="w-6 h-6" />
              오답
            </button>
          </div>

          {/* Score so far */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-emerald-400 font-semibold">정답: {results.filter(r => r.correct).length}</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-red-400 font-semibold">오답: {results.filter(r => !r.correct).length}</span>
          </div>
        </div>
      </div>
    );
  }

  // === RESULT PHASE ===
  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const pct = Math.round((correct / total) * 100);

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
        <div className="text-center space-y-4">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto" />
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-fredoka)' }}>게임 결과</h1>
          {teamName && <p className="text-muted-foreground">{teamName}</p>}
          <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-8 py-4">
            <div className="text-5xl font-bold text-yellow-400" style={{ fontFamily: 'var(--font-fredoka)' }}>{pct}%</div>
            <div className="text-sm text-muted-foreground mt-1">{correct} / {total} 정답</div>
          </div>
        </div>

        {/* Wrong answers */}
        {results.filter(r => !r.correct).length > 0 && (
          <div className="bg-card border border-border/40 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              틀린 문제 ({results.filter(r => !r.correct).length}개)
            </h2>
            <div className="space-y-2">
              {results.filter(r => !r.correct).map((r, i) => (
                <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                  <p className="text-sm text-foreground">{r.question.question}</p>
                  <p className="text-sm text-emerald-400 font-semibold mt-1">
                    정답: {r.question.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={startGame}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-400 text-white font-bold hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-4 h-4" />
            다시 풀기
          </button>
          <button
            onClick={resetGame}
            className="flex-1 py-3 rounded-xl bg-secondary/50 border border-border/40 text-foreground font-bold hover:bg-secondary/80 transition-colors"
          >
            새 파일 업로드
          </button>
        </div>
      </div>
    </div>
  );
}
