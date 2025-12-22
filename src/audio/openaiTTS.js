/**
 * OpenAI Text-to-Speech service for frontend
 * Uses OpenAI's TTS API to convert text to speech
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

/**
 * Convert text to speech using OpenAI TTS API
 * @param {string} text - Text to convert to speech
 * @param {Object} options - TTS options
 * @param {string} options.voice - Voice to use (alloy, echo, fable, onyx, nova, shimmer)
 * @param {string} options.model - Model to use (tts-1, tts-1-hd)
 * @param {number} options.speed - Speed multiplier (0.25 to 4.0)
 * @returns {Promise<AudioBuffer>} Audio buffer ready for playback
 */
export async function textToSpeech(text, options = {}) {
  if (!OPENAI_API_KEY) {
    console.warn('[TTS] VITE_OPENAI_API_KEY not set. TTS will be disabled.');
    return null;
  }

  if (!text || text.trim().length === 0) {
    console.warn('[TTS] Empty text provided');
    return null;
  }

  const {
    voice = 'nova', // Default voice (nova is good for general use)
    model = 'tts-1', // Use tts-1 for faster, tts-1-hd for higher quality
    speed = 1.0, // Normal speed
  } = options;

  try {
    const response = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        speed,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI TTS API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`
      );
    }

    // Get audio data as ArrayBuffer
    const audioData = await response.arrayBuffer();
    return audioData;
  } catch (error) {
    console.error('[TTS] Error converting text to speech:', error);
    throw error;
  }
}

// Reuse audio context for better performance
let audioContext = null;
let currentAudioSource = null; // Track current audio source for stopping

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume audio context if it's suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Stop any currently playing TTS audio
 */
export function stopTTS() {
  if (currentAudioSource) {
    try {
      currentAudioSource.stop();
      currentAudioSource = null;
    } catch (error) {
      // Audio might have already stopped
      currentAudioSource = null;
    }
  }
}

/**
 * Play audio from ArrayBuffer using Web Audio API
 * @param {ArrayBuffer} audioData - Audio data from OpenAI TTS
 * @returns {Promise<void>}
 */
export async function playAudioFromBuffer(audioData) {
  if (!audioData) {
    return;
  }

  try {
    const ctx = getAudioContext();
    const audioBuffer = await ctx.decodeAudioData(audioData);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    // Store current source for stopping
    currentAudioSource = source;
    
    return new Promise((resolve, reject) => {
      source.onended = () => {
        currentAudioSource = null;
        resolve();
      };
      source.onerror = (error) => {
        currentAudioSource = null;
        reject(error);
      };
      source.start(0);
    });
  } catch (error) {
    currentAudioSource = null;
    console.error('[TTS] Error playing audio:', error);
    throw error;
  }
}

/**
 * Convert text to speech and play it
 * @param {string} text - Text to speak
 * @param {Object} options - TTS options
 * @returns {Promise<void>}
 */
export async function speakText(text, options = {}) {
  try {
    const audioData = await textToSpeech(text, options);
    if (audioData) {
      await playAudioFromBuffer(audioData);
    }
  } catch (error) {
    console.error('[TTS] Error in speakText:', error);
    // Don't throw - allow the app to continue even if TTS fails
  }
}

