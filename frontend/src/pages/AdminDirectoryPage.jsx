import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContextValue';
import { Link, Navigate } from 'react-router-dom';
import { UserPlus, ChevronRight } from 'lucide-react';

const AdminDirectoryPage = () => {
  const { user } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const shouldRedirect = user?.role !== 'teacher';

  useEffect(() => {
    if (shouldRedirect) return;

    const loadStudents = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/analytics/students');
        setStudents(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [shouldRedirect]);

  if (shouldRedirect) return <Navigate to="/" />;

  const handlePromote = async (e, studentId, studentName) => {
    e.preventDefault();
    e.stopPropagation(); // Prevents routing to student profile
    if (!window.confirm(`Promote ${studentName} to Teacher role?`)) return;

    try {
      await axios.put('http://localhost:5000/api/auth/promote', { student_id: studentId });
      // Remove them from the students list visually
      setStudents(students.filter(s => s.id !== studentId));
    } catch (err) {
      console.error(err);
      alert('Failed to promote user.');
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading Directory...</div>;

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-white p-6 outline outline-1 outline-gray-200 rounded-2xl shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Student Directory</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your students and promote teachers.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
        {students.length === 0 ? (
           <div className="p-8 text-center text-gray-500">No students currently registered.</div>
        ) : (
          students.map(student => (
            <div key={student.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between group">
              <Link to={`/admin/students/${student.id}`} className="flex items-center flex-1 min-w-0 pr-4">
                {student.avatar_url ? (
                  <img src={student.avatar_url} alt="avatar" className="w-10 h-10 rounded-full shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 font-bold">
                    {student.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="ml-4 truncate">
                  <p className="text-sm font-medium text-gray-900 truncate">{student.username}</p>
                  <p className="text-sm text-gray-500 truncate">{student.email}</p>
                </div>
              </Link>
              <div className="flex items-center space-x-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                   onClick={(e) => handlePromote(e, student.id, student.username)}
                   className="flex items-center text-xs font-medium text-brand-600 hover:text-brand-800 bg-brand-50 px-3 py-1.5 rounded-lg"
                 >
                    <UserPlus size={14} className="mr-1" /> Promote
                 </button>
                 <Link to={`/admin/students/${student.id}`} className="text-gray-400 hover:text-gray-600">
                    <ChevronRight size={20} />
                 </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDirectoryPage;
