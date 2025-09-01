// 平行移動ページ
document.addEventListener('DOMContentLoaded', () => {
  const { mat, init } = window.TransformDemo;

  function compute() {
    const tx = parseFloat(document.getElementById('tx').value);
    const ty = parseFloat(document.getElementById('ty').value);

    const T = mat.translation(tx, ty);
    const combined = mat.multiplyAll([T]); // 平行移動のみ

    return {
      namedMatrices: [
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
