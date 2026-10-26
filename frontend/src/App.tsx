import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

export type TaskStatus = 'To Do' | 'In Progress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type UserRole = 'Admin' | 'Manager' | 'Member';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  creator_id: number;
  assignee_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  total_tasks: number;
  open_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
}

export default function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');

  // Dashboard state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    total_tasks: 0,
    open_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    overdue_tasks: 0,
  });
  const [loading, setLoading] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('Medium');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Search state
  const [statusFilter, setStatusFilter] = useState<'All' | TaskStatus>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriority>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Auth headers
  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const form = new URLSearchParams();
      form.append('username', email.trim());
      form.append('password', password);
      const res = await axios.post(`${API_BASE}/auth/login`, form);
      const accessToken = res.data.access_token;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      showToast('Welcome back to TeamTask!', 'success');
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || 'Invalid email or password. Try demo accounts below.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCurrentUser(null);
    setTasks([]);
    setSummary({ total_tasks: 0, open_tasks: 0, in_progress_tasks: 0, completed_tasks: 0, overdue_tasks: 0 });
    showToast('You have been logged out.', 'info');
  };

  // Quick autofill for demo login
  const fillCredentials = (userEmail: string, pass: string) => {
    setEmail(userEmail);
    setPassword(pass);
    setAuthError('');
  };

  // Fetch Current User
  const loadUser = async () => {
    if (!token) return;
    try {
      const res = await axios.get<User>(`${API_BASE}/auth/me`, getAuthHeader());
      setCurrentUser(res.data);
    } catch (err) {
      console.error('Failed to load user info', err);
    }
  };

  // Fetch Dashboard & Tasks
  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        axios.get<Task[]>(`${API_BASE}/tasks`, getAuthHeader()),
        axios.get<DashboardSummary>(`${API_BASE}/dashboard/summary`, getAuthHeader()),
      ]);
      setTasks(tRes.data);
      setSummary(sRes.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        showToast('Failed to sync tasks from server', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadUser();
      loadData();
    }
  }, [token]);

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await axios.post(
        `${API_BASE}/tasks`,
        {
          title: newTitle.trim(),
          priority: newPriority,
          description: newDescription.trim() || null,
        },
        getAuthHeader()
      );
      setNewTitle('');
      setNewDescription('');
      setNewPriority('Medium');
      showToast('Work item created successfully!', 'success');
      await loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create work item.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Task Status
  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await axios.patch(`${API_BASE}/tasks/${taskId}`, { status: newStatus }, getAuthHeader());
      showToast(`Status updated to "${newStatus}"`, 'success');
      // Refresh summary metrics from server
      const sRes = await axios.get<DashboardSummary>(`${API_BASE}/dashboard/summary`, getAuthHeader());
      setSummary(sRes.data);
    } catch (err: any) {
      showToast('Failed to update status. Reverting...', 'error');
      loadData();
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: number, taskTitle: string) => {
    if (!window.confirm(`Delete work item "${taskTitle}"?`)) return;
    try {
      await axios.delete(`${API_BASE}/tasks/${taskId}`, getAuthHeader());
      showToast('Work item removed.', 'info');
      await loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to delete task. You might not have permission.';
      showToast(msg, 'error');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setStatusFilter('All');
    setPriorityFilter('All');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'All' || priorityFilter !== 'All' || searchQuery.trim().length > 0;

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        `#${task.id}`.includes(searchQuery);
      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  // Completion percentage
  const completionPercentage = useMemo(() => {
    if (!summary.total_tasks || summary.total_tasks === 0) return 0;
    return Math.round((summary.completed_tasks / summary.total_tasks) * 100);
  }, [summary]);

  // Priority Styles mapping
  const getPriorityStyle = (priority: TaskPriority) => {
    switch (priority) {
      case 'Low':
        return {
          bg: '#F1F5F9',
          text: '#475569',
          border: '#CBD5E1',
          label: 'Low',
        };
      case 'Medium':
        return {
          bg: '#FEF3C7',
          text: '#B45309',
          border: '#FCD34D',
          label: 'Medium',
        };
      case 'High':
        return {
          bg: '#FEE2E2',
          text: '#B91C1C',
          border: '#FCA5A5',
          label: 'High',
        };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', label: priority };
    }
  };

  // Status Styles mapping
  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case 'To Do':
        return {
          bg: '#F3F4F6',
          text: '#374151',
          border: '#D1D5DB',
          dot: '#9CA3AF',
        };
      case 'In Progress':
        return {
          bg: '#FEF3C7',
          text: '#92400E',
          border: '#F59E0B',
          dot: '#D97706',
        };
      case 'Done':
        return {
          bg: '#D1FAE5',
          text: '#065F46',
          border: '#10B981',
          dot: '#059669',
        };
      default:
        return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB', dot: '#9CA3AF' };
    }
  };

  // -------------------------------------------------------------
  // LOGIN VIEW
  // -------------------------------------------------------------
  if (!token) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          {/* Header */}
          <div style={styles.loginHeader}>
            <div style={styles.brandIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 style={styles.brandTitle}>TeamTask Enterprise</h1>
            <p style={styles.brandSubtitle}>High-velocity team execution & work item tracking</p>
          </div>

          {authError && (
            <div style={styles.errorAlert}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Corporate Email</label>
              <input
                style={styles.input}
                type="email"
                placeholder="name@teamtask.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              style={{
                ...styles.submitBtn,
                opacity: isLoggingIn ? 0.75 : 1,
                cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              }}
              type="submit"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In to Workspace'}
            </button>
          </form>

          {/* Demo Account Quick Switcher */}
          <div style={styles.demoSection}>
            <p style={styles.demoTitle}>DEMO CREDENTIALS (CLICK TO FILL)</p>
            <div style={styles.demoGrid}>
              <button
                type="button"
                style={styles.demoChip}
                onClick={() => fillCredentials('admin@teamtask.local', 'AdminPass123!')}
              >
                <span style={styles.demoRole}>Admin</span>
                <span style={styles.demoMail}>admin@teamtask.local</span>
              </button>
              <button
                type="button"
                style={styles.demoChip}
                onClick={() => fillCredentials('manager@teamtask.local', 'ManagerPass123!')}
              >
                <span style={styles.demoRole}>Manager</span>
                <span style={styles.demoMail}>manager@teamtask.local</span>
              </button>
              <button
                type="button"
                style={styles.demoChip}
                onClick={() => fillCredentials('member@teamtask.local', 'MemberPass123!')}
              >
                <span style={styles.demoRole}>Member</span>
                <span style={styles.demoMail}>member@teamtask.local</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // DASHBOARD VIEW
  // -------------------------------------------------------------
  return (
    <div style={styles.appWrapper}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            backgroundColor:
              toast.type === 'success' ? '#065F46' : toast.type === 'error' ? '#991B1B' : '#1E40AF',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Top Navigation Bar */}
      <header style={styles.navbar}>
        <div style={styles.navLeft}>
          <div style={styles.navLogo}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={styles.navBrand}>TeamTask</div>
            <div style={styles.navWorkspace}>Enterprise Project Hub</div>
          </div>
        </div>

        <div style={styles.navRight}>
          {currentUser && (
            <div style={styles.userProfile}>
              <div style={styles.userAvatar}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div style={styles.userInfo}>
                <div style={styles.userName}>{currentUser.name}</div>
                <div style={styles.userRoleBadge}>{currentUser.role}</div>
              </div>
            </div>
          )}

          <button onClick={handleLogout} style={styles.logoutBtn} title="Sign Out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main style={styles.mainContent}>
        {/* KPI Summary Cards */}
        <section style={styles.kpiGrid}>
          {/* Total */}
          <div style={{ ...styles.kpiCard, backgroundColor: '#EEF2FF', borderColor: 'rgba(79, 70, 229, 0.35)' }}>
            <div style={styles.kpiHeader}>
              <span style={{ ...styles.kpiLabel, color: '#4F46E5' }}>TOTAL TASKS</span>
              <div style={{ ...styles.kpiIconWrap, backgroundColor: 'rgba(79, 70, 229, 0.12)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                </svg>
              </div>
            </div>
            <div style={{ ...styles.kpiValue, color: '#4F46E5' }}>{summary.total_tasks}</div>
            <div style={{ ...styles.kpiFootnote, color: '#6366F1' }}>All registered work items</div>
          </div>

          {/* Open / To Do */}
          <div style={{ ...styles.kpiCard, backgroundColor: '#EFF6FF', borderColor: 'rgba(37, 99, 235, 0.35)' }}>
            <div style={styles.kpiHeader}>
              <span style={{ ...styles.kpiLabel, color: '#2563EB' }}>OPEN</span>
              <div style={{ ...styles.kpiIconWrap, backgroundColor: 'rgba(37, 99, 235, 0.12)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
            </div>
            <div style={{ ...styles.kpiValue, color: '#2563EB' }}>{summary.open_tasks}</div>
            <div style={{ ...styles.kpiFootnote, color: '#3B82F6' }}>Awaiting initiation</div>
          </div>

          {/* In Progress */}
          <div style={{ ...styles.kpiCard, backgroundColor: '#FFFBEB', borderColor: 'rgba(217, 119, 6, 0.35)' }}>
            <div style={styles.kpiHeader}>
              <span style={{ ...styles.kpiLabel, color: '#D97706' }}>IN PROGRESS</span>
              <div style={{ ...styles.kpiIconWrap, backgroundColor: 'rgba(217, 119, 6, 0.12)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
            </div>
            <div style={{ ...styles.kpiValue, color: '#D97706' }}>{summary.in_progress_tasks}</div>
            <div style={{ ...styles.kpiFootnote, color: '#B45309' }}>Actively developing</div>
          </div>

          {/* Completed */}
          <div style={{ ...styles.kpiCard, backgroundColor: '#ECFDF5', borderColor: 'rgba(5, 150, 105, 0.35)' }}>
            <div style={styles.kpiHeader}>
              <span style={{ ...styles.kpiLabel, color: '#059669' }}>COMPLETED</span>
              <div style={{ ...styles.kpiIconWrap, backgroundColor: 'rgba(5, 150, 105, 0.12)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
            </div>
            <div style={{ ...styles.kpiValue, color: '#059669' }}>{summary.completed_tasks}</div>
            <div style={{ ...styles.kpiFootnote, color: '#047857' }}>Shipped & verified</div>
          </div>

          {/* Overdue */}
          <div style={{ ...styles.kpiCard, backgroundColor: '#FEF2F2', borderColor: 'rgba(220, 38, 38, 0.35)' }}>
            <div style={styles.kpiHeader}>
              <span style={{ ...styles.kpiLabel, color: '#DC2626' }}>OVERDUE</span>
              <div style={{ ...styles.kpiIconWrap, backgroundColor: 'rgba(220, 38, 38, 0.12)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
            </div>
            <div style={{ ...styles.kpiValue, color: '#DC2626' }}>{summary.overdue_tasks}</div>
            <div style={{ ...styles.kpiFootnote, color: '#B91C1C' }}>Needs immediate action</div>
          </div>
        </section>

        {/* Progress Velocity Bar */}
        <section style={styles.velocityCard}>
          <div style={styles.velocityHeader}>
            <div>
              <div style={styles.velocityTitle}>Sprint Velocity & Completion Rate</div>
              <div style={styles.velocitySubtitle}>
                {summary.completed_tasks} of {summary.total_tasks} total work items completed
              </div>
            </div>
            <div style={styles.velocityBadge}>
              <span style={styles.velocityPercentage}>{completionPercentage}%</span>
              <span style={styles.velocityStatusText}>
                {completionPercentage === 100 ? 'All Done! 🎉' : completionPercentage >= 50 ? 'On Track' : 'In Progress'}
              </span>
            </div>
          </div>

          <div style={styles.progressBarTrack}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${completionPercentage}%`,
              }}
            />
          </div>
        </section>

        {/* Task Creation Module */}
        <section style={styles.createCard}>
          <div style={styles.createCardHeader}>
            <h3 style={styles.sectionTitle}>Add New Work Item</h3>
            <span style={styles.sectionBadge}>Fast Dispatch</span>
          </div>

          <form onSubmit={handleCreateTask} style={styles.createForm}>
            <div style={styles.createFormRow}>
              <div style={{ flex: 3 }}>
                <input
                  style={styles.formInput}
                  placeholder="Task title (e.g. Implement OAuth2 Refresh Token)..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ flex: 1, minWidth: '160px' }}>
                <select
                  style={{
                    ...styles.formSelect,
                    backgroundColor: getPriorityStyle(newPriority).bg,
                    color: getPriorityStyle(newPriority).text,
                    borderColor: getPriorityStyle(newPriority).border,
                  }}
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  ...styles.createBtn,
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>{isSubmitting ? 'Creating...' : 'Create Item'}</span>
              </button>
            </div>

            <input
              style={{ ...styles.formInput, marginTop: '10px', fontSize: '13px' }}
              placeholder="Optional description / work item details..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </form>
        </section>

        {/* Controls & Filter Pills Bar */}
        <section style={styles.tableControls}>
          {/* Status Filter Pills */}
          <div style={styles.filterPills}>
            {(['All', 'To Do', 'In Progress', 'Done'] as const).map((st) => {
              const isActive = statusFilter === st;
              const count =
                st === 'All'
                  ? tasks.length
                  : tasks.filter((t) => t.status === st).length;

              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    ...styles.pillBtn,
                    backgroundColor: isActive ? '#4F46E5' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#475569',
                    borderColor: isActive ? '#4F46E5' : '#E2E8F0',
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  <span>{st}</span>
                  <span
                    style={{
                      ...styles.pillCount,
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : '#F1F5F9',
                      color: isActive ? '#FFFFFF' : '#64748B',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Priority Selector */}
          <div style={styles.filterRightGroup}>
            {/* Search Input */}
            <div style={styles.searchWrap}>
              <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                style={styles.searchInput}
                placeholder="Search work items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Priority Filter */}
            <select
              style={styles.priorityFilterSelect}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>

            {/* Clear All Filters */}
            {hasActiveFilters && (
              <button onClick={handleResetFilters} style={styles.resetBtn} title="Reset all filters">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                <span>Reset</span>
              </button>
            )}
          </div>
        </section>

        {/* Work Items Table */}
        <section style={styles.tableCard}>
          <div style={styles.tableHeaderInfo}>
            <div style={styles.tableTitle}>
              Active Work Items
              <span style={styles.tableCount}>({filteredTasks.length})</span>
            </div>
            <button onClick={loadData} style={styles.refreshBtn} title="Sync data">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          {filteredTasks.length === 0 ? (
            /* Empty State */
            <div style={styles.emptyState}>
              <div style={styles.emptyIconWrap}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <h4 style={styles.emptyTitle}>No matching work items found</h4>
              <p style={styles.emptyText}>
                {hasActiveFilters
                  ? 'There are no tasks matching your selected filters or search query.'
                  : 'Your workspace has no tasks yet. Create your first work item above!'}
              </p>
              {hasActiveFilters && (
                <button onClick={handleResetFilters} style={styles.emptyActionBtn}>
                  Clear Active Filters
                </button>
              )}
            </div>
          ) : (
            <div style={styles.tableScroll}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={{ ...styles.th, width: '70px' }}>ID</th>
                    <th style={styles.th}>Title & Details</th>
                    <th style={{ ...styles.th, width: '170px' }}>Status</th>
                    <th style={{ ...styles.th, width: '130px' }}>Priority</th>
                    <th style={{ ...styles.th, width: '120px' }}>Created</th>
                    <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((t) => {
                    const statusSt = getStatusStyle(t.status);
                    const prioritySt = getPriorityStyle(t.priority);
                    const formattedDate = new Date(t.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <tr key={t.id} style={styles.tr}>
                        <td style={styles.tdId}>
                          <span style={styles.idChip}>#{t.id}</span>
                        </td>

                        <td style={styles.td}>
                          <div style={styles.taskTitle}>{t.title}</div>
                          {t.description && (
                            <div style={styles.taskDesc}>{t.description}</div>
                          )}
                        </td>

                        {/* Status Transition Dropdown */}
                        <td style={styles.td}>
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                            style={{
                              ...styles.statusSelect,
                              backgroundColor: statusSt.bg,
                              color: statusSt.text,
                              borderColor: statusSt.border,
                            }}
                          >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                          </select>
                        </td>

                        {/* Priority Badge */}
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.priorityBadge,
                              backgroundColor: prioritySt.bg,
                              color: prioritySt.text,
                              borderColor: prioritySt.border,
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: prioritySt.text,
                                display: 'inline-block',
                              }}
                            />
                            {prioritySt.label}
                          </span>
                        </td>

                        <td style={styles.tdDate}>{formattedDate}</td>

                        {/* Delete Action */}
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteTask(t.id, t.title)}
                            style={styles.deleteBtn}
                            title="Delete task"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              <line x1="10" y1="11" x2="10" y2="17"/>
                              <line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// -------------------------------------------------------------
// STYLES OBJECT (Responsive, Modern Enterprise Aesthetic)
// -------------------------------------------------------------
const styles: { [key: string]: React.CSSProperties } = {
  // App wrapper
  appWrapper: {
    minHeight: '100vh',
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // Toast
  toast: {
    position: 'fixed',
    top: '20px',
    right: '24px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontWeight: 500,
    fontSize: '14px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 9999,
    transition: 'all 0.3s ease',
  },

  // Navbar
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 32px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03)',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navLogo: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
  },
  navBrand: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0F172A',
    letterSpacing: '-0.3px',
  },
  navWorkspace: {
    fontSize: '12px',
    color: '#64748B',
    fontWeight: 500,
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '4px 10px 4px 6px',
    backgroundColor: '#F1F5F9',
    borderRadius: '30px',
    border: '1px solid #E2E8F0',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1E293B',
    lineHeight: 1.2,
  },
  userRoleBadge: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    border: '1px solid #FCA5A5',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Main container
  mainContent: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '28px 24px 60px 24px',
  },

  // KPI Grid
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  kpiCard: {
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  kpiLabel: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.6px',
  },
  kpiIconWrap: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: '32px',
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-1px',
    marginBottom: '6px',
  },
  kpiFootnote: {
    fontSize: '12px',
    fontWeight: 500,
  },

  // Velocity Card
  velocityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px 24px',
    border: '1px solid #E2E8F0',
    marginBottom: '24px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
  },
  velocityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  velocityTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0F172A',
  },
  velocitySubtitle: {
    fontSize: '13px',
    color: '#64748B',
    marginTop: '2px',
  },
  velocityBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  velocityPercentage: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#059669',
  },
  velocityStatusText: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#047857',
    backgroundColor: '#ECFDF5',
    padding: '3px 8px',
    borderRadius: '20px',
  },
  progressBarTrack: {
    height: '10px',
    backgroundColor: '#F1F5F9',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
    borderRadius: '6px',
    transition: 'width 0.4s ease',
  },

  // Create Module
  createCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '22px 24px',
    border: '1px solid #E2E8F0',
    marginBottom: '24px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
  },
  createCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0F172A',
    margin: 0,
  },
  sectionBadge: {
    fontSize: '11px',
    fontWeight: 700,
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    padding: '2px 8px',
    borderRadius: '12px',
    textTransform: 'uppercase',
  },
  createForm: {
    display: 'flex',
    flexDirection: 'column',
  },
  createFormRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  formInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    transition: 'border-color 0.2s ease',
  },
  formSelect: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer',
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 22px',
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.35)',
    transition: 'all 0.2s ease',
  },

  // Filter & Controls Bar
  tableControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  filterPills: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pillBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '20px',
    border: '1px solid',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  pillCount: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '10px',
  },
  filterRightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },
  searchInput: {
    padding: '8px 32px 8px 36px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '13px',
    outline: 'none',
    width: '200px',
    backgroundColor: '#FFFFFF',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '10px',
    background: 'transparent',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  priorityFilterSelect: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    fontSize: '13px',
    fontWeight: 500,
    color: '#334155',
    outline: 'none',
    cursor: 'pointer',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: '#F1F5F9',
    color: '#475569',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Table Card
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
    overflow: 'hidden',
  },
  tableHeaderInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #F1F5F9',
  },
  tableTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0F172A',
  },
  tableCount: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#64748B',
    marginLeft: '6px',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#F8FAFC',
    color: '#475569',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tableScroll: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0',
  },
  th: {
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tr: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background-color 0.15s ease',
  },
  tdId: {
    padding: '14px 16px',
  },
  idChip: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  td: {
    padding: '14px 16px',
  },
  taskTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1E293B',
    lineHeight: 1.3,
  },
  taskDesc: {
    fontSize: '12px',
    color: '#64748B',
    marginTop: '3px',
    lineHeight: 1.3,
  },
  statusSelect: {
    padding: '6px 12px',
    borderRadius: '16px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    outline: 'none',
  },
  priorityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: 600,
  },
  tdDate: {
    padding: '14px 16px',
    fontSize: '13px',
    color: '#64748B',
  },
  deleteBtn: {
    background: '#FEF2F2',
    border: '1px solid #FCA5A5',
    borderRadius: '6px',
    width: '30px',
    height: '30px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Empty State
  emptyState: {
    padding: '60px 24px',
    textAlign: 'center',
  },
  emptyIconWrap: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#F8FAFC',
    border: '1px dashed #CBD5E1',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1E293B',
    margin: '0 0 6px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748B',
    maxWidth: '380px',
    margin: '0 auto 18px auto',
    lineHeight: 1.5,
  },
  emptyActionBtn: {
    padding: '8px 16px',
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Login view styles
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  loginCard: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '36px 32px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
    border: '1px solid #E2E8F0',
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: '26px',
  },
  brandIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 14px rgba(79, 70, 229, 0.35)',
    marginBottom: '14px',
  },
  brandTitle: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#0F172A',
    margin: '0 0 4px 0',
    letterSpacing: '-0.4px',
  },
  brandSubtitle: {
    fontSize: '13px',
    color: '#64748B',
    margin: 0,
    lineHeight: 1.4,
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FCA5A5',
    borderRadius: '8px',
    color: '#B91C1C',
    fontSize: '13px',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
  },
  input: {
    padding: '11px 14px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#F8FAFC',
    transition: 'border-color 0.2s ease',
  },
  submitBtn: {
    padding: '12px',
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.35)',
    marginTop: '6px',
    transition: 'all 0.2s ease',
  },
  demoSection: {
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '1px solid #F1F5F9',
  },
  demoTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#94A3B8',
    letterSpacing: '0.6px',
    marginBottom: '10px',
    textAlign: 'center',
  },
  demoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  demoChip: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s ease',
  },
  demoRole: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#4F46E5',
  },
  demoMail: {
    fontSize: '12px',
    color: '#64748B',
  },
};
