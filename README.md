# Frontend - Real-time AI Voice & Chat Agent

This frontend is a React + Vite application that provides a comprehensive user interface for a real-time bidirectional AI agent system. It supports both voice and text-based interactions, handles appointment booking with Google Calendar integration, and includes authentication via Google OAuth or email/phone.

## Features

### Core Functionality
- Real-time microphone audio capture using Web Audio API
- Audio resampling to 16kHz mono PCM16 format for backend compatibility
- WebSocket-based bidirectional communication with backend
- Dual interaction modes: Voice and Chat
- Real-time transcript display (interim and finalized)
- Streaming agent response display (token-by-token)
- Automatic text-to-speech playback of agent responses using OpenAI TTS API
- User interruption support (barge-in capability)
- Connection status indicators with visual feedback
- Automatic scroll management for conversation view
- Responsive UI design with dark theme

### Authentication & Authorization
- Google OAuth 2.0 login flow
- Email/phone-based authentication (login and signup)
- Guest mode for quick access
- Session persistence across page refreshes
- Browser session tracking per tab

### Appointment Booking
- Interactive appointment booking flow via AI agent
- Google Calendar integration for scheduled appointments
- Automatic timezone detection and handling
- Email confirmation for appointments
- Calendar invite generation with Google Meet links

### User Experience
- Conversation history persistence
- Smooth scrolling to latest messages
- Real-time status updates
- Error handling with user-friendly messages
- Loading states and visual feedback
- Mode switching between voice and chat

## Tech Stack

### Core Framework
- React 19 - UI framework
- Vite 7 - Build tool and dev server
- React Router DOM 7 - Client-side routing

### State Management
- Redux Toolkit 2 - Application state management
- React Redux 9 - React bindings for Redux

### UI Components
- Material-UI (MUI) 7 - Component library
- Emotion - CSS-in-JS styling
- MUI Icons - Icon components

### Communication
- Axios 1 - HTTP client for backend APIs
- WebSocket API - Real-time bidirectional communication

### Audio Processing
- Web Audio API - Microphone capture and audio playback
- OpenAI TTS API - Text-to-speech conversion

### Development Tools
- ESLint 9 - Code linting
- TypeScript types - Type definitions for React

## Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn package manager
- Backend server running on `http://localhost:3001`

### Installation

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Set up environment variables:

Create a `.env` file in the `frontend` directory:

```bash
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_API_URL=http://localhost:3001
```

**Important:** In Vite, environment variables must be prefixed with `VITE_` to be exposed to the client-side code. Access them using `import.meta.env.VITE_OPENAI_API_KEY`.

**Required Environment Variables:**
- `VITE_OPENAI_API_KEY` - Your OpenAI API key for text-to-speech functionality (optional, TTS will be disabled if not provided)
- `VITE_API_URL` - Backend API URL (defaults to `http://localhost:3001` if not set)

3. Run the development server:

```bash
npm run dev
```

The application will run on `http://localhost:5173` (default Vite port).

**Note:** Make sure the backend server is running on `http://localhost:3001` for the WebSocket connection and API calls to work properly.

4. Build for production:

```bash
npm run build
```

The production build will be created in the `dist` directory.

