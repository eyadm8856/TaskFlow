import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import projectsService from '@/services/projects';
import tasksService, { isOverdue } from '@/services/tasks';
import usersService from '@/services/users';
import { filterTasksForUser, isTeamLeader } from '@/lib/storage';
import ProtectedRoute from '@/components/ProtectedRoute';
import TaskList from '@/components/TaskList';
import TaskForm from '@/components/TaskForm';
import FilterBar from '@/components/FilterBar';
import Loader from '@/components/Loader';

export default function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const userIsLeader = useMemo(() => isTeamLeader(user), [user]);

  // Form states
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isSavingTask, setIsSavingTask] = useState(false);

  // View state: 'list' | 'board' (Kanban bonus feature)
  const [viewMode, setViewMode] = useState('list');

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user || !user.uid || !projectId) return;
    try {
      setLoading(true);
      const p = await projectsService.getProjectById(projectId);
      setProject(p);
      if (p && p.memberIds && p.memberIds.includes(user.uid)) {
        const [t, m] = await Promise.all([
          tasksService.getTasksForProject(projectId),
          usersService.getUsersByIds(p.memberIds),
        ]);
        setTasks(t);
        setMembers(m);
      }
    } catch (err) {
      console.error('Error fetching project data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    if (projectId && user && user.uid) {
      fetchData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [projectId, user, authLoading, fetchData]);

  // Role-based visibility: Team Leader sees all tasks in project; regular members see only tasks assigned to them
  const roleVisibleTasks = useMemo(() => {
    return filterTasksForUser(tasks, user);
  }, [tasks, user]);

  // Client-side filtering
  const filteredTasks = roleVisibleTasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter && t.status !== statusFilter) {
      return false;
    }
    if (priorityFilter && t.priority !== priorityFilter) {
      return false;
    }
    if (userIsLeader && assigneeFilter) {
      if (assigneeFilter === 'unassigned') {
        if (t.assigneeId) return false;
      } else if (t.assigneeId !== assigneeFilter) {
        return false;
      }
    }
    if (overdueOnly && !isOverdue(t)) {
      return false;
    }
    return true;
  });

  const handleSaveTask = async (taskData) => {
    if (!user || !user.uid) return;
    setIsSavingTask(true);
    try {
      if (editingTask) {
        await tasksService.updateTask(projectId, editingTask.id, taskData);
        setEditingTask(null);
      } else {
        await tasksService.createTask(projectId, taskData, user.uid);
        setShowTaskForm(false);
      }
      await fetchData();
    } catch (err) {
      alert('Failed to save task: ' + err.message);
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await tasksService.updateTask(projectId, taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      alert('Failed to update task status: ' + err.message);
      await fetchData();
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksService.deleteTask(projectId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      alert('Failed to delete task: ' + err.message);
      await fetchData();
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setOverdueOnly(false);
  };

  if (authLoading || loading) return <Loader />;

  if (!user) {
    return (
      <ProtectedRoute>
        <div />
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute>
        <div className="container" style={{ textAlign: 'center', padding: '3rem 0' }}>
          <h2>Project Not Found</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: '1rem 0' }}>
            The requested project could not be found or has been deleted.
          </p>
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  const isMember = Boolean(project.memberIds && user && project.memberIds.includes(user.uid));
  if (!isMember) {
    return (
      <ProtectedRoute>
        <div className="container" style={{ textAlign: 'center', padding: '3rem 0' }}>
          <h2>Access Denied</h2>
          <p style={{ color: 'var(--color-danger, #ef4444)', margin: '1rem 0' }}>
            You are not a member of this project. Ask the project owner to add your email.
          </p>
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  const isOwner = Boolean(user && project.ownerId === user.uid);

  const columns = [
    { id: 'todo', title: 'To Do', color: 'var(--color-baby-blue, #A2C2E8)' },
    { id: 'in_progress', title: 'In Progress', color: 'var(--color-warning, #925414)' },
    { id: 'done', title: 'Done', color: 'var(--color-success, #1A633F)' },
  ];

  return (
    <ProtectedRoute>
      <div className="container" style={{ paddingBottom: '3rem' }}>
        {/* Project Header */}
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'clamp(1.45rem, 3vw, 1.85rem)', fontWeight: 800, color: 'var(--color-navy)' }}>{project.name}</h1>
              <span className="badge" style={{ backgroundColor: 'var(--color-baby-blue-light)', color: 'var(--color-navy)', borderColor: 'var(--color-baby-blue-border)', fontSize: '0.85rem' }}>
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
              {isOwner && (
                <span className="badge" style={{ backgroundColor: 'var(--color-navy)', color: 'var(--color-off-white)', fontSize: '0.8rem' }}>
                  Owner
                </span>
              )}
            </div>
            {project.description && (
              <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem', maxWidth: '750px', whiteSpace: 'pre-wrap' }}>
                {project.description}
              </p>
            )}
          </div>

          <div className="page-header-actions">
            {isOwner && (
              <Link to={`/projects/${projectId}/settings`} className="btn btn-secondary">
                ⚙️ Settings & Members
              </Link>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingTask(null);
                setShowTaskForm((prev) => !prev);
              }}
            >
              {showTaskForm ? '✕ Close Form' : '+ New Task'}
            </button>
          </div>
        </div>

        {/* Task Create / Edit Modal / Form */}
        {(showTaskForm || editingTask) && (
          <TaskForm
            initialData={editingTask || {}}
            members={members}
            onSubmit={handleSaveTask}
            onCancel={() => {
              setShowTaskForm(false);
              setEditingTask(null);
            }}
            isLoading={isSavingTask}
          />
        )}

        {/* Discovery: Filters & Search & View Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-navy)' }}>
              {userIsLeader ? 'All Project Tasks' : 'My Assigned Tasks'} ({filteredTasks.length}{filteredTasks.length !== roleVisibleTasks.length ? ` of ${roleVisibleTasks.length}` : ''})
            </h2>
            <span
              className="badge"
              style={{
                backgroundColor: userIsLeader ? 'var(--color-navy)' : 'var(--color-baby-blue-light)',
                color: userIsLeader ? 'var(--color-off-white)' : 'var(--color-navy)',
                borderColor: 'var(--color-baby-blue-border)',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              {userIsLeader ? '👑 Team Leader View (All Members)' : `👤 Assigned to ${user?.displayName} Only`}
            </span>
          </div>

          {/* Kanban / List View Switcher */}
          <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.4rem 0.9rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'list' ? 'var(--color-navy)' : 'var(--color-surface)',
                color: viewMode === 'list' ? 'var(--color-off-white)' : 'var(--color-text-secondary)',
                transition: 'all 150ms ease',
              }}
            >
              📋 List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              style={{
                padding: '0.4rem 0.9rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'board' ? 'var(--color-navy)' : 'var(--color-surface)',
                color: viewMode === 'board' ? 'var(--color-off-white)' : 'var(--color-text-secondary)',
                transition: 'all 150ms ease',
              }}
            >
              📊 Kanban Board
            </button>
          </div>
        </div>

        {/* FilterBar Component */}
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          priority={priorityFilter}
          onPriorityChange={setPriorityFilter}
          assigneeId={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          overdueOnly={overdueOnly}
          onOverdueToggle={setOverdueOnly}
          members={members}
          currentUserId={user?.uid}
          isTeamLeader={userIsLeader}
          onReset={handleResetFilters}
        />

        {/* Content View: List or Kanban */}
        {viewMode === 'list' ? (
          <TaskList
            tasks={filteredTasks}
            members={members}
            currentUserId={user?.uid}
            isProjectOwner={isOwner}
            onStatusChange={handleUpdateStatus}
            onEdit={(task) => {
              setShowTaskForm(false);
              setEditingTask(task);
            }}
            onDelete={handleDeleteTask}
          />
        ) : (
          <div className="kanban-grid">
            {columns.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className="card"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    padding: '1.1rem',
                    minHeight: '350px',
                    borderTop: `4px solid ${col.color}`,
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-navy)' }}>{col.title}</h3>
                    <span className="badge" style={{ backgroundColor: 'var(--color-baby-blue-light)', color: 'var(--color-navy)', borderColor: 'var(--color-baby-blue-border)', fontWeight: 700 }}>
                      {colTasks.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {colTasks.map((task) => {
                      const overdue = isOverdue(task);
                      const assignee = members.find((m) => m.id === task.assigneeId);
                      return (
                        <div
                          key={task.id}
                          className="card"
                          style={{
                            padding: '0.9rem',
                            backgroundColor: overdue ? '#FFFDFB' : 'var(--color-surface)',
                            borderColor: overdue ? 'var(--color-danger-border)' : 'var(--color-border)',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-navy)' }}>{task.title}</div>
                          {task.description && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                              {task.description.length > 70 ? `${task.description.slice(0, 70)}...` : task.description}
                            </p>
                          )}

                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                            <span className={`badge badge-priority-${task.priority}`} style={{ fontSize: '0.75rem' }}>
                              {task.priority}
                            </span>
                            {overdue && (
                              <span className="badge badge-overdue" style={{ fontSize: '0.75rem' }}>
                                Overdue
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                            👤 {assignee ? (assignee.displayName || assignee.email) : 'Unassigned'}
                          </div>

                          <div style={{ display: 'flex', gap: '0.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                            {columns
                              .filter((c) => c.id !== task.status)
                              .map((targetCol) => (
                                <button
                                  key={targetCol.id}
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', color: 'var(--color-navy)' }}
                                  onClick={() => handleUpdateStatus(task.id, targetCol.id)}
                                >
                                  → {targetCol.title}
                                </button>
                              ))}
                          </div>
                        </div>
                      );
                    })}

                    {colTasks.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        No tasks in this column
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
