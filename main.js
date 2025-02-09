import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

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
camera.position.set(0, 5, 10);
camera.lookAt(1.5, 1.5, 1); // Look at the center of the shape

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls for rotating the view
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.autoRotate = true; // Enable auto-rotation
controls.autoRotateSpeed = 1.0; // Rotation speed (default is 2.0)
controls.target.set(1.5, 1.5, 1); // Set orbital center to middle of shape

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

// Remove custom shader definitions and replace holographic material with a glowing material
const innerMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x00ffff,
    emissive: 0x004040,
    metalness: 0.9,
    roughness: 0.1,
    transmission: 0.2,
    transparent: true,
    envMapIntensity: 2.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
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

// Calculate the dimensions of the complete cuboid
const existingPositions = new Set(shapeData.map(([x, y, z]) => `${x},${y},${z}`));
const bounds = {
    minX: Math.min(...shapeData.map(([x]) => x)),
    maxX: Math.max(...shapeData.map(([x]) => x)),
    minY: Math.min(...shapeData.map(([, y]) => y)),
    maxY: Math.max(...shapeData.map(([, y]) => y)),
    minZ: Math.min(...shapeData.map(([, , z]) => z)),
    maxZ: Math.max(...shapeData.map(([, , z]) => z))
};

// Generate complete cuboid positions including missing cubes
const allPositions = [];
for (let x = bounds.minX; x <= bounds.maxX; x++) {
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
        for (let z = bounds.minZ; z <= bounds.maxZ; z++) {
            const posKey = `${x},${y},${z}`;
            // Add position if it doesn't exist in original shape
            if (!existingPositions.has(posKey)) {
                allPositions.push([x, y, z]);
            }
        }
    }
}

// Combine original shape and filling cubes, with original shape first
const completeShapeData = [...shapeData, ...allPositions];

// Create a queue of cubes to animate
const cubeQueue = [];
const spawnPoint = new THREE.Vector3(5, 5, 5); // Same as camera position
const spawnDelay = 100; // Milliseconds between each cube spawn
let lastSpawnTime = 0;

