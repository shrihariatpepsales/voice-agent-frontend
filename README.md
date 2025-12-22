# Frontend - Real-time Voice Agent

This frontend is a React + Vite application that provides a user interface for a real-time bidirectional voice agent. It captures microphone audio, displays real-time transcripts and agent responses, and handles text-to-speech playback of agent responses.

## Features

- Real-time microphone audio capture using Web Audio API
- Audio resampling to 16kHz mono PCM16 format
- WebSocket-based bidirectional communication with backend
- Real-time transcript display (interim and finalized)
- Streaming agent response display (token-by-token)
- Automatic text-to-speech playback of agent responses using OpenAI TTS API
- User interruption support (barge-in capability)
- Connection status indicators
- Event logging for debugging
- Responsive UI design

## Tech Stack

- React 19 - UI framework
- Vite - Build tool and dev server
- Web Audio API - Microphone capture and audio playback
- WebSocket API - Real-time communication with backend
- OpenAI TTS API - Text-to-speech conversion
- ESLint - Code linting

## Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Set up environment variables:

Create a `.env` file in the `frontend` directory:

```bash
cp .env.example .env
```

Then edit `.env` and add your OpenAI API key:

```
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

**Important:** In Vite, environment variables must be prefixed with `VITE_` to be exposed to the client-side code. Access them using `import.meta.env.VITE_OPENAI_API_KEY`.

**Required Environment Variables:**
- `VITE_OPENAI_API_KEY` - Your OpenAI API key for text-to-speech functionality

3. Run the development server:

```bash
npm run dev
```

The application will run on `http://localhost:5173` (default Vite port).

**Note:** Make sure the backend server is running on `http://localhost:3001` for the WebSocket connection to work properly.

4. Build for production:

```bash
npm run build
```

The production build will be created in the `dist` directory.

5. Preview production build:

```bash
npm run preview
```

## Folder Structure

```
frontend/
├── src/
│   ├── App.jsx              # Main React component - UI state, WebSocket handling, TTS orchestration
│   ├── main.jsx             # React app entry point
│   ├── styles.css           # Main application styles
│   ├── index.css            # Base styles
│   ├── App.css              # Component-specific styles (if any)
│   ├── audio/
│   │   ├── useMicrophone.js    # React hook for microphone capture and audio processing
│   │   ├── audioPlayer.js       # Utility for playing backend-generated audio chunks
│   │   └── openaiTTS.js         # OpenAI TTS API integration and audio playback
│   └── websocket/
│       └── socket.js        # WebSocket client - connection management and message handling
├── index.html               # HTML entry point
├── vite.config.js           # Vite configuration
├── package.json             # Dependencies and scripts
├── .env                     # Environment variables (not committed)
├── .env.example             # Example environment variables file
└── README.md                # This file
```

## WebSocket Protocol

The frontend communicates with the backend using a JSON-based WebSocket protocol. All messages follow this structure:

```json
{
  "type": "message_type",
  "payload": {}
}
```

### Client to Server Messages

**start_recording**
- Initiates audio recording session
- No payload required
- Triggers backend to start Deepgram stream
- Sent when user clicks "Start Talking" button

**stop_recording**
- Stops audio recording session
- No payload required
- Triggers backend to close Deepgram stream
- Sent when user clicks "Stop Talking" button

**audio_chunk**
- Sends audio data from microphone
- `payload.audio`: base64-encoded PCM16 16kHz mono audio frame
- Sent continuously while recording is active (approximately every 20-50ms)
- Audio is captured in small chunks for low-latency streaming

**interrupt**
- Indicates user barge-in (user starts speaking while agent is responding)
- No payload required
- Cancels in-flight LLM/TTS streams on backend
- Stops any ongoing TTS playback on frontend
- Sent automatically when user clicks "Start Talking" while agent is thinking or speaking

### Server to Client Messages

**transcript**
- Receives transcription results from backend
- `payload.text`: transcript text (accumulated and merged by backend)
- `payload.isFinal`: boolean indicating if this is a final transcript
  - Currently always `false` for interim results (backend uses silence-based finalization)
  - `true` when transcript is finalized after 5 seconds of silence
- Displayed in real-time as user speaks
- Final transcripts are added to transcript history

**agent_text**
- Receives streaming LLM response tokens
- `payload.token`: individual text token from streaming LLM response
- `payload.clear`: boolean (optional) - when `true`, clears previous agent response in UI
- Tokens are accumulated and displayed in real-time
- Used to show agent response as it streams from backend

