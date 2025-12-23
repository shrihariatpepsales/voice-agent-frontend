import { Box, Typography, Avatar, Fade } from '@mui/material';
import { Person, SmartToy } from '@mui/icons-material';

export function ConversationView({ userMessages, agentMessages, liveUserLine, isThinking, isListening }) {
  const maxLength = Math.max(userMessages.length, agentMessages.length);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {userMessages.length === 0 && agentMessages.length === 0 && !liveUserLine && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            textAlign: 'center',
          }}
        >
          <SmartToy sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Welcome! I'm your AI receptionist.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isListening
              ? 'Listening...'
              : 'Click the microphone button to start a conversation'}
          </Typography>
        </Box>
      )}

      {/* Conversation rendered in logical pairs: user message followed by agent reply */}
      {Array.from({ length: maxLength }).map((_, index) => {
        const userMessage = userMessages[index];
        const agentMessage = agentMessages[index];

        const renderUser =
          userMessage &&
          userMessage.text &&
          String(userMessage.text).trim().length > 0;

        const renderAgent =
          agentMessage &&
          agentMessage.text &&
          String(agentMessage.text).trim().length > 0;

        const userTime =
          userMessage && userMessage.timestamp
            ? userMessage.timestamp instanceof Date
              ? userMessage.timestamp.toLocaleTimeString()
              : new Date(userMessage.timestamp).toLocaleTimeString()
            : '';

        const agentTime =
          agentMessage && agentMessage.timestamp
            ? agentMessage.timestamp instanceof Date
              ? agentMessage.timestamp.toLocaleTimeString()
              : new Date(agentMessage.timestamp).toLocaleTimeString()
            : '';

        return (
          <Box key={`pair-${index}`} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {renderUser && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    maxWidth: '70%',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    borderRadius: 3,
                    borderTopRightRadius: 4,
                    p: 2,
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  <Typography variant="body1" sx={{ color: 'white', wordBreak: 'break-word' }}>
                    {userMessage.text}
                  </Typography>
                  {userTime && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 1,
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.75rem',
                      }}
                    >
                      {userTime}
                    </Typography>
                  )}
                </Box>
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                  }}
                >
                  <Person sx={{ fontSize: 20 }} />
                </Avatar>
              </Box>
            )}

            {renderAgent && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  gap: 2,
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: 'secondary.main',
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                  }}
                >
                  <SmartToy sx={{ fontSize: 20 }} />
                </Avatar>
                <Box
                  sx={{
                    maxWidth: '70%',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 3,
                    borderTopLeftRadius: 4,
                    p: 2,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ color: 'text.primary', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                  >
                    {agentMessage.text}
                  </Typography>
                  {agentTime && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 1,
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                      }}
                    >
                      {agentTime}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        );
      })}

      {/* Live User Line (interim transcript) */}
      {liveUserLine && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
          }}
        >
          <Box
            sx={{
              maxWidth: '70%',
              background: 'rgba(99, 102, 241, 0.3)',
              borderRadius: 3,
              borderTopRightRadius: 4,
              p: 2,
              border: '1px dashed rgba(99, 102, 241, 0.5)',
            }}
          >
            <Typography variant="body1" sx={{ color: 'text.primary', wordBreak: 'break-word', fontStyle: 'italic' }}>
              {liveUserLine}
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: '2px',
                  height: '1.2em',
                  bgcolor: 'primary.main',
                  ml: 0.5,
                  animation: 'blink 1s infinite',
                  '@keyframes blink': {
                    '0%, 50%': { opacity: 1 },
                    '51%, 100%': { opacity: 0 },
                  },
                }}
              />
            </Typography>
          </Box>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 36,
              height: 36,
            }}
          >
            <Person sx={{ fontSize: 20 }} />
          </Avatar>
        </Box>
      )}

      {/* Thinking Indicator */}
      {isThinking && (
        <Fade in={isThinking} timeout={300}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              gap: 2,
            }}
          >
            <Avatar
              sx={{
                bgcolor: 'secondary.main',
                width: 36,
                height: 36,
              }}
            >
              <SmartToy sx={{ fontSize: 20 }} />
            </Avatar>
            <Box
              sx={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 3,
                borderTopLeftRadius: 4,
                p: 2,
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    animation: 'pulse-fade 1.5s ease-in-out infinite',
                    animationDelay: '0s',
                    '@keyframes pulse-fade': {
                      '0%, 100%': {
                        opacity: 0.4,
                      },
                      '50%': {
                        opacity: 1,
                      },
                    },
                  }}
                />
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    animation: 'pulse-fade 1.5s ease-in-out infinite',
                    animationDelay: '0.3s',
                    '@keyframes pulse-fade': {
                      '0%, 100%': {
                        opacity: 0.4,
                      },
                      '50%': {
                        opacity: 1,
                      },
                    },
                  }}
                />
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    animation: 'pulse-fade 1.5s ease-in-out infinite',
                    animationDelay: '0.6s',
                    '@keyframes pulse-fade': {
                      '0%, 100%': {
                        opacity: 0.4,
                      },
                      '50%': {
                        opacity: 1,
                      },
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Fade>
      )}
    </Box>
  );
}

