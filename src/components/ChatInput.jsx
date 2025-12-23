import { Box, TextField, IconButton } from '@mui/material';
import { Send } from '@mui/icons-material';
import { useEffect, useRef, useState } from 'react';

export function ChatInput({ onSend, disabled, isThinking, autoFocus }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const focusInput = () => {
    if (inputRef.current) {
      // Focus the underlying input/textarea element
      const node = inputRef.current.querySelector('textarea, input');
      if (node) {
        node.focus();
      } else if (typeof inputRef.current.focus === 'function') {
        inputRef.current.focus();
      }
    }
  };

  useEffect(() => {
    if (autoFocus && !disabled && !isThinking) {
      focusInput();
    }
  }, [autoFocus, disabled, isThinking]);

  const handleSend = () => {
    if (inputValue.trim() && !disabled && !isThinking) {
      onSend(inputValue.trim());
      setInputValue('');
      // Keep focus in the input for fast consecutive messages
      focusInput();
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-end',
        width: '100%',
        maxWidth: '600px',
      }}
    >
      <TextField
        inputRef={inputRef}
        fullWidth
        multiline
        maxRows={4}
        placeholder={isThinking ? 'Agent is thinking...' : 'Type your message...'}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={disabled || isThinking}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(15, 23, 42, 0.6)',
            color: 'text.primary',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 2,
            '&:hover': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused': {
              borderColor: 'primary.main',
            },
            '& fieldset': {
              border: 'none',
            },
          },
        }}
      />
      <IconButton
        onClick={handleSend}
        disabled={!inputValue.trim() || disabled || isThinking}
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          width: 48,
          height: 48,
          '&:hover': {
            bgcolor: 'primary.dark',
          },
          '&:disabled': {
            bgcolor: 'rgba(99, 102, 241, 0.3)',
            color: 'rgba(255, 255, 255, 0.5)',
          },
        }}
      >
        <Send />
      </IconButton>
    </Box>
  );
}

