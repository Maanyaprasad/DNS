import * as THREE from 'https://esm.sh/three';
import { OrbitControls } from 'https://esm.sh/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://esm.sh/three/examples/jsm/loaders/GLTFLoader.js';

// Debug
function debug(msg) {
    console.log(msg);
    const el = document.getElementById('debug');
    if (el) el.innerText = msg + '\n' + el.innerText;
}

debug('=== DNS Attack Visualization Started ===');


const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
debug('Scene created');

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 4;
debug('Camera at z=4');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
debug('Renderer ready');

//--------- Controls---------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

//---------- Lights-----------
const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);
debug('Lights added');

// -----------Globe variable----------
let globe = null;


const sphereGeometry = new THREE.SphereGeometry(1.0, 64, 64);
const sphereMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x0066cc,
    shininess: 5
});
const defaultSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
defaultSphere.scale.set(2, 2, 2);
scene.add(defaultSphere);
globe = defaultSphere;
debug('Default sphere created');


const loader = new GLTFLoader();
loader.load('earth.glb', (gltf) => {
    scene.remove(defaultSphere);
    globe = gltf.scene;
    globe.scale.set(2, 2, 2);
    scene.add(globe);
    
    
    globe.add(attackLinesGroup);
    debug('✓ Earth.glb loaded successfully');
}, undefined, (error) => {
    debug('Could not load earth.glb, using blue sphere');
    console.error(error);
});


const attackLinesGroup = new THREE.Group();
globe.add(attackLinesGroup);
debug('Attack lines group created');


const socket = io('http://localhost:5000');
debug('Socket.IO initializing...');

socket.on('connect', () => {
    debug('Socket connected: ' + socket.id);
});

socket.on('attack', (data) => {
    debug('Attack received from ' + data.sourceLat + ',' + data.sourceLng);
    
   
    const lat1 = data.sourceLat * Math.PI / 180;
    const lng1 = data.sourceLng * Math.PI / 180;
    const startPos = new THREE.Vector3(
        Math.cos(lat1) * Math.cos(lng1),
        Math.sin(lat1),
        Math.cos(lat1) * Math.sin(lng1)
    ).multiplyScalar(1.05);
    
    const lat2 = data.targetLat * Math.PI / 180;
    const lng2 = data.targetLng * Math.PI / 180;
    const endPos = new THREE.Vector3(
        Math.cos(lat2) * Math.cos(lng2),
        Math.sin(lat2),
        Math.cos(lat2) * Math.sin(lng2)
    ).multiplyScalar(1.05);
    
    
    const group = new THREE.Group();
    
    const greenSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    greenSphere.position.copy(startPos);
    group.add(greenSphere);
    
    
    const redSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    redSphere.position.copy(endPos);
    group.add(redSphere);
    
    
    const direction = new THREE.Vector3().subVectors(endPos, startPos);
    const distance = direction.length();
    const midpoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
    
    const line = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, distance, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    line.position.copy(midpoint);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.add(line);
    
    attackLinesGroup.add(group);
    debug('Visualized: ' + attackLinesGroup.children.length + ' attacks');
    
    
    while (attackLinesGroup.children.length > 20) {
        attackLinesGroup.removeAt(0);
    }
});

socket.on('disconnect', () => {
    debug('Socket disconnected');
});

socket.on('error', (err) => {
    debug('Socket error: ' + err);
});

//---------- Animation----------
function animate() {
    requestAnimationFrame(animate);
    
    if (globe) {
        globe.rotation.y += 0.0005;
    }
    controls.update();
    renderer.render(scene, camera);
}

animate();


window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

debug('=== Initialization complete ===');