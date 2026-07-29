#!/usr/bin/env python3
"""BYGENCY 자체 초해상 모델 학습 — 남의 모델을 받아 쓰지 않고 우리가 직접 만든다.

무엇을 만드는가
  선명한 그림을 일부러 흐리게(축소 + 흐림 + 잡티 + 압축) 만든 뒤, 그것을 원래대로
  되살리도록 작은 신경망을 학습시킨다. 학습이 끝나면 브라우저에서 바로 돌릴 수 있는
  ONNX 파일로 내보내 우리 사이트에 함께 배포한다(외부에서 받아오지 않는다).

구조 (ESPCN 계열 + 전역 잔차)
  입력(1,3,H,W) → Conv3x3+ReLU → Conv3x3+ReLU → Conv3x3+ReLU → Conv3x3(12채널)
                → DepthToSpace(2배) = 되살린 '차이'
  출력 = 입력을 2배로 늘린 그림 + 되살린 차이        ← 이 구조라서 최소한 단순 확대만큼은 보장된다
  가중치 약 7천 개(≈30KB) — 브라우저에서 충분히 빠르다.

실행:  python3 scripts/train-sr-model.py [--steps 4000] [--out public/models-own/...]
"""
import argparse, json, math, os, time
import numpy as np

rng = np.random.default_rng(20260728)

# ─────────────────────────── 학습용 그림 만들기 ───────────────────────────
# 실제 사진을 쓸 수 없는 환경이라, 초해상이 살려야 하는 성질(가장자리·결·글자·명암)을
# 고루 담은 그림을 직접 만들어 쓴다. 한 종류만 쓰면 그 종류에만 잘하는 모델이 된다.

def _grad(h, w):
    a, b = rng.random(3), rng.random(3)
    yy = np.linspace(0, 1, h)[:, None, None]
    xx = np.linspace(0, 1, w)[None, :, None]
    t = (yy * rng.random() + xx * rng.random())
    t = t / max(t.max(), 1e-6)
    return a[None, None, :] * (1 - t) + b[None, None, :] * t

def _lines(img):
    h, w, _ = img.shape
    for _ in range(rng.integers(2, 9)):
        c = rng.random(3)
        th = int(rng.integers(1, 4))
        if rng.random() < 0.5:
            y = int(rng.integers(0, max(1, h - th)))
            img[y:y + th, :, :] = c
        else:
            x = int(rng.integers(0, max(1, w - th)))
            img[:, x:x + th, :] = c
    return img

def _grid(img):
    """일정 간격으로 촘촘히 반복되는 격자·줄무늬.

    실측으로 찾은 약점이다 — 간격이 촘촘한 격자(3·5·6px)에서만 우리 모델이 단순 확대보다
    나빴다. 학습 그림에는 '떨어진 선 몇 개'만 있었고 이런 반복 무늬가 아예 없었기 때문이다.
    (scripts/own-model-random-test.mjs 의 무작위 검사가 750×492 격자에서 잡아냈다)
    """
    h, w, _ = img.shape
    c = rng.random(3)
    th = int(rng.integers(1, 3))
    if rng.random() < 0.75:
        sx = int(rng.integers(2, 17))
        for x in range(int(rng.integers(0, sx)), w, sx):
            img[:, x:x + th, :] = c
    if rng.random() < 0.75:
        sy = int(rng.integers(2, 17))
        for y in range(int(rng.integers(0, sy)), h, sy):
            img[y:y + th, :, :] = c
    return img

