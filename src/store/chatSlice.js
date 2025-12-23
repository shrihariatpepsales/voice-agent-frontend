import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchConversationHistory } from '../api/client';

export const loadChatHistory = createAsyncThunk(
  'chat/loadHistory',
  async () => {
    const data = await fetchConversationHistory();
    const entries = Array.isArray(data.entries) ? data.entries : [];

    const userMessages = [];
    const agentMessages = [];

    entries.forEach((entry, index) => {
      if (entry.transcript) {
        userMessages.push({
          id: `u-${index}`,
          text: entry.transcript,
          timestamp: entry.timestamp || new Date().toISOString(),
        });
      }
      if (entry.llm_response) {
        agentMessages.push({
          id: `a-${index}`,
          text: entry.llm_response,
          timestamp: entry.timestamp || new Date().toISOString(),
        });
      }
    });

    return {
      userMessages,
      agentMessages,
    };
  }
);

const initialState = {
  userMessages: [],
  agentMessages: [],
  liveUserLine: '',
  status: 'idle',
  error: null,
  streamingNewAgent: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addUserMessage(state, action) {
      state.userMessages.push(action.payload);
    },
    markNewAgentMessage(state) {
      // Next incoming tokens should start a new agent message bubble
      state.streamingNewAgent = true;
    },
    appendAgentToken(state, action) {
      const token = action.payload;
      if (!token) return;
      if (state.agentMessages.length === 0 || state.streamingNewAgent) {
        state.agentMessages.push({
          id: Date.now(),
          text: token,
          timestamp: new Date().toISOString(),
        });
        state.streamingNewAgent = false;
      } else {
        const last = state.agentMessages[state.agentMessages.length - 1];
        last.text = (last.text || '') + token;
      }
    },
    setLiveUserLine(state, action) {
      state.liveUserLine = action.payload || '';
    },
    resetChatState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadChatHistory.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadChatHistory.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.userMessages = action.payload.userMessages;
        state.agentMessages = action.payload.agentMessages;
      })
      .addCase(loadChatHistory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error ? action.error.message : 'Failed to load history';
      });
  },
});

export const {
  addUserMessage,
  markNewAgentMessage,
  appendAgentToken,
  setLiveUserLine,
  resetChatState,
} = chatSlice.actions;

export default chatSlice.reducer;


