import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  FolderPlus, 
  Folder, 
  X, 
  LogOut,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';

export default function SidebarDrawer({ isOpen, onClose, projects = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard' || pathname === '/',
    },
    {
      label: 'Calendar',
      href: '/calendar',
      icon: CalendarIcon,
      active: pathname === '/calendar',
    },
    {
      label: 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
      active: pathname === '/tasks',
    },
    {
      label: '+ New Project',
      href: '/projects/new',
      icon: FolderPlus,
      active: pathname === '/projects/new',
      isAction: true,
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menu"
    >
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(27, 42, 74, 0.65)',
          backdropFilter: 'blur(3px)',
          animation: 'fadeIn 150ms ease-out',
        }}
      />

      {/* Slide-out Drawer Panel */}
      <div
        ref={drawerRef}
        style={{
          position: 'relative',
          width: '320px',
          maxWidth: '85vw',
          height: '100%',
          backgroundColor: 'var(--color-bg, #FDFBF7)',
          borderRight: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
          animation: 'slideIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            backgroundColor: isDark ? '#121D34' : '#1B2A4A',
            padding: '1.25rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(162, 194, 232, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              style={{
                width: '30px',
                height: '30px',
                backgroundColor: 'rgba(162, 194, 232, 0.15)',
                border: '2px solid #A2C2E8',
                color: '#A2C2E8',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.95rem',
                boxShadow: '0 0 8px rgba(162, 194, 232, 0.25)',
              }}
            >
              ✓
            </span>
            <span style={{ color: '#A2C2E8', fontWeight: 800, fontSize: '1.25rem' }}>
              TaskFlow
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Navigation Menu"
            style={{
              background: 'rgba(253, 251, 247, 0.12)',
              border: '1px solid rgba(162, 194, 232, 0.3)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* User Card inside Drawer */}
        {user && (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: isDark ? 'var(--color-surface, #142038)' : 'var(--color-baby-blue-light, #EEF5FC)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: isDark ? 'var(--color-baby-blue, #A2C2E8)' : 'var(--color-navy, #1B2A4A)',
                color: isDark ? '#1B2A4A' : 'var(--color-off-white, #FDFBF7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName || 'Team Member'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.75rem' }}>
          {/* Navigation Section */}
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 0.75rem', marginBottom: '0.5rem' }}>
            Navigation
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontWeight: item.active ? 700 : 500,
                    fontSize: '0.925rem',
                    color: item.active
                      ? (isDark ? '#FDFBF7' : 'var(--color-navy)')
                      : item.isAction
                      ? (isDark ? '#A2C2E8' : 'var(--color-navy)')
                      : 'var(--color-text-primary)',
                    backgroundColor: item.active
                      ? (isDark ? '#23385E' : 'var(--color-baby-blue-light)')
                      : item.isAction
                      ? (isDark ? 'rgba(162, 194, 232, 0.1)' : 'rgba(162, 194, 232, 0.2)')
                      : 'transparent',
                    border: item.active
                      ? '1px solid var(--color-baby-blue)'
                      : item.isAction
                      ? '1px dashed var(--color-baby-blue)'
                      : '1px solid transparent',
                    transition: 'all 150ms ease',
                  }}
                >
                  <Icon
                    size={19}
                    color={item.active || item.isAction ? 'var(--color-baby-blue)' : 'var(--color-text-secondary)'}
                  />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.active && (
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-baby-blue)',
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Theme Mode Switcher Section */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 0.75rem', marginBottom: '0.65rem' }}>
              Appearance
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                backgroundColor: isDark ? '#142038' : '#EEF5FC',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              aria-label={`Toggle theme, current is ${theme} mode`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isDark ? (
                  <Moon size={18} color="#A2C2E8" />
                ) : (
                  <Sun size={18} color="#1B2A4A" />
                )}
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  {isDark ? 'Night Mode' : 'Light Mode'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: isDark ? '#FDFBF7' : '#1B2A4A',
                  color: isDark ? '#1B2A4A' : '#FDFBF7',
                }}
              >
                {isDark ? 'Dark' : 'Light'}
              </span>
            </button>
          </div>

          {/* Accessible Projects List */}
          {projects.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 0.75rem', marginBottom: '0.5rem' }}>
                Projects ({projects.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {projects.map((proj) => (
                  <Link
                    key={proj.id}
                    to={`/projects/${proj.id}`}
                    onClick={onClose}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      color: 'var(--color-text-secondary)',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <Folder size={15} color="var(--color-baby-blue)" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {proj.name}
                      </span>
                    </div>
                    <ChevronRight size={14} color="var(--color-text-muted)" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {user && (
          <div
            style={{
              padding: '1rem 1.25rem',
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <button
              type="button"
              onClick={async () => {
                onClose();
                await logout();
                navigate('/login');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.55rem',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-danger)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
