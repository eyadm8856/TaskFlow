import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  ExternalLink,
  Plus,
  ListChecks,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import projectsService from '@/services/projects';
import tasksService, { isOverdue } from '@/services/tasks';
import { localStore, filterTasksForUser, isTeamLeader } from '@/lib/storage';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loader from '@/components/Loader';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const userIsLeader = useMemo(() => isTeamLeader(user), [user]);

  // Calendar View State: default to current date
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );

  // Filters State
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'completed'

  // Instant local load so calendar never opens blank
  useEffect(() => {
    const localProjs = localStore.getProjects();
    const localTasks = localStore.getAllTasks();
    const localMembers = localStore.getMembers();
    if (localProjs.length > 0) setProjects(localProjs);
    if (localTasks.length > 0) setTasks(localTasks);
    if (localMembers.length > 0) setMembers(localMembers);
  }, []);

  // Fetch all user projects and tasks
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
      console.error('Failed to load calendar tasks:', err);
      setTasks(localStore.getAllTasks());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setAssigneeFilter('all');
    fetchData();
  }, [fetchData, user]);

  // Handle task status update directly from calendar
  const handleUpdateTaskStatus = async (projectId, taskId, newStatus) => {
    try {
      await tasksService.updateTask(projectId, taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  // Helper to parse due date to YYYY-MM-DD
  const getTaskDateStr = (dueDate) => {
    if (!dueDate) return null;
    if (typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim())) {
      return dueDate.trim();
    }
    const date = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    if (isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Strict Role-Based Visibility: Team Leader sees all tasks; regular members only see tasks assigned to them
  const roleVisibleTasks = useMemo(() => {
    return filterTasksForUser(tasks, user);
  }, [tasks, user]);

  // Filter tasks based on project, member (for leader), and active/completed filter
  const filteredTasks = useMemo(() => {
    return roleVisibleTasks.filter((t) => {
      if (userIsLeader && assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) {
        return false;
      }
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) {
        return false;
      }
      if (statusFilter === 'active' && t.status === 'done') {
        return false;
      }
      if (statusFilter === 'completed' && t.status !== 'done') {
        return false;
      }
      return true;
    });
  }, [roleVisibleTasks, userIsLeader, assigneeFilter, selectedProjectId, statusFilter]);

  // Map tasks by date string
  const tasksByDate = useMemo(() => {
    const map = {};
    for (const t of filteredTasks) {
      const dateStr = getTaskDateStr(t.dueDate);
      if (dateStr) {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(t);
      }
    }
    return map;
  }, [filteredTasks]);

  // Tasks with no due date (Unscheduled backlog)
  const unscheduledTasks = useMemo(() => {
    return filteredTasks.filter((t) => !getTaskDateStr(t.dueDate));
  }, [filteredTasks]);

  // Scheduled tasks in current month sorted chronologically
  const currentMonthTasks = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const list = [];
    for (const [dateStr, dayList] of Object.entries(tasksByDate)) {
      if (dateStr.startsWith(prefix)) {
        dayList.forEach((task) => list.push({ ...task, resolvedDateStr: dateStr }));
      }
    }
    return list.sort((a, b) => a.resolvedDateStr.localeCompare(b.resolvedDateStr));
  }, [tasksByDate, currentYear, currentMonth]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setSelectedDateStr(todayStr);
  };

  // Generate calendar days for the monthly grid (35 or 42 cells)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Previous month trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Next month leading days
    const totalCells = days.length > 35 ? 42 : 35;
    const remainingDays = totalCells - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const selectedTasks = tasksByDate[selectedDateStr] || [];
  const isTodaySelected = selectedDateStr === todayStr;

  const totalScheduledCount = filteredTasks.length - unscheduledTasks.length;
  const completedScheduledCount = filteredTasks.filter((t) => t.status === 'done').length;

  if (authLoading || loading) return <Loader label="Loading calendar..." />;

  return (
    <ProtectedRoute>
      <div className="container" style={{ paddingBottom: '3rem' }}>
        {/* 1. Page Header & Role Visibility Strip */}
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
              <Link to="/dashboard" style={{ color: 'var(--color-navy)', fontWeight: 700, textDecoration: 'none' }}>
                TaskFlow
              </Link>
              <span>/</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Calendar Schedule</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: 'clamp(1.45rem, 3vw, 2rem)', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
                Calendar Schedule
              </h1>
              <span
                className="badge"
                style={{
                  backgroundColor: userIsLeader ? 'var(--color-navy)' : 'var(--color-baby-blue-light)',
                  color: userIsLeader ? 'var(--color-off-white)' : 'var(--color-navy)',
                  borderColor: 'var(--color-baby-blue-border)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {userIsLeader ? '👑 Team Leader — All Team Deadlines' : `👤 Assigned to ${user?.displayName || 'You'} Only`}
              </span>
            </div>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              {userIsLeader ? 'Viewing all team deadlines' : `Viewing deadlines assigned to ${user?.displayName || 'you'}`} across{' '}
              <strong>{projects.length} accessible {projects.length === 1 ? 'project' : 'projects'}</strong>
            </p>
          </div>

          <div className="page-header-actions">
            <Link to="/tasks" className="btn btn-secondary btn-sm">
              <ListChecks size={16} />
              <span>Tasks List</span>
            </Link>
            <Link to="/projects/new" className="btn btn-primary btn-sm">
              <Plus size={16} />
              <span>New Project</span>
            </Link>
          </div>
        </div>

        {/* 2. Calendar KPI Summary Strip (4 Responsive Blocks) */}
        <div className="calendar-kpi-grid">
          <div className="card" style={{ padding: '0.9rem 1.1rem', borderTop: '3px solid var(--color-navy)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Total Scheduled
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-navy)', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
              {totalScheduledCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {userIsLeader ? 'Across all team members' : 'Assigned to your account'}
            </span>
          </div>

          <div className="card" style={{ padding: '0.9rem 1.1rem', borderTop: '3px solid var(--color-baby-blue)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Due in {MONTH_NAMES[currentMonth]}
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-navy)', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
              {currentMonthTasks.length}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
          </div>

          <div className="card" style={{ padding: '0.9rem 1.1rem', borderTop: '3px solid var(--color-warning)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Selected Date ({selectedDateStr})
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-warning)', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
              {selectedTasks.length}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {isTodaySelected ? 'Today' : 'Scheduled on selected day'}
            </span>
          </div>

          <div className="card" style={{ padding: '0.9rem 1.1rem', borderTop: '3px solid var(--color-success)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Completed Tasks
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
              {completedScheduledCount} / {filteredTasks.length}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {unscheduledTasks.length} unscheduled in backlog
            </span>
          </div>
        </div>

        {/* 3. Unified Calendar Navigation & Filter Toolbar */}
        <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1.5rem' }}>
          <div className="calendar-toolbar">
            {/* Left Group: Month Switcher & Today Button */}
            <div className="calendar-toolbar-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flex: 1,
                    backgroundColor: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous Month"
                    style={{
                      padding: '0.45rem 0.7rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--color-navy)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span
                    style={{
                      padding: '0.45rem 0.75rem',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      color: 'var(--color-navy)',
                      minWidth: '140px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next Month"
                    style={{
                      padding: '0.45rem 0.7rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--color-navy)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleGoToday}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700, padding: '0.5rem 0.9rem', flexShrink: 0 }}
                >
                  Today
                </button>
              </div>
            </div>

            {/* Right Group: Project Filter, Member Filter (for Leader), Status Segmented Control */}
            <div className="calendar-toolbar-group">
              {userIsLeader && (
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="form-select"
                  style={{
                    width: 'auto',
                    minWidth: '175px',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                  aria-label="Filter Calendar by Team Member"
                >
                  <option value="all">👥 All Team Members ({members.length})</option>
                  {members.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName} ({m.role})
                    </option>
                  ))}
                </select>
              )}

              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="form-select"
                style={{
                  width: 'auto',
                  minWidth: '185px',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
                aria-label="Filter Calendar by Project"
              >
                <option value="all">📁 All Projects ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <div className="segmented-group">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    backgroundColor: statusFilter === 'all' ? 'var(--color-surface)' : 'transparent',
                    color: statusFilter === 'all' ? 'var(--color-navy)' : 'var(--color-text-secondary)',
                    boxShadow: statusFilter === 'all' ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {userIsLeader ? `All (${roleVisibleTasks.length})` : `My Tasks (${roleVisibleTasks.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    backgroundColor: statusFilter === 'active' ? 'var(--color-surface)' : 'transparent',
                    color: statusFilter === 'active' ? 'var(--color-navy)' : 'var(--color-text-secondary)',
                    boxShadow: statusFilter === 'active' ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    backgroundColor: statusFilter === 'completed' ? 'var(--color-surface)' : 'transparent',
                    color: statusFilter === 'completed' ? 'var(--color-navy)' : 'var(--color-text-secondary)',
                    boxShadow: statusFilter === 'completed' ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Main Calendar Workspace: Grid on Left/Top, Inspector Cards Stacked on Right/Bottom */}
        <div className="calendar-workspace-grid">
          {/* Block A: Monthly Grid Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', width: '100%' }}>
            {/* Weekday Header Row (7 Equal Columns) */}
            <div className="calendar-weekdays-grid">
              {WEEKDAY_NAMES.map((name) => (
                <div key={name}>{name}</div>
              ))}
            </div>

            {/* Days Grid (7 Equal Columns with minmax(0, 1fr)) */}
            <div className="calendar-days-grid">
              {calendarDays.map((cell, idx) => {
                const dayTasks = tasksByDate[cell.dateStr] || [];
                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === selectedDateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className="calendar-day-cell"
                    style={{
                      borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid var(--color-border)',
                      backgroundColor: isSelected
                        ? 'var(--color-baby-blue-light)'
                        : cell.isCurrentMonth
                        ? 'var(--color-surface)'
                        : 'var(--color-surface-hover)',
                      outline: isToday
                        ? '2px solid var(--color-navy)'
                        : isSelected
                        ? '2px solid var(--color-baby-blue)'
                        : 'none',
                      outlineOffset: '-2px',
                      zIndex: isToday || isSelected ? 2 : 1,
                    }}
                  >
                    {/* Day Number & Count Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', gap: '0.2rem' }}>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: isToday ? 800 : cell.isCurrentMonth ? 700 : 400,
                          color: isToday
                            ? 'var(--color-off-white)'
                            : cell.isCurrentMonth
                            ? 'var(--color-navy)'
                            : 'var(--color-text-muted)',
                          backgroundColor: isToday ? 'var(--color-navy)' : 'transparent',
                          width: isToday ? '22px' : 'auto',
                          height: isToday ? '22px' : 'auto',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {cell.dayNum}
                      </span>

                      {dayTasks.length > 0 && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '0.05rem 0.35rem',
                            borderRadius: '999px',
                            backgroundColor: 'var(--color-navy)',
                            color: 'var(--color-off-white)',
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1.3,
                          }}
                        >
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {/* Task Chips inside cell */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0, width: '100%' }}>
                      {dayTasks.slice(0, 2).map((task) => {
                        const statusIcon =
                          task.status === 'done' ? '●' : task.status === 'in_progress' ? '◐' : '◌';
                        const statusColor =
                          task.status === 'done'
                            ? 'var(--color-success)'
                            : task.status === 'in_progress'
                            ? 'var(--color-warning)'
                            : 'var(--color-navy)';

                        return (
                          <div
                            key={task.id}
                            className="calendar-task-chip"
                            style={{ color: statusColor }}
                            title={`${task.code ? task.code + ': ' : ''}${task.title} (${task.assigneeName || 'Assigned'})`}
                          >
                            <span style={{ fontSize: '0.7rem', lineHeight: 1, flexShrink: 0 }}>{statusIcon}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                              {task.code ? `${task.code} ` : ''}{task.title}
                            </span>
                          </div>
                        );
                      })}

                      {dayTasks.length > 2 && (
                        <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', fontWeight: 700, paddingLeft: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          +{dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Legend Bar inside Calendar Card */}
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--color-surface-hover)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--color-navy)', fontSize: '0.95rem' }}>◌</span> To Do
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--color-warning)', fontSize: '0.95rem' }}>◐</span> In Progress
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--color-success)', fontSize: '0.95rem' }}>●</span> Done
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Click any date cell to inspect or update tasks
              </span>
            </div>
          </div>

          {/* Block B: Right/Bottom Stacked Inspector Panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', minWidth: 0 }}>
            {/* Panel 1: Selected Date Inspector */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-navy)' }}>
                  <CalendarIcon size={17} />
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {selectedDateStr} {isTodaySelected ? '(Today)' : ''}
                  </span>
                </div>
                <span className="badge" style={{ backgroundColor: 'var(--color-baby-blue-light)', color: 'var(--color-navy)', borderColor: 'var(--color-baby-blue-border)', fontSize: '0.75rem', fontWeight: 700 }}>
                  {selectedTasks.length} {selectedTasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>

              {selectedTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.65rem auto',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <CheckCircle2 size={19} />
                  </div>
                  <h4 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.3rem' }}>
                    No tasks due on {selectedDateStr}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    Select a date with a task badge on the calendar or pick one from the monthly schedule below.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedTasks.map((task) => {
                    const overdue = isOverdue(task);
                    return (
                      <div
                        key={task.id}
                        style={{
                          padding: '0.85rem',
                          borderRadius: 'var(--radius-md)',
                          border: overdue ? '1px solid var(--color-danger-border)' : '1px solid var(--color-border)',
                          backgroundColor: overdue ? 'var(--color-danger-bg)' : 'var(--color-surface)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-navy)' }}>
                            {task.code ? `${task.code}: ` : ''}{task.title}
                          </span>
                          <span className={`badge badge-priority-${task.priority}`} style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                            {task.priority}
                          </span>
                        </div>

                        {task.description && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                            {task.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                          <span>👤 {task.assigneeName || 'Assigned'}</span>
                          <span>📁 {task.projectName}</span>
                        </div>

                        {/* Quick Status Selector & Project Link */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.45rem', borderTop: '1px solid var(--color-border)', marginTop: '0.2rem' }}>
                          <select
                            value={task.status}
                            onChange={(e) => handleUpdateTaskStatus(task.projectId, task.id, e.target.value)}
                            className="form-select"
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              width: 'auto',
                              fontWeight: 600,
                              borderColor: task.status === 'done' ? 'var(--color-success-border)' : 'var(--color-baby-blue)',
                            }}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>

                          <Link
                            to={`/projects/${task.projectId}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-navy)', fontWeight: 700 }}
                          >
                            <span>Open Project</span>
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Panel 2: Month Schedule List (Quick Jump to Scheduled Dates) */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-navy)' }}>
                  <ListChecks size={17} />
                  <span>{MONTH_NAMES[currentMonth]} Schedule</span>
                </div>
                <span className="badge" style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 700 }}>
                  {currentMonthTasks.length}
                </span>
              </div>

              {currentMonthTasks.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  No tasks scheduled in {MONTH_NAMES[currentMonth]} {currentYear}.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                  {currentMonthTasks.map((task) => {
                    const isSelectedDay = task.resolvedDateStr === selectedDateStr;
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setSelectedDateStr(task.resolvedDateStr)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.55rem 0.7rem',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelectedDay ? '1px solid var(--color-baby-blue)' : '1px solid var(--color-border)',
                          backgroundColor: isSelectedDay ? 'var(--color-baby-blue-light)' : 'var(--color-surface)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.code ? `${task.code}: ` : ''}{task.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            👤 {task.assigneeName} · {task.projectName}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'var(--color-navy)',
                            backgroundColor: 'var(--color-surface-hover)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            border: '1px solid var(--color-border)',
                            fontVariantNumeric: 'tabular-nums',
                            flexShrink: 0,
                          }}
                        >
                          {task.resolvedDateStr.slice(5)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Panel 3: Unscheduled Backlog Card */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-navy)' }}>
                  <Clock size={16} />
                  <span>Unscheduled Backlog</span>
                </div>
                <span className="badge" style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                  {unscheduledTasks.length}
                </span>
              </div>

              {unscheduledTasks.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  All visible tasks across your accessible projects have assigned due dates.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {unscheduledTasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      style={{
                        padding: '0.5rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.8rem',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--color-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                        {task.title}
                      </span>
                      <Link
                        to={`/projects/${task.projectId}`}
                        style={{ fontSize: '0.75rem', color: 'var(--color-navy)', fontWeight: 700, flexShrink: 0 }}
                      >
                        Set Date →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
