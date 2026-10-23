import { Link } from 'react-router-dom';

export default function ProjectCard({ project, currentUserId }) {
  const memberCount = project.memberIds ? project.memberIds.length : (project.memberCount || 1);
  const isOwner = currentUserId && project.ownerId === currentUserId;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', height: '100%', justifyContent: 'space-between' }}>
      <div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
          <Link to={`/projects/${project.id}`} style={{ color: 'var(--color-navy)', textDecoration: 'none' }}>
            {project.name}
          </Link>
        </h3>
        {project.description && (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {project.description}
          </p>
        )}
      </div>

      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          👥 {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/projects/${project.id}`} className="btn btn-primary btn-sm">
            Open
          </Link>
          {isOwner && (
            <Link to={`/projects/${project.id}/settings`} className="btn btn-secondary btn-sm" aria-label={`Settings for ${project.name}`}>
              ⚙️
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
