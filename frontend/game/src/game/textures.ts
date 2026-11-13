import Phaser from "phaser";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}

export function createGeneratedTextures(scene: Phaser.Scene) {
  {
    const { c, g } = canvas(4, 4);
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 4, 4);
    scene.textures.addCanvas("px", c);
  }

  {
    const { c, g } = canvas(32, 32);
    g.fillStyle = g.shadowColor = "#63e6ff";
    g.shadowBlur = 10;
    g.beginPath();
    g.arc(16, 16, 5, 0, Math.PI * 2);
    g.fill();
    scene.textures.addCanvas("xp", c);
  }

  {
    const { c, g } = canvas(56, 36);
    g.shadowColor = g.fillStyle = "#63e6ff";
    g.shadowBlur = 14;
    g.fillRect(16, 15, 24, 6);
    g.shadowBlur = 0;
    g.fillStyle = "#fff";
    g.fillRect(24, 16.5, 12, 3);
    scene.textures.addCanvas("bolt", c);
  }

  {
    const S = 80;
    const N = 5;
    const { c, g } = canvas(S * N, S * N);
    g.fillStyle = "#070b14";
    g.fillRect(0, 0, S * N, S * N);
    g.strokeStyle = "rgba(38,210,180,0.10)";
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < N; i++) {
      g.moveTo(i * S + 0.5, 0);
      g.lineTo(i * S + 0.5, S * N);
      g.moveTo(0, i * S + 0.5);
      g.lineTo(S * N, i * S + 0.5);
    }
    g.stroke();
    g.fillStyle = "rgba(38,210,180,0.16)";
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const h = (Math.imul(i + 3, 374761393) ^ Math.imul(j + 7, 668265263)) >>> 0;
        if (h % 3 === 0) g.fillRect(i * S - 2, j * S - 2, 4, 4);
        if (h % 5 === 0) g.fillRect(i * S, j * S - 1, S * 0.5, 2);
      }
    }
    scene.textures.addCanvas("grid", c);
  }

  {
    const W = 12;
    const H = 18;
    const chars = Phaser.GameObjects.RetroFont.TEXT_SET1;
    const perRow = 16;
    const rows = Math.ceil(chars.length / perRow);
    const { c, g } = canvas(W * perRow, H * rows);
    g.font = "700 15px ui-monospace,Menlo,Consolas,monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (let i = 0; i < chars.length; i++) {
      const x = (i % perRow) * W + W / 2;
      const y = Math.floor(i / perRow) * H + H / 2;
      g.fillStyle = "rgba(0,0,0,0.75)";
      g.fillText(chars[i], x + 1.5, y + 1.5);
      g.fillStyle = "#fff";
      g.fillText(chars[i], x, y);
    }
    scene.textures.addCanvas("font", c);
    scene.cache.bitmapFont.add(
      "font",
      Phaser.GameObjects.RetroFont.Parse(scene, {
        image: "font",
        width: W,
        height: H,
        chars,
        charsPerRow: perRow,
        "offset.x": 0,
        "offset.y": 0,
        "spacing.x": 0,
        "spacing.y": 0,
        lineSpacing: 0,
      }),
    );
  }
}

export function hueVariants(scene: Phaser.Scene, key: string, count: number, baseColor: number) {
  const src = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const keys: string[] = [];
  const colors: number[] = [];
  for (let n = 0; n < count; n++) {
    const m = hueMatrix((360 / count) * n);
    const { c, g } = canvas(src.width, src.height);
    g.drawImage(src, 0, 0);
    const img = g.getImageData(0, 0, src.width, src.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) [d[i], d[i + 1], d[i + 2]] = rotate(m, d[i], d[i + 1], d[i + 2]);
    g.putImageData(img, 0, 0);
    scene.textures.addCanvas(`${key}#${n}`, c);
    keys.push(`${key}#${n}`);
    const [r, gr, b] = rotate(m, (baseColor >> 16) & 255, (baseColor >> 8) & 255, baseColor & 255);
    colors.push((r << 16) | (gr << 8) | b);
  }
  return { keys, colors };
}

function hueMatrix(deg: number) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
}

function rotate(m: number[], r: number, g: number, b: number): [number, number, number] {
  const k = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return [k(m[0] * r + m[1] * g + m[2] * b), k(m[3] * r + m[4] * g + m[5] * b), k(m[6] * r + m[7] * g + m[8] * b)];
}