5. Preview production build:

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── App.jsx                    # Main React component - UI state, WebSocket handling, TTS orchestration, routing
│   ├── main.jsx                   # React app entry point (wraps app in Redux Provider and BrowserRouter)
│   ├── styles.css                 # Main application styles and global CSS
│   ├── index.css                  # Base styles and CSS resets
│   ├── App.css                    # Component-specific styles (if any)
│   │
│   ├── audio/
│   │   ├── useMicrophone.js      # React hook for microphone capture and audio processing
│   │   ├── audioPlayer.js         # Utility for playing backend-generated audio chunks
│   │   └── openaiTTS.js           # OpenAI TTS API integration and audio playback
│   │
│   ├── websocket/
│   │   └── socket.js              # WebSocket client - connection management and message handling
│   │
│   ├── api/
│   │   └── client.js              # Axios instance + helpers (includes browser_session_id and timezone on every request)
│   │
│   ├── store/
│   │   ├── index.js               # Redux store configuration
│   │   └── chatSlice.js           # Chat history slice + async thunks to load history
│   │
│   ├── components/
│   │   ├── AudioVisualizer.jsx   # Audio visualization component (if used)
│   │   ├── AuthGate.jsx           # Authentication gate component (email/phone login/signup)
│   │   ├── ChatInput.jsx          # Text input component for chat mode
│   │   ├── ConversationView.jsx   # Main conversation display component
│   │   ├── LoginPage.jsx         # Google OAuth login page
│   │   ├── MicrophoneButton.jsx  # Microphone toggle button with visual feedback
│   │   ├── ModeToggle.jsx        # Voice/Chat mode switcher
│   │   └── StatusIndicator.jsx   # Connection status display component
│   │
│   └── session.js                 # Browser-stable session identifier and metadata management
│
├── public/
│   └── vite.svg                   # Vite logo (if used)
│
├── index.html                     # HTML entry point
├── vite.config.js                 # Vite configuration
├── eslint.config.js               # ESLint configuration
├── package.json                    # Dependencies and scripts
├── .env                           # Environment variables (not committed)
└── README.md                       # This file
```

## Architecture

### Routing

The application uses React Router for client-side routing:

- `/login` - Google OAuth login page
- `/` - Main application (voice/chat interface)

Routes are defined in `App.jsx` using `Routes` and `Route` components.

### Component Architecture

#### App.jsx

Main React component that orchestrates the entire application.

**State Management:**
- `mode`: `"voice"` or `"chat"` - current interaction mode
- `authState`: Authentication state (user/guest)
- `showAuthGate`: Boolean - whether to show authentication gate
- `isRecording`: Boolean - whether microphone is currently recording
- `connectionState`: String - current WebSocket connection state
- Conversation state (`userMessages`, `agentMessages`, `liveUserLine`) is sourced from the Redux `chat` slice via `useSelector`
- `previousAgentTextRef`: `useRef` - tracks last spoken agent text to prevent duplicate TTS
- `isSpeakingRef`: `useRef` - tracks if TTS is currently playing
- `scrollContainerRef`: `useRef` - reference to scrollable conversation container
- `conversationEndRef`: `useRef` - reference to end marker for scrolling

**Key Functions:**
- `toggleRecording()`: Handles start/stop recording button click
  - Sends `interrupt` if agent is thinking/speaking
  - Sends `start_recording` or `stop_recording` messages
  - Updates `isRecording` state
- `handleAudioFrame()`: Callback for microphone audio frames
  - Only sends audio chunks when `isRecording` is true
  - Forwards PCM16 audio to backend via WebSocket
- `handleChatSend()`: Handles text message sending in chat mode
  - Dispatches user message to Redux
  - Sends message to backend via WebSocket
  - Triggers immediate scroll to bottom
- `scrollToBottom()`: Optimized scroll function for conversation container
  - Uses double `requestAnimationFrame` for reliable DOM updates
  - Supports smooth and instant scrolling modes

**Effects:**
- WebSocket connection and message subscription on mount
- TTS trigger effect: monitors `agentMessages` and `connectionState`
  - Triggers TTS when status becomes 'idle' and agent text is complete
  - Prevents duplicate TTS playback using refs
  - Stops TTS on interruption
- Scroll management: automatically scrolls to bottom on new messages
  - Immediate scroll on user message dispatch
  - Immediate scroll when agent message starts
  - Smooth scroll during agent token streaming
- Chat history loading on mount

**Message Handlers:**
- `transcript`: Dispatches `setLiveUserLine` for interim text, and `addUserMessage` when final transcript arrives
- `agent_text`: Dispatches `markNewAgentMessage` when `payload.clear` is true, and `appendAgentToken` for streaming tokens
- `status`: Updates `connectionState`
- `agent_audio`: Plays backend-generated audio chunks (placeholder)

#### ConversationView.jsx

Displays the conversation history in a paired format (user message followed by agent reply).

**Features:**
- Renders user and agent messages in chronological pairs
- Shows timestamps for each message
- Displays live user transcript while recording
- Shows thinking indicator when agent is processing
- Empty state with welcome message
- Responsive message bubbles with avatars

#### ChatInput.jsx

Text input component for chat mode.

**Features:**
- Multiline text input (max 4 rows)
- Send button with icon
- Enter key to send (Shift+Enter for new line)
- Auto-focus support
- Disabled state during agent thinking
- Placeholder text updates based on state

#### LoginPage.jsx

Google OAuth login page component.

**Features:**
- "Sign in with Google" button
- Error message display from URL parameters
- Redirects to backend OAuth endpoint
- Handles OAuth error states
- Modern gradient design

#### AuthGate.jsx

Authentication gate component for email/phone login and signup.

**Features:**
- Choice screen (login/signup/guest)
- Email or phone number authentication
- Password visibility toggle
- Form validation
- Error handling and display
- Guest mode option

#### ModeToggle.jsx

Component for switching between voice and chat modes.

**Features:**
- Toggle button group
- Visual icons (Mic for voice, Chat for chat)
- Disabled state support
- Active state highlighting

#### MicrophoneButton.jsx

Microphone toggle button with visual feedback.

**Features:**
- Animated wave rings when active
- Color changes based on state (recording/speaking/idle)
- Hover effects
- Disabled state support
- Icon changes (Mic/MicOff)

#### StatusIndicator.jsx

Connection status display component.

**Features:**
- Colored dot indicator
- Status text display
- Visual feedback for different states

### State Management

The application uses a hybrid approach: Redux Toolkit for global conversation state and React hooks for local UI state.

#### Global State (Redux Toolkit)

**Slice:** `store/chatSlice.js`

**State:**
- `userMessages`: Array of user message objects `{ id, text, timestamp }`
- `agentMessages`: Array of agent message objects `{ id, text, timestamp }`
- `liveUserLine`: Current interim transcript string
- `status`: Async loading status (`'idle' | 'loading' | 'succeeded' | 'failed'`)
- `error`: Error message if history loading fails
- `streamingNewAgent`: Boolean flag indicating if new agent message is being streamed

**Actions:**
- `addUserMessage(payload)` - Append a new user message
- `markNewAgentMessage()` - Mark that next tokens should start a new agent message
- `appendAgentToken(token)` - Append streaming LLM token to latest agent message
- `setLiveUserLine(text)` - Update the interim transcript
- `resetChatState()` - Reset all chat state to initial values

**Async Thunks:**
- `loadChatHistory()` - Fetches past conversation turns for the current browser tab via `/api/conversations/:sessionId` and initializes the UI on page load/refresh

The Redux store is configured in `store/index.js` and provided to the app via `Provider` in `main.jsx`.

#### Local State (React Hooks in App.jsx)

- `isRecording`, `connectionState`, `mode` (voice/chat), `authState`, `showAuthGate`
- Refs for TTS tracking (`previousAgentTextRef`, `isSpeakingRef`)
- Refs for scroll management (`scrollContainerRef`, `conversationEndRef`, `scrollTimeoutRef`)
- `useEffect` hooks manage WebSocket connection, subscription to messages, auto-scrolling, and TTS triggering

#### State Flow

1. On mount, `connectWebSocket()` is called and `loadChatHistory()` is dispatched
2. WebSocket messages (`transcript`, `agent_text`, `status`, `agent_audio`) dispatch Redux actions to update conversation state
3. User actions (typing/sending messages, microphone toggle) dispatch Redux actions and send WebSocket messages
4. Redux state drives `ConversationView` to show both restored history and live conversation
5. Local state manages UI concerns like recording status, connection state, and mode

## WebSocket Protocol

The frontend communicates with the backend using a JSON-based WebSocket protocol. All messages follow this structure:

```json
{
  "type": "message_type",
  "payload": {},
  "metadata": {}
}
```

The WebSocket client (`websocket/socket.js`) automatically attaches session metadata to every outbound message:

```json
{
  "metadata": {
    "browser_session_id": "<stable-session-id-for-this-tab>",
    "conversation_session_id": "<user-or-guest-session-id>",
    "user_id": "<user-id-or-null>",
    "user_type": "user" | "guest",
    "timezone": "<IANA-timezone-name>"
  }
}
```

The `browser_session_id` is generated once per browser tab using `sessionStorage` (see `session.js`) and is used by the backend to group and restore chat history for that tab. The `timezone` is automatically detected from the browser and included in all messages for proper calendar scheduling.

### Client to Server Messages

**start_recording**
- Initiates audio recording session
- No payload required
- Triggers backend to start Deepgram stream
- Sent when user clicks microphone button in voice mode

**stop_recording**
- Stops audio recording session
- No payload required
- Triggers backend to close Deepgram stream
- Sent when user clicks microphone button again

**audio_chunk**
- Sends audio data from microphone
- `payload.audio`: base64-encoded PCM16 16kHz mono audio frame
- Sent continuously while recording is active (approximately every 20-50ms)
- Audio is captured in small chunks for low-latency streaming

**chat_message**
- Sends text message in chat mode
- `payload.text`: text message string
- Triggers backend LLM processing
- Sent when user types and sends a message

**interrupt**
- Indicates user barge-in (user starts speaking while agent is responding)
- No payload required
- Cancels in-flight LLM/TTS streams on backend
- Stops any ongoing TTS playback on frontend
- Sent automatically when user clicks microphone while agent is thinking or speaking

### Server to Client Messages

**transcript**
- Receives transcription results from backend
- `payload.text`: transcript text (accumulated and merged by backend)
- `payload.isFinal`: boolean indicating if this is a final transcript
  - `false` for interim results (backend uses silence-based finalization)
  - `true` when transcript is finalized after 5 seconds of silence
- Displayed in real-time as user speaks
- Final transcripts are added to conversation history

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
  - `"thinking"` - Backend is processing transcript and generating LLM response
  - `"speaking"` - Agent response is being generated/played
  - `"idle"` - No active processing, ready for next interaction
  - `"interrupted"` - User interrupted agent response
  - `"error"` - An error occurred
  - `"disconnected"` - WebSocket disconnected
- `payload.error`: optional error code string (when state is "error")
- Used to update connection status indicator in UI

## Authentication

The application supports multiple authentication methods:

### Google OAuth 2.0

- Route: `/login`
- Component: `LoginPage.jsx`
- Flow:
  1. User clicks "Sign in with Google"
  2. Redirects to backend `/auth/google` endpoint
  3. Backend redirects to Google consent screen
  4. User grants calendar access permissions
  5. Google redirects back to `/auth/google/callback`
  6. Backend exchanges authorization code for tokens
  7. Backend stores tokens in admin collection
  8. User redirected to main application

### Email/Phone Authentication

- Component: `AuthGate.jsx`
- Supports:
  - Email or phone number login
  - Email or phone number signup
  - Guest mode (no authentication)
- Endpoints:
  - `/api/auth/login` - User login
  - `/api/auth/signup` - User registration
- Session persistence via localStorage

### Session Management

- Browser session ID: Generated per tab, stored in `sessionStorage`
- User authentication: Stored in `localStorage`
- Session metadata: Automatically attached to all requests
- Timezone detection: Automatically detected and included in metadata

## Interaction Modes

### Voice Mode

- Microphone-based interaction
- Real-time speech-to-text transcription
- Audio streaming to backend
- Automatic TTS playback of agent responses
- Visual feedback with animated microphone button
- Wave rings animation during recording/speaking

### Chat Mode

- Text-based interaction
- Chat input component
- Real-time message display
- Streaming agent responses
- No TTS playback
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

Mode switching is handled via `ModeToggle` component and updates the `mode` state in `App.jsx`.

## Calendar Integration

The application integrates with Google Calendar for appointment scheduling:

### Timezone Handling

- Automatic timezone detection from browser
- Timezone included in all WebSocket messages via metadata
- Backend uses timezone for proper calendar event scheduling
- Supports IANA timezone names (e.g., `America/New_York`, `Asia/Kolkata`)

### Appointment Flow

1. User books appointment via AI agent conversation
2. Agent collects appointment details (date, time, patient info)
3. User confirms appointment
4. Backend creates booking record
5. Email confirmation sent (if email provided)
6. Google Calendar event created with correct timezone
7. Calendar invite sent to patient email (if provided)
8. Agent confirms successful booking and calendar scheduling

### Calendar Features

- Automatic Google Meet link generation
- Patient email added as attendee
- Professional event title: "Hospital Appointment - [Patient Name]"
- Detailed event description with appointment information
- Timezone-aware scheduling

## Audio Processing Flow

### Microphone Capture

1. User clicks microphone button in voice mode
2. `useMicrophone` hook requests microphone permission
3. Web Audio API captures audio stream
4. Audio context created with 16kHz sample rate
5. ScriptProcessorNode processes audio in 1024-sample chunks
6. Float32 samples converted to PCM16 format
7. Audio frames emitted via `onAudioFrame` callback

### Audio Transmission

1. `handleAudioFrame` receives PCM16 frames
2. Frames converted to base64 encoding
3. `audio_chunk` messages sent to backend via WebSocket
4. Continuous streaming while recording is active

### Transcript Reception

1. Backend sends `transcript` messages with interim results
2. `liveUserLine` state updated in real-time
3. UI displays transcript as user speaks
4. Final transcripts added to `userMessages` history

### Agent Response Display

1. Backend sends `agent_text` messages with streaming tokens
2. Tokens accumulated in `agentMessages` state
3. UI displays agent response in real-time
4. Status updates to `thinking` then `idle`

### Text-to-Speech Playback

1. When `connectionState` becomes `idle` and `agentMessages` is complete
2. `speakText()` function called with full agent response
3. OpenAI TTS API converts text to audio
4. Audio played via Web Audio API
5. TTS can be interrupted if user starts speaking again

## Text-to-Speech Integration

The frontend uses OpenAI's TTS API to read out agent responses automatically in voice mode.

### Trigger Conditions

- Agent response is complete (`connectionState === 'idle'`)
- Agent text exists and is not empty
- Agent text is different from previously spoken text
- TTS is not currently playing
- Mode is `'voice'`

### Implementation

- TTS is triggered via `useEffect` hook that monitors `agentMessages` and `connectionState`
- Uses `useRef` hooks to track previous spoken text and current speaking state
- Prevents duplicate TTS playback
- Automatically stops TTS if user interrupts

### Configuration

- API endpoint: `https://api.openai.com/v1/audio/speech`
- API key: Retrieved from `import.meta.env.VITE_OPENAI_API_KEY`
- Default voice: `nova`
- Default model: `tts-1`
- Default speed: `1.0`

