import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const root = document.querySelector("#scene");
const loading = document.querySelector("#loading");
const homeButton = document.querySelector("#home-button");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9e3df);
scene.fog = new THREE.Fog(0xb9e3df, 20, 42);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
root.appendChild(renderer.domElement);

let viewHeight = window.innerWidth < 700 ? 13 : 14.5;
const camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 80);
camera.position.set(9.5, 10.5, 12.5);
camera.lookAt(0, 0, 0);

scene.add(new THREE.HemisphereLight(0xf8fff1, 0x6e8f57, 2.25));

const sun = new THREE.DirectionalLight(0xfff4d6, 3.4);
sun.position.set(-7, 14, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -15;
sun.shadow.camera.right = 15;
sun.shadow.camera.top = 15;
sun.shadow.camera.bottom = -15;
sun.shadow.bias = -0.0005;
scene.add(sun);

const field = new THREE.Group();
scene.add(field);

const soil = new THREE.Mesh(
  new THREE.CylinderGeometry(11.25, 11.6, 1.05, 48),
  new THREE.MeshStandardMaterial({ color: 0x9b7146, roughness: 1 })
);
soil.position.y = -0.12;
soil.receiveShadow = true;
field.add(soil);

const lawn = new THREE.Mesh(
  new THREE.CylinderGeometry(11.3, 11.3, 0.34, 64),
  new THREE.MeshStandardMaterial({ color: 0x75b85b, roughness: 0.94 })
);
lawn.position.y = 0.58;
lawn.receiveShadow = true;
field.add(lawn);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(11.12, 0.17, 8, 80),
  new THREE.MeshStandardMaterial({ color: 0xa6d879, roughness: 0.95 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.77;
field.add(ring);

const tuftGeometry = new THREE.ConeGeometry(0.1, 0.38, 3);
const tuftMaterial = new THREE.MeshStandardMaterial({ color: 0x4f9346, roughness: 1 });
const tufts = new THREE.InstancedMesh(tuftGeometry, tuftMaterial, 110);
tufts.castShadow = true;
const tuftTransform = new THREE.Object3D();

function seededRandom(index) {
  const x = Math.sin(index * 917.37 + 41.73) * 43758.5453;
  return x - Math.floor(x);
}

for (let i = 0; i < 110; i += 1) {
  const angle = seededRandom(i * 3) * Math.PI * 2;
  const radius = 2.4 + Math.sqrt(seededRandom(i * 3 + 1)) * 7.9;
  tuftTransform.position.set(Math.cos(angle) * radius, 0.94, Math.sin(angle) * radius);
  tuftTransform.rotation.y = seededRandom(i * 3 + 2) * Math.PI;
  const scale = 0.7 + seededRandom(i * 7 + 5) * 0.75;
  tuftTransform.scale.set(scale, scale, scale);
  tuftTransform.updateMatrix();
  tufts.setMatrixAt(i, tuftTransform.matrix);
}
field.add(tufts);

const flowerGeometry = new THREE.SphereGeometry(0.09, 8, 6);
const flowerMaterials = [
  new THREE.MeshStandardMaterial({ color: 0xfff7d1 }),
  new THREE.MeshStandardMaterial({ color: 0xf4a7b9 }),
  new THREE.MeshStandardMaterial({ color: 0xffdf6e })
];
for (let i = 0; i < 20; i += 1) {
  const angle = seededRandom(i + 500) * Math.PI * 2;
  const radius = 4.2 + seededRandom(i + 700) * 6.1;
  const flower = new THREE.Mesh(flowerGeometry, flowerMaterials[i % flowerMaterials.length]);
  flower.position.set(Math.cos(angle) * radius, 0.91, Math.sin(angle) * radius);
  flower.scale.y = 0.55;
  field.add(flower);
}

const character = new THREE.Group();
character.position.set(0, 0.77, 0);
scene.add(character);

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.75, 32),
  new THREE.MeshBasicMaterial({ color: 0x244528, transparent: true, opacity: 0.22, depthWrite: false })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.015;
shadow.scale.set(1.35, 0.7, 1);
character.add(shadow);

const player = {
  target: new THREE.Vector3(0, 0.77, 0),
  velocity: new THREE.Vector3(),
  speed: 3.2,
  model: null,
  mixer: null,
  walkAction: null,
  yaw: 0
};

const loader = new GLTFLoader();
loader.load(
  "./assets/naipao-walk.glb",
  (gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(1.9);
    model.rotation.y = 0;
    model.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material) {
        node.material.envMapIntensity = 0.7;
        node.material.needsUpdate = true;
      }
    });
    character.add(model);
    player.model = model;

    if (gltf.animations.length > 0) {
      player.mixer = new THREE.AnimationMixer(model);
      player.walkAction = player.mixer.clipAction(gltf.animations[0]);
      player.walkAction.play();
      player.walkAction.paused = true;
    }
    loading.classList.add("is-hidden");
  },
  (progress) => {
    if (!progress.total) return;
    const percent = Math.min(99, Math.round((progress.loaded / progress.total) * 100));
    loading.querySelector("span").textContent = `奶泡正在来到草地…… ${percent}%`;
  },
  () => {
    loading.querySelector("span").textContent = "奶泡的 3D 模型没有加载成功，请刷新再试。";
  }
);

