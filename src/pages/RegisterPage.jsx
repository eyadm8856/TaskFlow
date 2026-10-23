import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();
  const [error, setError] = useState('');

  const handleRegister = async (data) => {
    setError('');
    try {
      await register(data.email, data.password, data.name);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already in use by another account.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else {
        setError(err.message || 'Registration failed.');
      }
    }
  };

  const handleGoogleRegister = async () => {
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
      setError(err.message || 'Google registration failed.');
    }
  };

  return (
    <AuthForm
      type="register"
      onSubmit={handleRegister}
      onGoogleLogin={handleGoogleRegister}
      error={error}
    />
  );
}
