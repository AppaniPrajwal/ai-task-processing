import { NavLink, useNavigate } from 'react-router-dom';
import { Activity, LogOut, Plus, List } from 'lucide-react';

export default function Navbar({ setToken }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Activity color="var(--primary)" />
        <span>AI Task Hub</span>
      </div>
      
      <div className="nav-links">
        <NavLink 
          to="/tasks" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <List size={18} /> Recent Tasks
        </NavLink>
        <NavLink 
          to="/new-task" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Plus size={18} /> New Task
        </NavLink>
      </div>

      <button className="btn btn-secondary nav-logout-btn" onClick={handleLogout}>
        <LogOut size={18} style={{ marginRight: '0.5rem' }} /> Logout
      </button>
    </nav>
  );
}