**agent_audio**
- Receives audio chunks from backend TTS (currently placeholder)
- `payload.audio`: base64-encoded audio chunk for immediate playback
- Note: TTS is currently implemented on frontend using OpenAI TTS API

**status**
- Receives connection and processing state updates
- `payload.state`: one of the following states:
  - `"connected"` - WebSocket connected successfully
  - `"listening"` - Recording started, waiting for audio
  - `"recording"` - Actively recording audio
  - `"thinking"` - Backend is processing transcript and generating LLM response
  - `"speaking"` - Agent response is being generated/played
  - `"idle"` - No active processing, ready for next interaction
  - `"interrupted"` - User interrupted agent response
  - `"error"` - An error occurred
  - `"disconnected"` - WebSocket disconnected
- `payload.error`: optional error code string (when state is "error")
- Used to update connection status indicator in UI

## Component Architecture

### App.jsx

Main React component that orchestrates the entire application.

**State Management:**
- `isRecording`: Boolean - whether microphone is currently recording
- `connectionState`: String - current WebSocket connection state
- `userTranscript`: String - finalized transcript history (accumulated)
- `agentText`: String - current agent response (streaming tokens accumulated)
- `liveUserLine`: String - current interim transcript (real-time display)
- `eventLog`: Array - WebSocket event log for debugging (last 50 events)
- `previousAgentTextRef`: useRef - tracks last spoken agent text to prevent duplicate TTS
- `isSpeakingRef`: useRef - tracks if TTS is currently playing

**Key Functions:**
- `toggleRecording()`: Handles start/stop recording button click
  - Sends `interrupt` if agent is thinking/speaking
  - Sends `start_recording` or `stop_recording` messages
  - Updates `isRecording` state
- `handleAudioFrame()`: Callback for microphone audio frames
  - Only sends audio chunks when `isRecording` is true
  - Forwards PCM16 audio to backend via WebSocket

**Effects:**
- WebSocket connection and message subscription on mount
- TTS trigger effect: monitors `agentText` and `connectionState`
  - Triggers TTS when status becomes 'idle' and agent text is complete
  - Prevents duplicate TTS playback using refs
  - Stops TTS on interruption

**Message Handlers:**
- `transcript`: Updates `liveUserLine` (interim) or `userTranscript` (final)
- `agent_text`: Accumulates streaming tokens or clears previous response
- `status`: Updates `connectionState`
- `agent_audio`: Plays backend-generated audio chunks (placeholder)

### useMicrophone.js

React hook for microphone capture and audio processing.

**Functionality:**
- Requests microphone permission from browser
- Creates Web Audio API context with 16kHz sample rate
- Captures audio using ScriptProcessorNode (deprecated but simple)
- Converts Float32 audio samples to PCM16 format
- Emits audio frames via `onAudioFrame` callback
- Handles cleanup on unmount or when disabled

**Parameters:**
- `enabled`: Boolean - whether to start/stop microphone capture
- `onAudioFrame`: Function - callback that receives PCM16 audio frames

**Returns:**
- `micError`: String or null - microphone access error message if any

**Audio Processing:**
- Buffer size: 1024 samples
- Sample rate: 16000 Hz (16kHz)
- Channels: 1 (mono)
- Format: PCM16 (16-bit signed integers)
- Conversion: Float32 [-1, 1] to Int16 [-32768, 32767]

### socket.js

WebSocket client module for backend communication.

**Functions:**
- `connectWebSocket()`: Establishes WebSocket connection to backend
  - URL: `ws://localhost:3001`
  - Handles connection lifecycle events
  - Notifies all subscribers of connection state changes
- `sendAudioChunk(pcm16)`: Sends audio chunk to backend
  - Converts Uint8Array to base64
  - Sends `audio_chunk` message
- `sendInterrupt()`: Sends interrupt message to backend
- `sendStartRecording()`: Sends start recording message
- `sendStopRecording()`: Sends stop recording message
- `subscribe(callback)`: Subscribes to WebSocket messages
  - Returns unsubscribe function
  - All messages are broadcast to all subscribers

**Message Flow:**
- Incoming messages are parsed from JSON
- Messages are broadcast to all subscribers via `notifyAll()`
- Connection errors and close events are handled and broadcast

