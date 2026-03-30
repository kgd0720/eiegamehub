
import fs from "fs";
import path from "path";

const files = [
  "QuizGame.tsx", "BingoGame.tsx", "SpeedGame.tsx", "WordChain.tsx", "WordSearch.tsx", "NumberGuess.tsx"
];

for (const f of files) {
  const fp = path.join("src", "components", f);
  if (!fs.existsSync(fp)) continue;
  let code = fs.readFileSync(fp, "utf-8");

  // Fix grid layouts
  code = code.replace(/grid grid-cols-12 gap-3 items-stretch flex-1 overflow-hidden/g, "grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch flex-1 overflow-y-auto lg:overflow-hidden custom-scrollbar-light pb-10 lg:pb-0");
  code = code.replace(/col-span-12 lg:col-span-8 flex flex-col gap-3 overflow-hidden/g, "col-span-1 lg:col-span-8 flex flex-col gap-3 overflow-visible lg:overflow-hidden");
  code = code.replace(/col-span-12 lg:col-span-4 flex flex-col gap-3 overflow-hidden/g, "col-span-1 lg:col-span-4 flex flex-col gap-3 overflow-visible lg:overflow-hidden");
  code = code.replace(/col-span-12 lg:col-span-4 flex flex-col gap-3"/g, "col-span-1 lg:col-span-4 flex flex-col gap-3 overflow-visible lg:overflow-hidden\"");

  // Fix overly large text on mobile
  code = code.replace(/\btext-7xl\b/g, "text-5xl lg:text-7xl");
  code = code.replace(/\btext-6xl\b/g, "text-4xl lg:text-6xl");
  code = code.replace(/\btext-\[100px\]\b/g, "text-[60px] lg:text-[100px]");
  code = code.replace(/\btext-5xl\b/g, "text-3xl lg:text-5xl");
  
  // Fix specific game layouts
  code = code.replace(/\.grid-cols-2/g, ".grid-cols-1 md:grid-cols-2");
  code = code.replace(/<div className="grid grid-cols-2 gap-3">/g, "<div className=\"grid grid-cols-1 sm:grid-cols-2 gap-3\">");
  
  // Update App.tsx logic if needed, but not here
  
  // Specific padding/sizing adjustments
  code = code.replace(/px-10 py-6/g, "px-6 lg:px-10 py-4 lg:py-6");
  code = code.replace(/rounded-\[4rem\]/g, "rounded-[3rem] lg:rounded-[4rem]");
  code = code.replace(/rounded-\[5rem\]/g, "rounded-[3rem] lg:rounded-[5rem]");
  code = code.replace(/p-16/g, "p-8 lg:p-16");
  code = code.replace(/p-10/g, "p-6 lg:p-10");
  code = code.replace(/p-12/g, "p-8 lg:p-12");
  
  fs.writeFileSync(fp, code);
  console.log(`Updated ${f}`);
}

