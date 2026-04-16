-- 1. 만약 이전 스키마에서 컬럼명이 'q'로 되어 있었다면, 'word'로 컬럼명을 변경합니다.
-- (아래 줄의 주석을 풀고 실행하세요. 'q' 컬럼이 아예 없다면 무시하세요)
-- ALTER TABLE public.word_levels RENAME COLUMN q TO word;

-- 2. 만약 'word' 컬럼이 아예 누락되어 있다면 새롭게 추가합니다.
ALTER TABLE public.word_levels ADD COLUMN IF NOT EXISTS word text;

-- (선택) 만약 기존 데이터에 NULL값이 허용되지 않도록 제약을 걸고 싶다면,
-- 모든 열에 기본값을 채운 후 NOT NULL 제약조건을 추가합니다.
-- UPDATE public.word_levels SET word = 'Unknown' WHERE word IS NULL;
-- ALTER TABLE public.word_levels ALTER COLUMN word SET NOT NULL;

-- 3. Supabase PostgREST 스키마 캐시 새로고침 (PGRST204 에러 해결)
NOTIFY pgrst, 'reload schema';
