import { Box, IconButton } from '@mui/material';
import { Mic, MicOff } from '@mui/icons-material';

export function MicrophoneButton({ isRecording, isSpeaking, onClick, disabled }) {
  const getButtonColor = () => {
    if (isRecording) return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    if (isSpeaking) return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
    return 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
  };

  const getWaveColor = () => {
    if (isRecording) return 'rgba(239, 68, 68, 0.4)';
    if (isSpeaking) return 'rgba(139, 92, 246, 0.4)';
    return 'rgba(99, 102, 241, 0.3)';
  };

  const isActive = isRecording || isSpeaking;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 120,
        height: 120,
      }}
    >
      {/* Wave rings */}
      {isActive && (
        <>
          {[...Array(3)].map((_, i) => (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: `2px solid ${getWaveColor()}`,
                transform: 'translate(-50%, -50%)',
                animation: `wave-expand 2s ease-out infinite`,
                animationDelay: `${i * 0.6}s`,
                opacity: 0,
                '@keyframes wave-expand': {
                  '0%': {
                    transform: 'translate(-50%, -50%) scale(1)',
                    opacity: 0.8,
                  },
                  '100%': {
                    transform: 'translate(-50%, -50%) scale(1.8)',
                    opacity: 0,
                  },
                },
              }}
            />
          ))}
        </>
      )}

      {/* Button */}
      <IconButton
        onClick={onClick}
        disabled={disabled}
        sx={{
          position: 'relative',
          zIndex: 10,
          width: 80,
          height: 80,
          background: getButtonColor(),
          color: 'white',
          boxShadow: isActive
            ? `0 0 20px ${isRecording ? 'rgba(239, 68, 68, 0.5)' : 'rgba(139, 92, 246, 0.5)'}`
            : '0 0 20px rgba(99, 102, 241, 0.3)',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: isActive
              ? `0 0 30px ${isRecording ? 'rgba(239, 68, 68, 0.7)' : 'rgba(139, 92, 246, 0.7)'}`
              : '0 0 30px rgba(99, 102, 241, 0.5)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        {isRecording ? <MicOff sx={{ fontSize: 36 }} /> : <Mic sx={{ fontSize: 36 }} />}
      </IconButton>
    </Box>
  );
}

