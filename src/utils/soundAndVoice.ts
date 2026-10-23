import { AlertLevel } from '../types/marine';

class MarineAudioManager {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private pulseInterval: number | null = null;
  private isMuted: boolean = false;
  private currentAlertLevel: AlertLevel = 'SAFE';
  private lastSpokenTime: number = 0;
  private lastSpokenLevel: AlertLevel | null = null;
  private voiceEnabled: boolean = true;
  private preferredLanguage: 'ta' | 'en' | 'both' = 'both';

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBuzzer();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
  }

  public setPreferredLanguage(lang: 'ta' | 'en' | 'both') {
    this.preferredLanguage = lang;
  }

  /**
   * Play a discrete marine buzzer beep
   */
  public playBeep(freq: number, durationSec: number = 0.2, gainVal: number = 0.25) {
    if (this.isMuted) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth'; // Piezoelectric harsh marine alarm buzzer tone
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationSec);
    } catch {
      // Audio autoplay restriction
    }
  }

  /**
   * Update buzzer state according to alert level
   */
  public updateBuzzer(level: AlertLevel) {
    this.currentAlertLevel = level;

    if (this.isMuted || level === 'SAFE') {
      this.stopBuzzer();
      return;
    }

    this.stopBuzzer(); // reset previous interval
    this.initAudio();

    if (level === 'YELLOW') {
      // 1 beep every 2.5 seconds (650 Hz)
      this.playBeep(650, 0.2, 0.2);
      this.pulseInterval = window.setInterval(() => {
        if (!this.isMuted && this.currentAlertLevel === 'YELLOW') {
          this.playBeep(650, 0.2, 0.2);
        }
      }, 2500);
    } else if (level === 'ORANGE') {
      // 2 rapid beeps every 1.5 seconds (850 Hz)
      this.playDoubleBeep(850);
      this.pulseInterval = window.setInterval(() => {
        if (!this.isMuted && this.currentAlertLevel === 'ORANGE') {
          this.playDoubleBeep(850);
        }
      }, 1500);
    } else if (level === 'RED') {
      // Urgent fast beeps (1100 Hz, 3 times per second)
      this.playBeep(1100, 0.15, 0.35);
      this.pulseInterval = window.setInterval(() => {
        if (!this.isMuted && this.currentAlertLevel === 'RED') {
          this.playBeep(1100, 0.15, 0.35);
        }
      }, 350);
    } else if (level === 'BREACH') {
      // Continuous dual-tone marine siren (1400 Hz alternating with 900 Hz)
      this.startSiren();
    }
  }

  private playDoubleBeep(freq: number) {
    this.playBeep(freq, 0.12, 0.25);
    setTimeout(() => {
      this.playBeep(freq, 0.12, 0.25);
    }, 180);
  }

  private startSiren() {
    this.stopBuzzer();
    this.initAudio();
    if (!this.audioCtx || this.isMuted) return;

    try {
      let isHigh = false;
      this.pulseInterval = window.setInterval(() => {
        if (this.isMuted || this.currentAlertLevel !== 'BREACH') return;
        const freq = isHigh ? 1350 : 880;
        this.playBeep(freq, 0.22, 0.4);
        isHigh = !isHigh;
      }, 240);
    } catch {
      // ignore audio context errors
    }
  }

  public stopBuzzer() {
    if (this.pulseInterval !== null) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = null;
    }
  }

  /**
   * Speak marine alert announcement via Web Speech API
   */
  public speakAlert(textTa: string, textEn: string, level: AlertLevel, force: boolean = false) {
    if (this.isMuted || !this.voiceEnabled) return;
    if (!('speechSynthesis' in window)) return;

    const now = Date.now();
    // Do not repeat unless level changed or 15 seconds passed
    if (!force && this.lastSpokenLevel === level && now - this.lastSpokenTime < 14000) {
      return;
    }

    this.lastSpokenTime = now;
    this.lastSpokenLevel = level;

    window.speechSynthesis.cancel(); // cancel pending speech

    const voices = window.speechSynthesis.getVoices();
    const tamilVoice = voices.find(v => v.lang.startsWith('ta') || v.name.toLowerCase().includes('tamil'));
    const englishVoice = voices.find(v => v.lang.startsWith('en-IN') || v.lang.startsWith('en'));

    // Speak Tamil first if supported
    if (this.preferredLanguage === 'ta' || this.preferredLanguage === 'both') {
      const utterTa = new SpeechSynthesisUtterance(textTa);
      if (tamilVoice) {
        utterTa.voice = tamilVoice;
        utterTa.lang = tamilVoice.lang;
      } else {
        utterTa.lang = 'ta-IN';
      }
      utterTa.rate = 0.95;
      utterTa.pitch = 1.05;
      utterTa.volume = 1.0;

      utterTa.onend = () => {
        if (this.preferredLanguage === 'both' && textEn) {
          this.speakEnglishText(textEn, englishVoice);
        }
      };

      window.speechSynthesis.speak(utterTa);
    } else if (this.preferredLanguage === 'en') {
      this.speakEnglishText(textEn, englishVoice);
    }
  }

  private speakEnglishText(textEn: string, voice?: SpeechSynthesisVoice) {
    if (!('speechSynthesis' in window)) return;
    const utterEn = new SpeechSynthesisUtterance(textEn);
    if (voice) {
      utterEn.voice = voice;
    }
    utterEn.rate = 1.0;
    utterEn.pitch = 1.0;
    utterEn.volume = 0.9;
    window.speechSynthesis.speak(utterEn);
  }

  /**
   * Direct trigger for testing Tamil Voice
   */
  public testTamilVoice() {
    this.speakAlert(
      "எச்சரிக்கை! நீங்கள் சர்வதேச கடல் எல்லையை நெருங்குகிறீர்கள். பாதுகாப்பான திசையில் திரும்பவும்.",
      "Warning! You are approaching the international marine boundary line. Steer to safe waters.",
      'YELLOW',
      true
    );
  }

  /**
   * Play SOS emergency distress sound
   */
  public playSOSBeep() {
    this.stopBuzzer();
    this.initAudio();
    if (!this.audioCtx || this.isMuted) return;

    // Morse SOS pattern: ... --- ... (short short short, long long long, short short short)
    const shortBeep = 0.12;
    const longBeep = 0.35;
    const freq = 1200;

    const timings = [
      0, 200, 400, // S
      700, 1150, 1600, // O
      2050, 2250, 2450 // S
    ];

    timings.forEach((delay, idx) => {
      setTimeout(() => {
        if (this.isMuted) return;
        const dur = (idx >= 3 && idx <= 5) ? longBeep : shortBeep;
        this.playBeep(freq, dur, 0.4);
      }, delay);
    });
  }
}

export const marineAudio = new MarineAudioManager();
