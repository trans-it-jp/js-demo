// 一次変換＋平行移動ページ
document.addEventListener('DOMContentLoaded', () => {
  const { mat, init } = window.TransformDemo;

  function compute() {
    const sx  = parseFloat(document.getElementById('scaleX').value);
    const sy  = parseFloat(document.getElementById('scaleY').value);
    const shx = parseFloat(document.getElementById('shearX').value);
    const shy = parseFloat(document.getElementById('shearY').value);
    const tx  = parseFloat(document.getElementById('tx').value);
    const ty  = parseFloat(document.getElementById('ty').value);

    // 一次変換 L（シア→スケールの順に適用したい場合は順序を入れ替え）
    const L = mat.multiplyAll([ mat.scale(sx, sy), mat.shear(shx, shy) ]);

    // 平行移動 T
    const T = mat.translation(tx, ty);

    // 合成: 「一次変換 → 平行移動」の順で適用（列ベクトル想定）
    const combined = mat.multiplyAll([ T, L ]);

    return {
      namedMatrices: [
        { name: "一次変換 L", M: L },
        { name: "平行移動 T", M: T },
      ],
      combined,
    };
  }

  init({
    grid: [-10, 10],
    compute,
  });
});