### openaiTTS.js

OpenAI Text-to-Speech service integration.

**Functions:**
- `textToSpeech(text, options)`: Converts text to speech using OpenAI TTS API
  - Fetches audio from `/v1/audio/speech` endpoint
  - Returns ArrayBuffer containing audio data
  - Options: `voice`, `model`, `speed`
- `playAudioFromBuffer(audioData)`: Plays audio from ArrayBuffer
  - Uses Web Audio API for playback
  - Returns Promise that resolves when playback completes
  - Handles audio context suspension (browser autoplay policy)
- `speakText(text, options)`: Orchestrates TTS conversion and playback
  - Calls `textToSpeech()` then `playAudioFromBuffer()`
  - Handles errors gracefully
- `stopTTS()`: Stops any currently playing TTS audio
  - Stops current audio source
  - Clears audio source reference

**Configuration:**
- Voice: `nova` (default) - Options: alloy, echo, fable, onyx, nova, shimmer
- Model: `tts-1` (default) - Options: tts-1 (faster), tts-1-hd (higher quality)
- Speed: `1.0` (default) - Range: 0.25 to 4.0

**Audio Context Management:**
- Reuses single AudioContext instance for performance
- Automatically resumes suspended context (browser autoplay policy)
- Tracks current audio source for stopping capability

### audioPlayer.js

Utility for playing backend-generated audio chunks (currently placeholder).

**Function:**
- `playAudioChunk(base64Pcm16)`: Plays base64-encoded PCM16 audio
  - Decodes base64 to PCM16
  - Converts PCM16 to Float32
  - Creates AudioBuffer and plays via Web Audio API
  - Used for backend-generated TTS audio (not currently used)

## Audio Processing Flow

1. **Microphone Capture**
   - User clicks "Start Talking" button
   - `useMicrophone` hook requests microphone permission
   - Web Audio API captures audio stream
   - Audio context created with 16kHz sample rate

2. **Audio Processing**
   - ScriptProcessorNode processes audio in 1024-sample chunks
   - Float32 samples converted to PCM16 format
   - Audio frames emitted via `onAudioFrame` callback

3. **Audio Transmission**
   - `handleAudioFrame` receives PCM16 frames
   - Frames converted to base64 encoding
   - `audio_chunk` messages sent to backend via WebSocket
   - Continuous streaming while recording is active

4. **Transcript Reception**
   - Backend sends `transcript` messages with interim results
   - `liveUserLine` state updated in real-time
   - UI displays transcript as user speaks
   - Final transcripts added to `userTranscript` history

5. **Agent Response Display**
   - Backend sends `agent_text` messages with streaming tokens
   - Tokens accumulated in `agentText` state
   - UI displays agent response in real-time
   - Status updates to `thinking` then `idle`

6. **Text-to-Speech Playback**
   - When `connectionState` becomes `idle` and `agentText` is complete
   - `speakText()` function called with full agent response
   - OpenAI TTS API converts text to audio
   - Audio played via Web Audio API
   - TTS can be interrupted if user starts speaking again

## Text-to-Speech Integration

The frontend uses OpenAI's TTS API to read out agent responses automatically.

**Trigger Conditions:**
- Agent response is complete (`connectionState === 'idle'`)
- Agent text exists and is not empty
- Agent text is different from previously spoken text
- TTS is not currently playing

**Implementation:**
- TTS is triggered via `useEffect` hook that monitors `agentText` and `connectionState`
- Uses `useRef` hooks to track previous spoken text and current speaking state
- Prevents duplicate TTS playback
- Automatically stops TTS if user interrupts

**Configuration:**
- API endpoint: `https://api.openai.com/v1/audio/speech`
- API key: Retrieved from `import.meta.env.VITE_OPENAI_API_KEY`
- Default voice: `nova`
- Default model: `tts-1`
- Default speed: `1.0`

**Error Handling:**
- Missing API key: Logs warning, TTS disabled
- API errors: Logged to console, app continues normally
- Playback errors: Caught and logged, don't crash app

**Interruption:**
- `stopTTS()` function stops current audio playback
- Called when user clicks "Start Talking" while agent is speaking
- Called when new agent response starts (clear flag received)

## State Management

The application uses React's built-in state management with hooks.

