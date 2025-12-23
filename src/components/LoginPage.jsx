import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Container, Typography, Button, Paper, Alert } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

/**
 * LoginPage Component
 * 
 * Displays a login page with a "Sign in with Google" button.
 * Handles Google OAuth 2.0 flow initiation and error display.
 */
function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  // Check for OAuth errors in URL parameters
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages = {
        oauth_failed: 'OAuth authentication failed. Please try again.',
        no_code: 'No authorization code received from Google.',
        config_error: 'OAuth configuration error. Please contact support.',
        token_exchange_failed: 'Failed to exchange authorization code for tokens.',
        no_access_token: 'No access token received from Google.',
        user_info_failed: 'Failed to fetch user information.',
        no_email: 'No email address found in Google account.',
        server_error: 'Server error occurred during authentication.',
      };
      setError(errorMessages[errorParam] || 'An error occurred during login.');
    }
  }, [searchParams]);

  /**
   * Initiates Google OAuth flow by redirecting to backend OAuth endpoint
   */
  const handleGoogleLogin = () => {
    // Get the backend URL from environment or use default (matches backend server port)
    // In production, set VITE_API_URL environment variable
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    // Redirect to backend Google OAuth endpoint
    // This will redirect to Google's consent screen, then back to /auth/google/callback
    window.location.href = `${backendUrl}/auth/google`;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderRadius: 3,
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              mb: 2,
              background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 700,
            }}
          >
            Welcome
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Sign in with your Google account to continue
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleGoogleLogin}
            startIcon={<GoogleIcon />}
            sx={{
              py: 1.5,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              },
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Sign in with Google
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            By signing in, you agree to grant calendar access permissions.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

export default LoginPage;

