import { useCallback, useEffect, useState, useRef } from 'react';
import './styles.css';
import { useMicrophone } from './audio/useMicrophone';
import { playAudioChunk } from './audio/audioPlayer';
import { speakText, stopTTS } from './audio/openaiTTS';
import { connectWebSocket, sendAudioChunk, sendInterrupt, sendStartRecording, sendStopRecording, subscribe } from './websocket/socket';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [userTranscript, setUserTranscript] = useState('');
  const [agentText, setAgentText] = useState('');
  const [liveUserLine, setLiveUserLine] = useState('');
  const [eventLog, setEventLog] = useState([]);
  const previousAgentTextRef = useRef(''); // Track previous agent text to detect completion
  const isSpeakingRef = useRef(false); // Track if TTS is currently playing

  const handleAudioFrame = useCallback(
    (pcm16) => {
      if (!isRecording) return;
      sendAudioChunk(pcm16);
    },
    [isRecording]
  );

  const { micError } = useMicrophone({
    enabled: isRecording,
    onAudioFrame: handleAudioFrame,
  });

  useEffect(() => {
    connectWebSocket();
    const unsubscribe = subscribe((message) => {
      const { type, payload } = message;
      setEventLog((prev) => {
        const next = [...prev, `${new Date().toLocaleTimeString()} ${type} ${JSON.stringify(payload)}`];
        return next.slice(-50);
      });
      switch (type) {
        case 'transcript':
          if (payload.isFinal) {
            // Final transcript after 5 seconds of silence - add to history
            setUserTranscript((prev) => `${prev}\n${payload.text}`);
            setLiveUserLine('');
            // Clear agent text when new user message is finalized (new conversation turn)
            setAgentText('');
          } else {
            // Interim transcript - show in real-time as it builds up
            // This shows the full accumulated transcript as user speaks
            setLiveUserLine(payload.text || '');
          }
          break;
        case 'agent_text':
          // Handle agent text updates
          if (payload.clear) {
            // Clear agent text when new response starts
            setAgentText('');
            previousAgentTextRef.current = '';
            // Stop any ongoing TTS
            stopTTS();
            isSpeakingRef.current = false;
          } else if (payload.token) {
            // Accumulate streaming tokens from LLM
            setAgentText((prev) => {
              const newText = prev + payload.token;
              return newText;
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

  // Effect to trigger TTS when agent response is complete
  // Trigger TTS when status becomes 'idle' (LLM response is complete)
  useEffect(() => {
    // Trigger TTS when:
    // 1. Status is 'idle' (LLM response complete)
    // 2. Agent text exists and is not empty
    // 3. Agent text hasn't been spoken yet (different from previous)
    // 4. Not currently speaking
    if (connectionState === 'idle' &&
        agentText && 
        agentText.trim().length > 0 && 
        agentText !== previousAgentTextRef.current &&
        !isSpeakingRef.current) {
      // Agent response is complete - speak it
      const textToSpeak = agentText.trim();
      previousAgentTextRef.current = textToSpeak;
      isSpeakingRef.current = true;
      
      console.log('[TTS] Speaking agent response:', textToSpeak.substring(0, 50) + '...');
      
      speakText(textToSpeak, {
        voice: 'nova', // Options: alloy, echo, fable, onyx, nova, shimmer
        model: 'tts-1', // Use 'tts-1-hd' for higher quality (slower)
        speed: 1.0, // Normal speed (0.25 to 4.0)
      }).finally(() => {
        isSpeakingRef.current = false;
        console.log('[TTS] Finished speaking');
      });
    }
  }, [agentText, connectionState]);

  const toggleRecording = () => {
    if (!isRecording) {
      // Starting recording
      // Only send an interrupt if the agent is currently responding
      // (thinking or speaking). This avoids marking the very first
      // interaction as "interrupted".
      if (connectionState === 'thinking' || connectionState === 'speaking' || isSpeakingRef.current) {
        // Stop any ongoing TTS playback
        stopTTS();
        isSpeakingRef.current = false;
        sendInterrupt();
      }
      sendStartRecording();
      setIsRecording(true);
    } else {
      // Stopping recording
      sendStopRecording();
      setIsRecording(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Realtime Voice Agent</h1>
        <div className="status">
          <span className={`dot dot-${connectionState}`} />
          <span className="status-text">{connectionState}</span>
        </div>
      </header>

      <main className="app-main">
        <div className="controls">
          <button
            type="button"
            className={isRecording ? 'btn btn-stop' : 'btn btn-start'}
            onClick={toggleRecording}
          >
            {isRecording ? 'Stop Talking' : 'Start Talking'}
          </button>
          {micError && <p className="error">Mic error: {micError}</p>}
        </div>

        <div className="panels">
          <section className="panel">
            <h2>Your transcript</h2>
            <pre className="text-block">
              {userTranscript ? `${userTranscript}\n${liveUserLine}` : (liveUserLine || (connectionState === 'listening' || connectionState === 'recording' ? 'Listening...' : 'Speak into the microphone...'))}
            </pre>
          </section>
          <section className="panel">
            <h2>Agent</h2>
            <pre className="text-block">{agentText || 'Agent responses will appear here.'}</pre>
          </section>
          <section className="panel">
            <h2>Events</h2>
            <pre className="text-block">
              {eventLog.length
                ? eventLog.join('\n')
                : 'WebSocket and transcription events will appear here.'}
            </pre>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
