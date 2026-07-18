/**
 * scene.js — Scene 3D : rendu WebGL, environnement PBR, lumieres, OrbitControls,
 * capture PNG, et assemblage de la chevaliere (anneau + blason en relief).
 *
 * L'environnement (reflets metalliques) est genere par `RoomEnvironment`
 * (procedural) : aucun fichier HDRI externe requis -> fonctionne hors-ligne et
 * sous CSP stricte.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildRing } from './ring-parametric.js';
import { buildBlazonRelief } from './blazon-to-relief.js';
import { createMetalMaterial } from './materials.js';
import { getShield } from '../data/shields.js';

export class ThreeView {
  /** @param {HTMLElement} container */
  constructor(container) {
    this.container = container;
    this.disposed = false;

    // Renderer.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';

    // Scene + environnement PBR procedural.
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // Camera.
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2000);
    this.camera.position.set(0, 26, 46);

    // Lumieres studio (complement de l'environnement).
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(20, 40, 30);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.8);
    fill.position.set(-30, 10, -20);
    this.scene.add(fill);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    // Controles.
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 200;

    // Groupe de la chevaliere.
    this.ringGroup = new THREE.Group();
    this.scene.add(this.ringGroup);

    // Redimensionnement.
    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    this._resize();

    // Boucle de rendu.
    this._animate = this._animate.bind(this);
    this.renderer.setAnimationLoop(this._animate);
  }

  _resize() {
    const w = this.container.clientWidth || 480;
    const h = this.container.clientHeight || 480;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _animate() {
    if (this.disposed) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * (Re)construit la chevaliere a partir du document design.
   * @param {object} design
   */
  setDesign(design) {
    // Nettoyage de l'ancien contenu.
    this._disposeGroup(this.ringGroup);
    this.ringGroup.clear();

    const material = createMetalMaterial(design.materiau || 'or-jaune', design.finition || 'poli');
    const shieldPath = getShield(design.ecu.forme).path;
    const { group, bezelTopY, footprint } = buildRing({ ring3d: design.ring3d, material, shieldPath });
    this.ringGroup.add(group);

    const relief = buildBlazonRelief(design, { bezelTopY, footprint });
    this.ringGroup.add(relief);

    // Recentre le groupe et ajuste la cible des controles.
    const box = new THREE.Box3().setFromObject(this.ringGroup);
    const center = box.getCenter(new THREE.Vector3());
    this.ringGroup.position.sub(center); // centre a l'origine
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Capture le rendu courant en PNG (dataURL).
   * @returns {string} dataURL image/png
   */
  capture() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  /** Reoriente la camera sur une vue de face du plateau. */
  resetView() {
    this.camera.position.set(0, 24, 46);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  _disposeGroup(group) {
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this._onResize);
    this._disposeGroup(this.ringGroup);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  }
}
