import "./style.css";

import * as THREE from "three";

// import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

import { VRButton } from 'three/addons/webxr/VRButton.js';

import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

import Stats from "three/examples/jsm/libs/stats.module.js";

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

let points = 0;
let elementLoad = 0;
const groups = new THREE.Group();
const movementVector = new THREE.Vector3();

const euler = new THREE.Euler();

const scene = new THREE.Scene();

// add a ground picture

// add stat
const stats = new Stats();
document.body.appendChild(stats.dom);

let wallHitbox = [];
let carHitbox;

let carHitboxHelper;

let raycaster;
const objects = [];

let threeHitbox = [];

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.setY(12);
camera.position.setZ(-4);
camera.rotateY(3.15);

// const cameraVR = new THREE.StereoCamera();
// const controlsVR = new THREE.VRControls(cameraVR);

const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(5, 5, 5);

scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);

function init() {}

const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);
const gltfLoader = new GLTFLoader(loadingManager);
const fbxLoader = new FBXLoader(loadingManager);
const dracoLoader = new DRACOLoader(loadingManager);

gltfLoader.load(
  "./sources/0_pour_dessiner_voiture_de_base__cor (2).glb",
  (gltf) => {
    gltf.scene.position.setY(5);
    groups.add(gltf.scene);
    objects.push(gltf.scene);
    elementLoad++;
    console.log("load car");
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  }
);

textureLoader.load(
  "./img/depositphotos_10589691-stock-photo-ground-background.jpg",
  (texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({
      map: texture,
    });
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10000, 10000),
      groundMaterial
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -10;
    scene.add(groundMesh);
    elementLoad++;
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  }
);

textureLoader.load(
  "./img/istockphoto-825778252-612x612.jpg",
  (texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(100, 100);
    const skyMaterial = new THREE.MeshLambertMaterial({
      map: texture,
    });
    const skyMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10000, 10000),
      skyMaterial
    );
    skyMesh.rotation.x = -Math.PI / 2;
    skyMesh.position.y = 40;
    scene.add(skyMesh);
    elementLoad++;
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  }
);


for (let i = 0; i < 10; i++) {
  fbxLoader.load(
    "./sources/oak 01.fbx",
    (fbx) => {

      let randX = Math.random() * 400 - 100;
      let randZ = Math.random() * 400 - 100;
      fbx.position.set(randX, -10, randZ);
      let hitbox = new THREE.Box3().setFromObject(fbx);
      hitbox.min.x += 15;
      hitbox.min.z += 15;
      hitbox.max.x -= 15;
      hitbox.max.z -= 15;
      // create four hitboxes for each tree
      let hitbox1 = new THREE.Box3(
        new THREE.Vector3(hitbox.min.x, hitbox.min.y, hitbox.min.z),
        new THREE.Vector3(hitbox.min.x, hitbox.max.y, hitbox.max.z)
      );
      let hitbox2 = new THREE.Box3(
        new THREE.Vector3(hitbox.min.x, hitbox.min.y, hitbox.min.z),
        new THREE.Vector3(hitbox.max.x, hitbox.max.y, hitbox.min.z)
      );
      let hitbox3 = new THREE.Box3(
        new THREE.Vector3(hitbox.max.x, hitbox.min.y, hitbox.min.z),
        new THREE.Vector3(hitbox.max.x, hitbox.max.y, hitbox.max.z)
      );
      let hitbox4 = new THREE.Box3(
        new THREE.Vector3(hitbox.min.x, hitbox.min.y, hitbox.max.z),
        new THREE.Vector3(hitbox.max.x, hitbox.max.y, hitbox.max.z)
      );

      // create a helper for each hitbox
      let helper1 = new THREE.Box3Helper(hitbox1, 0xffff00);
      let helper2 = new THREE.Box3Helper(hitbox2, 0xffff00);
      let helper3 = new THREE.Box3Helper(hitbox3, 0xffff00);
      let helper4 = new THREE.Box3Helper(hitbox4, 0xffff00);

      threeHitbox.push([hitbox1, hitbox2, hitbox3, hitbox4]);

      scene.add(helper1);
      scene.add(helper2);
      scene.add(helper3);
      scene.add(helper4);
      scene.add(fbx);
      objects.push(fbx);
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    }
  );
}


loadingManager.onLoad = () => {
  console.log("loaded");
  animatevr();
};

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#bg"),
  antialias: false,
  alpha: true
});



renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local");
document.body.appendChild( VRButton.createButton( renderer ) );
let controller1 = renderer.xr.getController(0);
let controller2 = renderer.xr.getController(1);
let controllerGrip1 = renderer.xr.getControllerGrip(0);
let controllerGrip2 = renderer.xr.getControllerGrip(1);
// add enter vr button

scene.add(controller1);
scene.add(controller2);
scene.add(controllerGrip1);
scene.add(controllerGrip2);
let p = document.createElement("p");
try{
  let joystick1 = controller1.userData.gamepad.axes;
  p.innerHTML = "Joystick found"
}catch{
  p.innerHTML = "Joystick not found"
}

p.style.color = "white";
document.body.appendChild(p);


function animatevr(){
  let moving = false;
  renderer.setAnimationLoop(() => {
    groups.position.y = -10;
    camera.position.y = 47;
    renderer.render(scene, camera);
  });
}






