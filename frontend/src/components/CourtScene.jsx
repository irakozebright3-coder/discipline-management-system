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
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 4.4, 8.4);
    camera.lookAt(0, 0.9, 0);

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

    // Scales of justice: base, upright post, a horizontal balancing bar on top, and two hanging pans.
    // Built in a group so the bar can gently rock like it is weighing.
    const scale = new THREE.Group();
    const SCALE_H = 1.55;
    const add = (geo, x, y, z, mat = gold) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; scale.add(o); return o; };
    add(new THREE.CylinderGeometry(0.42, 0.5, 0.08, 48), 0, 0.04, 0);                       // wide base
    add(new THREE.CylinderGeometry(0.3, 0.36, 0.07, 48), 0, 0.115, 0);                       // base step
    add(new THREE.CylinderGeometry(0.06, 0.09, SCALE_H, 24), 0, 0.15 + SCALE_H / 2, 0);     // post
    add(new THREE.SphereGeometry(0.11, 24, 24), 0, 0.15 + SCALE_H + 0.04, 0);               // pivot ball

    const beam = new THREE.Group();                                                          // the balancing bar
    beam.position.y = 0.15 + SCALE_H + 0.04;
    const BAR = 1.9;
    const barMesh = new THREE.Mesh(new THREE.BoxGeometry(BAR, 0.085, 0.085), gold);
    barMesh.castShadow = true; beam.add(barMesh);
    [-1, 1].forEach(sx => {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), gold);
      knob.position.x = sx * (BAR / 2); beam.add(knob);
    });
    // Each side: three thin chains down to a shallow pan.
    const PAN_DROP = 0.95;
    const panGroups = [-1, 1].map(sx => {
      const g = new THREE.Group();
      g.position.x = sx * (BAR / 2 - 0.04);
      [[-0.3, 0], [0.3, 0], [0, 0.0]].forEach(([dx]) => {
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, Math.hypot(PAN_DROP, 0.3), 6), gold);
        chain.position.set(dx / 2, -PAN_DROP / 2, 0);
        chain.rotation.z = Math.atan2(dx, PAN_DROP) * -1;
        g.add(chain);
      });
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.08, 40), gold);
      pan.position.y = -PAN_DROP; pan.castShadow = true; g.add(pan);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.014, 10, 48), gold);
      lip.rotation.x = Math.PI / 2; lip.position.y = -PAN_DROP + 0.04; g.add(lip);
      beam.add(g);
      return g;
    });
    scale.add(beam);
    scale.position.set(-1.05, coverY, -0.1);
    book.add(scale);

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

    // ---------- Gavel (stands upright on the book) ----------
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a4b1f, roughness: 0.42, metalness: 0.04 });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x5e3011, roughness: 0.5 });
    const coverTop = T + PAGE_H + T;          // y of the book's top surface

    // Origin = the point where the gavel's foot touches the cover, so tilting pivots from there.
    const HANDLE_H = 1.9;
    const gavel = new THREE.Group();

    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 24), woodDark);      // rounded butt end
    foot.position.y = 0.13;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, HANDLE_H, 24), wood);
    handle.position.y = 0.13 + HANDLE_H / 2;
    const gripBand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 24), gold);
    gripBand.position.y = 0.55;

    // Head: a barrel lying along X, centred on top of the handle.
    const HEAD_Y = 0.13 + HANDLE_H + 0.1;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.25, 40), wood);
    head.rotation.z = Math.PI / 2; head.position.y = HEAD_Y;
    const capL = new THREE.Mesh(new THREE.CylinderGeometry(0.375, 0.375, 0.11, 40), woodDark);
    capL.rotation.z = Math.PI / 2; capL.position.set(-0.56, HEAD_Y, 0);
    const capR = capL.clone(); capR.position.x = 0.56;
    const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 12, 48), gold);
    ringL.rotation.y = Math.PI / 2; ringL.position.set(-0.4, HEAD_Y, 0);
    const ringR = ringL.clone(); ringR.position.x = 0.4;
    [foot, handle, gripBand, head, capL, capR, ringL, ringR].forEach(m => { m.castShadow = true; gavel.add(m); });

    // Round plate (sound block) on the right of the cover. The gavel stands ON TOP of it.
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x4a2410, roughness: 0.5 });
    const PLATE_X = 1.0, PLATE_Z = 0.15, PLATE_H = 0.14;
    const soundBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, PLATE_H, 48), blockMat);
    soundBlock.position.set(PLATE_X, coverTop + PLATE_H / 2, PLATE_Z);
    soundBlock.castShadow = true; soundBlock.receiveShadow = true;
    group.add(soundBlock);
    const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.02, 10, 60), gold);
    goldRing.rotation.x = Math.PI / 2; goldRing.position.set(PLATE_X, coverTop + PLATE_H - 0.01, PLATE_Z);
    group.add(goldRing);

    // The gavel LIES on the plate: its heavy head rests on the plate, the handle trails off onto the book cover.
    // Local axis: handle runs along +Y (foot at 0, head at HEAD_Y), the head barrel lies along X.
    // Rotating about X keeps the barrel level and tips the handle flat; the small lieTilt lowers the foot onto the cover.
    const HEAD_CAP_R = 0.375;
    const lieTilt = Math.asin((PLATE_H + HEAD_CAP_R - 0.13) / HEAD_Y);
    gavel.position.set(0, -HEAD_Y, 0);               // pivot at the head, so the head sits over the plate centre
    const gavelPivot = new THREE.Group();
    gavelPivot.add(gavel);
    gavelPivot.rotation.x = -(Math.PI / 2 - lieTilt); // handle points toward the viewer (+Z), foot touching the cover
    const lay = new THREE.Group();
    lay.add(gavelPivot);
    lay.position.set(PLATE_X, coverTop + PLATE_H + HEAD_CAP_R, PLATE_Z);   // head's underside rests on the plate top
    lay.rotation.y = -0.4;                            // angle the handle across the cover, clear of the scales
    group.add(lay);

    // Ground shadow catcher and soft glow disc.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.38 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.001; ground.receiveShadow = true;
    scene.add(ground);

    group.rotation.y = -0.5;
    group.position.y = -0.35;

    // ---------- Sizing and loop ----------
    const resize = () => {
      const w = mount.clientWidth || 600;
      const h = mount.clientHeight || 440;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 42 : 30;
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
        // The balancing bar rocks slowly, as if weighing; the pans stay level by counter-rotating.
        const rock = Math.sin(t * 0.9) * 0.07;
        beam.rotation.z = rock;
        panGroups.forEach(g => { g.rotation.z = -rock; });
        // The gavel lies still on the plate and just follows the book's gentle bob.
        lay.position.y = coverTop + PLATE_H + HEAD_CAP_R + book.position.y;
        soundBlock.position.y = coverTop + PLATE_H / 2 + book.position.y;
        goldRing.position.y = coverTop + PLATE_H - 0.01 + book.position.y;
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
