import { useState } from 'react';

export default function TaskForm({
  initialData = {},
  members = [],
  onSubmit,
  onCancel,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    status: initialData.status || 'todo',
    priority: initialData.priority || 'medium',
    assigneeId: initialData.assigneeId || '',
    dueDate: initialData.dueDate
      ? (initialData.dueDate.toDate
          ? initialData.dueDate.toDate().toISOString().split('T')[0]
          : typeof initialData.dueDate === 'string'
          ? initialData.dueDate.split('T')[0]
          : '')
      : '',
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    const titleTrimmed = formData.title.trim();
    if (!titleTrimmed) {
      errs.title = 'Task title is required.';
    } else if (titleTrimmed.length < 3) {
      errs.title = 'Task title must be at least 3 characters.';
    } else if (titleTrimmed.length > 120) {
      errs.title = 'Task title cannot exceed 120 characters.';
    }

    if (formData.description && formData.description.length > 1000) {
      errs.description = 'Description cannot exceed 1000 characters.';
    }

    if (!['todo', 'in_progress', 'done'].includes(formData.status)) {
      errs.status = 'Invalid status selected.';
    }

    if (!['low', 'medium', 'high'].includes(formData.priority)) {
      errs.priority = 'Invalid priority selected.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const selectedMember = members.find(
      (m) => (m.uid || m.id) === formData.assigneeId
    );

    onSubmit({
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: formData.status,
      priority: formData.priority,
      assigneeId: formData.assigneeId ? formData.assigneeId : null,
      assigneeName: selectedMember ? selectedMember.displayName : 'Unassigned',
      dueDate: formData.dueDate || '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ margin: '1.5rem 0', border: '2px solid var(--color-primary-light, #3b82f6)' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 700 }}>
        {initialData.id ? 'Edit Task' : 'Create New Task'}
      </h3>

      <div className="form-group">
        <label className="form-label" htmlFor="task-title">
          Title <span className="required" style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>
        </label>
        <input
          className="form-input"
          id="task-title"
          type="text"
          value={formData.title}
          onChange={(e) => {
            setFormData({ ...formData, title: e.target.value });
            if (errors.title) setErrors({ ...errors, title: null });
          }}
          placeholder="e.g. Build navigation bar"
          required
          maxLength={120}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && (
          <p id="title-error" style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {errors.title}
          </p>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="task-desc">Description (Optional)</label>
        <textarea
          className="form-textarea"
          id="task-desc"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detailed description of what needs to be done..."
          maxLength={1000}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="task-status">Status</label>
          <select
            className="form-select"
            id="task-status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="task-priority">Priority</label>
          <select
            className="form-select"
            id="task-priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="task-due">Due Date (Optional)</label>
          <input
            className="form-input"
            id="task-due"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="task-assignee">Assignee</label>
          <select
            className="form-select"
            id="task-assignee"
            value={formData.assigneeId}
            onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName ? `${member.displayName} (${member.email})` : member.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : initialData.id ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
