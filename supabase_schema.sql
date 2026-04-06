-- 1. Users Table (캠퍼스 및 HQ 계정)
CREATE TABLE public.users (
  id uuid default gen_random_uuid() primary key,
  login_id text unique not null,
  pw text not null,
  name text not null,
  role text not null check (role in ('hq', 'campus')),
  status text not null check (status in ('approved', 'pending', 'suspended')),
  level integer default 1,
  email text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Campuses Table (등록된 캠퍼스 목록)
CREATE TABLE public.campuses (
  id uuid default gen_random_uuid() primary key,
  region text not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(region, name)
);

-- 3. Word Level Dictionary Table (단어장 데이터)
CREATE TABLE public.word_levels (
  id uuid default gen_random_uuid() primary key,
  level integer not null,
  word text not null,
  choices jsonb not null,
  answer integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) 설정
-- 테스트 및 빠른 개발을 위해 현재는 모든 접근을 허용합니다. (추후 보안 적용 필요)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow all insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Allow all delete users" ON public.users FOR DELETE USING (true);

CREATE POLICY "Allow all read campuses" ON public.campuses FOR SELECT USING (true);
CREATE POLICY "Allow all insert campuses" ON public.campuses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update campuses" ON public.campuses FOR UPDATE USING (true);
CREATE POLICY "Allow all delete campuses" ON public.campuses FOR DELETE USING (true);

CREATE POLICY "Allow all read word_levels" ON public.word_levels FOR SELECT USING (true);
CREATE POLICY "Allow all insert word_levels" ON public.word_levels FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update word_levels" ON public.word_levels FOR UPDATE USING (true);
CREATE POLICY "Allow all delete word_levels" ON public.word_levels FOR DELETE USING (true);
