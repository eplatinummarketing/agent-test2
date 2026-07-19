/* teams.js — NHL team data: names, abbreviations, and authentic color palettes.
 * Colors are approximations of official primary/secondary/accent brand colors.
 * Exposed on the global NHL namespace. */
(function (NHL) {
  'use strict';

  /**
   * Each team:
   *   city, name, abbr
   *   primary   — main sweater color
   *   secondary — contrasting color (numbers, trim)
   *   accent    — third color / highlight
   *   conf      — 'E' | 'W'
   */
  const TEAMS = [
    // --- Eastern Conference ---
    { city: 'Boston',       name: 'Bruins',       abbr: 'BOS', primary: '#111111', secondary: '#FFB81C', accent: '#FFFFFF', conf: 'E' },
    { city: 'Buffalo',      name: 'Sabres',       abbr: 'BUF', primary: '#003087', secondary: '#FFB81C', accent: '#FFFFFF', conf: 'E' },
    { city: 'Detroit',      name: 'Red Wings',    abbr: 'DET', primary: '#CE1126', secondary: '#FFFFFF', accent: '#CE1126', conf: 'E' },
    { city: 'Florida',      name: 'Panthers',     abbr: 'FLA', primary: '#041E42', secondary: '#C8102E', accent: '#B9975B', conf: 'E' },
    { city: 'Montreal',     name: 'Canadiens',    abbr: 'MTL', primary: '#AF1E2D', secondary: '#192168', accent: '#FFFFFF', conf: 'E' },
    { city: 'New York',     name: 'Rangers',      abbr: 'NYR', primary: '#0038A8', secondary: '#CE1126', accent: '#FFFFFF', conf: 'E' },
    { city: 'Ottawa',       name: 'Senators',     abbr: 'OTT', primary: '#111111', secondary: '#C8102E', accent: '#C2912C', conf: 'E' },
    { city: 'Pittsburgh',   name: 'Penguins',     abbr: 'PIT', primary: '#000000', secondary: '#FCB514', accent: '#FFFFFF', conf: 'E' },
    { city: 'Tampa Bay',    name: 'Lightning',    abbr: 'TBL', primary: '#002868', secondary: '#FFFFFF', accent: '#00AEEF', conf: 'E' },
    { city: 'Toronto',      name: 'Maple Leafs',  abbr: 'TOR', primary: '#00205B', secondary: '#FFFFFF', accent: '#0057B8', conf: 'E' },
    { city: 'Washington',   name: 'Capitals',     abbr: 'WSH', primary: '#C8102E', secondary: '#041E42', accent: '#FFFFFF', conf: 'E' },
    { city: 'Carolina',     name: 'Hurricanes',   abbr: 'CAR', primary: '#CE1126', secondary: '#000000', accent: '#FFFFFF', conf: 'E' },

    // --- Western Conference ---
    { city: 'Chicago',      name: 'Blackhawks',   abbr: 'CHI', primary: '#CF0A2C', secondary: '#000000', accent: '#FF671B', conf: 'W' },
    { city: 'Colorado',     name: 'Avalanche',    abbr: 'COL', primary: '#6F263D', secondary: '#236192', accent: '#A2AAAD', conf: 'W' },
    { city: 'Dallas',       name: 'Stars',        abbr: 'DAL', primary: '#006847', secondary: '#111111', accent: '#8F8F8C', conf: 'W' },
    { city: 'Edmonton',     name: 'Oilers',       abbr: 'EDM', primary: '#041E42', secondary: '#FF4C00', accent: '#FFFFFF', conf: 'W' },
    { city: 'Los Angeles',  name: 'Kings',        abbr: 'LAK', primary: '#111111', secondary: '#A2AAAD', accent: '#FFFFFF', conf: 'W' },
    { city: 'Minnesota',    name: 'Wild',         abbr: 'MIN', primary: '#154734', secondary: '#A6192E', accent: '#DDCBA4', conf: 'W' },
    { city: 'Nashville',    name: 'Predators',    abbr: 'NSH', primary: '#FFB81C', secondary: '#041E42', accent: '#FFFFFF', conf: 'W' },
    { city: 'St. Louis',    name: 'Blues',        abbr: 'STL', primary: '#002F87', secondary: '#FCB514', accent: '#FFFFFF', conf: 'W' },
    { city: 'Vegas',        name: 'Golden Knights',abbr: 'VGK', primary: '#333F42', secondary: '#B4975A', accent: '#C8102E', conf: 'W' },
    { city: 'Vancouver',    name: 'Canucks',      abbr: 'VAN', primary: '#00205B', secondary: '#00843D', accent: '#FFFFFF', conf: 'W' },
    { city: 'Seattle',      name: 'Kraken',       abbr: 'SEA', primary: '#001628', secondary: '#99D9D9', accent: '#E9072B', conf: 'W' },
    { city: 'Calgary',      name: 'Flames',       abbr: 'CGY', primary: '#C8102E', secondary: '#F1BE48', accent: '#FFFFFF', conf: 'W' }
  ];

  NHL.TEAMS = TEAMS;
  NHL.teamByAbbr = function (abbr) {
    return TEAMS.find(function (t) { return t.abbr === abbr; }) || TEAMS[0];
  };
})(window.NHL = window.NHL || {});
