/*!
 * js-demo / core — seeded-random.js
 * 種を指定できる疑似乱数。同じ種なら必ず同じ列を返すので、
 * 授業で同じ初期状態を共有でき、テストの期待値も固定できる。
 * Math.random() は再現できないため、デモの初期データ生成には使わない。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  /* 文字列・数値のどちらでも種にできるよう 32bit 整数へ畳み込む（FNV-1a 系）。 */
  function hashSeed(seed) {
    if (typeof seed === "number" && Number.isFinite(seed)) {
      return seed >>> 0;
    }
    var text = String(seed === undefined || seed === null ? "" : seed);
    var h = 2166136261 >>> 0;
    for (var i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /**
   * 乱数生成器を作る。
   * @param {number|string} seed 種。同じ種なら同じ列になる。
   * @returns {{next:Function, int:Function, range:Function, pick:Function,
   *            shuffle:Function, normal:Function, seed:number, reset:Function}}
   */
  function createRandom(seed) {
    var initial = hashSeed(seed);
    var state = initial;
    var spare = null; /* normal() 用に 1 個だけ持ち越す */

    /* mulberry32。短いのに分布が素直で、32bit 環境で再現しやすい。 */
    function next() {
      state = (state + 0x6d2b79f5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    return {
      seed: initial,

      /** [0, 1) の実数 */
      next: next,

      /** [min, max) の実数 */
      range: function (min, max) {
        return min + next() * (max - min);
      },

      /** [min, max] の整数 */
      int: function (min, max) {
        return Math.floor(min + next() * (max - min + 1));
      },

      /** 配列から 1 つ選ぶ */
      pick: function (list) {
        return list[Math.floor(next() * list.length)];
      },

      /** 複製を Fisher–Yates で並べ替える（元の配列は変えない） */
      shuffle: function (list) {
        var out = list.slice();
        for (var i = out.length - 1; i > 0; i -= 1) {
          var j = Math.floor(next() * (i + 1));
          var tmp = out[i];
          out[i] = out[j];
          out[j] = tmp;
        }
        return out;
      },

      /** 平均 mean・標準偏差 sd の正規乱数（Box–Muller） */
      normal: function (mean, sd) {
        var m = mean === undefined ? 0 : mean;
        var s = sd === undefined ? 1 : sd;
        if (spare !== null) {
          var value = spare;
          spare = null;
          return m + s * value;
        }
        var u = 0;
        var v = 0;
        while (u === 0) { u = next(); } /* log(0) を避ける */
        while (v === 0) { v = next(); }
        var r = Math.sqrt(-2 * Math.log(u));
        var theta = 2 * Math.PI * v;
        spare = r * Math.sin(theta);
        return m + s * (r * Math.cos(theta));
      },

      /** 同じ種の先頭へ戻す */
      reset: function () {
        state = initial;
        spare = null;
      }
    };
  }

  JsDemo.Random = {
    create: createRandom,
    hashSeed: hashSeed
  };
})(typeof window !== "undefined" ? window : globalThis);
