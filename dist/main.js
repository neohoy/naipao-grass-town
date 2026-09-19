import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

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
  facing: 1,
  sprite: null,
  spriteBaseY: 2.25
};

function makeCharacterTexture(image) {
  const maxWidth = 900;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const ctx = source.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  const data = pixels.data;
  const corners = [0, (width - 1) * 4, (height - 1) * width * 4, (height * width - 1) * 4];
  const bg = corners.reduce((sum, index) => {
    sum[0] += data[index];
    sum[1] += data[index + 1];
    sum[2] += data[index + 2];
    return sum;
  }, [0, 0, 0]).map((value) => value / corners.length);

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const push = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const position = y * width + x;
    if (visited[position]) return;
    const index = position * 4;
    const dr = data[index] - bg[0];
    const dg = data[index + 1] - bg[1];
    const db = data[index + 2] - bg[2];
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    const max = Math.max(data[index], data[index + 1], data[index + 2]);
    const min = Math.min(data[index], data[index + 1], data[index + 2]);
    const lowChroma = max - min < 38;
    if (distance > 48 || !lowChroma || max < 214) return;
    visited[position] = 1;
    queue[tail++] = position;
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (head < tail) {
    const position = queue[head++];
    const x = position % width;
    const y = Math.floor(position / width);
    data[position * 4 + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  ctx.putImageData(pixels, 0, 0);
  const padding = 12;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);
  const crop = document.createElement("canvas");
  crop.width = Math.max(1, maxX - minX + 1);
  crop.height = Math.max(1, maxY - minY + 1);
  crop.getContext("2d").drawImage(source, minX, minY, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return crop;
}

const image = new Image();
image.src = "./assets/naipao.png";
image.onload = () => {
  const cutout = makeCharacterTexture(image);
  const texture = new THREE.CanvasTexture(cutout);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.08 });
  const sprite = new THREE.Sprite(material);
  const ratio = cutout.width / cutout.height;
  const spriteHeight = 4.25;
  sprite.scale.set(spriteHeight * ratio, spriteHeight, 1);
  sprite.position.y = player.spriteBaseY;
  sprite.castShadow = true;
  character.add(sprite);
  player.sprite = sprite;
  loading.classList.add("is-hidden");
};
image.onerror = () => {
  loading.querySelector("span").textContent = "奶泡的图片没有加载成功，请刷新再试。";
};

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
  const elapsed = clock.elapsedTime;
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

  if (Math.abs(player.velocity.x) > 0.08) player.facing = player.velocity.x > 0 ? 1 : -1;
  if (player.sprite) {
    const baseWidth = Math.abs(player.sprite.scale.x);
    player.sprite.scale.x = baseWidth * player.facing;
    player.sprite.position.y = player.spriteBaseY + (moving ? Math.abs(Math.sin(elapsed * 8)) * 0.09 : Math.sin(elapsed * 2.2) * 0.025);
    player.sprite.material.rotation = moving ? Math.sin(elapsed * 8) * 0.018 * player.facing : 0;
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
