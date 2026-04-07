import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://thjudrstjkmvsmftlamh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoanVkcnN0amttdnNtZnRsYW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDM1MzgsImV4cCI6MjA5MDc3OTUzOH0.ylkZmYxWFBpyQ7gGOEPF0Y3IJHsD8hf6a5DB2a_yH9k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function syncWordLevels() {
  console.log('Launching browser to extract word levels from localStorage...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to the app
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);

  // Extract from localStorage
  const wordLevels = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('eie_word_level_dict') || '[]');
  });

  await browser.close();

  if (!wordLevels || wordLevels.length === 0) {
    console.log('No word levels found in localStorage.');
    return;
  }

  console.log(`Found ${wordLevels.length} word levels. Saving to word_levels.json...`);
  fs.writeFileSync('word_levels.json', JSON.stringify(wordLevels, null, 2), 'utf8');

  console.log('Pushing to Supabase (word_levels table)...');
  // Clean up existing first
  await supabase.from('word_levels').delete().neq('level', 0);
  
  // Insert in batches if needed, but for now straight insert
  const { error } = await supabase.from('word_levels').insert(
    wordLevels.map(w => ({ ...w, word: w.word || w.q }))
  );

  if (error) {
    console.error('Supabase Error:', error);
  } else {
    console.log('Successfully synced to Supabase!');
  }
}

syncWordLevels();
