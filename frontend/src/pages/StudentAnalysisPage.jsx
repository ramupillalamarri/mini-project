import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContextValue';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Gamepad2, Clock, BrainCircuit, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StudentAnalysisPage = () => {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(user?.role === 'teacher');

  useEffect(() => {
    if (user?.role !== 'teacher') {
      return;
    }

    const loadStudentData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/analytics/students/${id}`);
        setData(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [id, user]);

  if (user?.role !== 'teacher') return <Navigate to="/" />;

  if (loading) return <div className="text-center py-20 text-gray-500">Loading Analysis...</div>;
  if (!data) return <div className="text-center py-20 text-red-500">Failed to load student data.</div>;

  // Format Recharts data
  const chartData = data.pdf_progress.map(item => ({
    subject: item.subject || 'General',
    completed: parseInt(item.opened_resources) || 0,
    total: parseInt(item.total_resources) || 0
  }));

  return (
    <div className="space-y-6 fade-in">
      <Link to="/admin" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-brand-600 transition">
        <ArrowLeft size={16} className="mr-1" /> Back to Directory
      </Link>

      <div className="bg-white p-6 outline outline-1 outline-gray-200 rounded-2xl shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">{data.student.username}'s Progress</h1>
        <p className="text-sm text-gray-500">{data.student.email}</p>
      </div>


      {/* Understanding Analysis */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BrainCircuit className="text-brand-500" />
          AI Understanding Analysis
        </h2>
        {data?.understanding_analysis && data.understanding_analysis.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.understanding_analysis.map((analysis, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                 <div className="flex justify-between items-start mb-2">
                   <h4 className="font-bold text-gray-800">{analysis.topic}</h4>
                   {analysis.level === 'Excellent Mastery' && <Sparkles size={16} className="text-yellow-500" />}
                   {analysis.level === 'Good Understanding' && <CheckCircle size={16} className="text-green-500" />}
                   {analysis.level === 'Needs Improvement' && <AlertCircle size={16} className="text-red-500" />}
                 </div>
                 <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{
                   color: analysis.level === 'Excellent Mastery' ? '#eab308' : analysis.level === 'Good Understanding' ? '#22c55e' : analysis.level === 'Needs Improvement' ? '#ef4444' : '#94a3b8'
                 }}>
                   {analysis.level}
                 </div>
                 <p className="text-sm text-gray-600">{analysis.message}</p>
                 <div className="mt-3 text-xs text-gray-400 font-medium">Total Score: {analysis.score}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No game data to analyze yet.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PDF Subject Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <BookOpen size={20} className="mr-2 text-brand-500" />
            PDFs by Subject
          </h2>
          <div className="space-y-4">
            {data.pdf_progress.length === 0 ? (
              <p className="text-gray-500 text-sm">No PDF data recorded.</p>
            ) : (
              data.pdf_progress.map((prog, idx) => (
                <div key={idx} className="border-b border-gray-50 pb-3 last:border-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-800">{prog.subject || 'General'}</span>
                    <span className="text-sm text-brand-600 font-semibold">{prog.opened_resources} / {prog.total_resources} Completed</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div 
                      className="bg-brand-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${(parseInt(prog.opened_resources) / parseInt(prog.total_resources)) * 100 || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 flex items-center">
                    <Clock size={12} className="mr-1"/>
                    Time Spent: {Math.floor(prog.time_spent / 60)} mins
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chart Visualization */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[300px]">
           <h2 className="text-lg font-bold text-gray-900 mb-6">Subject Completion Chart</h2>
           {chartData.length > 0 ? (
             <ResponsiveContainer width="100%" height="80%">
               <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                 <XAxis type="number" hide />
                 <YAxis type="category" dataKey="subject" axisLine={false} tickLine={false} tick={{fill: '#4B5563', fontSize: 12}} width={80} />
                 <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                 <Bar dataKey="completed" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={24} name="PDFs Viewed" />
               </BarChart>
             </ResponsiveContainer>
           ) : (
             <div className="h-full flex items-center justify-center text-gray-400">Not enough data</div>
           )}
        </div>

        {/* Game Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Gamepad2 size={20} className="mr-2 text-purple-500" />
            Games by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.game_progress.length === 0 ? (
               <p className="text-gray-500 text-sm col-span-2">No game data recorded.</p>
            ) : (
              data.game_progress.map((gp, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                   <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{gp.title || gp.type || 'Standard'}</p>
                   <p className="text-2xl font-bold text-gray-900">{gp.total_score || 0}</p>
                   <p className="text-xs text-gray-400 mt-2">{gp.sessions_played} sessions</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentAnalysisPage;
