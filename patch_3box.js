const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetOpenGrid = `<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">`;
const replacementOpenGrid = `<div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">`;

const oldNav = `<div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-4 shadow-sm flex flex-col min-h-[240px]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-xl shadow-lg text-white">📈</div>
                  <div>
                    <h1 className="text-xl font-black italic text-rose-950 uppercase tracking-tighter leading-none">운영 캠퍼스 레벨 현황</h1>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3 flex-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lv => {
                    const count = (campusUsers || []).filter((u: any) => u.status === 'approved' && Number(u.level) === lv).length;
                    return (
                      <div key={lv} className="bg-white border border-rose-100 p-4 rounded-2xl flex flex-col items-center justify-center hover:border-amber-500 hover:shadow-lg transition-all group relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 group-hover:bg-orange-500 transition-colors" />
                        <span className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-tighter leading-none">LV.{lv}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black italic text-slate-800 group-hover:text-rose-600 transition-colors leading-none tracking-tighter">{count}</span>
                          <span className="text-[11px] font-black text-slate-300 group-hover:text-slate-500 transition-colors">개</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>`;

// Insert the third box just before the closing </div> of the grid.
const newPanel = `
              <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-4 shadow-sm flex flex-col min-h-[240px]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-xl shadow-lg text-white">🎮</div>
                  <div className="flex-1 flex items-center justify-between">
                    <h1 className="text-xl font-black italic text-rose-950 uppercase tracking-tighter leading-none">레벨별 단어/게임 저장수</h1>
                    {wordLevelStats && <span className="text-indigo-700 text-[10px] font-black px-3 py-1 rounded-lg bg-indigo-100 border border-indigo-200">TOTAL: {wordLevelStats.total}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3 flex-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lv => {
                    const count = wordLevelStats?.levelCounts[lv] || 0;
                    return (
                      <div key={lv} className="bg-white border border-rose-100 p-4 rounded-2xl flex flex-col items-center justify-center hover:border-indigo-500 hover:shadow-lg transition-all group relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 group-hover:bg-indigo-500 transition-colors" />
                        <span className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-tighter leading-none">LV.{lv}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black italic text-slate-800 group-hover:text-indigo-600 transition-colors leading-none tracking-tighter">{count}</span>
                          <span className="text-[10px] font-black text-slate-300 group-hover:text-slate-500 transition-colors">문제</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
`;

if (code.includes(targetOpenGrid)) {
    code = code.replace(targetOpenGrid, replacementOpenGrid);
    
    // Instead of exact string replacement with brittle whitespace matching, let's identify the end of the grid.
    // It's much safer to split around the region that draws "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lv => {"
    // The second map in the grid is for campus levels.
    
    // I can do a string index search.
    const searchString = "</div>\\n              </div>"; // finding the close of the 2nd card
    // Since whitespace might differ, let's do something cleaner:

    let lines = code.split('\\n');
    for (let i = 0; i < lines.length; i++) {
        // If we hit the third map logic or if we just insert it before `<div className="w-full bg-rose-50 border` which we added earlier.
        // Wait, the grid </div> closing tag is right before `<div className="w-full bg-rose-50 border` (the monthly stats).
        if (lines[i].includes('w-full bg-rose-50 border border-rose-100 rounded-[2.5rem] p-8 shadow-sm transition-shadow')) {
            // Find the </div> that closes the grid block. It should be right above.
            // Oh wait, the previous structure was: 
            // </div> (closes grid)
            // <div className="flex gap-4 mb-4"> (Oh wait, this was removed)
            // <div className="w-full bg-rose-50 ... "
        }
    }
}

// Let's use a simpler regex or exact match on stripped version.
let codeWithoutCR = code.replace(/\\r\\n/g, '\\n');
// We want to insert newPanel between the end of the "운영 캠퍼스 레벨 현황" div block and the closing </div> of the grid.
// Let's match the exact text of the 2nd block end.
const block2End = "개</span>\\n                        </div>\\n                      </div>\\n                    );\\n                  })}\\n                </div>\\n              </div>";

if (codeWithoutCR.includes(block2End)) {
    code = codeWithoutCR.replace(block2End, block2End + "\\n" + newPanel);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Patched successfully!");
} else {
    console.log("Could not find block2End");
}
