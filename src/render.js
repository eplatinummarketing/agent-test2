/* render.js — draw skaters, the puck, and small visual effects. */
(function (NHL) {
  'use strict';
  const U = NHL.U;

  const Render = {};

  // subtle drop shadow under a world entity
  function shadow(ctx, cam, x, y, r) {
    ctx.beginPath();
    ctx.ellipse(cam.px(x), cam.py(y) + cam.s(0.6), cam.s(r * 1.05), cam.s(r * 0.6), 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();
  }

  Render.skater = function (ctx, cam, sk, team, isUserControlled, isCarrier) {
    const x = cam.px(sk.x), y = cam.py(sk.y);
    const bodyR = cam.s(sk.r + 0.2);

    shadow(ctx, cam, sk.x, sk.y, sk.r + 0.3);

    // control ring under the user's active skater
    if (isUserControlled) {
      ctx.beginPath();
      ctx.arc(x, y, bodyR + cam.s(1.2), 0, Math.PI * 2);
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = Math.max(2, cam.s(0.5));
      ctx.stroke();
    } else if (isCarrier) {
      ctx.beginPath();
      ctx.arc(x, y, bodyR + cam.s(0.9), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = Math.max(1, cam.s(0.3));
      ctx.stroke();
    }

    // stick (drawn behind body, pointing along heading)
    const hx = Math.cos(sk.heading), hy = Math.sin(sk.heading);
    const px = -hy, py = hx; // perpendicular
    ctx.strokeStyle = '#3a2a17';
    ctx.lineWidth = Math.max(1.5, cam.s(0.35));
    ctx.beginPath();
    const handX = x + (hx * 0.2 - px * 0.6) * cam.s(1);
    const handY = y + (hy * 0.2 - py * 0.6) * cam.s(1);
    const bladeX = x + (hx * 3.2 + px * 1.2) * cam.s(1);
    const bladeY = y + (hy * 3.2 + py * 1.2) * cam.s(1);
    ctx.moveTo(handX, handY);
    ctx.lineTo(bladeX, bladeY);
    ctx.stroke();

    // body (jersey)
    ctx.beginPath();
    ctx.arc(x, y, bodyR, 0, Math.PI * 2);
    ctx.fillStyle = team.primary;
    ctx.fill();
    ctx.lineWidth = Math.max(1, cam.s(0.28));
    ctx.strokeStyle = team.secondary;
    ctx.stroke();

    // shoulder / heading wedge in secondary color
    ctx.beginPath();
    ctx.moveTo(x + hx * bodyR, y + hy * bodyR);
    ctx.arc(x, y, bodyR, sk.heading - 0.6, sk.heading + 0.6);
    ctx.closePath();
    ctx.fillStyle = team.secondary;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;

    // helmet
    ctx.beginPath();
    ctx.arc(x + hx * cam.s(0.3), y + hy * cam.s(0.3), cam.s(0.85), 0, Math.PI * 2);
    ctx.fillStyle = sk.isGoalie ? team.accent : team.secondary;
    ctx.fill();

    // jersey number
    ctx.fillStyle = team.accent;
    ctx.font = 'bold ' + cam.s(1.5) + 'px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(sk.jersey), x, y);

    // stun stars
    if (sk.stun > 0) {
      ctx.fillStyle = '#ffe14d';
      ctx.font = cam.s(2) + 'px Arial';
      ctx.fillText('✦', x, y - bodyR - cam.s(1.5));
    }
  };

  Render.puck = function (ctx, cam, puck) {
    const lift = puck.height * 2;
    const x = cam.px(puck.x), y = cam.py(puck.y) - cam.s(lift);
    // shadow grows with height
    ctx.beginPath();
    ctx.ellipse(cam.px(puck.x), cam.py(puck.y) + cam.s(0.4), cam.s(0.7 + lift * 0.1), cam.s(0.4), 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();
    // puck
    ctx.beginPath();
    ctx.arc(x, y, cam.s(0.7), 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 1;
    ctx.stroke();
    // motion streak
    const sp = puck.speed();
    if (sp > 20 && !puck.owner) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = cam.s(0.5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - puck.vx / sp * cam.s(2.5), y - puck.vy / sp * cam.s(2.5));
      ctx.stroke();
    }
  };

  // Ice spray particle
  function Particle(x, y, vx, vy, life, col, size) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.max = life; this.col = col; this.size = size;
  }
  Render.Particle = Particle;

  Render.updateParticles = function (list, dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.9; p.vy *= 0.9;
      p.life -= dt;
      if (p.life <= 0) list.splice(i, 1);
    }
  };

  Render.drawParticles = function (ctx, cam, list) {
    for (const p of list) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(cam.px(p.x), cam.py(p.y), cam.s(p.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  NHL.Render = Render;
})(window.NHL = window.NHL || {});
