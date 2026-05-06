import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getWordLevels, addSingleWordLevel, deleteWordLevel, resetWordLevels, uploadWordLevels } from '../../lib/api';
import { BookOpen, Upload, Plus, Trash2, RefreshCw, Download } from 'lucide-react';

export default function AdminWordLevelSetup() {
   const [questions, setQuestions] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [activeLevel, setActiveLevel] = useState(1);
   
   const [form, setForm] = useState({
      level: 1,
      word: '',
      choice0: '', choice1: '', choice2: '', choice3: '',
      answer: 0
   });

   const loadData = async () => {
      setIsLoading(true);
      const data = await getWordLevels();
      setQuestions(data || []);
      setIsLoading(false);
   };

   useEffect(() => {
      loadData();
   }, []);

   const handleAddSingle = async () => {
      if (!form.word.trim()) return alert('문제를 입력해주세요.');
      if (!form.choice0 || !form.choice1 || !form.choice2 || !form.choice3) return alert('모든 보기를 입력해주세요.');
      
      const payload = {
         level: form.level,
         word: form.word,
         choices: [form.choice0, form.choice1, form.choice2, form.choice3],
         answer: form.answer
      };

      const success = await addSingleWordLevel(payload);
      if (success) {
         setForm({ ...form, word: '', choice0: '', choice1: '', choice2: '', choice3: '', answer: 0 });
         loadData();
      } else {
         alert('추가 실패');
      }
   };

   const handleDelete = async (id: number) => {
      if (!confirm('이 문제를 삭제하시겠습니까?')) return;
      const success = await deleteWordLevel(id);
      if (success) loadData();
      else alert('삭제 실패');
   };

   const handleReset = async () => {
      if (!confirm('정말로 모든 단어 레벨 문제를 초기화하시겠습니까? (복구 불가)')) return;
      const success = await resetWordLevels();
      if (success) loadData();
      else alert('초기화 실패');
   };

   const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
         try {
            const data = evt.target?.result;
            const wb = XLSX.read(data, { type: 'array' });
            const wList: any[] = [];
            
            wb.SheetNames.forEach(sheetName => {
               const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheetName], { header: 1 }).slice(1);
               
               // 시트 이름에서 숫자를 추출하여 기본 레벨로 사용 시도
               const sheetNumMatch = sheetName.replace(/[^0-9]/g, '');
               let currentLevel = sheetNumMatch ? parseInt(sheetNumMatch, 10) : 1;
               
               rows.forEach(row => {
                  if (row && row.length > 0) {
                     if (row[1] === undefined || row[1] === null || String(row[1]).trim() === '') return;
                     
                     // 엑셀에서 레벨을 한 번만 쓰고 아래는 비워두는 경우를 위해,
                     // 값이 있으면 currentLevel 갱신, 없으면 이전 값 유지
                     const levelStr = String(row[0] || '').replace(/[^0-9]/g, '');
                     const parsedLevel = parseInt(levelStr, 10);
                     if (!isNaN(parsedLevel) && parsedLevel >= 1) {
                        currentLevel = parsedLevel;
                     }
                     
                     const level = currentLevel;
                     const word = String(row[1]).trim();
                     const choices = [
                        String(row[2] || ''),
                        String(row[3] || ''),
                        String(row[4] || ''),
                        String(row[5] || '')
                     ];
                     let rawAnswer = parseInt(row[6]);
                     // 1~4번 입력을 0~3 인덱스로 변환. (혹시 0으로 넣었더라도 0으로 처리)
                     let answerIndex = isNaN(rawAnswer) ? 0 : (rawAnswer > 0 ? rawAnswer - 1 : 0);
                     if (answerIndex < 0 || answerIndex > 3) answerIndex = 0;
                     
                     wList.push({ level, word, choices, answer: answerIndex });
                  }
               });
            });

            if (wList.length > 0) {
               setIsLoading(true);
               const success = await uploadWordLevels(wList);
               if (success) {
                  alert(`총 ${wList.length}개의 문제가 성공적으로 업로드되었습니다.`);
                  loadData();
               } else {
                  const errorMsg = (window as any)._lastUploadError || '알 수 없는 오류';
                  alert(`업로드 실패: ${errorMsg}\n\n서버 통신 오류이거나 데이터 형식이 잘못되었을 수 있습니다.`);
                  setIsLoading(false);
               }
            } else {
               alert('유효한 데이터가 없습니다. (단어 값이 비어있지 않아야 합니다.)');
            }
         } catch (err) { alert('엑셀 파일 파싱 오류가 발생했습니다. 양식을 다시 확인해주세요.'); }
      };
      reader.readAsArrayBuffer(f);
      e.target.value = '';
   };

   const handleDownloadTemplate = () => {
      const header = ['레벨(1~12)', '단어(문제)', '보기1', '보기2', '보기3', '보기4', '정답번호(1~4)'];
      const exampleRow = [1, 'Apple', '사과', '바나나', '포도', '오렌지', 1];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([header, exampleRow]);
      XLSX.utils.book_append_sheet(wb, ws, '단어레벨_양식');
      XLSX.writeFile(wb, '단어레벨_업로드_양식.xlsx');
   };

   const filteredQuestions = questions.filter(q => q.level === activeLevel);

   return (
      <div className="animate-in fade-in duration-700 h-full flex flex-col min-h-0 w-full mx-auto">
         <header className="mb-6 flex items-center justify-between shrink-0">
            <div>
               <h1 className="text-3xl font-[1000] text-slate-900 tracking-tight leading-none mb-1">Word Level Test Setup</h1>
               <p className="text-sm font-medium text-slate-400">단어 레벨 테스트 문제를 수동 또는 일괄 등록할 수 있습니다.</p>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={handleDownloadTemplate} className="px-6 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-2xl font-black text-xs shadow-sm hover:bg-indigo-50 hover:scale-105 transition-all flex items-center gap-2">
                  <Download className="w-4 h-4" /> 양식 다운로드
               </button>
               <label className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-lg hover:scale-105 transition-all cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4" /> 일괄 등록 (엑셀)
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
               </label>
               <button onClick={handleReset} className="px-6 py-3 bg-white border border-rose-200 text-rose-500 rounded-2xl font-black text-xs shadow-sm hover:bg-rose-50 hover:scale-105 transition-all flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> 전체 초기화
               </button>
            </div>
         </header>

         <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
            {/* Left: Input Form */}
            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col overflow-hidden h-full">
               <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Plus className="w-5 h-5" /></div>
                  <div>
                     <h2 className="text-lg font-[1000] text-indigo-900 italic uppercase">Add Question</h2>
                     <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">새로운 문제 등록</p>
                  </div>
               </div>
               <div className="p-6 flex-1 overflow-y-auto space-y-5 custom-scrollbar-light">
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Level</label>
                     <select value={form.level} onChange={e => setForm({...form, level: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-black text-slate-700 outline-none focus:border-indigo-500">
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>E{n}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Question Word</label>
                     <input value={form.word} onChange={e => setForm({...form, word: e.target.value})} placeholder="문제 단어를 입력하세요" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-black text-slate-700 outline-none focus:border-indigo-500" />
                  </div>
                  <div className="pt-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Choices & Answer</label>
                     <div className="space-y-3">
                        {[0, 1, 2, 3].map(idx => (
                           <div key={idx} className="flex items-center gap-3">
                              <input type="radio" name="answer" checked={form.answer === idx} onChange={() => setForm({...form, answer: idx})} className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                              <input 
                                 value={(form as any)[`choice${idx}`]} 
                                 onChange={e => setForm({...form, [`choice${idx}`]: e.target.value})} 
                                 placeholder={`보기 ${idx + 1}`} 
                                 className={`flex-1 bg-white border ${form.answer === idx ? 'border-indigo-500 shadow-sm' : 'border-slate-200'} px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none`} 
                              />
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
               <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <button onClick={handleAddSingle} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all text-sm">
                     등록하기
                  </button>
               </div>
            </div>

            {/* Right: Question List */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col overflow-hidden h-full">
               <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
                     {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <button key={n} onClick={() => setActiveLevel(n)} className={`px-4 py-2 rounded-xl text-[11px] font-black shrink-0 transition-all ${activeLevel === n ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                           E{n}
                        </button>
                     ))}
                  </div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-200">
                     Total: {filteredQuestions.length} Questions
                  </div>
               </div>
               
               <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar-light relative">
                  {isLoading ? (
                     <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
                  ) : filteredQuestions.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 p-10 text-center">
                        <BookOpen className="w-16 h-16 mb-4" />
                        <p className="font-black italic uppercase tracking-widest">No Questions Found for E{activeLevel}</p>
                     </div>
                  ) : (
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-white sticky top-0 z-10 shadow-sm">
                           <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                              <th className="px-4 py-4 w-12 text-center border-b border-slate-100">No.</th>
                              <th className="px-4 py-4 w-32 border-b border-slate-100">Question</th>
                              <th className="px-2 py-4 text-center border-b border-slate-100">Choice 1</th>
                              <th className="px-2 py-4 text-center border-b border-slate-100">Choice 2</th>
                              <th className="px-2 py-4 text-center border-b border-slate-100">Choice 3</th>
                              <th className="px-2 py-4 text-center border-b border-slate-100">Choice 4</th>
                              <th className="px-4 py-4 w-12 text-center border-b border-slate-100">Ans</th>
                              <th className="px-4 py-4 w-16 text-center border-b border-slate-100">Action</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {filteredQuestions.map((q, idx) => (
                              <tr key={q.id || idx} className="hover:bg-slate-50 transition-colors group">
                                 <td className="px-4 py-4 text-center text-xs font-black text-slate-300 italic">{String(idx + 1).padStart(2, '0')}</td>
                                 <td className="px-4 py-4 text-sm font-black text-slate-800">{q.word || q.q}</td>
                                 {[0, 1, 2, 3].map((i) => {
                                    const c = q.choices?.[i] || '';
                                    const isAnswer = q.answer === i;
                                    return (
                                       <td key={i} className="px-2 py-4 text-center">
                                          {c && (
                                             <div className={`px-2 py-1.5 text-[11px] font-bold rounded-lg border inline-block w-full break-keep ${isAnswer ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'bg-white border-slate-200 text-slate-500'}`}>
                                                {c}
                                             </div>
                                          )}
                                       </td>
                                    );
                                 })}
                                 <td className="px-4 py-4 text-center">
                                     <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center mx-auto shadow-md">
                                        {q.answer !== undefined && q.answer !== null ? q.answer + 1 : '-'}
                                     </div>
                                 </td>
                                 <td className="px-4 py-4 text-center">
                                    <button onClick={() => handleDelete(q.id)} className="w-8 h-8 flex items-center justify-center bg-white border border-rose-200 text-rose-500 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm mx-auto">
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
}
