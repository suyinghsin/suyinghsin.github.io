(() => {
  const stage = document.querySelector('[data-su-particles]');
  if (!stage) return;

  const canvas = stage.querySelector('.su-particle-canvas');
  const status = stage.querySelector('.su-particle-status');
  const modeButton = stage.querySelector('[data-particle-mode]');
  const resonateButton = stage.querySelector('[data-particle-resonate]');
  const pauseButton = stage.querySelector('[data-particle-pause]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: 'high-performance',
    premultipliedAlpha: false
  });

  const copy = (zh, en) => document.documentElement.lang.startsWith('zh') ? zh : en;
  const fail = message => {
    stage.classList.add('is-error');
    status.textContent = message;
    canvas.hidden = true;
    modeButton.hidden = true;
    resonateButton.hidden = true;
    pauseButton.hidden = true;
  };

  if (!gl) {
    fail(copy('無法載入粒子動畫，顯示靜態 SYH', 'Particle system unavailable — showing static SYH'));
    return;
  }

  const vertexSource = `
    precision highp float;
    attribute vec2 aTarget;
    attribute vec2 aNebula;
    attribute vec4 aSeed;
    uniform float uTime;
    uniform float uMorph;
    uniform float uAspect;
    uniform float uDpr;
    uniform vec2 uPointer;
    uniform float uPointerActive;
    uniform vec2 uShockCenter;
    uniform float uShockAge;
    varying float vTone;
    varying float vGlow;

    float ease(float value) {
      return value * value * (3.0 - 2.0 * value);
    }

    void main() {
      float delay = aSeed.x * 0.18;
      float localMorph = ease(clamp((uMorph - delay) / 0.82, 0.0, 1.0));
      vec2 target = aTarget;
      vec2 cloud = aNebula;
      float time = uTime * (0.72 + aSeed.y * 0.46);

      float breathe = 1.0 + sin(time * 0.72 + aSeed.z * 6.2831) * 0.018;
      target *= breathe;
      target += vec2(
        sin(time * 0.95 + aSeed.x * 17.0),
        cos(time * 0.82 + aSeed.y * 19.0)
      ) * (0.006 + aSeed.w * 0.006);

      float cloudAngle = time * (0.055 + aSeed.w * 0.075) * mix(-1.0, 1.0, step(0.5, aSeed.z));
      float cs = cos(cloudAngle);
      float sn = sin(cloudAngle);
      cloud = mat2(cs, -sn, sn, cs) * cloud;
      cloud += vec2(
        sin(time * 0.31 + aSeed.z * 11.0),
        cos(time * 0.27 + aSeed.x * 13.0)
      ) * (0.025 + aSeed.y * 0.035);

      vec2 position = mix(target, cloud, localMorph);
      vec2 route = cloud - target;
      vec2 normal = normalize(vec2(-route.y, route.x) + vec2(0.0001));
      position += normal * sin(localMorph * 3.14159) * (aSeed.w - 0.5) * 0.32;

      vec2 pointerDelta = position - uPointer;
      float pointerDistance = length(pointerDelta);
      float pointerForce = smoothstep(0.34, 0.015, pointerDistance) * uPointerActive;
      vec2 pointerDirection = pointerDelta / max(pointerDistance, 0.012);
      position += pointerDirection * pointerForce * 0.24;
      position += vec2(-pointerDirection.y, pointerDirection.x) * pointerForce * 0.075;

      vec2 shockDelta = position - uShockCenter;
      float shockDistance = length(shockDelta);
      float shockRadius = uShockAge * 0.72;
      float shockRing = exp(-pow((shockDistance - shockRadius) * 11.0, 2.0));
      float shockLife = 1.0 - smoothstep(0.0, 2.4, uShockAge);
      position += shockDelta / max(shockDistance, 0.015) * shockRing * shockLife * 0.34;

      gl_Position = vec4(position.x / uAspect, position.y, 0.0, 1.0);
      float bright = step(0.84, aSeed.z) + step(0.965, aSeed.w);
      gl_PointSize = (2.35 + aSeed.y * 2.15 + bright * 2.1) * uDpr;
      vTone = aSeed.z;
      vGlow = 0.68 + bright * 0.3;
    }
  `;

  const fragmentSource = `
    precision mediump float;
    varying float vTone;
    varying float vGlow;

    void main() {
      vec2 point = gl_PointCoord - 0.5;
      float distanceToCenter = length(point) * 2.0;
      float halo = smoothstep(1.0, 0.08, distanceToCenter);
      float core = smoothstep(0.34, 0.0, distanceToCenter);
      float alpha = halo * 0.42 + core * 0.92;
      vec3 cyan = vec3(0.38, 0.84, 0.87);
      vec3 ice = vec3(0.89, 0.98, 0.97);
      vec3 warm = vec3(0.96, 0.94, 0.88);
      vec3 color = mix(cyan, ice, smoothstep(0.3, 0.9, vTone));
      color = mix(color, warm, smoothstep(0.96, 1.0, vTone));
      gl_FragColor = vec4(color * vGlow, alpha);
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed');
    }
    return shader;
  };

  const createProgram = () => {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Program linking failed');
    }
    return program;
  };

  const random = (() => {
    let seed = 9022026;
    return () => {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
      value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  })();

  const createTargetCandidates = () => {
    const source = document.createElement('canvas');
    source.width = 1200;
    source.height = 560;
    const context = source.getContext('2d', { willReadFrequently: true });
    context.clearRect(0, 0, source.width, source.height);
    context.fillStyle = '#fff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 360px Inter, Arial Black, Arial, sans-serif';
    context.fillText('SYH', source.width / 2, source.height / 2 + 16);
    const pixels = context.getImageData(0, 0, source.width, source.height).data;
    const candidates = [];
    const step = 3;
    for (let y = 0; y < source.height; y += step) {
      for (let x = 0; x < source.width; x += step) {
        if (pixels[(y * source.width + x) * 4 + 3] > 120) candidates.push([x, y]);
      }
    }
    return candidates;
  };

  const hardwareThreads = navigator.hardwareConcurrency || 4;
  const stageWidth = stage.getBoundingClientRect().width;
  const desiredCount = stageWidth < 540 ? 7800 : stageWidth < 860 ? 12000 : 16000;
  const particleCount = hardwareThreads <= 4 ? Math.min(desiredCount, 9000) : desiredCount;

  let program;
  try {
    program = createProgram();
  } catch (error) {
    fail(copy('粒子著色器載入失敗，顯示靜態 SYH', 'Particle shader failed — showing static SYH'));
    return;
  }

  const candidates = createTargetCandidates();
  if (!candidates.length) {
    fail(copy('無法建立 SYH 粒子，顯示靜態標誌', 'Unable to build SYH particles — showing static mark'));
    return;
  }

  const targetData = new Float32Array(particleCount * 2);
  const nebulaData = new Float32Array(particleCount * 2);
  const seedData = new Float32Array(particleCount * 4);
  const fontSize = 360;
  const centerX = 600;
  const centerY = 298;

  for (let index = 0; index < particleCount; index += 1) {
    const candidate = candidates[Math.floor(random() * candidates.length)];
    const targetOffset = index * 2;
    const seedOffset = index * 4;
    const jitterX = (random() - 0.5) * 2.5;
    const jitterY = (random() - 0.5) * 2.5;
    targetData[targetOffset] = ((candidate[0] + jitterX - centerX) / fontSize) * 0.66;
    targetData[targetOffset + 1] = ((centerY - candidate[1] - jitterY) / fontSize) * 0.66;

    const radius = Math.pow(random(), 0.58) * (0.38 + random() * 1.18);
    const angle = random() * Math.PI * 2 + radius * 5.2;
    const arm = 0.74 + random() * 0.48;
    nebulaData[targetOffset] = Math.cos(angle) * radius * arm + (random() - 0.5) * 0.16;
    nebulaData[targetOffset + 1] = Math.sin(angle) * radius * 0.58 + (random() - 0.5) * 0.13;

    seedData[seedOffset] = random();
    seedData[seedOffset + 1] = random();
    seedData[seedOffset + 2] = random();
    seedData[seedOffset + 3] = random();
  }

  const bindAttribute = (name, data, size) => {
    const location = gl.getAttribLocation(program, name);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  };

  gl.useProgram(program);
  bindAttribute('aTarget', targetData, 2);
  bindAttribute('aNebula', nebulaData, 2);
  bindAttribute('aSeed', seedData, 4);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.disable(gl.DEPTH_TEST);

  const uniforms = {
    time: gl.getUniformLocation(program, 'uTime'),
    morph: gl.getUniformLocation(program, 'uMorph'),
    aspect: gl.getUniformLocation(program, 'uAspect'),
    dpr: gl.getUniformLocation(program, 'uDpr'),
    pointer: gl.getUniformLocation(program, 'uPointer'),
    pointerActive: gl.getUniformLocation(program, 'uPointerActive'),
    shockCenter: gl.getUniformLocation(program, 'uShockCenter'),
    shockAge: gl.getUniformLocation(program, 'uShockAge')
  };

  let width = 1;
  let height = 1;
  let aspect = 1;
  let dpr = 1;
  let frame = 0;
  let paused = false;
  let manualTarget = null;
  let manualMorph = 0;
  let pointerActive = 0;
  let pointerTargetActive = 0;
  let pointerX = 0;
  let pointerY = 0;
  let shockX = 0;
  let shockY = 0;
  let shockStarted = -10000;
  const started = performance.now();

  const resize = () => {
    const bounds = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, stageWidth < 540 ? 1.4 : 1.75);
    width = Math.max(1, Math.round(bounds.width * dpr));
    height = Math.max(1, Math.round(bounds.height * dpr));
    aspect = bounds.width / Math.max(bounds.height, 1);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const ease = value => value * value * (3 - 2 * value);
  const automaticMorph = seconds => {
    const cycle = (seconds % 36) / 36;
    if (cycle < 0.25) return 0;
    if (cycle < 0.47) return ease((cycle - 0.25) / 0.22);
    if (cycle < 0.72) return 1;
    return 1 - ease((cycle - 0.72) / 0.28);
  };

  const render = now => {
    resize();
    const seconds = (now - started) / 1000;
    const targetMorph = manualTarget === null ? automaticMorph(seconds) : manualTarget;
    manualMorph += (targetMorph - manualMorph) * (manualTarget === null ? 0.055 : 0.085);
    pointerActive += (pointerTargetActive - pointerActive) * 0.14;
    const shockAge = Math.max(0, (now - shockStarted) / 1000);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uniforms.time, seconds);
    gl.uniform1f(uniforms.morph, reducedMotion ? 0 : manualMorph);
    gl.uniform1f(uniforms.aspect, aspect);
    gl.uniform1f(uniforms.dpr, dpr);
    gl.uniform2f(uniforms.pointer, pointerX, pointerY);
    gl.uniform1f(uniforms.pointerActive, reducedMotion ? 0 : pointerActive);
    gl.uniform2f(uniforms.shockCenter, shockX, shockY);
    gl.uniform1f(uniforms.shockAge, reducedMotion ? 99 : shockAge);
    gl.drawArrays(gl.POINTS, 0, particleCount);

    if (!paused && !reducedMotion) frame = requestAnimationFrame(render);
  };

  const updatePointer = event => {
    const bounds = stage.getBoundingClientRect();
    pointerX = (((event.clientX - bounds.left) / bounds.width) * 2 - 1) * aspect;
    pointerY = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;
    pointerTargetActive = 1;
  };

  const resonate = event => {
    const bounds = stage.getBoundingClientRect();
    const clientX = event?.clientX ?? bounds.left + bounds.width / 2;
    const clientY = event?.clientY ?? bounds.top + bounds.height / 2;
    shockX = (((clientX - bounds.left) / bounds.width) * 2 - 1) * aspect;
    shockY = 1 - ((clientY - bounds.top) / bounds.height) * 2;
    shockStarted = performance.now();
    if (paused) render(performance.now());
  };

  stage.addEventListener('pointermove', updatePointer, { passive: true });
  stage.addEventListener('pointerenter', updatePointer, { passive: true });
  stage.addEventListener('pointerleave', () => { pointerTargetActive = 0; }, { passive: true });
  stage.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    updatePointer(event);
    resonate(event);
  });

  modeButton.addEventListener('click', () => {
    manualTarget = manualTarget === 1 ? 0 : 1;
    modeButton.setAttribute('aria-pressed', String(manualTarget === 1));
    modeButton.textContent = manualTarget === 1
      ? copy('凝聚標誌', 'Form logo')
      : copy('切換星雲', 'View nebula');
    status.textContent = manualTarget === 1 ? 'NEBULA / LIVE' : 'SYH MARK / LIVE';
  });

  resonateButton.addEventListener('click', () => resonate());

  pauseButton.addEventListener('click', () => {
    paused = !paused;
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.textContent = paused ? copy('播放', 'Play') : copy('暫停', 'Pause');
    status.textContent = paused ? 'PARTICLE FIELD / PAUSED' : 'PARTICLE FIELD / LIVE';
    if (!paused) frame = requestAnimationFrame(render);
  });

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) cancelAnimationFrame(frame);
    if (!document.hidden && !paused && !reducedMotion) frame = requestAnimationFrame(render);
  });

  if (reducedMotion) {
    pauseButton.textContent = copy('靜態', 'Static');
    pauseButton.disabled = true;
    status.textContent = 'REDUCED MOTION / STATIC SYH';
  } else {
    status.textContent = `SYH PARTICLES / ${particleCount.toLocaleString()} / LIVE`;
  }

  resize();
  render(performance.now());
  stage.classList.add('is-ready');
})();