def _blocks(img):
    """글자·로고처럼 각진 덩어리"""
    h, w, _ = img.shape
    for _ in range(rng.integers(2, 10)):
        bh = int(rng.integers(2, max(3, h // 3)))
        bw = int(rng.integers(2, max(3, w // 3)))
        y = int(rng.integers(0, max(1, h - bh)))
        x = int(rng.integers(0, max(1, w - bw)))
        img[y:y + bh, x:x + bw, :] = rng.random(3)
    return img

def _circles(img):
    h, w, _ = img.shape
    yy, xx = np.mgrid[0:h, 0:w]
    for _ in range(rng.integers(1, 5)):
        cy, cx = rng.random() * h, rng.random() * w
        r = rng.random() * min(h, w) * 0.45 + 2
        d = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)
        ring = (np.abs(d - r) < rng.random() * 1.6 + 0.6)
        img[ring] = rng.random(3)
    return img

def _texture(img):
    """피부·천 같은 미세한 결 — 초해상이 살려야 할 고주파"""
    h, w, _ = img.shape
    f = rng.random() * 0.05 + 0.01
    n = rng.normal(0, f, (h, w, 1))
    return np.clip(img + n, 0, 1)

def make_hr(n, size):
    out = np.empty((n, size, size, 3), np.float32)
    for i in range(n):
        img = _grad(size, size)
        r = rng.random()
        if r < 0.26: img = _lines(img)
        elif r < 0.44: img = _grid(img)
        elif r < 0.66: img = _blocks(img)
        elif r < 0.88: img = _circles(img)
        if rng.random() < 0.40: img = _texture(img)
        out[i] = np.clip(img, 0, 1)
    return out

# ─────────────────────────── 일부러 흐리게 만들기 ───────────────────────────
# 사용자가 실제로 가진 그림은 '깨끗하게 축소된' 것이 아니라 흐리고 잡티가 있고 압축돼 있다.
# 그렇게 만든 것으로 학습해야 실제 그림에서 효과가 난다(이게 '실사 열화' 학습이다).

def _blur(x, sigma):
    if sigma <= 0.01: return x
    r = max(1, int(sigma * 2))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); k /= k.sum()
    p = np.pad(x, ((0, 0), (r, r), (0, 0), (0, 0)), mode='edge')
    y = np.tensordot(k, np.stack([p[:, i:i + x.shape[1]] for i in range(2 * r + 1)]), axes=(0, 0))
    p = np.pad(y, ((0, 0), (0, 0), (r, r), (0, 0)), mode='edge')
    return np.tensordot(k, np.stack([p[:, :, i:i + x.shape[2]] for i in range(2 * r + 1)]), axes=(0, 0))

_DCT = np.array([[(np.sqrt(1 / 8) if u == 0 else np.sqrt(2 / 8)) * np.cos((2 * v + 1) * u * np.pi / 16)
                  for v in range(8)] for u in range(8)], np.float32)
_QT = np.array([[16,11,10,16,24,40,51,61],[12,12,14,19,26,58,60,55],[14,13,16,24,40,57,69,56],
                [14,17,22,29,51,87,80,62],[18,22,37,56,68,109,103,77],[24,35,55,64,81,104,113,92],
                [49,64,78,87,103,121,120,101],[72,92,95,98,112,100,103,99]], np.float32)

def _jpegish(x, quality):
    """JPEG 압축 흉내 — 8×8 블록 DCT 를 거칠게 반올림한다(압축 자국이 생긴다)"""
    n, h, w, c = x.shape
    hh, ww = h - h % 8, w - w % 8
    if hh < 8 or ww < 8: return x
    q = _QT * (50.0 / max(1.0, quality) if quality < 50 else (2 - quality / 50.0))
    q = np.maximum(q, 1.0)
    y = x.copy()
    blk = y[:, :hh, :ww, :].reshape(n, hh // 8, 8, ww // 8, 8, c).transpose(0, 1, 3, 5, 2, 4)
    blk = (blk - 0.5) * 255.0
    d = _DCT @ blk @ _DCT.T
    d = np.round(d / q) * q
    blk = _DCT.T @ d @ _DCT
    blk = blk / 255.0 + 0.5
    y[:, :hh, :ww, :] = blk.transpose(0, 1, 4, 2, 5, 3).reshape(n, hh, ww, c)
    return np.clip(y, 0, 1)

def down2(x):
    """2배 축소 — 브라우저의 고품질 축소와 같은 방식(2×2 평균)"""
    n, h, w, c = x.shape
    return x.reshape(n, h // 2, 2, w // 2, 2, c).mean(axis=(2, 4))

def up2_bilinear(x):
    """2배 확대(양선형, half_pixel) — ONNX Resize(linear) 와 결과가 '완전히' 같아야 한다.

    ⚠ 가장자리 처리가 핵심이다. 원래 좌표를 먼저 [0, 크기-1] 안으로 잘라 넣어야 한다.
      자르지 않고 가중치만 계산하면 맨 위·왼쪽 줄에서 엉뚱한 비율로 섞여, 학습 때와
      배포된 ONNX 의 결과가 가장자리에서 달라진다(타일 이음매로 드러난다).
    """
    n, h, w, c = x.shape
    oy = np.clip((np.arange(2 * h) + 0.5) / 2.0 - 0.5, 0, h - 1)
    ox = np.clip((np.arange(2 * w) + 0.5) / 2.0 - 0.5, 0, w - 1)
    y0 = np.floor(oy).astype(int); y1 = np.minimum(y0 + 1, h - 1)
    x0 = np.floor(ox).astype(int); x1 = np.minimum(x0 + 1, w - 1)
    wy = (oy - y0)[None, :, None, None]
    wx = (ox - x0)[None, None, :, None]
    a = x[:, y0][:, :, x0]; b = x[:, y0][:, :, x1]
    c_ = x[:, y1][:, :, x0]; d = x[:, y1][:, :, x1]
    return (a * (1 - wy) * (1 - wx) + b * (1 - wy) * wx + c_ * wy * (1 - wx) + d * wy * wx).astype(np.float32)

def degrade(hr):
    lr = _blur(hr, rng.random() * 0.6)
    lr = down2(lr)
    lr = lr + rng.normal(0, rng.random() * 0.012, lr.shape)
    lr = np.clip(lr, 0, 1)
    if rng.random() < 0.7:
        lr = _jpegish(lr, float(rng.integers(55, 95)))
    return lr.astype(np.float32)

# ─────────────────────────── 아주 작은 합성곱 신경망 ───────────────────────────
# 파이토치 없이 numpy 로 직접 구현한다(순전파·역전파·Adam).

def im2col(x, k):
    n, h, w, c = x.shape
    p = k // 2
    xp = np.pad(x, ((0, 0), (p, p), (p, p), (0, 0)))
    cols = np.empty((n, h, w, k * k * c), x.dtype)
    idx = 0
    for dy in range(k):
        for dx in range(k):
            cols[..., idx * c:(idx + 1) * c] = xp[:, dy:dy + h, dx:dx + w, :]
            idx += 1
    return cols

class Conv:
    def __init__(self, cin, cout, k=3, relu=True):
        self.k, self.cin, self.cout, self.relu = k, cin, cout, relu
        fan = k * k * cin
        self.W = (rng.normal(0, math.sqrt(2.0 / fan), (fan, cout))).astype(np.float32)
        self.b = np.zeros(cout, np.float32)
        self.mW = np.zeros_like(self.W); self.vW = np.zeros_like(self.W)
        self.mb = np.zeros_like(self.b); self.vb = np.zeros_like(self.b)

    def forward(self, x):
        self.cols = im2col(x, self.k)
        y = self.cols @ self.W + self.b
        self.pre = y
        return np.maximum(y, 0) if self.relu else y

    def backward(self, gy, lr, t):
        if self.relu: gy = gy * (self.pre > 0)
        n, h, w, _ = gy.shape
        gW = self.cols.reshape(-1, self.W.shape[0]).T @ gy.reshape(-1, self.cout)
        gb = gy.reshape(-1, self.cout).sum(0)
        gcols = gy @ self.W.T
        # col2im
        p = self.k // 2
        gx = np.zeros((n, h + 2 * p, w + 2 * p, self.cin), np.float32)
        idx = 0
        for dy in range(self.k):
            for dx in range(self.k):
                gx[:, dy:dy + h, dx:dx + w, :] += gcols[..., idx * self.cin:(idx + 1) * self.cin]
                idx += 1
        gx = gx[:, p:p + h, p:p + w, :]
        b1, b2, eps = 0.9, 0.999, 1e-12
        for P, G, M, V in ((self.W, gW, self.mW, self.vW), (self.b, gb, self.mb, self.vb)):
            M *= b1; M += (1 - b1) * G
            V *= b2; V += (1 - b2) * (G * G)
            P -= lr * (M / (1 - b1 ** t)) / (np.sqrt(V / (1 - b2 ** t)) + eps)
        return gx

def depth_to_space(x, r=2):
    n, h, w, c = x.shape
    oc = c // (r * r)
    # ONNX DepthToSpace(mode=CRD): (n, oc, r, r, h, w) 순서
    y = x.reshape(n, h, w, oc, r, r).transpose(0, 1, 4, 2, 5, 3)
    return y.reshape(n, h * r, w * r, oc)

def space_to_depth_grad(g, r=2):
    n, H, W, oc = g.shape
    y = g.reshape(n, H // r, r, W // r, r, oc).transpose(0, 1, 3, 5, 2, 4)
    return y.reshape(n, H // r, W // r, oc * r * r)

class Net:
    """3×3 합성곱 여러 겹 + 마지막에 픽셀 재배치(DepthToSpace)로 2배.

    layers = 전체 층 수(마지막 출력층 포함). 4 가 기본이고, 늘리면 한 점을 계산할 때
    참고하는 범위가 넓어져 더 잘 살릴 수 있지만 그만큼 느려진다.
    ⚠ 층을 늘리면 참고 반경도 늘어난다(층 수 = 반경). 스튜디오의 타일 겹침(edge)이
      그 반경보다 커야 타일 자국이 안 생긴다.
    """
    def __init__(self, ch=16, layers=4):
        assert layers >= 2
        self.layers = layers
        self.hidden = [Conv(3 if i == 0 else ch, ch) for i in range(layers - 1)]
        self.out = Conv(ch, 12, relu=False)
        # ⚠ 마지막 층은 0 에서 시작한다.
        #  이렇게 해야 학습 시작 시점의 출력이 '단순 확대' 와 정확히 같아진다.
        #  0 이 아니면 처음에 엉뚱한 값이 얹혀서, 학습의 대부분을 그걸 지우는 데 써 버린다.
        self.out.W[:] = 0.0; self.out.b[:] = 0.0
        self.ch = ch
        # 예전 이름으로도 접근할 수 있게 둔다(검사 스크립트 호환)
        for i, c in enumerate(self.hidden): setattr(self, 'c%d' % (i + 1), c)
        setattr(self, 'c%d' % layers, self.out)

    def forward(self, lr):
        h = lr
        for c in self.hidden: h = c.forward(h)
        res = self.out.forward(h)
        self.base = up2_bilinear(lr)
        return self.base + depth_to_space(res)

    def backward(self, gy, lr_rate, t):
        g = space_to_depth_grad(gy)
        g = self.out.backward(g, lr_rate, t)
        for c in reversed(self.hidden): g = c.backward(g, lr_rate, t)

def psnr(a, b):
    mse = float(np.mean((np.clip(a, 0, 1) - np.clip(b, 0, 1)) ** 2))
    return 99.0 if mse <= 0 else 10 * math.log10(1.0 / mse)

# ─────────────────────────── ONNX 로 내보내기 ───────────────────────────
def export_onnx(net, path):
    import onnx
    from onnx import helper, TensorProto, numpy_helper

    def conv_w(c):   # (k*k*cin, cout) → ONNX (cout, cin, k, k)
        k, cin, cout = c.k, c.cin, c.cout
        w = c.W.reshape(k, k, cin, cout).transpose(3, 2, 0, 1)
        return np.ascontiguousarray(w.astype(np.float32))

    inits, nodes = [], []
    def add_conv(name, c, xin, xout):
        inits.append(numpy_helper.from_array(conv_w(c), name + '_w'))
        inits.append(numpy_helper.from_array(c.b.astype(np.float32), name + '_b'))
        nodes.append(helper.make_node('Conv', [xin, name + '_w', name + '_b'], [xout],
                                      kernel_shape=[c.k, c.k], pads=[c.k // 2] * 4, name=name))

    prev = 'input'
    for i, c in enumerate(net.hidden):
        name = 'conv%d' % (i + 1)
        add_conv(name, c, prev, 'c%d' % (i + 1))
        nodes.append(helper.make_node('Relu', ['c%d' % (i + 1)], ['r%d' % (i + 1)]))
        prev = 'r%d' % (i + 1)
    last = 'conv%d' % net.layers
    add_conv(last, net.out, prev, 'cout')
    nodes.append(helper.make_node('DepthToSpace', ['cout'], ['res'], blocksize=2, mode='CRD'))
    # 입력을 2배로 늘린 그림(기준선) + 되살린 차이
    inits.append(numpy_helper.from_array(np.array([], np.float32), 'roi'))
    inits.append(numpy_helper.from_array(np.array([1, 1, 2, 2], np.float32), 'scales'))
    nodes.append(helper.make_node('Resize', ['input', 'roi', 'scales'], ['base'],
                                  mode='linear', coordinate_transformation_mode='half_pixel',
                                  nearest_mode='floor'))
    nodes.append(helper.make_node('Add', ['base', 'res'], ['sum']))
    inits.append(numpy_helper.from_array(np.array(0, np.float32), 'lo'))
    inits.append(numpy_helper.from_array(np.array(1, np.float32), 'hi'))
    nodes.append(helper.make_node('Clip', ['sum', 'lo', 'hi'], ['output']))

    g = helper.make_graph(nodes, 'bygency_sr_x2',
        [helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, 3, 'H', 'W'])],
        [helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, 3, '2H', '2W'])],
        inits)
    m = helper.make_model(g, producer_name='bygency', opset_imports=[helper.make_opsetid('', 13)])
    m.ir_version = 8
    onnx.checker.check_model(m)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    onnx.save(m, path)
    return os.path.getsize(path)

# ─────────────────────────────── 학습 ───────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--steps', type=int, default=4000)
    ap.add_argument('--batch', type=int, default=24)
    ap.add_argument('--patch', type=int, default=48)      # HR 패치 크기
    ap.add_argument('--ch', type=int, default=24)
    ap.add_argument('--layers', type=int, default=4)   # 층 수(마지막 출력층 포함)
    ap.add_argument('--lr', type=float, default=1e-3)   # 실측으로 고른 값(3e-3 은 흔들려서 오히려 나쁨)
    ap.add_argument('--out', default='public/models-own/bygency-sr-x2/model.onnx')
    a = ap.parse_args()

    net = Net(a.ch, a.layers)
    # 검증용 — 학습에 쓰지 않는 그림
    vhr = make_hr(24, a.patch)
    vlr = degrade(vhr)
    base_psnr = psnr(up2_bilinear(vlr), vhr)

    t0 = time.time()
    best = -1e9; best_state = None
    for step in range(1, a.steps + 1):
        hr = make_hr(a.batch, a.patch)
        lr_img = degrade(hr)
        out = net.forward(lr_img)
        diff = out - hr
        # 우리가 재는 지표(PSNR)는 곧 평균제곱오차다 → 그것을 직접 줄인다
        loss = float(np.mean(diff * diff))
        g = (2.0 * diff / diff.size * 1e4).astype(np.float32)   # eps 에 묻히지 않게 스케일링(Adam 은 스케일 불변)
        # 코사인 감쇠 — 처음엔 크게, 끝으로 갈수록 곱게 다듬는다
        prog = step / max(1, a.steps)
        rate = a.lr * (0.05 + 0.95 * 0.5 * (1 + math.cos(math.pi * prog)))
        net.backward(g, rate, step)

        if step % 250 == 0 or step == a.steps:
            p = psnr(net.forward(vlr), vhr)
            if p > best:
                best = p
                best_state = [(c.W.copy(), c.b.copy()) for c in (net.c1, net.c2, net.c3, net.c4)]
            print(f'  {step:5d}/{a.steps}  loss {loss:.4f}  검증 {p:.2f} dB  '
                  f'(단순확대 {base_psnr:.2f} dB · 차이 {p-base_psnr:+.2f})  {time.time()-t0:.0f}s', flush=True)

    for c, (W, b) in zip((net.c1, net.c2, net.c3, net.c4), best_state):
        c.W[:] = W; c.b[:] = b
    final = psnr(net.forward(vlr), vhr)

    size = export_onnx(net, a.out)
    meta = {
        'name': 'BYGENCY SR x2', 'scale': 2, 'channels': a.ch, 'steps': a.steps,
        'layers': a.layers,
        'params': int(sum(c.W.size + c.b.size for c in (net.hidden + [net.out]))),
        'bytes': size, 'psnr': round(final, 3), 'bicubicPsnr': round(base_psnr, 3),
        'gain': round(final - base_psnr, 3),
    }
    with open(os.path.join(os.path.dirname(a.out), 'model.json'), 'w') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print('\n' + json.dumps(meta, ensure_ascii=False, indent=2))
    print(f'\n저장: {a.out} ({size/1024:.1f}KB)')
    if final <= base_psnr:
        print('경고: 단순 확대보다 좋지 않다 — 학습이 부족하다')
        raise SystemExit(1)

if __name__ == '__main__':
    main()
