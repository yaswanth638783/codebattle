import { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import './scoreboard.css';

export default function Scoreboard() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const newSocket = io('http://localhost:8000');
    setSocket(newSocket);

    const fetchBattleHistory = async () => {
      try {
        const res = await axios.get('/users/battle-history', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setBattles(res.data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load battle history');
        setLoading(false);
      }
    };
    fetchBattleHistory();

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!socket) return;

    socket.on('battleCompleted', (completedBattle) => {
      setBattles(prev => {
        // Update existing battle or add new one
        const existingIndex = prev.findIndex(b => b._id === completedBattle._id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = completedBattle;
          return updated;
        }
        return [completedBattle, ...prev];
      });
    });

    return () => {
      socket.off('battleCompleted');
    };
  }, [socket]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return <div className="app-container">Loading battle history...</div>;
  }
  
  return (
    <div className="app-container scoreboard-container">
      <h1>Your Battle History</h1>
      
      {battles.length === 0 ? (
        <div className="no-battles">
          <p>You haven't participated in any battles yet.</p>
          <Link to="/join-room" className="btn-primary">
            Join a Battle
          </Link>
        </div>
      ) : (
        <div className="battle-list">
          {battles.map(battle => (
            <div key={battle._id} className="battle-card">
              <div className="battle-header">
                <h3>{battle.name}</h3>
                <span className="battle-date">
                  {new Date(battle.endedAt).toLocaleString()}
                </span>
              </div>
              
              <div className="battle-details">
                <p><strong>Duration:</strong> {formatTime((new Date(battle.endedAt) - new Date(battle.startedAt)) / 1000)}</p>
                <p><strong>Problems:</strong> {battle.problems.length}</p>
                <p><strong>Status:</strong> {battle.status === 'completed' ? 'Completed' : 'Ended'}</p>
              </div>
              
              <div className="scoreboard">
                <h4>Final Results</h4>
                {battle.scoreboard && battle.scoreboard.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Solved</th>
                        <th>Time</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {battle.scoreboard.map((entry, index) => (
                        <tr 
                          key={entry.user._id} 
                          className={entry.user._id === (user?._id || user?.id) ? 'current-user' : ''}
                        >
                          <td>{index + 1}</td>
                          <td>{entry.user.username} {entry.user._id === battle.creator._id && '(Creator)'}</td>
                          <td>{entry.solvedProblems}/{battle.problems.length}</td>
                          <td>{formatTime(entry.timeTaken)}</td>
                          <td>{entry.score.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No scoreboard data available</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}