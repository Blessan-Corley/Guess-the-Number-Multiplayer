'use strict';
const j = require('../coverage/coverage-summary.json');
const rows = Object.entries(j)
  .filter(([k]) => k !== 'total')
  .map(([k, v]) => ({
    f: k.split('Number guesser muliplayer').pop(),
    s: v.statements.pct,
    b: v.branches.pct,
    fn: v.functions.pct,
  }))
  .sort((a, b) => a.s - b.s)
  .slice(0, 25);
rows.forEach((r) => console.log(r.s + '% stmts  ' + r.b + '% br  ' + r.fn + '% fn  ' + r.f));
