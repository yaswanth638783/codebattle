import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext.jsx';
import Navbar from './components/Navbar/Nav.jsx';
import Home from './pages/Home/Home.jsx';
import Login from './pages/Login/Login.jsx';
import Signup from './pages/Register/Register.jsx';
import Problem from './pages/Problem/Problem.jsx';
import Profile from './pages/Profile/Profile.jsx'
import CreateRoom from './pages/Rooms/createroom.jsx';
import WaitingRoom from './pages/Rooms/waitingroom.jsx';
import BattleRoom from './pages/Rooms/battleroom.jsx';
import Scoreboard from './pages/Rooms/scoreboard.jsx';
import { ErrorBoundary } from 'react-error-boundary';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import './index.css';
import JoinRoom from './pages/Rooms/joinroom.jsx';

axios.defaults.baseURL = 'http://localhost:8000';
axios.defaults.withCredentials = true;

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="app-container error-fallback">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary} className="btn-primary">
        Try again
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="app-container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/problems/:id" element={<Problem />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/create-room" element={<CreateRoom />} />
              <Route path="/waiting-room/:id" element={<WaitingRoom />} />
              <Route path="/join-room" element={<JoinRoom />} />
              <Route path="/battle-room/:id" element={<ErrorBoundary FallbackComponent={ErrorFallback}><BattleRoom /></ErrorBoundary>} />
              <Route path="/scoreboard" element={<Scoreboard />} />
            </Routes>
          </main>
        </div>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}