### Error Handling

- Missing API key: Warning logged, TTS disabled
- API errors: Logged to console, app continues normally
- Playback errors: Caught and logged, don't crash app

### Interruption

- `stopTTS()` function stops current audio playback
- Called when user clicks microphone while agent is speaking
- Called when new agent response starts (clear flag received)

## Scroll Management

The application implements optimized scroll management for smooth user experience:

### Implementation

- Uses `scrollContainerRef` to reference the scrollable conversation container
- `scrollToBottom()` function uses double `requestAnimationFrame` for reliable DOM updates
- Immediate scroll triggers on message dispatch (via microtasks)
- Smooth scrolling during agent token streaming
- Prevents scroll-to-top issues by using direct `scrollTo()` instead of `scrollIntoView()`

### Scroll Triggers

- User message added: Immediate scroll via microtask
- Agent message starts: Immediate scroll via microtask
- Agent tokens streaming: Smooth scroll via useEffect
- Connection state changes: Scroll when streaming completes

## UI Components

### Header

- Application title: "Realtime Voice Agent"
- Connection status indicator with colored dot
- Status text showing current connection state
- Mode toggle (Voice/Chat)

### Conversation Area

- Scrollable conversation view
- Message pairs (user message + agent reply)
- Timestamps for each message
- Live transcript display while recording
- Thinking indicator when agent is processing
- Empty state with welcome message

