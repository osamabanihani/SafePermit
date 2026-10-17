/* Local Three.js photograph-based depth scene. No application data or storage. */
(function () {
  "use strict";
  const THREE = window.SafePermitTHREE;
  if (!THREE) return;

  const vertexShader = `
    varying vec2 vUv;
    uniform float uDepth;
    void main() {
      vUv = uv;
      vec4 world = modelMatrix * vec4(position, 1.0);
      // The hall recedes towards its centre; the portrait keeps one rigid face.
      float edges = smoothstep(0.05, 1.0, abs(uv.x - 0.5) * 2.0);
      world.z += uDepth * (edges * 0.6 + (1.0 - uv.y) * 0.25 - 0.5);
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `;
  const colorFunctions = `
    uniform sampler2D uMask;
    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uRevealStrength;
    uniform float uLamp;
    float brush() {
      return texture2D(uMask, gl_FragCoord.xy / uResolution).a * uRevealStrength;
    }
    float lamp() {
      vec2 delta = (gl_FragCoord.xy / uResolution - uPointer) * vec2(uResolution.x / uResolution.y, 1.0);
      return exp(-dot(delta, delta) * 8.0) * uLamp;
    }
    vec3 desaturate(vec3 color) {
      float value = dot(color, vec3(0.2126, 0.7152, 0.0722));
      return vec3(value) * vec3(0.92, 0.975, 1.035);
    }
  `;
  const factoryFragment = `
    varying vec2 vUv;
    uniform sampler2D uPhoto;
    uniform float uRTL;
    ${colorFunctions}
    void main() {
      vec3 photo = texture2D(uPhoto, vUv).rgb;
      vec3 color = mix(desaturate(photo), photo, brush());
      color *= vec3(0.96, 1.0, 1.045);
      color += photo * vec3(0.22, 0.095, 0.018) * lamp();
      vec2 screen = gl_FragCoord.xy / uResolution;
      float copySide = mix(screen.x, 1.0 - screen.x, uRTL);
      float shade = mix(0.16, 0.91, smoothstep(0.0, 0.74, copySide));
      shade *= mix(0.28, 1.0, smoothstep(0.0, 0.45, screen.y));
      float vignette = 1.0 - 0.24 * smoothstep(0.2, 0.72, distance(screen, vec2(0.5)));
      color *= shade * vignette;
      gl_FragColor = vec4(color, 1.0);
      #include <colorspace_fragment>
    }
  `;
  const portraitFragment = `
    varying vec2 vUv;
    uniform sampler2D uOrdinary;
    uniform sampler2D uSafety;
    uniform vec2 uTexel;
    uniform float uOpacity;
    ${colorFunctions}
    void main() {
      vec4 safety = texture2D(uSafety, vUv);
      if (safety.a < 0.002) discard;
      vec3 ordinary = texture2D(uOrdinary, vUv).rgb;
      vec3 color = mix(desaturate(ordinary), safety.rgb, brush());
      // Soft practical light, inside the original alpha outline only.
      float edge = 1.0 - texture2D(uSafety, vUv + vec2(-uTexel.x * 2.0, uTexel.y)).a;
      color *= vec3(0.975, 1.0, 1.025);
      color += color * vec3(0.13, 0.06, 0.015) * lamp();
      color += vec3(0.10, 0.062, 0.028) * edge * (0.18 + lamp() * 0.5);
      gl_FragColor = vec4(color, safety.a * uOpacity);
      #include <colorspace_fragment>
    }
  `;
  const hazeFragment = `
    varying vec2 vUv;
    ${colorFunctions}
    void main() {
      float beam = exp(-pow((vUv.x - (0.75 - vUv.y * 0.16)) * 4.8, 2.0));
      beam *= smoothstep(0.08, 0.90, vUv.y);
      float haze = exp(-dot((vUv - vec2(0.67, 0.77)) * vec2(2.0, 1.5), (vUv - vec2(0.67, 0.77)) * vec2(2.0, 1.5)) * 3.0);
      gl_FragColor = vec4(vec3(0.68, 0.58, 0.41), (beam * 0.022 + haze * 0.012) * (0.65 + lamp()));
      #include <colorspace_fragment>
    }
  `;
  const shadowFragment = `
    varying vec2 vUv;
    void main() {
      vec2 distanceFromCentre = (vUv - vec2(0.5)) * vec2(2.0, 4.0);
      float opacity = exp(-dot(distanceFromCentre, distanceFromCentre) * 3.0) * 0.30;
      gl_FragColor = vec4(0.018, 0.030, 0.045, opacity);
      #include <colorspace_fragment>
    }
  `;
  const dustVertex = `
    attribute float aSeed;
    varying float vSeed;
    uniform float uTime;
    uniform float uPixelRatio;
    void main() {
      vSeed = aSeed;
      vec3 point = position;
      point.x += sin(uTime * 0.18 + aSeed * 21.0) * 4.0;
      point.y += cos(uTime * 0.12 + aSeed * 17.0) * 3.0;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
      gl_PointSize = (1.2 + aSeed * 2.4) * uPixelRatio;
    }
  `;
  const dustFragment = `
    varying float vSeed;
    ${colorFunctions}
    void main() {
      vec2 point = gl_PointCoord - vec2(0.5);
      float softness = exp(-dot(point, point) * 18.0);
      float opacity = softness * (0.016 + lamp() * 0.055) * (0.4 + vSeed * 0.6);
      gl_FragColor = vec4(vec3(0.72, 0.66, 0.51), opacity);
      #include <colorspace_fragment>
    }
  `;

  function create({ stage, factory, engineer, ordinary, mask, onInvalidate }) {
    const resources = [];
    let renderer, failed = false, disposed = false;
    let width = 0, height = 0, backgroundBox, engineerBox, wordBox, pixelRatio = 1;
    const canvas = document.createElement("canvas");
    const release = () => resources.forEach((resource) => resource.dispose());
    try {
      const context = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power" });
      if (!context) return null;
      renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x07141d, 0);
      renderer.debug.onShaderError = () => { failed = true; };
      canvas.className = "sc-three-canvas";
      canvas.setAttribute("aria-hidden", "true");
      stage.appendChild(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 1, 6000);
      const texture = (image, isCanvas = false, isMask = false) => {
        const value = isCanvas ? new THREE.CanvasTexture(image) : new THREE.Texture(image);
        value.colorSpace = isMask ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        value.minFilter = value.magFilter = THREE.LinearFilter;
        value.generateMipmaps = false;
        value.needsUpdate = true;
        resources.push(value);
        return value;
      };
      const factoryTexture = texture(factory), safetyTexture = texture(engineer);
      const ordinaryTexture = texture(ordinary, true), maskTexture = texture(mask, true, true);
      const shared = {
        uMask: { value: maskTexture }, uResolution: { value: new THREE.Vector2(1, 1) },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) }, uRevealStrength: { value: 0 }, uLamp: { value: 0 }
      };
      const geometry = new THREE.PlaneGeometry(1, 1);
      const hallGeometry = new THREE.PlaneGeometry(1, 1, 56, 32);
      resources.push(geometry, hallGeometry);
      const material = (fragmentShader, uniforms = {}, transparent = true, vertex = vertexShader) => {
        const value = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader,
          uniforms: { ...shared, uDepth: { value: 0 }, ...uniforms }, transparent, depthWrite: false, toneMapped: false });
        resources.push(value);
        return value;
      };
      const hall = new THREE.Mesh(hallGeometry, material(factoryFragment,
        { uPhoto: { value: factoryTexture }, uRTL: { value: 0 }, uDepth: { value: 36 } }, false));
      const haze = new THREE.Mesh(geometry, material(hazeFragment));
      const person = new THREE.Mesh(geometry, material(portraitFragment, {
        uOrdinary: { value: ordinaryTexture }, uSafety: { value: safetyTexture },
        uTexel: { value: new THREE.Vector2(1 / engineer.naturalWidth, 1 / engineer.naturalHeight) }, uOpacity: { value: 1 }
      }));
      const shadow = new THREE.Mesh(geometry, material(shadowFragment));
      const wordCanvas = document.createElement("canvas");
      wordCanvas.width = 1600; wordCanvas.height = 520;
      const wordContext = wordCanvas.getContext("2d");
      const wordTexture = texture(wordCanvas, true);
      const wordMaterial = new THREE.MeshBasicMaterial({ map: wordTexture, transparent: true, opacity: 0.12,
        depthWrite: false, toneMapped: false });
      resources.push(wordMaterial);
      const word = new THREE.Mesh(geometry, wordMaterial);
      const dustGeometry = new THREE.BufferGeometry();
      const dustMaterial = material(dustFragment, { uTime: { value: 0 }, uPixelRatio: { value: 1 } }, true, dustVertex);
      const dust = new THREE.Points(dustGeometry, dustMaterial);
      resources.push(dustGeometry);
      hall.renderOrder = 0; haze.renderOrder = 1; word.renderOrder = 2;
      shadow.renderOrder = 3; person.renderOrder = 4; dust.renderOrder = 5;
      scene.add(hall, haze, word, shadow, person, dust);

      function place(mesh, box, depth) {
        const scale = (camera.position.z - depth) / camera.position.z;
        mesh.position.set((box.x + box.width / 2 - width / 2) * scale,
          (height / 2 - box.y - box.height / 2) * scale, depth);
        mesh.scale.set(box.width * scale, box.height * scale, 1);
      }

      function resize(nextWidth, nextHeight, nextBackground, nextEngineer) {
        if (disposed) return;
        width = nextWidth; height = nextHeight;
        backgroundBox = nextBackground; engineerBox = nextEngineer;
        if (failed) return;
        pixelRatio = Math.min(window.devicePixelRatio || 1, 1.35, Math.sqrt(1800000 / (width * height)));
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        renderer.getDrawingBufferSize(shared.uResolution.value);
        camera.aspect = width / height;
        camera.position.z = height / (2 * Math.tan(35 * Math.PI / 360));
        camera.far = camera.position.z + 4000;
        camera.updateProjectionMatrix();
        person.material.uniforms.uOpacity.value = engineerBox.opacity;
        hall.material.uniforms.uRTL.value = document.documentElement.dir === "rtl" ? 1 : 0;
        const stageRect = stage.getBoundingClientRect();
        const wordElement = stage.querySelector(".sc-hero-background-word");
        const wordRect = wordElement && wordElement.getBoundingClientRect();
        wordBox = wordRect && wordRect.width ? {
          x: wordRect.left - stageRect.left,
          y: wordRect.top - stageRect.top - (parseFloat(stage.style.getPropertyValue("--sc-word-y")) || 0),
          width: wordRect.width, height: wordRect.height
        } : { x: width * 0.48, y: height * 0.15, width: width * 0.55, height: width * 0.23 };
        if (wordContext) {
          wordContext.clearRect(0, 0, 1600, 520);
          wordContext.font = '800 500px "SC Barlow", Impact, sans-serif';
          wordContext.textBaseline = "alphabetic";
          wordContext.strokeStyle = "#f7f5ec"; wordContext.lineWidth = 3.2;
          wordContext.strokeText("SAFE", 5, 470, 1580);
          wordTexture.needsUpdate = true;
        }
        const positions = [], seeds = [];
        let seed = 1937;
        const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let index = 0; index < 72; index++) {
          positions.push((random() - 0.5) * width, (random() - 0.5) * height, random() * 70 - 30);
          seeds.push(random());
        }
        [["position", positions, 3], ["aSeed", seeds, 1]].forEach(([name, values, size]) => {
          const attribute = dustGeometry.getAttribute(name);
          if (attribute) { attribute.array.set(values); attribute.needsUpdate = true; }
          else dustGeometry.setAttribute(name, new THREE.Float32BufferAttribute(values, size));
        });
        dustGeometry.computeBoundingSphere();
        dustMaterial.uniforms.uPixelRatio.value = pixelRatio;
      }

      function render(state) {
        if (disposed || failed || !width || !height) return false;
        try {
          const { motion, reveal, point, expiresAt, lifetime, timestamp } = state;
          const remaining = reveal ? Math.max(0, expiresAt - timestamp) : 0;
          const tail = Math.min(1, remaining / (lifetime * 0.28));
          shared.uRevealStrength.value = tail * tail * (3 - 2 * tail);
          shared.uLamp.value = shared.uRevealStrength.value * 0.72;
          if (point) shared.uPointer.value.set(point.x / width, 1 - point.y / height);
          maskTexture.needsUpdate = true;
          const box = backgroundBox;
          place(hall, {
            x: box.x + box.width / 2 + motion.bgX + (box.offsetX - box.width / 2) * motion.bgScale,
            y: box.y + box.height / 2 + motion.bgY + (box.offsetY - box.height / 2) * motion.bgScale,
            width: box.fittedWidth * motion.bgScale, height: box.fittedHeight * motion.bgScale
          }, -60);
          place(haze, { x: 0, y: 0, width, height }, -25);
          place(word, { ...wordBox, y: wordBox.y + (parseFloat(stage.style.getPropertyValue("--sc-word-y")) || 0) }, -12);
          place(shadow, { x: engineerBox.x + engineerBox.width * 0.05 + motion.personX,
            y: height * 0.80, width: engineerBox.width, height: height * 0.30 }, -1);
          place(person, { ...engineerBox, x: engineerBox.x + motion.personX, y: engineerBox.y + motion.personY }, 8);
          camera.position.x = motion.personX * 0.32;
          camera.position.y = -motion.personY * 0.08;
          camera.lookAt(0, 0, 0);
          dustMaterial.uniforms.uTime.value = timestamp / 1000;
          renderer.render(scene, camera);
          if (failed) { stage.classList.remove("sc-three-ready"); return false; }
          stage.classList.add("sc-three-ready");
          return true;
        } catch (error) {
          failed = true;
          stage.classList.remove("sc-three-ready");
          return false;
        }
      }

      const onLost = (event) => { event.preventDefault(); failed = true; stage.classList.remove("sc-three-ready"); onInvalidate(); };
      const onRestored = () => {
        failed = false;
        [factoryTexture, safetyTexture, ordinaryTexture, maskTexture, wordTexture].forEach(value => { value.needsUpdate = true; });
        resize(width, height, backgroundBox, engineerBox);
        onInvalidate();
      };
      function dispose() {
        if (disposed) return;
        disposed = true;
        canvas.removeEventListener("webglcontextlost", onLost);
        canvas.removeEventListener("webglcontextrestored", onRestored);
        window.removeEventListener("pagehide", onPageHide);
        release(); renderer.dispose(); canvas.remove();
        stage.classList.remove("sc-three-ready");
      }
      const onPageHide = (event) => { if (!event.persisted) dispose(); };
      canvas.addEventListener("webglcontextlost", onLost);
      canvas.addEventListener("webglcontextrestored", onRestored);
      window.addEventListener("pagehide", onPageHide);
      return { resize, render, dispose };
    } catch (error) {
      release(); if (renderer) renderer.dispose(); canvas.remove();
      return null;
    }
  }

  window.SafePermitThreeScene = { create, revision: THREE.REVISION };
})();