const keys = new Set();
window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.code));

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const walkPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.77);
const hitPoint = new THREE.Vector3();

renderer.domElement.addEventListener("pointerup", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.ray.intersectPlane(walkPlane, hitPoint)) {
    const radius = Math.hypot(hitPoint.x, hitPoint.z);
    if (radius > 9.6) hitPoint.multiplyScalar(9.6 / radius);
    player.target.set(hitPoint.x, 0.77, hitPoint.z);
  }
});

homeButton.addEventListener("click", () => player.target.set(0, 0.77, 0));

const clock = new THREE.Clock();
const cameraOffset = new THREE.Vector3(9.5, 10.5, 12.5);
const desiredCamera = new THREE.Vector3();
const desiredLook = new THREE.Vector3();

function updateCameraFrustum() {
  const aspect = window.innerWidth / window.innerHeight;
  viewHeight = window.innerWidth < 700 ? 13 : 14.5;
  camera.left = -(viewHeight * aspect) / 2;
  camera.right = (viewHeight * aspect) / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const input = new THREE.Vector3(
    Number(keys.has("ArrowRight") || keys.has("KeyD")) - Number(keys.has("ArrowLeft") || keys.has("KeyA")),
    0,
    Number(keys.has("ArrowDown") || keys.has("KeyS")) - Number(keys.has("ArrowUp") || keys.has("KeyW"))
  );

  let moving = false;
  if (input.lengthSq() > 0) {
    input.normalize();
    player.velocity.lerp(input.multiplyScalar(player.speed), 1 - Math.exp(-delta * 12));
    player.target.copy(character.position);
    moving = true;
  } else {
    const toTarget = player.target.clone().sub(character.position);
    toTarget.y = 0;
    if (toTarget.length() > 0.08) {
      player.velocity.lerp(toTarget.normalize().multiplyScalar(player.speed), 1 - Math.exp(-delta * 8));
      moving = true;
    } else {
      player.velocity.lerp(new THREE.Vector3(), 1 - Math.exp(-delta * 10));
    }
  }

  character.position.addScaledVector(player.velocity, delta);
  const fieldRadius = Math.hypot(character.position.x, character.position.z);
  if (fieldRadius > 9.7) {
    const limit = 9.7 / fieldRadius;
    character.position.x *= limit;
    character.position.z *= limit;
    player.target.copy(character.position);
  }

  if (player.model && player.velocity.lengthSq() > 0.01) {
    const targetYaw = Math.atan2(player.velocity.x, player.velocity.z);
    const yawDifference = Math.atan2(Math.sin(targetYaw - player.yaw), Math.cos(targetYaw - player.yaw));
    player.yaw += yawDifference * (1 - Math.exp(-delta * 11));
    player.model.rotation.y = player.yaw;
  }
  if (player.mixer) {
    player.mixer.update(delta);
    player.walkAction.paused = !moving;
  }
  shadow.material.opacity = moving ? 0.16 : 0.22;

  desiredCamera.copy(character.position).add(cameraOffset);
  camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 2.8));
  desiredLook.copy(character.position).add(new THREE.Vector3(0, 1.2, 0));
  camera.lookAt(desiredLook);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  updateCameraFrustum();
});

updateCameraFrustum();
animate();
