// LifeInMoons — the 3D moon, hand-rolled WebGL (no dependency).
// A textured sphere matching the app's MoonGlobe: NASA CGI Moon Kit texture,
// 40 s/revolution, soft front lighting, and a quiet tilt toward the visitor's
// cursor (or a slow sway on touch devices). Copper-tinted when eclipse: true.
//
//   const globe = MoonGlobe(canvas, { src: "moontex.jpg", eclipse: false });
//
// Respects prefers-reduced-motion: the moon holds still (one lit render).

function MoonGlobe(canvas, opts = {}) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
  if (!gl) { canvas.style.display = "none"; return null; }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const REV_MS = 40000; // one revolution, like the app

  const vsrc = `
    attribute vec3 aPos; attribute vec2 aUV;
    uniform mat4 uMVP; uniform mat3 uRot;
    varying vec2 vUV; varying vec3 vNormal;
    void main() {
      vUV = aUV;
      vNormal = uRot * aPos;
      gl_Position = uMVP * vec4(aPos, 1.0);
    }`;
  const fsrc = `
    precision mediump float;
    uniform sampler2D uTex; uniform vec3 uTint;
    varying vec2 vUV; varying vec3 vNormal;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 light = normalize(vec3(0.35, 0.3, 1.0));
      float diff = max(dot(n, light), 0.0);
      float shade = 0.32 + 0.78 * diff;
      vec3 c = texture2D(uTex, vUV).rgb * shade * uTint;
      gl_FragColor = vec4(c, 1.0);
    }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsrc));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsrc));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // unit sphere, 48 x 32
  const SEG = 48, RINGS = 32;
  const pos = [], uv = [], idx = [];
  for (let r = 0; r <= RINGS; r++) {
    const phi = Math.PI * r / RINGS, sp = Math.sin(phi), cp = Math.cos(phi);
    for (let s = 0; s <= SEG; s++) {
      const th = 2 * Math.PI * s / SEG, st = Math.sin(th), ct = Math.cos(th);
      pos.push(sp * ct, cp, sp * st);
      uv.push(1 - s / SEG, r / RINGS);
    }
  }
  for (let r = 0; r < RINGS; r++)
    for (let s = 0; s < SEG; s++) {
      const a = r * (SEG + 1) + s, b = a + SEG + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }

  function buf(target, data, attr, size) {
    const b = gl.createBuffer();
    gl.bindBuffer(target, b);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    if (attr !== undefined) {
      gl.enableVertexAttribArray(attr);
      gl.vertexAttribPointer(attr, size, gl.FLOAT, false, 0, 0);
    }
  }
  buf(gl.ARRAY_BUFFER, new Float32Array(pos), gl.getAttribLocation(prog, "aPos"), 3);
  buf(gl.ARRAY_BUFFER, new Float32Array(uv), gl.getAttribLocation(prog, "aUV"), 2);
  buf(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx));

  const uMVP = gl.getUniformLocation(prog, "uMVP");
  const uRot = gl.getUniformLocation(prog, "uRot");
  const uTint = gl.getUniformLocation(prog, "uTint");
  const tint = opts.eclipse ? [0.93, 0.52, 0.30] : [1, 1, 1];
  gl.uniform3fv(uTint, tint);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE,
                new Uint8Array([200, 195, 185])); // flat moon-grey until loaded
  let texLoaded = false;
  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);
    texLoaded = true;
    if (reduceMotion) draw(performance.now()); // the one still frame
  };
  img.src = opts.src || "assets/moontex.jpg";

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  // pointer tilt — quiet, lerped
  let targetTX = 0, targetTY = 0, tiltX = 0, tiltY = 0;
  const MAXTILT = 0.16; // radians, ~9°
  window.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    const nx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
    const ny = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
    targetTY = Math.max(-1, Math.min(1, nx * 2)) * MAXTILT;
    targetTX = Math.max(-1, Math.min(1, ny * 2)) * MAXTILT;
  }, { passive: true });

  function mats(t) {
    const spin = (t % REV_MS) / REV_MS * 2 * Math.PI;
    // gentle autonomous sway so touch screens aren't static
    const sway = Math.sin(t / 6000) * 0.05;
    const rx = tiltX + sway * 0.4, ry = spin, ty = tiltY;
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(ty), sz = Math.sin(ty);
    // R = tiltZ(view yaw) * tiltX * spinY  (column-major 3x3)
    const r00 = cz * cy + sz * sx * sy, r01 = sz * cx, r02 = -cz * sy + sz * sx * cy;
    const r10 = -sz * cy + cz * sx * sy, r11 = cz * cx, r12 = sz * sy + cz * sx * cy;
    const r20 = cx * sy, r21 = -sx, r22 = cx * cy;
    const R = [r00, r10, r20, r01, r11, r21, r02, r12, r22];

    const w = canvas.width, h = canvas.height, aspect = w / h;
    const fov = 0.62, near = 0.1, far = 10, f = 1 / Math.tan(fov / 2);
    const dist = 3.9; // sphere fills ~85% of the canvas
    // P * T(0,0,-dist) * R, expanded by hand (column-major 4x4)
    const P = [f / aspect, 0, 0, 0, 0, f, 0, 0,
               0, 0, (far + near) / (near - far), -1,
               0, 0, 2 * far * near / (near - far), 0];
    const M = new Float32Array(16);
    for (let c = 0; c < 3; c++)
      for (let r = 0; r < 4; r++)
        M[c * 4 + r] = P[0 * 4 + r] * R[c * 3 + 0] + P[1 * 4 + r] * R[c * 3 + 1] + P[2 * 4 + r] * R[c * 3 + 2];
    for (let r = 0; r < 4; r++)
      M[12 + r] = P[8 + r] * -dist + P[12 + r];
    return { M, R: new Float32Array(R) };
  }

  function draw(t) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    tiltX += (targetTX - tiltX) * 0.04;
    tiltY += (targetTY - tiltY) * 0.04;
    const { M, R } = mats(t);
    gl.uniformMatrix4fv(uMVP, false, M);
    gl.uniformMatrix3fv(uRot, false, R);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  }

  let running = false;
  function loop(t) { if (!running) return; draw(t); requestAnimationFrame(loop); }
  const api = {
    start() {
      if (reduceMotion) { draw(performance.now()); return; }
      if (!running) { running = true; requestAnimationFrame(loop); }
    },
    stop() { running = false; },
    setEclipse(on) {
      gl.useProgram(prog);
      gl.uniform3fv(uTint, on ? [0.93, 0.52, 0.30] : [1, 1, 1]);
    },
  };
  // pause when offscreen — the grid page below deserves the frames
  if ("IntersectionObserver" in window && !reduceMotion) {
    new IntersectionObserver(es =>
      es.forEach(e => e.isIntersecting ? api.start() : api.stop()),
      { threshold: 0.01 }).observe(canvas);
  } else {
    api.start();
  }
  return api;
}

if (typeof module !== "undefined" && module.exports) module.exports = MoonGlobe;
