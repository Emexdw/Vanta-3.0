const AMBIENT_ROOTS = [110, 123.47, 130.81, 146.83, 164.81];

interface AmbientNodes {
  oscs: OscillatorNode[];
  lfo: OscillatorNode;
  master: GainNode;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private ambient: AmbientNodes | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) this.ctx = new AudioCtxClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.stopAmbientLoop();
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playHeartLike() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(698.46, now);
    osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12);
    osc2.frequency.setValueAtTime(880.0, now);
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.14);

    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  public playTap() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.05);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playPublish() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.07, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  // Ambiente suave: dos tonos puros con vibrato lento. La nota raíz depende del título,
  // así cada clip/historia suena distinto sin ser invasivo.
  public startAmbientLoop(title?: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    this.stopAmbientLoop();

    const ctx = this.ctx;
    const now = ctx.currentTime;

    let hash = 0;
    for (const ch of title ?? 'vanta') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const root = AMBIENT_ROOTS[hash % AMBIENT_ROOTS.length];

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.012, now + 1.5);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(root, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(root * 1.5, now);
    osc2.detune.setValueAtTime(6, now);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.18, now);
    lfoGain.gain.setValueAtTime(0.004, now);
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(master);
    master.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    this.ambient = { oscs: [osc1, osc2], lfo, master };
  }

  public stopAmbientLoop() {
    if (!this.ambient || !this.ctx) {
      this.ambient = null;
      return;
    }
    const { oscs, lfo, master } = this.ambient;
    const now = this.ctx.currentTime;
    this.ambient = null;

    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      [...oscs, lfo].forEach((o) => o.stop(now + 0.25));
      window.setTimeout(() => {
        try {
          master.disconnect();
        } catch {
          /* ya desconectado */
        }
      }, 400);
    } catch {
      /* nodos ya detenidos */
    }
  }
}

export const soundEngine = new SoundEngine();
