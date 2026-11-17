import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// A 3D law book with a judge's gavel resting on top, drawn entirely from
// primitives (no model files), so it loads fast and works offline.
export default function CourtScene({ className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 3.1, 8.6);
    camera.lookAt(0, 0.55, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.setAttribute('aria-hidden', 'true');

    // Lights: warm key, cool rim, soft fill.
    scene.add(new THREE.HemisphereLight(0xffe9c9, 0x1a1410, 0.75));
    const key = new THREE.DirectionalLight(0xffd9a0, 2.4);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5; key.shadow.camera.right = 5;
    key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
    key.shadow.radius = 5;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fb4ff, 0.9);
    rim.position.set(-5, 3, -4);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);

    // ---------- Book ----------
    const leather = new THREE.MeshStandardMaterial({ color: 0x5a2a14, roughness: 0.55, metalness: 0.08 });
    const leatherDark = new THREE.MeshStandardMaterial({ color: 0x3d1b0d, roughness: 0.6, metalness: 0.05 });
    const pages = new THREE.MeshStandardMaterial({ color: 0xf1e6cc, roughness: 0.9 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe2b04a, roughness: 0.28, metalness: 0.9 });

    const W = 3.4, D = 4.4, T = 0.34; // width, depth, cover thickness
    const PAGE_H = 0.78;
    const book = new THREE.Group();

    const bottom = new THREE.Mesh(new THREE.BoxGeometry(W, T, D), leather);
    bottom.position.y = T / 2;
    const top = bottom.clone();
    top.position.y = T + PAGE_H + T / 2;
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.34, PAGE_H + T * 2, D), leatherDark);
    spine.position.set(-W / 2 + 0.17, (PAGE_H + T * 2) / 2, 0);
    const block = new THREE.Mesh(new THREE.BoxGeometry(W - 0.34, PAGE_H, D - 0.22), pages);
    block.position.set(0.1, T + PAGE_H / 2, 0);
    [bottom, top, spine, block].forEach(m => { m.castShadow = true; m.receiveShadow = true; book.add(m); });

    // Page lines on the visible edges.
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xc9b98f, roughness: 1 });
    for (let i = 1; i < 9; i++) {
      const y = T + (PAGE_H / 9) * i;
      const lf = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.012, 0.01), lineMat);
      lf.position.set(0.1, y, D / 2 - 0.105);
      const lr = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, D - 0.2), lineMat);
      lr.position.set(W / 2 - 0.06, y, 0);
      book.add(lf, lr);
    }

    // Gold borders and the scales-of-justice emblem on the cover.
    const coverY = T + PAGE_H + T + 0.004;
    const frame = (w, d, t) => {
      const g = new THREE.Group();
      [[0, -d / 2, w, t], [0, d / 2, w, t], [-w / 2, 0, t, d], [w / 2, 0, t, d]].forEach(([x, z, sw, sd]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.012, sd), gold);
        m.position.set(x, 0, z); g.add(m);
      });
      return g;
    };
    const f1 = frame(W - 0.95, D - 0.55, 0.05); f1.position.set(0.12, coverY, 0);
    const f2 = frame(W - 1.2, D - 0.8, 0.025); f2.position.set(0.12, coverY, 0);
    book.add(f1, f2);

    const emblem = new THREE.Group();
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.9, 16), gold);
    pillar.position.y = 0.45 * 0.0 + 0.006;
    pillar.rotation.x = Math.PI / 2;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.014, 0.045), gold);
    beam.position.y = 0.006; beam.position.z = -0.3;
    const mkPan = (x) => {
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.014, 32), gold);
      pan.position.set(x, 0.006, 0.05);
      return pan;
    };
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.02, 32), gold);
    base.position.set(0, 0.008, 0.45);
    emblem.add(pillar, beam, mkPan(-0.5), mkPan(0.5), base);
    emblem.position.set(0.12, coverY, 0.15);
    book.add(emblem);

    // Spine bands.
    for (let i = -1; i <= 1; i++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.1), gold);
      band.position.set(-W / 2 + 0.17, (PAGE_H + T * 2) / 2 + 0.0, i * 1.2);
      band.position.x = -W / 2 - 0.005;
      band.scale.set(0.12, 1, 1);
      book.add(band);
    }

    book.position.y = 0;
    group.add(book);

    // ---------- Gavel ----------
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a4b1f, roughness: 0.42, metalness: 0.04 });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x5e3011, roughness: 0.5 });
    const gavel = new THREE.Group();

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.25, 40), wood);
    head.rotation.z = Math.PI / 2;
    const capL = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.11, 40), woodDark);
    capL.rotation.z = Math.PI / 2; capL.position.x = -0.5;
    const capR = capL.clone(); capR.position.x = 0.5;
    const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.025, 12, 48), gold);
    ringL.rotation.y = Math.PI / 2; ringL.position.x = -0.38;
    const ringR = ringL.clone(); ringR.position.x = 0.38;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 2.1, 24), wood);
    handle.position.y = -1.0;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 24), woodDark);
    knob.position.y = -2.08;
    [head, capL, capR, ringL, ringR, handle, knob].forEach(m => { m.castShadow = true; gavel.add(m); });

    // Rest the gavel diagonally across the cover.
    gavel.position.set(0.25, T + PAGE_H + T + 0.5, 0.55);
    gavel.rotation.set(0, -0.55, 0);
    gavel.rotation.z = 0;
    const gavelPivot = new THREE.Group();
    gavelPivot.add(gavel);
    // Lay the handle flat: the gavel's "down" axis becomes horizontal.
    gavel.rotation.x = Math.PI / 2 - 0.02;
    gavel.position.set(0.1, T + PAGE_H + T + 0.38, 0.2);
    group.add(gavelPivot);

    // Sound block under the gavel head for the tap animation.
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x4a2410, roughness: 0.5 });
    const soundBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.14, 40), blockMat);
    soundBlock.position.set(0.8, T + PAGE_H + T + 0.07, -0.95);
    soundBlock.castShadow = true;
    group.add(soundBlock);
    const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.018, 10, 60), gold);
    goldRing.rotation.x = Math.PI / 2; goldRing.position.set(0.8, T + PAGE_H + T + 0.13, -0.95);
    group.add(goldRing);

    // Ground shadow catcher and soft glow disc.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.38 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.001; ground.receiveShadow = true;
    scene.add(ground);

    group.rotation.y = -0.5;
    group.position.y = -0.55;

    // ---------- Sizing and loop ----------
    const resize = () => {
      const w = mount.clientWidth || 600;
      const h = mount.clientHeight || 440;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 44 : 32;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const pointer = { x: 0, y: 0 };
    const onMove = (e) => {
      const r = mount.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    mount.addEventListener('pointermove', onMove);

    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.05 });
    io.observe(mount);
    const clock = new THREE.Clock();

    const render = () => {
      raf = requestAnimationFrame(render);
      if (!visible) return;
      const t = clock.getElapsedTime();
      if (!reduceMotion) {
        group.rotation.y = -0.5 + Math.sin(t * 0.35) * 0.32 + pointer.x * 0.25;
        group.rotation.x = pointer.y * 0.06;
        book.position.y = Math.sin(t * 0.9) * 0.05;
        // Periodic gavel tap: lift and strike.
        const cycle = (t % 4.2) / 4.2;
        const lift = cycle < 0.5 ? Math.sin((cycle / 0.5) * Math.PI) : 0;
        gavel.position.y = T + PAGE_H + T + 0.38 + lift * 0.28 + book.position.y;
        gavel.rotation.z = -lift * 0.22;
      }
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      mount.removeEventListener('pointermove', onMove);
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%', minHeight: 360 }} />;
}
