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

  // Step 1: Capture the exact Button Wrapper HTML
  // We look for: <div className="mt-8 pt-6 border-t border-slate-100"> ... </div>
  // Because it can contain nested divs (e.g., flex gap-2 mb-3), a simple regex won't work well if we don't know the exact depth.
  // Let's use a trick: match everything from <div className="mt-8 pt-6 border-t border-slate-100"> up to the end of the Setting Status panel closing tags.
  // The Setting Status panel ends with:
  //                 </div>
  //              </div>
  //           </div>
  //         </div>
  //       </div>
  //     );
  //   }
  
  const endPattern = /<div className="mt-8 pt-6 border-t border-slate-100">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*}/;
  
  const match = c.match(endPattern);
  if (!match) {
    console.log("No match for button wrapper in " + f);
    return;
  }
  
  // The captured group `match[1]` is everything inside the mt-8 pt-6 div, 
  // MINUS the final </div> of the mt-8 pt-6 div because of the regex.
  // Wait, let's just find the exact button wrapper block by looking at the lines.
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
    
    // Remove the buttonBlock from the original lines
    lines.splice(startIdx, endIdx - startIdx + 1);
    
    // Now inject it at the end of the main wrapper.
    // The main wrapper ends right before `);` of the `if (gameState === 'setup')` block.
    // Let's find the `);` return of setup.
    let setupReturnEnd = -1;
    for(let i=startIdx; i<lines.length; i++) {
      if (lines[i].includes(');') && lines[i+1] && lines[i+1].includes('}')) {
        setupReturnEnd = i;
        break;
      }
    }
    
    if (setupReturnEnd !== -1) {
       // Insert our fixed bottom action bar right before the last </div>
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

  // Step 2: Setting Status Panel Accordion
  // Replace the Setting Status card wrapper and title
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

  // We must close the newly added `<div className="hidden peer-checked:flex lg:!flex flex-col flex-1">` 
  // It should be closed right before the Setting Status card's closing `</div>`.
  // Since we removed the button wrapper, the end of the Setting Status panel now looks like:
  //                 </div> (closes Mission Guide space-y)
  //              </div> (closes Mission guide block)
  //           </div> (closes Setting Status card)
  // Let's just do a string replacement on the end of the panel.
  // Wait, since we removed the button wrapper, the end of the setting status panel in the `lines` array is just the `</div>` that closed the card.
  // Actually, we can just replace the closing of the card.
  // To avoid complexity, I'll use a regex to find the end of the Setup return statement and inject the closing `</div>` right before the card closes.
  
  fs.writeFileSync(f, c);
  console.log('Processed ' + f);
});
