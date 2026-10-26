/*!
 * js-demo / sorting — sorts.js
 * ソートの手順を「手順（step）の列」として作る。描画も DOM も使わない。
 *
 * 設計:
 *   どの手法も「並べ替えた結果」ではなく**途中の手順を全部記録した配列**を返す。
 *   手順が配列なら、自動で順に見せるのも、1 手ずつ進めるのも、戻るのも、
 *   同じ 1 つの出どころから作れる。画面側に手順を再現させない。
 *
 *   手順は replay() で状態へ畳み込む。n 手目の状態は「最初から n 手適用した結果」
 *   として毎回作り直す。途中の状態を保存しないので、戻る操作で食い違いが起きない。
 *
 * 手順の種類:
 *   compare  2 つの要素を比べた         { cells: [[row, i], [row, j]] }
 *   read     値を見ただけ（比較ではない） { cells: [[row, i]] }  （計数・基数・バケツ）
 *   swap     2 つの要素を入れ替えた     { i, j }
 *   set      ある位置へ値を書いた       { row, i, value }
 *   aux      作業用の控えを並べた       { lo, hi, values }  （マージソート）
 *   auxClear 控えを片付けた
 *   emit     要素を出力へ送った         { i }                （スリープソート）
 *   remove   要素を取り除いた           { i }                （スターリンソート）
 *   shuffle  全体を混ぜ直した           { values }           （ボゴソート）
 *   reverse  ある範囲をひっくり返した     { lo, hi }           （パンケーキソート）
 *   auxInit  控えの行を空で用意した       { size, kind }       （計数・基数・バケツ）
 *   pivot    基準の要素を決めた         { i }
 *   range    いま見ている範囲           { lo, hi }
 *   sorted   位置が確定した             { indices }
 *   check    並びがそろっているか見た   { ok }
 *   note     画面に出す短い説明         { key }
 *   done     手順の終わり
 *
 * 比べた回数・入れ替えた回数は手順から数える。別に数えると実物とずれるため。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  /* 手順の上限。これを超えたら打ち切り、画面に「打ち切った」と出す。
     冗談の手法は終わらないことがあるので、黙って止まらないようにする。 */
  var DEFAULT_LIMIT = 20000;

  /* --- 手順の記録 ------------------------------------------------------- */

  function recorder(limit) {
    var steps = [];
    var cap = limit || DEFAULT_LIMIT;
    var truncated = false;

    return {
      steps: steps,
      add: function (step) {
        if (steps.length >= cap) { truncated = true; return false; }
        steps.push(step);
        return true;
      },
      compare: function (i, j) {
        return this.add({ type: "compare", cells: [["main", i], ["main", j]] });
      },
      compareAux: function (i, j) {
        return this.add({ type: "compare", cells: [["aux", i], ["aux", j]] });
      },
      get full() { return steps.length >= cap; },
      get truncated() { return truncated; }
    };
  }

  function swapInPlace(list, i, j) {
    var tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }

  /* --- まじめな手法 ----------------------------------------------------- */

  /**
   * バブルソート。隣どうしを比べて、順番が逆なら入れ替える。
   * 1 周するごとに右端が 1 つ確定する。入れ替えが起きなければ終わり。
   */
  function bubble(a, rec) {
    for (var end = a.length - 1; end > 0; end -= 1) {
      var swapped = false;
      for (var i = 0; i < end; i += 1) {
        rec.compare(i, i + 1);
        if (a[i] > a[i + 1]) {
          swapInPlace(a, i, i + 1);
          rec.add({ type: "swap", i: i, j: i + 1 });
          swapped = true;
        }
        if (rec.full) { return; }
      }
      rec.add({ type: "sorted", indices: [end] });
      if (!swapped) {
        /* 1 周して一度も入れ替えなければ、残り全部そろっている。 */
        var rest = [];
        for (var k = 0; k < end; k += 1) { rest.push(k); }
        rec.add({ type: "sorted", indices: rest });
        return;
      }
    }
    if (a.length > 0) { rec.add({ type: "sorted", indices: [0] }); }
  }

  /**
   * 選択ソート。残りの中から最小を探し、先頭と入れ替える。
   * 比べる回数は並びに関係なく同じで、入れ替えは 1 周に 1 回だけ。
   */
  function selection(a, rec) {
    for (var s = 0; s < a.length - 1; s += 1) {
      var min = s;
      for (var i = s + 1; i < a.length; i += 1) {
        rec.compare(min, i);
        if (a[i] < a[min]) { min = i; }
        if (rec.full) { return; }
      }
      if (min !== s) {
        swapInPlace(a, s, min);
        rec.add({ type: "swap", i: s, j: min });
      }
      rec.add({ type: "sorted", indices: [s] });
    }
    if (a.length > 0) { rec.add({ type: "sorted", indices: [a.length - 1] }); }
  }

  /**
   * 挿入ソート。左側はいつもそろっている。
   * 次の要素を、そろっている列の正しい場所まで隣と入れ替えながら運ぶ。
   */
  function insertion(a, rec) {
    /* ここでは確定（sorted）の印を付けない。
       左の並びは「そろってはいる」が、あとから小さい値が来れば**また動く**。
       確定の印を付けると「この位置はもう変わらない」という意味が崩れる。
       そろっている様子は、棒が階段状になることで見える。 */
    for (var i = 1; i < a.length; i += 1) {
      var j = i;
      while (j > 0) {
        rec.compare(j - 1, j);
        if (a[j - 1] <= a[j]) { break; }
        swapInPlace(a, j - 1, j);
        rec.add({ type: "swap", i: j - 1, j: j });
        j -= 1;
        if (rec.full) { return; }
      }
    }
    markAllSorted(a, rec);
  }

  /**
   * マージソート。半分ずつに分け、そろった2列を1列に合わせる。
   *
   * 合わせるときは範囲の控えを取ってから書き戻す。**余分な場所が要る**のが
   * この手法の特徴なので、控えを画面にも出す（aux の手順）。
   */
  function merge(a, rec) {
    function mergeRange(lo, mid, hi) {
      rec.add({ type: "range", lo: lo, hi: hi });
      var buffer = a.slice(lo, hi + 1);
      rec.add({ type: "aux", lo: lo, hi: hi, values: buffer.slice() });

      var leftEnd = mid - lo;      /* 控えの中での左の列の終わり */
      var i = 0;
      var j = leftEnd + 1;
      var k = lo;

      while (i <= leftEnd && j < buffer.length) {
        rec.compareAux(i, j);
        if (rec.full) { return; }
        if (buffer[i] <= buffer[j]) {
          a[k] = buffer[i];
          rec.add({ type: "set", row: "main", i: k, value: buffer[i] });
          i += 1;
        } else {
          a[k] = buffer[j];
          rec.add({ type: "set", row: "main", i: k, value: buffer[j] });
          j += 1;
        }
        k += 1;
      }
      while (i <= leftEnd) {
        a[k] = buffer[i];
        rec.add({ type: "set", row: "main", i: k, value: buffer[i] });
        i += 1;
        k += 1;
        if (rec.full) { return; }
      }
      while (j < buffer.length) {
        a[k] = buffer[j];
        rec.add({ type: "set", row: "main", i: k, value: buffer[j] });
        j += 1;
        k += 1;
        if (rec.full) { return; }
      }
      rec.add({ type: "auxClear" });
    }

    function sortRange(lo, hi) {
      if (lo >= hi || rec.full) { return; }
      var mid = Math.floor((lo + hi) / 2);
      sortRange(lo, mid);
      sortRange(mid + 1, hi);
      mergeRange(lo, mid, hi);
    }

    sortRange(0, a.length - 1);
    if (!rec.full) { markAllSorted(a, rec); }
  }

  /**
   * クイックソート（Lomuto の分割、基準は範囲の右端）。
   * 基準より小さいものを左へ寄せ、最後に基準をその境目へ置く。
   * 置いた位置はそこで確定する。
   */
  function quick(a, rec) {
    function partition(lo, hi) {
      rec.add({ type: "range", lo: lo, hi: hi });
      rec.add({ type: "pivot", i: hi });
      var store = lo;
      for (var i = lo; i < hi; i += 1) {
        rec.compare(i, hi);
        if (rec.full) { return store; }
        if (a[i] < a[hi]) {
          if (i !== store) {
            swapInPlace(a, i, store);
            rec.add({ type: "swap", i: i, j: store });
          }
          store += 1;
        }
      }
      if (store !== hi) {
        swapInPlace(a, store, hi);
        rec.add({ type: "swap", i: store, j: hi });
      }
      rec.add({ type: "sorted", indices: [store] });
      return store;
    }

    function sortRange(lo, hi) {
      if (lo > hi || rec.full) { return; }
      if (lo === hi) { rec.add({ type: "sorted", indices: [lo] }); return; }
      var p = partition(lo, hi);
      sortRange(lo, p - 1);
      sortRange(p + 1, hi);
    }

    sortRange(0, a.length - 1);
  }

  /**
   * ヒープソート。まず「親は子より大きい」形を全体に作り、
   * 先頭（最大）を末尾へ送って範囲を 1 つ縮める、を繰り返す。
   */
  function heap(a, rec) {
    var n = a.length;

    function siftDown(start, end) {
      var root = start;
      while (true) {
        var child = 2 * root + 1;
        if (child > end || rec.full) { return; }
        var target = root;
        rec.compare(target, child);
        if (a[child] > a[target]) { target = child; }
        if (child + 1 <= end) {
          rec.compare(target, child + 1);
          if (a[child + 1] > a[target]) { target = child + 1; }
        }
        if (target === root) { return; }
        swapInPlace(a, root, target);
        rec.add({ type: "swap", i: root, j: target });
        root = target;
      }
    }

    rec.add({ type: "note", key: "sort.note.heapBuild" });
    for (var start = Math.floor(n / 2) - 1; start >= 0; start -= 1) {
      siftDown(start, n - 1);
      if (rec.full) { return; }
    }
    rec.add({ type: "note", key: "sort.note.heapExtract" });
    for (var end = n - 1; end > 0; end -= 1) {
      swapInPlace(a, 0, end);
      rec.add({ type: "swap", i: 0, j: end });
      rec.add({ type: "sorted", indices: [end] });
      siftDown(0, end - 1);
      if (rec.full) { return; }
    }
    if (n > 0) { rec.add({ type: "sorted", indices: [0] }); }
  }

  /* --- 冗談の手法 ------------------------------------------------------- */

  /**
   * スターリンソート。左から見て、直前に残した値より小さい要素を取り除く。
   *
   * 1 回通すだけで必ず「増える一方の列」になる。速いが、**要素が消える**。
   * 並べ替えではないので、ソートとして正しくない。
   * 名前は冗談で、計算量の話のために作られたもの。この画面では手順だけを扱う。
   */
  function stalin(a, rec) {
    if (a.length === 0) { return; }
    rec.add({ type: "sorted", indices: [0] });
    var keep = 0;   /* 最後に残した位置 */
    for (var i = 1; i < a.length; i += 1) {
      rec.compare(keep, i);
      if (rec.full) { return; }
      if (a[i] >= a[keep]) {
        keep = i;
        rec.add({ type: "sorted", indices: [i] });
      } else {
        rec.add({ type: "remove", i: i });
      }
    }
    rec.add({ type: "note", key: "sort.note.stalinLoss" });
  }

  /**
   * ボゴソート。そろっているか見て、そろっていなければ全部混ぜる。それだけ。
   * 期待される混ぜる回数は要素数の階乗ほど。要素数を増やすと終わらない。
   */
  function bogo(a, rec, random) {
    function sortedFrom() {
      for (var i = 0; i + 1 < a.length; i += 1) {
        rec.compare(i, i + 1);
        if (rec.full) { return false; }
        if (a[i] > a[i + 1]) { return false; }
      }
      return true;
    }

    var tries = 0;
    while (!rec.full) {
      var ok = sortedFrom();
      rec.add({ type: "check", ok: ok });
      if (ok) {
        markAllSorted(a, rec);
        rec.add({ type: "note", key: "sort.note.bogoDone" });
        return;
      }
      var mixed = random.shuffle(a);
      for (var i = 0; i < mixed.length; i += 1) { a[i] = mixed[i]; }
      tries += 1;
      rec.add({ type: "shuffle", values: mixed.slice() });
    }
  }

  /**
   * スリープソート。各要素が「自分の値だけ待ってから」出ていく。
   * 待ち時間の長さで順番が決まるので、比べる操作が一度も出てこない。
   *
   * ここでは待ち時間を実際の時間ではなく手順の順序として表す。
   * 値が同じときは元の順番で出す（実物の時計では順序が保証されない点は、
   * 画面の「この手順の限界」に書いてある）。
   */
  function sleep(a, rec) {
    var order = a.map(function (value, index) {
      return { value: value, index: index };
    }).sort(function (p, q) {
      return p.value - q.value || p.index - q.index;
    });

    rec.add({ type: "note", key: "sort.note.sleepWait" });
    order.forEach(function (item) {
      if (rec.full) { return; }
      rec.add({ type: "emit", i: item.index });
    });
  }

  /**
   * ミラクルソート。そろっているか見る。そろっていなければ、何もしないで待つ。
   * 宇宙線か奇跡で並びが直るのを期待する。要素は一つも動かない。
   */
  function miracle(a, rec) {
    var passes = 0;
    var MAX_PASSES = 12;
    while (passes < MAX_PASSES && !rec.full) {
      var ok = true;
      for (var i = 0; i + 1 < a.length; i += 1) {
        rec.compare(i, i + 1);
        if (rec.full) { return; }
        if (a[i] > a[i + 1]) { ok = false; break; }
      }
      rec.add({ type: "check", ok: ok });
      if (ok) {
        markAllSorted(a, rec);
        rec.add({ type: "note", key: "sort.note.miracleDone" });
        return;
      }
      passes += 1;
      rec.add({ type: "note", key: "sort.note.miracleWait" });
    }
    rec.add({ type: "note", key: "sort.note.miracleGiveUp" });
  }

  function markAllSorted(a, rec) {
    var all = [];
    for (var i = 0; i < a.length; i += 1) { all.push(i); }
    rec.add({ type: "sorted", indices: all });
  }


  /* --- 交換の仲間 ------------------------------------------------------- */

  /**
   * カクテルシェーカーソート。バブルソートを往復させる。
   * 左端に取り残された小さい値（「亀」）が、片道だけのバブルより早く片付く。
   */
  function cocktail(a, rec) {
    var lo = 0;
    var hi = a.length - 1;
    while (lo < hi && !rec.full) {
      var swapped = false;
      for (var i = lo; i < hi; i += 1) {
        rec.compare(i, i + 1);
        if (rec.full) { return; }
        if (a[i] > a[i + 1]) {
          swapInPlace(a, i, i + 1);
          rec.add({ type: "swap", i: i, j: i + 1 });
          swapped = true;
        }
      }
      rec.add({ type: "sorted", indices: [hi] });
      hi -= 1;
      for (var j = hi; j > lo; j -= 1) {
        rec.compare(j - 1, j);
        if (rec.full) { return; }
        if (a[j - 1] > a[j]) {
          swapInPlace(a, j - 1, j);
          rec.add({ type: "swap", i: j - 1, j: j });
          swapped = true;
        }
      }
      rec.add({ type: "sorted", indices: [lo] });
      lo += 1;
      if (!swapped) { break; }
    }
    markAllSorted(a, rec);
  }

  /**
   * ノームソート。位置を 1 つずつ進み、逆なら入れ替えて 1 つ戻る。
   * 変数が 1 つで書ける一番小さな実装。挿入ソートと同じ回数で動く。
   */
  function gnome(a, rec) {
    var pos = 0;
    while (pos < a.length && !rec.full) {
      if (pos === 0) { pos = 1; continue; }
      rec.compare(pos - 1, pos);
      if (a[pos - 1] <= a[pos]) {
        pos += 1;
      } else {
        swapInPlace(a, pos - 1, pos);
        rec.add({ type: "swap", i: pos - 1, j: pos });
        pos -= 1;
      }
    }
    if (!rec.full) { markAllSorted(a, rec); }
  }

  /**
   * コムソート。離れた相手と比べる幅を 1.3 で割りながら縮める。
   * 幅が 1 になるとバブルソートと同じだが、そこまでに遠くの食い違いが消えている。
   */
  function comb(a, rec) {
    var gap = a.length;
    var swapped = true;
    while ((gap > 1 || swapped) && !rec.full) {
      gap = Math.floor(gap / 1.3);
      if (gap < 1) { gap = 1; }
      swapped = false;
      for (var i = 0; i + gap < a.length; i += 1) {
        rec.compare(i, i + gap);
        if (rec.full) { return; }
        if (a[i] > a[i + gap]) {
          swapInPlace(a, i, i + gap);
          rec.add({ type: "swap", i: i, j: i + gap });
          swapped = true;
        }
      }
    }
    if (!rec.full) { markAllSorted(a, rec); }
  }

  /**
   * パンケーキソート。先頭からある位置までを「ひっくり返す」操作だけで並べる。
   * 残りの中の最大を先頭へ出し、次にそれを末尾へ送る。1 周で 2 回返す。
   */
  function pancake(a, rec) {
    for (var end = a.length - 1; end > 0; end -= 1) {
      var max = 0;
      for (var i = 1; i <= end; i += 1) {
        rec.compare(max, i);
        if (rec.full) { return; }
        if (a[i] > a[max]) { max = i; }
      }
      if (max !== 0) {
        reverseRange(a, 0, max);
        rec.add({ type: "reverse", lo: 0, hi: max });
      }
      reverseRange(a, 0, end);
      rec.add({ type: "reverse", lo: 0, hi: end });
      rec.add({ type: "sorted", indices: [end] });
      if (rec.full) { return; }
    }
    if (a.length > 0) { rec.add({ type: "sorted", indices: [0] }); }
  }

  function reverseRange(list, lo, hi) {
    while (lo < hi) {
      swapInPlace(list, lo, hi);
      lo += 1;
      hi -= 1;
    }
  }

  /* --- 挿入の仲間 ------------------------------------------------------- */

  /**
   * シェルソート。離れた位置どうしで挿入ソートをして、間隔を半分ずつ縮める。
   * 最後は間隔 1 の挿入ソートだが、そのときには全体がほぼそろっている。
   */
  function shell(a, rec) {
    for (var gap = Math.floor(a.length / 2); gap >= 1; gap = Math.floor(gap / 2)) {
      rec.add({ type: "note", key: "sort.note.shellGap" });
      for (var i = gap; i < a.length; i += 1) {
        var j = i;
        while (j >= gap) {
          rec.compare(j - gap, j);
          if (rec.full) { return; }
          if (a[j - gap] <= a[j]) { break; }
          swapInPlace(a, j - gap, j);
          rec.add({ type: "swap", i: j - gap, j: j });
          j -= gap;
        }
      }
    }
    markAllSorted(a, rec);
  }

  /**
   * 二分挿入ソート。入れる場所を二分探索で見つける。
   *
   * **比べる回数は O(n log n) まで減るが、ずらす回数は O(n²) のまま。**
   * 比較と移動を別に数えると、この手法の意味が見える。
   */
  function binaryInsertion(a, rec) {
    /* 挿入ソートと同じ理由で、途中では確定の印を付けない。 */
    for (var i = 1; i < a.length; i += 1) {
      var lo = 0;
      var hi = i - 1;
      while (lo <= hi) {
        var mid = Math.floor((lo + hi) / 2);
        rec.compare(mid, i);
        if (rec.full) { return; }
        if (a[mid] <= a[i]) { lo = mid + 1; } else { hi = mid - 1; }
      }
      for (var j = i; j > lo; j -= 1) {
        swapInPlace(a, j - 1, j);
        rec.add({ type: "swap", i: j - 1, j: j });
        if (rec.full) { return; }
      }
    }
    markAllSorted(a, rec);
  }

  /* --- 選択の仲間 ------------------------------------------------------- */

  /**
   * サイクルソート。書き込む回数が理論上の最小になる手法。
   * その要素より小さいものを数えて、行き先を直接決めて書き込む。
   */
  function cycle(a, rec) {
    for (var start = 0; start < a.length - 1; start += 1) {
      var item = a[start];
      var pos = start;
      for (var i = start + 1; i < a.length; i += 1) {
        rec.compare(start, i);
        if (rec.full) { return; }
        if (a[i] < item) { pos += 1; }
      }
      if (pos === start) {
        rec.add({ type: "sorted", indices: [start] });
        continue;
      }
      while (item === a[pos]) { pos += 1; }
      var held = a[pos];
      a[pos] = item;
      rec.add({ type: "set", row: "main", i: pos, value: item });
      item = held;

      while (pos !== start && !rec.full) {
        pos = start;
        for (var k = start + 1; k < a.length; k += 1) {
          rec.compare(start, k);
          if (rec.full) { return; }
          if (a[k] < item) { pos += 1; }
        }
        while (item === a[pos]) { pos += 1; }
        held = a[pos];
        a[pos] = item;
        rec.add({ type: "set", row: "main", i: pos, value: item });
        item = held;
      }
    }
    if (!rec.full) { markAllSorted(a, rec); }
  }

  /* --- 分割統治の仲間 --------------------------------------------------- */

  /**
   * ストゥージソート。両端を直したうえで、3 分の 2 ずつを 3 回並べ替える。
   * 有名な非効率で、O(n^2.71) ほどかかる。正しく終わるが実用ではない。
   */
  function stooge(a, rec) {
    function sortRange(lo, hi) {
      if (rec.full) { return; }
      rec.compare(lo, hi);
      if (a[lo] > a[hi]) {
        swapInPlace(a, lo, hi);
        rec.add({ type: "swap", i: lo, j: hi });
      }
      var length = hi - lo + 1;
      if (length > 2) {
        var third = Math.floor(length / 3);
        rec.add({ type: "range", lo: lo, hi: hi });
        sortRange(lo, hi - third);
        sortRange(lo + third, hi);
        sortRange(lo, hi - third);
      }
    }
    sortRange(0, a.length - 1);
    if (!rec.full) { markAllSorted(a, rec); }
  }

  /* --- 比べない手法 ----------------------------------------------------- */

  /**
   * 計数ソート。値ごとに「いくつあったか」を数え、数えた順に書き出す。
   * 一度も比べない。値の範囲を知っていないと使えない。
   */
  function counting(a, rec) {
    var max = 0;
    a.forEach(function (v) { max = Math.max(max, v); });
    var counts = [];
    for (var i = 0; i <= max; i += 1) { counts.push(0); }

    rec.add({ type: "auxInit", size: max + 1, kind: "counts" });
    for (var k = 0; k < a.length; k += 1) {
      rec.add({ type: "read", cells: [["main", k]] });
      counts[a[k]] += 1;
      rec.add({ type: "set", row: "aux", i: a[k], value: counts[a[k]] });
      if (rec.full) { return; }
    }

    var pos = 0;
    for (var v = 0; v <= max; v += 1) {
      while (counts[v] > 0) {
        a[pos] = v;
        rec.add({ type: "set", row: "main", i: pos, value: v });
        rec.add({ type: "sorted", indices: [pos] });
        counts[v] -= 1;
        rec.add({ type: "set", row: "aux", i: v, value: counts[v] });
        pos += 1;
        if (rec.full) { return; }
      }
    }
    rec.add({ type: "auxClear" });
    rec.add({ type: "note", key: "sort.note.countingRange" });
  }

  /**
   * 基数ソート（下の桁から）。桁ごとに、順番を崩さずに配り直す。
   * 比べるのは桁の数字だけで、値そのものは比べない。
   */
  function radix(a, rec) {
    var max = 0;
    a.forEach(function (v) { max = Math.max(max, v); });
    var digits = String(max).length;

    for (var d = 0; d < digits; d += 1) {
      var place = Math.pow(10, d);
      var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      rec.add({ type: "note", key: "sort.note.radixDigit" });

      for (var i = 0; i < a.length; i += 1) {
        rec.add({ type: "read", cells: [["main", i]] });
        counts[Math.floor(a[i] / place) % 10] += 1;
        if (rec.full) { return; }
      }
      var offsets = [];
      var total = 0;
      for (var c = 0; c < 10; c += 1) {
        offsets.push(total);
        total += counts[c];
      }

      rec.add({ type: "auxInit", size: a.length, kind: "digits" });
      for (var j = 0; j < a.length; j += 1) {
        var bucket = Math.floor(a[j] / place) % 10;
        var slot = offsets[bucket];
        offsets[bucket] += 1;
        rec.add({ type: "read", cells: [["main", j]] });
        rec.add({ type: "set", row: "aux", i: slot, value: a[j] });
        if (rec.full) { return; }
      }

      var placed = [];
      /* 控えから読み戻す。値の並びは控えの順そのまま。 */
      for (var s = 0; s < a.length; s += 1) { placed.push(null); }
      var cursor = 0;
      var copy = a.slice();
      var offsets2 = [];
      total = 0;
      for (var c2 = 0; c2 < 10; c2 += 1) {
        offsets2.push(total);
        total += counts[c2];
      }
      copy.forEach(function (value) {
        var bucket2 = Math.floor(value / place) % 10;
        placed[offsets2[bucket2]] = value;
        offsets2[bucket2] += 1;
      });
      for (cursor = 0; cursor < a.length; cursor += 1) {
        a[cursor] = placed[cursor];
        rec.add({ type: "set", row: "main", i: cursor, value: a[cursor] });
        if (rec.full) { return; }
      }
      rec.add({ type: "auxClear" });
    }
    markAllSorted(a, rec);
  }

  /**
   * バケットソート。値の範囲で区切ったバケツへ配り、バケツの中を挿入ソートで整える。
   * 配った先がかたよると、ただの挿入ソートになる。
   */
  function bucket(a, rec) {
    var n = a.length;
    if (n === 0) { return; }
    var max = 0;
    a.forEach(function (v) { max = Math.max(max, v); });
    var bucketCount = Math.max(1, Math.ceil(n / 4));
    var width = max / bucketCount;

    function bucketOf(value) {
      return Math.min(bucketCount - 1, Math.floor((value - 1) / width));
    }

    var counts = [];
    for (var b = 0; b < bucketCount; b += 1) { counts.push(0); }
    for (var i = 0; i < n; i += 1) {
      rec.add({ type: "read", cells: [["main", i]] });
      counts[bucketOf(a[i])] += 1;
      if (rec.full) { return; }
    }
    var starts = [];
    var total = 0;
    for (var c = 0; c < bucketCount; c += 1) {
      starts.push(total);
      total += counts[c];
    }

    rec.add({ type: "auxInit", size: n, kind: "buckets" });
    var filled = starts.slice();
    var aux = [];
    for (var z = 0; z < n; z += 1) { aux.push(0); }

    for (var j = 0; j < n; j += 1) {
      var target = bucketOf(a[j]);
      var slot = filled[target];
      filled[target] += 1;
      aux[slot] = a[j];
      rec.add({ type: "read", cells: [["main", j]] });
      rec.add({ type: "set", row: "aux", i: slot, value: a[j] });
      if (rec.full) { return; }

      /* バケツの中だけを挿入ソートで整える。 */
      var at = slot;
      while (at > starts[target]) {
        rec.add({ type: "compare", cells: [["aux", at - 1], ["aux", at]] });
        if (rec.full) { return; }
        if (aux[at - 1] <= aux[at]) { break; }
        var tmp = aux[at - 1];
        aux[at - 1] = aux[at];
        aux[at] = tmp;
        rec.add({ type: "swap", row: "aux", i: at - 1, j: at });
        at -= 1;
      }
    }

    for (var k = 0; k < n; k += 1) {
      a[k] = aux[k];
      rec.add({ type: "set", row: "main", i: k, value: a[k] });
      rec.add({ type: "sorted", indices: [k] });
      if (rec.full) { return; }
    }
    rec.add({ type: "auxClear" });
  }

  /* --- 冗談の手法（続き） ---------------------------------------------- */

  /**
   * サノスソート。そろっていなければ、半分を消す。
   * 残ったものがそろうまで続ける。速いが、半分が消える。
   */
  function thanos(a, rec, random) {
    var alive = [];
    for (var i = 0; i < a.length; i += 1) { alive.push(i); }

    function aliveSorted() {
      for (var k = 0; k + 1 < alive.length; k += 1) {
        rec.compare(alive[k], alive[k + 1]);
        if (rec.full) { return false; }
        if (a[alive[k]] > a[alive[k + 1]]) { return false; }
      }
      return true;
    }

    while (!rec.full) {
      var ok = aliveSorted();
      rec.add({ type: "check", ok: ok });
      if (ok || alive.length <= 1) {
        alive.forEach(function (index) {
          rec.add({ type: "sorted", indices: [index] });
        });
        rec.add({ type: "note", key: "sort.note.thanosDone" });
        return;
      }
      /* 半分を無作為に選んで消す。 */
      var keepCount = Math.ceil(alive.length / 2);
      var kept = random.shuffle(alive).slice(0, keepCount);
      var keptSet = {};
      kept.forEach(function (index) { keptSet[index] = true; });
      var next = [];
      alive.forEach(function (index) {
        if (keptSet[index]) { next.push(index); }
        else { rec.add({ type: "remove", i: index }); }
      });
      next.sort(function (p, q) { return p - q; });
      alive = next;
    }
  }

  /**
   * ボゾソート。無作為に 2 か所選んで入れ替え、そろったか見る。
   * ボゴソートと同じくらい終わらないが、1 手の動きは小さい。
   */
  function bozo(a, rec, random) {
    function sortedNow() {
      for (var i = 0; i + 1 < a.length; i += 1) {
        rec.compare(i, i + 1);
        if (rec.full) { return false; }
        if (a[i] > a[i + 1]) { return false; }
      }
      return true;
    }

    while (!rec.full) {
      var ok = sortedNow();
      rec.add({ type: "check", ok: ok });
      if (ok) {
        markAllSorted(a, rec);
        rec.add({ type: "note", key: "sort.note.bozoDone" });
        return;
      }
      var i1 = Math.floor(random.next() * a.length);
      var i2 = Math.floor(random.next() * a.length);
      if (i1 !== i2) {
        swapInPlace(a, i1, i2);
        rec.add({ type: "swap", i: i1, j: i2 });
      }
    }
  }

  /**
   * 量子ボゴソート。1 回だけ混ぜ、そろっていなければ**その宇宙を捨てる**。
   * 生き残った宇宙では一度で終わるので O(n) だという冗談。
   */
  function quantum(a, rec, random) {
    var mixed = random.shuffle(a);
    for (var i = 0; i < mixed.length; i += 1) { a[i] = mixed[i]; }
    rec.add({ type: "shuffle", values: mixed.slice() });

    var ok = true;
    for (var k = 0; k + 1 < a.length; k += 1) {
      rec.compare(k, k + 1);
      if (rec.full) { return; }
      if (a[k] > a[k + 1]) { ok = false; break; }
    }
    rec.add({ type: "check", ok: ok });
    if (ok) {
      markAllSorted(a, rec);
      rec.add({ type: "note", key: "sort.note.quantumKept" });
    } else {
      rec.add({ type: "note", key: "sort.note.quantumDiscard" });
    }
  }

  /**
   * インテリジェントデザインソート。
   * 「この並びは、そうなるべくしてこうなっている」と宣言して終わる。
   * 1 手も動かさず 1 回も比べない。確定の印は付くが、そろってはいない。
   */
  function design(a, rec) {
    rec.add({ type: "note", key: "sort.note.designClaim" });
    markAllSorted(a, rec);
  }

  /* --- 手法の一覧 ------------------------------------------------------- */

  /* maxCount は手法ごとの要素数の上限。冗談の手法は終わらなくなるので低くする。
     limit は手順の上限。ボゴソートは混ぜる回数が多いため大きめに取る。 */
  var GROUPS = ["exchange", "insert", "select", "divide", "distribute", "joke"];

  var ALGORITHMS = [
    /* 交換 */
    { id: "bubble",    group: "exchange", maxCount: 64, run: bubble },
    { id: "cocktail",  group: "exchange", maxCount: 64, run: cocktail },
    { id: "gnome",     group: "exchange", maxCount: 48, run: gnome },
    { id: "comb",      group: "exchange", maxCount: 64, run: comb },
    { id: "pancake",   group: "exchange", maxCount: 48, run: pancake },

    /* 挿入 */
    { id: "insertion", group: "insert",   maxCount: 64, run: insertion },
    { id: "binary",    group: "insert",   maxCount: 64, run: binaryInsertion },
    { id: "shell",     group: "insert",   maxCount: 64, run: shell },

    /* 選択 */
    { id: "selection", group: "select",   maxCount: 64, run: selection },
    { id: "heap",      group: "select",   maxCount: 64, run: heap },
    { id: "cycle",     group: "select",   maxCount: 48, run: cycle },

    /* 分割統治 */
    { id: "merge",     group: "divide",   maxCount: 64, run: merge },
    { id: "quick",     group: "divide",   maxCount: 64, run: quick },
    { id: "stooge",    group: "divide",   maxCount: 32, run: stooge },

    /* 比べない */
    { id: "counting",  group: "distribute", maxCount: 48, run: counting },
    { id: "radix",     group: "distribute", maxCount: 64, run: radix },
    { id: "bucket",    group: "distribute", maxCount: 64, run: bucket },

    /* 冗談。終わらないものは要素数を低く抑える。 */
    { id: "stalin",    group: "joke", maxCount: 64, run: stalin },
    { id: "thanos",    group: "joke", maxCount: 64, needsRandom: true, run: thanos },
    /* unbounded: 終わりが事前に分からない手法。画面に総手数を出さない。
       何手で終わるかを先に見せると、「終わる保証がない」という性質そのものが
       伝わらなくなるため（代表者の指摘、2026-10-26）。 */
    { id: "bogo",      group: "joke", maxCount: 7,  limit: 60000, needsRandom: true, unbounded: true, run: bogo },
    { id: "bozo",      group: "joke", maxCount: 7,  limit: 60000, needsRandom: true, unbounded: true, run: bozo },
    { id: "quantum",   group: "joke", maxCount: 64, needsRandom: true, run: quantum },
    { id: "sleep",     group: "joke", maxCount: 64, run: sleep },
    { id: "miracle",   group: "joke", maxCount: 64, unbounded: true, run: miracle },
    { id: "design",    group: "joke", maxCount: 64, run: design }
  ];

  function get(id) {
    for (var i = 0; i < ALGORITHMS.length; i += 1) {
      if (ALGORITHMS[i].id === id) { return ALGORITHMS[i]; }
    }
    return null;
  }

  /** 1 から count までを 1 回ずつ使った、順番だけばらばらの列を作る */
  function values(options) {
    var count = Math.max(1, Math.floor(options.count));
    var list = [];
    for (var i = 1; i <= count; i += 1) { list.push(i); }
    return options.random ? options.random.shuffle(list) : list;
  }

  /**
   * 手順を作る。元の配列は変えない。
   * @returns {{steps:Array, truncated:boolean, finished:boolean, result:Array}}
   */
  function run(options) {
    var algorithm = get(options.id);
    if (!algorithm) { throw new Error("知らない手法: " + options.id); }
    var work = options.values.slice();
    var rec = recorder(algorithm.limit);
    algorithm.run(work, rec, options.random);
    if (!rec.truncated) { rec.add({ type: "done" }); }
    return {
      id: algorithm.id,
      steps: rec.steps,
      truncated: rec.truncated,
      finished: !rec.truncated,
      result: work
    };
  }

  /* --- 手順を状態へ畳み込む -------------------------------------------- */

  function cell(id, value) {
    return {
      id: id, value: value,
      sorted: false,
      removed: false,    /* 取り除かれて消えた（スターリン・サノス） */
      departed: false,   /* 出ていって別の行にいる（スリープ）。消えてはいない */
      mark: null
    };
  }

  /**
   * 最初から upTo 手だけ適用した状態を作る。
   *
   * 印（比べている・入れ替えた）は 1 手ごとに消す。最後の手で何が起きたかだけ
   * 見せたいため。確定（sorted）と取り除き（removed）は残す。
   */
  /** 手順を適用する前の、まっさらな状態 */
  function initial(values) {
    var main = values.map(function (value, index) {
      return cell("v" + index, value);
    });
    return {
      main: main,
      aux: null,
      auxLabel: null,
      range: null,
      pivotId: null,
      counts: {
        compare: 0, swap: 0, write: 0, remove: 0,
        shuffle: 0, check: 0, reverse: 0, read: 0
      },
      auxSerial: 0,
      note: null,
      checkedOk: null,
      done: false,
      cursor: 0
    };
  }

  /**
   * 状態へ 1 手だけ適用する（状態は書き換える）。
   *
   * 自動再生では 1 手ずつ進めるので、毎回最初から畳み込むと手順の数の 2 乗だけ
   * 時間がかかる。ボゴソートのように手順が数万になる手法で詰まるため、
   * 1 手進めるときはこの関数を使い、戻るときだけ replay() で作り直す。
   */
  function applyStep(state, step) {
    function clearMarks() {
      state.main.forEach(function (c) { c.mark = null; });
      if (state.aux) { state.aux.forEach(function (c) { c.mark = null; }); }
    }

    function rowOf(name) { return name === "aux" ? state.aux : state.main; }

    clearMarks();
    state.cursor += 1;

    if (true) {
      if (step.type === "compare" || step.type === "read") {
        /* read は「値を見た」だけで、2 つを比べてはいない。
           計数ソートや基数ソートが「一度も比べない」ことを数で示せるように、
           compare とは別に数える。画面での印は同じでよい。 */
        var isCompare = step.type === "compare";
        if (isCompare) { state.counts.compare += 1; }
        else { state.counts.read += 1; }
        step.cells.forEach(function (ref) {
          var row = rowOf(ref[0]);
          if (row && row[ref[1]]) {
            row[ref[1]].mark = isCompare ? "compare" : "read";
          }
        });

      } else if (step.type === "swap") {
        state.counts.swap += 1;
        var swapRow = rowOf(step.row);
        if (swapRow && swapRow[step.i] && swapRow[step.j]) {
          var tmp = swapRow[step.i];
          swapRow[step.i] = swapRow[step.j];
          swapRow[step.j] = tmp;
          swapRow[step.i].mark = "swap";
          swapRow[step.j].mark = "swap";
        }

      } else if (step.type === "reverse") {
        /* ひっくり返す。パンケーキソートの 1 手。 */
        state.counts.reverse += 1;
        var lo = step.lo;
        var hi = step.hi;
        while (lo < hi) {
          var held = state.main[lo];
          state.main[lo] = state.main[hi];
          state.main[hi] = held;
          lo += 1;
          hi -= 1;
        }
        for (var m = step.lo; m <= step.hi; m += 1) {
          if (state.main[m]) { state.main[m].mark = "swap"; }
        }

      } else if (step.type === "auxInit") {
        /* 控えの行を空（値 0）で用意する。埋まっていく様子を見せるため。 */
        state.auxSerial += 1;
        state.aux = [];
        for (var c = 0; c < step.size; c += 1) {
          state.aux.push(cell("aux" + state.auxSerial + "-" + c, 0));
        }
        state.auxLabel = { kind: step.kind || "buffer" };

      } else if (step.type === "set") {
        state.counts.write += 1;
        var target = rowOf(step.row);
        if (target && target[step.i]) {
          target[step.i].value = step.value;
          target[step.i].mark = "write";
        }

      } else if (step.type === "aux") {
        state.auxSerial += 1;
        state.aux = step.values.map(function (value, index) {
          return cell("aux" + state.auxSerial + "-" + index, value);
        });
        state.auxLabel = { lo: step.lo, hi: step.hi, kind: "buffer" };

      } else if (step.type === "auxClear") {
        state.aux = null;
        state.auxLabel = null;

      } else if (step.type === "emit") {
        /* 出ていった要素は控えの行へ移す。元の位置は空けておく。
           取り除かれた（removed）とは別に扱う。スリープソートは要素を
           消しているのではなく、出力へ移しているだけなので。 */
        var moved = state.main[step.i];
        if (moved && !moved.departed) {
          moved.departed = true;
          if (!state.aux) { state.aux = []; state.auxLabel = { kind: "output" }; }
          var copy = cell("out" + moved.id, moved.value);
          copy.sorted = true;
          copy.mark = "write";
          state.aux.push(copy);
        }

      } else if (step.type === "remove") {
        state.counts.remove += 1;
        if (state.main[step.i]) {
          state.main[step.i].removed = true;
          state.main[step.i].mark = "compare";
        }

      } else if (step.type === "shuffle") {
        state.counts.shuffle += 1;
        /* 混ぜた結果は値の列として渡される。位置と値を貼り替える。
           **全部の棒に印を付ける。** 2 つだけ光っていると、直前の比較と
           見分けがつかず、全体が動いたことが伝わらないため。 */
        step.values.forEach(function (value, index) {
          if (state.main[index]) {
            state.main[index].value = value;
            state.main[index].mark = "shuffle";
          }
        });

      } else if (step.type === "pivot") {
        state.pivotId = state.main[step.i] ? state.main[step.i].id : null;

      } else if (step.type === "range") {
        state.range = { lo: step.lo, hi: step.hi };

      } else if (step.type === "sorted") {
        step.indices.forEach(function (i) {
          if (state.main[i]) { state.main[i].sorted = true; }
        });

      } else if (step.type === "check") {
        state.counts.check += 1;
        state.checkedOk = step.ok;

      } else if (step.type === "note") {
        state.note = step.key;

      } else if (step.type === "done") {
        state.done = true;
        state.range = null;
        state.pivotId = null;
      }
    }

    return state;
  }

  /**
   * 最初から upTo 手だけ適用した状態を作る。
   *
   * 印（比べている・入れ替えた）は 1 手ごとに消す。最後の手で何が起きたかだけ
   * 見せたいため。確定（sorted）と取り除き（removed）は残す。
   */
  function replay(options) {
    var upTo = options.upTo === undefined ? options.steps.length : options.upTo;
    var state = initial(options.values);
    for (var i = 0; i < upTo && i < options.steps.length; i += 1) {
      applyStep(state, options.steps[i]);
    }
    return state;
  }

  /** 並びがそろっているか（取り除かれた要素は飛ばす） */
  function isSorted(list) {
    for (var i = 0; i + 1 < list.length; i += 1) {
      if (list[i] > list[i + 1]) { return false; }
    }
    return true;
  }

  /** 状態から、画面に残っている値の列を取り出す */
  function visibleValues(state) {
    var out = [];
    state.main.forEach(function (c) {
      if (!c.removed && !c.departed) { out.push(c.value); }
    });
    if (state.auxLabel && state.auxLabel.kind === "output" && state.aux) {
      state.aux.forEach(function (c) { out.push(c.value); });
    }
    return out;
  }

  JsDemo.Sorts = {
    ALGORITHMS: ALGORITHMS,
    GROUPS: GROUPS,
    byGroup: function (group) {
      return ALGORITHMS.filter(function (a) { return a.group === group; });
    },
    get: get,
    values: values,
    run: run,
    initial: initial,
    applyStep: applyStep,
    replay: replay,
    isSorted: isSorted,
    visibleValues: visibleValues
  };
})(typeof window !== "undefined" ? window : globalThis);
