import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loginAsDemo } = useAuth();
  const [error, setError] = useState(null);

  const handleLogin = async (data) => {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many unsuccessful login attempts. Please try again later.');
      } else {
        setError(err.message || 'Login failed.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err.code === 'auth/unauthorized-domain') {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'run.app';
        setError({
          type: 'unauthorized-domain',
          domain: hostname,
          projectId: 'taskflow-381d3',
          message: `The domain (${hostname}) is not authorized in Firebase Authentication.`,
        });
        return;
      }
      setError(err.message || 'Google sign-in failed.');
    }
  };

  const handleDemoLogin = async (role = 'owner') => {
    setError(null);
    try {
      await loginAsDemo(role);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    }
  };

  return (
    <AuthForm
      type="login"
      onSubmit={handleLogin}
      onGoogleLogin={handleGoogleLogin}
      onDemoLogin={handleDemoLogin}
      error={error}
    />
  );
}
