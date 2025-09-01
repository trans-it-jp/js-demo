
# 3×3 行列を用いた 2D 座標変換（学習用 Readme）

このリポジトリは、D3.js を用いた可視化で **2D の座標変換**を体験できるデモサイトです。
グリッドは正方形で表示され、変換後グリッド／基底ベクトル／ユーザーが描いた図形（線・円・四角形・自由曲線）の変換結果を確認できます。

- 一次変換（線形変換）: `pages/linear.html`
- 平行移動: `pages/translation.html`
- 一次変換＋平行移動: `pages/affine.html`
- 原点中心の回転: `pages/rotate-origin.html`
- 任意点中心の回転: `pages/rotate-point.html`

> 本実装の慣習は **列ベクトル** です。点 $v = [x, y, 1]^T$ に対し、行列は左から掛けます。  
> 合成 $M = A \cdot B$ を点に適用すると $v' = Mv = (A \cdot B)v = A(Bv)$ となり、**右から左**（$B \rightarrow A$）の順に作用します。

---

## 目次
1. 行列基礎  
2. 行列の演算  
3. 逆行列  
4. 一次変換 (2×2 行列)  
5. 一次変換拡張 (3×3 行列)  
6. 任意点中心の回転の分解と一般式  
7. このサイトの使い方  
8. 例題・演習  
9. チートシート  
10. 補足: 列ベクトルと行ベクトル

---

## 行列基礎

- **ベクトル**: 2D の点や向きを表す量。列ベクトルで表すと

```math
\mathbf{v} = \begin{bmatrix} x \\ y \end{bmatrix}
```

- **行列**: ベクトルを別のベクトルに写すルールを数表で表現したもの。2D の線形変換は

```math
\mathbf{v}' = A \mathbf{v}, \quad A \in \mathbb{R}^{2\times 2}
```

- **単位行列** $I$: 作用してもベクトルを変えない行列。

```math
I = \begin{bmatrix}1&0\\0&1\end{bmatrix}
```

- **同次座標**: 平行移動も行列で扱うため、$[x, y] \to [x, y, 1]$ と拡張して 3×3 行列を使う。

---

## 行列の演算

- **和**: $A+B$（同サイズ同士）  
- **スカラー倍**: $\alpha A$  
- **積**: $AB$（内側の次元が一致する時に定義）。一般に **非可換**（$AB \ne BA$）。  
- **性質**  
  - 結合則: $(AB)C = A(BC)$  
  - 分配則: $A(B+C) = AB + AC$  
  - 可換則: 一般には成り立たない  
- **合成の順序**（列ベクトル）

```math
\mathbf{v}' = (A \cdot B)\,\mathbf{v} \quad\Rightarrow\quad \text{適用順は } B \rightarrow A
```

---

## 逆行列

- **定義**: $A^{-1}A = I$ を満たす行列 $A^{-1}$ を $A$ の逆行列という（「変換を元に戻す」）。  
- **存在条件**: 行列式 $\det(A) \ne 0$ のときに限り存在（正則）。$\det(A)=0$ は情報が潰れて逆変換不能。  
- **2×2 の明示公式**

```math
A=\begin{bmatrix}a&b\\c&d\end{bmatrix},\quad \det(A)=ad-bc\ne 0
```

```math
A^{-1}=\frac{1}{ad-bc}\begin{bmatrix}d&-b\\-c&a\end{bmatrix}
```

- **性質**: $(AB)^{-1} = B^{-1}A^{-1}$（順序が逆転）。  
- **幾何学的意味**: $|\det(A)|$ は面積倍率。例えば $|\det(A)|=2$ なら面積が 2 倍。

---

## 一次変換 (2×2 行列)

一次変換（線形変換）は原点を保つ幾何変換です。代表例と行列表現:

- **スケール（拡大縮小）**

```math
S(s_x,s_y)=\begin{bmatrix}s_x&0\\0&s_y\end{bmatrix}
```

- **回転**（原点中心、角度 $\theta$）

```math
R(\theta)=\begin{bmatrix}\cos\theta&-\sin\theta\\[2pt]\sin\theta&\cos\theta\end{bmatrix}
```

- **せん断（シア）**

```math
\mathrm{Shear}_x(k)=\begin{bmatrix}1&k\\0&1\end{bmatrix},\quad
\mathrm{Shear}_y(k)=\begin{bmatrix}1&0\\k&1\end{bmatrix}
```

- **反射**（x 軸対称）

```math
\mathrm{Ref}_x=\begin{bmatrix}1&0\\0&-1\end{bmatrix}
```

**円→楕円**: 一般の一次変換は円を楕円に写します（回転＋非等方スケールの合成）。

---

## 一次変換拡張 (3×3 行列)

平行移動を含む **アフィン変換** は、同次座標 $[x,y,1]^T$ と 3×3 行列で表せます。

- **平行移動**

```math
T(t_x,t_y)=
\begin{bmatrix}
  1&0&t_x\\
  0&1&t_y\\
  0&0&1
\end{bmatrix}
\quad\Rightarrow\quad T(t_x,t_y)^{-1}=T(-t_x,-t_y)
```

- **線形部を含む一般アフィン**

```math
A_{\text{affine}}=
\begin{bmatrix}
  a&b&t_x\\
  c&d&t_y\\
  0&0&1
\end{bmatrix},\quad
\begin{bmatrix}x'\\y'\\1\end{bmatrix}
=
A_{\text{affine}}
\begin{bmatrix}x\\y\\1\end{bmatrix}
```

---

## 任意点中心の回転の分解と一般式