**Component State:**
- `useState` for UI state (recording, connection, transcripts, agent text)
- `useRef` for mutable values that don't trigger re-renders (TTS tracking)
- `useCallback` for memoized callbacks (audio frame handler)
- `useEffect` for side effects (WebSocket, TTS triggering)

**State Flow:**
1. User interaction updates local state
2. State changes trigger WebSocket messages
3. WebSocket messages update state
4. State changes trigger UI updates
5. State changes trigger side effects (TTS)

**State Synchronization:**
- Connection state synchronized with backend via `status` messages
- Recording state synchronized via `start_recording`/`stop_recording` messages
- Transcript state synchronized via `transcript` messages
- Agent text synchronized via `agent_text` messages

## UI Components

**Header:**
- Application title: "Realtime Voice Agent"
- Connection status indicator with colored dot
- Status text showing current connection state

**Controls:**
- "Start Talking" / "Stop Talking" button
  - Green gradient when ready to start
  - Red gradient when recording
  - Handles recording toggle and interruption
- Microphone error display (if any)

**Panels:**
- **Your transcript**: Displays user's spoken text
  - Shows "Listening..." when recording starts
  - Shows interim transcript in real-time (`liveUserLine`)
  - Shows finalized transcript history (`userTranscript`)
- **Agent**: Displays agent responses
  - Shows streaming tokens as they arrive
  - Clears when new response starts
  - Shows placeholder text when empty
- **Events**: WebSocket event log
  - Shows last 50 events with timestamps
  - Useful for debugging
  - Shows message types and payloads

**Status Indicators:**
- Colored dots indicate connection state:
  - Green: Connected
  - Yellow: Thinking
  - Blue (pulsing): Recording
  - Purple: Speaking
  - Orange: Interrupted
  - Red: Error
  - Gray: Disconnected/Idle

## Styling

**Design:**
- Dark theme with gradient background
- Modern, minimal UI
- Responsive grid layout
- Smooth animations and transitions

**Key Styles:**
- Gradient backgrounds for buttons
- Box shadows for depth
- Border radius for rounded corners
- Color-coded status indicators
- Pulsing animation for recording state

**Responsive:**
- Grid layout adapts to screen size
- Mobile-friendly padding and spacing
- Max-width constraint for readability

## Development

**Development Server:**
```bash
npm run dev
```
Starts Vite dev server with hot module replacement (HMR).

**Build:**
```bash
npm run build
```
Creates optimized production build in `dist` directory.

**Preview:**
```bash
npm run preview
```
Previews production build locally.

**Linting:**
```bash
npm run lint
```
Runs ESLint to check code quality.

## Error Handling

**Microphone Errors:**
- Permission denied: Displayed in UI as error message
- Device not found: Displayed in UI as error message
- Errors logged to console

**WebSocket Errors:**
- Connection errors: Status updated to "error"
- Message parse errors: Logged to console, message ignored
- Connection lost: Status updated to "disconnected"
- Automatic reconnection: Not implemented (requires page refresh)

**TTS Errors:**
- Missing API key: Warning logged, TTS disabled
- API errors: Logged to console, app continues
- Playback errors: Logged to console, don't crash app

**Audio Processing Errors:**
- Audio context errors: Logged to console
- Conversion errors: Logged to console
- Playback errors: Logged to console

## Browser Compatibility

**Required APIs:**
- Web Audio API (for microphone capture and audio playback)
- WebSocket API (for backend communication)
- MediaDevices API (for microphone access)
- Fetch API (for OpenAI TTS requests)

**Browser Support:**
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may require user interaction for audio context)
- Mobile browsers: Supported with appropriate permissions

**Permissions:**
- Microphone access required
- Audio context may require user interaction (browser autoplay policy)

## Architecture Notes

**Separation of Concerns:**
- Audio processing isolated in `audio/` directory
- WebSocket communication isolated in `websocket/` directory
- UI logic in main `App.jsx` component
- Styles separated into CSS files

**Performance:**
- Audio processing uses efficient PCM16 format
- Small audio chunks for low latency
- Reused AudioContext instances
- Memoized callbacks to prevent unnecessary re-renders

**Real-time Updates:**
- WebSocket provides low-latency bidirectional communication
- State updates trigger immediate UI re-renders
- Streaming tokens displayed as they arrive
- Transcript updates in real-time

**User Experience:**
- Clear visual feedback for all states
- Real-time transcript display
- Automatic TTS playback
- Interruption support for natural conversation flow
