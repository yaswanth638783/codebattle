import { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Home.css';

export default function Home() {
  const { isAuthenticated, userName } = useAuth();
  const [problems, setProblems] = useState([]);
  const [difficulty, setDifficulty] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags] = useState([
    'Array', 
    'String', 
    'Math', 
    'Dynamic Programming', 
    'Two Pointers', 
    'Hash Table', 
    'Linked List', 
    'Recursion', 
    'Sliding Window', 
    'Binary Search', 
    'Divide and Conquer', 
    'Simulation', 
    'Greedy', 
    'Trie',
    'Sorting', 
    'Backtracking', 
    'Stack', 
    'Heap', 
    'Merge Sort', 
    'Bit Manipulation', 
    'Matrix', 
    'Combinatorics', 
    'Memoization'
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchProblems = async () => {
        try {
          const res = await axios.get(`/problems?difficulty=${difficulty}&tag=${selectedTag}`);
          setProblems(res.data);
        } catch (error) {
          toast.error('Failed to load problems');
        }
      };
      fetchProblems();
    }
  }, [isAuthenticated, difficulty, selectedTag]);

  return (
    <div className="app-container">
      <h1 className="problem-heading">
        Welcome to CodeBattle{userName ? `, ${userName}` : ''}!
      </h1>
      {isAuthenticated ? (
        <>
          <div className="problem-filters">
            <div className="problem-filter">
              <label htmlFor="difficulty">Filter by Difficulty:</label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="input-field"
              >
                <option value="">All</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div className="problem-filter">
              <label htmlFor="tags">Filter by Tag:</label>
              <select
                id="tags"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="input-field"
              >
                <option value="">All</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="problem-list">
            <h2>Problems</h2>
            <ul>
              {problems.length > 0 ? (
                problems.map((problem) => (
                  <li key={problem._id} className="problem-item">
                    <Link to={`/problems/${problem._id}`}>
                      {problem.title} ({problem.difficulty})
                      <div className="problem-tags">
                        {problem.tags && problem.tags.length > 0 && problem.tags.map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </li>
                ))
              ) : (
                <p>No problems found.</p>
              )}
            </ul>
          </div>
        </>
      ) : (
        <div className="unauthenticated-message">
          <p>Please log in or sign up to view and solve problems.</p>
          <div className="auth-links">
            <Link to="/login" className="btn-primary">Log In</Link>
            <Link to="/signup" className="btn-primary">Sign Up</Link>
          </div>
        </div>
      )}
    </div>
  );
}