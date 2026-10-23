import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import projectsService from '@/services/projects';
import SidebarDrawer from './SidebarDrawer';
import styles from './Navbar.module.css';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (!user) {
      setIsDrawerOpen(false);
      setProjects([]);
      return;
    }
    let isMounted = true;
    projectsService.getProjectsForUser(user.uid)
      .then((data) => {
        if (isMounted) setProjects(data);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      setIsDrawerOpen(false);
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <>
      <header className={styles.navHeader}>
        <div className={`container ${styles.navContainer}`}>
          <div className={styles.brandGroup}>
            {/* Hamburger Drawer Menu Button in Baby Blue - Only visible after login */}
            {user && (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Open Navigation Menu"
                className={styles.burgerBtn}
              >
                <Menu size={20} color="#A2C2E8" />
              </button>
            )}

            {/* Logo in Baby Blue (#A2C2E8) */}
            <Link to={user ? '/dashboard' : '/login'} className={styles.logo} aria-label="TaskFlow Home">
              <span className={styles.logoIcon} aria-hidden="true">✓</span>
              <span className={styles.logoText}>TaskFlow</span>
            </Link>
          </div>

          <div className={styles.actionsGroup}>
            {user ? (
              <>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.displayName || 'Team Member'}</span>
                  <span className={styles.userEmail}>{user.email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={styles.logoutBtn}
                  aria-label="Log out of TaskFlow"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className={styles.actionsGroup}>
                <Link
                  to="/login"
                  className={styles.loginBtn}
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className={styles.registerBtn}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Slide-out Sidebar Drawer - Only rendered when logged in */}
      {user && (
        <SidebarDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          projects={projects}
        />
      )}
    </>
  );
}
