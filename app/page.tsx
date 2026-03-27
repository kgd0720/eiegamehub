'use client';

import dynamic from 'next/dynamic';

const GameHub = dynamic(() => import('@/components/game/game-hub').then(mod => mod.GameHub), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center animate-pulse">
          <span className="text-3xl">🎮</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">EiE Game Hub</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
});

export default function Page() {
  return <GameHub />;
}
