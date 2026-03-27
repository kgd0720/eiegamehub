'use client';

import { useState } from 'react';
import { WordChain } from './word-chain';
import { BingoGame } from './bingo-game';
import { SpeedGame } from './speed-game';
import { WordSearch } from './word-search';
import { QuizGame } from './quiz-game';
import { NumberGuess } from './number-guess';

type GameId = 'home' | 'wordchain' | 'bingo' | 'speed' | 'wordsearch' | 'quiz' | 'numguess';

const GAMES = [
  {
    id: 'wordchain' as GameId,
    title: '끝말잇기',
    subtitle: 'Word Chain',
    description: '단어의 끝 알파벳에 이어서 새 단어를 이어가는 게임',
    icon: '🔗',
    color: 'from-blue-500 to-cyan-400',
    border: 'border-blue-500/30',
    glow: 'hover:shadow-blue-500/20',
    tag: '1인 이상',
  },
  {
    id: 'bingo' as GameId,
    title: '빙고게임',
    subtitle: 'Bingo',
    description: '4×4, 5×5, 6×6 빙고판을 선택하고 단어를 채워 빙고를 완성하세요',
    icon: '🎯',
    color: 'from-emerald-500 to-green-400',
    border: 'border-emerald-500/30',
    glow: 'hover:shadow-emerald-500/20',
    tag: '반 전체',
  },
  {
    id: 'speed' as GameId,
    title: '스피드게임',
    subtitle: 'Speed Game',
    description: '엑셀로 문제를 업로드하고 진행자가 정답 여부를 판정하는 팀 게임',
    icon: '⚡',
    color: 'from-yellow-500 to-orange-400',
    border: 'border-yellow-500/30',
    glow: 'hover:shadow-yellow-500/20',
    tag: '엑셀 업로드',
  },
  {
    id: 'wordsearch' as GameId,
    title: '낱말찾기',
    subtitle: 'Word Search',
    description: '격자 안에 숨겨진 단어를 찾아라! 10×10 ~ 30×30 선택 가능',
    icon: '🔍',
    color: 'from-purple-500 to-pink-400',
    border: 'border-purple-500/30',
    glow: 'hover:shadow-purple-500/20',
    tag: '난이도 선택',
  },
  {
    id: 'quiz' as GameId,
    title: '퀴즈맞추기',
    subtitle: 'Quiz Game',
    description: '4지선다 퀴즈! 문제 수와 시간을 설정하고 최고 점수에 도전하세요',
    icon: '❓',
    color: 'from-red-500 to-rose-400',
    border: 'border-red-500/30',
    glow: 'hover:shadow-red-500/20',
    tag: '엑셀 업로드',
  },
  {
    id: 'numguess' as GameId,
    title: '숫자맞추기',
    subtitle: 'Number Guess',
    description: '진행자가 1~100 사이 숫자를 정하면 학생이 힌트를 보며 맞추는 게임',
    icon: '🔢',
    color: 'from-indigo-500 to-violet-400',
    border: 'border-indigo-500/30',
    glow: 'hover:shadow-indigo-500/20',
    tag: '진행자 설정',
  },
];

export function GameHub() {
  const [activeGame, setActiveGame] = useState<GameId>('home');

  const goHome = () => setActiveGame('home');

  if (activeGame === 'wordchain') return <WordChain onBack={goHome} />;
  if (activeGame === 'bingo') return <BingoGame onBack={goHome} />;
  if (activeGame === 'speed') return <SpeedGame onBack={goHome} />;
  if (activeGame === 'wordsearch') return <WordSearch onBack={goHome} />;
  if (activeGame === 'quiz') return <QuizGame onBack={goHome} />;
  if (activeGame === 'numguess') return <NumberGuess onBack={goHome} />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
            <span className="text-lg font-bold text-primary" style={{ fontFamily: 'var(--font-fredoka)' }}>EiE</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-none" style={{ fontFamily: 'var(--font-fredoka)' }}>
              EiE Game Hub
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">English Academy Game Platform</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-12 text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-5">
          6 Games Available
        </div>
        <h2
          className="text-5xl font-bold text-foreground mb-4 text-balance"
          style={{ fontFamily: 'var(--font-fredoka)' }}
        >
          게임을 선택하세요
        </h2>
        <p className="text-muted-foreground text-lg">
          Select a game to start your English class activity
        </p>
      </div>

      {/* Game Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => setActiveGame(game.id)}
              className={`group relative text-left rounded-2xl border ${game.border} bg-card p-6 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl ${game.glow} shadow-md`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center text-2xl shadow-md flex-shrink-0`}>
                  {game.icon}
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-secondary/60 border border-border/50 rounded-full px-2.5 py-1">
                  {game.tag}
                </span>
              </div>
              <div className="mb-1 flex items-baseline gap-2">
                <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-fredoka)' }}>
                  {game.title}
                </h3>
                <span className="text-xs text-muted-foreground">{game.subtitle}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{game.description}</p>
              <div className={`mt-4 flex items-center gap-1.5 text-xs font-medium bg-gradient-to-r ${game.color} bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                <span>게임 시작하기</span>
                <span>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <footer className="text-center pb-8 text-muted-foreground text-sm">
        EiE Game Hub — English Academy Game Platform
      </footer>
    </div>
  );
}
