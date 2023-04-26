import * as THREE from "three";

import { BoxLineGeometry } from "three/addons/geometries/BoxLineGeometry.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let camera, scene, raycaster, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let gamepad1, gamepad2;
let axis1, axis2;
let marker, floor, baseReferenceSpace;

let INTERSECTION;
const tempMatrix = new THREE.Matrix4();

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x505050);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1, 3);
  const buffer = new THREE.BufferGeometry();
  buffer.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
  );
  buffer.setAttribute(
    "color",
    new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
  );

  let matbuffer = new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
  });

  let bufferline = new THREE.Line(buffer, matbuffer);
  camera.add(bufferline);

  // room = new THREE.LineSegments(
  // 	new BoxLineGeometry( 6, 6, 6, 10, 10, 10 ).translate( 0, 3, 0 ),
  // 	new THREE.LineBasicMaterial( { color: 0x808080 } )
  // );
  // scene.add( room );

  scene.add(new THREE.HemisphereLight(0x606060, 0x404040));

  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  marker = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x808080 })
  );
  scene.add(marker);

  // floor = new THREE.Mesh(
  // 	new THREE.PlaneGeometry( 4.8, 4.8, 2, 2 ).rotateX( - Math.PI / 2 ),
  // 	new THREE.MeshBasicMaterial( { color: 0x808080, transparent: true, opacity: 0.25 } )
  // );
  // scene.add( floor );

  let floorTexture = new THREE.TextureLoader().load(
    "./img/depositphotos_10589691-stock-photo-ground-background.jpg"
  );
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(10, 10);
  let floorMaterial = new THREE.MeshBasicMaterial({
    map: floorTexture,
    side: THREE.DoubleSide,
  });
  let floorGeometry = new THREE.PlaneGeometry(100, 100, 10, 10);
  floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.y = -0.5;
  floor.rotation.x = Math.PI / 2;
  scene.add(floor);

  let loader = new FBXLoader();
  loader.load("./sources/oak 01.fbx", function (object) {
    object.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    // reduce the size of the model
    object.scale.set(0.1, 0.1, 0.1);
    object.position.y = -0.5;
    scene.add(object);
  });

  let loader2 = new GLTFLoader();
  loader2.load("./sources/voiture.glb", function (object) {
    object.scene.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    object.scene.scale.set(0.5, 0.5, 0.5);
    object.scene.position.x = 1;
    object.scene.position.y = -0.5;
    scene.add(object.scene);
  });

  raycaster = new THREE.Raycaster();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.outputEncoding = THREE.sRGBEncoding;

  renderer.xr.addEventListener("sessionstart", (event) => {

    baseReferenceSpace = renderer.xr.getReferenceSpace();
  });
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // controllers

  function onSelectStart() {
    this.userData.isSelecting = true;
  }

  function onSelectEnd() {
    this.userData.isSelecting = false;

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

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  controller1.addEventListener("connected", function (event) {
    this.add(buildController(event.data));
  });
  controller1.addEventListener("connected", function (event) {
    controller1.gamepad = event.data.gamepad;
    axis1 = controller1.gamepad.axes[1];
  });
  controller1.addEventListener("disconnected", function () {
    this.remove(this.children[0]);
  });
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  controller2.addEventListener("connected", function (event) {
    this.add(buildController(event.data));
  });
  controller2.addEventListener("connected", function (event) {
    controller2.gamepad = event.data.gamepad;
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

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  scene.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2)
  );
  scene.add(controllerGrip2);

  //

  window.addEventListener("resize", onWindowResize, false);
}

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

//

function animate() {
  renderer.setAnimationLoop(render);
}

let lineCamera = new THREE.BufferGeometry();
lineCamera.setAttribute(
  "position",
  new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
);
lineCamera.setAttribute(
  "color",
  new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
);

let lineMaterial = new THREE.LineBasicMaterial({
  vertexColors: true,
  blending: THREE.AdditiveBlending,
});

let line = new THREE.Line(lineCamera, lineMaterial);
line.position.set(renderer.xr.getCamera(camera).position.x, renderer.xr.getCamera(camera).position.y, renderer.xr.getCamera(camera).position.z);
line.rotation.y = renderer.xr.getCamera(camera).rotation.y;
line.rotation.x = renderer.xr.getCamera(camera).rotation.x;
line.rotation.z = renderer.xr.getCamera(camera).rotation.z;
scene.add(line);

function render() {
  INTERSECTION = undefined;
  // line camera
  if(line){
    scene.remove(line);
    line = new THREE.Line(lineCamera, lineMaterial);
    line.position.set(renderer.xr.getCamera(camera).position.x, renderer.xr.getCamera(camera).position.y, renderer.xr.getCamera(camera).position.z);
    line.rotation.y = renderer.xr.getCamera(camera).rotation.y;
    line.rotation.x = renderer.xr.getCamera(camera).rotation.x;
    line.rotation.z = renderer.xr.getCamera(camera).rotation.z;
    scene.add(line);
  }

  tempMatrix
    .identity()
    .extractRotation(renderer.xr.getCamera(camera).matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(
    renderer.xr.getCamera(camera).matrixWorld
  );
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  const intersects = raycaster.intersectObjects([floor]);


  if (controller1.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller1.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects([floor]);
    console.log(intersects);

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
