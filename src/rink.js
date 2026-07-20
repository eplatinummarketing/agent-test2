/* rink.js — NHL rink geometry (in feet) and rendering.
 * World coordinates are in feet: playing surface is 200 x 85, origin at the
 * top-left corner of the ice. A Camera maps feet -> canvas pixels. */
(function (NHL) {
  'use strict';

  const R = {
    W: 200, H: 85,
    cornerR: 28,
    centerX: 100, centerY: 42.5,
    goalLineL: 11, goalLineR: 189,
    blueL: 75, blueR: 125,
    goalHalfWidth: 3,        // goal mouth is 6 ft
    creaseR: 6,
    creaseHalfW: 4,
    faceoffR: 15,
    // end-zone faceoff spots
    ezDots: [
      { x: 31, y: 20.5 }, { x: 31, y: 64.5 },
      { x: 169, y: 20.5 }, { x: 169, y: 64.5 }
    ],
    // neutral-zone faceoff spots
    nzDots: [
      { x: 80, y: 20.5 }, { x: 80, y: 64.5 },
      { x: 120, y: 20.5 }, { x: 120, y: 64.5 }
    ],
    centerDot: { x: 100, y: 42.5 }
  };

  // Clamp a point to inside the rounded-rectangle boards (approx).
  R.clampToRink = function (x, y, pad) {
    pad = pad || 0;
    const r = R.cornerR;
    const minX = pad, maxX = R.W - pad, minY = pad, maxY = R.H - pad;
    x = NHL.U.clamp(x, minX, maxX);
    y = NHL.U.clamp(y, minY, maxY);
    // rounded corners
    const corners = [
      { cx: r, cy: r, sx: -1, sy: -1 },
      { cx: R.W - r, cy: r, sx: 1, sy: -1 },
      { cx: r, cy: R.H - r, sx: -1, sy: 1 },
      { cx: R.W - r, cy: R.H - r, sx: 1, sy: 1 }
    ];
    for (const c of corners) {
      if ((x - c.cx) * c.sx > 0 && (y - c.cy) * c.sy > 0) {
        const dx = x - c.cx, dy = y - c.cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const rr = r - pad;
        if (d > rr) {
          x = c.cx + dx / d * rr;
          y = c.cy + dy / d * rr;
        }
      }
    }
    return { x: x, y: y };
  };

  // ---- Camera: feet -> pixels ----
  function Camera(scale, ox, oy) {
    this.scale = scale; this.ox = ox; this.oy = oy;
  }
  Camera.prototype.px = function (fx) { return this.ox + fx * this.scale; };
  Camera.prototype.py = function (fy) { return this.oy + fy * this.scale; };
  Camera.prototype.s = function (f) { return f * this.scale; };
  R.Camera = Camera;

  // Trace the rounded-rect boards path (in pixels) on ctx.
  function boardsPath(ctx, cam) {
    const r = cam.s(R.cornerR);
    const x = cam.px(0), y = cam.py(0), w = cam.s(R.W), h = cam.s(R.H);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  R.boardsPath = boardsPath;

  function faceoffCircle(ctx, cam, x, y) {
    ctx.beginPath();
    ctx.arc(cam.px(x), cam.py(y), cam.s(R.faceoffR), 0, Math.PI * 2);
    ctx.stroke();
  }

  function faceoffDot(ctx, cam, x, y, big) {
    ctx.beginPath();
    ctx.arc(cam.px(x), cam.py(y), cam.s(big ? 1.2 : 1), 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw goal crease + net at a goal line. side = 'L' | 'R'.
  function drawGoal(ctx, cam, side, homeColor, awayColor) {
    const gx = side === 'L' ? R.goalLineL : R.goalLineR;
    const cy = R.centerY;
    const dir = side === 'L' ? 1 : -1; // crease opens toward center
    // crease fill (light blue)
    ctx.fillStyle = 'rgba(90,150,235,0.45)';
    ctx.strokeStyle = '#c8102e';
    ctx.lineWidth = Math.max(1, cam.s(0.35));
    ctx.beginPath();
    const cxPix = cam.px(gx);
    const cyPix = cam.py(cy);
    const rr = cam.s(R.creaseR);
    const startA = side === 'L' ? -Math.PI / 2 : Math.PI / 2;
    const endA = side === 'L' ? Math.PI / 2 : Math.PI * 1.5;
    ctx.moveTo(cxPix, cam.py(cy - R.creaseHalfW));
    ctx.arc(cxPix, cyPix, rr, side === 'L' ? -Math.PI / 2 : Math.PI / 2,
            side === 'L' ? Math.PI / 2 : Math.PI * 1.5, false);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // net (behind goal line, away from center)
    const netDepth = cam.s(3.5);
    const mouthTop = cam.py(cy - R.goalHalfWidth);
    const mouthBot = cam.py(cy + R.goalHalfWidth);
    const backX = cxPix - dir * netDepth;
    ctx.save();
    // net mesh
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cxPix, mouthTop);
    ctx.lineTo(backX, mouthTop + dir * 0); // keep rectangular-ish
    ctx.lineTo(backX, mouthBot);
    ctx.lineTo(cxPix, mouthBot);
    ctx.closePath();
    ctx.fill();
    // mesh lines
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      const yy = mouthTop + (mouthBot - mouthTop) * (i / 4);
      ctx.moveTo(cxPix, yy); ctx.lineTo(backX, yy);
    }
    for (let i = 1; i < 3; i++) {
      const xx = cxPix - dir * netDepth * (i / 3);
      ctx.moveTo(xx, mouthTop); ctx.lineTo(xx, mouthBot);
    }
    ctx.stroke();
    // red posts + crossbar frame
    ctx.strokeStyle = '#e21b2c';
    ctx.lineWidth = Math.max(2, cam.s(0.5));
    ctx.beginPath();
    ctx.moveTo(cxPix, mouthTop); ctx.lineTo(cxPix, mouthBot);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw the full rink. Requires cam + team objects for center-ice branding.
   */
  R.draw = function (ctx, cam, homeTeam, awayTeam) {
    ctx.save();

    // ---- ice surface (clipped to boards) ----
    boardsPath(ctx, cam);
    ctx.save();
    ctx.clip();
    // subtle ice gradient
    const g = ctx.createLinearGradient(cam.px(0), cam.py(0), cam.px(0), cam.py(R.H));
    g.addColorStop(0, '#eef4fb');
    g.addColorStop(0.5, '#e2ecf7');
    g.addColorStop(1, '#eef4fb');
    ctx.fillStyle = g;
    ctx.fillRect(cam.px(0), cam.py(0), cam.s(R.W), cam.s(R.H));

    // faint ice texture streaks
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < R.H; i += 6) {
      ctx.beginPath();
      ctx.moveTo(cam.px(0), cam.py(i) + 0.5);
      ctx.lineTo(cam.px(R.W), cam.py(i) + 0.5);
      ctx.stroke();
    }

    // ---- center-ice logo (home team) ----
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = homeTeam.primary;
    ctx.beginPath();
    ctx.arc(cam.px(R.centerX), cam.py(R.centerY), cam.s(13), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = homeTeam.secondary;
    ctx.font = 'bold ' + cam.s(9) + 'px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(homeTeam.abbr, cam.px(R.centerX), cam.py(R.centerY));
    ctx.restore();

    // ---- goal creases + nets ----
    drawGoal(ctx, cam, 'L', homeTeam.primary, awayTeam.primary);
    drawGoal(ctx, cam, 'R', awayTeam.primary, homeTeam.primary);

    // ---- lines ----
    // goal lines (thin red, clipped so they don't cross crease oddly)
    ctx.strokeStyle = '#e21b2c';
    ctx.lineWidth = Math.max(1, cam.s(0.35));
    [R.goalLineL, R.goalLineR].forEach(function (gx) {
      ctx.beginPath();
      ctx.moveTo(cam.px(gx), cam.py(0));
      ctx.lineTo(cam.px(gx), cam.py(R.H));
      ctx.stroke();
    });

    // blue lines
    ctx.strokeStyle = '#1f4fb0';
    ctx.lineWidth = cam.s(1.0);
    [R.blueL, R.blueR].forEach(function (bx) {
      ctx.beginPath();
      ctx.moveTo(cam.px(bx), cam.py(0));
      ctx.lineTo(cam.px(bx), cam.py(R.H));
      ctx.stroke();
    });

    // center red line (dashed thick)
    ctx.strokeStyle = '#e21b2c';
    ctx.lineWidth = cam.s(1.0);
    ctx.setLineDash([cam.s(2), cam.s(1.4)]);
    ctx.beginPath();
    ctx.moveTo(cam.px(R.centerX), cam.py(0));
    ctx.lineTo(cam.px(R.centerX), cam.py(R.H));
    ctx.stroke();
    ctx.setLineDash([]);

    // ---- faceoff markings ----
    ctx.strokeStyle = '#c8102e';
    ctx.fillStyle = '#c8102e';
    ctx.lineWidth = Math.max(1, cam.s(0.3));
    // center circle (blue)
    ctx.strokeStyle = '#1f4fb0';
    ctx.beginPath();
    ctx.arc(cam.px(R.centerX), cam.py(R.centerY), cam.s(R.faceoffR), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#1f4fb0';
    faceoffDot(ctx, cam, R.centerDot.x, R.centerDot.y, true);

    // end-zone circles (red)
    ctx.strokeStyle = '#c8102e';
    ctx.fillStyle = '#c8102e';
    R.ezDots.forEach(function (d) {
      faceoffCircle(ctx, cam, d.x, d.y);
      faceoffDot(ctx, cam, d.x, d.y, true);
    });
    // neutral-zone dots
    R.nzDots.forEach(function (d) { faceoffDot(ctx, cam, d.x, d.y, false); });

    ctx.restore(); // end clip
    ctx.restore();
  };

  // Draw boards + arena surround (called after ice).
  R.drawBoards = function (ctx, cam) {
    boardsPath(ctx, cam);
    ctx.strokeStyle = '#dfe3ea';
    ctx.lineWidth = Math.max(3, cam.s(0.9));
    ctx.stroke();
    // inner board shadow
    ctx.save();
    boardsPath(ctx, cam);
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = cam.s(1.6);
    boardsPath(ctx, cam);
    ctx.stroke();
    ctx.restore();
  };

  NHL.R = R;
})(window.NHL = window.NHL || {});