window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// let controls = new PointerLockControls(camera, renderer.domElement);

// controls.addEventListener("lock", (event) => {
//   document.body.style.cursor = "none";
// });

// controls.addEventListener("unlock", () => {
//   document.body.style.cursor = "auto";
// });

// document.body.addEventListener("click", () => {
//   controls.lock();
// });

// scene.add(controls.getObject());
scene.add(groups);

raycaster = new THREE.Raycaster(
  new THREE.Vector3(),
  new THREE.Vector3(0, -1, 0),
  0,
  10
);


// function animate() {
//   requestAnimationFrame(animate);
//   const time = performance.now();
//   scene.remove(carHitboxHelper);
//   carHitbox = new THREE.Box3().setFromObject(groups);
//   carHitbox = carHitbox.expandByScalar(2);

  
//   carHitboxHelper = new THREE.Box3Helper(carHitbox, 0xffff00);
//   if (carHitboxHelper) {
//     scene.add(carHitboxHelper);
//   }
//   let directionCollision = "none";
//   if (controls.isLocked === true) {
//     raycaster.ray.origin.copy(controls.getObject().position);
//     raycaster.ray.origin.y -= 10;

//     const intersections = raycaster.intersectObjects(objects);
//     let onObject = intersections.length > 0;
//     if (carHitbox) {
//       threeHitbox.forEach((hitbox) => {
//         if (carHitbox.intersectsBox(hitbox[0])) {
//           onObject = true;
//           directionCollision = "front";
//         } else if (carHitbox.intersectsBox(hitbox[1])) {
//           onObject = true;
//           directionCollision = "left";
//         } else if (carHitbox.intersectsBox(hitbox[2])) {
//           onObject = true;
//           directionCollision = "right";
//         } else if (carHitbox.intersectsBox(hitbox[3])) {
//           onObject = true;
//           directionCollision = "back";
//         }
//       });
//     }

//     const delta = (time - prevTime) / 1000;

//     velocity.x -= velocity.x * 10.0 * delta;
//     velocity.z -= velocity.z * 10.0 * delta;

//     velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

//     direction.z = Number(moveForward) - Number(moveBackward);
//     direction.x = Number(moveRight) - Number(moveLeft);
//     direction.normalize(); // this ensures consistent movements in all directions

//     if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
//     if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

//     if (onObject === true) {
//       velocity.y = Math.max(0, velocity.y);
//       if (directionCollision === "front") {
//         camera.position.z -= 0.1;
//         groups.position.z -= 0.1;
//       }
//       if (directionCollision === "back") {
//         camera.position.z += 0.1;
//         groups.position.z += 0.1;
//       }
//       if (directionCollision === "right") {
//         camera.position.x -= 0.1;
//         groups.position.x -= 0.1;
//       }
//       if (directionCollision === "left") {
//         camera.position.x += 0.1;
//         groups.position.x += 0.1;
//       }
//     } else {
//       controls.moveRight(-velocity.x * delta);
//       controls.moveForward(-velocity.z * delta);

//       controls.getObject().position.y += velocity.y * delta; // new behavior

//       if (controls.getObject().position.y < 10) {
//         velocity.y = 0;
//         controls.getObject().position.y = 10;
//       }
//       groups.position.z = camera.position.z + 5;
//       groups.position.x = camera.position.x + 1;

//       if (moveRight) {
//         if (Math.sin(groups.rotation.y) != -0.999) {
//           if (Math.sin(groups.rotation.y) > -0.999) groups.rotation.y -= 0.01;
//           if (Math.sin(groups.rotation.y) < -0.999) groups.rotation.y += 0.01;
//         }
//       }
//       if (moveLeft) {
//         if (Math.sin(groups.rotation.y) < 0.999) groups.rotation.y += 0.01;
//       }
//       if (moveForward && !moveLeft && !moveRight) {
//         console.log("here");
//         if (Math.sin(groups.rotation.y) > 0) {
//           if (Math.sin(groups.rotation.y) != 0) groups.rotation.y -= 0.01;
//         }
//         if (Math.sin(groups.rotation.y) < 0) {
//           if (Math.sin(groups.rotation.y) != 0) groups.rotation.y += 0.01;
//         }
//       }
//       if (moveBackward && !moveLeft && !moveRight) {
//         if (Math.sin(groups.rotation.y) > 0) {
//           if (Math.sin(groups.rotation.y) != 0) groups.rotation.y += 0.01;
//         }
//         if (Math.sin(groups.rotation.y) < 0) {
//           if (Math.sin(groups.rotation.y) != 0) groups.rotation.y -= 0.01;
//         }
//       }
//     }
//   }

//   prevTime = time;

//   renderer.render(scene, camera);
// }


document.addEventListener("keydown", function (event) {
  if (event.code === "ArrowUp" || event.code === "KeyW") {
    moveForward = true;
  }
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    moveBackward = true;
  }
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    moveLeft = true;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    moveRight = true;
  }
});

document.addEventListener("keyup", function (event) {
  if (event.code === "ArrowUp" || event.code === "KeyW") {
    moveForward = false;
  }
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    moveBackward = false;
  }
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    moveLeft = false;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    moveRight = false;
  }
});