点 $c=(c_x,c_y)$ を中心に角度 $\theta$ 回転する変換は、次の **3 ステップ**に分解できます（列ベクトル）:

1. **指定した点を原点に移動**（平行移動の逆行列）  
```math
T(-c_x,-c_y)
```
2. **原点中心の回転**  
```math
R(\theta)=
\begin{bmatrix}
  \cos\theta&-\sin\theta&0\\
  \sin\theta& \cos\theta&0\\
  0&0&1
\end{bmatrix}
```
3. **原点に移した点を元に戻す**  
```math
T(c_x,c_y)
```

したがって、**合成行列**は

```math
M = T(c_x,c_y)\, R(\theta)\, T(-c_x,-c_y)
```

（右から左に作用: 先に $T(-c)$、次に $R$、最後に $T(c)$）。

この合成を展開すると、$M$ の **一般式（3×3）** は

```math
M=
\begin{bmatrix}
\cos\theta & -\sin\theta & c_x(1-\cos\theta)+c_y\sin\theta \\
\sin\theta & \cos\theta  & -c_x\sin\theta + c_y(1-\cos\theta) \\
0          & 0           & 1
\end{bmatrix}.
```

同値な **座標表示**は

```math
\begin{aligned}
x' &= c_x + (x-c_x)\cos\theta - (y-c_y)\sin\theta,\\
y' &= c_y + (x-c_x)\sin\theta + (y-c_y)\cos\theta.
\end{aligned}
```

> `pages/rotate-point.html` では、テーブルに $T(c)$・$R(\theta)$・$T(-c)$ の **3 つの行列**が並び、合成行列 $M$ も同時に表示されます。スライダーで $c_x,c_y,\theta$ を動かすと、分解と合成の対応が視覚的に確認できます。

---

## このサイトの使い方

1. **右側のパネル**でパラメータを調整（タイトル・スライダー・テキストボックスは横並び）。  
2. **描画ツール**（線／円／四角形／自由曲線）でキャンバス上に図形を追加。  
   - 線: 2 クリックで始点・終点  
   - 円: 中心クリック → 外周上をクリック  
   - 四角形: 対角 2 点をクリック  
   - 自由曲線: ドラッグしてマウスアップで確定  
   - クリア: 追加したユーザー図形を消去
3. **変換後グリッド**と**基底ベクトル**で幾何学的な作用を直感的に確認。  
4. 画面下の**行列テーブル**で、要素値と合成の順序を確認。  
   合成は列ベクトルの慣習に従い **右から左**の順に作用します。

---

## 例題・演習

1. **せん断の可視化**  
   `linear.html` で $s_x=s_y=1$、$\mathrm{Shear}_x=1$。正方形が平行四辺形になることを確認し、基底ベクトルの変化を読む。
2. **円→楕円**  
   `linear.html` で $s_x=2, s_y=1$ の拡大をかけ、円を描く。楕円になり、長軸・短軸がスケールと一致することを確認。
3. **平行移動の合成順序**  
   `affine.html` で一次変換 $L$ の後に平行移動 $T$ を合成（`combined = T·L`）。順序を入れ替えたときの違いを観察。
4. **任意点回転**  
   `rotate-point.html` で中心 $(c_x,c_y)$ を動かしながら回転。行列の分解 $T(c)\,R\,T(-c)$ と合成 $M$ を比較。
5. **逆行列で元に戻す**  
   `linear.html` で適当な一次変換 $A$ を設定し、$A^{-1}$ を作って合成（例: スケールを逆数、回転角を符号逆に）。合成が恒等になることを実験。

---

## チートシート

- 回転（原点、角度 $\theta$）

```math
R(\theta)=\begin{bmatrix}\cos\theta&-\sin\theta\\\sin\theta&\cos\theta\end{bmatrix}
```

- スケール

```math
S(s_x,s_y)=\begin{bmatrix}s_x&0\\0&s_y\end{bmatrix}
```

- せん断

```math
\mathrm{Shear}_x(k)=\begin{bmatrix}1&k\\0&1\end{bmatrix},\quad
\mathrm{Shear}_y(k)=\begin{bmatrix}1&0\\k&1\end{bmatrix}
```

- 反射（x 軸・y 軸）

```math
\mathrm{Ref}_x=\begin{bmatrix}1&0\\0&-1\end{bmatrix},\quad
\mathrm{Ref}_y=\begin{bmatrix}-1&0\\0&1\end{bmatrix}
```

- 平行移動（同次座標）

```math
T(t_x,t_y)=
\begin{bmatrix}
  1&0&t_x\\
  0&1&t_y\\
  0&0&1
\end{bmatrix}
```

- アフィン合成（列ベクトル）

```math
\mathbf{v}'=(T \cdot L)\,\mathbf{v} \quad\Rightarrow\quad \text{作用順}:~ L \rightarrow T
```

- 2×2 逆行列

```math
A^{-1}=\frac{1}{ad-bc}\begin{bmatrix}d&-b\\-c&a\end{bmatrix}\quad(\det(A)\ne 0)
```

---

## 補足: 列ベクトルと行ベクトル

- 本プロジェクトは **列ベクトル**。合成は右から左に作用します（$v' = (A\cdot B)v$ は $B \rightarrow A$ の順）。  
- 行ベクトル $[x, y]$ を右に掛ける流儀では、式や合成順序が逆になります。参考書や外部資料と照合するときは自分の採用している流儀を必ず確認してください。

---

### ライセンス・謝辞

- コードは教育目的で作成されています。D3.js は CDN から読み込みます。  
- 改良提案や誤りの指摘は歓迎します。
