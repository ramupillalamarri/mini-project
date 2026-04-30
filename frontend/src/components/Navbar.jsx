import { useContext } from 'react';
import { Menu, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextValue';

const Navbar = ({ toggleSidebar }) => {
  const { user } = useContext(AuthContext);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar}
          className="p-2 mr-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors md:hidden"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center lg:hidden">
            <span className="text-xl font-bold text-brand-600 ml-2">LearnApp</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-400 rounded-full hover:bg-gray-100 transition-colors">
          <Bell size={20} />
        </button>
        
        {user ? (
          <Link to="/profile" className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 text-brand-700">
              {user.username.charAt(0).toUpperCase()}
            </div>
          </Link>
        ) : (
          <Link 
            to="/login"
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm hover-lift"
          >
            Log In
          </Link>
        )}
      </div>
    </header>
  );
};

export default Navbar;
