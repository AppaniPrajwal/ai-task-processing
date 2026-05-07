import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import Navbar from '../components/Navbar';

const API_URL = import.meta.env.VITE_API_URL||'/api';

export default function Tasks({ token, setToken }) {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        headers: { 'x-auth-token': token }
      });
      if (res.status === 401) {
        setToken(null);
        localStorage.removeItem('token');
      }
      if (!res.ok) {
        if (res.status === 429) console.warn("Rate limit exceeded, waiting...");
        return;
      }
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error(err);
    }
  };

  // useEffect(() => {
  //   fetchTasks();
  //   const interval = setInterval(fetchTasks, 3000);
  //   return () => clearInterval(interval);
  // }, []);
useEffect(() => {
  const getTasks = async () => {
    await fetchTasks();
  };

  getTasks();

  const interval = setInterval(getTasks, 3000);

  return () => clearInterval(interval);

// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
  const viewTask = async (id) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        headers: { 'x-auth-token': token }
      });
      if (!res.ok) {
        if (res.status === 429) console.warn("Rate limit exceeded, waiting...");
        return;
      }
      const data = await res.json();
      setSelectedTask(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      <Navbar setToken={setToken} />

      <div className="page-container">
        <div className="glass-panel" style={{ minHeight: '500px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2>Recent Tasks</h2>
            <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem' }} onClick={fetchTasks}>
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="task-list">
            {tasks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>No tasks found. Create one!</p>
            ) : (
              tasks.map(task => (
                <div key={task._id} className="task-card" onClick={() => viewTask(task._id)}>
                  <div className="task-header">
                    <span className="task-title">{task.title}</span>
                    <span className={`status-badge status-${task.status}`}>{task.status}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Operation: {task.operation}</span>
                    <span>{new Date(task.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{selectedTask.title}</h2>
              <button className="close-btn" onClick={() => setSelectedTask(null)}><X size={24} /></button>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <span className={`status-badge status-${selectedTask.status}`}>{selectedTask.status}</span>
              <span style={{ color: 'var(--text-muted)' }}>{selectedTask.operation}</span>
            </div>

            <div className="form-group">
              <label>Input</label>
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                {selectedTask.inputText}
              </div>
            </div>

            {selectedTask.result && (
              <div className="form-group">
                <label>Result</label>
                <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '8px' }}>
                  {selectedTask.result}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Logs</label>
              <div className="log-box">
                {Array.isArray(selectedTask.logs) && selectedTask.logs.length > 0 ? (
                  selectedTask.logs.map((log, index) => (
                    <div key={index} className={`log-entry log-${log.level || 'info'}`} style={{ marginBottom: '4px' }}>
                      <span className="log-time" style={{ color: '#888', marginRight: '8px' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className="log-level" style={{ fontWeight: 'bold', marginRight: '8px', color: log.level === 'error' ? 'var(--danger)' : log.level === 'warning' ? 'var(--warning)' : 'var(--primary)' }}>[{log.level ? log.level.toUpperCase() : 'INFO'}]</span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  ))
                ) : (
                  typeof selectedTask.logs === 'string' && selectedTask.logs.length > 0 
                    ? selectedTask.logs 
                    : 'No logs available.'
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
