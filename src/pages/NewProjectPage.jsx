import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import projectsService from '@/services/projects';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loader from '@/components/Loader';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();

    if (!trimmedName || trimmedName.length < 3) {
      setError('Project name must be at least 3 characters.');
      return;
    }
    if (trimmedName.length > 80) {
      setError('Project name cannot exceed 80 characters.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const docRef = await projectsService.createProject(
        {
          name: trimmedName,
          description: formData.description.trim(),
        },
        user.uid
      );
      navigate(`/projects/${docRef.id}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to create project.');
      setIsLoading(false);
    }
  };

  if (authLoading) return <Loader />;

  if (!user) {
    return (
      <ProtectedRoute>
        <div />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container" style={{ maxWidth: '640px', paddingBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-navy)' }}>Create New Project</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Set up a shared workspace for your team and tasks
            </p>
          </div>
          <Link to="/dashboard" className="btn btn-secondary btn-sm">
            Cancel
          </Link>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card">
          <div className="form-group">
            <label className="form-label" htmlFor="project-name">
              Project Name <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              className="form-input"
              id="project-name"
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (error) setError('');
              }}
              placeholder="e.g. Website Redesign"
              required
              minLength={3}
              maxLength={80}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Required, 3 to 80 characters
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="project-desc">
              Description (Optional)
            </label>
            <textarea
              className="form-textarea"
              id="project-desc"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the project goals, deliverables, and scope..."
              maxLength={1000}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #9ca3af)' }}>
              Maximum 1000 characters
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <Link to="/dashboard" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
