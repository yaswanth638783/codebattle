import { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import './joinroom.css';

const socket = io('http://localhost:8000', {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default function JoinRoom() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchAvailableRooms();
    socket.on('connect_error', (err) => {
      console.log('Socket connection error:', err);
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    return () => {
      socket.off('connect_error');
      socket.off('connect');
    };
  }, [isAuthenticated, navigate]);

  const fetchAvailableRooms = async () => {
    try {
      const res = await axios.get('/rooms/available', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setRooms(res.data);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load available rooms');
      setLoading(false);
    }
  };

  const handleJoinRoom = (room) => {
    setSelectedRoom(room);
    setShowPasswordModal(true);
  };

  const joinRoom = async (roomId, roomPassword) => {
    setJoiningRoom(true);
    try {
      const res = await axios.post('/rooms/join', {
        roomId,
        password: roomPassword
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success('Successfully joined the room!');
      navigate(`/waiting-room/${roomId}`);
    } catch (error) {
      console.error('Join room error:', error);
      toast.error(error.response?.data?.error || 'Failed to join room');
    } finally {
      setJoiningRoom(false);
      setShowPasswordModal(false);
      setPassword('');
      setSelectedRoom(null);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error('Please enter the room password');
      return;
    }
    joinRoom(selectedRoom._id, password);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPassword('');
    setSelectedRoom(null);
  };

  const isUserInRoom = (room) => {
    return room.participants.some(participant => 
      participant._id === user?.id || participant._id === user?._id
    );
  };

  const canJoinRoom = (room) => {
    return room.participants.length < room.maxParticipants && 
           room.status === 'waiting' && 
           !isUserInRoom(room);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return <div className="app-container">Loading available rooms...</div>;
  }

  return (
    <div className="app-container join-room-container">
      <h1>Join a Room</h1>
      
      {rooms.length === 0 ? (
        <div className="no-rooms">
          <p>No rooms available at the moment.</p>
          <button 
            onClick={() => navigate('/create-room')} 
            className="btn-primary"
          >
            Create a Room
          </button>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map(room => (
            <div key={room._id} className="room-card">
              <div className="room-header">
                <h3>{room.name}</h3>
                <span className="password-icon">🔒</span>
              </div>
              
              <div className="room-info">
                <p><strong>Creator:</strong> {room.creator.username}</p>
                <p><strong>Participants:</strong> {room.participants.length}/{room.maxParticipants}</p>
                <p><strong>Time Limit:</strong> {room.timeLimit} minutes</p>
                <p><strong>Problems:</strong> {room.problems?.length || 0}</p>
              </div>

              <div className="participants-preview">
                <strong>Players:</strong>
                <div className="participants-list">
                  {room.participants.map(participant => (
                    <span key={participant._id} className="participant-tag">
                      {participant.username}
                    </span>
                  ))}
                </div>
              </div>

              <div className="room-actions">
                {isUserInRoom(room) ? (
                  <button 
                    onClick={() => navigate(`/waiting-room/${room._id}`)}
                    className="btn-secondary"
                  >
                    Return to Room
                  </button>
                ) : canJoinRoom(room) ? (
                  <button 
                    onClick={() => handleJoinRoom(room)}
                    className="btn-primary"
                    disabled={joiningRoom}
                  >
                    {joiningRoom ? 'Joining...' : 'Join Room'}
                  </button>
                ) : (
                  <button className="btn-disabled" disabled>
                    {room.participants.length >= room.maxParticipants ? 'Room Full' : 'Cannot Join'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Enter Room Password</h3>
            <p>Room: {selectedRoom?.name}</p>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="password-input"
                autoFocus
                required
              />
              <div className="modal-actions">
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={joiningRoom}
                >
                  {joiningRoom ? 'Joining...' : 'Join Room'}
                </button>
                <button 
                  type="button" 
                  onClick={closePasswordModal}
                  className="btn-secondary"
                  disabled={joiningRoom}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="join-room-footer">
        <button 
          onClick={() => navigate('/create-room')} 
          className="btn-secondary"
        >
          Create New Room
        </button>
        <button 
          onClick={fetchAvailableRooms} 
          className="btn-secondary"
        >
          Refresh Rooms
        </button>
      </div>
    </div>
  );
}