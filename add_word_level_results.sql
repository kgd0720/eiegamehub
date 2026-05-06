-- 1. Word Level Test Results Table 생성 (존재하지 않을 때)
CREATE TABLE IF NOT EXISTS public.word_level_results (
  id uuid default gen_random_uuid() primary key,
  campus_id text,
  campus_name text,
  student_name text not null,
  grade text,
  final_level integer not null,
  score integer default 0,
  total_questions integer default 20,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 만약 이미 테이블이 존재하는 경우, 누락된 컬럼 추가 (ALTER COLUMN)
ALTER TABLE public.word_level_results ADD COLUMN IF NOT EXISTS score integer default 0;
ALTER TABLE public.word_level_results ADD COLUMN IF NOT EXISTS total_questions integer default 20;

-- 2. RLS (Row Level Security) 설정 및 Policy 생성
ALTER TABLE public.word_level_results ENABLE ROW LEVEL SECURITY;

-- 기존 Policy 삭제
DROP POLICY IF EXISTS "Allow all read word_level_results" ON public.word_level_results;
DROP POLICY IF EXISTS "Allow all insert word_level_results" ON public.word_level_results;
DROP POLICY IF EXISTS "Allow all update word_level_results" ON public.word_level_results;
DROP POLICY IF EXISTS "Allow all delete word_level_results" ON public.word_level_results;

-- 새 Policy 추가
CREATE POLICY "Allow all read word_level_results" ON public.word_level_results FOR SELECT USING (true);
CREATE POLICY "Allow all insert word_level_results" ON public.word_level_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update word_level_results" ON public.word_level_results FOR UPDATE USING (true);
CREATE POLICY "Allow all delete word_level_results" ON public.word_level_results FOR DELETE USING (true);

-- 3. 스키마 캐시 새로고침
NOTIFY pgrst, 'reload schema';
