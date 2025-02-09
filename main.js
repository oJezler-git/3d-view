import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333); // Lighter gray background

// Replace perspective camera with orthographic camera
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 10;
const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
);
camera.position.set(5, 5, 5);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls for rotating the view
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;

// Holographic material for cubes
const cubeMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ffff,
  emissive: 0x004040,
  metalness: 0.8,
  roughness: 0.1,
  envMapIntensity: 1.0
});
const cubeSize = 1;

// Create cubes from the provided plan, side, and front elevations
const shapeData = [
    // right
    [0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0], [1, 1, 0], [1, 2, 0], [2, 1, 0], [3, 1, 0],
    
    // middle
    [0, 0, 1], [0, 1, 1], [0, 2, 1], [0, 3, 1],
    
    // left
    [0, 0, 2], [0, 1, 2], [0, 2, 2], [0, 3, 2],
  ];

// Create a custom shader material for holographic effect
const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
        vUv = uv;
        vPosition = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float time;
    
    void main() {
        // Holographic grid effect
        float gridX = mod(vUv.x * 10.0, 1.0);
        float gridY = mod(vUv.y * 10.0, 1.0);
        
        // Pulse wave
        float pulse = sin(time * 2.0) * 0.5 + 0.5;
        
        // Edge glow
        float edgeGlow = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
        
        // Combine effects
        vec3 baseColor = vec3(0.0, 0.8, 1.0); // Cyan base
        vec3 pulseColor = vec3(0.0, 1.0, 0.8); // Slightly different cyan for pulse
        vec3 gridColor = vec3(0.0, 0.5, 1.0); // Blue for grid
        
        float gridLine = step(0.9, gridX) + step(0.9, gridY);
        vec3 finalColor = mix(baseColor, gridColor, gridLine * 0.5);
        finalColor = mix(finalColor, pulseColor, pulse * 0.3);
        finalColor += vec3(edgeGlow) * vec3(0.0, 0.5, 1.0);
        
        gl_FragColor = vec4(finalColor, 0.8);
    }
`;

// Create holographic material
const holographicMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        time: { value: 0 }
    },
    transparent: true,
    side: THREE.DoubleSide
});

// Add environment map for reflections
const cubeTextureLoader = new THREE.CubeTextureLoader();
const envMap = cubeTextureLoader.load([
    'https://threejs.org/examples/textures/cube/Park2/posx.jpg',
    'https://threejs.org/examples/textures/cube/Park2/negx.jpg',
    'https://threejs.org/examples/textures/cube/Park2/posy.jpg',
    'https://threejs.org/examples/textures/cube/Park2/negy.jpg',
    'https://threejs.org/examples/textures/cube/Park2/posz.jpg',
    'https://threejs.org/examples/textures/cube/Park2/negz.jpg'
]);
scene.environment = envMap;

// Create glass-like material for outer shell
const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    metalness: 0.0,
    roughness: 0.1,
    transmission: 0.9,
    transparent: true,
    envMap: envMap,
    envMapIntensity: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
});

// Create outline material
const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });

// Modify the cube creation section
shapeData.forEach(([x, y, z]) => {
    // Inner cube (holographic)
    const innerGeometry = new THREE.BoxGeometry(cubeSize * 0.8, cubeSize * 0.8, cubeSize * 0.8);
    const innerCube = new THREE.Mesh(innerGeometry, holographicMaterial);
    
    // Outer cube (glass)
    const outerGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const outerCube = new THREE.Mesh(outerGeometry, glassMaterial);
    
    // Create edges for outline
    const edgesGeometry = new THREE.EdgesGeometry(outerGeometry);
    const outline = new THREE.LineSegments(edgesGeometry, outlineMaterial);
    
    // Create group for the cube pair
    const cubeGroup = new THREE.Group();
    cubeGroup.add(innerCube);
    cubeGroup.add(outerCube);
    cubeGroup.add(outline);
    
    cubeGroup.position.set(x, y, z);
    scene.add(cubeGroup);
});

// Add labels for different views
function createLabel(text, position) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    context.fillStyle = '#ffffff';
    context.font = 'bold 48px Arial';
    context.fillText(text, 10, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(2, 1, 1);
    return sprite;
}

// Add view labels
scene.add(createLabel('SIDE', new THREE.Vector3(1.5, -1.5, 0)));
scene.add(createLabel('FRONT', new THREE.Vector3(-1.5, 1.5, 2)));
scene.add(createLabel('TOP', new THREE.Vector3(1.5, 4, 1)));

// Modify lighting to be brighter
const colors = [0x00ffff, 0x0088ff, 0x0000ff];
colors.forEach((color, index) => {
    const light = new THREE.PointLight(color, 1.5, 15); // Increased intensity and distance
    light.position.set(
        Math.sin(index * Math.PI * 2 / 3) * 5,
        3,
        Math.cos(index * Math.PI * 2 / 3) * 5
    );
    scene.add(light);
});

// Add ambient light for better overall illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add post-processing for bloom effect
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.0,  // reduced strength
    0.4,  // radius
    0.65  // reduced threshold for more bloom
);
composer.addPass(bloomPass);

function animate() {
    requestAnimationFrame(animate);
    
    // Update holographic shader time for the inner material effect
    const time = performance.now() * 0.001;
    scene.traverse((object) => {
        if (object.material && object.material.type === 'ShaderMaterial') {
            object.material.uniforms.time.value = time;
        }
        
        // Remove the rotation code for cube groups
        // if (object.type === 'Group') {
        //     object.rotation.y += 0.002;
        //     object.rotation.x += 0.001;
        // }
    });
    
    // Keep the animated lights for ambiance
    scene.children.forEach(child => {
        if (child.type === 'PointLight') {
            child.position.y = 3 + Math.sin(time + child.position.x) * 0.5;
        }
    });
    
    controls.update();
    composer.render(); // Use composer instead of renderer for bloom effect
}

animate();

// Update resize handler for orthographic camera
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
