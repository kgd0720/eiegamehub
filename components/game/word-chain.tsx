'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ChevronRight, RotateCcw, Trash2 } from 'lucide-react';

interface Props {
  onBack: () => void;
}

interface WordEntry {
  word: string;
  player: string;
  timestamp: number;
}

export function WordChain({ onBack }: Props) {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [input, setInput] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'setup' | 'playing'>('setup');
  const [startWord, setStartWord] = useState('');
  const [setupInput, setSetupInput] = useState('');
  const [setupPlayer, setSetupPlayer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [words]);

  const lastLetter = words.length > 0
    ? words[words.length - 1].word.slice(-1).toUpperCase()
    : startWord.slice(-1).toUpperCase();

  const handleStart = () => {
    if (!setupInput.trim()) {
      setError('시작 단어를 입력해주세요.');
      return;
    }
    const w = setupInput.trim().toUpperCase();
    if (!/^[A-Z]+$/.test(w)) {
      setError('영어 단어만 입력 가능합니다.');
      return;
    }
    setStartWord(w);
    setPhase('playing');
    setError('');
  };

  const handleSubmit = () => {
    const w = input.trim().toUpperCase();
    if (!w) return;

    if (!/^[A-Z]+$/.test(w)) {
      setError('영어 단어만 입력 가능합니다.');
      return;
    }

    if (w[0] !== lastLetter) {
      setError(`"${lastLetter}" 로 시작하는 단어를 입력해야 합니다!`);
      return;
    }

    const allUsed = [startWord, ...words.map(e => e.word)];
    if (allUsed.includes(w)) {
      setError(`"${w}" 은(는) 이미 사용된 단어입니다!`);
      return;
    }

    const name = playerName.trim() || '익명';
    setWords(prev => [...prev, { word: w, player: name, timestamp: Date.now() }]);
    setInput('');
    setPlayerName('');
    setError('');
    inputRef.current?.focus();
  };

  const handleReset = () => {
    setWords([]);
    setInput('');
    setPlayerName('');
    setError('');
    setPhase('setup');
    setStartWord('');
    setSetupInput('');
    setSetupPlayer('');
  };

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </button>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-blue-500/20">
                🔗
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                끝말잇기
              </h1>
              <p className="text-muted-foreground">진행자가 시작 단어를 입력하면 게임이 시작됩니다</p>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">시작 단어 (영어)</label>
                <input
                  type="text"
                  value={setupInput}
                  onChange={e => { setSetupInput(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleStart()}
                  placeholder="예: APPLE"
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-lg font-mono uppercase"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleStart}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-md shadow-blue-500/20"
              >
                게임 시작
              </button>
            </div>

            <div className="mt-4 bg-card/50 border border-border/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">게임 규칙</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 이전 단어의 <strong className="text-foreground">마지막 알파벳</strong>으로 시작하는 단어 입력</li>
                <li>• 이미 사용된 단어는 다시 사용 불가</li>
                <li>• 영어 단어만 사용 가능</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const allWords = [{ word: startWord, player: setupPlayer || '진행자', timestamp: 0 }, ...words];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{words.length}개 단어 사용됨</span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 border border-border/40 rounded-lg px-3 py-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              초기화
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-6 py-6 flex-1 flex flex-col gap-5">
        {/* Current chain status */}
        <div className="bg-card border border-blue-500/30 rounded-2xl p-5 text-center shadow-lg shadow-blue-500/10">
          <p className="text-sm text-muted-foreground mb-1">다음 단어는 이 알파벳으로 시작해야 합니다</p>
          <div className="text-6xl font-bold text-blue-400" style={{ fontFamily: 'var(--font-fredoka)' }}>
            {lastLetter}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            이전 단어: <span className="text-foreground font-mono font-semibold">{words.length > 0 ? words[words.length - 1].word : startWord}</span>
          </p>
        </div>

        {/* Word history */}
        <div className="flex-1 bg-card border border-border/40 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">단어 기록</span>
            {words.length > 0 && (
              <button
                onClick={() => { setWords([]); setError(''); }}
                className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> 기록 삭제
              </button>
            )}
          </div>
          <div ref={listRef} className="p-3 space-y-2 max-h-72 overflow-y-auto scrollbar-hide">
            {allWords.map((entry, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${i === 0 ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-secondary/30'}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-blue-500 text-white' : 'bg-primary/20 text-primary'}`}>
                  {i}
                </div>
                <div className="flex-1">
                  <span className="font-mono font-bold text-foreground tracking-wider">{entry.word}</span>
                  {i > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">— {entry.player}</span>
                  )}
                  {i === 0 && (
                    <span className="ml-2 text-xs text-blue-400">시작 단어</span>
                  )}
                </div>
                {i < allWords.length - 1 && (
                  <div className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <span className="font-mono font-bold text-orange-400">{entry.word.slice(-1).toUpperCase()}</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
            {allWords.length === 1 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                첫 번째 단어를 입력해보세요!
              </p>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="참여자 이름 (선택)"
              className="w-32 px-3 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm flex-shrink-0"
            />
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder={`"${lastLetter}"로 시작하는 단어`}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-lg uppercase pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400 bg-blue-500/10 rounded-md px-1.5 py-0.5">
                {lastLetter}...
              </span>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold hover:opacity-90 transition-opacity shadow-md shadow-blue-500/20"
          >
            단어 입력 (Enter)
          </button>
        </div>
      </div>
    </div>
  );
}
