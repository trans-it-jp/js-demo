// 任意点中心の回転ページ（3行列を表示: T(c)・R(θ)・T(-c)）
document.addEventListener('DOMContentLoaded', () => {
  const { mat, init } = window.TransformDemo;

  function compute() {
    const cx  = parseFloat(document.getElementById('cx').value);
    const cy  = parseFloat(document.getElementById('cy').value);
    const deg = parseFloat(document.getElementById('deg').value);
    const rad = deg * Math.PI / 180;

    const T_pos = mat.translation(cx, cy);     // 平行移動 +c
    const R     = mat.rotation(rad);           // 回転
    const T_neg = mat.translation(-cx, -cy);   // 平行移動 -c

    // 合成: 右から左へ適用（T(-c) → R → T(c)）
    const combined = mat.multiplyAll([ T_pos, R, T_neg ]);

    return {
      namedMatrices: [
        { name: "T( c )", M: T_pos },
        { name: "R( θ )", M: R },
        { name: "T(-c )", M: T_neg },
      ],
      combined,
    };
  }

  init({
    grid: [-10, 10],
    compute,
    onAfterDraw(viz) {
      const cx  = parseFloat(document.getElementById('cx').value);
      const cy  = parseFloat(document.getElementById('cy').value);
      viz.showPivot(cx, cy);
    }
  });
});
