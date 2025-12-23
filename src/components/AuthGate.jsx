import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { getBrowserSessionId } from '../session';
import apiClient from '../api/client';

export function AuthGate({ onAuthenticated }) {
  const [mode, setMode] = useState('choice'); // 'choice' | 'login' | 'signup'
  const [channel, setChannel] = useState('email'); // 'email' | 'phone'
  const [form, setForm] = useState({ email: '', phone: '', name: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleGuest = () => {
    onAuthenticated({ type: 'guest', user: null });
  };

  const handleModeChange = (next) => {
    setError('');
    setMode(next);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      // Basic email/phone validation (frontend guardrail; backend also validates)
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phonePattern = /^\+?[0-9]{7,15}$/;

      if (channel === 'email') {
        if (!form.email.trim()) {
          setError('Email is required.');
          setLoading(false);
          return;
        }
        if (!emailPattern.test(form.email.trim())) {
          setError('Please enter a valid email address.');
          setLoading(false);
          return;
        }
      } else {
        if (!form.phone.trim()) {
          setError('Phone number is required.');
          setLoading(false);
          return;
        }
        if (!phonePattern.test(form.phone.trim())) {
          setError('Please enter a valid phone number (digits, optional +, 7-15 chars).');
          setLoading(false);
          return;
        }
      }

      if (!form.password || form.password.length < 8) {
        setError('Password must be at least 8 characters long.');
        setLoading(false);
        return;
      }
      if (mode === 'signup') {
        if (!form.confirmPassword) {
          setError('Please confirm your password.');
          setLoading(false);
          return;
        }
        if (form.password !== form.confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
      }

      const sessionId = getBrowserSessionId();
      const body = { browser_session_id: sessionId, password: form.password };
      if (channel === 'email') {
        body.email = form.email.trim();
      } else {
        body.phone = form.phone.trim();
      }

      if (mode === 'signup' && form.name.trim()) {
        body.name = form.name.trim();
      }

      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const response = await apiClient.post(endpoint, body);

      onAuthenticated({
        type: 'user',
        user: response.data.user,
      });
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'choice') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          px: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 480,
            width: '100%',
            p: 4,
            borderRadius: 3,
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
          }}
        >
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            Welcome to Voice Agent
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Continue as a guest for a quick demo, or log in / sign up to keep your session tied to your
            contact details across visits.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => handleModeChange('login')}
              sx={{ textTransform: 'none' }}
            >
              Log in with Email or Phone
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={() => handleModeChange('signup')}
              sx={{ textTransform: 'none' }}
            >
              Sign up with Email or Phone
            </Button>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Or continue without an account
              </Typography>
            </Box>
            <Button
              variant="text"
              color="secondary"
              size="medium"
              onClick={handleGuest}
              sx={{ textTransform: 'none' }}
            >
              Continue as Guest
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: '100%',
          p: 4,
          borderRadius: 3,
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
        }}
      >
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Use your email or phone number and a password. This will bind your sessions to your account.
        </Typography>

        <ToggleButtonGroup
          value={channel}
          exclusive
          onChange={(_, value) => value && setChannel(value)}
          size="small"
          sx={{ mb: 3 }}
        >
          <ToggleButton value="email">Email</ToggleButton>
          <ToggleButton value="phone">Phone</ToggleButton>
        </ToggleButtonGroup>

        {mode === 'signup' && (
          <TextField
            fullWidth
            label="Name (optional)"
            variant="outlined"
            margin="normal"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        )}

        {channel === 'email' ? (
          <TextField
            fullWidth
            label="Email"
            type="email"
            variant="outlined"
            margin="normal"
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                email: e.target.value,
              }))
            }
          />
        ) : (
          <TextField
            fullWidth
            label="Phone number"
            variant="outlined"
            margin="normal"
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                phone: e.target.value,
              }))
            }
          />
        )}

        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          variant="outlined"
          margin="normal"
          value={form.password}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              password: e.target.value,
            }))
          }
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  edge="end"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {mode === 'signup' && (
          <TextField
            fullWidth
            label="Confirm password"
            type={showConfirmPassword ? 'text' : 'password'}
            variant="outlined"
            margin="normal"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                confirmPassword: e.target.value,
              }))
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}

        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, gap: 2 }}>
          <Button
            variant="text"
            color="secondary"
            onClick={() => handleModeChange('choice')}
            disabled={loading}
          >
            Back
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}


