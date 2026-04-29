const fs = require('fs');

const files = [
  'src/components/SpeedGame.tsx',
  'src/components/BingoGame.tsx',
  'src/components/WordSearch.tsx',
  'src/components/NumberGuess.tsx',
  'src/components/BalloonGame.tsx',
  'src/components/QuizGame.tsx',
  'src/components/WordChain.tsx',
  'src/components/TugOfWarGame.tsx'
];

const remMap = {
  '7px': '0.4375rem',
  '8px': '0.5rem',
  '9px': '0.5625rem',
  '10px': '0.625rem',
  '11px': '0.6875rem',
  '12px': '0.75rem',
  '13px': '0.8125rem',
  '14px': '0.875rem',
  '18px': '1.125rem',
  '24px': '1.5rem',
  '100px': '6.25rem'
};

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  // Replace font sizes
  c = c.replace(/text-\[(\d+px)\]/g, (match, pxStr) => {
    return remMap[pxStr] ? `text-[${remMap[pxStr]}]` : match;
  });

  // Replace card paddings
  c = c.replace(/rounded-\[2\.5rem\] p-6/g, 'rounded-[2.5rem] px-6 py-4');

  // Replace main wrapper heights
  c = c.replace(/h-full flex flex-col/g, 'h-[calc(100vh-100px)] flex flex-col');

  fs.writeFileSync(f, c);
  console.log('Processed ' + f);
});
