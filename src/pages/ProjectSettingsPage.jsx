import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import projectsService from '@/services/projects';
import usersService from '@/services/users';
import ProtectedRoute from '@/components/ProtectedRoute';
import ConfirmDialog from '@/components/ConfirmDialog';
import Loader from '@/components/Loader';

export default function ProjectSettingsPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit project state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectMsg, setProjectMsg] = useState({ text: '', type: '' });

  // Member management state
  const [inviteEmail, setInviteEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberMsg, setMemberMsg] = useState({ text: '', type: '' });
  const [memberToRemove, setMemberToRemove] = useState(null);

  // Delete project state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const p = await projectsService.getProjectById(projectId);
      if (p) {
        setProject(p);
        setName(p.name || '');
        setDescription(p.description || '');
        if (p.memberIds && p.memberIds.length > 0) {
          const membersData = await usersService.getUsersByIds(p.memberIds);
          setMembers(membersData);
        }
      }
    } catch (err) {
      console.error('Error loading project settings:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId, fetchProjectData]);

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 80) {
      setProjectMsg({ text: 'Project name must be between 3 and 80 characters.', type: 'error' });
      return;
    }

    setIsSavingProject(true);
    setProjectMsg({ text: '', type: '' });
    try {
      await projectsService.updateProject(projectId, {
        name: trimmedName,
        description: description.trim(),
      });
      setProjectMsg({ text: 'Project updated successfully!', type: 'success' });
      setProject((prev) => ({ ...prev, name: trimmedName, description: description.trim() }));
    } catch (err) {
      setProjectMsg({ text: 'Failed to update project: ' + err.message, type: 'error' });
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail) return;

    setIsAddingMember(true);
    setMemberMsg({ text: '', type: '' });

    try {
      const foundUser = await usersService.findUserByEmail(normalizedEmail);
      if (!foundUser) {
        setMemberMsg({
          text: `No registered user found with email "${normalizedEmail}". They must register an account first.`,
          type: 'error',
        });
        setIsAddingMember(false);
        return;
      }

      if (project.memberIds.includes(foundUser.id)) {
        setMemberMsg({
          text: `User "${foundUser.displayName || normalizedEmail}" is already a member of this project.`,
          type: 'error',
        });
        setIsAddingMember(false);
        return;
      }

      await projectsService.addMember(projectId, foundUser.id);
      setInviteEmail('');
      setMemberMsg({ text: `Added ${foundUser.displayName || normalizedEmail} to the project!`, type: 'success' });
      await fetchProjectData();
    } catch (err) {
      setMemberMsg({ text: 'Failed to add member: ' + err.message, type: 'error' });
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await projectsService.removeMember(projectId, memberToRemove.id);
      setMemberToRemove(null);
      setMemberMsg({ text: `Removed member successfully.`, type: 'success' });
      await fetchProjectData();
    } catch (err) {
      setMemberMsg({ text: 'Failed to remove member: ' + err.message, type: 'error' });
    }
  };

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      await projectsService.deleteProject(projectId);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      alert('Failed to delete project: ' + err.message);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
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
      <div className="container" style={{ textAlign: 'center', padding: '3rem 0' }}>
        <h2>Project Not Found</h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: '1rem 0' }}>The requested project does not exist.</p>
        <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  const isOwner = Boolean(user && project.ownerId === user.uid);
  if (!isOwner) {
    return (
      <ProtectedRoute>
        <div className="container" style={{ textAlign: 'center', padding: '3rem 0' }}>
          <h2>Access Denied</h2>
          <p style={{ color: 'var(--color-danger, #ef4444)', margin: '1rem 0' }}>
            Only the project owner can access project settings and manage members.
          </p>
          <Link to={`/projects/${projectId}`} className="btn btn-primary">
            Back to Project
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container" style={{ maxWidth: '800px', paddingBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-navy)' }}>Project Settings</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>Manage details and team membership for <strong>{project.name}</strong></p>
          </div>
          <Link to={`/projects/${projectId}`} className="btn btn-secondary btn-sm">
            ← Back to Project
          </Link>
        </div>

        {/* 1. General Project Details Form */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '1rem' }}>Project Details</h2>

          {projectMsg.text && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              backgroundColor: projectMsg.type === 'error' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
              color: projectMsg.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
              border: `1px solid ${projectMsg.type === 'error' ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`,
            }}>
              {projectMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdateProject}>
            <div className="form-group">
              <label className="form-label" htmlFor="project-name">
                Project Name <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="project-name"
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
                maxLength={80}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>3 to 80 characters</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="project-description">
                Description (Optional)
              </label>
              <textarea
                id="project-description"
                className="form-textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSavingProject}>
              {isSavingProject ? 'Saving Changes...' : 'Save Details'}
            </button>
          </form>
        </div>

        {/* 2. Membership Management */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.5rem' }}>Project Members ({members.length})</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Add registered teammates by email. Members can view projects and create or update authorized tasks.
          </p>

          {memberMsg.text && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              backgroundColor: memberMsg.type === 'error' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
              color: memberMsg.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
              border: `1px solid ${memberMsg.type === 'error' ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`,
            }}>
              {memberMsg.text}
            </div>
          )}

          <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <input
              type="email"
              className="form-input"
              style={{ flex: 1, minWidth: '240px' }}
              placeholder="Teammate's registered email (e.g. member@example.test)"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={isAddingMember}>
              {isAddingMember ? 'Adding...' : '+ Add Member'}
            </button>
          </form>

          <ul style={{ listStyle: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {members.map((member) => {
              const isMemberOwner = member.id === project.ownerId;
              return (
                <li
                  key={member.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: isMemberOwner ? 'var(--color-baby-blue-light)' : 'transparent',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-navy)' }}>{member.displayName || 'User'}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{member.email}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isMemberOwner ? (
                      <span className="badge" style={{ backgroundColor: 'var(--color-navy)', color: 'var(--color-off-white)' }}>
                        👑 Owner
                      </span>
                    ) : (
                      <>
                        <span className="badge" style={{ backgroundColor: 'var(--color-baby-blue-light)', color: 'var(--color-navy)', borderColor: 'var(--color-baby-blue-border)' }}>
                          Member
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-danger btn-sm"
                          onClick={() => setMemberToRemove(member)}
                          aria-label={`Remove member ${member.displayName || member.email}`}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 3. Danger Zone */}
        <div className="card" style={{ borderColor: 'var(--color-danger-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-danger)', marginBottom: '0.5rem' }}>
            Danger Zone
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Deleting this project will permanently remove the project and all associated tasks. This action cannot be reversed.
          </p>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete This Project'}
          </button>
        </div>

        {/* Remove Member Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!memberToRemove}
          title="Remove Project Member"
          message={`Are you sure you want to remove "${memberToRemove?.displayName || memberToRemove?.email}" from this project? They will immediately lose access to all project tasks.`}
          confirmLabel="Remove Member"
          isDestructive={true}
          onConfirm={handleConfirmRemoveMember}
          onCancel={() => setMemberToRemove(null)}
        />

        {/* Delete Project Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Delete Entire Project"
          message={`Are you absolutely sure you want to delete "${project.name}"? All associated tasks will be permanently deleted.`}
          confirmLabel="Permanently Delete Project"
          isDestructive={true}
          onConfirm={handleDeleteProject}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    </ProtectedRoute>
  );
}