### Controls

- Microphone button (voice mode)
  - Green gradient when ready to start
  - Red gradient when recording
  - Purple gradient when agent is speaking
  - Animated wave rings during active states
  - Handles recording toggle and interruption
- Chat input (chat mode)
  - Multiline text input
  - Send button
  - Keyboard shortcuts
  - Auto-focus support
- Mode toggle
  - Switch between voice and chat modes
  - Visual icons and active state

### Status Indicators

- Colored dots indicate connection state:
  - Green: Connected
  - Yellow: Thinking
  - Blue (pulsing): Recording
  - Purple: Speaking
  - Orange: Interrupted
  - Red: Error
  - Gray: Disconnected/Idle

## Styling

### Design

- Dark theme with gradient background
- Modern, minimal UI
- Responsive grid layout
- Smooth animations and transitions
- Material-UI components with custom theming

### Key Styles

- Gradient backgrounds for buttons and accents
- Box shadows for depth
- Border radius for rounded corners
- Color-coded status indicators
- Pulsing animation for recording state
- Wave animations for microphone button

### Responsive Design

- Grid layout adapts to screen size
- Mobile-friendly padding and spacing
- Max-width constraint for readability
- Flexible component sizing

## Development

### Development Server

```bash
npm run dev
```

Starts Vite dev server with hot module replacement (HMR). The application will be available at `http://localhost:5173`.

