import React, { useEffect, useState } from 'react';
import Register from './Register';
import Login from './Login';
import UserProfile from './UserProfile';
import './App.css';

function App() {
  const [message, setMessage] = useState('Loading...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const backendUrl = process.env.REACT_APP_API_URL || 'https://truefans-backend.vercel.app';
    console.log('Attempting to connect to:', `${backendUrl}/api/health`);
    
    fetch(`${backendUrl}/api/health`)
      .then(res => {
        console.log('Response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Response data:', data);
        setMessage(data.message || data.status);
        setError(null);
      })
      .catch(err => {
        console.error('Error:', err);
        setMessage('Error connecting to backend');
        setError(err.message);
      });
  }, []);

  return (
    <div className="app-container">
      <h1>Backend Health Check</h1>
      <p>Status: {message}</p>
      {error && (
        <p className="error">
          Error details: {error}
        </p>
      )}
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>Note: If you see "Error connecting to backend", please check:</p>
        <ul>
          <li>Backend URL is correct in environment variables</li>
          <li>Backend server is running</li>
          <li>No CORS issues in browser console</li>
        </ul>
      </div>
      <Register />
      <Login />
      <UserProfile />
    </div>
  );
}

export default App;