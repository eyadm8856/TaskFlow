import { useState } from 'react';
import { isOverdue } from '@/services/tasks';
import ConfirmDialog from './ConfirmDialog';
import EmptyState from './EmptyState';

export default function TaskList({
  tasks = [],
  members = [],
  currentUserId,
  isProjectOwner = false,
  onStatusChange,
  onEdit,
  onDelete,
}) {
  const [taskToDelete, setTaskToDelete] = useState(null);

  const getMemberInfo = (assigneeId) => {
    if (!assigneeId) return null;
    return members.find((m) => m.id === assigneeId) || null;
  };

  const canEditTask = (task) => {
    if (isProjectOwner) return true;
    return task.createdBy === currentUserId || task.assigneeId === currentUserId;
  };

  const canDeleteTask = (task) => {
    if (isProjectOwner) return true;
    return task.createdBy === currentUserId;
  };

  const canChangeStatus = (task) => {
    if (isProjectOwner) return true;
    return task.createdBy === currentUserId || task.assigneeId === currentUserId;
  };

  const formatDate = (dueDate) => {
    if (!dueDate) return null;
    const date = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      onDelete(taskToDelete.id);
      setTaskToDelete(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks found"
        description="Try adjusting your search or filters, or create a new task to get started."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {tasks.map((task) => {
        const overdue = isOverdue(task);
        const assignee = getMemberInfo(task.assigneeId);
        const formattedDue = formatDate(task.dueDate);
        const editable = canEditTask(task);
        const deletable = canDeleteTask(task);
        const statusModifiable = canChangeStatus(task);

        return (
          <div
            key={task.id}
            className="card"
            style={{
              padding: '1.1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              borderColor: overdue ? 'var(--color-danger-border)' : 'var(--color-border)',
              backgroundColor: overdue ? '#FFFDFB' : 'var(--color-surface)',
            }}
          >
            <div className="task-card-top">
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                  {task.title}
                </h4>
                {task.description && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>
                    {task.description}
                  </p>
                )}
              </div>

              {/* Status Selector */}
              <div className="mobile-full-width" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {statusModifiable ? (
                  <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value)}
                    className="form-select mobile-full-width"
                    style={{
                      width: 'auto',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      borderColor: task.status === 'done' ? 'var(--color-success-border)' : 'var(--color-baby-blue)',
                    }}
                    aria-label={`Change status for task ${task.title}`}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                ) : (
                  <span className={`badge badge-${task.status}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            {/* Badges and metadata */}
            <div className="task-card-bottom">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`badge badge-priority-${task.priority}`}>
                  {task.priority.toUpperCase()} Priority
                </span>

                {overdue && (
                  <span className="badge badge-overdue">
                    ⚠️ Overdue
                  </span>
                )}

                {formattedDue && (
                  <span style={{ fontSize: '0.8rem', color: overdue ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                    📅 Due: {formattedDue}
                  </span>
                )}

                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  👤 {assignee ? (assignee.displayName || assignee.email) : 'Unassigned'}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editable && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onEdit(task)}
                    aria-label={`Edit task ${task.title}`}
                  >
                    Edit
                  </button>
                )}

                {deletable && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-danger btn-sm"
                    onClick={() => setTaskToDelete(task)}
                    aria-label={`Delete task ${task.title}`}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        isOpen={!!taskToDelete}
        title="Delete Task"
        message={`Are you sure you want to permanently delete task "${taskToDelete?.title}"?`}
        confirmLabel="Delete Task"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
}
