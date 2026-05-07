import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Navbar from '../components/Navbar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function NewTask({ token, setToken }) {
  const [title, setTitle] = useState('');
  const [inputText, setInputText] = useState('');
  const [operation, setOperation] = useState('uppercase');
  const navigate = useNavigate();

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-auth-token': token 
        },
        body: JSON.stringify({ title, inputText, operation })
      });
      if (res.ok) {
        navigate('/tasks');
      } else if (res.status === 401) {
        setToken(null);
        localStorage.removeItem('token');
        navigate('/login');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      <Navbar setToken={setToken} />

      <div className="page-container">
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} color="var(--primary)" /> New Task
          </h2>
          <form onSubmit={createTask}>
            <div className="form-group">
              <label>Title</label>
              <input 
                type="text" 
                required 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="Task Name"
              />
            </div>
            <div className="form-group">
              <label>Operation</label>
              <select value={operation} onChange={e => setOperation(e.target.value)}>
                <option value="uppercase">Uppercase</option>
                <option value="lowercase">Lowercase</option>
                <option value="reverse string">Reverse String</option>
                <option value="word count">Word Count</option>
              </select>
            </div>
            <div className="form-group">
              <label>Input Text</label>
              <textarea 
                required 
                rows="6"
                value={inputText} 
                onChange={e => setInputText(e.target.value)}
                placeholder="Enter text to process..."
              />
            </div>
            <button type="submit" className="btn" style={{ marginTop: '1rem' }}>Submit Task</button>
          </form>
        </div>
      </div>
    </div>
  );
}