// Modify the cube creation section
completeShapeData.forEach(([x, y, z], index) => {
    // Create initial and target positions
    const initialPos = spawnPoint.clone();
    const targetPos = new THREE.Vector3(x, y, z);
    
    // Store cube data for delayed creation
    cubeQueue.push({
        initialPos,
        targetPos,
        created: false,
        isOriginal: index < shapeData.length // Track if it's part of the original shape
    });
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
scene.add(createLabel('SIDE', new THREE.Vector3(1.5, 0, -1)));
scene.add(createLabel('FRONT', new THREE.Vector3(-1.5, 1.5, 1.5)));
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

// Second phase variables
let secondPhaseStarted = false;
let currentLayer = null;
const lineSpacing = 1.2; // Space between cubes in the line
const lineStartPosition = new THREE.Vector3(5, 0, 0); // Starting position for the line
let countSprite = null;
let totalCount = 0;
let sortedLayers = null;
let layerCounted = false;


function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    
    // Update camera rotation
    controls.update();
    
    // First phase: Initial cube placement animation
    if (cubeQueue.some(cube => !cube.created)) {
        if (time - lastSpawnTime > spawnDelay) {
            const nextCube = cubeQueue.find(cube => !cube.created);
            if (nextCube) {
                // Use different materials based on whether it's an original or filling cube
                const useInnerMaterial = nextCube.isOriginal ? innerMaterial : new THREE.MeshPhysicalMaterial({
                    color: 0xff0000,  // Changed to red
                    emissive: 0x330000,  // Red glow
                    metalness: 0.9,
                    roughness: 0.1,
                    transmission: 0.4,  // Increased transmission
                    transparent: true,
                    opacity: 0.7  // Increased opacity
                });
                
                const useGlassMaterial = nextCube.isOriginal ? glassMaterial : new THREE.MeshPhysicalMaterial({
                    color: 0xff4444,  // Light red
                    metalness: 0.0,
                    roughness: 0.1,
                    transmission: 0.6,
                    transparent: true,
                    opacity: 0.4,  // Increased opacity
                    envMap: envMap,
                    envMapIntensity: 1.0,  // Increased intensity
                    clearcoat: 1.0,
                    clearcoatRoughness: 0.1
                });

                // Inner cube
                const innerGeometry = new THREE.BoxGeometry(cubeSize * 0.8, cubeSize * 0.8, cubeSize * 0.8);
                const innerCube = new THREE.Mesh(innerGeometry, useInnerMaterial);
                
                // Outer cube
                const outerGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                const outerCube = new THREE.Mesh(outerGeometry, useGlassMaterial);
                
                // Create edges for outline
                const edgesGeometry = new THREE.EdgesGeometry(outerGeometry);
                const outline = new THREE.LineSegments(edgesGeometry, outlineMaterial);
                
                // Create group for the cube pair
                const cubeGroup = new THREE.Group();
                cubeGroup.add(innerCube);
                cubeGroup.add(outerCube);
                cubeGroup.add(outline);
                
                cubeGroup.position.copy(nextCube.initialPos);
                scene.add(cubeGroup);
                
                nextCube.created = true;
                nextCube.group = cubeGroup;
                nextCube.startTime = time;
                lastSpawnTime = time;
            }
        }
    }
    
    // Check if all cubes have reached their initial positions
    const allCubesInPosition = cubeQueue.every(cube => 
        cube.created && 
        (!cube.group || (time - cube.startTime > 1000))
    );

    // Start second phase when all cubes are in position
    if (allCubesInPosition && !secondPhaseStarted) {
        secondPhaseStarted = true;
        const fillingCubes = cubeQueue.filter(cube => !cube.isOriginal);
        
        // Group cubes by Y coordinate (horizontal layers) - do this once
        const layerMap = new Map();
        fillingCubes.forEach(cube => {
            const y = cube.targetPos.y;
            if (!layerMap.has(y)) {
                layerMap.set(y, []);
            }
            layerMap.get(y).push(cube);
        });
        
        // Store sorted layers for reuse
        sortedLayers = Array.from(layerMap.entries()).sort((a, b) => a[0] - b[0]);
        
        // Calculate total count once
        totalCount = fillingCubes.length;
        
        // Initialize first layer
        if (sortedLayers.length > 0) {
            const [y, cubes] = sortedLayers[0];
            currentLayer = {
                y,
                cubes,
                startTime: time,
                index: 0
            };
            
            // Position cubes in their own row
            cubes.forEach((cube, index) => {
                cube.secondPhaseTarget = new THREE.Vector3(
                    lineStartPosition.x + index * lineSpacing,
                    lineStartPosition.y,
                    lineStartPosition.z + currentLayer.index * lineSpacing * 2
                );
                cube.secondPhaseStart = time;
            });
        }
    }

    // Animate existing cubes
    const animationDuration = 1000;
    cubeQueue.forEach(cube => {
        if (cube.created && cube.group) {
            if (!secondPhaseStarted) {
                // First phase animation
                const elapsed = time - cube.startTime;
                const progress = Math.min(elapsed / animationDuration, 1);
                
                // Use easeOutCubic for smooth animation
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                
                cube.group.position.lerpVectors(
                    cube.initialPos,
                    cube.targetPos,
                    easeProgress
                );
                
                // Add a scale-up effect
                const scale = progress < 1 ? progress : 1;
                cube.group.scale.setScalar(scale);
            } else if (!cube.isOriginal && currentLayer && 
                      cube.targetPos.y === currentLayer.y) {  // Changed from z to y
                // Second phase animation for current layer
                const elapsed = time - cube.secondPhaseStart;
                const progress = Math.min(elapsed / animationDuration, 1);
                
                // Use easeInOutCubic for smooth animation
                const t = progress < 0.5
                    ? 4 * progress * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                
                cube.group.position.lerpVectors(
                    cube.targetPos,
                    cube.secondPhaseTarget,
                    t
                );

                // Check if layer is complete
                if (progress === 1 && 
                    currentLayer.cubes.every(c => 
                        time - c.secondPhaseStart >= animationDuration)) {
                    
                    const nextLayerIndex = currentLayer.index + 1;
                    
                    if (nextLayerIndex < sortedLayers.length) {
                        const [y, cubes] = sortedLayers[nextLayerIndex];
                        currentLayer = {
                            y,
                            cubes,
                            startTime: time,
                            index: nextLayerIndex
                        };
                        
                        // Position cubes in their own row
                        cubes.forEach((cube, index) => {
                            cube.secondPhaseTarget = new THREE.Vector3(
                                lineStartPosition.x + index * lineSpacing,
                                lineStartPosition.y,
                                lineStartPosition.z + currentLayer.index * lineSpacing * 2
                            );
                            cube.secondPhaseStart = time;
                        });
                    } else if (!countSprite) {
                        // Create total count display after all layers are complete
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.width = 512;
                        canvas.height = 128;
                        
                        context.fillStyle = '#ffffff';
                        context.font = 'bold 48px Arial';
                        context.fillText(`Total Filling Cubes: ${totalCount}`, 10, 64);
                        
                        const texture = new THREE.CanvasTexture(canvas);
                        countSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
                        countSprite.position.set(lineStartPosition.x, lineStartPosition.y + 4, lineStartPosition.z + (currentLayer.index + 1) * lineSpacing * 2);
                        countSprite.scale.set(4, 1, 1);
                        scene.add(countSprite);
                    }
                }
            }
        }
    });

    // Existing animation code
    const pulseIntensity = (Math.sin(time * 0.002) * 0.5 + 0.5) * 0.2;
    scene.traverse((object) => {
        if (object.material === innerMaterial) {
            object.material.emissiveIntensity = 1 + pulseIntensity;
        }
    });
    
    scene.children.forEach(child => {
        if (child.type === 'PointLight') {
            child.position.y = 3 + Math.sin(time * 0.001 + child.position.x) * 0.5;
        }
    });
    
    controls.update();
    composer.render();
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
