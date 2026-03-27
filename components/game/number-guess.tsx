'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, RotateCcw, Eye, EyeOff, Trophy } from 'lucide-react';

interface Props {
  onBack: () => void;
}

type Phase = 'host-setup' | 'playing' | 'result';

interface GuessEntry {
  value: number;
  hint: 'higher' | 'lower' | 'correct';
}

export function NumberGuess({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('host-setup');
  const [hostInput, setHostInput] = useState('');
  const [targetNumber, setTargetNumber] = useState<number | null>(null);
  const [showTarget, setShowTarget] = useState(false);
  const [setupError, setSetupError] = useState('');

  const [guess, setGuess] = useState('');
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [guessError, setGuessError] = useState('');
  const [playerName, setPlayerName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleHostSubmit = () => {
    const n = parseInt(hostInput.trim());
    if (isNaN(n) || n < 1 || n > 100) {
      setSetupError('1에서 100 사이의 숫자를 입력해주세요.');
      return;
    }
    setTargetNumber(n);
    setSetupError('');
    setPhase('playing');
    setGuesses([]);
    setGuess('');
    setGuessError('');
    setShowTarget(false);
  };

  const handleGuess = () => {
    const n = parseInt(guess.trim());
    if (isNaN(n) || n < 1 || n > 100) {
      setGuessError('1에서 100 사이의 숫자를 입력해주세요.');
      return;
    }
    if (guesses.some(g => g.value === n)) {
      setGuessError('이미 입력한 숫자입니다.');
      return;
    }

    let hint: GuessEntry['hint'];
    if (n === targetNumber) hint = 'correct';
    else if (n < targetNumber!) hint = 'higher';
    else hint = 'lower';

    const newEntry: GuessEntry = { value: n, hint };
    const newGuesses = [...guesses, newEntry];
    setGuesses(newGuesses);
    setGuess('');
    setGuessError('');

    if (hint === 'correct') {
      setPhase('result');
    } else {
      inputRef.current?.focus();
    }
  };

  const resetGame = () => {
    setPhase('host-setup');
    setHostInput('');
    setTargetNumber(null);
    setShowTarget(false);
    setSetupError('');
    setGuess('');
    setGuesses([]);
    setGuessError('');
    setPlayerName('');
  };

  // Range narrowing
  let low = 1, high = 100;
  for (const g of guesses) {
    if (g.hint === 'higher' && g.value > low) low = g.value;
    if (g.hint === 'lower' && g.value < high) high = g.value;
  }
  const rangePct = ((high - low) / 99) * 100;
  const lowPct = ((low - 1) / 99) * 100;

  // === HOST SETUP ===
  if (phase === 'host-setup') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-6 py-4">
            <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> 홈으로
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                🔢
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                숫자맞추기
              </h1>
              <p className="text-muted-foreground">진행자가 먼저 숫자를 입력하세요</p>
            </div>

            <div className="bg-card border border-indigo-500/20 rounded-2xl p-6 space-y-4">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-sm text-indigo-300 text-center">
                이 화면은 진행자만 볼 수 있습니다. 학생에게 화면을 보여주지 마세요!
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  비밀 숫자 입력 (1~100)
                </label>
                <input
                  type="number"
                  value={hostInput}
                  onChange={e => { setHostInput(e.target.value); setSetupError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleHostSubmit()}
                  placeholder="1 ~ 100"
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-2xl font-bold text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
              </div>

              {setupError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
                  {setupError}
                </p>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  참여자 이름 (선택)
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <button
                onClick={handleHostSubmit}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-400 text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-md shadow-indigo-500/20"
              >
                게임 시작
              </button>
            </div>

            <div className="bg-card/50 border border-border/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">게임 규칙</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 진행자가 1~100 사이 숫자를 비밀로 설정</li>
                <li>• 학생이 숫자를 입력하면 힌트 제공 (더 높다 / 더 낮다)</li>
                <li>• 최소한의 시도 횟수로 맞추는 것이 목표</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === PLAYING ===
  if (phase === 'playing') {
    const lastGuess = guesses[guesses.length - 1];

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> 홈으로
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{guesses.length}번 시도</span>
              <button
                onClick={() => setShowTarget(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 border border-border/40 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                {showTarget ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showTarget ? '숨기기' : '정답 보기 (진행자)'}
              </button>
              <button
                onClick={resetGame}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 border border-border/40 rounded-lg px-3 py-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                초기화
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto w-full px-6 py-6 space-y-5">
          {playerName && (
            <div className="text-center">
              <span className="text-sm font-medium text-muted-foreground bg-secondary/40 border border-border/30 rounded-full px-4 py-1.5">
                {playerName}
              </span>
            </div>
          )}

          {showTarget && (
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 text-center">
              <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">정답 (진행자 전용)</p>
              <p className="text-4xl font-bold text-indigo-300" style={{ fontFamily: 'var(--font-fredoka)' }}>
                {targetNumber}
              </p>
            </div>
          )}

          {/* Range visualization */}
          <div className="bg-card border border-border/40 rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>1</span>
              <span className="text-foreground font-semibold text-sm">범위: {low + 1} ~ {high - 1}</span>
              <span>100</span>
            </div>
            <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full transition-all duration-500"
                style={{ marginLeft: `${lowPct}%`, width: `${rangePct}%` }}
              />
            </div>
            {lastGuess && lastGuess.hint !== 'correct' && (
              <p className={`text-center mt-3 font-bold text-lg ${lastGuess.hint === 'higher' ? 'text-orange-400' : 'text-blue-400'}`}
                style={{ fontFamily: 'var(--font-fredoka)' }}>
                {lastGuess.value} — {lastGuess.hint === 'higher' ? '더 높은 숫자!' : '더 낮은 숫자!'}
              </p>
            )}
          </div>

          {/* Guess history */}
          {guesses.length > 0 && (
            <div className="bg-card border border-border/40 rounded-2xl p-4">
              <h2 className="text-xs font-semibold text-muted-foreground mb-3">입력 기록</h2>
              <div className="flex flex-wrap gap-2">
                {guesses.map((g, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold border ${
                      g.hint === 'higher'
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                        : g.hint === 'lower'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    <span>{g.value}</span>
                    <span className="text-xs opacity-70">
                      {g.hint === 'higher' ? '↑' : g.hint === 'lower' ? '↓' : '✓'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
            {guessError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
                {guessError}
              </p>
            )}
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="number"
                value={guess}
                onChange={e => { setGuess(e.target.value); setGuessError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleGuess()}
                placeholder="1 ~ 100"
                min="1"
                max="100"
                className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xl font-bold text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                autoFocus
              />
            </div>
            <button
              onClick={handleGuess}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-400 text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-md shadow-indigo-500/20"
            >
              숫자 입력 (Enter)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === RESULT ===
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> 홈으로
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-6 py-12 flex flex-col items-center gap-6 text-center">
        <Trophy className="w-16 h-16 text-yellow-400" />
        <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-fredoka)' }}>
          정답입니다!
        </h1>
        {playerName && <p className="text-lg text-muted-foreground">{playerName}</p>}

        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl px-10 py-6 space-y-2">
          <p className="text-muted-foreground text-sm">정답 숫자</p>
          <p className="text-6xl font-bold text-indigo-300" style={{ fontFamily: 'var(--font-fredoka)' }}>
            {targetNumber}
          </p>
          <p className="text-yellow-400 font-semibold text-lg mt-2">
            {guesses.length}번 만에 맞췄습니다!
          </p>
        </div>

        <p className="text-muted-foreground">
          {guesses.length <= 3
            ? '놀랍습니다! 천재입니다!'
            : guesses.length <= 7
            ? '훌륭합니다!'
            : guesses.length <= 10
            ? '잘 했습니다!'
            : '포기하지 않았네요! 잘 했습니다!'}
        </p>

        {/* Guess history */}
        <div className="w-full bg-card border border-border/40 rounded-2xl p-4">
          <h2 className="text-xs font-semibold text-muted-foreground mb-3">전체 시도 기록</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {guesses.map((g, i) => (
              <div
                key={i}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold border ${
                  g.hint === 'correct'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : g.hint === 'higher'
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                }`}
              >
                {i + 1}. {g.value}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={resetGame}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-400 text-white font-bold hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-4 h-4" />
            새 게임
          </button>
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl bg-secondary/50 border border-border/40 text-foreground font-bold hover:bg-secondary/80 transition-colors"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
