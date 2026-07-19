/* main.js — bootstrap: builds the team-select menu and starts the game. */
(function (NHL) {
  'use strict';

  let game = null;
  let sel = { home: 'BOS', away: 'TOR', user: 0, diff: 'Pro' };

  function el(id) { return document.getElementById(id); }

  function buildTeamGrid(containerId, side) {
    const c = el(containerId);
    c.innerHTML = '';
    NHL.TEAMS.forEach(function (t) {
      const b = document.createElement('button');
      b.className = 'team-chip';
      b.style.setProperty('--pri', t.primary);
      b.style.setProperty('--sec', t.secondary);
      b.innerHTML = '<span class="dot"></span><span class="abbr">' + t.abbr +
        '</span><span class="cty">' + t.name + '</span>';
      b.dataset.abbr = t.abbr;
      b.addEventListener('click', function () {
        sel[side] = t.abbr;
        // prevent same team both sides
        if (side === 'home' && sel.away === t.abbr) sel.away = otherTeam(t.abbr);
        if (side === 'away' && sel.home === t.abbr) sel.home = otherTeam(t.abbr);
        refreshSelection();
      });
      c.appendChild(b);
    });
  }

  function otherTeam(abbr) {
    const t = NHL.TEAMS.find(function (x) { return x.abbr !== abbr; });
    return t.abbr;
  }

  function refreshSelection() {
    ['home', 'away'].forEach(function (side) {
      const c = el(side === 'home' ? 'homeGrid' : 'awayGrid');
      Array.prototype.forEach.call(c.children, function (b) {
        b.classList.toggle('selected', b.dataset.abbr === sel[side]);
      });
    });
    const h = NHL.teamByAbbr(sel.home), a = NHL.teamByAbbr(sel.away);
    el('vsHome').textContent = h.city + ' ' + h.name;
    el('vsAway').textContent = a.city + ' ' + a.name;
    el('vsHome').style.color = h.secondary === '#FFFFFF' ? h.primary : h.secondary;
    el('vsAway').style.color = a.secondary === '#FFFFFF' ? a.primary : a.secondary;
    el('vsHomeCard').style.background = h.primary;
    el('vsAwayCard').style.background = a.primary;

    Array.prototype.forEach.call(document.querySelectorAll('[data-side-btn]'), function (b) {
      b.classList.toggle('active', b.dataset.sideBtn === (sel.user === 0 ? 'home' : 'away'));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-diff]'), function (b) {
      b.classList.toggle('active', b.dataset.diff === sel.diff);
    });
  }

  function startGame() {
    el('menu').classList.add('hidden');
    el('gameWrap').classList.remove('hidden');
    if (!game) {
      game = new NHL.Game(el('game'), { periodLength: 150, difficulty: sel.diff });
      game.start();
      NHL.returnToMenu = returnToMenu;
    } else {
      game.resize();
    }
    game.periodLength = 150;
    game.setup(sel.home, sel.away, sel.user, sel.diff);
    NHL._game = game; // exposed for diagnostics
  }

  function returnToMenu() {
    if (game) game.state = NHL.STATE.MENU;
    el('gameWrap').classList.add('hidden');
    el('menu').classList.remove('hidden');
  }

  function initMenu() {
    buildTeamGrid('homeGrid', 'home');
    buildTeamGrid('awayGrid', 'away');
    refreshSelection();

    Array.prototype.forEach.call(document.querySelectorAll('[data-side-btn]'), function (b) {
      b.addEventListener('click', function () {
        sel.user = b.dataset.sideBtn === 'home' ? 0 : 1;
        refreshSelection();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-diff]'), function (b) {
      b.addEventListener('click', function () { sel.diff = b.dataset.diff; refreshSelection(); });
    });
    el('startBtn').addEventListener('click', startGame);
    el('randomBtn').addEventListener('click', function () {
      sel.home = NHL.U.pick(NHL.TEAMS).abbr;
      do { sel.away = NHL.U.pick(NHL.TEAMS).abbr; } while (sel.away === sel.home);
      refreshSelection();
    });
    el('backBtn').addEventListener('click', returnToMenu);
  }

  window.addEventListener('DOMContentLoaded', initMenu);
})(window.NHL = window.NHL || {});
