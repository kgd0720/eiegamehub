import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:3000');
await page.waitForTimeout(2000);

const data = await page.evaluate(() => {
  const campuses = JSON.parse(localStorage.getItem('eie_campuses') || '[]');
  const users = JSON.parse(localStorage.getItem('eie_users_v2') || '[]');
  return { campuses, users };
});

fs.writeFileSync('localstorage_dump.json', JSON.stringify(data, null, 2), 'utf8');

console.log('=== CAMPUSES:', data.campuses.length);
console.log('=== USERS:', data.users.length);
const campusUsers = data.users.filter(u => u.role === 'campus');
console.log('=== CAMPUS USERS:', campusUsers.length);
console.log('=== APPROVED:', campusUsers.filter(u => u.status === 'approved').length);
console.log('=== PENDING:', campusUsers.filter(u => u.status === 'pending').length);

await browser.close();
