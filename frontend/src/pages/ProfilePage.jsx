import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContextValue';
import axios from 'axios';
import { User, Phone, MapPin, Mail, Shield, Save, CheckCircle } from 'lucide-react';

const ProfilePage = () => {
  const { user, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    role: '',
    avatar_url: '',
    phone_number: '',
    address: ''
  });
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/auth/profile');
        setProfile({
          ...res.data,
          phone_number: res.data.phone_number || '',
          address: res.data.address || ''
        });
      } catch (error) {
        console.error('Error fetching profile', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    try {
      await axios.put('http://localhost:5000/api/auth/profile', {
        phone_number: profile.phone_number,
        address: profile.address
      });
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating profile', err);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 fade-in">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
           <User size={40} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Guest Profile</h2>
        <p className="text-gray-500 mb-8 max-w-md text-center">You are currently browsing anonymously. Log in to save your progress and manage your profile details.</p>
      </div>
    );
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading Profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in">
      
      {/* Header Banner */}
      <div className="relative h-48 rounded-2xl overflow-hidden bg-gradient-to-r from-brand-600 to-brand-400 shadow-sm">
         <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 relative -mt-24 z-10 mx-6">
         <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white object-cover" />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-brand-100 text-brand-600 flex items-center justify-center text-5xl font-bold">
                 {profile.username?.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div className="text-center sm:text-left flex-1 pt-2">
               <h1 className="text-3xl font-bold text-gray-900">{profile.username}</h1>
               <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-gray-600">
                  <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                     <Mail size={16} className="mr-2 text-gray-400" /> {profile.email}
                  </div>
                  <div className="flex items-center bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg border border-brand-100 font-medium capitalize">
                     <Shield size={16} className="mr-2" /> {profile.role}
                  </div>
               </div>
            </div>
            
            <button 
              onClick={logout}
              className="mt-4 sm:mt-2 px-6 py-2 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors"
            >
              Log Out
            </button>
         </div>

         <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Personal Details</h2>
            
            <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
               
               {successMessage && (
                  <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center fade-in">
                     <CheckCircle size={20} className="mr-2" />
                     {successMessage}
                  </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                       <User size={16} className="mr-2 text-gray-400"/> Google Account Name
                    </label>
                    <input disabled type="text" value={profile.username} className="block w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                       <Mail size={16} className="mr-2 text-gray-400"/> Primary Email
                    </label>
                    <input disabled type="text" value={profile.email} className="block w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed" />
                  </div>
               </div>

               <div className="space-y-6 pt-4 border-t border-gray-50">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                       <Phone size={16} className="mr-2 text-brand-500"/> Phone Number
                    </label>
                    <input 
                      type="tel" 
                      placeholder="+1 (555) 000-0000"
                      value={profile.phone_number} 
                      onChange={e => setProfile({...profile, phone_number: e.target.value})} 
                      className="block w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                       <MapPin size={16} className="mr-2 text-brand-500"/> Residential Address
                    </label>
                    <textarea 
                      rows="3"
                      placeholder="123 Education Lane, Learning City, State, ZIP"
                      value={profile.address} 
                      onChange={e => setProfile({...profile, address: e.target.value})} 
                      className="block w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none" 
                    ></textarea>
                  </div>
               </div>

               <div className="pt-4 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex items-center px-8 py-3 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-70"
                  >
                    {saving ? 'Saving...' : (
                      <>
                        <Save size={20} className="mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
               </div>
            </form>
         </div>

      </div>
    </div>
  );
};

export default ProfilePage;
