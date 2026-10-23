import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar as CalendarIcon,
  Plus, 
  ExternalLink, 
  X,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import projectsService from '@/services/projects';
import tasksService, { isOverdue } from '@/services/tasks';
import { localStore, isTeamLeader, filterTasksForUser } from '@/lib/storage';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loader from '@/components/Loader';
import EmptyState from '@/components/EmptyState';

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

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

  // Instant local load to guarantee tasks are never empty on initial render
  useEffect(() => {
    const localProjects = localStore.getProjects();
    const localTasks = localStore.getAllTasks();
    const teamMembers = localStore.getMembers();
    if (localProjects.length > 0) setProjects(localProjects);
    if (localTasks.length > 0) setTasks(localTasks);
    if (teamMembers.length > 0) setMembers(teamMembers);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const userUid = user?.uid || 'user-maya-kassem';
      let userProjects = await projectsService.getProjectsForUser(userUid);
      if (!userProjects || userProjects.length === 0) {
        userProjects = localStore.getProjects();
      }
      setProjects(userProjects);
      const teamMembers = localStore.getMembers();
      setMembers(teamMembers);

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
      let flatTasks = tasksNested.flat();
      if (flatTasks.length === 0) {
        flatTasks = localStore.getAllTasks();
      }
      setTasks(flatTasks);
    } catch (err) {
      console.error('Failed to load all tasks:', err);
      setTasks(localStore.getAllTasks());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setAssigneeFilter('all');
    fetchData();
  }, [fetchData, user]);

  const handleUpdateStatus = async (projectId, taskId, newStatus) => {
    try {
      await tasksService.updateTask(projectId, taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const targetProjId = newTaskProject || projects[0]?.id;
    if (!targetProjId) return;

    setCreatingTask(true);
    try {
      const effectiveAssigneeUid = userIsLeader ? (newTaskAssignee || user?.uid) : user?.uid;
      const selectedMember =
        members.find((m) => m.uid === effectiveAssigneeUid) ||
        members.find((m) => m.uid === user?.uid) ||
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
          assigneeId: selectedMember?.uid || user?.uid || 'user-maya-kassem',
          assigneeEmail: selectedMember?.email || user?.email,
          assigneeName: selectedMember?.displayName || user?.displayName || 'Maya Kassem',
        },
        user?.uid || 'user-maya-kassem'
      );

      const newTaskWithMeta = {
        ...created,
        code: created.code || `TF-${String(tasks.length + 1).padStart(2, '0')}`,
        projectId: targetProjId,
        projectName: targetProject?.name || 'Project',
        assigneeName: selectedMember?.displayName || user?.displayName || 'Maya Kassem',
      };

      setTasks((prev) => [newTaskWithMeta, ...prev]);

      localStore.addActivity({
        type: 'task_created',
        badgeText: 'Task Created',
        userName: user?.displayName || 'Team Member',
        userInitials: (user?.displayName || 'U').substring(0, 2).toUpperCase(),
        projectName: targetProject?.name || 'Project',
        detail: `Created task "${newTaskTitle.trim()}" (assigned to ${selectedMember?.displayName || 'team'})`,
      });

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

  // Scope tasks strictly by role: Team Leader sees ALL tasks; regular Team Members ONLY see their own tasks
  const roleScopedTasks = useMemo(() => {
    return filterTasksForUser(tasks, user);
  }, [tasks, user]);

  const filteredTasks = useMemo(() => {
    return roleScopedTasks.filter((t) => {
      if (userIsLeader && assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) {
        return false;
      }
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) {
        return false;
      }
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
        return false;
      }
      if (overdueOnly && !isOverdue(t)) {
        return false;
      }
      if (search) {
        const query = search.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = (t.description || '').toLowerCase().includes(query);
        const matchesProj = (t.projectName || '').toLowerCase().includes(query);
        const matchesAssignee = (t.assigneeName || '').toLowerCase().includes(query);
        const matchesCode = (t.code || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesProj && !matchesAssignee && !matchesCode) {
          return false;
        }
      }
      return true;
    });
  }, [roleScopedTasks, userIsLeader, assigneeFilter, selectedProjectId, statusFilter, priorityFilter, overdueOnly, search]);

  const formatDueDate = (dueDate) => {
    if (!dueDate) return 'No due date';
    let date;
    if (typeof dueDate === 'object' && dueDate !== null) {
      if (typeof dueDate.toDate === 'function') date = dueDate.toDate();
      else if (typeof dueDate.seconds === 'number') date = new Date(dueDate.seconds * 1000);
      else return 'No due date';
    } else {
      date = new Date(dueDate);
    }
    if (isNaN(date.getTime())) return String(dueDate).slice(0, 10);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const stats = useMemo(() => {
    return {
      total: roleScopedTasks.length,
      todo: roleScopedTasks.filter((t) => t.status === 'todo').length,
      inProgress: roleScopedTasks.filter((t) => t.status === 'in_progress').length,
      done: roleScopedTasks.filter((t) => t.status === 'done').length,
      overdue: roleScopedTasks.filter(isOverdue).length,
    };
  }, [roleScopedTasks]);

  if (authLoading && loading && tasks.length === 0) return <Loader label="Loading tasks..." />;

  return (
    <ProtectedRoute>
      <div className="container" style={{ paddingBottom: '3rem' }}>
        {/* Header Strip */}
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: 'clamp(1.45rem, 3vw, 2rem)', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
                {userIsLeader ? 'All Team Tasks' : 'My Assigned Tasks'}
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
                {userIsLeader ? '👑 Team Leader — Viewing All Members' : `👤 ${user?.displayName} — Personal Tasks Only`}
              </span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
              {userIsLeader ? (
                <>Manage and track all tasks across your <strong>{members.length} team members</strong> and <strong>{projects.length} projects</strong></>
              ) : (
                <>Showing only the tasks assigned to <strong>{user?.displayName}</strong> ({user?.email})</>
              )}
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
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={15} />
              <span>+ Add Task</span>
            </button>
            <Link to="/calendar" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <CalendarIcon size={15} />
              <span>Calendar View</span>
            </Link>
            <Link to="/projects/new" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Plus size={15} />
              <span>New Project</span>
            </Link>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="tasks-kpi-grid">
          <div className="card" style={{ padding: '0.85rem 1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-navy)', fontVariantNumeric: 'tabular-nums' }}>{stats.total}</div>
          </div>
          <div className="card" style={{ padding: '0.85rem 1rem', borderTop: '3px solid var(--color-baby-blue)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>To Do</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-navy)', fontVariantNumeric: 'tabular-nums' }}>{stats.todo}</div>
          </div>
          <div className="card" style={{ padding: '0.85rem 1rem', borderTop: '3px solid var(--color-warning)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>In Progress</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-warning)', fontVariantNumeric: 'tabular-nums' }}>{stats.inProgress}</div>
          </div>
          <div className="card" style={{ padding: '0.85rem 1rem', borderTop: '3px solid var(--color-success)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Done</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>{stats.done}</div>
          </div>
          <div className="card" style={{ padding: '0.85rem 1rem', borderTop: '3px solid var(--color-danger)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Overdue</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-danger)', fontVariantNumeric: 'tabular-nums' }}>{stats.overdue}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
          <div className="filter-grid">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.825rem' }}>Search</label>
              <input
                type="text"
                className="form-input"
                placeholder="Search tasks, codes, or projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {userIsLeader && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.825rem' }}>Team Member</label>
                <select
                  className="form-select"
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                >
                  <option value="all">All Members ({members.length})</option>
                  {members.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.825rem' }}>Project</label>
              <select
                className="form-select"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="all">All Projects ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.825rem' }}>Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.825rem' }}>Priority</label>
              <select
                className="form-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: overdueOnly ? 'var(--color-danger)' : 'var(--color-navy)' }}>
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                style={{ width: '1rem', height: '1rem', accentColor: 'var(--color-navy)' }}
              />
              <span>⚠️ Show Overdue Tasks Only</span>
            </label>

            {(search || selectedProjectId !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || overdueOnly) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedProjectId('all');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setAssigneeFilter('all');
                  setOverdueOnly(false);
                }}
                className="btn btn-ghost btn-sm"
              >
                ✕ Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Task List Table / Cards */}
        {filteredTasks.length === 0 ? (
          <EmptyState
            title="No tasks match your criteria"
            description="Try adjusting your filters or click '+ Add Task' above to create a new task."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredTasks.map((task) => {
              const overdue = isOverdue(task);
              const initials = (task.assigneeName || 'LM').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

              return (
                <div
                  key={task.id}
                  className="card"
                  style={{
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    borderColor: overdue ? 'var(--color-danger-border)' : 'var(--color-border)',
                    backgroundColor: overdue ? 'var(--color-danger-bg)' : 'var(--color-surface)',
                  }}
                >
                  <div className="task-card-top">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                          {task.code || 'TF'}
                        </span>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                          {task.title}
                        </h3>
                        <span className={`badge badge-priority-${task.priority}`} style={{ fontSize: '0.75rem' }}>
                          {task.priority?.toUpperCase()}
                        </span>
                        {overdue && (
                          <span className="badge badge-overdue" style={{ fontSize: '0.75rem' }}>
                            ⚠️ Overdue
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Status Selector */}
                    <div className="mobile-full-width" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <select
                        value={task.status}
                        onChange={(e) => handleUpdateStatus(task.projectId, task.id, e.target.value)}
                        className="form-select mobile-full-width"
                        style={{
                          width: 'auto',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          borderColor: task.status === 'done' ? 'var(--color-success-border)' : 'var(--color-baby-blue)',
                        }}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>

                  <div className="task-card-bottom">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>📁 <strong>{task.projectName}</strong></span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
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
                        <span>{task.assigneeName}</span>
                      </span>
                      <span>📅 Due: <strong style={{ color: overdue ? 'var(--color-danger)' : 'inherit' }}>{formatDueDate(task.dueDate)}</strong></span>
                    </div>

                    <Link
                      to={`/projects/${task.projectId}`}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <span>Go to Project</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Task Creation Modal */}
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
                      value={userIsLeader ? newTaskAssignee : (user?.uid || newTaskAssignee)}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      className="form-select"
                      disabled={!userIsLeader}
                    >
                      {(userIsLeader ? members : members.filter((m) => (m.uid || m.id) === user?.uid)).map((m) => (
                        <option key={m.uid || m.id} value={m.uid || m.id}>
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
