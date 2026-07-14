import { useEffect, useRef } from 'react';

// WebGPU runtime globals (types not in default lib.dom)
declare const GPUBufferUsage: {
  VERTEX: number; INDEX: number; UNIFORM: number; COPY_DST: number;
  [key: string]: number;
};
declare const GPUShaderStage: {
  VERTEX: number; FRAGMENT: number; COMPUTE: number;
  [key: string]: number;
};


// ── Constants ────────────────────────────────────────────────────────────────
const COLS = 24;
const ROWS = 14;
const N    = COLS * ROWS;

// ── WGSL ─────────────────────────────────────────────────────────────────────
const WGSL = /* wgsl */`
  struct Uni {
    mvp  : mat4x4f,
    time : f32,
    _a   : f32,
    _b   : f32,
    _c   : f32,
  }
  @group(0) @binding(0) var<uniform> u : Uni;

  struct VIn  { @location(0) pos : vec3f }
  struct VOut { @builtin(position) clip : vec4f, @location(0) z01 : f32 }

  @vertex fn vs(v: VIn) -> VOut {
    let c = u.mvp * vec4f(v.pos, 1.0);
    return VOut(c, saturate(c.z * 0.5 + 0.58));
  }

  @fragment fn fs_line(f: VOut) -> @location(0) vec4f {
    return vec4f(0.184, 0.44, 0.37, f.z01 * 0.38);
  }

  @fragment fn fs_dot(f: VOut) -> @location(0) vec4f {
    return vec4f(0.26, 0.68, 0.54, f.z01 * 0.72);
  }
`;

// ── Matrix helpers ────────────────────────────────────────────────────────────
type M4 = Float32Array;
const m4i = (): M4 => { const m = new Float32Array(16); m[0]=m[5]=m[10]=m[15]=1; return m; };
const mul4 = (a: M4, b: M4): M4 => {
  const o = new Float32Array(16);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[r*4+k]*b[k*4+c];
      o[r*4+c] = s;
    }
  return o;
};
const projM = (fov: number, asp: number, n: number, f: number): M4 => {
  const t = Math.tan(fov * 0.5), m = new Float32Array(16);
  m[0]=1/(asp*t); m[5]=1/t; m[10]=(f+n)/(n-f); m[11]=-1; m[14]=2*f*n/(n-f);
  return m;
};
const rotY = (a: number): M4 => { const m=m4i(), c=Math.cos(a), s=Math.sin(a); m[0]=c; m[2]=s; m[8]=-s; m[10]=c; return m; };
const rotX = (a: number): M4 => { const m=m4i(), c=Math.cos(a), s=Math.sin(a); m[5]=c; m[6]=-s; m[9]=s; m[10]=c; return m; };
const trns = (x: number, y: number, z: number): M4 => { const m=m4i(); m[12]=x; m[13]=y; m[14]=z; return m; };

// ── Geometry ──────────────────────────────────────────────────────────────────
function mkGeom(): { base: Float32Array; lineIdx: Uint16Array } {
  const base = new Float32Array(N * 3);
  const lines: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const x = (c / (COLS - 1) - 0.5) * 3.6;
      const y = (r / (ROWS - 1) - 0.5) * 2.1;
      base[i*3] = x; base[i*3+1] = y; base[i*3+2] = 0;
      if (c < COLS - 1) lines.push(i, i+1);
      if (r < ROWS - 1) lines.push(i, i+COLS);
    }
  }
  return { base, lineIdx: new Uint16Array(lines) };
}

// ── Wave displacement ─────────────────────────────────────────────────────────
function waveVerts(base: Float32Array, live: Float32Array, t: number) {
  for (let i = 0; i < N; i++) {
    const x = base[i*3], y = base[i*3+1];
    live[i*3] = x; live[i*3+1] = y;
    live[i*3+2] = Math.sin(t*0.52 + x*2.2 + y*1.7) * 0.12
                + Math.cos(t*0.37 + x*1.4 - y*1.9) * 0.07;
  }
}

