import {
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";

import { type Backend, createDiceEngine, type DiceEngine, type DieHandle } from "./engine";

import { cross, DIE_RADIUS, DIM_NUMBERS, dot, getPolyhedron, len, sub } from "@/lib/utils/battle/fx/dice";
import type { DieSides } from "@/types/battle";

const CELL_PX = 128;

const FACE_COLOR: Record<DieSides, string> = {
  4: "#2f8f4e",
  6: "#2f76b8",
  8: "#b8512a",
  10: "#7a3fc4",
  12: "#b8922a",
  20: "#5a46c8",
};

const FONT_PX: Record<DieSides, number> = { 4: 38, 6: 62, 8: 42, 10: 44, 12: 56, 20: 44 };

const GOLD = "vec3( 1.0, 0.78, 0.3 )";

function atlasGrid(faceCount: number) {
  const cols = Math.ceil(Math.sqrt(faceCount));

  return { cols, rows: Math.ceil(faceCount / cols) };
}

function createAtlasCanvas(sides: DieSides) {
  const { cols, rows } = atlasGrid(sides);

  const canvas = document.createElement("canvas");

  canvas.width = cols * CELL_PX;
  canvas.height = rows * CELL_PX;

  const g = canvas.getContext("2d");

  if (!g) throw new Error("2d context unavailable");

  const size = FONT_PX[sides];

  g.fillStyle = FACE_COLOR[sides];
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `800 ${size}px system-ui, sans-serif`;
  g.fillStyle = "#fff";

  for (let v = 1; v <= sides; v++) {
    const cx = ((v - 1) % cols) * CELL_PX + CELL_PX / 2;

    const cy = Math.floor((v - 1) / cols) * CELL_PX + CELL_PX / 2;

    g.fillText(String(v), cx, cy);

    if (v === 6 || v === 9) g.fillRect(cx - size * 0.28, cy + size * 0.46, size * 0.56, 3);
  }

  return canvas;
}

function buildMeshData(sides: DieSides, markValue: number) {
  const poly = getPolyhedron(sides);

  const { cols, rows } = atlasGrid(poly.faces.length);

  const position: number[] = [];

  const normal: number[] = [];

  const uv: number[] = [];

  const mark: number[] = [];

  for (const face of poly.faces) {
    const right = cross(face.up, face.normal);

    const radius = Math.max(...face.loop.map((m) => len(sub(poly.vertices[m], face.center))));

    const u0 = (((face.value - 1) % cols) + 0.5) / cols;

    const v0 = 1 - (Math.floor((face.value - 1) / cols) + 0.5) / rows;

    const push = (m: number) => {
      const p = poly.vertices[m];

      const d = sub(p, face.center);

      position.push(p[0] * DIE_RADIUS, p[1] * DIE_RADIUS, p[2] * DIE_RADIUS);
      normal.push(...face.normal);
      uv.push(u0 + ((dot(d, right) / (2 * radius)) * 0.92) / cols, v0 + ((dot(d, face.up) / (2 * radius)) * 0.92) / rows);
      mark.push(face.value === markValue ? 1 : 0);
    };

    for (let i = 1; i < face.loop.length - 1; i++) {
      push(face.loop[0]);
      push(face.loop[i]);
      push(face.loop[i + 1]);
    }
  }

  return { position, normal, uv, mark };
}

// грань-результат світиться у власному тоні з золотом: змішування з білим робило синій d6 сірим
function dieMaterial(sides: DieSides, map: CanvasTexture) {
  const settle = { value: 0 };

  const base = { value: new Color(FACE_COLOR[sides]) };

  const material = new MeshStandardMaterial({ map, roughness: 0.38, metalness: 0.12 });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSettle = settle;
    shader.uniforms.uBase = base;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float faceMark;\nvarying float vMark;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMark = faceMark;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uSettle;\nuniform vec3 uBase;\nvarying float vMark;")
      .replace("#include <map_fragment>", `vec4 texel = texture2D( map, vMapUv );\ntexel.rgb = mix( texel.rgb, uBase, uSettle * ${DIM_NUMBERS.toFixed(2)} * ( 1.0 - vMark ) );\ndiffuseColor *= texel;`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance += mix( uBase, ${GOLD}, 0.35 ) * uSettle * vMark * 0.22;`);
  };

  return { material, settle };
}

function createBackend(host: HTMLElement): Backend {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  host.appendChild(renderer.domElement);

  const scene = new Scene();

  const camera = new PerspectiveCamera(40, 1, 0.1, 100);

  scene.add(new HemisphereLight(0xcdd6ff, 0x1a1428, 1.1));
  scene.add(new AmbientLight(0xffffff, 0.25));

  const sun = new DirectionalLight(0xfff1dc, 2.2);

  sun.position.set(-4, 10, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 4;
  scene.add(sun);

  const shadowGeometry = new PlaneGeometry(80, 80);

  const shadowMaterial = new ShadowMaterial({ opacity: 0.55 });

  const shadowPlane = new Mesh(shadowGeometry, shadowMaterial);

  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const atlases = new Map<DieSides, CanvasTexture>();

  return {
    resize(width, height, rig) {
      renderer.setSize(width, height, false);
      camera.aspect = rig.aspect;
      camera.position.set(...rig.pos);
      camera.lookAt(...rig.target);
      camera.updateProjectionMatrix();

      const span = rig.halfW + 4;

      sun.shadow.camera.left = -span;
      sun.shadow.camera.right = span;
      sun.shadow.camera.top = span;
      sun.shadow.camera.bottom = -span;
      sun.shadow.camera.updateProjectionMatrix();
    },
    createDie(sides, value): DieHandle {
      let atlas = atlases.get(sides);

      if (!atlas) {
        atlas = new CanvasTexture(createAtlasCanvas(sides));
        atlas.colorSpace = SRGBColorSpace;
        atlas.anisotropy = 4;
        atlases.set(sides, atlas);
      }

      const data = buildMeshData(sides, value);

      const geometry = new BufferGeometry();

      geometry.setAttribute("position", new Float32BufferAttribute(data.position, 3));
      geometry.setAttribute("normal", new Float32BufferAttribute(data.normal, 3));
      geometry.setAttribute("uv", new Float32BufferAttribute(data.uv, 2));
      geometry.setAttribute("faceMark", new Float32BufferAttribute(data.mark, 1));

      const { material, settle } = dieMaterial(sides, atlas);

      const mesh = new Mesh(geometry, material);

      mesh.castShadow = true;
      mesh.visible = false;
      scene.add(mesh);

      return {
        setPose(p) {
          mesh.visible = p.visible;
          mesh.position.set(p.x, p.y, p.z);
          mesh.quaternion.set(...p.q);
          settle.value = p.settle;
        },
        dispose() {
          scene.remove(mesh);
          geometry.dispose();
          material.dispose();
        },
      };
    },
    render: () => renderer.render(scene, camera),
    dispose() {
      atlases.forEach((t) => t.dispose());
      atlases.clear();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export const createThreeDice = (host: HTMLElement): DiceEngine => createDiceEngine(host, createBackend);
