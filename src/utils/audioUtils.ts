/**
 * Web Audio API Utilities for Speaker, Microphone, and Keyboard Feedback
 */

/**
 * Web Audio API Utilities for Speaker, Microphone, and Keyboard Feedback
 */

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

export type SpeakerSoundType = 'chime' | 'melody' | 'voice' | 'drum' | 'sine';

/**
 * Creates stereo panner node safely
 */
function createPanner(ctx: AudioContext, panValue: number): StereoPannerNode | null {
  try {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(panValue, ctx.currentTime);
    return panner;
  } catch {
    return null;
  }
}

/**
 * Helper to play a single pleasant musical bell tone with rich harmonics
 */
function playBellNote(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number
) {
  // Harmonic ratios for marimba / bell warmth (Fundamental, 2.75x, 5.4x)
  const harmonics = [
    { freqMult: 1.0, gainMult: 1.0, decay: duration },
    { freqMult: 2.0, gainMult: 0.35, decay: duration * 0.7 },
    { freqMult: 3.01, gainMult: 0.15, decay: duration * 0.5 },
    { freqMult: 4.15, gainMult: 0.08, decay: duration * 0.3 },
  ];

  harmonics.forEach(({ freqMult, gainMult, decay }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency * freqMult, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume * gainMult, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + decay);
  });
}

/**
 * Synthesizes a warm musical chime for stereo testing
 */
