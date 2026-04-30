import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextValue';
import axios from 'axios';
import { BookOpen, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const LoginRegisterPage = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = React.useState('');

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;
      const response = await axios.post('http://localhost:5000/api/auth/google', { credential });
      
      if (response.data.token) {
        login(response.data.token, response.data.user);
        navigate('/');
      }
    } catch (err) {
      setError('Authentication failed. Please check your credentials and try again.');
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md fade-in">
        <div className="flex justify-center text-brand-600">
            <BookOpen size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign In to LearnApp
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join the learning platform today using your Google Account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="bg-white py-10 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100 flex flex-col items-center">
          
          {error && (
            <div className="mb-6 w-full p-3 text-sm rounded border bg-red-50 text-red-700 border-red-200 flex items-center">
              <AlertCircle size={16} className="mr-2 min-w-[16px]" />
              {error}
            </div>
          )}

          <div className="w-full flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                setError('Google Login window was closed or failed.');
              }}
              useOneTap
              shape="rectangular"
              theme="outline"
              size="large"
            />
          </div>
          
           <div className="mt-8 flex justify-center w-full border-t border-gray-100 pt-6 space-x-4">
             <button 
                type="button" 
                onClick={() => navigate('/')} 
                className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
             >
                 Continue as Guest
             </button>
             <button 
                type="button" 
                onClick={async () => {
                  try {
                    const res = await axios.post('http://localhost:5000/api/auth/dev-login');
                    login(res.data.token, res.data.user);
                    navigate('/');
                  } catch (e) {
                    setError('Dev login failed');
                  }
                }}
                className="text-sm font-medium text-brand-500 hover:text-brand-700 hover:underline"
             >
                 Dev Login (Agent)
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginRegisterPage;
