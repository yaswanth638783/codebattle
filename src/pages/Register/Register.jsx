import { useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Register.css';

export default function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/signup', formData);
      login(res.data.token);
      toast.success('Registration successful!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="form-container">
      <h1 className="text-3xl font-bold mb-6 text-center">Sign Up</h1>
      <div className="mb-4">
        <label htmlFor="username" className="block text-gray-300 mb-2">
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className="input-field"
          required
        />
      </div>
      <div className="mb-4">
        <label htmlFor="email" className="block text-gray-300 mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="input-field"
          required
        />
      </div>
      <div className="mb-6">
        <label htmlFor="password" className="block text-gray-300 mb-2">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="input-field"
          required
        />
      </div>
      <button onClick={handleSubmit} className="btn-primary w-full">
        Sign Up
      </button>
      <p className="mt-4 text-gray-400 text-center">
        Already have an account?{' '}
        <a href="/login" className="text-blue-500 hover:underline">
          Login
        </a>
      </p>
    </div>
  );
}