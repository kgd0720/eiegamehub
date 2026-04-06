import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://thjudrstjkmvsmftlamh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoanVkcnN0amttdnNtZnRsYW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDM1MzgsImV4cCI6MjA5MDc3OTUzOH0.ylkZmYxWFBpyQ7gGOEPF0Y3IJHsD8hf6a5DB2a_yH9k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('Testing bulk insert...');
  const testUser = {
     login_id: 'test_insert',
     pw: 'pw',
     name: 'Test',
     role: 'campus',
     status: 'approved',
     level: 1
  };
  const { error } = await supabase.from('users').insert([testUser]);
  if (error) {
     console.error('Insert Error:', JSON.stringify(error, null, 2));
  } else {
     console.log('Insert SUCCESS');
     await supabase.from('users').delete().eq('login_id', 'test_insert');
  }
}

testInsert();
