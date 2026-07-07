import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Layout from './components/Layout';
import SubjectsPage from './pages/SubjectsPage';
import GamesPage from './pages/GamesPage';
import AnalysisPage from './pages/AnalysisPage';
import ProfilePage from './pages/ProfilePage';
import LoginRegisterPage from './pages/LoginRegisterPage';
import AdminDirectoryPage from './pages/AdminDirectoryPage';
import StudentAnalysisPage from './pages/StudentAnalysisPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Routes>
            <Route path="/login" element={<LoginRegisterPage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/subjects" replace />} />
              <Route path="subjects" element={<SubjectsPage />} />
              <Route path="games" element={<GamesPage />} />
              <Route path="analysis" element={<AnalysisPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="admin" element={<AdminDirectoryPage />} />
              <Route path="admin/students/:id" element={<StudentAnalysisPage />} />
            </Route>
          </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
