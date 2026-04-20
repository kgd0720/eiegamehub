const fs = require('fs');
const path = 'src/components';
const files = fs.readdirSync(path).filter(f => f.endsWith('.tsx') && f !== 'WordLevel.tsx');

files.forEach(file => {
  let content = fs.readFileSync(path + '/' + file, 'utf8');

  // 1. Width - Change max-w-[1166px] to max-w-[1450px]
  content = content.replace(/max-w-\[1166px\]/g, 'max-w-[1450px]');
  
  // Apply w-[92%] explicitly to the setup wrapper. 
  content = content.replace(/mx-auto w-full h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1/g, 'mx-auto w-[92%] h-full flex flex-col animate-in fade-in duration-500 font-sans text-slate-800 p-1');

  // Find setup block to safely replace inner classes
  const setupIndex = content.indexOf("if (gameState === 'setup')");
  if (setupIndex !== -1) {
    let endSetupIndex = content.indexOf("if (gameState === 'done')");
    if (endSetupIndex === -1 || endSetupIndex < setupIndex) {
        endSetupIndex = content.indexOf("return (", setupIndex + 500);
    }
    if (endSetupIndex === -1) endSetupIndex = content.length;
    
    let setupContent = content.substring(setupIndex, endSetupIndex);
    
    // 2. Padding Reduction
    setupContent = setupContent.replace(/rounded-\[2rem\] p-6/g, 'rounded-[2rem] p-4 lg:px-5');
    setupContent = setupContent.replace(/rounded-\[2rem\] p-8/g, 'rounded-[2rem] p-5 lg:px-6');
    
    // 3. Inner grid ratio: 12 -> 11, col-4 -> 3
    setupContent = setupContent.replace(/lg:grid-cols-12/g, 'lg:grid-cols-11');
    setupContent = setupContent.replace(/lg:col-span-4/g, 'lg:col-span-3');

    content = content.substring(0, setupIndex) + setupContent + content.substring(endSetupIndex);
  }
  
  fs.writeFileSync(path + '/' + file, content);
});
console.log('DONE');
