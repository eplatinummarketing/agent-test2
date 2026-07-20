/* hud.js — rendering orchestration for the Game: rink, entities, HUD,
 * scoreboard, and full-screen overlays (countdown, goal, pause, final). */
(function (NHL) {
  'use strict';
  const U = NHL.U, R = NHL.R, Render = NHL.Render, STATE = NHL.STATE;
  const Game = NHL.Game;

  Game.prototype.render = function () {
    const ctx = this.ctx, cam = this.cam;

    // arena backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, this.viewH);
    bg.addColorStop(0, '#0b1220');
    bg.addColorStop(1, '#131c2e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    this.drawStands(ctx);

    // camera shake
    ctx.save();
    if (this.shake > 0) {
      const s = this.shake * 8;
      ctx.translate(U.rand(-s, s), U.rand(-s, s));
    }

    // rink + boards
    R.draw(ctx, cam, this.home, this.away);
    R.drawBoards(ctx, cam);

    // particles under players
    Render.drawParticles(ctx, cam, this.particles);

    // players (draw goalies first, then skaters, carrier last-ish)
    const owner = this.puck.owner;
    const sorted = this.players.slice().sort((a, b) => a.y - b.y);
    for (const sk of sorted) {
      Render.skater(ctx, cam, sk, this.teamObj(sk.team),
        sk === this.userSkater, sk === owner);
    }

    // puck
    Render.puck(ctx, cam, this.puck);

    // shot charge indicator over the user's skater
    if (this.charge > 0.05 && this.userSkater) {
      this.drawChargeBar(ctx, cam, this.userSkater);
    }

    ctx.restore();

    // goal flash
    if (this.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (this.flash * 0.4) + ')';
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }

    // HUD + overlays
    this.drawScoreboard(ctx);
    this.drawControlsHint(ctx);
    this.drawOverlays(ctx);
  };

  // faux crowd behind the boards
  Game.prototype.drawStands = function (ctx) {
    const cam = this.cam;
    const top = cam.py(0) - cam.s(6);
    const bot = cam.py(R.H) + cam.s(6);
    const left = cam.px(0) - cam.s(6);
    const right = cam.px(R.W) + cam.s(6);
    ctx.save();
    ctx.fillStyle = '#0e1626';
    ctx.fillRect(left - 40, top - 40, (right - left) + 80, (bot - top) + 80);
    // speckled crowd
    const cols = ['#20304d', '#2a3a58', '#38455f', '#42506b'];
    const seed = 12345;
    let r = seed;
    function rnd() { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; }
    for (let i = 0; i < 900; i++) {
      const edge = i % 4;
      let x, y;
      if (edge === 0) { x = left - 40 + rnd() * ((right - left) + 80); y = top - 38 + rnd() * 34; }
      else if (edge === 1) { x = left - 40 + rnd() * ((right - left) + 80); y = bot + 4 + rnd() * 34; }
      else if (edge === 2) { x = left - 38 + rnd() * 34; y = top - 40 + rnd() * ((bot - top) + 80); }
      else { x = right + 4 + rnd() * 34; y = top - 40 + rnd() * ((bot - top) + 80); }
      ctx.fillStyle = cols[(i * 7) % cols.length];
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.restore();
  };

  Game.prototype.drawChargeBar = function (ctx, cam, sk) {
    const x = cam.px(sk.x), y = cam.py(sk.y) - cam.s(4.5);
    const w = cam.s(6), h = cam.s(1.1);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - w / 2, y, w, h);
    const c = this.charge;
    const col = c > 0.8 ? '#ff4d4d' : (c > 0.5 ? '#ffd24d' : '#7CFC9A');
    ctx.fillStyle = col;
    ctx.fillRect(x - w / 2, y, w * c, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - w / 2, y, w, h);
  };

  // ---- Scoreboard (top center) ----
  Game.prototype.drawScoreboard = function (ctx) {
    if (this.state === STATE.MENU) return;
    const cx = this.viewW / 2;
    const w = 340, h = 46, y = 10;
    const x = cx - w / 2;

    // panel
    roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = 'rgba(10,16,28,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1; ctx.stroke();

    // home block
    ctx.fillStyle = this.home.primary;
    roundRect(ctx, x + 6, y + 6, 74, h - 12, 5); ctx.fill();
    ctx.fillStyle = this.home.secondary;
    ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.home.abbr, x + 6 + 37, y + h / 2);

    // away block
    ctx.fillStyle = this.away.primary;
    roundRect(ctx, x + w - 80, y + 6, 74, h - 12, 5); ctx.fill();
    ctx.fillStyle = this.away.secondary;
    ctx.fillText(this.away.abbr, x + w - 80 + 37, y + h / 2);

    // scores
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px "Arial Black", Arial';
    ctx.fillText(String(this.score[0]), x + 100, y + h / 2);
    ctx.fillText(String(this.score[1]), x + w - 100, y + h / 2);

    // clock + period
    ctx.fillStyle = '#ffd24d';
    ctx.font = 'bold 18px "Consolas", monospace';
    ctx.fillText(U.clock(this.clock), cx, y + 17);
    ctx.fillStyle = '#9fb0c8';
    ctx.font = 'bold 11px Arial';
    const perLabel = this.period >= 4 ? 'OT' : ('P' + this.period);
    ctx.fillText(perLabel, cx, y + 34);

    // user team indicator
    ctx.fillStyle = '#7CFC9A';
    ctx.font = '10px Arial';
    ctx.textAlign = this.userTeam === 0 ? 'left' : 'right';
    const ux = this.userTeam === 0 ? x + 6 : x + w - 6;
    ctx.fillText('YOU', ux, y + h + 9);
    ctx.textAlign = 'center';
  };

  Game.prototype.drawControlsHint = function (ctx) {
    if (this.state !== STATE.PLAY && this.state !== STATE.COUNTDOWN) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('WASD/Arrows move   •   SPACE hold to shoot   •   SHIFT pass   •   C check   •   L switch   •   P pause',
      this.viewW / 2, this.viewH - 10);
    ctx.restore();
  };

  // ---- Overlays ----
  Game.prototype.drawOverlays = function (ctx) {
    const cx = this.viewW / 2, cy = this.viewH / 2;

    if (this.state === STATE.COUNTDOWN) {
      const n = Math.ceil(this.countdown);
      centerText(ctx, cx, cy, n > 0 ? String(n) : 'GO!', 90, '#ffffff', 'rgba(0,0,0,0.35)');
      centerText(ctx, cx, cy + 62, 'FACE-OFF', 20, '#9fb0c8');
    }

    if (this.state === STATE.GOAL && this.messageTimer > 0) {
      dim(ctx, this.viewW, this.viewH, 0.25);
      const scale = 1 + Math.max(0, (this.messageTimer - 2.6)) * 1.5;
      ctx.save();
      ctx.translate(cx, cy - 20);
      ctx.scale(scale, scale);
      centerText(ctx, 0, 0, 'GOAL!', 74, this.teamObj(this.lastGoalTeam).accent === '#FFFFFF'
        ? this.teamObj(this.lastGoalTeam).secondary : this.teamObj(this.lastGoalTeam).accent,
        'rgba(0,0,0,0.4)');
      ctx.restore();
      centerText(ctx, cx, cy + 40, this.subMessage, 22, '#ffffff');
    }

    if (this.state === STATE.INTERMISSION && this.messageTimer > 0) {
      dim(ctx, this.viewW, this.viewH, 0.35);
      centerText(ctx, cx, cy - 12, this.message, 40, '#ffffff');
      centerText(ctx, cx, cy + 26, this.subMessage, 20, '#9fb0c8');
    }

    if (this.state === STATE.PAUSED) {
      dim(ctx, this.viewW, this.viewH, 0.55);
      centerText(ctx, cx, cy - 10, 'PAUSED', 48, '#ffffff');
      centerText(ctx, cx, cy + 34, 'Press P or Esc to resume', 18, '#9fb0c8');
    }

    if (this.state === STATE.GAMEOVER) {
      dim(ctx, this.viewW, this.viewH, 0.6);
      centerText(ctx, cx, cy - 40, this.message, 34, '#ffd24d');
      centerText(ctx, cx, cy + 6, this.subMessage, 26, '#ffffff');
      centerText(ctx, cx, cy + 44,
        this.home.abbr + ' ' + this.score[0] + '   –   ' + this.score[1] + ' ' + this.away.abbr,
        22, '#9fb0c8');
      centerText(ctx, cx, cy + 96, 'Press ENTER for a new game', 18, '#7CFC9A');
      if (this.input.pressed('start')) { NHL.returnToMenu && NHL.returnToMenu(); }
    }
  };

  // ---- small canvas helpers ----
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function centerText(ctx, x, y, text, size, color, shadowColor) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + size + 'px "Arial Black", Arial, sans-serif';
    if (shadowColor) {
      ctx.fillStyle = shadowColor;
      ctx.fillText(text, x + 3, y + 3);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  function dim(ctx, w, h, a) {
    ctx.fillStyle = 'rgba(4,8,16,' + a + ')';
    ctx.fillRect(0, 0, w, h);
  }

  NHL.roundRect = roundRect;
})(window.NHL = window.NHL || {});
