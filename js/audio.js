/**
 * A Little Wish — Synthesized Web Audio Nocturnal Soundscape & SFX
 * Zero external audio files required; respects mute toggle & autoplay policies.
 */

const PENTATONIC_HZ = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99];

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambienceGain = null;
    this.enabled = false;
    this.ambienceStarted = false;
    this._chimeTimer = null;
  }

  _ensureContext() {
    if (this.ctx) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0001;
    this.masterGain.connect(this.ctx.destination);

    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.value = 0.45;
    this.ambienceGain.connect(this.masterGain);

    return true;
  }

  _startAmbience() {
    if (this.ambienceStarted || !this.ctx) return;
    this.ambienceStarted = true;

    // 1. Soft riverside water lap (filtered pink-ish noise with slow LFO wave)
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2) * 0.32;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const waterFilter = this.ctx.createBiquadFilter();
    waterFilter.type = 'lowpass';
    waterFilter.frequency.value = 340;
    waterFilter.Q.value = 0.7;

    const waterGain = this.ctx.createGain();
    waterGain.gain.value = 0.14;

    // Gentle tide wave LFO
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.14;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 95;
    lfo.connect(lfoGain);
    lfoGain.connect(waterFilter.frequency);

    noise.connect(waterFilter);
    waterFilter.connect(waterGain);
    waterGain.connect(this.ambienceGain);

    noise.start();
    lfo.start();

    // 2. Ethereal moonlit warm drone pad (D3 + A3 + F#4 softly filtered)
    const padFreqs = [146.83, 220.0, 369.99];
    const padFilter = this.ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 520;
    padFilter.connect(this.ambienceGain);

    padFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = idx === 2 ? 0.015 : 0.028;
      osc.connect(g);
      g.connect(padFilter);
      osc.start();
    });

    // 3. Occasional distant wind-chime note
    this._scheduleAmbientChime();
  }

  _scheduleAmbientChime() {
    if (this._chimeTimer) clearTimeout(this._chimeTimer);
    const delay = 4800 + Math.random() * 6200;
    this._chimeTimer = setTimeout(() => {
      if (this.enabled && !document.hidden) {
        const freq = PENTATONIC_HZ[Math.floor(Math.random() * PENTATONIC_HZ.length)];
        this._playBellTone(freq, 0.032, 2.8);
      }
      this._scheduleAmbientChime();
    }, delay);
  }

  async setEnabled(nextState) {
    this.enabled = Boolean(nextState);
    if (!this.enabled) {
      if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0.0001, now, 0.08);
      }
      return false;
    }

    if (!this._ensureContext()) {
      this.enabled = false;
      return false;
    }

    try {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this._startAmbience();
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.72, now, 0.28);
      return true;
    } catch {
      this.enabled = false;
      return false;
    }
  }

  _playBellTone(freq, peakGain = 0.08, duration = 1.6, startOffset = 0) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime + startOffset;

    const osc = this.ctx.createOscillator();
    const harmonic = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(freq * 2, now);

    const hGain = this.ctx.createGain();
    hGain.gain.value = 0.14;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    harmonic.connect(hGain);
    hGain.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    harmonic.start(now);
    osc.stop(now + duration + 0.05);
    harmonic.stop(now + duration + 0.05);
  }

  playSoftClick() {
    this._playBellTone(587.33, 0.045, 0.45);
  }

  playWaterRipple() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const freq = PENTATONIC_HZ[2 + Math.floor(Math.random() * 4)];
    this._playBellTone(freq, 0.042, 1.15);
  }

  playSwitchChime(index = 0) {
    const notes = [440.0, 493.88, 587.33];
    this._playBellTone(notes[index % notes.length], 0.06, 0.85);
  }

  playCandleLight() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // Tiny warm spark puff
    const bufLen = Math.floor(this.ctx.sampleRate * 0.22);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const env = Math.sin((i / bufLen) * Math.PI);
      ch[i] = (Math.random() * 2 - 1) * env * 0.3;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);

    // Warm golden triad chime
    this._playBellTone(440.0, 0.075, 1.8, 0.04);
    this._playBellTone(587.33, 0.07, 2.0, 0.14);
    this._playBellTone(739.99, 0.055, 2.4, 0.26);
  }

  playReleaseChord() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const chord = [293.66, 369.99, 440.0, 587.33, 739.99];
    chord.forEach((hz, i) => {
      this._playBellTone(hz, 0.065 - i * 0.006, 3.0, i * 0.13);
    });
  }
}