// ── Canvas 2D fallback ────────────────────────────────────────────────────────
function runC2D(
  canvas: HTMLCanvasElement,
  base: Float32Array,
  lineIdx: Uint16Array,
  live: Float32Array,
  getSmoothed: () => [number, number],
): () => void {
  const ctx = canvas.getContext('2d', { alpha: true })!;
  let raf = 0, t = 0, dead = false;
  const onR = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  onR();
  window.addEventListener('resize', onR);

  const loop = () => {
    if (dead) return;
    t += 0.016;
    const [yaw, pitch] = getSmoothed();
    waveVerts(base, live, t);

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cy=Math.cos(yaw), sy=Math.sin(yaw), cx=Math.cos(pitch), sx=Math.sin(pitch);
    const CX=W*.5, CY=H*.5, SC=Math.min(W,H)*.36, ZC=3.2;

    const p3 = (i: number): [number,number,number] => {
      const x=live[i*3], y=live[i*3+1], z=live[i*3+2];
      const x2=x*cy+z*sy, z2=-x*sy+z*cy;
      const y2=y*cx-z2*sx, z3=y*sx+z2*cx;
      const d = ZC + z3;
      return [CX + x2/d*SC*ZC, CY - y2/d*SC*ZC, d];
    };

    ctx.lineWidth = 0.8;
    for (let li = 0; li < lineIdx.length; li += 2) {
      const [ax,ay,ad] = p3(lineIdx[li]);
      const [bx,by,bd] = p3(lineIdx[li+1]);
      const a = Math.min(0.30, ((ad+bd)*0.5 - (ZC-1.8)) * 0.09);
      if (a <= 0) continue;
      ctx.strokeStyle = `rgba(47,111,94,${a})`;
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
    }
    for (let i = 0; i < N; i++) {
      const [px,py,d] = p3(i);
      const a = Math.min(0.65, (d - (ZC-1.8)) * 0.18);
      if (a <= 0) continue;
      ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI*2);
      ctx.fillStyle = `rgba(55,165,120,${a})`; ctx.fill();
    }

    raf = requestAnimationFrame(loop);
  };

  loop();
  return () => { dead = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onR); };
}

