import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import Editor from '@monaco-editor/react';
import './battleroom.css';

const languageOptions = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
];

export default function BattleRoom() {
  const { id: roomId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [battleState, setBattleState] = useState('waiting');
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [results, setResults] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [userCompletedAll, setUserCompletedAll] = useState(false);
  const [completedParticipants, setCompletedParticipants] = useState([]);
  const [scoreboard, setScoreboard] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const endBattle = useCallback(async () => {
    if (battleState === 'completed') return;
    
    try {
      await axios.post(`/rooms/${roomId}/end`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to end battle');
    }
  }, [roomId, battleState]);

  const handleLeaveBattle = async () => {
    try {
      await axios.post('/rooms/leave', { roomId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to leave battle');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    socketRef.current = io('http://localhost:8000', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const fetchRoom = async () => {
      try {
        const res = await axios.get(`/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!res.data) throw new Error('Room not found');
        
        setRoom(res.data);
        setBattleState(res.data.status);
        setCompletedParticipants(res.data.completedParticipants || []);
        
        if (res.data.status === 'active') {
          const endTime = new Date(new Date(res.data.startedAt).getTime() + res.data.timeLimit * 60000);
          setTimeLeft(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
        }
        
        setLoading(false);
      } catch (error) {
        toast.error(error.message || 'Failed to load room');
        navigate('/');
      }
    };

    fetchRoom();

    socketRef.current.on('battleStarted', (roomData) => {
      setRoom(roomData);
      setBattleState('active');
      const endTime = new Date(new Date(roomData.startedAt).getTime() + roomData.timeLimit * 60000);
      setTimeLeft(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    });

    socketRef.current.on('submissionUpdate', (result) => {
      setResults(prev => [...prev, result]);
    });

    socketRef.current.on('userCompletedBattle', (data) => {
      setCompletedParticipants(prev => [...prev, data.userId]);
      if (data.userId === (user?._id || user?.id)) {
        setUserCompletedAll(true);
        setShowLeaveModal(true);
      }
      toast(`${data.username} has completed all problems!`);
    });

    socketRef.current.on('scoreboardUpdate', (updatedScoreboard) => {
      setScoreboard(updatedScoreboard);
    });

    socketRef.current.on('battleCompleted', (data) => {
      setBattleState('completed');
      setScoreboard(data.scoreboard);
      const userResult = data.scoreboard.find(entry => 
        entry.user._id === (user?._id || user?.id)
      );
      setUserCompletedAll(userResult?.solvedProblems === room?.problems?.length);
    });

    socketRef.current.on('roomStillActive', () => {
      setBattleState('active');
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId, isAuthenticated, navigate, user]);

  useEffect(() => {
    if (battleState === 'active' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            endBattle();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [battleState, timeLeft, endBattle]);

  const handleSubmit = async () => {
    if (userCompletedAll) {
      toast('You have already completed all problems');
      return;
    }
    
    if (!room?.problems?.[currentProblemIndex] || submitting || battleState !== 'active') return;
    
    try {
      setSubmitting(true);
      
      if (!code.trim()) {
        toast.error('Please write some code before submitting');
        return;
      }

      const problemId = room.problems[currentProblemIndex]._id;
      
      const res = await axios.post(
        `/rooms/${roomId}/submit`,
        {
          problemId,
          code,
          language
        },
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (res.data.status === 'error') {
        throw new Error(res.data.message || 'Submission failed');
      }

      const result = {
        ...res.data,
        problemIndex: currentProblemIndex,
        problemTitle: room.problems[currentProblemIndex].title
      };
      
      setResults(prev => [...prev, result]);
      toast.success(res.data.message || 'Submission successful!');

      // Move to next problem if solved and not last problem
      if (res.data.status === 'Solved') {
        if (currentProblemIndex < room.problems.length - 1) {
          setCurrentProblemIndex(prev => prev + 1);
          const defaultCode = {
            javascript: '// Write your solution here',
            python: '# Write your solution here',
            java: '// Write your solution here',
            c: '// Write your solution here',
            cpp: '// Write your solution here',
          };
          setCode(defaultCode[language]);
        } else {
          setUserCompletedAll(true);
          setShowLeaveModal(true);
          toast.success('You have completed all problems! You may leave the battle now.');
        }
      }

    } catch (error) {
      console.error('Submission error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 
                 error.response?.data?.message || 
                 error.message || 
                 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (room?.problems?.[currentProblemIndex]) {
      const defaultCode = {
        javascript: '// Write your solution here',
        python: '# Write your solution here',
        java: '// Write your solution here',
        c: '// Write your solution here',
        cpp: '// Write your solution here',
      };
      setCode(defaultCode[language]);
    }
  }, [currentProblemIndex, room, language]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isAuthenticated || loading) {
    return <div className="app-container">Loading...</div>;
  }

  if (!room) {
    return <div className="app-container">Room not found</div>;
  }

  if (battleState === 'waiting') {
    return <div className="app-container">Waiting for battle to start...</div>;
  }

  if (battleState === 'completed') {
    return (
      <div className="app-container battle-room-container">
        <h1>Battle Results: {room.name}</h1>
        {userCompletedAll && <div className="success-banner">You solved all problems!</div>}
        
        <div className="scoreboard">
          <h2>Final Scoreboard</h2>
          {scoreboard?.length > 0 ? (
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
                {scoreboard.map((entry, index) => (
                  <tr key={entry.user._id} className={entry.user._id === (user?._id || user?.id) ? 'current-user' : ''}>
                    <td>{index + 1}</td>
                    <td>{entry.user.username} {entry.user._id === room.creator._id && '(Creator)'}</td>
                    <td>{entry.solvedProblems}/{room.problems.length}</td>
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

        <button onClick={() => navigate('/')} className="btn-primary">
          Return to Home
        </button>
      </div>
    );
  }

  const currentProblem = room.problems[currentProblemIndex];

  return (
    <div className="app-container battle-room-container">
      {showLeaveModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Congratulations!</h3>
            <p>You've completed all problems in this battle.</p>
            <p>You may leave now or stay to see others' progress.</p>
            <div className="modal-actions">
              <button 
                onClick={handleLeaveBattle}
                className="btn-primary"
              >
                Leave Battle
              </button>
              <button 
                onClick={() => setShowLeaveModal(false)}
                className="btn-secondary"
              >
                Stay and Watch
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="battle-header">
        <h1>Battle: {room.name}</h1>
        <div className="timer">
          Time Remaining: {formatTime(timeLeft)}
        </div>
      </div>

      <div className="battle-content">
        {!userCompletedAll ? (
          <>
            <div className="problem-section">
              <h2>Problem {currentProblemIndex + 1} of {room.problems.length}</h2>
              <h3>{currentProblem.title} ({currentProblem.difficulty})</h3>
              <div className="problem-description">
                {currentProblem.description}
              </div>
              
              <h4>Test Cases:</h4>
              <ul className="test-cases">
                {currentProblem.testCases && currentProblem.testCases.length > 0 ? (
                  currentProblem.testCases.map((testCase, index) => (
                    <li key={index}>
                      <strong>Input:</strong> {testCase.input}
                      <br />
                      <strong>Expected Output:</strong> {testCase.output}
                    </li>
                  ))
                ) : (
                  <li>No test cases provided for this problem</li>
                )}
              </ul>
            </div>

            <div className="editor-section">
              <div className="language-selector">
                <label htmlFor="language">Language:</label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={submitting}
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <Editor
                height="400px"
                language={language}
                value={code}
                onChange={setCode}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  readOnly: submitting
                }}
              />

              <button 
                onClick={handleSubmit} 
                className="btn-primary"
                disabled={submitting || battleState === 'completed'}
              >
                {submitting ? 'Submitting...' : 'Submit Solution'}
              </button>
            </div>
          </>
        ) : (
          <div className="completed-message">
            <h2>You've completed all problems!</h2>
            <p>Waiting for other participants to finish...</p>
            <button 
              onClick={() => setShowLeaveModal(true)}
              className="btn-secondary"
            >
              Leave Battle
            </button>
          </div>
        )}

        {results.length > 0 && (
          <div className="results">
            <h3>Your Submission Results</h3>
            {results.map((result, index) => (
              <div key={index} className={`result ${result.status.toLowerCase()}`}>
                <h4>Problem {index + 1}: {result.status}</h4>
                <p>{result.message}</p>
                {result.details && (
                  <ul className="test-case-results">
                    {result.details.map((detail, i) => (
                      <li key={i} className={detail.passed ? 'passed' : 'failed'}>
                        Test Case {i + 1}: {detail.passed ? 'Passed' : 'Failed'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="participants-section">
        <h3>Participants</h3>
        <ul>
          {room.participants.map(participant => (
            <li key={participant._id} className={
              participant._id === (user?._id || user?.id) ? 'you' :
              participant._id === room.creator._id ? 'creator' :
              completedParticipants.includes(participant._id) ? 'completed' : ''
            }>
              {participant.username} 
              {participant._id === room.creator._id && ' (Creator)'}
              {participant._id === (user?._id || user?.id) && ' (You)'}
              {completedParticipants.includes(participant._id) && ' (Completed)'}
            </li>
          ))}
        </ul>

        {scoreboard.length > 0 && (
          <div className="live-scoreboard">
            <h3>Current Standings</h3>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Solved</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {scoreboard.map((entry, index) => (
                  <tr key={entry.user._id} className={entry.user._id === (user?._id || user?.id) ? 'current-user' : ''}>
                    <td>{index + 1}</td>
                    <td>{entry.user.username}</td>
                    <td>{entry.solvedProblems}/{room.problems.length}</td>
                    <td>{entry.score.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}