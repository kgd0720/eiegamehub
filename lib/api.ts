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
  const { error } = await supabase.from('users').insert({ ...user });
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
  const { error } = await supabase.from('campuses').insert([campus]);
  if (error) console.error('Error creating campus:', error);
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
  return data;
};

export const uploadWordLevels = async (words: any[]) => {
  // To avoid massive duplicates on re-upload, consider clearing first or handling upserts.
  // For now, straight insert as requested in original localstorage logic.
  await supabase.from('word_levels').delete().neq('level', 0); // Clear all
  const { error } = await supabase.from('word_levels').insert(words);
  if (error) console.error('Error uploading word levels:', error);
  return !error;
};