// ── WebGPU renderer ────────────────────────────────────────────────────────────
async function runWebGPU(
  canvas: HTMLCanvasElement,
  base: Float32Array,
  lineIdx: Uint16Array,
  live: Float32Array,
  getSmoothed: () => [number, number],
  isDead: () => boolean,
): Promise<(() => void) | null> {
  try {
    if (!navigator.gpu) return null;

    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
    if (!adapter || isDead()) return null;

    const device = await adapter.requestDevice();
    if (isDead()) { device.destroy(); return null; }

    const fmt = navigator.gpu.getPreferredCanvasFormat();
    const gpuCtx = canvas.getContext('webgpu') as GPUCanvasContext;
    if (!gpuCtx) { device.destroy(); return null; }

    let raf = 0, t = 0;

    const configCanvas = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      gpuCtx.configure({ device, format: fmt, alphaMode: 'premultiplied' });
    };
    configCanvas();
    window.addEventListener('resize', configCanvas);

    // Shader
    const mod = device.createShaderModule({ code: WGSL });

    // Buffers
    const vBuf = device.createBuffer({ size: live.byteLength,      usage: GPUBufferUsage.VERTEX  | GPUBufferUsage.COPY_DST });
    const iBuf = device.createBuffer({ size: lineIdx.byteLength,   usage: GPUBufferUsage.INDEX   | GPUBufferUsage.COPY_DST });
    const uBuf = device.createBuffer({ size: 80,                   usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(iBuf, 0, lineIdx);

    // Shared explicit bind group layout
    const bgl = device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bgl] });
    const bg = device.createBindGroup({ layout: bgl, entries: [{ binding: 0, resource: { buffer: uBuf } }] });

    const blend: GPUBlendState = {
      color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one',       dstFactor: 'one-minus-src-alpha', operation: 'add' },
    };
    const vtxLayout: GPUVertexBufferLayout = {
      arrayStride: 12,
      attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
    };

    const mkPipe = (topo: GPUPrimitiveTopology, fs: string) =>
      device.createRenderPipeline({
        layout: pipelineLayout,
        vertex:   { module: mod, entryPoint: 'vs',  buffers: [vtxLayout] },
        fragment: { module: mod, entryPoint: fs,    targets: [{ format: fmt, blend }] },
        primitive: { topology: topo },
      });

    const linePipe = mkPipe('line-list',  'fs_line');
    const dotPipe  = mkPipe('point-list', 'fs_dot');

    const uData = new Float32Array(20);

    const loop = () => {
      if (isDead()) return;
      t += 0.016;
      const [yaw, pitch] = getSmoothed();
      waveVerts(base, live, t);
      device.queue.writeBuffer(vBuf, 0, live);

      const asp = canvas.width / canvas.height;
      const MVP = mul4(projM(0.72, asp, 0.1, 50), mul4(trns(0,0,-3.3), mul4(rotY(yaw), rotX(pitch))));
      uData.set(MVP, 0); uData[16] = t;
      device.queue.writeBuffer(uBuf, 0, uData);

      const enc  = device.createCommandEncoder();
      const view = gpuCtx.getCurrentTexture().createView();
      const pass = enc.beginRenderPass({
        colorAttachments: [{
          view,
          loadOp:     'clear',
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          storeOp:    'store',
        }],
      });

      pass.setBindGroup(0, bg);
      pass.setVertexBuffer(0, vBuf);

      pass.setPipeline(linePipe);
      pass.setIndexBuffer(iBuf, 'uint16');
      pass.drawIndexed(lineIdx.length);

      pass.setPipeline(dotPipe);
      pass.draw(N);

      pass.end();
      device.queue.submit([enc.finish()]);
      raf = requestAnimationFrame(loop);
    };

    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', configCanvas); device.destroy(); };
  } catch {
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function WebGPUBackground() {
  const gpuRef = useRef<HTMLCanvasElement>(null);
  const c2dRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let mouseYaw = 0, mousePitch = 0, curYaw = 0, curPitch = 0;
    let dead = false;
    let cleanupFn: (() => void) | undefined;

    const onMouse = (e: MouseEvent) => {
      mouseYaw   = (e.clientX / window.innerWidth  - 0.5) * 0.32;
      mousePitch = (e.clientY / window.innerHeight - 0.5) * 0.18;
    };
    window.addEventListener('mousemove', onMouse);

    const getSmoothed = (): [number, number] => {
      curYaw   += (mouseYaw   - curYaw)   * 0.04;
      curPitch += (mousePitch - curPitch) * 0.04;
      return [curYaw, curPitch];
    };

    const { base, lineIdx } = mkGeom();
    const live = new Float32Array(base.length);

    runWebGPU(gpuRef.current!, base, lineIdx, live, getSmoothed, () => dead).then(cleanup => {
      if (dead) { cleanup?.(); return; }
      if (cleanup) {
        gpuRef.current!.style.display = 'block';
        cleanupFn = cleanup;
      } else {
        c2dRef.current!.style.display = 'block';
        cleanupFn = runC2D(c2dRef.current!, base, lineIdx, live, getSmoothed);
      }
    });

    return () => {
      dead = true;
      window.removeEventListener('mousemove', onMouse);
      cleanupFn?.();
    };
  }, []);

  return (
    <>
      <canvas ref={gpuRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, display: 'none' }} aria-hidden />
      <canvas ref={c2dRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, display: 'none' }} aria-hidden />
    </>
  );
}
