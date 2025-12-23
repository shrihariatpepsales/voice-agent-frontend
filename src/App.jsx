import { useCallback, useEffect, useState, useRef } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Box, Container, Typography, Paper, Fade } from '@mui/material';
import './styles.css';
import { useMicrophone } from './audio/useMicrophone';
import { playAudioChunk } from './audio/audioPlayer';
import { speakText, stopTTS } from './audio/openaiTTS';
import { connectWebSocket, sendAudioChunk, sendInterrupt, sendStartRecording, sendStopRecording, subscribe } from './websocket/socket';
import { ConversationView } from './components/ConversationView';
import { AudioVisualizer } from './components/AudioVisualizer';
import { StatusIndicator } from './components/StatusIndicator';
import { MicrophoneButton } from './components/MicrophoneButton';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    error: {
      main: '#ef4444',
    },
    background: {
      default: '#0f172a',
      paper: 'rgba(15, 23, 42, 0.8)',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 16,
  },
});

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [userMessages, setUserMessages] = useState([]);
  const [agentMessages, setAgentMessages] = useState([]);
  const [liveUserLine, setLiveUserLine] = useState('');
  const [micError, setMicError] = useState(null);
  const previousAgentTextRef = useRef('');
  const isSpeakingRef = useRef(false);
  const conversationEndRef = useRef(null);

  const handleAudioFrame = useCallback(
    (pcm16) => {
      if (!isRecording) return;
      sendAudioChunk(pcm16);
    },
    [isRecording]
  );

  const { micError: micErrorFromHook } = useMicrophone({
    enabled: isRecording,
    onAudioFrame: handleAudioFrame,
  });

  useEffect(() => {
    setMicError(micErrorFromHook);
  }, [micErrorFromHook]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [userMessages, agentMessages, liveUserLine]);

  useEffect(() => {
    connectWebSocket();
    const unsubscribe = subscribe((message) => {
      const { type, payload } = message;
      switch (type) {
        case 'transcript':
          if (payload.isFinal) {
            // Final transcript - add as a new user message
            if (payload.text && payload.text.trim()) {
              setUserMessages((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  text: payload.text.trim(),
                  timestamp: new Date(),
                },
              ]);
            }
            setLiveUserLine('');
            setAgentMessages([]); // Clear agent messages when new user message arrives
          } else {
            // Interim transcript - show as live typing
            setLiveUserLine(payload.text || '');
          }
          break;
        case 'agent_text':
          if (payload.clear) {
            setAgentMessages([]);
            previousAgentTextRef.current = '';
            stopTTS();
            isSpeakingRef.current = false;
          } else if (payload.token) {
            setAgentMessages((prev) => {
              if (prev.length === 0) {
                return [
                  {
                    id: Date.now(),
                    text: payload.token,
                    timestamp: new Date(),
                  },
                ];
              }
              const lastMessage = prev[prev.length - 1];
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  text: lastMessage.text + payload.token,
                },
              ];
            });
          }
          break;
        case 'status':
          if (payload.state) {
            setConnectionState(payload.state);
          }
          break;
        case 'agent_audio':
          if (payload.audio) {
            playAudioChunk(payload.audio);
          }
          break;
        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Trigger TTS when agent response is complete
  useEffect(() => {
    if (
      connectionState === 'idle' &&
      agentMessages.length > 0 &&
      agentMessages[0].text &&
      agentMessages[0].text.trim().length > 0 &&
      agentMessages[0].text !== previousAgentTextRef.current &&
      !isSpeakingRef.current
    ) {
      const textToSpeak = agentMessages[0].text.trim();
      previousAgentTextRef.current = textToSpeak;
      isSpeakingRef.current = true;
      setConnectionState('speaking');

      speakText(textToSpeak, {
        voice: 'nova',
        model: 'tts-1',
        speed: 1.0,
      })
        .finally(() => {
          isSpeakingRef.current = false;
          setConnectionState('idle');
        });
    }
  }, [agentMessages, connectionState]);

  const toggleRecording = () => {
    if (!isRecording) {
      if (connectionState === 'thinking' || connectionState === 'speaking' || isSpeakingRef.current) {
        stopTTS();
        isSpeakingRef.current = false;
        sendInterrupt();
      }
      sendStartRecording();
      setIsRecording(true);
    } else {
      sendStopRecording();
      setIsRecording(false);
    }
  };

  const isListening = connectionState === 'listening' || connectionState === 'recording';
  const isThinking = connectionState === 'thinking';
  const isSpeaking = connectionState === 'speaking' || isSpeakingRef.current;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
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
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <Box>
              <Typography
                variant="h1"
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  mb: 0.5,
                }}
              >
                Voice Agent
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AI-powered hospital receptionist
              </Typography>
            </Box>
            <StatusIndicator state={connectionState} />
          </Box>

          {/* Conversation Area */}
          <Paper
            elevation={0}
            sx={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              borderRadius: 3,
              p: 3,
              mb: 3,
              minHeight: '500px',
              maxHeight: 'calc(100vh - 400px)',
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(99, 102, 241, 0.5)',
                borderRadius: '4px',
                '&:hover': {
                  background: 'rgba(99, 102, 241, 0.7)',
                },
              },
            }}
          >
            <ConversationView
              userMessages={userMessages}
              agentMessages={agentMessages}
              liveUserLine={liveUserLine}
              isThinking={isThinking}
              isListening={isListening}
            />
            <div ref={conversationEndRef} />
          </Paper>

          {/* Audio Visualizer */}
          {(isListening || isSpeaking) && (
            <Fade in={isListening || isSpeaking}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                <AudioVisualizer isActive={isListening || isSpeaking} type={isListening ? 'listening' : 'speaking'} />
              </Box>
            </Fade>
          )}

          {/* Control Area */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <MicrophoneButton
              isRecording={isRecording}
              isSpeaking={isSpeaking}
              onClick={toggleRecording}
              disabled={connectionState === 'disconnected' || connectionState === 'error'}
            />
          </Box>

          {micError && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="error">
                Microphone Error: {micError}
              </Typography>
            </Box>
          )}

          {/* Status Text */}
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {isRecording
                ? 'Listening... Speak clearly'
                : isSpeaking
                ? 'Agent is speaking...'
                : isThinking
                ? 'Agent is thinking...'
                : connectionState === 'connected'
                ? 'Ready to talk'
                : connectionState === 'disconnected'
                ? 'Connecting...'
                : 'Click the microphone to start'}
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
