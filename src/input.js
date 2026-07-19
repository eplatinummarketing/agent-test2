/* input.js — keyboard input state. Tracks held keys and edge-triggered presses. */
(function (NHL) {
  'use strict';

  function Input() {
    this.keys = {};        // currently held
    this._pressed = {};    // edge: went down this frame
    this._prev = {};
    this.bind();
  }

  const MAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    Space: 'shoot', ShiftLeft: 'pass', ShiftRight: 'pass',
    KeyJ: 'shoot', KeyK: 'pass', KeyL: 'switch', Enter: 'start',
    KeyP: 'pause', Escape: 'pause', KeyC: 'check'
  };

  Input.prototype.bind = function () {
    const self = this;
    window.addEventListener('keydown', function (e) {
      const a = MAP[e.code];
      if (a) {
        if (['up', 'down', 'left', 'right', 'shoot', 'pass', 'start', 'pause'].indexOf(a) >= 0) e.preventDefault();
        self.keys[a] = true;
      }
    });
    window.addEventListener('keyup', function (e) {
      const a = MAP[e.code];
      if (a) self.keys[a] = false;
    });
    // release everything if the window loses focus
    window.addEventListener('blur', function () { self.keys = {}; });
  };

  // Call once per frame to compute edge-triggered presses.
  Input.prototype.update = function () {
    for (const k in this.keys) {
      this._pressed[k] = this.keys[k] && !this._prev[k];
    }
    this._prev = Object.assign({}, this.keys);
  };

  Input.prototype.down = function (a) { return !!this.keys[a]; };
  Input.prototype.pressed = function (a) { return !!this._pressed[a]; };

  // Movement vector from held direction keys.
  Input.prototype.moveVec = function () {
    let x = 0, y = 0;
    if (this.keys.left) x -= 1;
    if (this.keys.right) x += 1;
    if (this.keys.up) y -= 1;
    if (this.keys.down) y += 1;
    return { x: x, y: y };
  };

  NHL.Input = Input;
})(window.NHL = window.NHL || {});
