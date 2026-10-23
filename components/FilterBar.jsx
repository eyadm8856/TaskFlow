export default function FilterBar({
  search = '',
  onSearchChange,
  status = '',
  onStatusChange,
  priority = '',
  onPriorityChange,
  assigneeId = '',
  onAssigneeChange,
  overdueOnly = false,
  onOverdueToggle,
  members = [],
  currentUserId,
  isTeamLeader = false,
  onReset,
}) {
  const hasActiveFilters = Boolean(search || status || priority || (isTeamLeader && assigneeId) || overdueOnly);

  return (
    <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
      <div className="filter-grid">
        {/* Title Search */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="filter-search" style={{ fontSize: '0.85rem' }}>
            Search Title
          </label>
          <input
            id="filter-search"
            type="text"
            className="form-input"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="filter-status" style={{ fontSize: '0.85rem' }}>
            Status
          </label>
          <select
            id="filter-status"
            className="form-select"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="filter-priority" style={{ fontSize: '0.85rem' }}>
            Priority
          </label>
          <select
            id="filter-priority"
            className="form-select"
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Assignee Filter - Team Leader Only */}
        {isTeamLeader && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="filter-assignee" style={{ fontSize: '0.85rem' }}>
              Assignee (Leader Filter)
            </label>
            <select
              id="filter-assignee"
              className="form-select"
              value={assigneeId}
              onChange={(e) => onAssigneeChange(e.target.value)}
            >
              <option value="">All Assignees</option>
              {currentUserId && <option value={currentUserId}>Assigned to Me</option>}
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.uid || m.id} value={m.uid || m.id}>
                  {m.displayName || m.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Secondary filter actions: Overdue Toggle & Reset */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '0.5rem' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: overdueOnly ? 'var(--color-danger)' : 'var(--color-navy)' }}>
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => onOverdueToggle(e.target.checked)}
            style={{ width: '1rem', height: '1rem', cursor: 'pointer', accentColor: 'var(--color-navy)' }}
          />
          <span>⚠️ Overdue Tasks Only (Live Evaluation Exercise)</span>
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onReset}
            style={{ fontSize: '0.85rem' }}
          >
            ✕ Reset Filters
          </button>
        )}
      </div>
    </div>
  );
}
