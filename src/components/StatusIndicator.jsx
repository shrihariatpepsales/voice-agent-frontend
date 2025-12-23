import { Box, Typography, Chip } from '@mui/material';
import { Circle } from '@mui/icons-material';

export function StatusIndicator({ state }) {
  const getStatusConfig = () => {
    switch (state) {
      case 'connected':
        return { color: '#22c55e', label: 'Connected' };
      case 'listening':
      case 'recording':
        return { color: '#3b82f6', label: 'Listening', pulse: true };
      case 'thinking':
        return { color: '#eab308', label: 'Thinking', pulse: true };
      case 'speaking':
        return { color: '#8b5cf6', label: 'Speaking', pulse: true };
      case 'idle':
        return { color: '#6b7280', label: 'Idle' };
      case 'interrupted':
        return { color: '#f97316', label: 'Interrupted' };
      case 'error':
        return { color: '#ef4444', label: 'Error' };
      case 'disconnected':
      default:
        return { color: '#6b7280', label: 'Disconnected' };
    }
  };

  const config = getStatusConfig();

  return (
    <Chip
      icon={
        <Circle
          sx={{
            fontSize: 8,
            color: config.color,
            animation: config.pulse ? 'pulse-dot 2s infinite' : 'none',
            '@keyframes pulse-dot': {
              '0%, 100%': {
                opacity: 1,
                transform: 'scale(1)',
              },
              '50%': {
                opacity: 0.5,
                transform: 'scale(1.2)',
              },
            },
          }}
        />
      }
      label={
        <Typography variant="caption" sx={{ fontWeight: 500 }}>
          {config.label}
        </Typography>
      }
      sx={{
        bgcolor: 'rgba(15, 23, 42, 0.6)',
        border: `1px solid ${config.color}40`,
        color: 'text.primary',
        height: 40,
        borderRadius: 20,
        px: 1.5,
        '& .MuiChip-icon': {
          marginLeft: 1,
        },
      }}
    />
  );
}

