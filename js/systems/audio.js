export const sfx = {
    ac: null,
    muted: false,
    unlock() {
      if (!this.ac) {
        try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
      }
      if (this.ac && this.ac.state === 'suspended') this.ac.resume();
    },
    beep(f0, f1, dur, type, vol) {
      if (this.muted || !this.ac) return;
      try {
        const ac = this.ac;
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(Math.max(1, f0), ac.currentTime);
        o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), ac.currentTime + dur);
        g.gain.setValueAtTime(vol || 0.12, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
        o.connect(g).connect(ac.destination);
        o.start();
        o.stop(ac.currentTime + dur + 0.03);
      } catch (e) { }
    },
    hit() { this.beep(250, 120, 0.08, 'square', 0.1); },
    hurt() { this.beep(180, 80, 0.25, 'sawtooth', 0.18); },
    shoot() { this.beep(600, 300, 0.1, 'sine', 0.08); },
    swing() { this.beep(300, 180, 0.07, 'triangle', 0.07); },
    skill() { this.beep(500, 900, 0.2, 'sine', 0.12); },
    heal() { this.beep(700, 1200, 0.25, 'sine', 0.12); },
    holy() { this.beep(500, 1000, 0.18, 'sine', 0.1); },
    buff() { this.beep(400, 700, 0.2, 'sine', 0.1); },
    coin() { this.beep(900, 1500, 0.12, 'sine', 0.1); },
    pick() { this.beep(600, 1000, 0.15, 'sine', 0.12); },
    throw() { this.beep(400, 200, 0.15, 'triangle', 0.1); },
    explosion() { this.beep(150, 40, 0.4, 'sawtooth', 0.18); },
    upgrade() { this.beep(300, 900, 0.3, 'square', 0.1); },
    buy() { this.beep(800, 1100, 0.12, 'sine', 0.12); },
    kill() { this.beep(200, 60, 0.2, 'sawtooth', 0.14); },
    shield() { this.beep(900, 500, 0.15, 'sine', 0.1); },
    dash() { this.beep(500, 900, 0.15, 'triangle', 0.12); },
    boss() { this.beep(80, 180, 0.8, 'sawtooth', 0.2); },
    bossDie() { this.beep(60, 40, 1.2, 'sawtooth', 0.18); },
    death() { this.beep(200, 60, 0.8, 'sawtooth', 0.18); }
};
