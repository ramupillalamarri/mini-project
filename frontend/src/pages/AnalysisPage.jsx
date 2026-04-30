import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContextValue';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BrainCircuit, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

const AnalysisPage = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadAnalytics = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/analytics');
        setData(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center fade-in">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
           <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
           </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
        <p className="text-gray-500 max-w-md mb-6">You need to log in to track your learning progress and see your dynamic analytics dashboard.</p>
        <Link to="/login" className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition hover-lift">
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading Analytics...</div>;

  const formatChartData = () => {
    if (!data?.trends) return [];
    return data.trends.map(t => ({
      date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: parseInt(t.daily_score)
    }));
  };

  const chartData = formatChartData();

  return (
    <div className="space-y-6 fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Your Progress Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Learning Resources Completed</h3>
          <p className="text-3xl font-bold text-brand-600 mt-2">{data?.pdfs?.completed_pdfs || 0}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Game Score</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{data?.games?.total_score || 0}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BrainCircuit className="text-brand-500" />
          AI Understanding Analysis
        </h3>
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
          <p className="text-gray-500 text-sm">Play educational games to generate your understanding analysis.</p>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Trends (Last 7 Days)</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dx={-10} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            No game data available for the last 7 days.
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;
