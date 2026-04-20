const fs = require('fs');
const path = 'src/components';
const files = fs.readdirSync(path).filter(f => f.endsWith('.tsx') && !f.includes('WordLevel'));

files.forEach(file => {
  let content = fs.readFileSync(path + '/' + file, 'utf8');
  content = content.replace(/max-w-\[1450px\]/g, 'max-w-[1160px]');
  content = content.replace(/w-\[92%\]/g, 'w-[75%]');
  fs.writeFileSync(path + '/' + file, content);
});
console.log('DONE');
