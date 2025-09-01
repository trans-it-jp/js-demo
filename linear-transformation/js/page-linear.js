// page-linear.js — linear transform only (scale + shear + optional reflect via negative scale)
(function(){
  const $ = (id) => document.getElementById(id);
  window.addEventListener("DOMContentLoaded", () => {
    TransformDemo.init({
      compute: () => {
        const sx = parseFloat($("scaleX").value);
        const sy = parseFloat($("scaleY").value);
        const shx = parseFloat($("shearX").value);
        const shy = parseFloat($("shearY").value);
        // Linear part as a single matrix [[sx, shx, 0],[shy, sy, 0],[0,0,1]]
        const Mlin = [[sx, shx, 0],[shy, sy, 0],[0,0,1]];
        return {
          namedMatrices: [{name:"一次変換 M_lin", M: Mlin}],
          combined: Mlin
        };
      },
      grid: [-10,10]
    });
  });
})();
