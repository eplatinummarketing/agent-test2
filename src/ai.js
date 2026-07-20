/* ai.js — decision-making for CPU skaters and goalies.
 * Each function returns a desired movement vector {x,y}; actions like shooting
 * and passing are performed by calling back into the game. */
(function (NHL) {
  'use strict';
  const U = NHL.U, R = NHL.R, C = NHL.C;

  // Per-role formation configuration (team 0 frame; mirrored for team 1).
  const ROLE = {
    C:  { lane: 42.5, atk: 13,  def: -6 },
    LW: { lane: 22,   atk: 11,  def: -4 },
    RW: { lane: 63,   atk: 11,  def: -4 },
    LD: { lane: 31,   atk: -16, def: -34 },
    RD: { lane: 54,   atk: -16, def: -34 }
  };

  function nearest(list, x, y, filter) {
    let best = null, bd = Infinity;
    for (const s of list) {
      if (filter && !filter(s)) continue;
      const d = U.dist2(s.x, s.y, x, y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  // Is the straight lane from (ax,ay)->(bx,by) blocked by an opponent of `team`?
  function laneBlocked(ax, ay, bx, by, players, team, pad) {
    pad = pad || 2.2;
    const dx = bx - ax, dy = by - ay;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-3) return false;
    const ux = dx / len, uy = dy / len;
    for (const p of players) {
      if (p.team === team || p.isGoalie) continue;
      const t = (p.x - ax) * ux + (p.y - ay) * uy;
      if (t < 1 || t > len - 0.5) continue;
      const px = ax + ux * t, py = ay + uy * t;
      if (U.dist2(px, py, p.x, p.y) < pad * pad) return true;
    }
    return false;
  }

  function formationSpot(sk, puck, hasPuck) {
    const cfg = ROLE[sk.role] || ROLE.C;
    const a = sk.attackDir();
    const off = hasPuck ? cfg.atk : cfg.def;
    let tx = puck.x + a * off;
    // keep inside sensible bounds, never behind own net wall
    tx = U.clamp(tx, 14, R.W - 14);
    // forwards collapse toward the puck's vertical position a bit
    const laneBlend = (sk.role === 'LD' || sk.role === 'RD') ? 0.2 : 0.4;
    let ty = U.lerp(cfg.lane, puck.y, laneBlend);
    ty = U.clamp(ty, 8, R.H - 8);
    return { x: tx, y: ty };
  }

  function steerTo(sk, tx, ty, deadzone) {
    const dx = tx - sk.x, dy = ty - sk.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < (deadzone || 1.2)) return { x: 0, y: 0 };
    return { x: dx, y: dy };
  }

  // ---- Goalie ----
  function goalieControl(g, game) {
    const puck = game.puck;
    const goalX = g.ownGoalX();
    const center = R.centerY;
    // depth out of net scales with how far the puck is (cut the angle)
    const distToPuck = U.dist(g.x, g.y, goalX, center);
    let come = U.clamp(4.5 - (puck.x - goalX) * g.attackDir() * 0.03, 1.5, 4.5);
    if (g.attackDir() * (puck.x - goalX) < 0) come = 1.2; // puck behind net: hug line
    const tx = goalX + g.attackDir() * come;
    // follow puck vertically but stay in the mouth
    let ty = U.clamp(center + (puck.y - center) * 0.7, center - 3.4, center + 3.4);
    // if a shot is incoming and close, square up hard to puck line
    const sp = puck.speed();
    if (!puck.owner && sp > 30 && g.attackDir() * (puck.vx) < 0) {
      // predict crossing y at goal line
      const t = (goalX - puck.x) / (puck.vx || 0.01);
      if (t > 0 && t < 0.6) {
        const cy = puck.y + puck.vy * t;
        ty = U.clamp(cy, center - 3.6, center + 3.6);
      }
    }
    return steerTo(g, tx, ty, 0.4);
  }

  // ---- Carrier (AI has the puck) ----
  function carrierControl(sk, game) {
    const puck = game.puck;
    const oppGoalX = sk.oppGoalX();
    const a = sk.attackDir();
    const goalY = R.centerY;
    const players = game.players;
    const distGoal = U.dist(sk.x, sk.y, oppGoalX, goalY);

    // nearest opponent (skater) pressuring
    const opp = nearest(players, sk.x, sk.y, function (p) {
      return p.team !== sk.team && !p.isGoalie;
    });
    const pressd = opp ? U.dist(sk.x, sk.y, opp.x, opp.y) : 99;

    // SHOOT: in range, decent angle, lane not fully blocked
    const inRange = (a > 0 ? sk.x > R.centerX + 8 : sk.x < R.centerX - 8) && distGoal < 52;
    const angleOK = Math.abs(sk.y - goalY) < 30;
    if (inRange && angleOK) {
      const blocked = laneBlocked(sk.x, sk.y, oppGoalX, goalY, players, sk.team, 2.0);
      const shootUrge = pressd < 6 || distGoal < 34 || (!blocked && Math.random() < 0.03);
      if (!blocked && shootUrge) {
        game.aiShoot(sk);
        return { x: a, y: (goalY - sk.y) * 0.02 };
      }
    }

    // PASS: pressured and an open teammate is ahead
    if (pressd < 5.5) {
      const mate = bestPassTarget(sk, game);
      if (mate) { game.aiPass(sk, mate); return steerTo(sk, mate.x, mate.y, 0); }
    }

    // Otherwise drive to the net, steering around the nearest opponent in the lane
    let tx = oppGoalX - a * 6, ty = goalY;
    // approach from a shooting angle, not dead center
    ty = goalY + (sk.y < goalY ? -6 : 6);
    let desired = steerTo(sk, tx, ty, 0.5);
    if (opp && pressd < 8) {
      // add avoidance perpendicular to opponent
      const away = U.norm(sk.x - opp.x, sk.y - opp.y);
      desired.x += away.x * 6;
      desired.y += away.y * 6;
    }
    return desired;
  }

  function bestPassTarget(sk, game) {
    const players = game.players;
    let best = null, bestScore = -Infinity;
    const a = sk.attackDir();
    for (const p of players) {
      if (p.team !== sk.team || p === sk || p.isGoalie) continue;
      const ahead = a * (p.x - sk.x); // prefer teammates further toward opp goal
      const d = U.dist(sk.x, sk.y, p.x, p.y);
      if (d < 6 || d > 90) continue;
      if (laneBlocked(sk.x, sk.y, p.x, p.y, players, sk.team, 2.0)) continue;
      // openness: distance from nearest opponent
      const opp = nearest(players, p.x, p.y, function (q) { return q.team !== sk.team && !q.isGoalie; });
      const open = opp ? U.dist(p.x, p.y, opp.x, opp.y) : 20;
      const score = ahead * 0.6 + open * 1.4 - d * 0.05;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best;
  }

  // ---- Main entry: returns desired movement for a CPU skater ----
  function control(sk, game) {
    if (sk.isGoalie) return goalieControl(sk, game);

    const puck = game.puck;
    const owner = puck.owner;

    if (owner === sk) return carrierControl(sk, game);

    const myTeamHasPuck = owner && owner.team === sk.team;

    // Free puck: closest teammate chases (with interception lead)
    if (!owner) {
      const chaser = nearest(game.players, puck.x, puck.y, function (p) {
        return p.team === sk.team && !p.isGoalie;
      });
      if (chaser === sk) {
        // lead the puck slightly
        const lead = 0.18;
        return steerTo(sk, puck.x + puck.vx * lead, puck.y + puck.vy * lead, 0.3);
      }
      return steerTo(sk, formationSpot(sk, puck, false).x, formationSpot(sk, puck, false).y, 1.4);
    }

    if (myTeamHasPuck) {
      // Offense: hold formation, but one net-front driver pushes in
      const spot = formationSpot(sk, puck, true);
      // the strong-side winger drives the net when close
      if ((sk.role === 'LW' || sk.role === 'RW') &&
          sk.attackDir() * (puck.x - R.centerX) > 20) {
        const gx = sk.oppGoalX();
        return steerTo(sk, gx - sk.attackDir() * 8, R.centerY + (sk.role === 'LW' ? -5 : 5), 0.6);
      }
      return steerTo(sk, spot.x, spot.y, 1.3);
    }

    // Defense: nearest defender pressures carrier; others cover / mark
    const defender = nearest(game.players, owner.x, owner.y, function (p) {
      return p.team === sk.team && !p.isGoalie;
    });
    if (defender === sk) {
      // pressure the carrier; auto-check if very close and lined up
      const d = U.dist(sk.x, sk.y, owner.x, owner.y);
      if (d < C.CHECK_RANGE && sk.stun <= 0 && Math.random() < 0.06) {
        game.attemptCheck(sk, owner);
      }
      return steerTo(sk, owner.x + owner.vx * 0.15, owner.y + owner.vy * 0.15, 0.2);
    }
    // mark an opponent in my lane or hold defensive spot
    const spot = formationSpot(sk, puck, false);
    return steerTo(sk, spot.x, spot.y, 1.3);
  }

  NHL.AI = { control: control, nearest: nearest, laneBlocked: laneBlocked, bestPassTarget: bestPassTarget };
})(window.NHL = window.NHL || {});
