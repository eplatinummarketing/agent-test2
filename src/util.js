/* util.js — small math + helper utilities on the NHL namespace. */
(function (NHL) {
  'use strict';

  const U = {
    clamp: function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    dist: function (ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); },
    dist2: function (ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; },
    len: function (x, y) { return Math.sqrt(x * x + y * y); },
    angleTo: function (ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },
    // returns a random float in [a, b)
    rand: function (a, b) { return a + Math.random() * (b - a); },
    randInt: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    // normalize a vector; returns {x,y} unit (or zero vector)
    norm: function (x, y) {
      const l = Math.sqrt(x * x + y * y);
      if (l < 1e-6) return { x: 0, y: 0 };
      return { x: x / l, y: y / l };
    },
    // format seconds as M:SS
    clock: function (sec) {
      sec = Math.max(0, Math.ceil(sec));
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return m + ':' + (s < 10 ? '0' : '') + s;
    },
    // move value toward target by max delta
    approach: function (v, target, maxDelta) {
      if (v < target) return Math.min(v + maxDelta, target);
      return Math.max(v - maxDelta, target);
    }
  };

  NHL.U = U;
})(window.NHL = window.NHL || {});
