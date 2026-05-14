import * as THREE from 'https://esm.sh/three';
import { OrbitControls } from 'https://esm.sh/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://esm.sh/three/examples/jsm/loaders/GLTFLoader.js';


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

//---------------------
//      Controls
//---------------------

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

//---------------------
//      Lights-
//---------------------

const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);
debug('Lights added');


const GLOBE_RADIUS = 2.0;

let globe = null;

const sphereGeometry = new THREE.SphereGeometry(1.0, 64, 64);
const sphereMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x0066cc,
    shininess: 5
});
const defaultSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
defaultSphere.scale.set(GLOBE_RADIUS, GLOBE_RADIUS, GLOBE_RADIUS);
scene.add(defaultSphere);
globe = defaultSphere;
debug('Default sphere created');

const loader = new GLTFLoader();
loader.load('earth.glb', (gltf) => {
    scene.remove(defaultSphere);
    globe = gltf.scene;
    globe.scale.set(GLOBE_RADIUS, GLOBE_RADIUS, GLOBE_RADIUS);
    scene.add(globe);
    debug('Earth.glb loaded successfully');
}, undefined, (error) => {
    debug('Could not load earth.glb, using blue sphere');
    console.error(error);
});


const attackLinesGroup = new THREE.Group();
scene.add(attackLinesGroup);
debug('Attack lines group created');

const activeArcs = [];


function latLngToVec3(lat, lng, radius) {
    const phi   = (90 - lat)  * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
         radius * Math.cos(phi),
         radius * Math.sin(phi) * Math.sin(theta)
    );
}

const SEVERITY_COLOR = {
    low:      0x00ff88,
    medium:   0xffaa00,
    high:     0xff4400,
    critical: 0xff0055,
};

const socket = io('http://localhost:5000');
debug('Socket.IO initializing...');

socket.on('connect', () => {
    debug('Socket connected: ' + socket.id);
});

socket.on('attack', (data) => {
    debug('Attack received from ' + data.sourceLat + ',' + data.sourceLng);

    const r        = GLOBE_RADIUS * 1.01;
    const startPos = latLngToVec3(data.sourceLat, data.sourceLng, r);
    const endPos   = latLngToVec3(data.targetLat,  data.targetLng,  r);
    const color    = SEVERITY_COLOR[data.severity] || 0x00ffff;

    
    const ARC_POINTS = 60;
    const mid = startPos.clone().add(endPos).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(GLOBE_RADIUS * 1.5);

    const curve  = new THREE.QuadraticBezierCurve3(startPos, mid, endPos);
    const points = curve.getPoints(ARC_POINTS);

    const positions = new Float32Array((ARC_POINTS + 1) * 3);
    points.forEach((p, i) => {
        positions[i * 3]     = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 2);

    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
    }));
    attackLinesGroup.add(line);

    
    const headDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color })
    );
    attackLinesGroup.add(headDot);

    
    const srcDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    srcDot.position.copy(startPos);
    attackLinesGroup.add(srcDot);

    
    const dstDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshBasicMaterial({ color })
    );
    dstDot.position.copy(endPos);
    attackLinesGroup.add(dstDot);

    activeArcs.push({
        line, geo, headDot, srcDot, dstDot,
        points,
        frame: 0,
        maxFrame: 100,
        totalPoints: ARC_POINTS + 1,
    });

    updatePanel(data);

    
    while (activeArcs.length > 25) {
        const old = activeArcs.shift();
        attackLinesGroup.remove(old.line);
        attackLinesGroup.remove(old.headDot);
        attackLinesGroup.remove(old.srcDot);
        attackLinesGroup.remove(old.dstDot);
        old.geo.dispose();
    }

    debug('Active arcs: ' + activeArcs.length);
});

socket.on('disconnect', () => { debug('Socket disconnected'); });
socket.on('error', (err)  => { debug('Socket error: ' + err); });


const recentAttacks = [];
function updatePanel(data) {
    const countEl = document.getElementById('attack-count');
    if (countEl) countEl.textContent = (data.totalCount || 0).toLocaleString();

    recentAttacks.unshift(data);
    if (recentAttacks.length > 7) recentAttacks.pop();

    const listEl = document.getElementById('recent-list');
    if (listEl) {
        listEl.innerHTML = recentAttacks.map(d => `
            <div class="attack-item sev-${d.severity || 'low'}">
                <span class="sev-dot"></span>
                <div>
                    <div class="attack-route">${d.sourceCountry || '?'} → ${d.targetCountry || '?'}</div>
                    <div class="attack-meta">${d.attackType || 'DNS Attack'} · ${d.timestamp || ''}</div>
                </div>
            </div>
        `).join('');
    }

    if (data.topSources) {
        const srcEl = document.getElementById('top-sources');
        if (srcEl) srcEl.innerHTML = data.topSources.map(([c, n]) =>
            `<div class="top-item"><span>${c}</span><span class="top-count">${n}</span></div>`
        ).join('');
    }
}

//---------------------
//     Animation
//---------------------


function animate() {
    requestAnimationFrame(animate);

    if (globe) {
        globe.rotation.y += 0.0005;
        
        attackLinesGroup.rotation.y = globe.rotation.y;
    }
     //-----------------------------------------
    //     Arc line animation and fading
    //------------------------------------------

    
    for (let i = activeArcs.length - 1; i >= 0; i--) {
        const arc      = activeArcs[i];
        arc.frame++;
        const progress = arc.frame / arc.maxFrame;
        const ptIdx    = Math.min(Math.floor(progress * arc.totalPoints), arc.totalPoints - 1);

        arc.geo.setDrawRange(0, ptIdx + 1);

        if (arc.points[ptIdx]) {
            arc.headDot.position.copy(arc.points[ptIdx]);
        }

        if (progress > 0.8) {
            const fade = 1 - (progress - 0.8) / 0.2;
            arc.line.material.opacity    = Math.max(0, fade * 0.9);
            arc.headDot.material.opacity = Math.max(0, fade);
        }

        if (arc.frame > arc.maxFrame + 30) {
            attackLinesGroup.remove(arc.line);
            attackLinesGroup.remove(arc.headDot);
            attackLinesGroup.remove(arc.srcDot);
            attackLinesGroup.remove(arc.dstDot);
            arc.geo.dispose();
            activeArcs.splice(i, 1);
        }
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