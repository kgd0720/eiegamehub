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

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');

  const lines = c.split('\n');
  let startIdx = -1;
  let endIdx = -1;
  let braces = 0;
  
  for(let i=0; i<lines.length; i++) {
    if (lines[i].includes('<div className="mt-8 pt-6 border-t border-slate-100">')) {
      startIdx = i;
      braces = 1;
      for(let j=i+1; j<lines.length; j++) {
        if (lines[j].includes('<div')) braces += (lines[j].match(/<div/g) || []).length;
        if (lines[j].includes('</div')) braces -= (lines[j].match(/<\/div/g) || []).length;
        if (braces === 0) {
          endIdx = j;
          break;
        }
      }
      break;
    }
  }

  if (startIdx !== -1 && endIdx !== -1) {
    const buttonBlock = lines.slice(startIdx, endIdx + 1).join('\n');
    
    // Replace the button block with the closing div for the accordion
    lines.splice(startIdx, endIdx - startIdx + 1, '  </div> {/* End accordion content */}');
    
    // Find where the setup block ends to inject the action bar
    let setupReturnEnd = -1;
    for(let i=startIdx; i<lines.length; i++) {
      if (lines[i].includes(');') && lines[i+1] && lines[i+1].includes('}')) {
        setupReturnEnd = i;
        break;
      }
    }
    
    if (setupReturnEnd !== -1) {
       const actionBar = `
        {/* Fixed Bottom Action Bar */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 -mx-4 -mb-1 mt-auto z-50 flex flex-col items-center shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
           <div className="w-full max-w-4xl mx-auto">
${buttonBlock.replace('<div className="mt-8 pt-6 border-t border-slate-100">', '<div className="flex flex-col gap-2">')}
           </div>
        </div>
`;
       // Find the last </div> before setupReturnEnd
       let lastDivIdx = setupReturnEnd - 1;
       while(lastDivIdx > 0 && !lines[lastDivIdx].includes('</div>')) {
         lastDivIdx--;
       }
       lines.splice(lastDivIdx, 0, actionBar);
    }
  }

  c = lines.join('\n');

  // Replace the Setting Status title with the accordion toggle
  c = c.replace(/<div className="bg-white border border-slate-200 rounded-\[2\.5rem\] px-6 py-4 shadow-sm flex flex-col h-full overflow-y-auto">\s*<div className="mb-6">\s*<h2 className="(.*?flex items-center gap-2)">([\s\S]*?)<\/h2>/, 
    (match, h2Class, h2Inner) => {
      const id = `setting-accordion-${f.split('/').pop().replace('.tsx','')}`;
      return `<div className="bg-white border border-slate-200 rounded-[2.5rem] px-6 py-4 shadow-sm flex flex-col h-full overflow-y-auto">
  <input type="checkbox" id="${id}" className="peer hidden" />
  <label htmlFor="${id}" className="mb-6 cursor-pointer lg:cursor-default flex items-center justify-between">
    <h2 className="${h2Class}">${h2Inner}</h2>
    <span className="text-slate-400 peer-checked:rotate-180 transition-transform lg:hidden">▼</span>
  </label>
  <div className="hidden peer-checked:flex lg:!flex flex-col flex-1">
    <div className="mb-6">`;
    }
  );
  
  fs.writeFileSync(f, c);
  console.log('Processed ' + f);
});
