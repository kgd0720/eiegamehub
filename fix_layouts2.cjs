const fs = require('fs');
const path = 'src/components';
const files = fs.readdirSync(path).filter(f => f.endsWith('.tsx') && !f.includes('WordLevel'));

files.forEach(file => {
  let content = fs.readFileSync(path + '/' + file, 'utf8');

  const setupIndex = content.indexOf("if (gameState === 'setup')");
  if (setupIndex !== -1) {
    let endSetupIndex = content.indexOf("if (gameState === 'done')");
    if (endSetupIndex === -1 || endSetupIndex < setupIndex) {
        endSetupIndex = content.indexOf("return (", setupIndex + 500);
    }
    if (endSetupIndex === -1) endSetupIndex = content.length;
    
    let setupContent = content.substring(setupIndex, endSetupIndex);
    
    // 1. Main padding horizontal reduction
    setupContent = setupContent.replace(/p-4 lg:p-5/g, 'py-5 px-2 lg:px-3 lg:py-5');
    setupContent = setupContent.replace(/p-5 lg:p-6/g, 'py-5 px-3 lg:px-4 lg:py-6');
    setupContent = setupContent.replace(/px-6 py-3/g, 'px-4 py-3'); // top header

    // 2. Reduce gap 
    setupContent = setupContent.replace(/gap-3 /g, 'gap-2 ');
    setupContent = setupContent.replace(/gap-3"/g, 'gap-2"');
    
    // 3. Shift ratio to 9:3 inside 12 col grid
    setupContent = setupContent.replace(/lg:grid-cols-11/g, 'lg:grid-cols-12');
    setupContent = setupContent.replace(/lg:col-span-8/g, 'lg:col-span-9');

    content = content.substring(0, setupIndex) + setupContent + content.substring(endSetupIndex);
  }
  
  fs.writeFileSync(path + '/' + file, content);
});
console.log('DONE');
