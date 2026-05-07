import { useState, useEffect } from 'react';
import { Search, RefreshCw, Calendar, MapPin, User, Award, GraduationCap, Percent } from 'lucide-react';
import { getReadingLevelResults } from '../../lib/api';

interface TestResult {
   id: string;
   campus_id: string;
   campus_name: string;
   student_name: string;
   grade: string;
   final_level: number;
   score: number;
   total_questions: number;
   created_at: string;
}

export default function AdminReadingLevelResults() {
   const [results, setResults] = useState<TestResult[]>([]);
   const [filteredResults, setFilteredResults] = useState<TestResult[]>([]);
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
   const [isLoading, setIsLoading] = useState(false);

   const fetchResults = async () => {
      setIsLoading(true);
      try {
         const data = await getReadingLevelResults();
         setResults(data);
         setFilteredResults(data);
      } catch (err) {
         console.error('Error fetching reading level results:', err);
      } finally {
         setIsLoading(false);
      }
   };

   useEffect(() => {
      fetchResults();
   }, []);

   useEffect(() => {
      let filtered = results;

      if (searchTerm.trim() !== '') {
         const term = searchTerm.toLowerCase();
         filtered = filtered.filter(
            r =>
               r.student_name.toLowerCase().includes(term) ||
               r.campus_name.toLowerCase().includes(term) ||
               r.campus_id.toLowerCase().includes(term)
         );
      }

      if (selectedLevelFilter !== 'all') {
         const lvlNum = parseInt(selectedLevelFilter, 10);
         filtered = filtered.filter(r => r.final_level === lvlNum);
      }

      setFilteredResults(filtered);
   }, [searchTerm, selectedLevelFilter, results]);

   const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
   };

   return (
      <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-y-auto no-scrollbar font-sans bg-slate-50/50">
         {/* Top Header Section */}
         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
               <h1 className="text-3xl font-[1000] text-slate-900 tracking-tight flex items-center gap-2">
                  <GraduationCap className="w-8 h-8 text-emerald-600" />
                  Reading Level Test Results
               </h1>
               <p className="text-sm font-bold text-slate-500 mt-1">
                  전체 캠퍼스에서 진행된 리딩 레벨 테스트 완료 결과를 실시간으로 조회합니다.
               </p>
            </div>
            <button
               onClick={fetchResults}
               disabled={isLoading}
               className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
               <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
               새로고침
            </button>
         </div>

         {/* Filter Section */}
         <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
            {/* Search Input */}
            <div className="relative w-full md:flex-1">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input
                  type="text"
                  placeholder="참가자명 또는 캠퍼스명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
               />
            </div>

            {/* Level Selector */}
            <div className="w-full md:w-48">
               <select
                  value={selectedLevelFilter}
                  onChange={(e) => setSelectedLevelFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
               >
                  <option value="all">전체 레벨</option>
                  {[1, 2, 3, 4, 5, 6, 7].map(n => (
                     <option key={n} value={n}>R{n} 레벨</option>
                  ))}
               </select>
            </div>

            {/* Total Results Count */}
            <div className="text-sm font-black text-slate-400 px-4">
               TOTAL: <span className="text-emerald-600 font-[1000]">{filteredResults.length}</span>건
            </div>
         </div>

         {/* Results Table Section */}
         <div className="flex-1 min-h-[400px] bg-white border border-slate-100 rounded-[2rem] shadow-xl overflow-hidden flex flex-col">
            {isLoading ? (
               <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
                  <p className="text-sm font-black text-slate-400">결과 목록을 불러오는 중입니다...</p>
               </div>
            ) : filteredResults.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-slate-100">📂</div>
                  <p className="text-sm font-black">테스트 진행 결과가 존재하지 않습니다.</p>
               </div>
            ) : (
               <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                     <thead className="bg-slate-50/70 sticky top-0 z-10 shadow-sm">
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                           <th className="px-6 py-4 w-16 text-center border-b border-slate-100">No.</th>
                           <th className="px-6 py-4 border-b border-slate-100"><span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> 완료 시간</span></th>
                           <th className="px-6 py-4 border-b border-slate-100"><span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> 캠퍼스명</span></th>
                           <th className="px-6 py-4 border-b border-slate-100"><span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> 참가자명</span></th>
                           <th className="px-6 py-4 border-b border-slate-100">학년</th>
                           <th className="px-6 py-4 text-center border-b border-slate-100"><span className="flex items-center gap-1.5 justify-center"><Award className="w-3.5 h-3.5" /> 레벨</span></th>
                           <th className="px-6 py-4 text-center border-b border-slate-100"><span className="flex items-center gap-1.5 justify-center"><Percent className="w-3.5 h-3.5" /> 점수</span></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {filteredResults.map((r, idx) => (
                           <tr key={r.id || idx} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4 text-center text-xs font-black text-slate-300 italic">
                                 {String(idx + 1).padStart(2, '0')}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                 {formatDate(r.created_at)}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-800">{r.campus_name}</span>
                                    <span className="text-xs font-bold text-slate-400 mt-0.5">{r.campus_id}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-sm font-black text-slate-800">
                                 {r.student_name}
                              </td>
                              <td className="px-6 py-4 text-xs font-extrabold text-slate-500">
                                 {r.grade}
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-black text-xs shadow-sm">
                                    R{r.final_level} 레벨
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-black text-xs shadow-sm">
                                    {r.score !== undefined ? `${r.score} / ${r.total_questions || 3} 문제` : '-'}
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      </div>
   );
}
