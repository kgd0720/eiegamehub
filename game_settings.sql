-- 4. Game Settings Table (게임 권장 레벨 및 공통 설정)
CREATE TABLE IF NOT EXISTS public.game_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT UNIQUE NOT NULL,
  req_level INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) 설정
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read game_settings" ON public.game_settings FOR SELECT USING (true);
CREATE POLICY "Allow all insert game_settings" ON public.game_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update game_settings" ON public.game_settings FOR UPDATE USING (true);
CREATE POLICY "Allow all delete game_settings" ON public.game_settings FOR DELETE USING (true);

-- 기본 데이터 삽입 (기존 localStorage 기반 기본값 반영)
INSERT INTO public.game_settings (game_id, req_level)
VALUES 
  ('number-guess', 1),
  ('word-search', 2),
  ('word-chain', 3),
  ('bingo', 4),
  ('quiz', 5),
  ('speed-game', 6),
  ('word-certification', 7)
ON CONFLICT (game_id) DO NOTHING;
