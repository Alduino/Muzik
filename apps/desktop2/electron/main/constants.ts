export const PLAYBACK_SAMPLE_RATE = 48000;
export const PLAYBACK_CHANNELS = 2;
export const PLAYBACK_SAMPLE_SIZE = 4; // 32-bit

// Actual buffer size is multiplied by channels and sample size.
export const PLAYBACK_BUFFER_SIZE_FRAMES = PLAYBACK_SAMPLE_RATE; // One second

// Provides time for the ffmpeg streaming process to start up.
export const TRACK_CACHED_FRAMES = 1 * PLAYBACK_SAMPLE_RATE; // Three seconds
