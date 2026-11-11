/* Original reusable study of photograph-based ordered dithering.
 * createPixelLandscape(host, { source, theme, cell, animate, onStatus }) returns
 * { canvas, ready, setSource, setTheme, setPaused, refresh, destroy }.
 * Sources may be URLs or decoded HTMLImageElements. Cross-origin images need
 * CORS permission; failed or unreadable images use the built-in original scene.
 * Give the host position:relative, a size, and overflow:hidden. Do not transform
 * or filter the canvas/ancestors: nearest-neighbor scaling is aligned to the
 * actual device pixel ratio. maxPixels bounds the grid, not the physical DPR.
 */
(function (scope) {
  'use strict';
  const threshold = [
    0,48,12,60,3,51,15,63,32,16,44,28,35,19,47,31,
    8,56,4,52,11,59,7,55,40,24,36,20,43,27,39,23,
    2,50,14,62,1,49,13,61,34,18,46,30,33,17,45,29,
    10,58,6,54,9,57,5,53,42,26,38,22,41,25,37,21
  ];
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const palettes = {
    dark: [[103,150,190],[172,193,208],[130,145,88],[190,169,115]],
    light: [[42,90,130],[78,112,137],[83,102,48],[135,110,56]]
  };
  const blend = (a, b, f) => a.map((v, i) => Math.round(v + (b[i] - v) * clamp(f)));

  function createPixelLandscape(host, options = {}) {
    if (!host || !host.appendChild) throw new TypeError('A container element is required.');
    const cell = clamp(Number(options.cell) || 2, 1.5, 12);
    const gamma = clamp(Number(options.gamma) || 1.2, 0.5, 3);
    const fps = clamp(Number(options.fps) || 20, 1, 20);
    const maxPixels = Math.round(clamp(Number(options.maxPixels) || 250000, 4096, 1000000));
    const canvas = document.createElement('canvas');
    canvas.className = 'pixel-landscape';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none', imageRendering: 'pixelated' });
    host.appendChild(canvas);
    const context = canvas.getContext('2d');
    const small = document.createElement('canvas');
    const sample = small.getContext('2d', { willReadFrequently: true });
    let destroyed = false, paused = options.animate === false, inView = !('IntersectionObserver' in scope);
    let theme = options.theme === 'light' ? 'light' : 'dark';
    let image = null, generation = 0, frame = 0, timer = 0, resizeFrame = 0;
    let cols = 0, rows = 0, pixelSize = 1, dpr = 1, luminance = null, pixels = null, colors = null;
    let animationSeconds = 0, lastTick = 0, pendingImage = null, pendingResolve = null, loadTimer = 0;
    const reduced = scope.matchMedia('(prefers-reduced-motion: reduce)');
    const status = (value) => { if (!destroyed && typeof options.onStatus === 'function') options.onStatus(value); };

    function terrain(x, y) {
      const distant = 0.29 + 0.06 * Math.sin(x * 9) + 0.045 * Math.sin(x * 23 + 1.6);
      const near = 0.49 + 0.095 * Math.sin(x * 8 + 0.8) + 0.035 * Math.sin(x * 29);
      if (y < distant) return clamp(0.78 - y * 0.38 + 0.08 * Math.sin(x * 11 + y * 8));
      if (y < near) return clamp(0.26 + (y - distant) * 0.7 + 0.06 * Math.sin(x * 37));
      const depth = clamp((y - 0.48) / 0.52);
      const river = 0.58 + Math.sin(depth * 6.5) * (0.025 + depth * 0.13);
      const width = 0.006 + depth * depth * 0.045;
      if (y > 0.48 && Math.abs(x - river) < width) return 0.82 - depth * 0.12;
      return clamp(0.12 + depth * 0.18 + 0.06 * Math.sin(x * 61 + y * 17) * Math.cos(y * 47));
    }

    function alignCanvas() {
      if (destroyed) return;
      const box = host.getBoundingClientRect(), left = box.left || 0, top = box.top || 0;
      canvas.style.left = `${Math.floor(left * dpr) / dpr - left}px`;
      canvas.style.top = `${Math.floor(top * dpr) / dpr - top}px`;
    }

    function rebuild() {
      if (destroyed || !context || !sample) return;
      const box = host.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return;
      dpr = Number.isFinite(scope.devicePixelRatio) && scope.devicePixelRatio > 0 ? scope.devicePixelRatio : 1;
      pixelSize = Math.max(1, Math.round(cell * dpr));
      const physicalWidth = box.width * dpr + 1, physicalHeight = box.height * dpr + 1;
      pixelSize = Math.max(pixelSize, Math.ceil(Math.sqrt(physicalWidth * physicalHeight / maxPixels)));
      while (Math.ceil(physicalWidth / pixelSize) * Math.ceil(physicalHeight / pixelSize) > maxPixels) pixelSize++;
      cols = Math.ceil(physicalWidth / pixelSize);
      rows = Math.ceil(physicalHeight / pixelSize);
      // One backing pixel becomes exactly pixelSize physical pixels. Cropping
      // the final partial cell avoids stretching the grid to a fractional box.
      canvas.width = cols; canvas.height = rows;
      canvas.style.width = `${cols * pixelSize / dpr}px`;
      canvas.style.height = `${rows * pixelSize / dpr}px`;
      alignCanvas();
      small.width = cols; small.height = rows;
      luminance = new Float32Array(cols * rows);
      const sourceRows = Float32Array.from({ length: rows }, (_, y) => (y + 0.5) / rows);
      let sourcePixels;
      if (image) {
        try {
          const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
          const factor = Math.max(cols / iw, rows / ih);
          const sw = cols / factor, sh = rows / factor;
          const focus = clamp(Number.isFinite(options.focusY) ? options.focusY : 0.5);
          const sy = (ih - sh) * focus;
          sample.drawImage(image, (iw - sw) / 2, sy, sw, sh, 0, 0, cols, rows);
          sourcePixels = sample.getImageData(0, 0, cols, rows).data;
          for (let y = 0; y < rows; y++) sourceRows[y] = (sy + (y + 0.5) * sh / rows) / ih;
        } catch (_) {
          image = null;
          // Resizing clears the canvas's origin-tainted state before reuse.
          small.width = cols;
          status('fallback');
        }
      }
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = y * cols + x, j = i * 4;
        luminance[i] = sourcePixels
          ? (sourcePixels[j] * 0.2126 + sourcePixels[j + 1] * 0.7152 + sourcePixels[j + 2] * 0.0722) / 255 * (sourcePixels[j + 3] / 255)
          : terrain(x / Math.max(1, cols - 1), y / Math.max(1, rows - 1));
      }
      colors = {};
      for (const mode of ['light', 'dark']) {
        const palette = palettes[mode], rgb = new Uint8ClampedArray(cols * rows * 3);
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const i = y * cols + x, lum = luminance[i];
          const sky = blend(palette[0], palette[1], lum);
          const earth = lum > 0.7 ? blend(palette[3], palette[1], (lum - 0.7) / 0.3) : blend(palette[2], palette[3], lum / 0.7);
          rgb.set(blend(sky, earth, clamp((sourceRows[y] - 0.44) / 0.18)), i * 3);
        }
        colors[mode] = rgb;
      }
      pixels = sample.createImageData(cols, rows);
      paint(false);
      canvas.classList.add('is-ready');
    }

    function paint(moving) {
      if (destroyed || !pixels || !context) return;
      const rgb = colors[theme], dark = theme === 'dark', data = pixels.data;
      const phase = animationSeconds * Math.PI * 2 / 14;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x, j = i * 4, lum = luminance[i];
          let density = Math.pow(dark ? lum : 1 - lum, gamma);
          if (moving) {
            const band = Math.pow((1 + Math.cos(x / cols * 5.3 + y / rows * 2.4 - phase)) / 2, 6);
            density *= dark ? 1 + band * 0.35 : 1 - band * 0.3;
          }
          if (density > (threshold[(y % 8) * 8 + x % 8] + 0.5) / 64) {
            data[j] = rgb[i * 3]; data[j + 1] = rgb[i * 3 + 1]; data[j + 2] = rgb[i * 3 + 2]; data[j + 3] = 255;
          } else data[j + 3] = 0;
        }
      }
      sample.putImageData(pixels, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(small, 0, 0);
    }

    function eligible() { return !!context && !!sample && !destroyed && !paused && !reduced.matches && inView && !document.hidden && host.isConnected !== false; }
    function stopLoop() {
      scope.cancelAnimationFrame(frame); scope.clearTimeout(timer);
      frame = timer = 0; lastTick = 0;
    }
    function tick(now) {
      frame = 0;
      if (!eligible()) return stopLoop();
      if (lastTick) animationSeconds += Math.min((now - lastTick) / 1000, 0.2);
      lastTick = now;
      paint(true);
      timer = scope.setTimeout(() => { timer = 0; frame = scope.requestAnimationFrame(tick); }, 1000 / fps);
    }
    function updateLoop() {
      stopLoop();
      if (eligible()) frame = scope.requestAnimationFrame(tick);
      else paint(false);
    }
    function refresh() {
      if (destroyed) return;
      scope.cancelAnimationFrame(resizeFrame);
      resizeFrame = scope.requestAnimationFrame(() => { resizeFrame = 0; rebuild(); updateLoop(); });
    }
    function setTheme(value) {
      if (destroyed) return;
      theme = value === 'light' ? 'light' : 'dark';
      paint(eligible());
    }
    function setPaused(value) { if (!destroyed) { paused = Boolean(value); updateLoop(); } }

    async function setSource(source) {
      if (destroyed) return 'cancelled';
      const revision = ++generation;
      if (pendingImage) {
        pendingImage.onload = pendingImage.onerror = null;
        scope.clearTimeout(loadTimer); pendingResolve?.(null);
        pendingImage = pendingResolve = null;
      }
      if (!source) { image = null; rebuild(); status('procedural'); return 'procedural'; }
      let loaded;
      try {
        if (typeof source === 'string') {
          loaded = await new Promise((resolve) => {
            const next = new Image(); pendingImage = next; pendingResolve = resolve;
            next.crossOrigin = 'anonymous'; next.decoding = 'async';
            const finish = value => { scope.clearTimeout(loadTimer); next.onload = next.onerror = null; resolve(value); };
            next.onload = () => finish(next); next.onerror = () => finish(null);
            loadTimer = scope.setTimeout(() => finish(null), 15000);
            next.src = source;
          });
        } else {
          loaded = source;
          if (!loaded.complete && typeof loaded.decode === 'function') await loaded.decode();
        }
        if (!loaded || !(loaded.naturalWidth || loaded.width)) throw new Error('Empty image');
      } catch (_) { loaded = null; }
      if (destroyed || revision !== generation) return 'cancelled';
      pendingImage = pendingResolve = null; image = loaded; rebuild(); updateLoop();
      const result = image ? 'image' : 'fallback'; status(result); return result;
    }

    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(refresh) : null;
    const intersection = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
      inView = entries.some(entry => entry.isIntersecting); updateLoop();
    }) : null;
    resize?.observe(host); intersection?.observe(host);
    scope.addEventListener('resize', refresh);
    scope.addEventListener('scroll', alignCanvas, { capture: true, passive: true });
    document.addEventListener('visibilitychange', updateLoop);
    if (reduced.addEventListener) reduced.addEventListener('change', updateLoop);
    else reduced.addListener(updateLoop);
    rebuild(); updateLoop();
    if (!context || !sample) status('canvas-unavailable');
    const ready = options.source ? setSource(options.source) : Promise.resolve('procedural');
    function destroy() {
      if (destroyed) return;
      destroyed = true; generation++;
      stopLoop(); scope.cancelAnimationFrame(resizeFrame);
      resize?.disconnect(); intersection?.disconnect();
      scope.removeEventListener('resize', refresh);
      scope.removeEventListener('scroll', alignCanvas, true);
      document.removeEventListener('visibilitychange', updateLoop);
      if (reduced.removeEventListener) reduced.removeEventListener('change', updateLoop);
      else reduced.removeListener(updateLoop);
      if (pendingImage) pendingImage.onload = pendingImage.onerror = null;
      scope.clearTimeout(loadTimer); pendingResolve?.(null);
      image = luminance = pixels = colors = pendingImage = pendingResolve = null;
      canvas.remove();
    }
    return { canvas, ready, setSource, setTheme, setPaused, refresh, destroy };
  }
  scope.createPixelLandscape = createPixelLandscape;
})(typeof window === 'undefined' ? globalThis : window);
