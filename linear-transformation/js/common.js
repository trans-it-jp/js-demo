// common.js — bright theme + draw tools (line/circle/free/rect) + transformed grid + matrices below viz
// v' = M · [x,y,1]^T
window.TransformDemo = (function () {
  // ---------- Math ----------
  const round = (x, d=4) => Math.round(x * 10**d) / 10**d;
  const id3 = () => [[1,0,0],[0,1,0],[0,0,1]];
  const mat = {
    identity: id3,
    translation: (tx, ty) => [[1,0,tx],[0,1,ty],[0,0,1]],
    scale: (sx, sy) => [[sx,0,0],[0,sy,0],[0,0,1]],
    shear: (shx, shy) => [[1,shx,0],[shy,1,0],[0,0,1]],
    rotation: (theta) => { const c=Math.cos(theta), s=Math.sin(theta); return [[c,-s,0],[s,c,0],[0,0,1]]; },
    multiply: (A, B) => {
      const C = [[0,0,0],[0,0,0],[0,0,0]];
      for (let i=0;i<3;i++) for (let j=0;j<3;j++) {
        C[i][j] = A[i][0]*B[0][j] + A[i][1]*B[1][j] + A[i][2]*B[2][j];
      }
      return C;
    },
    multiplyAll: (arr) => arr.reduce((acc, M) => mat.multiply(acc, M), id3()),
    applyToPoint: (M, [x,y]) => [ M[0][0]*x + M[0][1]*y + M[0][2], M[1][0]*x + M[1][1]*y + M[1][2] ],
    mapPoints: (M, pts) => pts.map(p => mat.applyToPoint(M, p)),
    toFixed: (M, d=3) => M.map(r=>r.map(v=>round(v,d))),
  };

  // ---------- SVG scaffold ----------
  function setupSvg(selector, domain=[-10,10], padding=40) {
    const svg = d3.select(selector).append("svg");
    const width = svg.node().clientWidth || 800;
    const height = svg.node().clientHeight || 560;

    // === 1:1 スケール（正方形グリッド） ===
    // ドメインは x,y 同じ配列（例: [-10,10]）を前提に正方形領域を中央に配置
    const units = domain[1] - domain[0];                   // 例: 20
    const side  = Math.min(width - 2*padding, height - 2*padding); // 正方領域のピクセル長
    const left  = (width  - side) / 2;                     // 左余白（中央寄せ）
    const top   = (height - side) / 2;                     // 上余白（中央寄せ)

    const x = d3.scaleLinear().domain(domain).range([left, left + side]);
    const y = d3.scaleLinear().domain(domain).range([top + side, top]); // 上が小、下が大 → 反転

    // ヒット領域（クリックを確実に拾う）
    svg.append("rect").attr("class","hit-rect").attr("x",0).attr("y",0).attr("width","100%").attr("height","100%");

    // groups (z-order)
    const gGridTrans = svg.append("g").attr("class", "grid-transformed"); // 変換後グリッド
    const gGrid = svg.append("g").attr("class", "grid");                  // 元グリッド
    const gAxis = svg.append("g").attr("class", "axis");
    const gShapes = svg.append("g");
    const gUser = svg.append("g");
    const gBasis = svg.append("g");
    const gPivot = svg.append("g");

    // base grid data
    const ticks = d3.range(Math.ceil(domain[0]), Math.floor(domain[1])+1, 1);
    const baseV = ticks.map(t => ({x1:t, y1:domain[0], x2:t, y2:domain[1]}));
    const baseH = ticks.map(t => ({x1:domain[0], y1:t, x2:domain[1], y2:t}));

    function drawBaseGrid(){
      gGrid.selectAll("*").remove();
      gGrid.selectAll("line.v")
        .data(baseV).enter().append("line").attr("class","v")
        .attr("x1", d=>x(d.x1)).attr("y1", d=>y(d.y1))
        .attr("x2", d=>x(d.x2)).attr("y2", d=>y(d.y2));
      gGrid.selectAll("line.h")
        .data(baseH).enter().append("line").attr("class","h")
        .attr("x1", d=>x(d.x1)).attr("y1", d=>y(d.y1))
        .attr("x2", d=>x(d.x2)).attr("y2", d=>y(d.y2));
    }
    drawBaseGrid();

    // 直近の合成行列（ユーザー描画確定時の再描画に使用）
    let currentM = id3();
    function setCurrentM(M){ currentM = M; }

    // transformed grid
    function drawTransformedGrid(M) {
      gGridTrans.selectAll("*").remove();
      const line = d3.line().x(d=>x(d[0])).y(d=>y(d[1]));
      baseV.forEach(L => {
        const p1 = mat.applyToPoint(M, [L.x1, L.y1]);
        const p2 = mat.applyToPoint(M, [L.x2, L.y2]);
        gGridTrans.append("path").attr("d", line([p1,p2]));
      });
      baseH.forEach(L => {
        const p1 = mat.applyToPoint(M, [L.x1, L.y1]);
        const p2 = mat.applyToPoint(M, [L.x2, L.y2]);
        gGridTrans.append("path").attr("d", line([p1,p2]));
      });
    }

    // axes
    gAxis.append("line").attr("x1", x(domain[0])).attr("x2", x(domain[1])).attr("y1", y(0)).attr("y2", y(0));
    gAxis.append("line").attr("y1", y(domain[0])).attr("y2", y(domain[1])).attr("x1", x(0)).attr("x2", x(0));

    // marker
    svg.append("defs").append("marker")
      .attr("id", "arrow").attr("viewBox", "0 0 10 10")
      .attr("refX", 8).attr("refY", 5)
      .attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path").attr("d", "M 0 0 L 10 5 L 0 10 z").attr("fill", "currentColor");

    const toPathClosed = (pts) => d3.line().x(d=>x(d[0])).y(d=>y(d[1]))(pts.concat([pts[0]]));

    // default polygon
    const house = [[-1,-1],[1,-1],[1,1],[0,2],[-1,1]];
    const shape0 = gShapes.append("path").attr("class","shape-original");
    const shape1 = gShapes.append("path").attr("class","shape-transformed");

    // basis
    const vX = gBasis.append("line").attr("class","vector x")
      .attr("x1", x(0)).attr("y1", y(0)).attr("x2", x(1)).attr("y2", y(0)).attr("marker-end", "url(#arrow)");
    const vY = gBasis.append("line").attr("class","vector y")
      .attr("x1", x(0)).attr("y1", y(0)).attr("x2", x(0)).attr("y2", y(1)).attr("marker-end", "url(#arrow)");

    // pivot
    const pivot = gPivot.append("circle").attr("class","pivot").attr("r", 5).style("display", "none");

    function drawShapes(pointsOriginal, pointsTransformed) {
      shape0.attr("d", toPathClosed(pointsOriginal));
      shape1.attr("d", toPathClosed(pointsTransformed));
    }
    function drawBasis(M=id3()) {
      const ex = mat.applyToPoint(M, [1,0]);
      const ey = mat.applyToPoint(M, [0,1]);
      vX.attr("x2", x(ex[0])).attr("y2", y(ex[1]));
      vY.attr("x2", x(ey[0])).attr("y2", y(ey[1]));
    }
    function showPivot(px, py) { pivot.style("display", null).attr("cx", x(px)).attr("cy", y(py)); }
    function hidePivot() { pivot.style("display", "none"); }

    // ---------- User drawing (line / circle / free / rect) ----------
    const userShapes = []; // line:{type:'line', p1:[x,y], p2:[x,y]} | circle:{type:'circle', c:[x,y], r:number} | free:{type:'free', pts:[[x,y],...]} | rect:{type:'rect', p1:[x,y], p2:[x,y]}
    let mode = 'none';
    let temp = null;
    let drawing = false;

    // tool wiring
    function wireTools() {
      const area = d3.select("#draw-tools");
      if (area.empty()) return;
      const btnNone   = area.select("#mode-none");
      const btnLine   = area.select("#mode-line");
      const btnCircle = area.select("#mode-circle");
      const btnFree   = area.select("#mode-free");
      const btnRect   = area.select("#mode-rect"); // 追加
      const btnClear  = area.select("#clear");

      function setMode(m){
        mode = m; temp=null; drawing=false;
        area.selectAll("button").classed("active", false);
        if (m==='none')   btnNone.classed("active", true);
        if (m==='line')   btnLine.classed("active", true);
        if (m==='circle') btnCircle.classed("active", true);
        if (m==='free')   btnFree.classed("active", true);
        if (m==='rect')   btnRect.classed("active", true);
      }

      btnNone.on("click",  ()=>setMode('none'));
      btnLine.on("click",  ()=>setMode('line'));
      btnCircle.on("click",()=>setMode('circle'));
      btnFree.on("click",  ()=>setMode('free'));
      btnRect.on("click",  ()=>setMode('rect'));
      btnClear.on("click", ()=>{
        userShapes.length = 0; temp=null; drawing=false;
        renderUserShapes(currentM); // クリア後に空描画
      });
      area.select(".hint")?.text("線=2クリック / 円=中心→外周 / 四角形=対角2点 / 自由曲線=ドラッグ");
      setMode('none'); // 初期
    }

    // helpers
    function circlePoly(c, r, n=64) {
      const [cx,cy] = c;
      const pts = [];
      for (let i=0;i<n;i++){
        const t = 2*Math.PI*i/n;
        pts.push([cx + r*Math.cos(t), cy + r*Math.sin(t)]);
      }
      return pts;
    }
    function rectPoly(p1, p2) {
      const x1 = Math.min(p1[0], p2[0]), x2 = Math.max(p1[0], p2[0]);
      const y1 = Math.min(p1[1], p2[1]), y2 = Math.max(p1[1], p2[1]);
      return [[x1,y1],[x2,y1],[x2,y2],[x1,y2]];
    }

    // draw user shapes
    const gUL  = gUser.append("g");   // lines
    const gULt = gUser.append("g");   // transformed lines
    const gUC  = gUser.append("g");   // circles as polygons (original)
    const gUCt = gUser.append("g");   // circles transformed
    const gUR  = gUser.append("g");   // rectangles (original)
    const gURt = gUser.append("g");   // rectangles transformed
    const gUF  = gUser.append("g");   // freehand (original)
    const gUFt = gUser.append("g");   // freehand transformed
    const gTemp= gUser.append("g").attr("pointer-events","none"); // preview

    function renderUserShapes(M) {
      // lines
      const lines = userShapes.filter(s=>s.type==='line');
      const selL = gUL.selectAll("line").data(lines);
      selL.join(enter => enter.append("line").attr("class","user-line"), update=>update, exit=>exit.remove())
        .attr("x1", d=>x(d.p1[0])).attr("y1", d=>y(d.p1[1]))
        .attr("x2", d=>x(d.p2[0])).attr("y2", d=>y(d.p2[1]));
      const selLt = gULt.selectAll("line").data(lines);
      selLt.join(enter => enter.append("line").attr("class","user-line-t"), update=>update, exit=>exit.remove())
        .attr("x1", d=>x(mat.applyToPoint(M, d.p1)[0])).attr("y1", d=>y(mat.applyToPoint(M, d.p1)[1]))
        .attr("x2", d=>x(mat.applyToPoint(M, d.p2)[0])).attr("y2", d=>y(mat.applyToPoint(M, d.p2)[1]));

      // circles (as polygons)
      const circles = userShapes.filter(s=>s.type==='circle');
      const polysC  = circles.map(s => circlePoly(s.c, s.r));
      const polysCt = polysC.map(pts => mat.mapPoints(M, pts));
      const selC = gUC.selectAll("path").data(polysC);
      selC.join(enter=>enter.append("path").attr("class","user-circle"), update=>update, exit=>exit.remove())
        .attr("d", pts => toPathClosed(pts));
      const selCt = gUCt.selectAll("path").data(polysCt);
      selCt.join(enter=>enter.append("path").attr("class","user-circle-t"), update=>update, exit=>exit.remove())
        .attr("d", pts => toPathClosed(pts));

      // rectangles (as polygons)
      const rects = userShapes.filter(s=>s.type==='rect');
      const polysR  = rects.map(s => rectPoly(s.p1, s.p2));
      const polysRt = polysR.map(pts => mat.mapPoints(M, pts));
      const selR = gUR.selectAll("path").data(polysR);
      selR.join(enter=>enter.append("path").attr("class","user-rect"), update=>update, exit=>exit.remove())
        .attr("d", pts => toPathClosed(pts));
      const selRt = gURt.selectAll("path").data(polysRt);
      selRt.join(enter=>enter.append("path").attr("class","user-rect-t"), update=>update, exit=>exit.remove())
        .attr("d", pts => toPathClosed(pts));

      // freehand
      const frees = userShapes.filter(s=>s.type==='free');
      const freesT = frees.map(s => ({...s, pts: mat.mapPoints(M, s.pts)}));
      const selF = gUF.selectAll("path").data(frees);
      selF.join(enter=>enter.append("path").attr("class","user-free"), update=>update, exit=>exit.remove())
        .attr("d", s => d3.line().x(p=>x(p[0])).y(p=>y(p[1]))(s.pts));
      const selFt = gUFt.selectAll("path").data(freesT);
      selFt.join(enter=>enter.append("path").attr("class","user-free-t"), update=>update, exit=>exit.remove())
        .attr("d", s => d3.line().x(p=>x(p[0])).y(p=>y(p[1]))(s.pts));
    }

    // interactive drawing on SVG
    svg.on("mousedown.draw", (event)=>{
      const [mx,my] = d3.pointer(event, svg.node());
      const px = x.invert(mx), py = y.invert(my);

      if (mode==='free') {
        drawing = true;
        temp = {type:'free', pts:[[px,py]]};
      } else if (mode==='line') {
        if (!temp) {
          temp = {type:'line', p1:[px,py], p2:[px,py]};
        } else {
          temp.p2=[px,py];
          userShapes.push(temp);
          temp=null;
          renderUserShapes(currentM); // 二度目のクリックで確定
        }
      } else if (mode==='circle') {
        if (!temp) {
          temp = {type:'circle', c:[px,py], r:0};
        } else {
          temp.r = Math.hypot(px-temp.c[0], py-temp.c[1]);
          userShapes.push(temp);
          temp=null;
          renderUserShapes(currentM);
        }
      } else if (mode==='rect') {
        if (!temp) {
          temp = {type:'rect', p1:[px,py], p2:[px,py]};
        } else {
          temp.p2=[px,py];
          userShapes.push(temp);
          temp=null;
          renderUserShapes(currentM);
        }
      }
      renderTemp();
    });

    svg.on("mousemove.draw", (event)=>{
      const [mx,my] = d3.pointer(event, svg.node());
      const px = x.invert(mx), py = y.invert(my);

      if (mode==='free' && drawing && temp) {
        const last = temp.pts[temp.pts.length-1];
        if (!last || Math.hypot(px-last[0], py-last[1]) > 0.02) temp.pts.push([px,py]);
      } else if (mode==='line' && temp) {
        temp.p2=[px,py];
      } else if (mode==='circle' && temp) {
        temp.r = Math.hypot(px-temp.c[0], py-temp.c[1]);
      } else if (mode==='rect' && temp) {
        temp.p2=[px,py];
      }
      renderTemp();
    });

    d3.select(window).on("mouseup.draw", ()=>{
      if (mode==='free' && drawing && temp) {
        drawing = false;
        if (temp.pts.length > 1) {
          userShapes.push(temp);
          renderUserShapes(currentM);
        }
        temp = null;
        renderTemp();
      }
    });

    function renderTemp(){
      const toPathClosed = (pts) => d3.line().x(d=>x(d[0])).y(d=>y(d[1]))(pts.concat([pts[0]]));
      gTemp.selectAll("*").remove();
      if (!temp) return;
      if (temp.type==='line') {
        gTemp.append("line").attr("class","user-line")
          .attr("x1", x(temp.p1[0])).attr("y1", y(temp.p1[1]))
          .attr("x2", x(temp.p2[0])).attr("y2", y(temp.p2[1]));
      } else if (temp.type==='circle') {
        gTemp.append("circle").attr("class","user-circle")
          .attr("cx", x(temp.c[0])).attr("cy", y(temp.c[1]))
          .attr("r", Math.abs(x(temp.c[0]) - x(temp.c[0] + temp.r)));
      } else if (temp.type==='rect') {
        const pts = rectPoly(temp.p1, temp.p2);
        gTemp.append("path").attr("class","user-rect")
          .attr("d", toPathClosed(pts));
      } else if (temp.type==='free') {
        gTemp.append("path").attr("class","user-free")
          .attr("d", d3.line().x(p=>x(p[0])).y(p=>y(p[1]))(temp.pts));
      }
    }

    wireTools();

    return {
      x,y,
      drawShapes, drawBasis, showPivot, hidePivot,
      drawTransformedGrid,
      house,
      renderUserShapes,
      setCurrentM,
    };
  }

  // ---------- Matrix table rendering ----------
  function renderMatrixTable(container, matrix, caption) {
    const sel = d3.select(container);
    sel.selectAll("*").remove();
    const table = sel.append("table").attr("class","matrix-table");
    if (caption) table.append("caption").text(caption);
    const thead = table.append("thead").append("tr");
    thead.selectAll("th").data(["", "c1", "c2", "c3"]).enter().append("th").text(d => d);
    const tbody = table.append("tbody");
    const rows = tbody.selectAll("tr").data([0,1,2]).enter().append("tr");
    rows.append("th").text((d,i)=>`r${i+1}`);
    rows.each(function(rowIdx){
      d3.select(this).selectAll("td")
        .data(matrix[rowIdx])
        .enter().append("td").text(d => typeof d === "number" ? d.toFixed(3) : d);
    });
  }

  // ---------- Demo scaffold ----------
  function init(page) {
    // page: { compute: ()=>({namedMatrices:[{name, M}], combined}), grid:[min,max], onAfterDraw? }
    const domain = page.grid ?? [-10,10];
    const viz = setupSvg("#viz", domain);

    function update() {
      const out = page.compute();

      // 現在の合成行列をセット（ユーザー確定描画用）
      viz.setCurrentM(out.combined);

      // 表示用に丸め（グリッドは視認性に影響が少ないため丸め適用）
      const Mdisp = mat.toFixed(out.combined);

      // transformed grid
      viz.drawTransformedGrid(Mdisp);

      // default shape
      const transformed = mat.mapPoints(out.combined, viz.house);
      viz.drawShapes(viz.house, transformed);

      // basis
      viz.drawBasis(out.combined);

      // user drawings（現在の合成行列で）
      viz.renderUserShapes(out.combined);

      // matrices (below viz)
      d3.select("#tables").selectAll("*").remove();
      const wrap = d3.select("#tables").append("div").attr("class","matrix-tables");
      out.namedMatrices.forEach(({name, M}) => {
        renderMatrixTable(wrap.append("div").node(), mat.toFixed(M), name);
      });
      renderMatrixTable(wrap.append("div").node(), Mdisp, "合成行列 (適用順: 左→右)");

      if (page.onAfterDraw) page.onAfterDraw(viz, out);
    }

    // 入力要素のみで更新をトリガー（描画ツールボタンは上書きしない）
    d3.selectAll("input, select").on("input.update", update);

    update();
  }

  return { mat, init, renderMatrixTable };
})();
