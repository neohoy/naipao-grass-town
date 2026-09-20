import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const root = document.querySelector("#scene");
const loading = document.querySelector("#loading");
const loadingLabel = loading.querySelector("span");
const homeButton = document.querySelector("#home-button");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9e3df);
scene.fog = new THREE.Fog(0xb9e3df, 42, 76);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
root.appendChild(renderer.domElement);

let viewHeight = window.innerWidth < 700 ? 36 : 27;
const camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 90);
camera.position.set(18, 21, 24);
camera.lookAt(0, 0.8, 0);

scene.add(new THREE.HemisphereLight(0xf8fff1, 0x6e8f57, 2.15));

const sun = new THREE.DirectionalLight(0xfff4d6, 3.25);
sun.position.set(-9, 16, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -16;
sun.shadow.camera.right = 16;
sun.shadow.camera.top = 16;
sun.shadow.camera.bottom = -16;
sun.shadow.bias = -0.0005;
scene.add(sun);

const character = new THREE.Group();
character.position.set(0, 0.06, 0);
scene.add(character);

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.56, 32),
  new THREE.MeshBasicMaterial({ color: 0x244528, transparent: true, opacity: 0.22, depthWrite: false })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.018;
shadow.scale.set(1.22, 0.68, 1);
character.add(shadow);

const player = {
  target: new THREE.Vector3(0, 0.06, 0),
  velocity: new THREE.Vector3(),
  speed: 4.3,
  model: null,
  mixer: null,
  walkAction: null,
  yaw: 0
};

// Blender XY becomes Three.js X/-Z after glTF's Y-up conversion.
const buildingColliders = [
  { center: new THREE.Vector2(0, -10.25), radius: 2.7 },
  { center: new THREE.Vector2(-8.88, 5.13), radius: 2.7 },
  { center: new THREE.Vector2(8.88, 5.13), radius: 2.7 }
];

function keepInsideTown(position) {
  const radius = Math.hypot(position.x, position.z);
  if (radius > 16.1) {
    const limit = 16.1 / radius;
    position.x *= limit;
    position.z *= limit;
  }

  for (const collider of buildingColliders) {
    const dx = position.x - collider.center.x;
    const dz = position.z - collider.center.y;
    const distance = Math.hypot(dx, dz);
    if (distance < collider.radius) {
      const safeDistance = Math.max(distance, 0.001);
      position.x = collider.center.x + (dx / safeDistance) * collider.radius;
      position.z = collider.center.y + (dz / safeDistance) * collider.radius;
    }
  }
  position.y = 0.06;
  return position;
}

const manager = new THREE.LoadingManager();
manager.onProgress = (_url, loaded, total) => {
  loadingLabel.textContent = `奶泡正在来到小镇…… ${loaded}/${total}`;
};
manager.onLoad = () => loading.classList.add("is-hidden");
manager.onError = () => {
  loadingLabel.textContent = "小镇没有完整加载，请刷新再试。";
};

const loader = new GLTFLoader(manager);
loader.load("./assets/town-base.glb", (gltf) => {
  const town = gltf.scene;
  town.name = "NaipaoTown";
  town.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = !node.name.includes("Grass") && !node.name.includes("Plaza") && !node.name.includes("Road");
    node.receiveShadow = true;
    if (node.material) {
      node.material.envMapIntensity = 0.65;
      node.material.needsUpdate = true;
    }
  });
  scene.add(town);
});

loader.load("./assets/naipao-walk.glb", (gltf) => {
  const model = gltf.scene;
  model.scale.setScalar(1.25);
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
});

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
const walkPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.06);
const hitPoint = new THREE.Vector3();

renderer.domElement.addEventListener("pointerup", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.ray.intersectPlane(walkPlane, hitPoint)) {
    keepInsideTown(hitPoint);
    player.target.copy(hitPoint);
  }
});

homeButton.addEventListener("click", () => player.target.set(0, 0.06, 0));

const clock = new THREE.Clock();
const cameraOffset = new THREE.Vector3(18, 21, 24);
const desiredCamera = new THREE.Vector3();
const desiredLook = new THREE.Vector3();
const cameraFocus = new THREE.Vector3();
const nextPosition = new THREE.Vector3();

function updateCameraFrustum() {
  const aspect = window.innerWidth / window.innerHeight;
  viewHeight = window.innerWidth < 700 ? 36 : 27;
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

  nextPosition.copy(character.position).addScaledVector(player.velocity, delta);
  keepInsideTown(nextPosition);
  if (nextPosition.distanceToSquared(character.position) < 0.000001 && moving) {
    player.velocity.multiplyScalar(0.25);
    player.target.copy(character.position);
    moving = false;
  }
  character.position.copy(nextPosition);

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

  cameraFocus.set(character.position.x * 0.4, 0, character.position.z * 0.4);
  desiredCamera.copy(cameraOffset).add(cameraFocus);
  camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 2.6));
  desiredLook.copy(cameraFocus).add(new THREE.Vector3(0, 0.9, 0));
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
