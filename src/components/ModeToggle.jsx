import { ToggleButton, ToggleButtonGroup, Box } from '@mui/material';
import { Mic, Chat } from '@mui/icons-material';

export function ModeToggle({ mode, onChange, disabled }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(e, newMode) => {
          if (newMode !== null && !disabled) {
            onChange(newMode);
          }
        }}
        aria-label="communication mode"
        disabled={disabled}
        sx={{
          bgcolor: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: 2,
          '& .MuiToggleButton-root': {
            color: 'text.secondary',
            border: 'none',
            px: 2,
            py: 0.75,
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            },
            '&:hover': {
              bgcolor: 'rgba(99, 102, 241, 0.1)',
            },
          },
        }}
      >
        <ToggleButton value="voice" aria-label="voice mode">
          <Mic sx={{ fontSize: 18, mr: 1 }} />
          Voice
        </ToggleButton>
        <ToggleButton value="chat" aria-label="chat mode">
          <Chat sx={{ fontSize: 18, mr: 1 }} />
          Chat
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