### Build

```bash
npm run build
```

Creates optimized production build in `dist` directory. The build includes:
- Minified JavaScript and CSS
- Optimized assets
- Source maps (for debugging)

### Preview

```bash
npm run preview
```

Previews production build locally using Vite's preview server.

### Linting

```bash
npm run lint
```

Runs ESLint to check code quality and enforce coding standards.

## Error Handling

### Microphone Errors

- Permission denied: Displayed in UI as error message
- Device not found: Displayed in UI as error message
- Errors logged to console
- Graceful fallback to chat mode

### WebSocket Errors

- Connection errors: Status updated to "error"
- Message parse errors: Logged to console, message ignored
- Connection lost: Status updated to "disconnected"
- Automatic reconnection: Not implemented (requires page refresh)

### TTS Errors

- Missing API key: Warning logged, TTS disabled
- API errors: Logged to console, app continues
- Playback errors: Logged to console, don't crash app

### Audio Processing Errors

- Audio context errors: Logged to console
- Conversion errors: Logged to console
- Playback errors: Logged to console

### Authentication Errors

- OAuth errors: Displayed on login page
- Login/signup errors: Displayed in AuthGate component
- Network errors: Handled gracefully with user feedback

## Browser Compatibility

### Required APIs

- Web Audio API (for microphone capture and audio playback)
- WebSocket API (for backend communication)
- MediaDevices API (for microphone access)
- Fetch API (for OpenAI TTS requests)
- Intl API (for timezone detection)

### Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may require user interaction for audio context)
- Mobile browsers: Supported with appropriate permissions

### Permissions

- Microphone access required for voice mode
- Audio context may require user interaction (browser autoplay policy)
- HTTPS required for microphone access in production

## Architecture Notes

### Separation of Concerns

- Audio processing isolated in `audio/` directory
- WebSocket communication isolated in `websocket/` directory
- API client isolated in `api/` directory
- UI components isolated in `components/` directory
- State management isolated in `store/` directory
- Session management isolated in `session.js`

### Performance Optimizations

- Audio processing uses efficient PCM16 format
- Small audio chunks for low latency
- Reused AudioContext instances
- Memoized callbacks to prevent unnecessary re-renders
- Optimized scroll management with requestAnimationFrame
- Redux state updates trigger minimal re-renders

### Real-time Updates

- WebSocket provides low-latency bidirectional communication
- State updates trigger immediate UI re-renders
- Streaming tokens displayed as they arrive
- Transcript updates in real-time
- Smooth scrolling without blocking UI

### User Experience

- Clear visual feedback for all states
- Real-time transcript display
- Automatic TTS playback in voice mode
- Interruption support for natural conversation flow
- Conversation history persistence
- Smooth mode switching
- Responsive design for all screen sizes

## Environment Variables

### Development

Create a `.env` file in the `frontend` directory:

```
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_API_URL=http://localhost:3001
```

### Production

Set environment variables in your hosting platform:

- `VITE_OPENAI_API_KEY`: OpenAI API key for TTS (optional)
- `VITE_API_URL`: Backend API URL (defaults to `http://localhost:3001`)

## API Integration

### Backend Endpoints

The frontend communicates with the backend via HTTP and WebSocket:

**HTTP Endpoints:**
- `GET /api/conversations/:sessionId` - Fetch conversation history
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - OAuth callback (handled by backend)

**WebSocket:**
- `ws://localhost:3001` - Real-time communication

All HTTP requests automatically include session metadata (browser_session_id, timezone, etc.) via Axios interceptors.

## Session Management

### Browser Session ID

- Generated once per browser tab
- Stored in `sessionStorage` (persists across page refreshes)
- Used to group conversation history
- Reset on authentication changes

### User Authentication

- Stored in `localStorage` (persists across sessions)
- Includes user ID and type
- Used for conversation session identification
- Cleared on logout

### Timezone Detection

- Automatically detected from browser
- Uses IANA timezone names
- Included in all WebSocket messages
- Used by backend for calendar scheduling

## Troubleshooting

### Microphone Not Working

- Check browser permissions for microphone access
- Ensure HTTPS is used in production
- Check browser console for errors
- Verify microphone is not being used by another application

### WebSocket Connection Issues

- Verify backend server is running on correct port
- Check network connectivity
- Verify CORS settings on backend
- Check browser console for connection errors

### TTS Not Playing

- Verify `VITE_OPENAI_API_KEY` is set correctly
- Check browser console for API errors
- Ensure audio context is not suspended (may require user interaction)
- Verify OpenAI API key has TTS permissions

### Scroll Issues

- Check browser console for errors
- Verify `scrollContainerRef` is properly attached
- Ensure conversation container has proper CSS (overflow-y: auto)
- Check for conflicting scroll handlers

### Authentication Issues

- Verify backend OAuth configuration
- Check redirect URIs in Google Cloud Console
- Ensure backend server is accessible
- Check browser console for errors

## License

This project is part of a larger application. Refer to the main project repository for license information.
