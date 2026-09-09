/**
 * Web Audio API Utilities for Speaker, Microphone, and Keyboard Feedback
 */

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/**
 * Plays a mechanical keyboard click sound using synthesized impulse
 */
export function playKeyClickSound(pitch = 1.0) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 * pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.04);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    console.warn('Click audio error', e);
  }
}

/**
 * Play stereo speaker test tone
 * @param channel 'left' (-1) | 'right' (1) | 'both' (0)
 * @param duration in seconds
 */
export function playSpeakerTestTone(
  channel: 'left' | 'right' | 'both',
  frequency = 440,
  duration = 1.5,
  volume = 0.5
): { stop: () => void } {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Set stereo panning
  const panValue = channel === 'left' ? -1 : channel === 'right' ? 1 : 0;
  let pannerNode: StereoPannerNode | null = null;

  try {
    pannerNode = ctx.createStereoPanner();
    pannerNode.pan.setValueAtTime(panValue, ctx.currentTime);
  } catch {
    // Fallback if StereoPanner not supported
    pannerNode = null;
  }

  // Smooth attack and release envelope to prevent speaker popping
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(volume, ctx.currentTime + duration - 0.1);
  gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);

  osc.connect(gain);

  if (pannerNode) {
    gain.connect(pannerNode);
    pannerNode.connect(ctx.destination);
  } else {
    gain.connect(ctx.destination);
  }

  osc.start();
  osc.stop(ctx.currentTime + duration);

  // Also pronounce channel name using Web Speech API if supported
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utteranceText = channel === 'left' ? 'Left channel' : channel === 'right' ? 'Right channel' : 'Both channels';
      const utterance = new SpeechSynthesisUtterance(utteranceText);
      utterance.rate = 1.1;
      utterance.volume = volume;
      // Slight delay so tone plays first
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 250);
    } catch {
      // ignore
    }
  }

  return {
    stop: () => {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
        setTimeout(() => osc.stop(), 60);
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Frequency sweep from startFreq to endFreq
 */
export function playFrequencySweep(
  startFreq = 80,
  endFreq = 8000,
  duration = 4,
  volume = 0.4,
  onFreqUpdate?: (freq: number) => void
): { stop: () => void } {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);

  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(volume, ctx.currentTime + duration - 0.1);
  gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);

  let intervalId: number | null = null;
  if (onFreqUpdate) {
    const startTime = ctx.currentTime;
    intervalId = window.setInterval(() => {
      const elapsed = ctx.currentTime - startTime;
      if (elapsed >= duration) {
        if (intervalId) clearInterval(intervalId);
        onFreqUpdate(endFreq);
      } else {
        const factor = Math.pow(endFreq / startFreq, elapsed / duration);
        onFreqUpdate(Math.round(startFreq * factor));
      }
    }, 50);
  }

  return {
    stop: () => {
      if (intervalId) clearInterval(intervalId);
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
        setTimeout(() => osc.stop(), 60);
      } catch {
        // ignore
      }
    },
  };
}
