import { supabase } from './supabase';

export interface SupabaseUser {
  id?: string;
  login_id: string;
  pw: string;
  name: string;
  role: 'hq' | 'campus';
  status: 'approved' | 'pending' | 'suspended';
  level: number;
  email?: string;
  phone?: string;
}

export interface SupabaseCampus {
  id?: string;
  region: string;
  name: string;
}

// Users API
export const getUsers = async () => {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Error fetching users:', error); return []; }
  return data.map((u: any) => ({ ...u, id: u.login_id, supa_id: u.id })); // Map login_id to id for UI compatibility
};

export const createUser = async (user: SupabaseUser) => {
  const { id, ...supabaseData } = user; // Omit 'id' as Supabase uses auto UUID
  const { error } = await supabase.from('users').insert(supabaseData);
  if (error) console.error('Error creating user:', error);
  return !error;
};

export const updateUserLevel = async (loginId: string, level: number, status: string) => {
  const { error } = await supabase.from('users').update({ level, status }).eq('login_id', loginId);
  if (error) console.error('Error updating user:', error);
  return !error;
};

export const updateUsersLevelBulk = async (loginIds: string[], level: number) => {
  if (!loginIds.length) return true;
  const { error } = await supabase.from('users').update({ level }).in('login_id', loginIds);
  if (error) console.error('Error bulk updating user levels:', error);
  return !error;
};

export const updateUserPassword = async (loginId: string, pw: string) => {
  const { error } = await supabase.from('users').update({ pw }).eq('login_id', loginId);
  if (error) console.error('Error updating pw:', error);
  return !error;
};

export const deleteUser = async (loginId: string) => {
  const { error } = await supabase.from('users').delete().eq('login_id', loginId);
  if (error) console.error('Error deleting user:', error);
  return !error;
};

// Campuses API
export const getCampuses = async () => {
  const { data, error } = await supabase.from('campuses').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Error fetching campuses:', error); return []; }
  return data;
};

export const createCampus = async (campus: SupabaseCampus) => {
  const { id, ...supabaseData } = campus; // Omit 'id'
  const { error } = await supabase.from('campuses').insert([supabaseData]);
  if (error) console.error('Error creating campus:', error);
  return !error;
};

export const createCampusesBulk = async (campuses: SupabaseCampus[]) => {
  if (!campuses.length) return true;
  const data = campuses.map(c => { const { id, ...rest } = c; return rest; });
  const { error } = await supabase.from('campuses').insert(data);
  if (error) console.error('Error bulk creating campuses:', error);
  return !error;
};

export const createUsersBulk = async (users: SupabaseUser[]) => {
  if (!users.length) return true;
  const data = users.map(u => { const { id, ...rest } = u; return rest; });
  const { error } = await supabase.from('users').insert(data);
  if (error) console.error('Error bulk creating users:', error);
  return !error;
};

export const deleteCampus = async (region: string, name: string) => {
  const { error } = await supabase.from('campuses').delete().match({ region, name });
  if (error) console.error('Error deleting campus:', error);
  return !error;
};

// Word Levels API (Optional helper if integrating game data)
export const getWordLevels = async () => {
  const { data, error } = await supabase.from('word_levels').select('*');
  if (error) { console.error('Error fetching word levels:', error); return []; }
  return data.map((item: any) => ({ ...item, q: item.word || item.q }));
};

export const uploadWordLevels = async (words: any[]) => {
  try {
    console.log('Starting bulk upload to word_levels. Total count:', words.length);

    // 1. Data Transformation: Map UI format to DB format
    const mappedWords = words.map(w => {
      // Input might have 'q' or 'word', map to 'word' for DB
      const wordValue = w.word || w.q || 'Unknown';

      // Ensure choices is a valid array of strings (Postgres JSONB)
      const choiceList = Array.isArray(w.choices)
        ? w.choices.map((c: any) => String(c || '').trim())
        : ['', '', '', ''];

      return {
        level: Number(w.level) || 1,
        word: String(wordValue).trim(),
        choices: choiceList,
        answer: Number(w.answer) ?? 0
      };
    });

    // 2. Clear Existing Data (Standard behavior for bulk sync)
    // We use .neq('level', 0) to essentially delete everything in public.word_levels
    const { error: delError } = await supabase.from('word_levels').delete().neq('level', 0);
    if (delError) {
      console.error('Database clean-up error:', delError);
      throw new Error(`DB_CLEANUP_FAILED: ${delError.message}`);
    }

    // 3. Chunked Bulk Insert (Prevents 413 Payload Too Large and Timeout)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < mappedWords.length; i += CHUNK_SIZE) {
      const chunk = mappedWords.slice(i, i + CHUNK_SIZE);
      console.log(`Uploading chunk: ${i} to ${i + chunk.length}...`);

      const { error: insError } = await supabase.from('word_levels').insert(chunk);
      if (insError) {
        console.error(`Database insert error at chunk starting at ${i}:`, insError);
        throw new Error(`DB_INSERT_FAILED: ${insError.message} (Code: ${insError.code})`);
      }
    }

    console.log('Bulk upload completed successfully.');
    return true;
  } catch (err: any) {
    console.error('UploadWordLevels Exception:', err);
    // Persist error for App.tsx to potentially display
    (window as any)._lastUploadError = err.message;
    return false;
  }
};

