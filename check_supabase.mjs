import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://thjudrstjkmvsmftlamh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoanVkcnN0amttdnNtZnRsYW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDM1MzgsImV4cCI6MjA5MDc3OTUzOH0.ylkZmYxWFBpyQ7gGOEPF0Y3IJHsD8hf6a5DB2a_yH9k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDb() {
  console.log('Checking Supabase DB...');
  const { data: users, error: uError } = await supabase.from('users').select('*');
  if (uError) console.error('Users error:', uError);
  console.log('Users count:', users ? users.length : 0);

  const { data: campuses, error: cError } = await supabase.from('campuses').select('*');
  if (cError) console.error('Campuses error:', cError);
  console.log('Campuses count:', campuses ? campuses.length : 0);
}

checkDb();
