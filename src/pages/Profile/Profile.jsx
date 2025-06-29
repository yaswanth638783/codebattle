import { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Profile.css';

export default function Profile() {
  const { isAuthenticated, userName, logout } = useAuth();
  const [userData, setUserData] = useState(null);
  const [solvedProblems, setSolvedProblems] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      const fetchData = async () => {
        try {
          const userRes = await axios.get('/profile', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          setUserData(userRes.data);
          
          const solvedRes = await axios.get('/submissions/stats', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          setSolvedProblems(solvedRes.data.solvedCount);
        } catch (error) {
          toast.error('Failed to load profile data');
          if (error.response?.status === 401) {
            logout();
            navigate('/login');
          }
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isAuthenticated, logout, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <h1>Profile</h1>
        <p>Please log in to view your profile.</p>
        <div className="auth-links">
          <Link to="/login" className="btn-primary">Log In</Link>
          <Link to="/signup" className="btn-primary">Sign Up</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-container">
        <h1>Profile</h1>
        <p>Loading profile data...</p>
      </div>
    );
  }

  return (
    <div className="app-container profile-container">
      <h1 className="profile-heading">{userName}'s Profile</h1>
      
      <div className="profile-section">
        <div className="profile-info">
          <h2>User Information</h2>
          <div className="info-item">
            <span className="info-label">Username:</span>
            <span className="info-value">{userData.username}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Email:</span>
            <span className="info-value">{userData.email}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Member since:</span>
            <span className="info-value">
              {new Date(userData.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="stats-section">
          <h2>Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{solvedProblems}</div>
              <div className="stat-label">Problems Solved</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{userData.stats?.totalBattles || 0}</div>
              <div className="stat-label">Total Battles</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{userData.stats?.totalWins || 0}</div>
              <div className="stat-label">Battles Won</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {userData.stats?.averageScore?.toFixed(1) || 0}
              </div>
              <div className="stat-label">Average Score</div>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <Link to="/" className="btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}