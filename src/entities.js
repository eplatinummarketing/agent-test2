/* entities.js — Puck and Skater (incl. goalie) with feet/second physics. */
(function (NHL) {
  'use strict';
  const U = NHL.U, R = NHL.R;

  const C = {
    SKATER_ACCEL: 58,
    SKATER_MAX: 27,
    SKATER_MAX_AI: 25.5,
    SKATER_R: 1.5,
    PUCK_R: 0.55,
    PUCK_FRICTION: 0.62,     // per-second exponential-ish damping factor
    STICK_REACH: 3.6,        // how far a skater can corral the puck
    CONTROL_OFFSET: 2.2,     // puck sits this far ahead of the carrier
    STEAL_RANGE: 3.2,
    CHECK_RANGE: 3.4,
    GOALIE_MAX: 20
  };
  NHL.C = C;

  // ---------------- Puck ----------------
  function Puck() {
    this.x = R.centerX; this.y = R.centerY;
    this.vx = 0; this.vy = 0;
    this.owner = null;      // Skater or null
    this.lastTouch = null;  // Skater
    this.height = 0;        // small hop on shots (visual only)
    this.vh = 0;
    this.cooldown = 0;      // frames before it can be re-grabbed by shooter
  }

  Puck.prototype.speed = function () { return U.len(this.vx, this.vy); };

  Puck.prototype.update = function (dt, game) {
    if (this.cooldown > 0) this.cooldown -= dt;

    if (this.owner) {
      // puck rides on the carrier's stick, slightly ahead of heading
      const o = this.owner;
      const hx = Math.cos(o.heading), hy = Math.sin(o.heading);
      const tx = o.x + hx * C.CONTROL_OFFSET;
      const ty = o.y + hy * C.CONTROL_OFFSET;
      this.x = U.lerp(this.x, tx, Math.min(1, dt * 18));
      this.y = U.lerp(this.y, ty, Math.min(1, dt * 18));
      this.vx = o.vx; this.vy = o.vy;
      this.height = 0; this.vh = 0;
      return;
    }

    // free puck: integrate + friction
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const damp = Math.max(0, 1 - C.PUCK_FRICTION * dt);
    this.vx *= damp; this.vy *= damp;
    if (this.speed() < 0.6) { this.vx = 0; this.vy = 0; }

    // vertical hop (cosmetic)
    if (this.height > 0 || this.vh > 0) {
      this.vh -= 60 * dt;
      this.height += this.vh * dt;
      if (this.height <= 0) { this.height = 0; this.vh = 0; }
    }

    // board collisions (bounce inside rounded rink)
    const before = { x: this.x, y: this.y };
    const clamped = R.clampToRink(this.x, this.y, C.PUCK_R);
    if (clamped.x !== this.x || clamped.y !== this.y) {
      // reflect velocity roughly along the normal from board
      const nx = this.x - clamped.x, ny = this.y - clamped.y;
      const n = U.norm(nx, ny);
      // if straight wall, n may be axis-aligned; approximate reflection
      if (Math.abs(n.x) < 1e-3 && Math.abs(n.y) < 1e-3) {
        // determine which wall
        if (clamped.x <= C.PUCK_R + 0.01 || clamped.x >= R.W - C.PUCK_R - 0.01) this.vx = -this.vx;
        if (clamped.y <= C.PUCK_R + 0.01 || clamped.y >= R.H - C.PUCK_R - 0.01) this.vy = -this.vy;
      } else {
        const dot = this.vx * n.x + this.vy * n.y;
        this.vx -= 2 * dot * n.x;
        this.vy -= 2 * dot * n.y;
      }
      this.x = clamped.x; this.y = clamped.y;
      this.vx *= 0.82; this.vy *= 0.82;
      if (this.speed() > 8 && game) game.onBoards();
    }
  };

  Puck.prototype.shoot = function (dirx, diry, speed, shooter) {
    this.owner = null;
    const d = U.norm(dirx, diry);
    this.vx = d.x * speed;
    this.vy = d.y * speed;
    this.lastTouch = shooter;
    this.cooldown = 0.18;
    this.height = 0.4; this.vh = 6;
  };

  NHL.Puck = Puck;

  // ---------------- Skater ----------------
  // team: 0 (home, attacks right) or 1 (away, attacks left)
  function Skater(team, role, isUser) {
    this.team = team;
    this.role = role;           // 'LW','C','RW','LD','RD','G'
    this.isUser = !!isUser;
    this.isGoalie = role === 'G';
    this.x = R.centerX; this.y = R.centerY;
    this.vx = 0; this.vy = 0;
    this.heading = team === 0 ? 0 : Math.PI;
    this.r = C.SKATER_R;
    this.homeSpot = { x: R.centerX, y: R.centerY };
    this.stun = 0;              // seconds stunned after a check
    this.name = role;
    this.animPhase = Math.random() * 6.28;
    this.jersey = 0;
  }

  // Attacking direction sign for this team (+1 attacks right).
  Skater.prototype.attackDir = function () { return this.team === 0 ? 1 : -1; };
  // Own goal x (the net this skater defends).
  Skater.prototype.ownGoalX = function () { return this.team === 0 ? R.goalLineL : R.goalLineR; };
  Skater.prototype.oppGoalX = function () { return this.team === 0 ? R.goalLineR : R.goalLineL; };

  // desired: {x,y} unit-ish movement input. maxSpeed override optional.
  Skater.prototype.update = function (dt, desired, maxSpeedOverride) {
    if (this.stun > 0) {
      this.stun -= dt;
      // slide with residual velocity while stunned
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.vx *= Math.max(0, 1 - 4 * dt); this.vy *= Math.max(0, 1 - 4 * dt);
      const cl = R.clampToRink(this.x, this.y, this.r);
      this.x = cl.x; this.y = cl.y;
      return;
    }

    const maxSpeed = maxSpeedOverride ||
      (this.isGoalie ? C.GOALIE_MAX : (this.isUser ? C.SKATER_MAX : C.SKATER_MAX_AI));

    const mv = U.norm(desired.x, desired.y);
    const hasInput = (desired.x !== 0 || desired.y !== 0);

    if (hasInput) {
      this.vx += mv.x * C.SKATER_ACCEL * dt;
      this.vy += mv.y * C.SKATER_ACCEL * dt;
      // heading eases toward movement direction
      const target = Math.atan2(mv.y, mv.x);
      this.heading = angleLerp(this.heading, target, Math.min(1, dt * 12));
    } else {
      // glide + friction
      this.vx *= Math.max(0, 1 - 3.4 * dt);
      this.vy *= Math.max(0, 1 - 3.4 * dt);
    }

    // clamp to max speed
    const sp = U.len(this.vx, this.vy);
    if (sp > maxSpeed) {
      this.vx = this.vx / sp * maxSpeed;
      this.vy = this.vy / sp * maxSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // goalies stay near their crease box
    if (this.isGoalie) {
      const gx = this.ownGoalX();
      const inset = this.team === 0 ? gx - 1 : gx + 1; // slightly in front is handled by AI
      // hard clamp: cannot roam too far
      const minX = this.team === 0 ? R.goalLineL - 1.5 : R.goalLineR - 7;
      const maxX = this.team === 0 ? R.goalLineL + 7 : R.goalLineR + 1.5;
      this.x = U.clamp(this.x, minX, maxX);
      this.y = U.clamp(this.y, R.centerY - 9, R.centerY + 9);
    }

    const cl = R.clampToRink(this.x, this.y, this.r);
    if (cl.x !== this.x) this.vx *= 0.4;
    if (cl.y !== this.y) this.vy *= 0.4;
    this.x = cl.x; this.y = cl.y;

    if (sp > 1) this.animPhase += dt * (4 + sp * 0.4);
  };

  Skater.prototype.speed = function () { return U.len(this.vx, this.vy); };

  NHL.Skater = Skater;

  // ---- angle helpers ----
  function angleLerp(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  NHL.angleLerp = angleLerp;

  // Resolve skater-skater collisions (soft push-apart).
  NHL.resolveSkaterCollisions = function (skaters) {
    for (let i = 0; i < skaters.length; i++) {
      for (let j = i + 1; j < skaters.length; j++) {
        const a = skaters[i], b = skaters[j];
        const minD = a.r + b.r;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < minD * minD && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const overlap = (minD - d) / 2;
          const nx = dx / d, ny = dy / d;
          if (a.stun <= 0) { a.x -= nx * overlap; a.y -= ny * overlap; }
          if (b.stun <= 0) { b.x += nx * overlap; b.y += ny * overlap; }
        }
      }
    }
  };
})(window.NHL = window.NHL || {});
