import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://thjudrstjkmvsmftlamh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoanVkcnN0amttdnNtZnRsYW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDM1MzgsImV4cCI6MjA5MDc3OTUzOH0.ylkZmYxWFBpyQ7gGOEPF0Y3IJHsD8hf6a5DB2a_yH9k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findAdmin() {
  const { data, error } = await supabase.from('users').select('*').eq('role', 'hq');
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}

findAdmin();
