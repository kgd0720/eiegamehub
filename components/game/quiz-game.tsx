'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Upload, Clock, Trophy, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet, RotateCcw } from 'lucide-react';

interface Props {
  onBack: () => void;
}

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

type Phase = 'setup' | 'playing' | 'result';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = [
  { bg: 'bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30', active: 'bg-blue-500/40 border-blue-500/60', text: 'text-blue-300' },
  { bg: 'bg-orange-500/20 border-orange-500/40 hover:bg-orange-500/30', active: 'bg-orange-500/40 border-orange-500/60', text: 'text-orange-300' },
  { bg: 'bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30', active: 'bg-emerald-500/40 border-emerald-500/60', text: 'text-emerald-300' },
  { bg: 'bg-rose-500/20 border-rose-500/40 hover:bg-rose-500/30', active: 'bg-rose-500/40 border-rose-500/60', text: 'text-rose-300' },
];

export function QuizGame({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(15);
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Playing state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeQuestions = questions.slice(0, questionCount);

  const parseExcel = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const parsed: QuizQuestion[] = [];
      const errors: string[] = [];
      const startRow = (String(rows[0]?.[0] || '').toLowerCase().includes('question') || String(rows[0]?.[0] || '').toLowerCase().includes('문제')) ? 1 : 0;

      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        const q = String(row?.[0] || '').trim();
        const o1 = String(row?.[1] || '').trim();
        const o2 = String(row?.[2] || '').trim();
        const o3 = String(row?.[3] || '').trim();
        const o4 = String(row?.[4] || '').trim();
        const correct = String(row?.[5] || '').trim();

        if (!q && !o1) continue;
        if (!q) { errors.push(`${i + 1}행: 문제가 없습니다`); continue; }
        if (!o1 || !o2 || !o3 || !o4) { errors.push(`${i + 1}행: 보기 4개가 모두 필요합니다`); continue; }
        const correctNum = parseInt(correct) - 1;
        if (isNaN(correctNum) || correctNum < 0 || correctNum > 3) {
          errors.push(`${i + 1}행: F열에 정답 번호(1~4)를 입력하세요`);
          continue;
        }
        parsed.push({ question: q, options: [o1, o2, o3, o4], correctIndex: correctNum });
      }

      if (errors.length > 0) {
        setUploadError(`파일 오류:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... 외 ${errors.length - 5}개` : ''}`);
        setUploading(false);
        return;
      }
      if (parsed.length === 0) {
        setUploadError('유효한 문제가 없습니다.\nA: 문제, B~E: 보기1~4, F: 정답번호(1~4)');
        setUploading(false);
        return;
      }

      setQuestions(parsed);
      setFileName(file.name);
      setUploadError('');
    } catch {
      setUploadError('파일을 읽는 중 오류가 발생했습니다.');
    }
    setUploading(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcel(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseExcel(file);
  };

  const startGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setSelected(null);
    setShowFeedback(false);
    setAnswers([]);
    setTimeLeft(timePerQuestion);
    setPhase('playing');
  };

  const handleTimeUp = useCallback(() => {
    if (showFeedback) return;
    setShowFeedback(true);
    setAnswers(prev => [...prev, null]);
    setTimeout(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= activeQuestions.length) {
          setPhase('result');
          return prev;
        }
        setSelected(null);
        setShowFeedback(false);
        setTimeLeft(timePerQuestion);
        return next;
      });
    }, 1500);
  }, [showFeedback, activeQuestions.length, timePerQuestion]);

  useEffect(() => {
    if (phase !== 'playing' || showFeedback) return;
    if (timeLeft <= 0) { handleTimeUp(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, timeLeft, showFeedback, handleTimeUp]);

  const handleSelect = (idx: number) => {
    if (showFeedback || selected !== null) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setSelected(idx);
    setShowFeedback(true);
    const isCorrect = idx === activeQuestions[currentIndex].correctIndex;
    if (isCorrect) setScore(s => s + 1);
    setAnswers(prev => [...prev, idx]);

    setTimeout(() => {
      const next = currentIndex + 1;
      if (next >= activeQuestions.length) {
        setPhase('result');
        return;
      }
      setCurrentIndex(next);
      setSelected(null);
      setShowFeedback(false);
      setTimeLeft(timePerQuestion);
    }, 1500);
  };

  const resetGame = () => {
    setPhase('setup');
    setCurrentIndex(0);
    setScore(0);
    setSelected(null);
    setShowFeedback(false);
    setAnswers([]);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-red-500/20">
              ❓
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>퀴즈맞추기</h1>
            <p className="text-muted-foreground">4지선다 퀴즈 게임</p>
          </div>

          {/* Excel Format */}
          <div className="bg-card border border-border/40 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-red-400" />
              엑셀 파일 형식 (선택사항)
            </h2>
            <div className="bg-secondary/30 rounded-xl overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40">
                    {['A: 문제', 'B: 보기1', 'C: 보기2', 'D: 보기3', 'E: 보기4', 'F: 정답(1~4)'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 text-foreground">Capital of USA?</td>
                    <td className="px-3 py-2 text-foreground">London</td>
                    <td className="px-3 py-2 text-foreground">Paris</td>
                    <td className="px-3 py-2 text-emerald-400 font-semibold">Washington</td>
                    <td className="px-3 py-2 text-foreground">Tokyo</td>
                    <td className="px-3 py-2 text-red-400 font-bold">3</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              fileName
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-border/40 hover:border-red-500/40 hover:bg-red-500/5'
            }`}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
            {uploading ? (
              <div className="space-y-2">
                <div className="w-8 h-8 border-2 border-red-500/50 border-t-red-400 rounded-full animate-spin mx-auto" />
                <p className="text-red-400 text-sm">분석 중...</p>
              </div>
            ) : fileName && questions.length > 0 ? (
              <div className="space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-emerald-400 font-semibold text-sm">{fileName}</p>
                <p className="text-xs text-muted-foreground">{questions.length}개 문제 로드 완료</p>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-foreground">엑셀 파일 업로드 (선택)</p>
                <p className="text-xs text-muted-foreground">업로드 없이 기본 문제로 시작 가능</p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm whitespace-pre-line">{uploadError}</p>
            </div>
          )}

          {/* Settings */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">게임 설정</h2>

            <div>
              <label className="block text-xs text-muted-foreground mb-2">
                문제 수: <span className="text-foreground font-semibold">{Math.min(questionCount, questions.length || questionCount)}문제</span>
                {questions.length > 0 && ` (최대 ${questions.length}개)`}
              </label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map(n => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    disabled={questions.length > 0 && n > questions.length}
                    className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                      questionCount === n
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-secondary/30 border-border/40 text-muted-foreground hover:border-red-500/30'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-2">
                문제당 시간: <span className="text-foreground font-semibold">{timePerQuestion}초</span>
              </label>
              <div className="flex gap-2">
                {[10, 15, 20, 30].map(t => (
                  <button
                    key={t}
                    onClick={() => setTimePerQuestion(t)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${
                      timePerQuestion === t
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-secondary/30 border-border/40 text-muted-foreground hover:border-red-500/30'
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {questions.length === 0 && (
            <p className="text-center text-xs text-muted-foreground bg-secondary/30 rounded-xl p-3">
              엑셀 파일 없이 시작하면 샘플 영어 퀴즈로 진행됩니다
            </p>
          )}

          <button
            onClick={() => {
              if (questions.length === 0) {
                // Use built-in sample questions
                setQuestions(SAMPLE_QUESTIONS);
              }
              startGame();
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-400 text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-md shadow-red-500/20"
          >
            퀴즈 시작!
          </button>
        </div>
      </div>
    );
  }

  // === PLAYING ===
  if (phase === 'playing') {
    const q = activeQuestions[currentIndex];
    const timerPct = (timeLeft / timePerQuestion) * 100;
    const timerColor = timeLeft > 10 ? 'bg-emerald-500' : timeLeft > 5 ? 'bg-yellow-500' : 'bg-red-500';

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between">
            <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> 홈으로
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{currentIndex + 1} / {activeQuestions.length}</span>
              <div className="flex items-center gap-1.5 bg-secondary/50 border border-border/40 rounded-full px-3 py-1">
                <Clock className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'text-red-400' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-foreground'}`}>{timeLeft}</span>
              </div>
            </div>
          </div>
          <div className="h-1 bg-secondary/50">
            <div
              className={`h-full transition-all duration-1000 ${timerColor}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        </header>

        <div className="max-w-2xl mx-auto w-full px-6 py-8 flex flex-col gap-5">
          {/* Score */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">점수</span>
            <span className="text-red-400 font-bold text-lg" style={{ fontFamily: 'var(--font-fredoka)' }}>{score}점</span>
          </div>

          {/* Question */}
          <div className="bg-card border border-red-500/20 rounded-2xl p-6 text-center shadow-lg shadow-red-500/10 min-h-32 flex flex-col items-center justify-center">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">Q {currentIndex + 1}</p>
            <p className="text-xl font-bold text-foreground leading-relaxed text-balance">{q.question}</p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex;
              const isChosen = selected === i;
              let cls = `${OPTION_COLORS[i].bg} border`;
              if (showFeedback) {
                if (isCorrect) cls = 'bg-emerald-500/30 border-emerald-400/60';
                else if (isChosen) cls = 'bg-red-500/30 border-red-400/60';
                else cls = 'bg-secondary/20 border-border/30 opacity-40';
              }
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={showFeedback}
                  className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all disabled:cursor-default text-left ${cls}`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${OPTION_COLORS[i].bg} border ${OPTION_COLORS[i].text}`}>
                    {OPTION_LABELS[i]}
                  </span>
                  <span className="text-foreground font-medium flex-1">{opt}</span>
                  {showFeedback && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                  {showFeedback && isChosen && !isCorrect && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {showFeedback && selected === null && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center text-yellow-400 text-sm font-medium">
              시간 초과!
            </div>
          )}
        </div>
      </div>
    );
  }

  // === RESULT ===
  const total = activeQuestions.length;
  const pct = Math.round((score / total) * 100);

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
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-fredoka)' }}>퀴즈 종료!</h1>
          <div className="inline-block bg-red-500/10 border border-red-500/20 rounded-2xl px-8 py-4">
            <div className="text-5xl font-bold text-red-400" style={{ fontFamily: 'var(--font-fredoka)' }}>{pct}점</div>
            <div className="text-sm text-muted-foreground mt-1">{score} / {total} 정답</div>
          </div>
          <p className="text-muted-foreground">
            {pct >= 90 ? '완벽합니다!' : pct >= 70 ? '잘 했습니다!' : pct >= 50 ? '괜찮아요!' : '더 연습해봐요!'}
          </p>
        </div>

        {/* Wrong answers */}
        {answers.some((a, i) => a !== activeQuestions[i].correctIndex) && (
          <div className="bg-card border border-border/40 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              틀린 문제
            </h2>
            <div className="space-y-3">
              {activeQuestions.map((q, i) => {
                const userAns = answers[i];
                if (userAns === q.correctIndex) return null;
                return (
                  <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 space-y-1">
                    <p className="text-sm text-foreground font-medium">{q.question}</p>
                    <p className="text-xs text-red-400">
                      내 답: {userAns !== null ? q.options[userAns] : '시간 초과'}
                    </p>
                    <p className="text-xs text-emerald-400 font-semibold">
                      정답: {q.options[q.correctIndex]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={startGame}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-400 text-white font-bold hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-4 h-4" />
            다시 풀기
          </button>
          <button
            onClick={resetGame}
            className="flex-1 py-3 rounded-xl bg-secondary/50 border border-border/40 text-foreground font-bold hover:bg-secondary/80 transition-colors"
          >
            설정 변경
          </button>
        </div>
      </div>
    </div>
  );
}

const SAMPLE_QUESTIONS: QuizQuestion[] = [
  { question: 'What is the past tense of "go"?', options: ['goed', 'gone', 'went', 'going'], correctIndex: 2 },
  { question: 'Which word means the opposite of "happy"?', options: ['excited', 'sad', 'angry', 'surprised'], correctIndex: 1 },
  { question: 'What is the plural of "child"?', options: ['childs', 'childen', 'children', 'child'], correctIndex: 2 },
  { question: 'Which sentence is correct?', options: ['She don\'t like it.', 'She doesn\'t likes it.', 'She doesn\'t like it.', 'She not like it.'], correctIndex: 2 },
  { question: '"I ___ to school every day."', options: ['goes', 'going', 'go', 'gone'], correctIndex: 2 },
  { question: 'What does "enormous" mean?', options: ['very small', 'very fast', 'very loud', 'very large'], correctIndex: 3 },
  { question: 'Which is a verb?', options: ['beautiful', 'quickly', 'run', 'happy'], correctIndex: 2 },
  { question: 'What is the comparative of "good"?', options: ['gooder', 'more good', 'better', 'best'], correctIndex: 2 },
  { question: '"They ___ playing football now."', options: ['is', 'am', 'are', 'be'], correctIndex: 2 },
  { question: 'What does "purchase" mean?', options: ['to sell', 'to buy', 'to borrow', 'to lend'], correctIndex: 1 },
  { question: 'Which word is an adjective?', options: ['slowly', 'jump', 'blue', 'eat'], correctIndex: 2 },
  { question: '"She has ___ her homework."', options: ['did', 'done', 'do', 'does'], correctIndex: 1 },
  { question: 'What is the synonym of "begin"?', options: ['end', 'finish', 'start', 'stop'], correctIndex: 2 },
  { question: 'Which sentence uses "there" correctly?', options: ['Their going to school.', 'There going to school.', 'They\'re going to school.', 'Ther going to school.'], correctIndex: 2 },
  { question: 'What does "frequently" mean?', options: ['never', 'sometimes', 'rarely', 'often'], correctIndex: 3 },
  { question: 'What is the superlative of "bad"?', options: ['baddest', 'more bad', 'worst', 'worse'], correctIndex: 2 },
  { question: '"___ is your name?"', options: ['Who', 'What', 'Which', 'How'], correctIndex: 1 },
  { question: 'Which word means "to look at something carefully"?', options: ['glance', 'peek', 'examine', 'glimpse'], correctIndex: 2 },
  { question: '"I ___ to the gym yesterday."', options: ['go', 'goes', 'going', 'went'], correctIndex: 3 },
  { question: 'What is the antonym of "ancient"?', options: ['old', 'modern', 'historical', 'traditional'], correctIndex: 1 },
];
