/* audio.js — fully synthesized arena sound via the Web Audio API.
 * No external audio files: every effect is generated on the fly. */
(function (NHL) {
  'use strict';

  function AudioEngine() {
    this.ctx = null;
    this.master = null;
    this.crowdGain = null;
    this.enabled = true;
    this._crowdNodes = null;
  }

  AudioEngine.prototype.ensure = function () {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
  };

  AudioEngine.prototype.resume = function () {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  };

  AudioEngine.prototype.setEnabled = function (on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.9 : 0.0;
  };

  // --- Low-level helpers ---
  AudioEngine.prototype._tone = function (freq, dur, type, vol, when) {
    if (!this.enabled || !this.ctx) return;
    const t = when || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  };

  AudioEngine.prototype._noise = function (dur, vol, filterFreq, when) {
    if (!this.enabled || !this.ctx) return;
    const t = when || this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq || 2000;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(t);
  };

  // --- Named effects ---
  AudioEngine.prototype.stickHit = function () {
    // puck on stick: short high tick
    this._tone(NHL.U.rand(900, 1200), 0.05, 'square', 0.12);
    this._noise(0.03, 0.05, 4000);
  };

  AudioEngine.prototype.shot = function (power) {
    // slapshot whoosh scaling with power (0..1)
    this._noise(0.12, 0.10 + 0.10 * power, 1200);
    this._tone(NHL.U.lerp(200, 420, power), 0.09, 'sawtooth', 0.06);
  };

  AudioEngine.prototype.boards = function () {
    // puck off boards: woody thud
    this._tone(NHL.U.rand(120, 180), 0.09, 'triangle', 0.14);
    this._noise(0.06, 0.10, 800);
  };

  AudioEngine.prototype.post = function () {
    // ping off the post/crossbar
    this._tone(NHL.U.rand(1400, 1700), 0.25, 'sine', 0.16);
    this._tone(NHL.U.rand(2100, 2400), 0.18, 'sine', 0.06);
  };

  AudioEngine.prototype.check = function () {
    // body check: heavy thud
    this._tone(90, 0.12, 'triangle', 0.18);
    this._noise(0.10, 0.14, 600);
  };

  AudioEngine.prototype.save = function () {
    // goalie glove/pad save
    this._tone(NHL.U.rand(260, 340), 0.08, 'triangle', 0.10);
    this._noise(0.05, 0.08, 1500);
  };

  AudioEngine.prototype.whistle = function () {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 2300;
    lfo.frequency.value = 28; lfoG.gain.value = 120;   // trill
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.setValueAtTime(0.18, t + 0.32);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    osc.connect(g); g.connect(this.master);
    osc.start(t); lfo.start(t);
    osc.stop(t + 0.45); lfo.stop(t + 0.45);
  };

  AudioEngine.prototype.goalHorn = function () {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    // classic multi-note blast
    const notes = [110, 138.6, 164.8];
    const dur = 1.6;
    notes.forEach((f) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.05);
      g.gain.setValueAtTime(0.16, t0 + dur - 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(this.master);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    });
    this.crowdRoar(2.2);
  };

  AudioEngine.prototype.crowdRoar = function (dur) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    dur = dur || 1.5;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 700; filt.Q.value = 0.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.25);
    g.gain.setValueAtTime(0.22, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(t);
  };

  // Ambient crowd murmur that runs continuously during play.
  AudioEngine.prototype.startAmbient = function () {
    if (!this.enabled || !this.ctx || this._crowdNodes) return;
    const len = Math.floor(this.ctx.sampleRate * 2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start();
    this._crowdNodes = { src: src, gain: g };
    this.crowdGain = g;
  };

  AudioEngine.prototype.setCrowdLevel = function (level) {
    if (this.crowdGain) this.crowdGain.gain.value = 0.03 + 0.06 * NHL.U.clamp(level, 0, 1);
  };

  NHL.AudioEngine = AudioEngine;
})(window.NHL = window.NHL || {});
