import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://thjudrstjkmvsmftlamh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoanVkcnN0amttdnNtZnRsYW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDM1MzgsImV4cCI6MjA5MDc3OTUzOH0.ylkZmYxWFBpyQ7gGOEPF0Y3IJHsD8hf6a5DB2a_yH9k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkWordLevels() {
  console.log('Checking Word Levels in Supabase...');
  const { data, error } = await supabase.from('word_levels').select('level');
  if (error) {
    console.error('Error:', error);
    return;
  }

  const counts = data.reduce((acc, cur) => {
    acc[cur.level] = (acc[cur.level] || 0) + 1;
    return acc;
  }, {});

  console.log('Word levels count by level:', counts);
  console.log('Total count:', data.length);
}

checkWordLevels();
