import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import './waitingroom.css';

export default function WaitingRoom() {
  const { id: roomId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const newSocket = io('http://localhost:8000', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    const fetchRoom = async () => {
      try {
        const res = await axios.get(`/rooms/${roomId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!res.data) {
          throw new Error('Room not found');
        }

        setRoom(res.data);
        setLoading(false);
      } catch (error) {
        toast.error(error.message || 'Failed to load room');
        navigate('/');
      }
    };

    fetchRoom();

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, isAuthenticated, navigate]);

  useEffect(() => {
    if (!socket || !room) return;

    socket.emit('joinRoom', roomId);

    const handleRoomUpdated = (updatedRoom) => {
      if (!updatedRoom) return;
      setRoom(updatedRoom);
    };

    const handleBattleStarted = () => {
      navigate(`/battle-room/${roomId}`);
    };

    const handleRoomDeleted = () => {
      toast.error('Room was deleted by creator');
      navigate('/');
    };

    socket.on('roomUpdated', handleRoomUpdated);
    socket.on('battleStarted', handleBattleStarted);
    socket.on('roomDeleted', handleRoomDeleted);

    return () => {
      socket.off('roomUpdated', handleRoomUpdated);
      socket.off('battleStarted', handleBattleStarted);
      socket.off('roomDeleted', handleRoomDeleted);
      socket.emit('leaveRoom', roomId);
    };
  }, [socket, room, roomId, navigate]);

  const handleStartRoom = async () => {
    try {
      await axios.post('/rooms/start', { roomId }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start room');
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await axios.post('/rooms/leave', { roomId }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to leave room');
    }
  };

  if (!isAuthenticated || loading || !room) {
    return <div className="app-container">Loading...</div>;
  }

  const isCreator = room.creator._id.toString() === (user?._id || user?.id)?.toString();
  const participants = room.participants || [];
  const problems = room.problems || [];

  return (
    <div className="app-container waiting-room-container">
      <h1>Waiting Room: {room.name}</h1>
      
      <div className="room-details">
        <div className="participants-section">
          <h2>Participants ({participants.length}/{room.maxParticipants})</h2>
          <ul className="participants-list">
            {participants.map(participant => (
              <li 
                key={participant._id} 
                className={
                  participant._id.toString() === (user?._id || user?.id)?.toString() ? 'you' : 
                  participant._id.toString() === room.creator._id.toString() ? 'creator' : ''
                }
              >
                {participant.username} 
                {participant._id.toString() === room.creator._id.toString() && ' (Creator)'}
                {participant._id.toString() === (user?._id || user?.id)?.toString() && ' (You)'}
              </li>
            ))}
          </ul>
        </div>

        <div className="problems-section">
          <h2>Problems ({problems.length})</h2>
          <ul className="problems-list">
            {problems.map(problem => (
              <li key={problem._id}>
                {problem.title} ({problem.difficulty})
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="waiting-room-actions">
        {isCreator ? (
          <>
            <button 
              onClick={handleStartRoom} 
              className="btn-primary"
              disabled={participants.length < 2}
            >
              Start Battle
            </button>
            <button onClick={handleLeaveRoom} className="btn-secondary">
              Cancel Room
            </button>
            {participants.length < 2 && (
              <p className="warning-message">Need at least 2 participants to start</p>
            )}
          </>
        ) : (
          <button onClick={handleLeaveRoom} className="btn-secondary">
            Leave Room
          </button>
        )}
      </div>
    </div>
  );
}