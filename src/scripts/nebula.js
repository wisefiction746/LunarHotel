// Raw WebGL nebula — no Three.js dependency.
// Fullscreen quad, custom domain-warped FBM shader.

const VERT = `
attribute vec2 a_pos;
varying vec2 vUv;
void main() {
  vUv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uScroll;
uniform vec2  uRes;

// ── Hash / noise ───────────────────────────────────────
float hash1(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec2 hash2(vec2 p) {
  return vec2(hash1(p), hash1(p * 1.619 + 4.1));
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash1(i),             hash1(i + vec2(1,0)), u.x),
    mix(hash1(i + vec2(0,1)), hash1(i + vec2(1,1)), u.x),
    u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) {
    v += a * vnoise(p);
    p  = p * 2.13 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// ── Star field ────────────────────────────────────────
float stars(vec2 uv, float scale, float twinkleSpeed) {
  vec2 cell = floor(uv * scale);
  vec2 fcel = fract(uv * scale) - 0.5;
  vec2 jitter = (hash2(cell) - 0.5) * 0.72;
  float dist = length(fcel - jitter);
  float size = hash1(cell * 3.71) * 0.010 + 0.001;
  float twinkle = 0.65 + 0.35 * sin(uTime * twinkleSpeed + hash1(cell) * 6.28);
  return smoothstep(size, 0.0, dist) * hash1(cell + 0.5) * twinkle;
}

// ── Section color palette ─────────────────────────────
vec3 nebColor(float t) {
  // Anchors:  0=hero magenta, .2=violet, .45=residence deep-violet,
  //           .6=restaurant gold, .78=wellness teal, 1=journey midnight
  vec3 c[6];
  c[0] = vec3(0.545, 0.176, 0.361); // #8B2D5C magenta
  c[1] = vec3(0.357, 0.165, 0.525); // #5B2A86 violet
  c[2] = vec3(0.360, 0.120, 0.480); // deeper violet
  c[3] = vec3(0.784, 0.518, 0.239); // #C8843D ember gold
  c[4] = vec3(0.122, 0.420, 0.420); // #1F6B6B teal
  c[5] = vec3(0.075, 0.075, 0.140); // midnight

  float idx = clamp(t, 0.0, 0.9999) * 5.0;
  int   i   = int(idx);
  float f   = fract(idx);
  float s   = f * f * (3.0 - 2.0 * f); // smoothstep
  if (i == 0) return mix(c[0], c[1], s);
  if (i == 1) return mix(c[1], c[2], s);
  if (i == 2) return mix(c[2], c[3], s);
  if (i == 3) return mix(c[3], c[4], s);
  return        mix(c[4], c[5], s);
}

void main() {
  vec2 uv  = vUv;
  float ar = uRes.x / uRes.y;
  vec2 auv = vec2(uv.x * ar, uv.y);

  float drift = uTime * 0.007;
  vec2 d = vec2(drift, drift * 0.41);

  // Domain-warped FBM — 3 levels of warping for organic flow
  float q1 = fbm(auv * 1.6  + d);
  float q2 = fbm(auv * 1.6  + vec2(q1) + vec2(1.7, 9.2) + d * 0.6);
  float n1 = fbm(auv * 2.2  + vec2(q1 * 0.9, q2 * 0.7) + d * 1.1);

  float r1 = fbm(auv * 3.1  - d * 0.7 + vec2(q2));
  float n2 = fbm(auv * 1.8  - vec2(r1 * 0.55) + d * 0.5);

  vec3 col1 = nebColor(uScroll);
  vec3 col2 = nebColor(clamp(uScroll + 0.18, 0.0, 1.0));
  vec3 col3 = nebColor(clamp(uScroll - 0.12, 0.0, 1.0));

  float d1 = smoothstep(0.44, 0.90, n1);
  float d2 = smoothstep(0.48, 0.88, n2);
  float edge = smoothstep(0.42, 0.60, n1) - smoothstep(0.60, 0.88, n1);

  // Deep space base
  vec3 col = vec3(0.022, 0.022, 0.036);
  col += col1 * d1 * 0.38;
  col += col2 * d2 * 0.22;
  col += col3 * edge * 0.14;   // rim glow

  // Stars — three scale layers
  float s1 = stars(uv,           200.0, 0.8) * 0.80;
  float s2 = stars(uv + 0.379,   95.0, 0.5) * 0.55;
  float s3 = stars(uv + 0.721,   38.0, 0.3) * 0.40;
  float sf  = s1 + s2 + s3;

  // Faint six-ray diffraction on bright stars
  vec2 sDir = normalize(vec2(1.0, 0.577));
  float ray = 0.0;
  ray += smoothstep(0.007, 0.0, abs(dot(fract(uv * 200.0 + 0.379) - 0.5, sDir)));
  ray *= s1 * 0.25;

  vec3 starTint = mix(vec3(0.82, 0.87, 1.0), vec3(1.0, 0.96, 0.88), hash1(floor(uv * 200.0)));
  col += starTint * sf;
  col += vec3(1.0, 0.85, 0.6) * ray;

  // Soft self-bloom on bright nebula
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col += col * max(0.0, lum - 0.38) * 0.55;

  // Vignette — heavier at corners
  float vig = length((uv - 0.5) * vec2(1.4, 1.2));
  col *= smoothstep(1.1, 0.38, vig);

  gl_FragColor = vec4(col, 1.0);
}`;

export function initNebula() {
  const canvas = document.getElementById('nebula-canvas');
  if (!canvas) return null;

  // Prefer WebGL2, fallback to 1
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) { canvas.style.display = 'none'; return null; }

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('Shader error:', gl.getShaderInfoLog(s));
    }
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER,   VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // Fullscreen triangle — one draw call
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uTime   = gl.getUniformLocation(prog, 'uTime');
  const uScroll = gl.getUniformLocation(prog, 'uScroll');
  const uRes    = gl.getUniformLocation(prog, 'uRes');

  let scrollVal = 0;
  let targetScroll = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio, 1.5);
    canvas.width  = innerWidth  * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width  = innerWidth  + 'px';
    canvas.style.height = innerHeight + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }
  resize();
  addEventListener('resize', resize);

  // Respect prefers-reduced-motion
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let startTime = null;
  function draw(ts) {
    if (!startTime) startTime = ts;
    const t = reduced ? 0 : (ts - startTime) * 0.001;

    // Smooth scroll lerp on the shader side too
    scrollVal += (targetScroll - scrollVal) * 0.04;

    gl.uniform1f(uTime,   t);
    gl.uniform1f(uScroll, scrollVal);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  return {
    setScroll: (v) => { targetScroll = Math.max(0, Math.min(1, v)); },
  };
}
