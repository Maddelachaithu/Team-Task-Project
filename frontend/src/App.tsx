import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DEFAULT_API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000/api/v1';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  created_at?: string;
}

interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [apiBase, setApiBase] = useState(() => localStorage.getItem('teamtask_api_base') || DEFAULT_API_BASE);
  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState(apiBase);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'manager' | 'member' | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<any>({});

  // Form inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const selectPortal = (role: 'admin' | 'manager' | 'member', userEmail: string, userPass: string) => {
    setSelectedRole(role);
    setEmail(userEmail);
    setPassword(userPass);
  };

  const handleSaveApiBase = () => {
    const cleaned = configUrl.trim().replace(/\/+$/, '');
    setApiBase(cleaned);
    localStorage.setItem('teamtask_api_base', cleaned);
    setShowConfig(false);
    setTestStatus(null);
  };

  const handleResetApiBase = () => {
    setConfigUrl(DEFAULT_API_BASE);
    setApiBase(DEFAULT_API_BASE);
    localStorage.removeItem('teamtask_api_base');
    setTestStatus(null);
  };

  const handleTestConnection = async () => {
    setTestStatus('Testing...');
    try {
      const cleaned = configUrl.trim().replace(/\/+$/, '');
      const healthUrl = cleaned.endsWith('/api/v1') ? `${cleaned}/health` : `${cleaned}/api/v1/health`;
      const res = await axios.get(healthUrl, { timeout: 8000 });
      if (res.data?.status === 'healthy' || res.status === 200) {
        setTestStatus('✅ Connected successfully!');
      } else {
        setTestStatus(`⚠️ Server responded with status: ${res.status}`);
      }
    } catch (err: any) {
      setTestStatus(`❌ Connection failed (${err.message || 'Server unreachable'})`);
    }
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const form = new URLSearchParams();
      form.append('username', email);
      form.append('password', password);
      const res = await axios.post(`${apiBase}/auth/login`, form);
      localStorage.setItem('token', res.data.access_token);
      setToken(res.data.access_token);
    } catch (err: any) {
      if (err.response) {
        const detail = err.response.data?.detail;
        alert(typeof detail === 'string' ? detail : 'Login failed. Please check credentials.');
      } else if (err.request) {
        alert(
          `Cannot connect to backend server at:\n${apiBase}\n\n` +
          `• If using Render free tier, the backend may be waking up (please wait ~30 seconds and retry).\n` +
          `• If the backend is hosted at another URL, click "Configure Backend Server" below to enter it.`
        );
        setShowConfig(true);
      } else {
        alert(`Login error: ${err.message}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCurrentUser(null);
    setEmail('');
    setPassword('');
    setSelectedRole(null);
  };

  const loadData = async () => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [userRes, sRes] = await Promise.all([
        axios.get(`${apiBase}/auth/me`, config),
        axios.get(`${apiBase}/dashboard/summary`, config),
      ]);
      setCurrentUser(userRes.data);
      setSummary(sRes.data);

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const tRes = await axios.get(`${apiBase}/tasks?${params.toString()}`, config);
      setTasks(tRes.data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        logout();
      }
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await axios.post(
        `${apiBase}/tasks`,
        { title, description, priority },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTitle('');
      setDescription('');
      setPriority('Medium');
      loadData();
    } catch {
      alert('Failed to create task (Requires Admin or Manager permission)');
    }
  };

  const updateStatus = async (taskId: number, newStatus: string) => {
    try {
      await axios.patch(
        `${apiBase}/tasks/${taskId}`,
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
      await axios.delete(`${apiBase}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadData();
    } catch {
      alert('Failed to delete task');
    }
  };

  useEffect(() => {
    loadData();
  }, [token, statusFilter, priorityFilter, search, apiBase]);

  if (!token) {
    return (
      <div style={{ maxWidth: '460px', margin: '50px auto', padding: '32px', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', margin: '0 auto 12px', borderRadius: '12px', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px' }}>
            ❖
          </div>
          <h2 style={{ margin: 0, color: '#111827', fontSize: '24px', fontWeight: 800 }}>TeamTask Login</h2>
          <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '13px' }}>Choose a portal profile, then click Sign In</p>
        </div>

        {/* Portal Selection Tabs */}
        <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
            Select Portal Role
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => selectPortal('admin', 'admin@teamtask.local', 'AdminPass123!')}
              style={{
                padding: '10px 4px',
                background: selectedRole === 'admin' ? '#4f46e5' : '#eef2ff',
                color: selectedRole === 'admin' ? '#fff' : '#4f46e5',
                border: `1px solid ${selectedRole === 'admin' ? '#4f46e5' : '#c7d2fe'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              Admin Portal
            </button>
            <button
              type="button"
              onClick={() => selectPortal('manager', 'manager@teamtask.local', 'ManagerPass123!')}
              style={{
                padding: '10px 4px',
                background: selectedRole === 'manager' ? '#d97706' : '#fffbeb',
                color: selectedRole === 'manager' ? '#fff' : '#d97706',
                border: `1px solid ${selectedRole === 'manager' ? '#d97706' : '#fde68a'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              Manager Portal
            </button>
            <button
              type="button"
              onClick={() => selectPortal('member', 'member@teamtask.local', 'MemberPass123!')}
              style={{
                padding: '10px 4px',
                background: selectedRole === 'member' ? '#059669' : '#ecfdf5',
                color: selectedRole === 'member' ? '#fff' : '#059669',
                border: `1px solid ${selectedRole === 'member' ? '#059669' : '#a7f3d0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              Member Portal
            </button>
          </div>
        </div>

        <form onSubmit={login}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Email Address</label>
            <input
              style={{ width: '100%', padding: '10px 12px', marginTop: '6px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              type="email"
              placeholder="e.g. admin@teamtask.local"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setSelectedRole(null);
              }}
              required
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Password</label>
            <input
              style={{ width: '100%', padding: '10px 12px', marginTop: '6px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setSelectedRole(null);
              }}
              required
            />
          </div>
          <button
            style={{
              width: '100%',
              padding: '12px',
              background: isLoggingIn ? '#6366f1' : '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '14px'
            }}
            type="submit"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Backend Server Configuration Toggle */}
        <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6366f1',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'underline'
            }}
          >
            ⚙ Configure Backend Server URL
          </button>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', wordBreak: 'break-all' }}>
            Target: <code>{apiBase}</code>
          </div>

          {showConfig && (
            <div style={{ marginTop: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Backend API Base URL:
              </label>
              <input
                type="text"
                value={configUrl}
                onChange={e => setConfigUrl(e.target.value)}
                placeholder="e.g. https://your-backend.onrender.com/api/v1"
                style={{ width: '100%', padding: '8px 10px', marginTop: '6px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleSaveApiBase}
                  style={{ flex: 1, padding: '6px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save & Apply
                </button>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  style={{ flex: 1, padding: '6px', background: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Test Connection
                </button>
                <button
                  type="button"
                  onClick={handleResetApiBase}
                  style={{ padding: '6px 10px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                  title="Reset to default URL"
                >
                  Reset
                </button>
              </div>
              {testStatus && (
                <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 600, color: testStatus.startsWith('✅') ? '#059669' : '#dc2626' }}>
                  {testStatus}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const completionPercent = summary.total_tasks ? Math.round((summary.completed_tasks / summary.total_tasks) * 100) : 0;
  
  // Normalized role check
  const userRoleClean = (currentUser?.role || '').toLowerCase();
  const isAdminOrManager = userRoleClean === 'admin' || userRoleClean === 'manager';
  const roleName = userRoleClean ? userRoleClean.toUpperCase() : 'USER';
  const roleColor = roleName === 'ADMIN' ? '#4f46e5' : roleName === 'MANAGER' ? '#d97706' : '#059669';

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '20px' }}>
            ❖
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>TeamTask</h1>
            <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '12px' }}>Enterprise Project Hub</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f3f4f6', padding: '6px 14px', borderRadius: '20px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: roleColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
              {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{currentUser?.name || 'User'}</div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: roleColor }}>{roleName} PORTAL</div>
            </div>
          </div>
          <button onClick={logout} style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🚪</span> Logout
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', margin: '24px 0' }}>
        {[
          { label: 'TOTAL TASKS', icon: '📋', sub: 'All registered work items', count: summary.total_tasks || 0, bg: '#eef2ff', text: '#4f46e5', border: '#c7d2fe' },
          { label: 'OPEN', icon: 'ⓘ', sub: 'Awaiting initiation', count: summary.open_tasks || 0, bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
          { label: 'IN PROGRESS', icon: '🕒', sub: 'Actively developing', count: summary.in_progress_tasks || 0, bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
          { label: 'COMPLETED', icon: '✓', sub: 'Shipped & verified', count: summary.completed_tasks || 0, bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
          { label: 'OVERDUE', icon: '⚠', sub: 'Needs immediate action', count: summary.overdue_tasks || 0, bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
        ].map((card, i) => (
          <div key={i} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: card.text }}>{card.label}</span>
              <span style={{ fontSize: '14px', color: card.text, opacity: 0.8 }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: '10px 0 4px' }}>
              {card.count}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Sprint Progress Section */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>Sprint Velocity & Completion</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Formula: (Completed Work Items / Total Registered Items) × 100%
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#4f46e5' }}>
            {completionPercent}%
          </div>
        </div>
        <div style={{ width: '100%', height: '10px', background: '#e5e7eb', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ width: `${completionPercent}%`, height: '100%', background: '#4f46e5', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Add New Work Item Box - Rendered ONLY for Admin and Manager */}
      {isAdminOrManager && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>➕</span> Create New Work Item
          </div>
          <form onSubmit={createTask} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>TITLE *</label>
              <input
                style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                placeholder="e.g. Implement OAuth2 Refresh Flow"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>DESCRIPTION</label>
              <input
                style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                placeholder="e.g. RFC 6749 compliance checks"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>PRIORITY</label>
              <select
                style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="submit"
                style={{ width: '100%', padding: '9px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
              >
                Publish Work Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'All', count: summary.total_tasks || 0, val: '' },
            { label: 'To Do', count: summary.open_tasks || 0, val: 'To Do' },
            { label: 'In Progress', count: summary.in_progress_tasks || 0, val: 'In Progress' },
            { label: 'Done', count: summary.completed_tasks || 0, val: 'Done' },
          ].map(f => (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.val)}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: statusFilter === f.val ? '#4338ca' : '#f3f4f6',
                color: statusFilter === f.val ? '#fff' : '#4b5563'
              }}
            >
              <span>{f.label}</span>
              <span style={{ background: statusFilter === f.val ? 'rgba(255,255,255,0.25)' : '#e5e7eb', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', width: '220px' }}
            placeholder="Search work items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      {/* Task List Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>
            Active Work Items <span style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>({tasks.length})</span>
          </div>
          <button
            onClick={loadData}
            style={{ padding: '6px 12px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ↻ Refresh
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 20px' }}>ID</th>
              <th style={{ padding: '12px 20px' }}>TITLE & DETAILS</th>
              <th style={{ padding: '12px 20px' }}>STATUS</th>
              <th style={{ padding: '12px 20px' }}>PRIORITY</th>
              <th style={{ padding: '12px 20px' }}>CREATED</th>
              {isAdminOrManager && <th style={{ padding: '12px 20px' }}>ACTIONS</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={isAdminOrManager ? 6 : 5} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                  No work items found matching your filters.
                </td>
              </tr>
            ) : (
              tasks.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 20px', color: '#6b7280', fontWeight: 600 }}>#{t.id}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{t.title}</div>
                    {t.description && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{t.description}</div>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <select
                      value={t.status}
                      onChange={e => updateStatus(t.id, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '16px',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        border: '1px solid',
                        background: t.status === 'Done' ? '#d1fae5' : t.status === 'In Progress' ? '#fef3c7' : '#f3f4f6',
                        borderColor: t.status === 'Done' ? '#10b981' : t.status === 'In Progress' ? '#f59e0b' : '#d1d5db',
                        color: t.status === 'Done' ? '#065f46' : t.status === 'In Progress' ? '#92400e' : '#374151'
                      }}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: t.priority === 'High' ? '#fee2e2' : t.priority === 'Medium' ? '#fef3c7' : '#f1f5f9',
                        color: t.priority === 'High' ? '#b91c1c' : t.priority === 'Medium' ? '#b45309' : '#475569'
                      }}
                    >
                      • {t.priority}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6b7280' }}>
                    {t.created_at ? new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'}
                  </td>
                  {isAdminOrManager && (
                    <td style={{ padding: '14px 20px' }}>
                      <button
                        onClick={() => deleteTask(t.id)}
                        style={{ padding: '6px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                        title="Delete work item"
                      >
                        🗑
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
