// 原点中心の回転ページ
document.addEventListener('DOMContentLoaded', () => {
  const { mat, init } = window.TransformDemo;

  function compute() {
    const deg = parseFloat(document.getElementById('deg').value);
    const rad = deg * Math.PI / 180;

    const R = mat.rotation(rad);
    const combined = mat.multiplyAll([R]);

    return {
      namedMatrices: [
        { name: "回転 R(θ)", M: R },
      ],
      combined,
    };
  }

  init({
    grid: [-10, 10],
    compute,
  });
});
