import "./style.css";

import * as THREE from "three";

// import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

import { VRButton } from "three/addons/webxr/VRButton.js";

import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";

import { BoxLineGeometry } from 'three/addons/geometries/BoxLineGeometry.js';

import Stats from "three/examples/jsm/libs/stats.module.js";

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

let INTERSECTION = null;
let tempMatrix = new THREE.Matrix4();
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

let raycaster = new THREE.Raycaster();
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

let room = new THREE.LineSegments(
  new BoxLineGeometry( 6, 6, 6, 10, 10, 10 ).translate( 0, 3, 0 ),
  new THREE.LineBasicMaterial( { color: 0x808080 } )
);
room.position.y = -5;
scene.add( room );

const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(5, 5, 5);

scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);
let floor = new THREE.Mesh(
  new THREE.PlaneGeometry( 4.8, 4.8, 2, 2 ).rotateX( - Math.PI / 2 ),
  new THREE.MeshBasicMaterial( { color: 0x808080, transparent: true, opacity: 0.25 } )
);
scene.add( floor );

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

// textureLoader.load(
//   "./img/depositphotos_10589691-stock-photo-ground-background.jpg",
//   (texture) => {
//     texture.wrapS = THREE.RepeatWrapping;
//     texture.wrapT = THREE.RepeatWrapping;
//     texture.repeat.set(100, 100);
//     const groundMaterial = new THREE.MeshLambertMaterial({
//       map: texture,
//     });
//     const groundMesh = new THREE.Mesh(
//       new THREE.PlaneGeometry(10000, 10000),
//       groundMaterial
//     );
//     groundMesh.rotation.x = -Math.PI / 2;
//     groundMesh.position.y = -10;
//     scene.add(groundMesh);
//     elementLoad++;
//   },
//   (xhr) => {
//     console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
//   }
// );

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

let marker = new THREE.Mesh(
  new THREE.CircleGeometry( 0.25, 32 ).rotateX( - Math.PI / 2 ),
  new THREE.MeshBasicMaterial( { color: 0x808080 } )
);
scene.add( marker );

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
  animate();
};

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#bg"),
  antialias: false,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local");
document.body.appendChild(VRButton.createButton(renderer));
let gripController1 = renderer.xr.getControllerGrip(0);

const model1 = new XRControllerModelFactory();
const controllerModel1 = model1.createControllerModel(gripController1);
gripController1.add(controllerModel1);
let geometry = new THREE.BoxGeometry(1, 1, 1);
let material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
let cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, -5);
gripController1.addEventListener("selectstart", onSelectStart);
gripController1.addEventListener("selectend", onSelectEnd);

scene.add(gripController1);

const gripController2 = renderer.xr.getControllerGrip(1);
const model2 = new XRControllerModelFactory();
const controllerModel2 = model2.createControllerModel(gripController2);
gripController2.add(controllerModel2);
gripController2.addEventListener("selectstart", onSelectStart);
gripController2.addEventListener("selectend", onSelectEnd);
scene.add(gripController2);

function onSelectStart() {
  this.userData.isSelecting = true;
}

function onSelectEnd() {
  this.userData.isSelecting = false;
  console.log(INTERSECTION);
  if (INTERSECTION) {
    const offsetPosition = {
      x: -INTERSECTION.x,
      y: -INTERSECTION.y,
      z: -INTERSECTION.z,
      w: 1,
    };
    const offsetRotation = new THREE.Quaternion();
    const transform = new XRRigidTransform(offsetPosition, offsetRotation);
    const teleportSpaceOffset =
      baseReferenceSpace.getOffsetReferenceSpace(transform);

    renderer.xr.setReferenceSpace(teleportSpaceOffset);
  }
}

let controller1 = renderer.xr.getController(0);
controller1.addEventListener("selectstart", onSelectStart);
controller1.addEventListener("selectend", onSelectEnd);
controller1.addEventListener("connected", function (event) {
  this.add(buildController(event.data));
});
controller1.addEventListener("disconnected", function () {
  this.remove(this.children[0]);
});
scene.add(controller1);

let controller2 = renderer.xr.getController(1);
controller2.addEventListener("selectstart", onSelectStart);
controller2.addEventListener("selectend", onSelectEnd);
controller2.addEventListener("connected", function (event) {
  this.add(buildController(event.data));
});
controller2.addEventListener("disconnected", function () {
  this.remove(this.children[0]);
});
scene.add(controller2);

// The XRControllerModelFactory will automatically fetch controller models
// that match what the user is holding as closely as possible. The models
// should be attached to the object returned from getControllerGrip in
// order to match the orientation of the held device.

const controllerModelFactory = new XRControllerModelFactory();

let controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(
  controllerModelFactory.createControllerModel(controllerGrip1)
);
scene.add(controllerGrip1);

let controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(
  controllerModelFactory.createControllerModel(controllerGrip2)
);
scene.add(controllerGrip2);

function buildController(data) {
  let geometry, material;

  switch (data.targetRayMode) {
    case "tracked-pointer":
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
      );

      material = new THREE.LineBasicMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
      });

      return new THREE.Line(geometry, material);

    case "gaze":
      geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
      material = new THREE.MeshBasicMaterial({
        opacity: 0.5,
        transparent: true,
      });
      return new THREE.Mesh(geometry, material);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}


function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  INTERSECTION = undefined;

  if (controller1.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller1.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects([floor]);

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
    }
  } else if (controller2.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller2.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller2.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects([floor]);

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
    }
  }

  if (INTERSECTION) marker.position.copy(INTERSECTION);

  marker.visible = INTERSECTION !== undefined;

  renderer.render(scene, camera);
}

// function animatevr() {
//   let moving = false;

//   renderer.setAnimationLoop(() => {
//     groups.position.y = -10;
//     camera.position.y = 47;
//     renderer.render(scene, camera);
//   });
// }

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