export function playHarmonicChime(
  channel: 'left' | 'right' | 'both',
  volume = 0.5
): { stop: () => void } {
  const ctx = getAudioContext();
  const panValue = channel === 'left' ? -1 : channel === 'right' ? 1 : 0;
  const panner = createPanner(ctx, panValue);
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, ctx.currentTime);

  if (panner) {
    masterGain.connect(panner);
    panner.connect(ctx.destination);
  } else {
    masterGain.connect(ctx.destination);
  }

  const now = ctx.currentTime;

  // Notes depending on channel:
  // Left: Warm C5 (523Hz) -> G5 (784Hz) chime
  // Right: Crisp E5 (659Hz) -> C6 (1046Hz) chime
  // Both: Rich Chord C4 (261Hz) -> G4 (392Hz) -> C5 (523Hz) -> E5 (659Hz)
  if (channel === 'left') {
    playBellNote(ctx, masterGain, 523.25, now, 1.2, 0.4);
    playBellNote(ctx, masterGain, 783.99, now + 0.18, 1.4, 0.45);
  } else if (channel === 'right') {
    playBellNote(ctx, masterGain, 659.25, now, 1.2, 0.4);
    playBellNote(ctx, masterGain, 1046.5, now + 0.18, 1.4, 0.45);
  } else {
    playBellNote(ctx, masterGain, 261.63, now, 1.6, 0.35); // C4
    playBellNote(ctx, masterGain, 392.0, now + 0.12, 1.5, 0.35); // G4
    playBellNote(ctx, masterGain, 523.25, now + 0.24, 1.5, 0.38); // C5
    playBellNote(ctx, masterGain, 659.25, now + 0.36, 1.6, 0.4); // E5
  }

  return {
    stop: () => {
      try {
        masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Synthesizes a punchy drum beat (Kick bass & Snare treble) for speaker driver testing
 */
export function playDrumBeat(
  channel: 'left' | 'right' | 'both',
  volume = 0.5
): { stop: () => void } {
  const ctx = getAudioContext();
  const panValue = channel === 'left' ? -1 : channel === 'right' ? 1 : 0;
  const panner = createPanner(ctx, panValue);
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, ctx.currentTime);

  if (panner) {
    masterGain.connect(panner);
    panner.connect(ctx.destination);
  } else {
    masterGain.connect(ctx.destination);
  }

  const now = ctx.currentTime;

  // Kick drum (Low bass frequency drop 150Hz -> 35Hz)
  const playKick = (time: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.3);

    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.36);
  };

  // Snare/Hi-hat (Crisp mid-high snare click + noise)
  const playSnare = (time: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.15);

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.21);
  };

  if (channel === 'left') {
    // 2 solid kicks
    playKick(now);
    playKick(now + 0.4);
  } else if (channel === 'right') {
    // 2 crisp snares
    playSnare(now);
    playSnare(now + 0.4);
  } else {
    // Kick + Snare groove
    playKick(now);
    playSnare(now + 0.25);
    playKick(now + 0.5);
    playSnare(now + 0.75);
  }

  return {
    stop: () => {
      try {
        masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Synthesizes a rich Stereo Music Demo Arpeggio that sweeps across channels.
 * By default it runs for a short 4s demo, but can be extended for a 30s
 * left/right balance test when the caller passes a longer duration.
 */
export function playStereoMusicDemo(
  volume = 0.5,
  onProgress?: (channel: 'left' | 'center' | 'right' | 'surround') => void,
  durationSec = 4
): { stop: () => void } {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, ctx.currentTime);
  masterGain.connect(ctx.destination);

  let isStopped = false;
  const timeouts: number[] = [];

  const sequence = [
    { note: 261.63, pan: -1.0, tag: 'left' as const },
    { note: 329.63, pan: -0.7, tag: 'left' as const },
    { note: 392.0, pan: -0.3, tag: 'left' as const },
    { note: 523.25, pan: 0.0, tag: 'center' as const },
    { note: 659.25, pan: 0.4, tag: 'right' as const },
    { note: 783.99, pan: 0.8, tag: 'right' as const },
    { note: 1046.5, pan: 1.0, tag: 'right' as const },
    { note: 523.25, pan: 0.0, tag: 'surround' as const },
    { note: 659.25, pan: 0.0, tag: 'surround' as const },
    { note: 783.99, pan: 0.0, tag: 'surround' as const },
    { note: 1046.5, pan: 0.0, tag: 'surround' as const },
  ];

  const scheduleNote = (item: (typeof sequence)[number], delay: number) => {
    const tId = window.setTimeout(() => {
      if (isStopped) return;
      const now = ctx.currentTime;
      const panner = createPanner(ctx, item.pan);
      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0.35, now);

      if (panner) {
        noteGain.connect(panner);
        panner.connect(masterGain);
      } else {
        noteGain.connect(masterGain);
      }

      playBellNote(ctx, noteGain, item.note, now, 1.2, 0.4);
      if (onProgress) onProgress(item.tag);
    }, delay * 1000);

    timeouts.push(tId);
  };

  const totalLoops = Math.max(1, Math.ceil(durationSec / 3));

  for (let loop = 0; loop < totalLoops; loop++) {
    sequence.forEach((item, index) => {
      scheduleNote(item, loop * 3 + index * 0.35);
    });
  }

  const stopAt = window.setTimeout(() => {
    if (!isStopped) {
      if (onProgress) onProgress('surround');
    }
  }, durationSec * 1000);
  timeouts.push(stopAt);

  return {
    stop: () => {
      isStopped = true;
      timeouts.forEach((id) => clearTimeout(id));
      try {
        masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Standard Studio Sine Tone (440Hz / 880Hz / 554Hz)
 */
export function playStudioSineTone(
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

  const panValue = channel === 'left' ? -1 : channel === 'right' ? 1 : 0;
  const panner = createPanner(ctx, panValue);

  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(volume * 0.7, ctx.currentTime + duration - 0.1);
  gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);

  osc.connect(gain);

  if (panner) {
    gain.connect(panner);
    panner.connect(ctx.destination);
  } else {
    gain.connect(ctx.destination);
  }

  osc.start();
  osc.stop(ctx.currentTime + duration);

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
 * Plays speech audio prompt: "Left channel" / "Right channel" / "Stereo sound"
 */
export function playSpeechPrompt(
  channel: 'left' | 'right' | 'both',
  volume = 0.8
): { stop: () => void } {
  if (!('speechSynthesis' in window)) {
    return playHarmonicChime(channel, volume);
  }

  window.speechSynthesis.cancel();

  // Also play a subtle spatial chime to give spatial localization
  const chimeHandle = playHarmonicChime(channel, volume * 0.5);

  const text =
    channel === 'left'
      ? 'Left channel. Kênh trái.'
      : channel === 'right'
      ? 'Right channel. Kênh phải.'
      : 'Stereo audio. Cả hai loa.';

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = channel === 'right' ? 1.15 : 0.95;
  utterance.volume = volume;

  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 180);

  return {
    stop: () => {
      window.speechSynthesis.cancel();
      chimeHandle.stop();
    },
  };
}

/**
 * Master dispatcher for speaker sound tests
 */
export function playSpeakerTestTone(
  channel: 'left' | 'right' | 'both',
  soundType: SpeakerSoundType = 'chime',
  volume = 0.5
): { stop: () => void } {
  switch (soundType) {
    case 'chime':
      return playHarmonicChime(channel, volume);
    case 'drum':
      return playDrumBeat(channel, volume);
    case 'voice':
      return playSpeechPrompt(channel, volume);
    case 'sine': {
      const freq = channel === 'left' ? 440 : channel === 'right' ? 880 : 554;
      return playStudioSineTone(channel, freq, 1.5, volume);
    }
    case 'melody':
      return playStereoMusicDemo(volume);
    default:
      return playHarmonicChime(channel, volume);
  }
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
  gain.gain.linearRampToValueAtTime(volume * 0.6, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(volume * 0.6, ctx.currentTime + duration - 0.1);
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
