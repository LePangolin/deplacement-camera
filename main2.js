import * as THREE from "three";

import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let camera, scene, raycaster, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let marker, baseReferenceSpace;

let INTERSECTION;
let moveingSpace = [];
const tempMatrix = new THREE.Matrix4();

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x505050);

  // Create the cross shape
  const crossGeometry = new THREE.ShapeGeometry(
    new THREE.Shape([
      new THREE.Vector2(-0.05, -0.05),
      new THREE.Vector2(-0.05, 0.05),
      new THREE.Vector2(0.05, 0.05),
      new THREE.Vector2(0.05, -0.05),
      new THREE.Vector2(-0.05, -0.05),
    ])
  );

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


  scene.add(camera);

  const geometryHitMarker = new THREE.SphereGeometry(0.01, 32, 32);
  const materialHitMarker = new THREE.MeshStandardMaterial({
    color: new THREE.Color(1, 1, 1),
    roughness: 0.5,
    metalness: 0.5,
  });
  const hitMarker = new THREE.Mesh(geometryHitMarker, materialHitMarker);
  hitMarker.material.emissive = new THREE.Color(1, 1, 1);

  camera.add(hitMarker);
  hitMarker.position.set(0, 0, -1);

  let glbLoader = new GLTFLoader();
  glbLoader.load("./sources/musee.glb", function (object) {
    object.scene.traverse(function (child) {
      if (child.isMesh) {
        // emit light
        child.material.emissive = new THREE.Color(0x444444);
      }
    });

    object.scene.scale.set(0.5, 0.5, 0.5);
    object.scene.position.x = 1;
    object.scene.position.y = 0.5;
    scene.add(object.scene);
  });

  function createDeplacementCube(x, y, z) {
    let cubedeplacementTexture = new THREE.TextureLoader().load(
      "./img/1426.png"
    );
    let cubedeplacement = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.1, 1),
      new THREE.MeshBasicMaterial({ map: cubedeplacementTexture })
    );
    cubedeplacement.position.set(x, y, z);
    cubedeplacement.rotation.y = -1.57;
    cubedeplacement.scale.set(0.6, 1, 0.6);
    scene.add(cubedeplacement);
    moveingSpace.push(cubedeplacement);
  }

  createDeplacementCube(3.9, 0.455, 0);
  createDeplacementCube(1, 0.455, 0);
  createDeplacementCube(-2, 0.455, 0);
  createDeplacementCube(-2, 0.455, 4);
  createDeplacementCube(3.9, 0.455, 4);
  createDeplacementCube(1, 0.455, 4);
  createDeplacementCube(-2, 0.455, -4);

  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(2, 2, 2);
  light.scale.set(10, 10, 10);
  scene.add(light);

  // reduce the amount of light in the scene

  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);
  marker = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x808080 })
  );
  marker.position.y = 0.7;
  scene.add(marker);

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

let cibleMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
let lastPosition;
let lastTime = 0;

// Define the radius of the progress bar
let radius = 5;

// Define the thickness of the progress bar
let thickness = 0.5;

// Define the progress value as a fraction (0 to 1)
let progress = 0.75;

// Create a shape for the progress bar
let shape = new THREE.Shape();
shape.absarc(0, 0, radius, 0, Math.PI * 2 * progress, false);
shape.absarc(0, 0, radius - thickness, Math.PI * 2 * progress, 0, true);
shape.closePath();

// Create an extruded geometry from the shape
let geometry = new THREE.ExtrudeGeometry(shape, {
  depth: thickness,
  bevelEnabled: false,
});

// Create a material for the progress bar
let material = new THREE.MeshBasicMaterial({
  color: 0x00ff00, // Set the color to green
});

// Create a vueIndicator for the progress bar
let vueIndicator = new THREE.Mesh(geometry, material);

vueIndicator.scale.set(0.1, 0.1, 0.1);
vueIndicator.rotation.x = Math.PI / 2;

function render() {
  INTERSECTION = undefined;

  tempMatrix
    .identity()
    .extractRotation(renderer.xr.getCamera(camera).matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(
    renderer.xr.getCamera(camera).matrixWorld
  );
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  const intersects = raycaster.intersectObjects(moveingSpace, true);
  if (intersects.length > 0) {
    if (lastPosition) {
      // si le point d'intersection n'est pas trop éloigné du dernier point d'intersection
      if (intersects[0].point.distanceTo(lastPosition) < 1) {
        // let red = new THREE.Color(1,0,0);
        // // red goes to green as time goes on
        // let green = new THREE.Color(0,1,0);
        // let color = red.lerp(green, lastTime / 250);
        // cibleMesh.material.color.set(color);
        if (vueIndicator) {
          scene.remove(vueIndicator);
        }
        // Define the radius of the progress bar
        radius = 5;

        // Define the thickness of the progress bar
        thickness = 0.5;

        // Define the progress value as a fraction (0 to 1)
        progress = lastTime / 250;

        // Create a shape for the progress bar
        shape = new THREE.Shape();
        shape.absarc(0, 0, radius, 0, Math.PI * 2 * progress, false);
        shape.absarc(0, 0, radius - thickness, Math.PI * 2 * progress, 0, true);
        shape.closePath();

        // Create an extruded geometry from the shape
        geometry = new THREE.ExtrudeGeometry(shape, {
          depth: thickness,
          bevelEnabled: false,
        });
        // color bleu marine

        // Create a material for the progress bar
        material = new THREE.MeshBasicMaterial({
          color: new THREE.Color("rgb(3,34,76)"),
        });

        // Create a vueIndicator for the progress bar
        vueIndicator = new THREE.Mesh(geometry, material);

        vueIndicator.scale.set(0.1, 0.1, 0.1);
        vueIndicator.rotation.x = Math.PI / 2;
        vueIndicator.position.copy(intersects[0].point);
        vueIndicator.position.y = 0.7;
        scene.add(vueIndicator);

        if (lastTime == 250) {
          const offsetPosition = {
            x: -intersects[0].point.x,
            y: -intersects[0].point.y,
            z: -intersects[0].point.z,
            w: 1,
          };
          const offsetRotation = new THREE.Quaternion();
          const transform = new XRRigidTransform(
            offsetPosition,
            offsetRotation
          );
          const teleportSpaceOffset =
            baseReferenceSpace.getOffsetReferenceSpace(transform);

          renderer.xr.setReferenceSpace(teleportSpaceOffset);
        } else {
          lastTime++;
        }
      } else {
        // on réinitialise le compteur
        lastTime = 0;
        // on réinitialise la couleur de la cible
        cibleMesh.material.color.set(0xff0000);
        // on met a jour la dernière position
        lastPosition = intersects[0].point;
      }
    } else {
      lastPosition = intersects[0].point;
    }
    let intersesctionPoint = intersects[0].point;
    if (!vueIndicator) {
      scene.remove(vueIndicator);
    }
  } else {
    lastTime = 0;
    scene.remove(vueIndicator);
  }

  if (controller1.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller1.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects(moveingSpace, true);

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
    }
  } else if (controller2.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller2.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller2.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects(moveingSpace, true);

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
    }
  }

  if (INTERSECTION) marker.position.copy(INTERSECTION);

  marker.visible = INTERSECTION !== undefined;

  renderer.render(scene, camera);
}
