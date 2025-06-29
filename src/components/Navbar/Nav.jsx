import { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Nav.css';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInBattleRoom, setIsInBattleRoom] = useState(false);

  useEffect(() => {
    const path = location.pathname;
    setIsInBattleRoom(
      path.includes('/waiting-room') || 
      path.includes('/battle-room') ||
      path.includes('/join-room')
    );
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLeaveRoom = () => {
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-gray-900 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 nav-logo">
            <Link to="/" className="text-2xl font-bold text-white">
              CodeBattle
            </Link>
          </div>
          <button className="menu-toggle" onClick={toggleMenu}>
            ☰
          </button>
          <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            {isAuthenticated ? (
              <>
                <span className="nav-welcome">
                  Welcome, {user?.username || user?.userName || 'User'}
                </span>
                
                {isInBattleRoom ? (
                  <>
                    <button onClick={handleLeaveRoom} className="nav-link">
                      Leave Room
                    </button>
                    <button onClick={handleLogout} className="btn-primary">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/profile" className="nav-link">
                      My Profile
                    </Link>
                    <Link to="/create-room" className="nav-link">
                      Create Room
                    </Link>
                    <Link to="/join-room" className="nav-link">
                      Join Room
                    </Link>
                    <Link to="/scoreboard" className="nav-link">
                      Scoreboard
                    </Link>
                    <button onClick={handleLogout} className="btn-primary">
                      Logout
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">
                  Login
                </Link>
                <Link to="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}