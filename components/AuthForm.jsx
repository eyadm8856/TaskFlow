import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AuthForm({
  type = 'login',
  onSubmit,
  onGoogleLogin,
  onDemoLogin,
  error: serverError,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (type === 'register') {
      const nameTrimmed = name.trim();
      if (!nameTrimmed) {
        errs.name = 'Full name is required.';
      } else if (nameTrimmed.length < 2) {
        errs.name = 'Full name must be at least 2 characters.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit({ email: email.trim(), password, name: name.trim() });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    if (!onGoogleLogin) return;
    setGoogleLoading(true);
    try {
      await onGoogleLogin();
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '440px', margin: '2rem auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.35rem' }}>
          {type === 'login' ? 'Sign In to TaskFlow' : 'Create an Account'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          {type === 'login'
            ? 'Manage projects, track tasks, and collaborate with your team'
            : 'Join your team on TaskFlow to get started'}
        </p>
      </div>

      {serverError && (
        typeof serverError === 'object' && serverError.type === 'unauthorized-domain' ? (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
              color: '#92400e',
            }}
            role="alert"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, color: '#b45309' }}>
              <span>⚠️</span>
              <span>Firebase Authorized Domain Required</span>
            </div>
            <p style={{ marginBottom: '0.5rem', lineHeight: 1.4 }}>
              Google Sign-In is blocked because this preview domain is not yet added to the Authorized Domains list of your Firebase project (<strong>{serverError.projectId}</strong>).
            </p>
            <div style={{ backgroundColor: '#fef3c7', padding: '0.5rem 0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              <span>{serverError.domain}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(serverError.domain);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              >
                {copied ? 'Copied ✓' : 'Copy Domain'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
              <span style={{ fontWeight: 600 }}>Quick Setup (takes 1 minute):</span>
              <span>1. Open Firebase Authentication Settings via the link below.</span>
              <span>2. Under <strong>Settings</strong> ➔ <strong>Authorized domains</strong>.</span>
              <span>3. Click <strong>Add domain</strong>, paste the domain, and save.</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <a
                href={`https://console.firebase.google.com/project/${serverError.projectId}/authentication/settings`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <span>Open Firebase Console ↗</span>
              </a>
              {onDemoLogin && (
                <button
                  type="button"
                  onClick={async () => {
                    setDemoLoading(true);
                    try {
                      await onDemoLogin('owner');
                    } finally {
                      setDemoLoading(false);
                    }
                  }}
                  disabled={demoLoading}
                  className="btn btn-secondary btn-sm"
                >
                  {demoLoading ? 'Signing in...' : 'Instant Demo Login'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '6px',
              marginBottom: '1.25rem',
              fontSize: '0.9rem',
            }}
            role="alert"
          >
            {typeof serverError === 'string' ? serverError : serverError.message}
          </div>
        )
      )}

      {/* Email / Password Form */}
      <form onSubmit={handleSubmit} noValidate>
        {type === 'register' && (
          <div className="form-group">
            <label className="form-label" htmlFor="auth-name">
              Full Name <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>
            </label>
            <input
              className="form-input"
              id="auth-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: null });
              }}
              placeholder="e.g. Alex Johnson"
              required
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {errors.name}
              </p>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="auth-email">
            Email Address <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>
          </label>
          <input
            className="form-input"
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: null });
            }}
            placeholder="you@example.com"
            required
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {errors.email}
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="auth-password">
            Password <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>
          </label>
          <input
            className="form-input"
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors({ ...errors, password: null });
            }}
            placeholder="••••••••"
            required
            minLength={6}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {errors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
          disabled={loading || googleLoading}
        >
          {loading ? 'Please wait...' : type === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      {/* Separator line and Google Sign-in Button below the main submit button */}
      {onGoogleLogin && (
        <div style={{ marginTop: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '1.25rem',
              color: 'var(--color-text-muted)',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
            <span style={{ padding: '0 0.75rem' }}>or continue with</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={googleLoading || loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.65rem 1rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--color-navy)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, border-color 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
              e.currentTarget.style.borderColor = 'var(--color-baby-blue)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
              />
            </svg>
            <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>
        </div>
      )}

      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
        {type === 'login' ? (
          <>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ fontWeight: 700, color: 'var(--color-navy)' }}>
              Register
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 700, color: 'var(--color-navy)' }}>
              Sign In
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
