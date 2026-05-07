import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getReadingLevels, addSingleReadingLevel, deleteReadingLevel, resetReadingLevels, uploadReadingLevels } from '../../lib/api';
import { BookOpen, Upload, Plus, Trash2, RefreshCw, Download, Clock } from 'lucide-react';

export default function AdminReadingLevelSetup() {
   const [questions, setQuestions] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [activeLevel, setActiveLevel] = useState(1);
   const [timeLimit, setTimeLimit] = useState(180);

   useEffect(() => {
      import('../../lib/api').then(api => {
         api.getGlobalSettings().then(settings => {
            if (settings && settings.reading_time_limit) {
               setTimeLimit(settings.reading_time_limit);
               localStorage.setItem('eie_time_limit_reading', String(settings.reading_time_limit));
            } else {
               const stored = localStorage.getItem('eie_time_limit_reading');
               if (stored) setTimeLimit(parseInt(stored, 10));
            }
         });
      });
   }, []);

   const handleTimeLimitChange = (val: number) => {
      setTimeLimit(val);
      localStorage.setItem('eie_time_limit_reading', String(val));
      import('../../lib/api').then(api => {
         api.updateGlobalSettings({ reading_time_limit: val });
      });
   };
   
   const [form, setForm] = useState({
      level: 1,
      word: '',
      choice0: '', choice1: '', choice2: '', choice3: '',
      answer: 0
   });

   const loadData = async () => {
      setIsLoading(true);
      const data = await getReadingLevels();
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

      const success = await addSingleReadingLevel(payload);
      if (success) {
         setForm({ ...form, word: '', choice0: '', choice1: '', choice2: '', choice3: '', answer: 0 });
         loadData();
      } else {
         alert('추가 실패');
      }
   };

   const handleDelete = async (id: number) => {
      if (!confirm('이 문제를 삭제하시겠습니까?')) return;
      const success = await deleteReadingLevel(id);
      if (success) loadData();
      else alert('삭제 실패');
   };

   const handleReset = async () => {
      if (!confirm('정말로 모든 리딩 레벨 문제를 초기화하시겠습니까? (복구 불가)')) return;
      const success = await resetReadingLevels();
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
               
               const sheetNumMatch = sheetName.replace(/[^0-9]/g, '');
               let currentLevel = sheetNumMatch ? parseInt(sheetNumMatch, 10) : 1;
               
               rows.forEach(row => {
                  if (row && row.length > 0) {
                     if (row[1] === undefined || row[1] === null || String(row[1]).trim() === '') return;
                     
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
                     let answerIndex = isNaN(rawAnswer) ? 0 : (rawAnswer > 0 ? rawAnswer - 1 : 0);
                     if (answerIndex < 0 || answerIndex > 3) answerIndex = 0;
                     
                     wList.push({ level, word, choices, answer: answerIndex });
                  }
               });
            });

            if (wList.length > 0) {
               setIsLoading(true);
               const success = await uploadReadingLevels(wList);
               if (success) {
                  alert(`총 ${wList.length}개의 리딩 문제가 성공적으로 업로드되었습니다.`);
                  loadData();
               } else {
                  const errorMsg = (window as any)._lastUploadError || '알 수 없는 오류';
                  alert(`업로드 실패: ${errorMsg}\n\n서버 통신 오류이거나 데이터 형식이 잘못되었을 수 있습니다.`);
                  setIsLoading(false);
               }
            } else {
               alert('유효한 데이터가 없습니다. (문제 값이 비어있지 않아야 합니다.)');
            }
         } catch (err) { alert('엑셀 파일 파싱 오류가 발생했습니다. 양식을 다시 확인해주세요.'); }
      };
      reader.readAsArrayBuffer(f);
      e.target.value = '';
   };

   const handleDownloadTemplate = () => {
      const header = ['레벨(1~7)', '문제내용', '보기1', '보기2', '보기3', '보기4', '정답번호(1~4)'];
      const exampleRow = [1, 'The cat sat on the mat. What did the cat sit on?', 'box', 'mat', 'chair', 'desk', 2];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([header, exampleRow]);
      XLSX.utils.book_append_sheet(wb, ws, '리딩레벨_양식');
      XLSX.writeFile(wb, '리딩레벨_업로드_양식.xlsx');
   };

   const filteredQuestions = questions.filter(q => q.level === activeLevel);

   return (
      <div className="animate-in fade-in duration-700 h-full flex flex-col min-h-0 w-full mx-auto font-sans">
         <header className="mb-6 flex items-center justify-between shrink-0">
            <div>
               <h1 className="text-3xl font-[1000] text-slate-900 tracking-tight leading-none mb-1">Reading Level Test Setup</h1>
               <p className="text-sm font-medium text-slate-400">리딩 레벨 테스트 문제를 수동 또는 일괄 등록할 수 있습니다.</p>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={handleDownloadTemplate} className="px-6 py-3 bg-white border border-emerald-200 text-emerald-600 rounded-2xl font-black text-xs shadow-sm hover:bg-emerald-50 hover:scale-105 transition-all flex items-center gap-2">
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
            {/* Left Column: Settings & Input Form */}
            <div className="flex flex-col gap-6 h-full min-h-0">
               {/* ⏱️ Time Limit Setting Card */}
               <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-6 shrink-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 shadow-sm">
                        <Clock className="w-5 h-5" />
                     </div>
                     <div>
                        <h3 className="text-sm font-[1000] text-slate-900 leading-none mb-1">제한시간 설정</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Time Limit</p>
                     </div>
                  </div>
                  <select 
                     value={timeLimit} 
                     onChange={e => handleTimeLimitChange(parseInt(e.target.value))} 
                     className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl text-xs font-[1000] text-amber-800 outline-none cursor-pointer focus:ring-2 focus:ring-amber-500/20"
                  >
                     <option value={60}>1분</option>
                     <option value={120}>2분</option>
                     <option value={180}>3분</option>
                     <option value={240}>4분</option>
                     <option value={300}>5분</option>
                  </select>
               </div>

               {/* Question Form */}
               <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col overflow-hidden flex-1 min-h-0">
                  <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3">
                     <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Plus className="w-5 h-5" /></div>
                     <div>
                        <h2 className="text-lg font-[1000] text-emerald-900 italic uppercase">Add Question</h2>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">새로운 문제 등록</p>
                     </div>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto space-y-5 custom-scrollbar-light">
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Level</label>
                        <select value={form.level} onChange={e => setForm({...form, level: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-black text-slate-700 outline-none focus:border-emerald-500">
                           {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>R{n}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Question Content</label>
                        <textarea value={form.word} onChange={e => setForm({...form, word: e.target.value})} placeholder="문제 문장을 입력하세요" rows={3} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 resize-none" />
                     </div>
                     <div className="pt-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Choices & Answer</label>
                        <div className="space-y-3">
                           {[0, 1, 2, 3].map(idx => (
                              <div key={idx} className="flex items-center gap-3">
                                 <input type="radio" name="answer" checked={form.answer === idx} onChange={() => setForm({...form, answer: idx})} className="w-5 h-5 text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                                 <input 
                                    value={(form as any)[`choice${idx}`]} 
                                    onChange={e => setForm({...form, [`choice${idx}`]: e.target.value})} 
                                    placeholder={`보기 ${idx + 1}`} 
                                    className={`flex-1 bg-white border ${form.answer === idx ? 'border-emerald-500 shadow-sm' : 'border-slate-200'} px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none`} 
                                 />
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t border-slate-100">
                     <button onClick={handleAddSingle} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all text-sm">
                        Create Question →
                     </button>
                  </div>
               </div>
            </div>

            {/* Right: Dictionary List */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col overflow-hidden h-full">
               <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white"><BookOpen className="w-5 h-5" /></div>
                     <div>
                        <h2 className="text-lg font-[1000] text-slate-800 italic uppercase">Questions Repository</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">수정 및 삭제 관리</p>
                     </div>
                  </div>
                  <div className="flex gap-1.5 bg-slate-200/60 p-1 rounded-2xl">
                     {[1,2,3,4,5,6,7].map(n => (
                        <button key={n} onClick={() => setActiveLevel(n)} className={`w-8 h-8 rounded-xl font-black text-xs transition-all ${activeLevel === n ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
                           R{n}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar-light">
                  {isLoading ? (
                     <div className="h-full flex flex-col items-center justify-center opacity-30">
                        <RefreshCw className="w-12 h-12 animate-spin mb-4" />
                        <span className="font-black italic uppercase tracking-widest">Retrieving Questions...</span>
                     </div>
                  ) : filteredQuestions.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                        <BookOpen className="w-16 h-16 mb-4" />
                        <span className="font-black italic uppercase tracking-widest">No Questions Registered</span>
                     </div>
                  ) : (
                     <div className="space-y-4">
                        {filteredQuestions.map((q, index) => (
                           <div key={q.id || index} className="p-6 bg-slate-50 hover:bg-slate-100/75 border border-slate-150 rounded-2xl transition-all flex items-start justify-between gap-6 group">
                              <div className="flex-1 space-y-3">
                                 <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-black uppercase">R{q.level} Level</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Q-{index+1}</span>
                                 </div>
                                 <h4 className="text-sm font-bold text-slate-800 leading-relaxed">{q.q}</h4>
                                 <div className="grid grid-cols-2 gap-2 text-xs">
                                    {q.choices.map((choice: string, cIdx: number) => (
                                       <div key={cIdx} className={`px-4 py-2 rounded-xl border ${q.answer === cIdx ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-white border-slate-100 text-slate-400'}`}>
                                          {cIdx + 1}. {choice}
                                       </div>
                                    ))}
                                 </div>
                              </div>
                              <button onClick={() => handleDelete(q.id)} className="p-3 bg-white hover:bg-rose-50 text-slate-300 hover:text-rose-500 border border-slate-100 rounded-xl transition-all shadow-sm">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
}
