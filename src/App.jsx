import { useCallback, useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addUserMessage,
  markNewAgentMessage,
  appendAgentToken,
  setLiveUserLine,
  loadChatHistory,
  resetChatState,
} from './store/chatSlice';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Box, Container, Typography, Paper, Avatar, Button } from '@mui/material';
import './styles.css';
import { useMicrophone } from './audio/useMicrophone';
import { playAudioChunk } from './audio/audioPlayer';
import { speakText, stopTTS } from './audio/openaiTTS';
import { connectWebSocket, sendAudioChunk, sendInterrupt, sendStartRecording, sendStopRecording, sendChatMessage, subscribe } from './websocket/socket';
import { ConversationView } from './components/ConversationView';
import { StatusIndicator } from './components/StatusIndicator';
import { MicrophoneButton } from './components/MicrophoneButton';
import { ModeToggle } from './components/ModeToggle';
import { ChatInput } from './components/ChatInput';
import { AuthGate } from './components/AuthGate';
import { resetBrowserSessionId } from './session';

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
  const [mode, setMode] = useState('voice'); // 'voice' | 'chat'
  const [authState, setAuthState] = useState(null);
  const [showAuthGate, setShowAuthGate] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const dispatch = useDispatch();
  const userMessages = useSelector((state) => state.chat.userMessages);
  const agentMessages = useSelector((state) => state.chat.agentMessages);
  const liveUserLine = useSelector((state) => state.chat.liveUserLine);
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
    dispatch(loadChatHistory());
    const unsubscribe = subscribe((message) => {
      const { type, payload } = message;
      switch (type) {
        case 'transcript':
          if (payload.isFinal) {
            if (payload.text && payload.text.trim()) {
              dispatch(
                addUserMessage({
                  id: Date.now(),
                  text: payload.text.trim(),
                  timestamp: new Date().toISOString(),
                })
              );
            }
            dispatch(setLiveUserLine(''));
          } else {
            dispatch(setLiveUserLine(payload.text || ''));
          }
          break;
        case 'agent_text':
          if (payload.clear) {
            dispatch(markNewAgentMessage());
            previousAgentTextRef.current = '';
            stopTTS();
            isSpeakingRef.current = false;
          } else if (payload.token) {
            dispatch(appendAgentToken(payload.token));
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

  // Trigger TTS when agent response is complete (only in voice mode)
  useEffect(() => {
    if (
      mode === 'voice' &&
      connectionState === 'idle' &&
      agentMessages.length > 0 &&
      !isSpeakingRef.current
    ) {
      const latest = agentMessages[agentMessages.length - 1];
      if (!latest || !latest.text || !latest.text.trim()) {
        return;
      }

      const textToSpeak = latest.text.trim();
      if (textToSpeak === previousAgentTextRef.current) {
        return;
      }

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
  }, [agentMessages, connectionState, mode]);

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

  const handleChatSend = (text) => {
    if (text && text.trim()) {
      // Add user message to UI immediately
      dispatch(
        addUserMessage({
          id: Date.now(),
          text: text.trim(),
          timestamp: new Date().toISOString(),
        })
      );
      // Send to backend
      sendChatMessage(text);
    }
  };

  const handleModeChange = (newMode) => {
    // Stop any ongoing recording or TTS when switching modes
    if (isRecording) {
      sendStopRecording();
      setIsRecording(false);
    }
    if (isSpeakingRef.current) {
      stopTTS();
      isSpeakingRef.current = false;
      sendInterrupt();
    }
    setMode(newMode);
  };

  const isListening = connectionState === 'listening' || connectionState === 'recording';
  const isThinking = connectionState === 'thinking';
  const isSpeaking = connectionState === 'speaking' || isSpeakingRef.current;

  // Initialize auth state from localStorage on first load
  useEffect(() => {
    if (authState !== null) return;
    if (typeof window === 'undefined') {
      setAuthState({ type: 'guest', user: null });
      setShowAuthGate(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem('voice_agent_auth');
      const guestMode = window.localStorage.getItem('voice_agent_guest_mode') === 'true';
      if (!raw) {
        if (guestMode) {
          // Previously selected guest mode: go straight to chat as guest
          setAuthState({ type: 'guest', user: null });
          setShowAuthGate(false);
        } else {
          // No stored auth: treat as guest but show the auth gate
          setAuthState({ type: 'guest', user: null });
          setShowAuthGate(true);
        }
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && parsed.type === 'user' && parsed.user) {
        setAuthState({ type: 'user', user: parsed.user });
        // Stored user: skip auth gate and go straight to app
        setShowAuthGate(false);
      } else {
        if (guestMode) {
          setAuthState({ type: 'guest', user: null });
          setShowAuthGate(false);
        } else {
          setAuthState({ type: 'guest', user: null });
          setShowAuthGate(true);
        }
      }
    } catch {
      setAuthState({ type: 'guest', user: null });
      setShowAuthGate(true);
    }
  }, [authState]);

  const handleAuthenticated = (next) => {
    const previousUserId = authState && authState.user ? authState.user.id : null;
    const nextUser = next.user || null;
    const nextUserId = nextUser ? nextUser.id : null;

    const nextState = { type: next.type, user: nextUser };
    setAuthState(nextState);
    setShowAuthGate(false);

    if (typeof window !== 'undefined') {
      if (nextState.type === 'user' && nextState.user) {
        window.localStorage.setItem(
          'voice_agent_auth',
          JSON.stringify({ type: 'user', user: nextState.user })
        );
        window.localStorage.removeItem('voice_agent_guest_mode');
      } else {
        window.localStorage.removeItem('voice_agent_auth');
        // Persist explicit guest selection so refresh stays in guest mode
        window.localStorage.setItem('voice_agent_guest_mode', 'true');
      }
    }

    // If we just logged in, or switched to a different user, start a fresh conversation
    if (nextState.type === 'user' && nextUserId && nextUserId !== previousUserId) {
      resetBrowserSessionId();
      dispatch(resetChatState());
      dispatch(loadChatHistory());
    }

    // If we explicitly entered guest mode, start a fresh guest conversation
    if (nextState.type === 'guest') {
      resetBrowserSessionId();
      dispatch(resetChatState());
      dispatch(loadChatHistory());
    }
  };

  const handleLogout = () => {
    setAuthState({ type: 'guest', user: null });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('voice_agent_auth');
      window.localStorage.removeItem('voice_agent_guest_mode');
    }
    // New guest conversation: reset browser session id and clear chat
    resetBrowserSessionId();
    dispatch(resetChatState());
    // After logout, show the auth gate again so user can choose guest or login
    setShowAuthGate(true);
  };

  if (authState === null) {
    // Still hydrating auth state
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
      </ThemeProvider>
    );
  }

  if (showAuthGate) {
    // Show auth gate (login/signup/guest choice)
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthGate
          onAuthenticated={handleAuthenticated}
        />
      </ThemeProvider>
    );
  }

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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {authState?.type === 'user' && authState.user && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mr: 2,
                    px: 1.5,
                    height: 40,
                    borderRadius: 20,
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    backgroundColor: 'rgba(15,23,42,0.8)',
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: 'secondary.main',
                      width: 32,
                      height: 32,
                      fontSize: '0.9rem',
                    }}
                  >
                    {(authState.user.name || authState.user.email || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </Avatar>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
                      {authState.user.name || authState.user.email || 'User'}
                    </Typography>
                    {authState.user.name && authState.user.email && (
                      <Typography variant="caption" color="text.secondary">
                        {authState.user.email}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    size="small"
                    variant="text"
                    color="secondary"
                    onClick={handleLogout}
                    sx={{ textTransform: 'none', fontSize: '0.75rem', px: 1 }}
                  >
                    Logout
                  </Button>
                </Box>
              )}
              {authState?.type === 'guest' && (
                <Button
                  size="small"
                  variant="text"
                  color="secondary"
                  onClick={() => {
                    // Exit guest mode: clear guest flag and return to auth gate
                    if (typeof window !== 'undefined') {
                      window.localStorage.removeItem('voice_agent_guest_mode');
                    }
                    resetBrowserSessionId();
                    dispatch(resetChatState());
                    setShowAuthGate(true);
                  }}
                  sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                >
                  Exit guest mode
                </Button>
              )}
              <ModeToggle
                mode={mode}
                onChange={handleModeChange}
                disabled={connectionState === 'disconnected' || connectionState === 'error'}
              />
              <StatusIndicator state={connectionState} />
            </Box>
          </Box>

          {/* Conversation Area */}
          <Paper
            elevation={0}
            sx={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              borderRadius: 3,
              mb: 3,
              minHeight: '500px',
              maxHeight: 'calc(100vh - 400px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                p: 3,
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                  margin: '8px 0',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(99, 102, 241, 0.4)',
                  borderRadius: '4px',
                  border: '2px solid transparent',
                  backgroundClip: 'padding-box',
                  '&:hover': {
                    background: 'rgba(99, 102, 241, 0.6)',
                    backgroundClip: 'padding-box',
                  },
                },
                // Firefox scrollbar styling
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(99, 102, 241, 0.4) transparent',
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
            </Box>
          </Paper>

          {/* Control Area */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {mode === 'voice' ? (
              <MicrophoneButton
                isRecording={isRecording}
                isSpeaking={isSpeaking}
                onClick={toggleRecording}
                disabled={connectionState === 'disconnected' || connectionState === 'error'}
              />
            ) : (
              <ChatInput
                onSend={handleChatSend}
                disabled={connectionState === 'disconnected' || connectionState === 'error'}
                isThinking={isThinking}
                autoFocus={mode === 'chat'}
              />
            )}
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
              {mode === 'chat'
                ? isThinking
                  ? 'Agent is thinking...'
                  : connectionState === 'connected'
                  ? 'Type your message below'
                  : connectionState === 'disconnected'
                  ? 'Connecting...'
                  : 'Ready to chat'
                : isRecording
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
