/* game.js — the game engine: state machine, rules, controls, and rendering
 * orchestration. Ties together entities, AI, rink, audio, and input. */
(function (NHL) {
  'use strict';
  const U = NHL.U, R = NHL.R, C = NHL.C, AI = NHL.AI, Render = NHL.Render;

  const STATE = { MENU: 'MENU', COUNTDOWN: 'COUNTDOWN', FACEOFF: 'FACEOFF',
                  PLAY: 'PLAY', GOAL: 'GOAL', INTERMISSION: 'INTERMISSION',
                  GAMEOVER: 'GAMEOVER', PAUSED: 'PAUSED' };

  // Starting formation offsets (team 0 frame), used to place players for faceoff.
  const LINEUP = [
    { role: 'LW', dx: -18, dy: -14 },
    { role: 'C',  dx: -6,  dy: 0 },
    { role: 'RW', dx: -18, dy: 14 },
    { role: 'LD', dx: -40, dy: -12 },
    { role: 'RD', dx: -40, dy: 12 },
    { role: 'G',  dx: 0,   dy: 0 }   // placed at own goal separately
  ];
  const JERSEYS = { LW: 17, C: 91, RW: 88, LD: 4, RD: 8, G: 31 };

  function Game(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new NHL.Input();
    this.audio = new NHL.AudioEngine();
    this.opts = opts || {};

    this.state = STATE.MENU;
    this.players = [];
    this.puck = new NHL.Puck();
    this.userTeam = 0;
    this.userSkater = null;
    this.particles = [];

    this.home = NHL.teamByAbbr('BOS');
    this.away = NHL.teamByAbbr('TOR');

    this.score = [0, 0];
    this.period = 1;
    this.periodLength = (this.opts.periodLength || 120); // seconds of game time
    this.clock = this.periodLength;
    this.difficulty = this.opts.difficulty || 'Pro';

    this.charge = 0;           // shot charge (0..1)
    this.switchCooldown = 0;
    this.messageTimer = 0;
    this.message = '';
    this.subMessage = '';
    this.countdown = 0;
    this.flash = 0;            // goal flash
    this.shake = 0;
    this.lastGoalTeam = -1;
    this._faceoffTimer = 0;

    this.resize();
    const self = this;
    window.addEventListener('resize', function () { self.resize(); });

    this._last = 0;
    this._raf = null;
  }

  Game.prototype.difficultyFactor = function () {
    return { 'Rookie': 0.82, 'Pro': 0.94, 'AllStar': 1.0, 'Legend': 1.06 }[this.difficulty] || 0.94;
  };

  // ---- layout / camera ----
  Game.prototype.resize = function () {
    const wrap = this.canvas.parentElement;
    const availW = wrap.clientWidth;
    const availH = wrap.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(availW * dpr);
    this.canvas.height = Math.floor(availH * dpr);
    this.canvas.style.width = availW + 'px';
    this.canvas.style.height = availH + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // fit rink with margin for boards + HUD at top
    const marginX = 24, marginTop = 64, marginBottom = 24;
    const usableW = availW - marginX * 2;
    const usableH = availH - marginTop - marginBottom;
    const scale = Math.min(usableW / R.W, usableH / R.H);
    const ox = (availW - R.W * scale) / 2;
    const oy = marginTop + (usableH - R.H * scale) / 2;
    this.cam = new R.Camera(scale, ox, oy);
    this.viewW = availW; this.viewH = availH;
  };

  // ---- setup a match ----
  Game.prototype.setup = function (homeAbbr, awayAbbr, userTeam, difficulty) {
    this.home = NHL.teamByAbbr(homeAbbr);
    this.away = NHL.teamByAbbr(awayAbbr);
    this.userTeam = userTeam;
    this.difficulty = difficulty || this.difficulty;
    this.score = [0, 0];
    this.period = 1;
    this.clock = this.periodLength;
    this.buildRosters();
    this.audio.resume();
    this.audio.startAmbient();
    this.startFaceoff(true);
  };

  Game.prototype.buildRosters = function () {
    this.players = [];
    for (let team = 0; team < 2; team++) {
      for (const p of LINEUP) {
        const sk = new NHL.Skater(team, p.role, false);
        sk.jersey = JERSEYS[p.role];
        this.players.push(sk);
      }
    }
    // choose user's center as initial controlled skater
    this.userSkater = this.players.find((s) => s.team === this.userTeam && s.role === 'C');
  };

  Game.prototype.teamObj = function (t) { return t === 0 ? this.home : this.away; };

  // place all players at faceoff formation around a dot
  Game.prototype.placeForFaceoff = function (dot) {
    for (const sk of this.players) {
      sk.vx = 0; sk.vy = 0; sk.stun = 0;
      const a = sk.attackDir();
      if (sk.isGoalie) {
        sk.x = sk.ownGoalX() + a * 3;
        sk.y = R.centerY;
        sk.heading = a > 0 ? 0 : Math.PI;
        continue;
      }
      const lu = LINEUP.find((l) => l.role === sk.role);
      // offset toward each team's own end so both sides face the dot
      sk.x = dot.x + a * lu.dx;
      sk.y = dot.y + lu.dy;
      sk.x = U.clamp(sk.x, 12, R.W - 12);
      sk.y = U.clamp(sk.y, 8, R.H - 8);
      sk.heading = a > 0 ? 0 : Math.PI;
    }
    // centers take the dot
    for (const sk of this.players) {
      if (sk.role === 'C') {
        const a = sk.attackDir();
        sk.x = dot.x - a * 1.6;
        sk.y = dot.y;
      }
    }
    this.puck.owner = null;
    this.puck.vx = 0; this.puck.vy = 0;
    this.puck.x = dot.x; this.puck.y = dot.y;
    this.puck.height = 0; this.puck.vh = 0;
  };

  Game.prototype.startFaceoff = function (center) {
    const dot = center ? R.centerDot : (this._nextDot || R.centerDot);
    this.placeForFaceoff(dot);
    this.state = STATE.COUNTDOWN;
    this.countdown = 1.6;
    this.charge = 0;
    // re-select nearest user skater to the dot
    this.userSkater = this.nearestTeammateTo(dot.x, dot.y, this.userTeam);
  };

  Game.prototype.nearestTeammateTo = function (x, y, team) {
    let best = null, bd = Infinity;
    for (const s of this.players) {
      if (s.team !== team || s.isGoalie) continue;
      const d = U.dist2(s.x, s.y, x, y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  };

  // ---- main loop ----
  Game.prototype.start = function () {
    const self = this;
    this._last = 0;
    function frame(ts) {
      if (!self._last) self._last = ts;
      let dt = (ts - self._last) / 1000;
      self._last = ts;
      dt = Math.min(dt, 0.05); // clamp big gaps
      self.update(dt);
      self.render();
      self._raf = requestAnimationFrame(frame);
    }
    this._raf = requestAnimationFrame(frame);
  };

  Game.prototype.update = function (dt) {
    this.input.update();
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.switchCooldown > 0) this.switchCooldown -= dt;
    Render.updateParticles(this.particles, dt);

    // pause toggle
    if (this.input.pressed('pause') &&
        (this.state === STATE.PLAY || this.state === STATE.PAUSED)) {
      this.state = this.state === STATE.PAUSED ? STATE.PLAY : STATE.PAUSED;
    }

    switch (this.state) {
      case STATE.MENU: break;
      case STATE.PAUSED: break;
      case STATE.COUNTDOWN:
        this.countdown -= dt;
        this.simulatePlayers(dt, true); // players can drift a touch, puck frozen
        if (this.countdown <= 0) { this.state = STATE.PLAY; this.audio.whistle(); }
        break;
      case STATE.PLAY:
        this.updatePlay(dt);
        break;
      case STATE.GOAL:
        this.messageTimer -= 0; // handled below
        this.simulatePlayers(dt, false);
        this._goalTimer -= dt;
        if (this._goalTimer <= 0) this.afterGoal();
        break;
      case STATE.INTERMISSION:
        this._interTimer -= dt;
        if (this._interTimer <= 0) { this.startFaceoff(true); }
        break;
      case STATE.GAMEOVER:
        break;
    }
  };

  // players update but no scoring (used during countdown/goal celebration)
  Game.prototype.simulatePlayers = function (dt, frozenPuck) {
    for (const sk of this.players) {
      let desired = { x: 0, y: 0 };
      if (sk === this.userSkater && this.state !== STATE.GOAL) {
        desired = this.input.moveVec();
      } else {
        desired = AI.control(sk, this);
      }
      const spd = this.aiSpeedFor(sk);
      sk.update(dt, desired, spd);
    }
    NHL.resolveSkaterCollisions(this.players);
    if (!frozenPuck) this.puck.update(dt, this);
    this.handlePossession(dt);
  };

  Game.prototype.aiSpeedFor = function (sk) {
    if (sk === this.userSkater) return undefined;
    if (sk.isGoalie) return undefined;
    return C.SKATER_MAX_AI * this.difficultyFactor();
  };

  Game.prototype.updatePlay = function (dt) {
    // clock
    this.clock -= dt;
    if (this.clock <= 0) { this.clock = 0; this.endPeriod(); return; }

    // user actions
    this.handleUserActions(dt);

    // move everyone
    for (const sk of this.players) {
      let desired;
      if (sk === this.userSkater) {
        desired = this.input.moveVec();
      } else {
        desired = AI.control(sk, this);
      }
      sk.update(dt, desired, this.aiSpeedFor(sk));
    }
    NHL.resolveSkaterCollisions(this.players);

    this.puck.update(dt, this);
    this.handlePossession(dt);
    this.handleGoalieSaves();
    this.checkGoal();

    // crowd intensity based on puck distance to a net
    const dNet = Math.min(
      U.dist(this.puck.x, this.puck.y, R.goalLineL, R.centerY),
      U.dist(this.puck.x, this.puck.y, R.goalLineR, R.centerY));
    this.audio.setCrowdLevel(1 - U.clamp(dNet / 70, 0, 1));

    // auto-switch to nearest teammate to the puck when we don't have it
    this.autoSwitch();
  };

  Game.prototype.autoSwitch = function () {
    if (this.switchCooldown > 0) return;
    const owner = this.puck.owner;
    if (owner && owner.team === this.userTeam) {
      // controlling the carrier
      if (this.userSkater !== owner) { this.userSkater = owner; }
      return;
    }
    // if user pressed switch, or we're far from the puck, pick nearest teammate
    const manual = this.input.pressed('switch');
    const near = this.nearestTeammateTo(this.puck.x, this.puck.y, this.userTeam);
    if (manual && near) { this.userSkater = near; this.switchCooldown = 0.3; return; }
    // soft auto-switch only when free puck and our guy is clearly not the closest
    if (!owner && near && near !== this.userSkater) {
      const dUser = U.dist(this.userSkater.x, this.userSkater.y, this.puck.x, this.puck.y);
      const dNear = U.dist(near.x, near.y, this.puck.x, this.puck.y);
      if (dUser - dNear > 10) { this.userSkater = near; this.switchCooldown = 0.4; }
    }
  };

  // ---- possession: pick up free puck, steals ----
  Game.prototype.handlePossession = function (dt) {
    const puck = this.puck;
    if (puck.cooldown > 0) return;

    if (puck.owner) {
      // steal attempt by nearby opponents
      for (const sk of this.players) {
        if (sk.team === puck.owner.team || sk.isGoalie) continue;
        const d = U.dist(sk.x, sk.y, puck.x, puck.y);
        if (d < C.STEAL_RANGE && sk.stun <= 0) {
          const base = sk.isUser ? 0.5 : 0.5 * this.difficultyFactor();
          // easier to steal from behind / when carrier is slow
          if (Math.random() < base * dt * 3.2) {
            this.givePuck(sk);
            this.audio.stickHit();
            this.spray(puck.x, puck.y, 6);
            return;
          }
        }
      }
      return;
    }

    // free puck — nearest reaching skater corrals it
    let best = null, bd = C.STICK_REACH;
    for (const sk of this.players) {
      if (sk.stun > 0) continue;
      if (sk.isGoalie) continue;
      if (puck.lastTouch === sk && puck.cooldown > 0) continue;
      const d = U.dist(sk.x, sk.y, puck.x, puck.y);
      if (d < bd) { bd = d; best = sk; }
    }
    if (best) {
      // don't instantly grab a blazing puck unless it's slow or moving toward you
      const towardness = (puck.vx * (best.x - puck.x) + puck.vy * (best.y - puck.y));
      if (puck.speed() < 45 || towardness < 0) {
        this.givePuck(best);
        if (puck.speed() > 10) this.audio.stickHit();
      }
    }
  };

  Game.prototype.givePuck = function (sk) {
    this.puck.owner = sk;
    this.puck.lastTouch = sk;
    this.puck.vx = sk.vx; this.puck.vy = sk.vy;
    this.puck.cooldown = 0.12;
    // if this pickup completes a user pass, hand control to the receiver
    if (this._pendingSwitch === sk && sk.team === this.userTeam) {
      this.userSkater = sk;
      this._pendingSwitch = null;
    }
  };

  // ---- user actions: shoot (charge), pass, check ----
  Game.prototype.handleUserActions = function (dt) {
    const u = this.userSkater;
    if (!u) return;
    const hasPuck = this.puck.owner === u;

    // CHECK
    if (this.input.pressed('check') && u.stun <= 0) {
      // find nearest opponent to lay a hit on
      let target = null, bd = C.CHECK_RANGE;
      for (const sk of this.players) {
        if (sk.team === u.team || sk.isGoalie) continue;
        const d = U.dist(u.x, u.y, sk.x, sk.y);
        if (d < bd) { bd = d; target = sk; }
      }
      if (target) this.attemptCheck(u, target);
    }

    // SHOOT — charge while held, release to fire
    if (hasPuck) {
      if (this.input.down('shoot')) {
        this.charge = Math.min(1, this.charge + dt / 0.85);
      } else if (this.charge > 0.05) {
        this.userShoot(u, this.charge);
        this.charge = 0;
      } else {
        this.charge = 0;
      }
      // PASS
      if (this.input.pressed('pass')) {
        const mate = AI.bestPassTarget(u, this) || this.nearestForwardMate(u);
        if (mate) this.aiPass(u, mate);
      }
    } else {
      this.charge = 0;
    }
  };

  Game.prototype.nearestForwardMate = function (u) {
    let best = null, bd = Infinity;
    const a = u.attackDir();
    for (const s of this.players) {
      if (s.team !== u.team || s === u || s.isGoalie) continue;
      const d = U.dist(u.x, u.y, s.x, s.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  };

  Game.prototype.userShoot = function (u, power) {
    // aim toward opponent net, nudged by current movement direction
    const gx = u.oppGoalX(), gy = R.centerY;
    let ax = gx - u.x, ay = gy - u.y;
    const mv = this.input.moveVec();
    if (mv.x !== 0 || mv.y !== 0) {
      const m = U.norm(mv.x, mv.y);
      ax += m.x * 18; ay += m.y * 18;   // let the player steer the shot
    }
    // small aim scatter inversely related to power precision
    const speed = U.lerp(70, 155, power);
    this.puck.shoot(ax, ay, speed, u);
    this.audio.shot(power);
    this.spray(u.x, u.y, 5);
    this.shake = 0.08 * power;
  };

  Game.prototype.aiShoot = function (sk) {
    const gx = sk.oppGoalX(), gy = R.centerY;
    // aim at a corner away from goalie
    const g = this.goalieOf(1 - sk.team);
    let ty = gy;
    if (g) ty = g.y > gy ? gy - 2.2 : gy + 2.2;
    const power = U.rand(0.6, 1);
    this.puck.shoot(gx - sk.x, ty - sk.y, U.lerp(80, 150, power), sk);
    this.audio.shot(power);
    this.spray(sk.x, sk.y, 4);
  };

  Game.prototype.aiPass = function (from, to) {
    const lead = 0.22;
    const tx = to.x + to.vx * lead, ty = to.y + to.vy * lead;
    this.puck.shoot(tx - from.x, ty - from.y, 62, from);
    this.audio.stickHit();
    // if the passer is the user, help by switching to receiver shortly
    if (from === this.userSkater) {
      this._pendingSwitch = to;
      this.switchCooldown = 0.15;
    }
  };

  Game.prototype.attemptCheck = function (checker, target) {
    if (target.stun > 0) return;
    checker._checkCd = 0.4;
    // knock target back along the checker's momentum
    const dir = U.norm(target.x - checker.x, target.y - checker.y);
    const force = 22 + checker.speed() * 0.6;
    target.vx = dir.x * force; target.vy = dir.y * force;
    target.stun = 0.7;
    // free the puck if target had it
    if (this.puck.owner === target) {
      this.puck.owner = null;
      this.puck.vx = dir.x * 14; this.puck.vy = dir.y * 14;
      this.puck.cooldown = 0.15;
    }
    this.audio.check();
    this.spray(target.x, target.y, 10);
    this.shake = 0.12;
  };

  Game.prototype.goalieOf = function (team) {
    return this.players.find((s) => s.team === team && s.isGoalie);
  };

  // ---- goalie saves: puck colliding with goalie body ----
  Game.prototype.handleGoalieSaves = function () {
    const puck = this.puck;
    if (puck.owner) return;
    for (let t = 0; t < 2; t++) {
      const g = this.goalieOf(t);
      if (!g) continue;
      const d = U.dist(g.x, g.y, puck.x, puck.y);
      if (d < g.r + C.PUCK_R + 0.4) {
        // save! deflect the puck away from the net toward the corner
        const outDir = U.norm(puck.x - g.ownGoalX(), (puck.y - R.centerY) + U.rand(-3, 3));
        const sp = Math.max(20, puck.speed() * 0.5);
        puck.vx = outDir.x * sp;
        puck.vy = outDir.y * sp;
        puck.lastTouch = g;
        puck.cooldown = 0.12;
        this.audio.save();
        this.spray(puck.x, puck.y, 6);
        // small chance goalie freezes it -> faceoff (only if slow)
        if (puck.speed() < 26 && Math.random() < 0.25) {
          this.freezePuck(t);
        }
        return;
      }
    }
  };

  Game.prototype.freezePuck = function (team) {
    this.audio.whistle();
    // nearest end-zone faceoff dot to the goalie
    const g = this.goalieOf(team);
    let best = R.ezDots[0], bd = Infinity;
    for (const d of R.ezDots) {
      const dd = U.dist2(d.x, d.y, g.x, g.y);
      if (dd < bd) { bd = dd; best = d; }
    }
    this._nextDot = best;
    this.message = 'Whistle — Faceoff';
    this.subMessage = '';
    this.messageTimer = 1.2;
    const self = this;
    this._interTimer = 1.0;
    this.state = STATE.INTERMISSION;
    this._resumeCenter = false;
  };

  // ---- goal detection ----
  Game.prototype.checkGoal = function () {
    const puck = this.puck;
    if (puck.owner) return;
    // Team 0 attacks right (scores in right net at goalLineR); team 1 scores left.
    // Right net
    if (puck.x >= R.goalLineR - 0.2 && Math.abs(puck.y - R.centerY) < R.goalHalfWidth &&
        puck.vx > 0) {
      this.scoreGoal(0);
    } else if (puck.x <= R.goalLineL + 0.2 && Math.abs(puck.y - R.centerY) < R.goalHalfWidth &&
        puck.vx < 0) {
      this.scoreGoal(1);
    } else {
      // hit the post? (near goal line, just outside mouth, moving in)
      if (puck.x >= R.goalLineR - 0.6 && puck.vx > 0 &&
          Math.abs(Math.abs(puck.y - R.centerY) - R.goalHalfWidth) < 0.6) {
        // let physics carry; play a post ping occasionally
      }
    }
  };

  Game.prototype.scoreGoal = function (team) {
    this.score[team]++;
    this.lastGoalTeam = team;
    this.state = STATE.GOAL;
    this._goalTimer = 3.0;
    this.flash = 1.2;
    this.shake = 0.5;
    this.audio.goalHorn();
    const scorer = this.puck.lastTouch;
    const t = this.teamObj(team);
    this.message = 'GOAL!';
    this.subMessage = t.city + ' ' + t.name +
      (scorer ? '  •  #' + scorer.jersey : '');
    this.messageTimer = 3.0;
    // burst of particles at the net
    const nx = team === 0 ? R.goalLineR : R.goalLineL;
    for (let i = 0; i < 40; i++) {
      const ang = U.rand(0, Math.PI * 2);
      const sp = U.rand(6, 30);
      this.particles.push(new Render.Particle(nx, R.centerY,
        Math.cos(ang) * sp, Math.sin(ang) * sp, U.rand(0.4, 1.1),
        i % 2 ? t.primary : t.secondary, U.rand(0.4, 0.9)));
    }
  };

  Game.prototype.afterGoal = function () {
    // next faceoff at center
    this._nextDot = R.centerDot;
    this.startFaceoff(true);
  };

  Game.prototype.endPeriod = function () {
    this.audio.whistle();
    if (this.period >= 3) {
      // regulation over
      if (this.score[0] === this.score[1]) {
        // sudden-death OT
        this.period = 4;
        this.clock = 60;
        this.message = 'OVERTIME';
        this.subMessage = 'Next goal wins';
        this.messageTimer = 2.5;
        this._interTimer = 2.5;
        this.state = STATE.INTERMISSION;
        return;
      }
      this.state = STATE.GAMEOVER;
      const w = this.score[0] > this.score[1] ? 0 : 1;
      const t = this.teamObj(w);
      this.message = 'FINAL';
      this.subMessage = t.city + ' ' + t.name + ' win ' +
        Math.max(this.score[0], this.score[1]) + '–' + Math.min(this.score[0], this.score[1]);
      this.audio.crowdRoar(2.5);
      return;
    }
    this.period++;
    this.clock = this.periodLength;
    this.message = 'End of Period ' + (this.period - 1);
    this.subMessage = 'Period ' + this.period + ' starting…';
    this.messageTimer = 2.5;
    this._interTimer = 2.5;
    this.state = STATE.INTERMISSION;
  };

  // OT sudden death check handled by scoreGoal + state; in OT a goal ends it
  const _scoreGoal = Game.prototype.scoreGoal;
  Game.prototype.scoreGoal = function (team) {
    _scoreGoal.call(this, team);
    if (this.period >= 4) {
      // sudden death: end game after celebration
      this._otWinner = team;
      this._goalTimer = 3.0;
    }
  };
  const _afterGoal = Game.prototype.afterGoal;
  Game.prototype.afterGoal = function () {
    if (this.period >= 4 && this._otWinner != null) {
      this.state = STATE.GAMEOVER;
      const t = this.teamObj(this._otWinner);
      this.message = 'OVERTIME WINNER';
      this.subMessage = t.city + ' ' + t.name + ' win it!';
      return;
    }
    _afterGoal.call(this);
  };

  // ---- effects ----
  Game.prototype.spray = function (x, y, n) {
    for (let i = 0; i < n; i++) {
      const ang = U.rand(0, Math.PI * 2);
      const sp = U.rand(3, 14);
      this.particles.push(new Render.Particle(x, y,
        Math.cos(ang) * sp, Math.sin(ang) * sp, U.rand(0.2, 0.5), 'rgba(255,255,255,0.9)', U.rand(0.3, 0.6)));
    }
  };

  Game.prototype.onBoards = function () { this.audio.boards(); };

  // apply a pending post-pass switch once puck is free again
  Game.prototype._applyPendingSwitch = function () {
    if (this._pendingSwitch && this.puck.owner === this._pendingSwitch) {
      this.userSkater = this._pendingSwitch;
      this._pendingSwitch = null;
    }
  };

  NHL.Game = Game;
  NHL.STATE = STATE;
})(window.NHL = window.NHL || {});
