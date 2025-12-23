import { Box } from '@mui/material';

export function AudioVisualizer({ isActive, type }) {
  const color = type === 'listening' ? '#3b82f6' : '#8b5cf6';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        py: 2,
      }}
    >
      {[...Array(5)].map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 4,
            height: isActive ? 32 : 8,
            borderRadius: 2,
            bgcolor: color,
            animation: isActive
              ? `wave ${0.8 + i * 0.1}s ease-in-out infinite`
              : 'none',
            animationDelay: `${i * 0.1}s`,
            opacity: isActive ? 0.8 : 0.3,
            '@keyframes wave': {
              '0%, 100%': {
                height: 8,
                opacity: 0.5,
              },
              '50%': {
                height: 32,
                opacity: 1,
              },
            },
          }}
        />
      ))}
    </Box>
  );
}

