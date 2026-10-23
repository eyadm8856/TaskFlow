import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Settings, 
  ArrowRight, 
  BarChart2, 
  History, 
  Signal, 
  Plus,
  ChevronDown,
  X,
  UserCheck
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import projectsService from '@/services/projects';
import tasksService from '@/services/tasks';
import { localStore, isTeamLeader, filterTasksForUser } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import Loader from '@/components/Loader';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tasks Table filter & search state
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'in_progress', 'todo'
  const [leaderAssigneeFilter, setLeaderAssigneeFilter] = useState('all'); // Team Leader can filter by specific member
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // New Task Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('todo');
  const [creatingTask, setCreatingTask] = useState(false);

  const userIsLeader = useMemo(() => isTeamLeader(user), [user]);

  // Fetch projects, tasks, activities, and members from localStore
  const fetchData = useCallback(async () => {
    if (!user || !user.uid) return;
    try {
      setLoading(true);
      const userProjects = await projectsService.getProjectsForUser(user.uid);
      setProjects(userProjects);

      const teamMembers = localStore.getMembers();
      setMembers(teamMembers);

      // Fetch tasks for all projects
      const tasksNested = await Promise.all(
        userProjects.map(async (p) => {
          const pTasks = await tasksService.getTasksForProject(p.id);
          return pTasks.map((t, idx) => {
            const matchedMember = teamMembers.find((m) => m.uid === t.assigneeId);
            return {
              ...t,
              code: t.code || `TF-${String(idx + 1).padStart(2, '0')}`,
              projectId: p.id,
              projectName: p.name,
              assigneeName: matchedMember?.displayName || t.assigneeName || 'Maya Kassem',
            };
          });
        })
      );
      setTasks(tasksNested.flat());

      // Fetch activities
      setActivities(localStore.getActivities());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLeaderAssigneeFilter('all');
    if (user && user.uid) {
      fetchData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading, fetchData]);

  // Keyboard shortcut listener: press "/" to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quick task status changer
  const handleStatusChange = async (projectId, taskId, newStatus) => {
    try {
      await tasksService.updateTask(projectId, taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      // Log activity
      const targetTask = tasks.find((t) => t.id === taskId);
      if (targetTask) {
        localStore.addActivity({
          type: 'status_updated',
          badgeText: 'Status Updated',
          userName: user?.displayName || 'Team Member',
          userInitials: (user?.displayName || 'U').substring(0, 2).toUpperCase(),
          projectName: targetTask.projectName,
          detail: `Changed status to "${newStatus.replace('_', ' ')}" for "${targetTask.title}"`,
        });
        setActivities(localStore.getActivities());
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  // Create new task handler
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const targetProjId = newTaskProject || projects[0]?.id;
    if (!targetProjId) return;

    setCreatingTask(true);
    try {
      const effectiveAssigneeUid = userIsLeader ? (newTaskAssignee || user.uid) : user.uid;
      const selectedMember =
        members.find((m) => m.uid === effectiveAssigneeUid) ||
        members.find((m) => m.uid === user.uid) ||
        members[0];
      const targetProject = projects.find((p) => p.id === targetProjId);

      const created = await tasksService.createTask(
        targetProjId,
        {
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim(),
          status: newTaskStatus,
          priority: newTaskPriority,
          dueDate: newTaskDueDate || null,
          assigneeId: selectedMember?.uid || user.uid,
          assigneeEmail: selectedMember?.email || user.email,
          assigneeName: selectedMember?.displayName || user.displayName,
        },
        user.uid
      );

      const newTaskWithMeta = {
        ...created,
        code: created.code || `TF-${String(tasks.length + 1).padStart(2, '0')}`,
        projectId: targetProjId,
        projectName: targetProject?.name || 'Project',
        assigneeName: selectedMember?.displayName || user.displayName,
      };

      setTasks((prev) => [newTaskWithMeta, ...prev]);

      // Add to recent activity
      localStore.addActivity({
        type: 'task_created',
        badgeText: 'Task Created',
        userName: user?.displayName || 'Team Member',
        userInitials: (user?.displayName || 'U').substring(0, 2).toUpperCase(),
        projectName: targetProject?.name || 'Project',
        detail: `Created task "${newTaskTitle.trim()}" (assigned to ${selectedMember?.displayName || user?.displayName})`,
      });
      setActivities(localStore.getActivities());

      // Reset modal fields
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskDueDate('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setCreatingTask(false);
    }
  };

  // Scope tasks strictly by role: Team Leader sees ALL tasks; regular Team Member ONLY sees tasks assigned to them
  const scopedTasks = useMemo(() => {
    const roleFiltered = filterTasksForUser(tasks, user);
    if (userIsLeader && leaderAssigneeFilter !== 'all') {
      return roleFiltered.filter((t) => t.assigneeId === leaderAssigneeFilter);
    }
    return roleFiltered;
  }, [tasks, user, userIsLeader, leaderAssigneeFilter]);

  // Active tasks = tasks in user's scope that are not 'done'
  const allActiveTasks = useMemo(() => scopedTasks.filter((t) => t.status !== 'done'), [scopedTasks]);
  const inProgressTasks = useMemo(() => scopedTasks.filter((t) => t.status === 'in_progress'), [scopedTasks]);
  const todoTasks = useMemo(() => scopedTasks.filter((t) => t.status === 'todo'), [scopedTasks]);
  const doneTasks = useMemo(() => scopedTasks.filter((t) => t.status === 'done'), [scopedTasks]);

  // Filtered active tasks according to segmented toggle and search query
  const filteredActiveTasks = useMemo(() => {
    let list = allActiveTasks;
    if (activeFilter === 'in_progress') {
      list = inProgressTasks;
    } else if (activeFilter === 'todo') {
      list = todoTasks;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.projectName?.toLowerCase().includes(q) ||
          t.code?.toLowerCase().includes(q) ||
          t.assigneeName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allActiveTasks, inProgressTasks, todoTasks, activeFilter, searchQuery]);

  // Distribution chart metrics (based on user's visible tasks)
  const totalTasksCount = scopedTasks.length || 1;
  const todoPct = scopedTasks.length > 0 ? Math.round((todoTasks.length / totalTasksCount) * 100) : 0;
  const inProgressPct = scopedTasks.length > 0 ? Math.round((inProgressTasks.length / totalTasksCount) * 100) : 0;
  const donePct = scopedTasks.length > 0 ? Math.round((doneTasks.length / totalTasksCount) * 100) : 0;
  const maxStatusCount = Math.max(todoTasks.length, inProgressTasks.length, doneTasks.length, 4);

  // Helper for formatted date
  const formatDate = (dueDate) => {
    if (!dueDate) return '—';
    let d;
    if (typeof dueDate === 'object' && dueDate !== null) {
      if (typeof dueDate.toDate === 'function') d = dueDate.toDate();
      else if (typeof dueDate.seconds === 'number') d = new Date(dueDate.seconds * 1000);
      else return '—';
    } else {
      d = new Date(dueDate);
    }
    if (isNaN(d.getTime())) return String(dueDate).slice(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (authLoading || loading) return <Loader label="Loading dashboard..." />;

  return (
    <ProtectedRoute>
      <div className="container" style={{ paddingBottom: '3rem' }}>
        {/* Top Header */}
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: 'clamp(1.45rem, 3vw, 1.85rem)', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
                Personal Dashboard
              </h1>
              <span
                className="badge"
                style={{
                  backgroundColor: userIsLeader ? 'var(--color-navy)' : 'var(--color-baby-blue-light)',
                  color: userIsLeader ? '#FDFBF7' : 'var(--color-navy)',
                  border: '1px solid var(--color-baby-blue)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.65rem',
                }}
              >
                {userIsLeader ? '👑 Team Leader — Viewing All Team Tasks' : `👤 ${user?.role || 'Team Member'} — Assigned to You Only`}
              </span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Welcome back, <strong>{user?.displayName}</strong> ({user?.email}).{' '}
              {userIsLeader
                ? 'As Team Leader, you have full visibility across all team members and projects:'
                : 'Showing only the tasks specifically assigned to your account:'}
            </p>
          </div>
          <div className="page-header-actions">
            <button
              type="button"
              onClick={() => {
                setNewTaskProject(projects[0]?.id || '');
                setNewTaskAssignee(user?.uid || members[0]?.uid || '');
                setIsModalOpen(true);
              }}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} />
              <span>+ Add Task</span>
            </button>
            <Link to="/projects/new" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} />
              <span>New Project</span>
            </Link>
          </div>
        </div>

        {/* 1. TOP SECTION: ACTIVE TASKS CARD */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
          {/* Header Row */}
          <div className="calendar-toolbar" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                {userIsLeader ? 'All Active Team Tasks' : 'My Active Tasks'}
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {filteredActiveTasks.length} of {allActiveTasks.length} shown
              </span>
            </div>

            <div className="calendar-toolbar-group">
              {/* Team Leader Member Filter Dropdown */}
              {userIsLeader && (
                <select
                  value={leaderAssigneeFilter}
                  onChange={(e) => setLeaderAssigneeFilter(e.target.value)}
                  className="form-select"
                  style={{
                    width: 'auto',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    height: 'auto',
                  }}
                  aria-label="Filter by Team Member"
                >
                  <option value="all">👥 All Team Members ({members.length})</option>
                  {members.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName} ({m.role})
                    </option>
                  ))}
                </select>
              )}
              {/* Filter Toggle Buttons */}
              <div className="segmented-group">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    backgroundColor: activeFilter === 'all' ? 'var(--color-surface)' : 'transparent',
                    color: activeFilter === 'all' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    boxShadow: activeFilter === 'all' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 120ms ease',
                  }}
                >
                  All Active ({allActiveTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('in_progress')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    backgroundColor: activeFilter === 'in_progress' ? 'var(--color-surface)' : 'transparent',
                    color: activeFilter === 'in_progress' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    boxShadow: activeFilter === 'in_progress' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 120ms ease',
                  }}
                >
                  In Progress ({inProgressTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('todo')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    backgroundColor: activeFilter === 'todo' ? 'var(--color-surface)' : 'transparent',
                    color: activeFilter === 'todo' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    boxShadow: activeFilter === 'todo' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 120ms ease',
                  }}
                >
                  To Do ({todoTasks.length})
                </button>
              </div>

              {/* Quick Add Task Button */}
              <button
                type="button"
                onClick={() => {
                  setNewTaskProject(projects[0]?.id || '');
                  setNewTaskAssignee(user?.uid || members[0]?.uid || '');
                  setIsModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem' }}
              >
                <Plus size={15} />
                <span>Add Task</span>
              </button>
            </div>
          </div>

          {/* Search Bar with "/" shortcut indicator */}
          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <Search
              size={17}
              style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter active tasks by title or description across all accessible projects..."
              className="form-input"
              style={{
                paddingLeft: '2.5rem',
                paddingRight: '2.5rem',
                height: '42px',
                fontSize: '0.9rem',
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                backgroundColor: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                padding: '0.1rem 0.45rem',
                borderRadius: '4px',
                pointerEvents: 'none',
              }}
            >
              /
            </span>
          </div>

          {/* Table of Active Tasks */}
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Task</th>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Project</th>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Priority</th>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Assignee</th>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Due date</th>
                </tr>
              </thead>
              <tbody>
                {filteredActiveTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No active tasks matching your filter. Click &quot;Add Task&quot; above to create one!
                    </td>
                  </tr>
                ) : (
                  filteredActiveTasks.map((task) => {
                    const statusIcon = task.status === 'in_progress' ? '◐' : '◌';
                    const initials = (task.assigneeName || 'LM').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                    return (
                      <tr
                        key={task.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          transition: 'background-color 100ms ease',
                        }}
                      >
                        {/* Task Column with Code, Title, and Description */}
                        <td style={{ padding: '0.85rem 0.5rem', maxWidth: '320px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1rem', color: task.status === 'in_progress' ? 'var(--color-warning)' : 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                              {statusIcon}
                            </span>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--color-navy)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                  {task.code}
                                </span>
                                <span>{task.title}</span>
                              </div>
                              {task.description && (
                                <p style={{ fontSize: '0.775rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Project Column */}
                        <td style={{ padding: '0.85rem 0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
                          <Link to={`/projects/${task.projectId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {task.projectName}
                          </Link>
                        </td>

                        {/* Status Dropdown */}
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.projectId, task.id, e.target.value)}
                              className="form-select"
                              style={{
                                padding: '0.3rem 1.6rem 0.3rem 0.6rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-border)',
                                appearance: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="todo">◌ To Do</option>
                              <option value="in_progress">◐ In Progress</option>
                              <option value="done">● Done</option>
                            </select>
                            <ChevronDown
                              size={13}
                              style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}
                            />
                          </div>
                        </td>

                        {/* Priority Column */}
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.825rem', color: 'var(--color-text-primary)' }}>
                            <Signal size={14} color="var(--color-navy)" />
                            <span style={{ textTransform: 'capitalize' }}>{task.priority || 'Medium'}</span>
                          </span>
                        </td>

                        {/* Assignee Column */}
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-surface-hover)',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-text-primary)',
                              }}
                            >
                              {initials}
                            </span>
                            <span style={{ fontSize: '0.825rem', color: 'var(--color-text-primary)' }}>
                              {task.assigneeName}
                            </span>
                          </div>
                        </td>

                        {/* Due Date Column */}
                        <td style={{ padding: '0.85rem 0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.825rem', fontVariantNumeric: 'tabular-nums' }}>
                          {formatDate(task.dueDate)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. SPLIT SECTION: Left (Projects + Recent Activity), Right (Task Status Distribution) */}
        <div className="dashboard-split-grid">
          {/* LEFT COLUMN: Projects & Recent Activity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', minWidth: 0, width: '100%' }}>
            {/* Projects Header & Cards */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                  Projects ({projects.length})
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {projects.map((proj) => {
                  const projTasks = scopedTasks.filter((t) => t.projectId === proj.id);
                  const completedCount = projTasks.filter((t) => t.status === 'done').length;
                  const activeCount = projTasks.filter((t) => t.status !== 'done').length;
                  const completionPct = projTasks.length > 0 ? Math.round((completedCount / projTasks.length) * 100) : 0;
                  const leadName = proj.leadName || 'Maya Kassem';
                  const leadInitials = leadName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <div key={proj.id} className="card" style={{ padding: '1.25rem' }}>
                      {/* Top Meta Line & Action Buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.65rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          <span>Owner</span>
                          <span style={{ margin: '0 0.35rem' }}>·</span>
                          <span>Lead: {leadName}</span>
                          <span style={{ margin: '0 0.35rem' }}>·</span>
                          <span>{completionPct}% complete</span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <Link
                            to={`/projects/${proj.id}/settings`}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem' }}
                          >
                            <Settings size={14} />
                            <span>Settings</span>
                          </Link>
                          <Link
                            to={`/projects/${proj.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.85rem' }}
                          >
                            <span>Open Project</span>
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>

                      {/* Project Title with circular indicator */}
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '1rem', fontWeight: 400 }}>◯</span>
                        <Link to={`/projects/${proj.id}`} style={{ color: 'var(--color-navy)', textDecoration: 'none' }}>
                          {proj.name}
                        </Link>
                      </h3>

                      {/* Project Description */}
                      {proj.description && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.45, marginBottom: '1rem' }}>
                          {proj.description}
                        </p>
                      )}

                      {/* Bottom stats row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.65rem', borderTop: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        <div>
                          <span>{projTasks.length} {projTasks.length === 1 ? 'task' : 'tasks'}</span>
                          <span style={{ margin: '0 0.4rem' }}>·</span>
                          <span>{activeCount} active</span>
                          <span style={{ margin: '0 0.4rem' }}>·</span>
                          <span>{completedCount} of {projTasks.length} completed</span>
                        </div>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-surface-hover)',
                            border: '1px solid var(--color-border)',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-primary)',
                          }}
                          title={`Lead: ${leadName}`}
                        >
                          {leadInitials}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                  <History size={18} />
                  <span>Recent Activity</span>
                </div>
                <span style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
                  Last {activities.length} {activities.length === 1 ? 'operation' : 'operations'}
                </span>
              </div>

              <div className="card" style={{ padding: '0.75rem 1.25rem' }}>
                {activities.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      padding: '0.75rem 0',
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    <span
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-primary)',
                        flexShrink: 0,
                      }}
                    >
                      {act.userInitials || 'LH'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: 'var(--color-surface-hover)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {act.badgeText || 'Task Created'}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-navy)' }}>
                            {act.userName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>·</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            {act.projectName}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {act.timeAgo || '1h ago'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                        {act.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Task Status Distribution Chart Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                <BarChart2 size={18} color="var(--color-navy)" />
                <span>Task Status Distribution</span>
              </div>
              <span style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
                {scopedTasks.length} {scopedTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>

            {/* Vertical Bar Chart Graphic with Y-Axis */}
            <div style={{ position: 'relative', height: '170px', marginBottom: '1.5rem', paddingLeft: '28px', paddingBottom: '24px' }}>
              {/* Dotted horizontal grid lines & Y labels */}
              {[4, 3, 2, 1, 0].map((val) => (
                <div
                  key={val}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: `${(val / 4) * 140 + 24}px`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ width: '18px', fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                    {val}
                  </span>
                  <div style={{ flex: 1, borderBottom: '1px dashed var(--color-border)', opacity: 0.7 }} />
                </div>
              ))}

              {/* 3 Vertical Bars */}
              <div
                style={{
                  position: 'absolute',
                  left: '34px',
                  right: '12px',
                  bottom: '24px',
                  height: '140px',
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'flex-end',
                }}
              >
                {/* To Do Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: `${Math.max((todoTasks.length / maxStatusCount) * 135, 6)}px`,
                      backgroundColor: 'var(--color-text-muted)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 250ms ease-out',
                    }}
                    title={`To Do: ${todoTasks.length}`}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', whiteSpace: 'nowrap' }}>
                    To Do
                  </span>
                </div>

                {/* In Progress Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: `${Math.max((inProgressTasks.length / maxStatusCount) * 135, 6)}px`,
                      backgroundColor: 'var(--color-accent)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 250ms ease-out',
                    }}
                    title={`In Progress: ${inProgressTasks.length}`}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', whiteSpace: 'nowrap' }}>
                    In Progress
                  </span>
                </div>

                {/* Done Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: `${Math.max((doneTasks.length / maxStatusCount) * 135, 6)}px`,
                      backgroundColor: 'var(--color-success)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 250ms ease-out',
                    }}
                    title={`Done: ${doneTasks.length}`}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', whiteSpace: 'nowrap' }}>
                    Done
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Summary Legend Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: '1px solid var(--color-border)',
                fontSize: '0.78rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.2rem' }}>
                  <span>◌</span>
                  <span>To Do</span>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  {todoTasks.length} ({todoPct}%)
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.2rem' }}>
                  <span>◐</span>
                  <span>In Progress</span>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  {inProgressTasks.length} ({inProgressPct}%)
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.2rem' }}>
                  <span>●</span>
                  <span>Done</span>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  {doneTasks.length} ({donePct}%)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. NEW TASK CREATION MODAL */}
        {isModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(27, 42, 74, 0.6)',
              backdropFilter: 'blur(3px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '520px',
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-lg)',
                animation: 'scaleIn 150ms ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserCheck size={20} color="var(--color-baby-blue)" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                    Create New Task
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTask}>
                <div className="form-group">
                  <label className="form-label">
                    Task Title <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. Conduct security penetration test"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Details about task objectives, acceptance criteria, or links..."
                    className="form-textarea"
                    rows={2}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Project</label>
                    <select
                      value={newTaskProject}
                      onChange={(e) => setNewTaskProject(e.target.value)}
                      className="form-select"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assignee</label>
                    <select
                      value={userIsLeader ? newTaskAssignee : (user?.uid || '')}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      disabled={!userIsLeader}
                      className="form-select"
                    >
                      {(userIsLeader ? members : members.filter((m) => m.uid === user?.uid)).map((m) => (
                        <option key={m.uid} value={m.uid}>
                          {m.displayName} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      className="form-select"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      value={newTaskStatus}
                      onChange={(e) => setNewTaskStatus(e.target.value)}
                      className="form-select"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTask || !newTaskTitle.trim()}
                    className="btn btn-primary"
                  >
                    {creatingTask ? 'Saving Task...' : 'Save & Assign Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
