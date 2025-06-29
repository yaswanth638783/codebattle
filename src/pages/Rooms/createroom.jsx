import { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './createroom.css';

export default function CreateRoom() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    maxParticipants: 2,
    timeLimit: 30,
    selectedProblems: []
  });
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchProblems = async () => {
      try {
        const res = await axios.get('/problems');
        setProblems(res.data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load problems');
        setLoading(false);
      }
    };
    fetchProblems();
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleProblemSelect = (problemId) => {
    setFormData(prev => {
      if (prev.selectedProblems.includes(problemId)) {
        return {
          ...prev,
          selectedProblems: prev.selectedProblems.filter(id => id !== problemId)
        };
      } else {
        return {
          ...prev,
          selectedProblems: [...prev.selectedProblems, problemId]
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.selectedProblems.length === 0) {
      toast.error('Please select at least one problem');
      return;
    }

    try {
      const res = await axios.post('/rooms', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Room created successfully!');
      navigate(`/waiting-room/${res.data.room._id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create room');
    }
  };

  if (!isAuthenticated) {
    return null; 
  }

  if (loading) {
    return <div className="app-container">Loading problems...</div>;
  }

  return (
    <div className="app-container create-room-container">
      <h1>Create a New Room</h1>
      <form onSubmit={handleSubmit} className="room-form">
        <div className="form-group">
          <label htmlFor="name">Room Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            minLength="3"
            maxLength="50"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password (optional)</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            maxLength="20"
          />
        </div>

        <div className="form-group">
          <label htmlFor="maxParticipants">Max Participants</label>
          <select
            id="maxParticipants"
            name="maxParticipants"
            value={formData.maxParticipants}
            onChange={handleChange}
          >
            {[2, 3, 4, 5, 6].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="timeLimit">Time Limit (minutes)</label>
          <select
            id="timeLimit"
            name="timeLimit"
            value={formData.timeLimit}
            onChange={handleChange}
          >
            {[15, 30, 45, 60, 90, 120].map(minutes => (
              <option key={minutes} value={minutes}>{minutes}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Select Problems (Select at least one)</label>
          <div className="problems-list">
            {problems.map(problem => (
              <div key={problem._id} className="problem-checkbox">
                <input
                  type="checkbox"
                  id={`problem-${problem._id}`}
                  checked={formData.selectedProblems.includes(problem._id)}
                  onChange={() => handleProblemSelect(problem._id)}
                />
                <label htmlFor={`problem-${problem._id}`}>
                  {problem.title} ({problem.difficulty})
                </label>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary">
          Create Room
        </button>
      </form>
    </div>
  );
}