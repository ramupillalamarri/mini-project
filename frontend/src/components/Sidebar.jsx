import { useContext } from 'react';
import { BookOpen, Gamepad2, BarChart2, User, LogOut, PanelLeftClose, PanelLeft, Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextValue';
import clsx from 'clsx';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);

  const navItems = [
    { path: '/subjects', label: 'Subjects', icon: <BookOpen size={20} /> },
    { path: '/games', label: 'Games', icon: <Gamepad2 size={20} /> },
    { path: '/analysis', label: 'Analysis', icon: <BarChart2 size={20} /> },
    { path: '/profile', label: 'Profile', icon: <User size={20} /> }
  ];

  if (user && user.role === 'teacher') {
    navItems.push({ path: '/admin', label: 'Teacher Panel', icon: <Shield size={20} /> });
  }

  return (
    <aside 
      className={clsx(
        "fixed md:relative top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-white border-r border-gray-200 flex flex-col shadow-lg md:shadow-none",
        isOpen ? "w-64 translate-x-0" : "w-16 -translate-x-full md:translate-x-0"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {isOpen && <span className="text-xl font-bold text-brand-600 truncate fade-in">LearnApp</span>}
        <button 
          onClick={toggleSidebar}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hidden md:block transition-colors"
        >
          {isOpen ? <PanelLeftClose size={24} /> : <PanelLeft size={24} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => clsx(
              "flex items-center px-4 py-3 text-gray-700 transition-colors duration-200 group relative",
              isActive ? "bg-brand-50 text-brand-600 border-r-4 border-brand-500" : "hover:bg-gray-50 hover:text-gray-900"
            )}
            title={!isOpen ? item.label : undefined}
          >
            <div className="flex items-center justify-center min-w-[24px]">{item.icon}</div>
            <span 
              className={clsx(
                "ml-4 whitespace-nowrap transition-opacity duration-200", 
                isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden md:block"
              )}
            >
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {user && isOpen && (
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <LogOut size={18} className="mr-2" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
