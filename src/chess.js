"use strict";
export const Chess = (() => {
  const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    F = "abcdefgh";
  const isW = (p) => p === p.toUpperCase();
  const ok = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const N = [
    [2, 1],
    [2, -1],
    [-2, 1],
    [-2, -1],
    [1, 2],
    [1, -2],
    [-1, 2],
    [-1, -2],
  ];
  const K = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  const V = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

  function parse(fen) {
    const [f, t, c, e, h, n] = fen.split(" "),
      b = [];
    f.split("/").forEach((row) => {
      const r = [];
      for (const ch of row)
        /\d/.test(ch) ? r.push(...Array(+ch).fill("")) : r.push(ch);
      b.push(r);
    });
    return {
      b,
      turn: t || "w",
      castle: !c || c === "-" ? "" : c,
      ep: !e || e === "-" ? null : [8 - e[1], F.indexOf(e[0])],
      half: +h || 0,
      full: +n || 1,
    };
  }
  function toFen(s) {
    const p = s.b
      .map((r) => {
        let o = "",
          n = 0;
        r.forEach((x) => {
          if (!x) n++;
          else {
            o += (n || "") + x;
            n = 0;
          }
        });
        return o + (n || "");
      })
      .join("/");
    return `${p} ${s.turn} ${s.castle || "-"} ${s.ep ? F[s.ep[1]] + (8 - s.ep[0]) : "-"} ${s.half} ${s.full}`;
  }
  function attacked(b, r, c, byW) {
    const own = (ch) => (byW ? ch.toUpperCase() : ch),
      pr = r + (byW ? 1 : -1);
    for (const dc of [-1, 1])
      if (ok(pr, c + dc) && b[pr][c + dc] === own("p")) return true;
    for (const [d, e] of N)
      if (ok(r + d, c + e) && b[r + d][c + e] === own("n")) return true;
    for (const [d, e] of K)
      if (ok(r + d, c + e) && b[r + d][c + e] === own("k")) return true;
    for (const [d, e] of K) {
      let a = r + d,
        x = c + e;
      while (ok(a, x)) {
        const p = b[a][x];
        if (p) {
          if (p === own("q") || p === own(d && e ? "b" : "r")) return true;
          break;
        }
        a += d;
        x += e;
      }
    }
    return false;
  }
  function inCheck(b, w) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (b[r][c] === (w ? "K" : "k")) return attacked(b, r, c, !w);
    return false;
  }
  function pseudo(s) {
    const { b } = s,
      w = s.turn === "w",
      m = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (!p || isW(p) !== w) continue;
        const t = p.toLowerCase(),
          add = (a, x, ex) => m.push({ fr: [r, c], to: [a, x], p, ...ex });
        if (t === "p") {
          const d = w ? -1 : 1,
            st = w ? 6 : 1,
            last = w ? 0 : 7;
          const push = (a, x, ex) => {
            if (a === last)
              for (const q of "qrbn")
                add(a, x, { ...ex, promo: w ? q.toUpperCase() : q });
            else add(a, x, ex);
          };
          if (!b[r + d][c]) {
            push(r + d, c);
            if (r === st && !b[r + 2 * d][c]) add(r + 2 * d, c, { dbl: 1 });
          }
          for (const dc of [-1, 1]) {
            const x = c + dc;
            if (!ok(r + d, x)) continue;
            const q = b[r + d][x];
            if (q && isW(q) !== w) push(r + d, x, { cap: q });
            else if (!q && s.ep && s.ep[0] === r + d && s.ep[1] === x)
              add(r + d, x, { ep: 1, cap: w ? "p" : "P" });
          }
        } else if (t === "n" || t === "k") {
          for (const [d, e] of t === "n" ? N : K) {
            const a = r + d,
              x = c + e;
            if (!ok(a, x)) continue;
            const q = b[a][x];
            if (!q || isW(q) !== w) add(a, x, q ? { cap: q } : {});
          }
          if (t === "k" && c === 4 && r === (w ? 7 : 0)) {
            const R = w ? "R" : "r",
              at = (x) => attacked(b, r, x, !w);
            if (
              s.castle.includes(w ? "K" : "k") &&
              b[r][7] === R &&
              !b[r][5] &&
              !b[r][6] &&
              !at(4) &&
              !at(5) &&
              !at(6)
            )
              add(r, 6, { castle: "K" });
            if (
              s.castle.includes(w ? "Q" : "q") &&
              b[r][0] === R &&
              !b[r][1] &&
              !b[r][2] &&
              !b[r][3] &&
              !at(4) &&
              !at(3) &&
              !at(2)
            )
              add(r, 2, { castle: "Q" });
          }
        } else {
          const dirs = t === "r" ? K.slice(0, 4) : t === "b" ? K.slice(4) : K;
          for (const [d, e] of dirs) {
            let a = r + d,
              x = c + e;
            while (ok(a, x)) {
              const q = b[a][x];
              if (q) {
                if (isW(q) !== w) add(a, x, { cap: q });
                break;
              }
              add(a, x, {});
              a += d;
              x += e;
            }
          }
        }
      }
    return m;
  }
  function make(s, m) {
    const b = s.b.map((r) => r.slice()),
      w = s.turn === "w",
      [r, c] = m.fr,
      [a, x] = m.to;
    b[a][x] = m.promo || m.p;
    b[r][c] = "";
    if (m.ep) b[r][x] = "";
    if (m.castle === "K") {
      b[a][5] = b[a][7];
      b[a][7] = "";
    }
    if (m.castle === "Q") {
      b[a][3] = b[a][0];
      b[a][0] = "";
    }
    let cs = s.castle;
    const st = (ch) => {
      cs = cs.replace(ch, "");
    };
    if (m.p === "K") {
      st("K");
      st("Q");
    }
    if (m.p === "k") {
      st("k");
      st("q");
    }
    if ((r === 7 && c === 0) || (a === 7 && x === 0)) st("Q");
    if ((r === 7 && c === 7) || (a === 7 && x === 7)) st("K");
    if ((r === 0 && c === 0) || (a === 0 && x === 0)) st("q");
    if ((r === 0 && c === 7) || (a === 0 && x === 7)) st("k");
    return {
      b,
      turn: w ? "b" : "w",
      castle: cs,
      ep: m.dbl ? [(r + a) / 2, c] : null,
      half: m.cap || m.p.toLowerCase() === "p" ? 0 : s.half + 1,
      full: s.full + (w ? 0 : 1),
    };
  }
  function legal(s) {
    const w = s.turn === "w";
    return pseudo(s).filter((m) => !inCheck(make(s, m).b, w));
  }
  function status(s) {
    const L = legal(s),
      chk = inCheck(s.b, s.turn === "w");
    if (!L.length) return chk ? "mate" : "stalemate";
    const pcs = s.b.flat().filter((p) => p && p.toLowerCase() !== "k");
    if (s.half >= 100 || !pcs.length) return "draw";
    return chk ? "check" : "play";
  }
  function san(s, m, L) {
    if (m.castle) return (m.castle === "K" ? "O-O" : "O-O-O") + suf(s, m);
    const t = m.p.toLowerCase();
    let o = "";
    if (t === "p") {
      if (m.cap) o = F[m.fr[1]] + "x";
      o += F[m.to[1]] + (8 - m.to[0]);
      if (m.promo) o += "=" + m.promo.toUpperCase();
    } else {
      o = t.toUpperCase();
      const same = L.filter(
        (q) =>
          q !== m && q.p === m.p && q.to[0] === m.to[0] && q.to[1] === m.to[1],
      );
      if (same.length) {
        if (!same.some((q) => q.fr[1] === m.fr[1])) o += F[m.fr[1]];
        else if (!same.some((q) => q.fr[0] === m.fr[0])) o += 8 - m.fr[0];
        else o += F[m.fr[1]] + (8 - m.fr[0]);
      }
      if (m.cap) o += "x";
      o += F[m.to[1]] + (8 - m.to[0]);
    }
    return o + suf(s, m);
  }
  function suf(s, m) {
    const st = status(make(s, m));
    return st === "mate" ? "#" : st === "check" ? "+" : "";
  }
  const uci = (m) =>
    F[m.fr[1]] +
    (8 - m.fr[0]) +
    F[m.to[1]] +
    (8 - m.to[0]) +
    (m.promo ? m.promo.toLowerCase() : "");
  const fromUci = (s, u) => legal(s).find((m) => uci(m) === u) || null;
  const fromSan = (s, t) => {
    const L = legal(s),
      n = t.replace(/[+#!?]/g, "");
    return L.find((m) => san(s, m, L).replace(/[+#]/g, "") === n) || null;
  };

  function ev(s) {
    let v = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = s.b[r][c];
        if (!p) continue;
        const t = p.toLowerCase(),
          w = isW(p);
        let x = V[t];
        if (t !== "k" && t !== "r")
          x += (Math.min(r, 7 - r) + Math.min(c, 7 - c)) * 4;
        if (t === "p") x += (w ? 6 - r : r - 1) * 6;
        v += w ? x : -x;
      }
    return s.turn === "w" ? v : -v;
  }
  const cv = (m) => (m.cap ? V[m.cap.toLowerCase()] : 0);
  function nega(s, d, a, b) {
    const L = legal(s);
    if (!L.length) return inCheck(s.b, s.turn === "w") ? -99000 - d : 0;
    if (d === 0) return ev(s);
    L.sort((x, y) => cv(y) - cv(x));
    for (const m of L) {
      const v = -nega(make(s, m), d - 1, -b, -a);
      if (v >= b) return b;
      if (v > a) a = v;
    }
    return a;
  }
  function best(s, d) {
    const L = legal(s);
    if (!L.length) return null;
    if (d <= 0) return L[Math.floor(Math.random() * L.length)];
    let bm = null,
      bv = -Infinity;
    for (const m of L) {
      const v =
        -nega(make(s, m), d - 1, -Infinity, Infinity) + Math.random() * 8;
      if (v > bv) {
        bv = v;
        bm = m;
      }
    }
    return bm;
  }
  return {
    START,
    parse,
    toFen,
    legal,
    make,
    status,
    san,
    uci,
    fromUci,
    fromSan,
    best,
    inCheck,
  };
})();
