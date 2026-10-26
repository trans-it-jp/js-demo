/*!
 * js-demo / sorting — app.js
 * ソートデモの画面側。日本語版と英語版の両方から読み込む。
 * 文言は js/ui/i18n.js が <html lang> を見て切り替えるので、このファイルは 1 つで足りる。
 *
 * 決めごと:
 *   - 手順は js/sorting/sorts.js が作る。画面側は「何手目か」だけを持つ。
 *     自動再生も 1 手ずつも同じ手順の列を見るので、見え方が食い違わない。
 *   - 最初の並びは毎回ちがう（完全な乱数）。初期化を押すたびに選び直す。
 *   - **手法を変えても並びは変えない。** 同じ並びで手法を比べられるようにするため。
 *     要素の数を変えたときと初期化のときだけ、新しい並びにする。
 *   - 複数選ぶと**同じ並びを全部に配って同時に 1 手ずつ**進める。
 *     1 手の重さは手法ごとに違うので、これは速さ比べではない（画面にも明記する）。
 */
(function () {
  "use strict";

  var Sorts = JsDemo.Sorts;
  var Bars = JsDemo.Bars;
  var Random = JsDemo.Random;
  var Numeric = JsDemo.Numeric;
  var Controls = JsDemo.Controls;
  var Tables = JsDemo.Tables;
  var ShareLink = JsDemo.ShareLink;
  var Learning = JsDemo.Learning;
  var t = JsDemo.I18n.t;

  var ALGORITHMS = Sorts.ALGORITHMS;

  /* 同時に動かせる数。これ以上並べると 1 つ 1 つが小さくなって読めない。 */
  var MAX_TRACKS = 6;

  /* 要素数の上限。入力欄の max と揃える。 */
  var COUNT_MAX = 64;

  /* 図を横に何列並べるかの既定値。入力欄の初期値と揃える。 */
  var COLUMNS_DEFAULT = 2;

  /* URL へ載せるのは数値だけ。手法の組み合わせは 2 進の桁で表す
     （1 番目の手法が 1、2 番目が 2、3 番目が 4 …の合計）。自由入力は受け取らない。
     要素数の範囲は入力欄から読む。書き写すと画面と食い違ったときに
     共有した値が黙って変わるため、出どころを 1 つにしておく。 */
  var SHARE_SPEC = null;

  var tracks = [];          /* 動かしている手法ごとの状態 */
  var values = [];          /* 全部に配る並び */
  var requestedCount = 10;  /* 利用者が指定した数。手法の上限で切る前の値。
                               入力欄の既定値と揃える（ShareLink がそこから読む） */
  var mode = "auto";
  var timer = null;
  var hints = null;

  /* --- 選ばれているもの ------------------------------------------------ */

  function selectedIds() {
    var ids = [];
    ALGORITHMS.forEach(function (a) {
      var box = document.getElementById("algo-" + a.id);
      if (box && box.checked) { ids.push(a.id); }
    });
    return ids;
  }

  function setSelected(ids) {
    var wanted = {};
    ids.forEach(function (id) { wanted[id] = true; });
    ALGORITHMS.forEach(function (a) {
      var box = document.getElementById("algo-" + a.id);
      if (box) { box.checked = wanted[a.id] === true; }
    });
  }

  /** 選んだ手法の中でいちばん小さい上限。終わらない手法に合わせる。 */
  function allowedCount(ids) {
    var max = COUNT_MAX;
    ids.forEach(function (id) {
      max = Math.min(max, Sorts.get(id).maxCount);
    });
    return max;
  }

  /** 上限を決めている手法。理由を画面に書くために使う。 */
  function limitingId(ids) {
    var chosen = ids[0];
    var max = COUNT_MAX;
    ids.forEach(function (id) {
      if (Sorts.get(id).maxCount < max) {
        max = Sorts.get(id).maxCount;
        chosen = id;
      }
    });
    return chosen;
  }

  function speed() {
    return Numeric.readNumber(Controls.byId("speed").value,
                              { min: 10, max: 1200, integer: true });
  }

  /* --- 組み立て -------------------------------------------------------- */

  /**
   * 新しい並びを選ぶ。
   * 画面を開くたび、初期化のたびに違う並びにするため、種だけは真の乱数を使う。
   * そこから先は JsDemo.Random に任せるので、同じ種なら同じ並びになる。
   */
  function newValues(count) {
    var seed = Math.floor(Math.random() * 1e9);
    return Sorts.values({ count: count, random: Random.create(seed) });
  }

  function build(options) {
    var opts = options || {};
    stop();

    var ids = selectedIds();
    var over = ids.length > MAX_TRACKS;
    if (over) { ids = ids.slice(0, MAX_TRACKS); }

    var limit = allowedCount(ids);
    var count = Math.min(requestedCount, limit);

    /* 入力欄の上限も選択に合わせる。上限より大きい値を入れても黙って
       戻されるだけだと「指定できない」ように見えるため、動かせる範囲を
       入力欄そのもので示し、理由を添える。 */
    var slider = Controls.byId("count");
    var number = Controls.byId("count-num");
    slider.max = limit;
    number.max = limit;
    slider.value = count;
    number.value = count;

    var limitNote = Controls.byId("count-limit");
    if (limitNote) {
      limitNote.textContent = limit < COUNT_MAX
        ? t("sort.count.limit", { max: limit, name: t("sort.name." + limitingId(ids)) })
        : t("sort.count.range");
    }

    if (opts.fresh || values.length !== count) { values = newValues(count); }

    tracks = ids.map(function (id) {
      return {
        id: id,
        plan: Sorts.run({
          id: id,
          values: values,
          /* 混ぜ直す手法のための乱数。手順を作るたびに選び直す。 */
          random: Random.create(Math.floor(Math.random() * 1e9))
        }),
        state: Sorts.initial(values),
        cursor: 0,
        bars: null,
        meta: null,
        counters: null
      };
    });

    tracks.forEach(function (track) { track.counters = deriveCounters(track); });

    buildTrackElements();
    showNotices({ over: over, limited: requestedCount > limit, limit: limit });
    refreshShareLink();
    render({ animate: false });
  }

  /** 手法ごとの枠（見出し・図・数値）を作り直す */
  /** 列数と説明の表示を #tracks の見た目へ反映する */
  function applyLayout() {
    var host = Controls.byId("tracks");
    var columns = Numeric.readNumber(Controls.byId("columns").value,
                                     { min: 1, max: 4, integer: true });
    host.style.setProperty("--track-columns", columns);

    var notes = Controls.byId("show-notes");
    var bare = notes ? !notes.checked : false;
    host.className = "tracks" +
      (tracks.length === 1 ? " is-single" : "") +
      (bare ? " is-bare" : "");
  }

  function buildTrackElements() {
    var host = Controls.byId("tracks");
    host.textContent = "";
    applyLayout();

    tracks.forEach(function (track) {
      var section = document.createElement("section");
      section.className = "track";

      var title = document.createElement("h3");
      title.className = "track__title";
      title.textContent = t("sort.name." + track.id);
      section.appendChild(title);

      /* 名前の由来。何をする手法かが名前と結びつくと覚えやすい。 */
      var origin = document.createElement("p");
      origin.className = "track__origin";
      origin.textContent = t("sort.origin." + track.id);
      section.appendChild(origin);

      var plot = document.createElement("div");
      plot.className = "plot track__plot";
      section.appendChild(plot);

      var meta = document.createElement("dl");
      meta.className = "readout track__meta";
      section.appendChild(meta);

      host.appendChild(section);

      track.bars = Bars.create({
        container: plot,
        labels: { figure: t("sort.name." + track.id) + " — " + t("figure.bars") }
      });
      track.meta = meta;
    });
  }

  /* --- 進める・戻る ---------------------------------------------------- */

  function trackAtEnd(track) { return track.cursor >= track.plan.steps.length; }

  /**
   * まだ進められるか。
   * 終わりが分からない手法は手順を作り置きしていないので、
   * 「いまある手順を使い切った」ことと「終わった」ことは別。
   */
  function canAdvance(track) {
    if (!trackAtEnd(track)) { return true; }
    return track.plan.lazy && !track.plan.finished && !track.plan.truncated;
  }

  /** 終わりが事前に分からない手法か */
  function isUnbounded(track) {
    return Sorts.get(track.id).unbounded === true;
  }

  /**
   * 進み具合の表し方。
   * 終わりが分からない手法では分母を出さない。何手で終わるかを先に見せると、
   * 「終わる保証がない」という性質そのものが伝わらないため。
   */
  /**
   * 進み具合は「いま何手目か」だけを出す。
   * 終わりまでの手数は出さない（代表者の指示、2026-10-26）。
   * 終わりが分からない手法ではそもそも存在せず、分かる手法でも、
   * 手法どうしを比べる材料になるのは比べた回数と動かした回数のほう。
   */
  function progressText(track) {
    return String(track.cursor);
  }

  function allAtEnd() {
    if (tracks.length === 0) { return true; }
    return !tracks.some(canAdvance);
  }

  function anyStarted() {
    return tracks.some(function (track) { return track.cursor > 0; });
  }

  /** 1 手進める。状態は書き換えるだけで作り直さない（手順が多いと重くなるため）。 */
  function forward() {
    var moved = false;
    tracks.forEach(function (track) {
      /* 終わりが分からない手法は、ここで次の 1 手を作る。
         先に作っておくと終わりの手数が分かってしまうため。 */
      track.plan.ensure(track.cursor + 1);
      if (trackAtEnd(track)) { return; }
      Sorts.applyStep(track.state, track.plan.steps[track.cursor]);
      track.cursor += 1;
      moved = true;
    });
    return moved;
  }

  /** 戻るときは最初から畳み込んで作り直す。 */
  function seekBack(target) {
    tracks.forEach(function (track) {
      var to = Numeric.clamp(target(track), 0, track.plan.steps.length);
      track.state = Sorts.replay({
        values: values, steps: track.plan.steps, upTo: to
      });
      track.cursor = to;
    });
  }

  function stepForward() {
    if (forward()) { render({ animate: true }); }
  }

  function stepBack() {
    if (!anyStarted()) { return; }
    seekBack(function (track) { return track.cursor - 1; });
    render({ animate: true });
  }

  /* 一度に進める上限。終わらない手法があるので、無制限には進めない。 */
  var RUN_BUDGET = 4000;

  function toEnd() {
    stop();
    var unfinished = false;
    tracks.forEach(function (track) {
      var budget = RUN_BUDGET;
      while (budget > 0) {
        track.plan.ensure(track.cursor + 1);
        if (trackAtEnd(track)) { break; }
        Sorts.applyStep(track.state, track.plan.steps[track.cursor]);
        track.cursor += 1;
        budget -= 1;
      }
      if (canAdvance(track)) { unfinished = true; }
    });
    render({ animate: false });
    if (unfinished) {
      Controls.byId("notice").textContent =
        t("sort.msg.stillRunning", { steps: RUN_BUDGET });
    }
  }

  function restart() {
    seekBack(function () { return 0; });
  }

  /* --- 自動再生 -------------------------------------------------------- */

  function playing() { return timer !== null; }

  function tick() {
    if (!forward()) { stop(); render({ animate: false }); return; }
    render({ animate: true });
  }

  function play() {
    if (playing() || tracks.length === 0) { return; }
    if (allAtEnd()) { restart(); }
    timer = window.setInterval(tick, speed());
    updateButtons();
  }

  function stop() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    updateButtons();
  }

  function togglePlay() {
    if (playing()) { stop(); render({ animate: false }); } else { play(); }
  }

  /* --- 共有用のリンク -------------------------------------------------- */

  /** 選んだ手法を 2 進の桁の合計で表す */
  function selectionMask() {
    var mask = 0;
    var chosen = {};
    tracks.forEach(function (track) { chosen[track.id] = true; });
    ALGORITHMS.forEach(function (a, index) {
      if (chosen[a.id]) { mask += Math.pow(2, index); }
    });
    return mask;
  }

  function idsFromMask(mask) {
    var ids = [];
    ALGORITHMS.forEach(function (a, index) {
      if (Math.floor(mask / Math.pow(2, index)) % 2 === 1) { ids.push(a.id); }
    });
    return ids;
  }

  function shareValues() {
    return { a: selectionMask(), n: values.length };
  }

  function refreshShareLink() {
    var current = shareValues();
    ShareLink.sync(current, SHARE_SPEC);
    ShareLink.refreshField("share-url", current, SHARE_SPEC);
  }

  /* --- 描画 ------------------------------------------------------------ */

  function render(options) {
    var opts = options || {};
    /* 動かす時間は 1 手の間より短くする。間に合わないと動きが途切れて見える。 */
    var duration = Math.max(60, Math.min(260, Math.round(speed() * 0.8)));

    tracks.forEach(function (track) {
      var label = track.state.auxLabel;
      track.bars.render(track.state, {
        animate: opts.animate !== false,
        duration: duration,
        /* 控えの行を使う手法は、使っていない間も 2 段ぶんの高さを取る。
           段が増えるたびに図の高さが変わると下の図がずれるため。 */
        reserveAux: Sorts.get(track.id).aux === true,
        auxLabel: label ? t("sort.aux." + label.kind) : ""
      });
      renderTrackMeta(track);
      track.bars.setAriaLabel(
        t("sort.name." + track.id) + " — " + t("figure.bars") + " " +
        t("sort.status.progress") + ": " + progressText(track)
      );
    });

    renderCompareTable();
    renderValueTable();
    updateButtons();
    announce();
  }

  function visibleOf(track) { return Sorts.visibleValues(track.state); }

  /* 数え上げのうち、手法ごとに出すもの。
     **手順が進んでも行数を変えない。** 行が増えると数値欄の高さが変わり、
     その下に並ぶ図の位置がずれるため（代表者の指摘、2026-10-26）。
     どれを出すかは、その手法が実際に使う手順の種類から一度だけ決める。 */
  var COUNTER_BY_STEP = [
    ["read", "read", "sort.status.read"],
    ["set", "write", "sort.status.write"],
    ["reverse", "reverse", "sort.status.reverse"],
    ["remove", "remove", "sort.status.remove"],
    ["shuffle", "shuffle", "sort.status.shuffle"],
    ["check", "check", "sort.status.check"]
  ];

  function deriveCounters(track) {
    /* 終わりが分からない手法は手順をまだ作っていないので、
       種類を見るぶんだけ先に作る（終わりまでは作らない）。 */
    if (track.plan.lazy) { track.plan.ensure(12); }

    var seen = {};
    track.plan.steps.forEach(function (step) { seen[step.type] = true; });

    var keys = [];
    COUNTER_BY_STEP.forEach(function (entry) {
      if (seen[entry[0]]) { keys.push([entry[1], entry[2]]); }
    });
    return { keys: keys, lossy: seen.remove === true };
  }

  /** その手法で意味のある数え上げを並べる。行数は常に同じ。 */
  function metaRows(track) {
    var counts = track.state.counts;
    var rows = [
      { label: t("sort.status.progress"), value: progressText(track) },
      { label: t("sort.status.compare"), value: String(counts.compare) },
      { label: t("sort.status.swap"), value: String(counts.swap) }
    ];
    track.counters.keys.forEach(function (pair) {
      rows.push({ label: t(pair[1]), value: String(counts[pair[0]]) });
    });

    var list = visibleOf(track);
    if (track.counters.lossy) {
      rows.push({
        label: t("sort.status.kept"),
        value: list.length + " / " + values.length
      });
    }
    rows.push({
      label: t("sort.status.sorted"),
      value: Sorts.isSorted(list)
        ? t("sort.status.sortedYes") : t("sort.status.sortedNo")
    });
    /* 説明の行は、出す内容が無くても場所を空けておく。 */
    rows.push({ label: "—", value: track.state.note ? t(track.state.note) : "—" });
    return rows;
  }

  function renderTrackMeta(track) {
    var meta = track.meta;
    meta.textContent = "";
    metaRows(track).forEach(function (row) {
      var dt = document.createElement("dt");
      dt.textContent = row.label;
      var dd = document.createElement("dd");
      dd.textContent = row.value;
      meta.appendChild(dt);
      meta.appendChild(dd);
    });
  }

  /** 手法どうしを数で見比べる表。図を見なくてもここで比べられる。 */
  function renderCompareTable() {
    var container = Controls.byId("compare-table");
    if (tracks.length < 2) { container.textContent = ""; return; }
    var rows = tracks.map(function (track) {
      var list = visibleOf(track);
      return [
        t("sort.name." + track.id),
        progressText(track),
        String(track.state.counts.compare),
        String(track.state.counts.swap + track.state.counts.reverse),
        Sorts.isSorted(list)
          ? t("sort.status.sortedYes") : t("sort.status.sortedNo")
      ];
    });
    Tables.renderTable(container, {
      caption: t("sort.race.table"),
      columns: [t("sort.race.algorithm"), t("sort.status.progress"),
                t("sort.status.compare"), t("sort.status.swap"),
                t("sort.status.sorted")],
      rows: rows
    });
  }

  /** 先頭の手法の中身を数字で並べる。図の代わりに読める形。 */
  function renderValueTable() {
    var container = Controls.byId("value-table");
    if (tracks.length === 0) { container.textContent = ""; return; }
    var track = tracks[0];
    var rows = track.state.main.map(function (cell, index) {
      return [
        String(index + 1),
        String(cell.value),
        t("sort.state." + Bars.statusOf(cell, track.state.pivotId))
      ];
    });
    Tables.renderTable(container, {
      caption: t("sort.name." + track.id),
      columns: [t("table.position"), t("table.value"), t("table.state")],
      rows: rows
    });
  }

  function showNotices(info) {
    var messages = [];
    if (tracks.length === 0) { messages.push(t("sort.msg.pickOne")); }
    if (info.over) { messages.push(t("sort.msg.tooMany", { max: MAX_TRACKS })); }
    if (info.limited) {
      messages.push(t("sort.msg.countLimited", { max: info.limit }));
    }
    var truncated = tracks.some(function (track) { return track.plan.truncated; });
    if (truncated) { messages.push(t("sort.msg.truncated")); }
    var lossy = tracks.some(function (track) {
      /* 終わりが分からない手法は手順がまだ無いので、手法の性質で見る。 */
      if (track.plan.lazy) { return false; }
      return track.plan.result.length !== values.length ||
        track.plan.steps.some(function (step) { return step.type === "remove"; });
    });
    if (lossy) { messages.push(t("sort.msg.lost")); }
    Controls.byId("notice").textContent = messages.join(" ");
  }

  function updateButtons() {
    var manual = mode === "manual";
    var empty = tracks.length === 0;
    var playButton = Controls.byId("play");

    playButton.disabled = manual || empty;
    playButton.textContent = playing()
      ? t("button.pause")
      : (allAtEnd() && anyStarted() ? t("button.replay") : t("button.play"));

    Controls.byId("step").disabled = !manual || empty || allAtEnd();
    Controls.byId("step-back").disabled = !manual || empty || !anyStarted();
    var toEnd = Controls.byId("to-end");
    toEnd.disabled = empty || allAtEnd();
    /* 終わりが分からない手法を選んでいるときは「最後まで」と言わない。
       終わりがあることを前提にした言い方になってしまうため。 */
    var anyUnbounded = tracks.some(isUnbounded);
    toEnd.textContent = anyUnbounded ? t("button.toLimit") : t("button.toEnd");
  }

  /** 何が起きたかを読み上げへ伝える。図を見ていなくても追えるようにする。 */
  function announce() {
    if (tracks.length === 0) { Controls.announce("live", t("sort.msg.pickOne")); return; }
    var parts = [];
    if (tracks.length > 1) {
      parts.push(tracks.length + " / " + t("sort.status.progress") + " " +
                 tracks[0].cursor);
    }
    tracks.forEach(function (track) {
      var piece = tracks.length > 1 ? t("sort.name." + track.id) + ": " : "";
      piece += t("sort.status.compare") + " " + track.state.counts.compare +
               " / " + t("sort.status.swap") + " " + track.state.counts.swap;
      if (track.state.note) { piece += " / " + t(track.state.note); }
      if (trackAtEnd(track)) { piece += " / " + t("sort.race.done"); }
      parts.push(piece);
    });
    Controls.announce("live", parts.join(" // "));
  }

  /* --- 手法の一覧（分類ごとに折りたたむ） ------------------------------ */

  function renderPicker() {
    var host = Controls.byId("picker");
    host.textContent = "";

    Sorts.GROUPS.forEach(function (group, index) {
      /* <details> を使う。JavaScript が動かないときも開けるため。
         最初の分類と冗談の分類は開いておく。 */
      var box = document.createElement("details");
      box.className = "picker__group";
      box.open = index === 0 || group === "joke";

      var summary = document.createElement("summary");
      summary.className = "picker__summary";
      var name = document.createElement("span");
      name.className = "picker__summaryName";
      name.textContent = t("sort.group." + group);
      var note = document.createElement("span");
      note.className = "picker__note";
      note.textContent = t("sort.group.note." + group);
      summary.appendChild(name);
      summary.appendChild(note);
      box.appendChild(summary);

      var list = document.createElement("div");
      list.className = "picker__list";

      Sorts.byGroup(group).forEach(function (a) {
        var label = document.createElement("label");
        label.className = "picker__item";

        var input = document.createElement("input");
        input.type = "checkbox";
        input.id = "algo-" + a.id;
        input.value = a.id;
        input.addEventListener("change", function () {
          /* 手法の選び直しでは並びを変えない。同じ並びで比べられるようにする。 */
          build({ fresh: false });
        });

        var text = document.createElement("span");
        var title = document.createElement("strong");
        title.textContent = t("sort.name." + a.id);
        /* 計算量を名前の隣に出す。どれが重いかを選ぶ前に見られるようにする。 */
        var cost = document.createElement("span");
        cost.className = "picker__cost";
        cost.textContent = t("sort.cost." + a.id);
        var desc = document.createElement("span");
        desc.className = "picker__note";
        desc.textContent = t("sort.desc." + a.id);
        text.appendChild(title);
        text.appendChild(cost);
        text.appendChild(desc);

        label.appendChild(input);
        label.appendChild(text);
        list.appendChild(label);
      });

      box.appendChild(list);
      host.appendChild(box);
    });
  }

  function renderLegend() {
    var list = Controls.byId("legend");
    if (!list) { return; }
    list.textContent = "";
    ["idle", "read", "compare", "swap", "shuffle", "write", "pivot",
     "sorted", "departed", "removed"]
      .forEach(function (status) {
        var li = document.createElement("li");

        var swatch = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        swatch.setAttribute("width", "14");
        swatch.setAttribute("height", "14");
        swatch.setAttribute("aria-hidden", "true");
        var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("width", "14");
        rect.setAttribute("height", "14");
        rect.setAttribute("fill", Bars.FILL[status]);
        if (status === "removed") {
          rect.setAttribute("stroke", "var(--bar-removed-edge)");
        }
        swatch.appendChild(rect);

        var mark = document.createElement("span");
        mark.className = "legend__mark";
        mark.textContent = Bars.MARKS[status] || "";

        var text = document.createElement("span");
        text.textContent = t("sort.state." + status);

        li.appendChild(swatch);
        li.appendChild(mark);
        li.appendChild(text);
        list.appendChild(li);
      });
  }

  /* --- 立ち上げ -------------------------------------------------------- */

  function init() {
    renderPicker();
    renderLegend();

    SHARE_SPEC = ShareLink.specFromControls([
      { param: "n", control: "count", integer: true }
    ]);
    /* 手法の組み合わせは 2 進の桁の合計。25 種なので上限は 2^25 − 1。 */
    SHARE_SPEC.a = {
      min: 1,
      max: Math.pow(2, ALGORITHMS.length) - 1,
      step: 1,
      integer: true,
      fallback: 1
    };

    var shared = ShareLink.read(SHARE_SPEC);
    var ids = idsFromMask(shared.a);
    if (ids.length === 0) { ids = [ALGORITHMS[0].id]; }
    setSelected(ids.slice(0, MAX_TRACKS));
    requestedCount = shared.n;

    Controls.bindPair("count", function (value) {
      requestedCount = Math.round(value);
      /* 数が変わったら並びも作り直す（同じ数の並びを使い回さない）。 */
      build({ fresh: true });
    });
    Controls.bindPair("speed", function () {
      /* 再生中に速さを変えたら、新しい間隔で動かし直す。 */
      if (playing()) { stop(); play(); }
    });
    Controls.bindPair("columns", applyLayout);

    var notes = Controls.byId("show-notes");
    if (notes) { notes.addEventListener("change", applyLayout); }

    Controls.bindModeButtons("modes", mode, function (next) {
      mode = next;
      stop();
      updateButtons();
    });

    Controls.byId("play").addEventListener("click", togglePlay);
    Controls.byId("step").addEventListener("click", stepForward);
    Controls.byId("step-back").addEventListener("click", stepBack);
    Controls.byId("to-end").addEventListener("click", toEnd);
    Controls.byId("reset").addEventListener("click", function () {
      if (hints) { hints.reset(); }
      build({ fresh: true });
    });

    ShareLink.wireField({
      field: "share-url", button: "share-copy", status: "share-status"
    });

    /* この画面では予想の欄を置かない（代表者の指示、2026-10-26）。
       学習設計の 6 段階のうち「予想」が抜ける形になる。 */
    hints = Learning.wireHints("hints");
    Learning.wireWording({ controls: "wording" });

    build({ fresh: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