export const resetWordLevels = async () => {
  const { error } = await supabase.from('word_levels').delete().neq('id', 0);
  if (error) console.error('Error resetting word levels:', error);
  return !error;
};

export const addSingleWordLevel = async (wordData: any) => {
  const newW = { ...wordData, word: wordData.word || wordData.q };
  delete newW.q;
  const { error } = await supabase.from('word_levels').insert([newW]);
  if (error) console.error('Error adding single word level:', error);
  return !error;
};

// Game Settings API
export const getGameSettings = async () => {
  try {
    const { data, error } = await supabase.from('game_settings').select('*');
    if (error) return {}; // Silently fail if table missing
    return (data || []).reduce((acc: any, cur: any) => {
      if (!cur.game_id) return acc;
      acc[cur.game_id] = {
        req_level: cur.req_level || 1,
        level_order: cur.level_order || 0,
        is_active: cur.is_active ?? true
      };
      return acc;
    }, {});
  } catch (err) {
    return {};
  }
};

export const updateGameSetting = async (gameId: string, payload: { req_level?: number, level_order?: number, is_active?: boolean }) => {
  try {
    const { error } = await supabase.from('game_settings')
      .upsert({ game_id: gameId, ...payload }, { onConflict: 'game_id' });
    return !error; // Silently handle error (fail gracefully)
  } catch (err) {
    return false;
  }
};

export const bulkUpdateGameSettings = async (settings: any[]) => {
  const { error } = await supabase.from('game_settings').upsert(settings, { onConflict: 'game_id' });
  if (error) console.error('Error bulk updating game settings:', error);
  return !error;
};

// Tug of War Levels API
export const getTugOfWarLevels = async () => {
  const { data, error } = await supabase.from('tug_of_war_levels').select('*');
  if (error) { console.error('Error fetching tug of war levels:', error); return []; }
  return data;
};

export const uploadTugOfWarLevels = async (questions: any[]) => {
  try {
    const mapped = questions.map(q => ({
      level: Number(q.level) || 1,
      question: String(q.question).trim(),
      choices: Array.isArray(q.choices) ? q.choices.map((c: any) => String(c || '').trim()) : ['', '', '', ''],
      answer: Number(q.answer) ?? 0
    }));

    await supabase.from('tug_of_war_levels').delete().neq('level', 0);

    const CHUNK_SIZE = 500;
    for (let i = 0; i < mapped.length; i += CHUNK_SIZE) {
      const chunk = mapped.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('tug_of_war_levels').insert(chunk);
      if (error) throw error;
    }
    return true;
  } catch (err: any) {
    console.error('uploadTugOfWarLevels error:', err);
    (window as any)._lastUploadError = err.message;
    return false;
  }
};

export const resetTugOfWarLevels = async () => {
  const { error } = await supabase.from('tug_of_war_levels').delete().neq('level', 0);
  return !error;
};

// Admin Cleanup API
export const resetCampusesAndUsers = async () => {
  try {
    // 1. Delete all campuses
    // Using ilike %% to match all records reliably
    const { error: cErr } = await supabase.from('campuses').delete().ilike('region', '%%');
    if (cErr) console.error('Error resetting campuses:', cErr);

    // 2. Delete all campus-level users (Preserving HQ)
    const { error: uErr } = await supabase.from('users').delete().eq('role', 'campus');
    if (uErr) console.error('Error resetting users:', uErr);

    return !cErr && !uErr;
  } catch (err) {
    console.error('resetCampusesAndUsers Exception:', err);
    return false;
  }
};
