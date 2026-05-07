import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Tasks from './pages/Tasks';
import NewTask from './pages/NewTask';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!token ? <Login setToken={setToken} /> : <Navigate to="/tasks" />} 
        />
        <Route 
          path="/register" 
          element={!token ? <Register setToken={setToken} /> : <Navigate to="/tasks" />} 
        />
        <Route 
          path="/tasks" 
          element={token ? <Tasks token={token} setToken={setToken} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/new-task" 
          element={token ? <NewTask token={token} setToken={setToken} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="*" 
          element={<Navigate to={token ? "/tasks" : "/login"} />} 
        />
      </Routes>
    </BrowserRouter>
  );
}
