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
  // To avoid massive duplicates on re-upload, consider clearing first or handling upserts.
  // For now, straight insert as requested in original localstorage logic.
  const mappedWords = words.map(w => {
    const newW = { ...w, word: w.word || w.q };
    delete newW.q;
    return newW;
  });
  await supabase.from('word_levels').delete().neq('level', 0); // Clear all
  const { error } = await supabase.from('word_levels').insert(mappedWords);
  if (error) console.error('Error uploading word levels:', error);
  return !error;
};

// Game Settings API (Cloud Sync for gameReqLevels)
export const getGameSettings = async () => {
    const { data, error } = await supabase.from('game_settings').select('game_id, req_level');
    if (error) { console.error('Error fetching game settings:', error); return null; }
    // Convert array to record: { 'game-id': level }
    return (data || []).reduce((acc: any, cur: any) => {
        acc[cur.game_id] = cur.req_level;
        return acc;
    }, {});
};

export const updateGameSetting = async (gameId: string, reqLevel: number) => {
    const { error } = await supabase.from('game_settings')
        .upsert({ game_id: gameId, req_level: reqLevel }, { onConflict: 'game_id' });
    if (error) console.error('Error updating game setting:', error);
    return !error;
};
