/*!
 * js-demo / ui — i18n.js
 * JavaScript が組み立てる文言の日本語版と英語版。
 *
 * ページに固定で書ける文は HTML 側に置き、ここには入れない。
 * ここにあるのは「状態によって変わる文字列」だけ。
 * 言語は <html lang> から読むので、ページごとに辞書を切り替える必要はない。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  var DICT = {
    ja: {
      "phase.assign": "点を最も近い中心へ割り当てる",
      "phase.update": "中心をクラスタの平均へ動かす",
      "phase.done": "収束した（これ以上は変わらない）",
      "phase.next": "次に起きること",

      "status.iteration": "反復",
      "status.phase": "いまの段階",
      "status.changed": "割当が変わった点",
      "status.maxShift": "中心の最大移動量",
      "status.inertia": "距離の2乗和",
      "status.seed": "乱数の種",
      "status.notStarted": "まだ割り当てていない",
      "status.converged": "収束",
      "status.convergedYes": "した",
      "status.convergedNo": "していない",
      "status.emptyCluster": "空のクラスタがあったため、最も遠い点へ中心を移した: ",
      "status.points": "点の数",
      "status.clusters": "クラスタ数 k",

      "share.title": "授業で共有する",
      "share.help": "このリンクを開くと、いまの条件（種・クラスタ数・点の数・塊の数）で同じ初期状態から始まります。個人情報は含まれません。",
      "share.copy": "リンクをコピー",
      "share.copied": "コピーしました",
      "share.copyFailed": "自動でコピーできませんでした。選択してあるので、そのまま複写してください",
      "button.step": "次へ進む",
      "button.stepBack": "一手戻る",
      "button.runToEnd": "収束まで進める",
      "button.reset": "初期化",
      "button.stepDone": "収束済み",

      "table.clusters": "クラスタの内訳",
      "table.cluster": "クラスタ",
      "table.size": "点の数",
      "table.centroidX": "中心 x",
      "table.centroidY": "中心 y",
      "table.combined": "合成行列（右の行列が先に効く）",
      "table.determinant": "左上 2×2 の行列式",

      "matrix.linear": "一次変換 L",
      "matrix.translation": "平行移動 T",
      "matrix.rotation": "回転 R(θ)",
      "matrix.translateToOrigin": "平行移動 T(−c)",
      "matrix.rotate": "回転 R(θ)",
      "matrix.translateBack": "平行移動 T(c)",

      "figure.plane": "座標平面。元のグリッドと変換後のグリッド、基底ベクトル、図形を表示している。",
      "figure.scatter": "散布図。点はクラスタごとに色と形を変え、中心は番号付きの大きな記号で示している。",

      "legend.original": "元の図形（破線）",
      "legend.transformed": "変換後の図形（実線）",
      "legend.basisX": "基底 e₁ の像",
      "legend.basisY": "基底 e₂ の像",
      "legend.pivot": "回転の中心",
      "legend.unassigned": "未割当の点",
      "legend.centroid": "クラスタの中心（番号付き）",

      "tool.draw": "描画",
      "tool.none": "なし",
      "tool.line": "線（2点）",
      "tool.circle": "円（中心→外周）",
      "tool.rect": "四角形（対角2点）",
      "tool.free": "自由曲線（ドラッグ）",
      "tool.clear": "消す",
      "tool.hint": "図の上をクリックまたはドラッグすると図形を描けます。描いた図形も同じ行列で変換されます。"
    },

    en: {
      "phase.assign": "Assign each point to its nearest centroid",
      "phase.update": "Move each centroid to the mean of its cluster",
      "phase.done": "Converged — nothing more will change",
      "phase.next": "What happens next",

      "status.iteration": "Iteration",
      "status.phase": "Current step",
      "status.changed": "Points that changed cluster",
      "status.maxShift": "Largest centroid move",
      "status.inertia": "Sum of squared distances",
      "status.seed": "Random seed",
      "status.notStarted": "Not assigned yet",
      "status.converged": "Converged",
      "status.convergedYes": "yes",
      "status.convergedNo": "no",
      "status.emptyCluster": "A cluster was empty, so its centroid moved to the farthest point: ",
      "status.points": "Number of points",
      "status.clusters": "Clusters k",

      "share.title": "Share with a class",
      "share.help": "Opening this link starts from the same initial state: the seed, the number of clusters, points and blobs. It contains no personal data.",
      "share.copy": "Copy the link",
      "share.copied": "Copied",
      "share.copyFailed": "Could not copy automatically. The text is selected, so copy it by hand",
      "button.step": "Next step",
      "button.stepBack": "Back one step",
      "button.runToEnd": "Run to convergence",
      "button.reset": "Reset",
      "button.stepDone": "Converged",

      "table.clusters": "Cluster breakdown",
      "table.cluster": "Cluster",
      "table.size": "Points",
      "table.centroidX": "Centroid x",
      "table.centroidY": "Centroid y",
      "table.combined": "Combined matrix (the rightmost acts first)",
      "table.determinant": "Determinant of the top-left 2×2",

      "matrix.linear": "Linear transform L",
      "matrix.translation": "Translation T",
      "matrix.rotation": "Rotation R(θ)",
      "matrix.translateToOrigin": "Translation T(−c)",
      "matrix.rotate": "Rotation R(θ)",
      "matrix.translateBack": "Translation T(c)",

      "figure.plane": "Coordinate plane showing the original grid, the transformed grid, the basis vectors and the shape.",
      "figure.scatter": "Scatter plot. Points use a different colour and marker per cluster; centroids are larger numbered markers.",

      "legend.original": "Original shape (dashed)",
      "legend.transformed": "Transformed shape (solid)",
      "legend.basisX": "Image of basis e₁",
      "legend.basisY": "Image of basis e₂",
      "legend.pivot": "Centre of rotation",
      "legend.unassigned": "Unassigned point",
      "legend.centroid": "Cluster centroid (numbered)",

      "tool.draw": "Draw",
      "tool.none": "Off",
      "tool.line": "Line (2 clicks)",
      "tool.circle": "Circle (centre, then edge)",
      "tool.rect": "Rectangle (2 opposite corners)",
      "tool.free": "Freehand (drag)",
      "tool.clear": "Clear",
      "tool.hint": "Click or drag on the figure to draw. Anything you draw is transformed by the same matrix."
    }
  };

  /** <html lang> から言語を決める。未知の値は日本語として扱う。 */
  function detectLanguage() {
    var lang = (document.documentElement.getAttribute("lang") || "ja").toLowerCase();
    return lang.indexOf("en") === 0 ? "en" : "ja";
  }

  var current = detectLanguage();

  /**
   * 文言を引く。{name} は vars の値に置き換える。
   * 辞書に無い鍵は鍵そのものを返す（画面で気づけるように）。
   */
  function t(key, vars) {
    var table = DICT[current] || DICT.ja;
    var text = table[key];
    if (text === undefined) { return key; }
    if (!vars) { return text; }
    return text.replace(/\{(\w+)\}/g, function (match, name) {
      return vars[name] === undefined ? match : String(vars[name]);
    });
  }

  JsDemo.I18n = {
    t: t,
    get language() { return current; },
    setLanguage: function (lang) { current = lang === "en" ? "en" : "ja"; },
    detectLanguage: detectLanguage,
    dictionary: DICT
  };
})(window);
