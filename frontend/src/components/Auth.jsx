import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function Auth({ onAuth, showToast }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (mode === 'signup' && !form.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast?.('Please fix the errors in the form', 'error');
      return;
    }

    setLoading(true);
    try {
      const url =
        mode === 'login'
          ? `${API_BASE}/api/auth/login`
          : `${API_BASE}/api/auth/signup`;

      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : {
              name: form.name,
              email: form.email,
              password: form.password,
              phone: form.phone,
            };

      const { data } = await axios.post(url, payload);
      onAuth(data); // { user, token }
      if (mode === 'signup') {
        showToast?.('Account created successfully!', 'success');
      }
    } catch (err) {
      console.error('Auth error:', err);
      let message = 'Authentication failed';
      
      if (err.response) {
        // Server responded with error
        message = err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        // Request was made but no response received
        message = 'Cannot connect to server. Please check if the backend is running.';
      } else {
        // Something else happened
        message = err.message || 'An unexpected error occurred';
      }
      
      showToast?.(message, 'error');
      setErrors({ submit: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 480, margin: '0 auto 1.5rem' }}>
      <h2>{mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        {mode === 'login'
          ? 'Sign in to access the disaster response dashboard'
          : 'Create a new account to start reporting incidents'}
      </p>
      <form onSubmit={submit}>
        {mode === 'signup' && (
          <>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={form.name}
              onChange={update('name')}
              placeholder="Your full name"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && (
              <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>
                {errors.name}
              </span>
            )}
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={update('phone')}
              placeholder="Contact number (optional)"
            />
          </>
        )}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={update('email')}
          placeholder="you@example.com"
          className={errors.email ? 'error' : ''}
        />
        {errors.email && (
          <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>
            {errors.email}
          </span>
        )}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          minLength={4}
          value={form.password}
          onChange={update('password')}
          placeholder="Enter your password"
          className={errors.password ? 'error' : ''}
        />
        {errors.password && (
          <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>
            {errors.password}
          </span>
        )}

        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <button type="submit" disabled={loading} style={{ flex: 1 }}>
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Please wait…
              </>
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setMode((m) => (m === 'login' ? 'signup' : 'login'));
              setErrors({});
            }}
            disabled={loading}
          >
            {mode === 'login' ? 'New here? Sign up' : 'Have an account? Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}