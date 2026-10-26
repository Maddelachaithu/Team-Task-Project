import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  due_date?: string;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<any>({});

  // Form inputs
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [dueDate, setDueDate] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const form = new URLSearchParams();
      form.append('username', email);
      form.append('password', password);
      const res = await axios.post(`${API_BASE}/auth/login`, form);
      localStorage.setItem('token', res.data.access_token);
      setToken(res.data.access_token);
    } catch {
      alert('Login failed. Use admin@teamtask.local / AdminPass123!');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
  };

  const loadData = async () => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const [tRes, sRes] = await Promise.all([
        axios.get(`${API_BASE}/tasks?${params.toString()}`, config),
        axios.get(`${API_BASE}/dashboard/summary`, config),
      ]);
      setTasks(tRes.data);
      setSummary(sRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const payload: any = { title, priority };
      if (dueDate) payload.due_date = new Date(dueDate).toISOString();

      await axios.post(`${API_BASE}/tasks`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTitle('');
      setDueDate('');
      setPriority('Medium');
      loadData();
    } catch {
      alert('Failed to create task (Check role permissions)');
    }
  };

  const updateStatus = async (taskId: number, newStatus: string) => {
    try {
      await axios.patch(
        `${API_BASE}/tasks/${taskId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadData();
    } catch {
      alert('Failed to update status');
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!window.confirm(`Are you sure you want to delete task #${taskId}?`)) return;
    try {
      await axios.delete(`${API_BASE}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadData();
    } catch {
      alert('Failed to delete task (Admin/Manager role required)');
    }
  };

  useEffect(() => {
    loadData();
  }, [token, statusFilter, priorityFilter, search]);

  if (!token) {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '28px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', color: '#1a365d', marginBottom: '20px' }}>TeamTask Login</h2>
        <form onSubmit={login}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Email Address</label>
            <input style={{ width: '100%', padding: '10px', marginTop: '6px', boxSizing: 'border-box', border: '1px solid #cbd5e0', borderRadius: '6px' }} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Password</label>
            <input style={{ width: '100%', padding: '10px', marginTop: '6px', boxSizing: 'border-box', border: '1px solid #cbd5e0', borderRadius: '6px' }} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button style={{ width: '100%', padding: '12px', background: '#2b6cb0', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }} type="submit">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1a365d' }}>TeamTask Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: '#718096', fontSize: '14px' }}>Work item & task tracking portal</p>
        </div>
        <button onClick={logout} style={{ padding: '8px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Logout</button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', margin: '24px 0' }}>
        {[
          { label: 'Total', count: summary.total_tasks || 0, color: '#2b6cb0' },
          { label: 'Open', count: summary.open_tasks || 0, color: '#3182ce' },
          { label: 'In Progress', count: summary.in_progress_tasks || 0, color: '#d69e2e' },
          { label: 'Completed', count: summary.completed_tasks || 0, color: '#38a169' },
          { label: 'Overdue', count: summary.overdue_tasks || 0, color: '#e53e3e' },
        ].map((item, idx) => (
          <div key={idx} style={{ padding: '16px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', textAlign: 'center', borderTop: `4px solid ${item.color}` }}>
            <div style={{ fontSize: '13px', color: '#718096', textTransform: 'uppercase', fontWeight: 600 }}>{item.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: item.color, marginTop: '6px' }}>{item.count}</div>
          </div>
        ))}
      </div>

      {/* Create Task Form */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 14px', color: '#2d3748' }}>Create Work Item</h3>
        <form onSubmit={createTask} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            style={{ flex: '2 1 240px', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '6px' }}
            placeholder="Task title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
          <select
            style={{ flex: '1 1 120px', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '6px' }}
            value={priority}
            onChange={(e: any) => setPriority(e.target.value)}
          >
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
          </select>
          <input
            style={{ flex: '1 1 150px', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '6px' }}
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
          <button style={{ padding: '10px 24px', background: '#2b6cb0', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }} type="submit">
            Add Task
          </button>
        </form>
      </div>

      {/* Search & Filter Controls */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          style={{ flex: '2 1 240px', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '6px' }}
          placeholder="Search by title..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ flex: '1 1 140px', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '6px' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
        <select
          style={{ flex: '1 1 140px', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '6px' }}
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      {/* Task List Table */}
      <div style={{ background: '#fff', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
          <thead>
            <tr style={{ background: '#edf2f7', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', color: '#4a5568' }}>ID</th>
              <th style={{ padding: '12px 16px', color: '#4a5568' }}>Title</th>
              <th style={{ padding: '12px 16px', color: '#4a5568' }}>Priority</th>
              <th style={{ padding: '12px 16px', color: '#4a5568' }}>Status Transition</th>
              <th style={{ padding: '12px 16px', color: '#4a5568' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#a0aec0' }}>
                  No tasks found matching your criteria.
                </td>
              </tr>
            ) : (
              tasks.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '12px 16px', color: '#718096' }}>#{t.id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2d3748' }}>{t.title}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: t.priority === 'High' ? '#fed7d7' : t.priority === 'Medium' ? '#feebc8' : '#e2e8f0',
                      color: t.priority === 'High' ? '#c53030' : t.priority === 'Medium' ? '#c05621' : '#4a5568'
                    }}>
                      {t.priority}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                      value={t.status}
                      onChange={e => updateStatus(t.id, e.target.value)}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => deleteTask(t.id)}
                      style={{ padding: '6px 12px', background: '#fed7d7', color: '#c53030', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
