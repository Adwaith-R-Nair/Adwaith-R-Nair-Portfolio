import { samplePortrait } from "./sampling";

interface Req {
  url: string;
  n: number;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<Req>) => {
  try {
    const res = await fetch(e.data.url);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const bmp = await createImageBitmap(await res.blob());
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) throw new Error("no 2d context in worker");
    g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, bmp.width, bmp.height);
    const out = samplePortrait(d.data, d.width, d.height, e.data.n);
    ctx.postMessage(out, [out.pos.buffer, out.col.buffer]);
  } catch (err) {
    ctx.postMessage({ error: String(err) });
  }
};
