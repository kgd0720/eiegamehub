import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[pageerror] ${err.toString()}`));
  
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  
  const body = await page.evaluate(() => document.body.innerHTML);
  
  console.log('=== CONSOLE LOGS ===');
  console.log(logs.join('\n'));
  console.log('=== RENDERED BODY ===');
  console.log(body.substring(0, 1000));
  
  await browser.close();
})();
