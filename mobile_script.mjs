import fs from "fs";
import path from "path";

const fp = path.join("src", "App.tsx");
let code = fs.readFileSync(fp, "utf-8");

// Fix App.tsx Lobby Responsive
code = code.replace(/text-4xl font-\[1000\] italic/g, "text-3xl lg:text-4xl font-[1000] italic");
code = code.replace(/<div className="space-y-8">/g, "<div className=\"space-y-6 lg:space-y-8\">");
code = code.replace(/px-8 py-5 rounded/g, "px-6 lg:px-8 py-4 lg:py-5 rounded");
code = code.replace(/px-10 border-l-\[12px\]/g, "px-6 lg:px-10 border-l-8 lg:border-l-[12px]");

// Convert Login div to form properly
code = code.replace(
    /<div className="space-y-6 lg:space-y-8">\n               <div className="space-y-2 group">/,
    "<form onSubmit={(e) => { e.preventDefault(); onLogin(id, pw); }} className=\"space-y-6 lg:space-y-8\">\n               <div className=\"space-y-2 group\">"
);

code = code.replace(
    /<button onClick=\{\(\) => onLogin\(id, pw\)\} \n                       className="w-full py-5/g,
    "<button type=\"submit\"\n                       className=\"w-full py-4 lg:py-5"
);

code = code.replace(
    /<\/button>\n\n               <div className="pt-4 text-center border-t border-slate-50">\n                  <button onClick=\{onGoSignup\} className="w-full py-5/g,
    "</button>\n\n               <div className=\"pt-4 text-center border-t border-slate-50\">\n                  <button type=\"button\" onClick={onGoSignup} className=\"w-full py-4 lg:py-5"
);

code = code.replace(
    /               <\/div>\n            <\/div>/g,
    "               </div>\n            </form>"
);

// Disable autoCapitalize on ID specifically
code = code.replace(/spellCheck=\{false\}\n                       className="w-full bg-slate-50 border-2 border-slate-50/g, "spellCheck={false} autoCapitalize=\"none\"\n                       className=\"w-full bg-slate-50 border-2 border-slate-50");

// Fix padding on admin dashboard
code = code.replace(/aside className="w-80 bg-white/g, "aside className=\"w-full lg:w-80 bg-white");
code = code.replace(/main className="flex-1 p-10/g, "main className=\"flex-1 p-4 lg:p-10");
code = code.replace(/grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8/g, "grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 mb-4 lg:mb-8");
code = code.replace(/div className="grid grid-cols-4 gap-2/g, "div className=\"grid grid-cols-2 sm:grid-cols-4 gap-2");
code = code.replace(/grid grid-cols-5 gap-3 flex-1/g, "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 flex-1");
code = code.replace(/h-\[200px\] flex items-end/g, "h-[120px] lg:h-[200px] flex items-end overflow-x-auto lg:overflow-visible overflow-hidden custom-scrollbar-light gap-2 lg:gap-4 px-4 lg:px-10");

// Also add a little padding to the admin nav
code = code.replace(/min-h-screen bg-\[#fff7f9\] text-slate-800 flex font-sans/g, "min-h-screen bg-[#fff7f9] text-slate-800 flex flex-col lg:flex-row font-sans");

fs.writeFileSync(fp, code);
console.log("Updated App.tsx");
