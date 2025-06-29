import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import './Problem.css';

const languageOptions = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
];

export default function Problem() {
  const { id } = useParams();
  const { isAuthenticated, userName } = useAuth();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [language, setLanguage] = useState('javascript');

  useEffect(() => {
    const defaultCode = {
      javascript: '// Write your solution here',
      python: '# Write your solution here',
      java: '// Write your solution here',
      c: '// Write your solution here',
      cpp: '// Write your solution here',
    };
    setCode(defaultCode[language]);
  }, [language]);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await axios.get(`/problems/${id}`);
        setProblem(res.data);
      } catch (error) {
        toast.error('Failed to load problem');
        navigate('/');
      }
    };
    fetchProblem();
  }, [id, navigate]);

const handleSubmit = async () => {
  if (!isAuthenticated) {
    toast.error('Please log in to submit solutions');
    return;
  }
  try {
    const token = localStorage.getItem('token');
    const res = await axios.post(
      `/submissions/${id}`,
      { code, language },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    setResult(res.data);
    toast.success(res.data.message);
  } catch (error) {
    console.error('Submission error:', error);
    toast.error(error.response?.data?.error || 'Submission failed');
  }
};

  return (
    <div className="app-container">
      <Link to="/" className="home-link">Back to Home</Link>
      {problem ? (
        <div className="problem-page">
          <h1 className="problem-heading">{problem.title}</h1>
          <div className="problem-content">
            <div className="problem-details">
              <h2>Description</h2>
              <p className="problem-description">{problem.description}</p>
              <h2>Sample Test Cases</h2>
              <ul className="test-cases">
                {problem.testCases.map((testCase, index) => (
                  <li key={index} className="test-case">
                    <strong>Test Case {index + 1}:</strong>
                    <pre>Input: {testCase.input}</pre>
                    <pre>Output: {testCase.output}</pre>
                  </li>
                ))}
              </ul>
            </div>
            <div className="editor-section">
            <h2>Code Editor</h2>
            <div className="language-selector">
              <label htmlFor="language">Language:</label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input-field"
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
              className="code-editor"
            />
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!isAuthenticated}
              >
                Submit Solution
              </button>
              {result && (
                <div className={`result ${result.status.toLowerCase()}`}>
                  <h3>Result: {result.status}</h3>
                  <p>{result.message}</p>
                  {result.details && (
                    <ul className="test-case-results">
                      {result.details.map((detail, index) => (
                        <li
                          key={index}
                          className={detail.passed ? 'passed' : 'failed'}
                        >
                          Test Case {index + 1}: {detail.passed ? 'Passed' : 'Failed'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p>Loading problem...</p>
      )}
    </div>
  );
}