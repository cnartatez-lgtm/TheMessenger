import {
  AnimationMixer, Box3, DirectionalLight, HemisphereLight, Mesh, MOUSE, OrbitControls, PCFShadowMap,
  PerspectiveCamera, PlaneGeometry, Scene, ShadowMaterial, SRGBColorSpace, TOUCH,
  Vector3, WebGLRenderer, GLTFLoader
} from './assets/vendor/three-exhibits-r187.min.js?v=walk1';

const radians = Math.PI / 180;

function releaseModel(root) {
  if (!root) return;
  root.removeFromParent();
  root.traverse(node => {
    if (!node.isMesh) return;
    if (node.isSkinnedMesh) node.skeleton.dispose();
    node.geometry.dispose();
    for (const material of [].concat(node.material)) {
      const texture = material.map;
      if (texture) {
        texture.dispose();
        texture.source.data?.close?.();
      }
      material.dispose();
    }
  });
}

export class ModelStage {
  constructor(host, onContextLost) {
    this.host = host;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', {alpha: true, antialias: true, powerPreference: 'low-power'});
    if (!context) throw new Error('WebGL is unavailable');
    this.renderer = new WebGLRenderer({canvas, context, alpha: true, antialias: true});
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(0, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.canvas = canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'group');
    canvas.setAttribute('aria-describedby', 'exhibit-instructions');
    host.append(canvas);
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(35, 1, 0.015, 40);
    this.camera.position.set(2, 2, 4);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = false;
    this.controls.rotateSpeed = 0.75;
    this.controls.maxPolarAngle = Math.PI - 0.03;
    this.controls.minPolarAngle = 0.03;
    this.controls.screenSpacePanning = true;
    this.setMode('rotate');

    const sky = new HemisphereLight(0xfff7e5, 0xc5af95, 2.0);
    this.sun = new DirectionalLight(0xfff2dd, 2.3);
    this.sun.position.set(-3, 5.5, 4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.1, far: 14});
    this.sun.shadow.normalBias = 0.012;
    this.sun.shadow.bias = -0.00015;
    this.sun.shadow.camera.updateProjectionMatrix();
    const fill = new DirectionalLight(0xe3edff, 0.7);
    fill.position.set(3, 2, -4);
    this.floor = new Mesh(new PlaneGeometry(16, 16), new ShadowMaterial({opacity: 0.21}));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.008;
    this.floor.receiveShadow = true;
    this.scene.add(sky, this.sun, fill, this.floor);
    this.loader = new GLTFLoader();
    this.onScreen = !('IntersectionObserver' in window);
    this.requestDraw = () => {
      if (!this.frame && !this.disposed) this.frame = requestAnimationFrame(this.draw);
    };
    this.draw = now => {
      this.frame = 0;
      if (!this.model || this.disposed) return;
      if (this.walking && this.onScreen && !document.hidden) {
        const elapsed = this.lastDraw === null ? 0 : Math.min((now - this.lastDraw) / 1000, 0.1);
        this.mixer.update(elapsed);
        this.lastDraw = now;
        this.requestDraw();
      }
      this.renderer.render(this.scene, this.camera);
    };
    this.controls.addEventListener('change', this.requestDraw);
    this.events = new AbortController();
    const options = {signal: this.events.signal};
    const restartClock = () => {
      this.lastDraw = null;
      if (!document.hidden) this.requestDraw();
    };
    document.addEventListener('visibilitychange', restartClock, options);
    if ('IntersectionObserver' in window) {
      this.visibility = new IntersectionObserver(([entry]) => {
        this.onScreen = entry.isIntersecting;
        restartClock();
      });
      this.visibility.observe(host);
    }
    canvas.addEventListener('keydown', event => this.onKey(event), options);
    canvas.addEventListener('pointerdown', () => canvas.focus({preventScroll: true}), options);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      onContextLost();
    }, options);
    this.resize = this.resize.bind(this);
    if ('ResizeObserver' in window) {
      this.observer = new ResizeObserver(this.resize);
      this.observer.observe(host);
    } else {
      window.addEventListener('resize', this.resize, options);
    }
    this.resize();
  }

  async load(url, angles, label, signal) {
    const response = await fetch(url, {signal});
    if (!response.ok) throw new Error('Model download failed');
    const bytes = await response.arrayBuffer();
    const {scene: model, animations} = await this.loader.parseAsync(bytes, '');
    if (signal.aborted || this.disposed) {
      releaseModel(model);
      return;
    }
    this.clearModel();
    this.model = model;
    let walkBounds;
    model.traverse(node => {
      if (node.isMesh) node.castShadow = true;
      if (node.isSkinnedMesh) node.frustumCulled = false;
      if (node.userData.walkBounds) walkBounds = node.userData.walkBounds;
    });
    this.scene.add(model);
    const walk = animations.find(clip => clip.name === 'Walk');
    if (walk) {
      this.mixer = new AnimationMixer(model);
      this.mixer.clipAction(walk).play();
      this.mixer.update(0);
    }
    this.setWalking(Boolean(walk) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.bounds = walkBounds
      ? new Box3(new Vector3().fromArray(walkBounds), new Vector3().fromArray(walkBounds, 3))
      : new Box3().setFromObject(model);
    this.center = this.bounds.getCenter(new Vector3());
    const [yaw, pitch] = angles.map(a => a * radians);
    this.homeDirection = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    this.canvas.setAttribute('aria-label', label + ' interactive 3D view');
    this.homeDistance = this.fitDistance();
    this.controls.cursor.copy(this.center);
    this.controls.maxTargetRadius = this.bounds.getSize(new Vector3()).length() * 0.85;
    this.reset();
    this.renderer.render(this.scene, this.camera);
  }

  setWalking(enabled) {
    this.walking = Boolean(this.mixer && enabled);
    this.lastDraw = null;
    this.requestDraw();
  }

  clearModel() {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.model);
      this.mixer = null;
    }
    this.walking = false;
    releaseModel(this.model);
    this.model = null;
  }

  fitDistance() {
    const right = new Vector3().crossVectors(this.camera.up, this.homeDirection).normalize();
    const up = new Vector3().crossVectors(this.homeDirection, right);
    const vertical = Math.tan(this.camera.fov * radians / 2);
    const horizontal = vertical * this.camera.aspect;
    let distance = 0;
    const {min, max} = this.bounds;
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) {
          const corner = new Vector3(x, y, z).sub(this.center);
          const extent = Math.max(Math.abs(corner.dot(right)) / horizontal, Math.abs(corner.dot(up)) / vertical);
          distance = Math.max(distance, corner.dot(this.homeDirection) + extent);
        }
      }
    }
    return distance * 1.14;
  }

  resize() {
    const {width, height} = this.host.getBoundingClientRect();
    if (!width || !height || this.disposed) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.model) {
      const next = this.fitDistance();
      this.camera.position.sub(this.controls.target).multiplyScalar(next / this.homeDistance).add(this.controls.target);
      this.homeDistance = next;
      this.setZoomLimits();
      this.controls.update();
      this.requestDraw();
    }
  }

  setZoomLimits() {
    this.controls.minDistance = this.homeDistance * 0.32;
    this.controls.maxDistance = this.homeDistance * 2.5;
  }

  reset() {
    if (!this.model) return;
    this.setZoomLimits();
    this.controls.target.copy(this.center);
    this.camera.position.copy(this.center).addScaledVector(this.homeDirection, this.homeDistance);
    this.controls.update();
    this.requestDraw();
  }

  setMode(mode) {
    this.mode = mode;
    this.controls.mouseButtons.LEFT = mode === 'move' ? MOUSE.PAN : MOUSE.ROTATE;
    this.controls.touches.ONE = mode === 'move' ? TOUCH.PAN : TOUCH.ROTATE;
    this.controls.touches.TWO = TOUCH.DOLLY_PAN;
  }

  zoom(closer) {
    if (closer) this.controls.dollyIn(0.82);
    else this.controls.dollyOut(0.82);
  }

  step(direction) {
    const [x, y] = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]}[direction];
    if (this.mode === 'move') this.controls.pan(x * 22, y * 22);
    else if (x) this.controls.rotateLeft(x * 10 * radians);
    else this.controls.rotateUp(y * 10 * radians);
  }

  onKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) this.step(event.key.slice(5).toLowerCase());
    else if (event.key === '+' || event.key === '=') this.zoom(true);
    else if (event.key === '-') this.zoom(false);
    else if (event.key === 'Home') this.reset();
    else return;
    event.preventDefault();
  }

  dispose() {
    this.disposed = true;
    this.events.abort();
    this.observer?.disconnect();
    this.visibility?.disconnect();
    cancelAnimationFrame(this.frame);
    this.controls.removeEventListener('change', this.requestDraw);
    this.controls.dispose();
    this.clearModel();
    this.floor.geometry.dispose();
    this.floor.material.dispose();
    this.sun.shadow.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
