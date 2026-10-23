import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BoatState, AlertState } from '../types/marine';
import { 
  Rotate3d, 
  Sun, 
  Moon, 
  ShieldAlert, 
  Navigation,
  Compass,
  Ship,
  Flag
} from 'lucide-react';

interface Ocean3DSurfaceProps {
  boat: BoatState;
  alert: AlertState;
}

export const Ocean3DSurface: React.FC<Ocean3DSurfaceProps> = ({
  boat,
  alert,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraMode, setCameraMode] = useState<'DRONE' | 'BRIDGE' | 'TOP_DOWN'>('DRONE');
  const [isNightMode, setIsNightMode] = useState(false); // Default to daylight so blue water is brilliantly visible!
  const [showRadarScope, setShowRadarScope] = useState(true);
  const [radarRangeKm, setRadarRangeKm] = useState<number>(3.0);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const titanicMeshGroupRef = useRef<THREE.Group | null>(null);
  const centerRadarScannerRef = useRef<THREE.Mesh | null>(null);
  const centerRadarSweepMeshRef = useRef<THREE.Mesh | null>(null);
  const smokeParticlesRef = useRef<THREE.Points[]>([]);
  const waterGeometryRef = useRef<THREE.PlaneGeometry | null>(null);
  const originalVerticesRef = useRef<Float32Array | null>(null);
  const boundaryFenceMeshRef = useRef<THREE.Mesh | null>(null);
  const boundaryMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const safeReturnArrowGroupRef = useRef<THREE.Group | null>(null);
  const boundaryGroupRef = useRef<THREE.Group | null>(null);

  // Mouse drag orbit controls
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3.8, distance: 95 });

  // Helper to create sharp canvas text texture for 3D signs
  const createSignTexture = (
    mainText: string,
    subText: string,
    bgColor: string,
    borderColor: string,
    textColor: string,
    width = 1024,
    height = 256
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Rounded background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Glowing border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, width - 14, height - 14);

    // Inner glow border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // Main text
    ctx.fillStyle = textColor;
    ctx.font = 'bold 52px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mainText, width / 2, height / 2 - 24);

    // Sub text
    if (subText) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 30px "JetBrains Mono", monospace';
      ctx.fillText(subText, width / 2, height / 2 + 42);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    // 1. Scene with vibrant ocean sky
    const scene = new THREE.Scene();
    const skyColor = isNightMode ? 0x051b34 : 0x0284c7; // Deep night blue or sunny azure blue
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(skyColor, 0.0045);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.5, 1200);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights: Sun + Ambient + Azure Oceanic Highlights
    const ambientLight = new THREE.AmbientLight(isNightMode ? 0x1e3a8a : 0xbae6fd, isNightMode ? 1.4 : 2.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(isNightMode ? 0x38bdf8 : 0xffffff, isNightMode ? 2.0 : 3.5);
    sunLight.position.set(70, 120, 50);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // Cyan-blue water bounce light from underneath
    const waterGlow = new THREE.PointLight(0x00b4d8, 3.5, 200);
    waterGlow.position.set(0, -6, 0);
    scene.add(waterGlow);

    // 5. 3D VIBRANT BLUE OCEAN WATER SURFACE
    const waterSize = 450;
    const waterSegments = 95;
    const waterGeo = new THREE.PlaneGeometry(waterSize, waterSize, waterSegments, waterSegments);
    waterGeo.rotateX(-Math.PI / 2);
    waterGeometryRef.current = waterGeo;

    const posAttribute = waterGeo.attributes.position;
    originalVerticesRef.current = new Float32Array(posAttribute.array);

    // VIBRANT DEEP AZURE BLUE OCEAN MATERIAL
    const oceanBlueColor = isNightMode ? 0x004e89 : 0x0077be; // Vivid Azure Blue
    const waterMat = new THREE.MeshStandardMaterial({
      color: oceanBlueColor,
      emissive: isNightMode ? 0x001d3d : 0x002d62,
      emissiveIntensity: 0.35,
      roughness: 0.12,
      metalness: 0.55,
      flatShading: true,
      transparent: true,
      opacity: 0.94,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    scene.add(waterMesh);

    // Underwater seabed grid
    const seabedGrid = new THREE.GridHelper(380, 38, 0x0096c7, 0x003566);
    seabedGrid.position.y = -22;
    scene.add(seabedGrid);

    // ==========================================
    // 6. 3D TITANIC OCEAN LINER MODEL
    // ==========================================
    const titanicGroup = new THREE.Group();

    // A. Lower Hull (Red Anti-Fouling Bottom)
    const lowerHullGeo = new THREE.BoxGeometry(7.2, 2.0, 38);
    const redBottomMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Titanic Red Bottom
      roughness: 0.35,
    });
    const lowerHullMesh = new THREE.Mesh(lowerHullGeo, redBottomMat);
    lowerHullMesh.position.y = 0.2;
    titanicGroup.add(lowerHullMesh);

    // Tapered bow wedge (Red bottom)
    const bowRedGeo = new THREE.ConeGeometry(3.6, 6, 4);
    bowRedGeo.rotateX(Math.PI / 2);
    bowRedGeo.rotateY(Math.PI / 4);
    const bowRedMesh = new THREE.Mesh(bowRedGeo, redBottomMat);
    bowRedMesh.position.set(0, 0.2, 22);
    bowRedMesh.scale.set(1.0, 0.5, 1.0);
    titanicGroup.add(bowRedMesh);

    // B. Upper Hull (Iconic Black Steel Hull)
    const blackHullGeo = new THREE.BoxGeometry(7.6, 3.4, 38);
    const blackHullMat = new THREE.MeshStandardMaterial({
      color: 0x111317, // Titanic Pitch Black
      roughness: 0.25,
      metalness: 0.4,
    });
    const blackHullMesh = new THREE.Mesh(blackHullGeo, blackHullMat);
    blackHullMesh.position.y = 2.8;
    titanicGroup.add(blackHullMesh);

    // Pointed clipper bow (Black)
    const bowBlackGeo = new THREE.ConeGeometry(3.8, 6, 4);
    bowBlackGeo.rotateX(Math.PI / 2);
    bowBlackGeo.rotateY(Math.PI / 4);
    const bowBlackMesh = new THREE.Mesh(bowBlackGeo, blackHullMat);
    bowBlackMesh.position.set(0, 2.8, 22);
    bowBlackMesh.scale.set(1.0, 0.85, 1.0);
    titanicGroup.add(bowBlackMesh);

    // C. White Sheer Band & Porthole Rows (Illuminated Cabin Windows)
    const portholeGeo = new THREE.BoxGeometry(7.7, 0.4, 36);
    const portholeMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a, // Warm illuminated portholes
      emissive: 0xfef08a,
      emissiveIntensity: 0.9,
    });
    const portholeMesh = new THREE.Mesh(portholeGeo, portholeMat);
    portholeMesh.position.y = 3.2;
    titanicGroup.add(portholeMesh);

    // D. White Superstructure Decks (Promenade Deck & Boat Deck)
    const deck1Geo = new THREE.BoxGeometry(6.6, 2.0, 28);
    const whiteDeckMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
    });
    const deck1Mesh = new THREE.Mesh(deck1Geo, whiteDeckMat);
    deck1Mesh.position.set(0, 5.2, -1);
    titanicGroup.add(deck1Mesh);

    const deck2Geo = new THREE.BoxGeometry(5.8, 1.8, 22);
    const deck2Mesh = new THREE.Mesh(deck2Geo, whiteDeckMat);
    deck2Mesh.position.set(0, 7.0, -1);
    titanicGroup.add(deck2Mesh);

    // Navigation Bridge (Fore of Deck 2)
    const bridgeGeo = new THREE.BoxGeometry(7.0, 1.4, 3.5);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, whiteDeckMat);
    bridgeMesh.position.set(0, 7.4, 9.5);
    titanicGroup.add(bridgeMesh);

    // Bridge Windows
    const bridgeWinGeo = new THREE.BoxGeometry(7.1, 0.7, 2.5);
    const bridgeWinMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
    });
    const bridgeWin = new THREE.Mesh(bridgeWinGeo, bridgeWinMat);
    bridgeWin.position.set(0, 7.6, 9.8);
    titanicGroup.add(bridgeWin);

    // E. 4 ICONIC TITANIC FUNNELS (SMOKESTACKS) - BUFF YELLOW WITH BLACK CAPS
    const funnelSpacing = [-6.5, -1.8, 3.0, 7.5];
    const funnelBuffMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Titanic Ochre / Buff Yellow-Orange
      roughness: 0.3,
    });
    const funnelBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Black top smoke rim
      roughness: 0.3,
    });

    funnelSpacing.forEach((zPos, index) => {
      const funnelGroup = new THREE.Group();

      // Lower buff body
      const bodyGeo = new THREE.CylinderGeometry(0.85, 0.95, 4.2, 16);
      const bodyMesh = new THREE.Mesh(bodyGeo, funnelBuffMat);
      bodyMesh.position.y = 2.1;
      funnelGroup.add(bodyMesh);

      // Top black rim (25% top)
      const capGeo = new THREE.CylinderGeometry(0.85, 0.85, 1.2, 16);
      const capMesh = new THREE.Mesh(capGeo, funnelBlackMat);
      capMesh.position.y = 4.4;
      funnelGroup.add(capMesh);

      // Steam pipe on side of funnel
      const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.0, 8);
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
      const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
      pipeMesh.position.set(0.9, 2.5, 0);
      funnelGroup.add(pipeMesh);

      // Rake funnels backwards by 10 degrees (Iconic Titanic silhouette)
      funnelGroup.rotation.x = -0.16; // tilted aft
      funnelGroup.position.set(0, 7.8, zPos);
      titanicGroup.add(funnelGroup);

      // Smoke puff particles for the first 3 funnels (4th was dummy on real Titanic!)
      if (index < 3) {
        const smokeGeo = new THREE.BufferGeometry();
        const count = 18;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 1.5;
          positions[i * 3 + 1] = Math.random() * 8 + 5;
          positions[i * 3 + 2] = -Math.random() * 8;
        }
        smokeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const smokeMat = new THREE.PointsMaterial({
          color: 0xe2e8f0,
          size: 1.8,
          transparent: true,
          opacity: 0.45,
        });
        const smoke = new THREE.Points(smokeGeo, smokeMat);
        smoke.position.set(0, 12.5, zPos);
        titanicGroup.add(smoke);
        smokeParticlesRef.current.push(smoke);
      }
    });

    // F. Fore and Aft Masts with Rigging
    const foreMastGeo = new THREE.CylinderGeometry(0.15, 0.25, 14, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const foreMast = new THREE.Mesh(foreMastGeo, mastMat);
    foreMast.position.set(0, 11, 15);
    foreMast.rotation.x = -0.08;
    titanicGroup.add(foreMast);

    // Crow's Nest on Foremast
    const crowGeo = new THREE.CylinderGeometry(0.6, 0.5, 0.9, 12);
    const crowMesh = new THREE.Mesh(crowGeo, mastMat);
    crowMesh.position.set(0, 13, 14.8);
    titanicGroup.add(crowMesh);

    // Aft Mast
    const aftMastGeo = new THREE.CylinderGeometry(0.14, 0.22, 13, 8);
    const aftMast = new THREE.Mesh(aftMastGeo, mastMat);
    aftMast.position.set(0, 10.5, -14);
    aftMast.rotation.x = -0.12;
    titanicGroup.add(aftMast);

    // G. Lifeboats on Davits (White mini lifeboats)
    const lifeboatGeo = new THREE.BoxGeometry(0.9, 0.5, 2.4);
    const lifeboatMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    [-8, -4, 0, 4, 8].forEach((z) => {
      // Starboard
      const lb1 = new THREE.Mesh(lifeboatGeo, lifeboatMat);
      lb1.position.set(3.4, 7.8, z);
      titanicGroup.add(lb1);
      // Port
      const lb2 = new THREE.Mesh(lifeboatGeo, lifeboatMat);
      lb2.position.set(-3.4, 7.8, z);
      titanicGroup.add(lb2);
    });

    // H. Indian Ensign Flag at Stern
    const flagGeo = new THREE.PlaneGeometry(2.4, 1.5);
    const flagCanvas = document.createElement('canvas');
    flagCanvas.width = 120;
    flagCanvas.height = 80;
    const fctx = flagCanvas.getContext('2d')!;
    fctx.fillStyle = '#ff9933'; fctx.fillRect(0, 0, 120, 26);
    fctx.fillStyle = '#ffffff'; fctx.fillRect(0, 26, 120, 28);
    fctx.fillStyle = '#138808'; fctx.fillRect(0, 54, 120, 26);
    fctx.fillStyle = '#000080';
    fctx.beginPath(); fctx.arc(60, 40, 9, 0, Math.PI * 2); fctx.fill();
    const flagTex = new THREE.CanvasTexture(flagCanvas);
    const flagMat = new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide });
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(0, 6.5, -18.5);
    titanicGroup.add(flagMesh);

    // ==========================================
    // I. RADAR DETECTOR HARDWARE AT EXACT CENTRE OF SHIP
    // ==========================================
    const radarStationGroup = new THREE.Group();
    // Position at geometric center of Titanic between 2nd and 3rd funnels (x: 0, y: 8.8, z: 0.5)
    radarStationGroup.position.set(0, 8.8, 0.5);

    // 1. Radar Pedestal Base Tower
    const radarPedestalGeo = new THREE.CylinderGeometry(0.35, 0.55, 2.8, 8);
    const radarPedestalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const radarPedestal = new THREE.Mesh(radarPedestalGeo, radarPedestalMat);
    radarPedestal.position.y = 1.4;
    radarStationGroup.add(radarPedestal);

    // 2. High-Tech Radome Sphere / Transceiver Housing
    const radomeGeo = new THREE.SphereGeometry(0.85, 16, 16);
    const radomeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
    });
    const radome = new THREE.Mesh(radomeGeo, radomeMat);
    radome.position.y = 3.0;
    radarStationGroup.add(radome);

    // 3. Rotating Open-Array Marine Radar Scanner Bar (Glowing Cyan)
    const scannerGeo = new THREE.BoxGeometry(4.2, 0.4, 0.5);
    const scannerMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 0.95,
    });
    const scannerMesh = new THREE.Mesh(scannerGeo, scannerMat);
    scannerMesh.position.y = 4.1;
    radarStationGroup.add(scannerMesh);
    centerRadarScannerRef.current = scannerMesh;

    // 4. Strobe Beacon on Top of Radar
    const beaconGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 4.8;
    radarStationGroup.add(beacon);

    // 5. 3D Floating Label hovering directly over the Center Radar Detector
    const radarLabelTex = createSignTexture(
      '⚡ RADAR DETECTOR (CENTRE SHIP)',
      '360° GEOFENCE BOUNDARY SCANNER',
      'rgba(2, 132, 199, 0.92)',
      '#38bdf8',
      '#ffffff',
      512,
      128
    );
    const radarLabelGeo = new THREE.PlaneGeometry(14, 3.5);
    const radarLabelMat = new THREE.MeshBasicMaterial({
      map: radarLabelTex,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const radarLabel = new THREE.Mesh(radarLabelGeo, radarLabelMat);
    radarLabel.position.set(0, 7.2, 0);
    radarStationGroup.add(radarLabel);

    titanicGroup.add(radarStationGroup);

    // ==========================================
    // J. 3D CONCENTRIC RADAR RANGE RINGS & SWEEP ON SEA SURFACE FROM SHIP CENTRE
    // ==========================================
    const centerRadarFieldGroup = new THREE.Group();
    // Centered directly on Titanic's center point
    centerRadarFieldGroup.position.set(0, 0.4, 0.5);

    // 500m Red Range Ring
    const ring500Geo = new THREE.RingGeometry(20, 20.8, 64);
    ring500Geo.rotateX(-Math.PI / 2);
    const ring500Mat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const ring500 = new THREE.Mesh(ring500Geo, ring500Mat);
    centerRadarFieldGroup.add(ring500);

    // 1000m Orange Range Ring
    const ring1000Geo = new THREE.RingGeometry(40, 40.9, 64);
    ring1000Geo.rotateX(-Math.PI / 2);
    const ring1000Mat = new THREE.MeshBasicMaterial({ color: 0xfb923c, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
    const ring1000 = new THREE.Mesh(ring1000Geo, ring1000Mat);
    centerRadarFieldGroup.add(ring1000);

    // 2000m Yellow Range Ring
    const ring2000Geo = new THREE.RingGeometry(60, 61.1, 64);
    ring2000Geo.rotateX(-Math.PI / 2);
    const ring2000Mat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const ring2000 = new THREE.Mesh(ring2000Geo, ring2000Mat);
    centerRadarFieldGroup.add(ring2000);

    // Crosshair Azimuth lines from Center of Ship
    const crossGeoX = new THREE.PlaneGeometry(130, 0.4);
    crossGeoX.rotateX(-Math.PI / 2);
    const crossMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const crossX = new THREE.Mesh(crossGeoX, crossMat);
    centerRadarFieldGroup.add(crossX);

    const crossGeoZ = new THREE.PlaneGeometry(0.4, 130);
    crossGeoZ.rotateX(-Math.PI / 2);
    const crossZ = new THREE.Mesh(crossGeoZ, crossMat);
    centerRadarFieldGroup.add(crossZ);

    // Sweeping Radar Beam Cone (60° fan) radiating from the ship's center
    const sweepConeGeo = new THREE.CircleGeometry(65, 36, 0, Math.PI / 3);
    sweepConeGeo.rotateX(-Math.PI / 2);
    const sweepConeMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const sweepCone = new THREE.Mesh(sweepConeGeo, sweepConeMat);
    centerRadarFieldGroup.add(sweepCone);
    centerRadarSweepMeshRef.current = sweepCone;

    titanicGroup.add(centerRadarFieldGroup);

    scene.add(titanicGroup);
    titanicMeshGroupRef.current = titanicGroup;

    // ==========================================
    // 7. BORDER LINES & WATER TERRITORY MARKERS
    // ==========================================
    const boundaryGroup = new THREE.Group();
    scene.add(boundaryGroup);
    boundaryGroupRef.current = boundaryGroup;

    // A. 3D Holographic Laser Boundary Fence (IMBL)
    const fenceLength = 360;
    const fenceHeight = 22;
    const fenceGeo = new THREE.PlaneGeometry(fenceLength, fenceHeight, 36, 4);
    fenceGeo.translate(0, fenceHeight / 2, 0);

    const fenceMat = new THREE.MeshBasicMaterial({
      color: 0xef4444, // Red Border Fence
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const fenceMesh = new THREE.Mesh(fenceGeo, fenceMat);
    fenceMesh.rotation.y = Math.PI / 2; // North-South
    boundaryGroup.add(fenceMesh);
    boundaryFenceMeshRef.current = fenceMesh;
    boundaryMaterialRef.current = fenceMat;

    // B. FLOATING 3D BORDER BILLBOARD SIGN DIRECTLY ON THE FENCE
    const billboardTex = createSignTexture(
      '🛑 INTERNATIONAL MARITIME BOUNDARY LINE (IMBL)',
      '1974 INDO-SRI LANKA TREATY BORDER • DO NOT CROSS',
      'rgba(185, 28, 28, 0.95)',
      '#ef4444',
      '#ffffff',
      1024,
      256
    );
    const billboardGeo = new THREE.PlaneGeometry(54, 13.5);
    const billboardMat = new THREE.MeshBasicMaterial({
      map: billboardTex,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const billboardMesh = new THREE.Mesh(billboardGeo, billboardMat);
    billboardMesh.position.set(0, 16, 0);
    billboardMesh.rotation.y = Math.PI / 2;
    boundaryGroup.add(billboardMesh);

    // C. FLOATING MARINE WARNING BUOYS WITH FLASHING LIGHTS ALONG BORDER
    [-90, -45, 0, 45, 90].forEach((zOffset) => {
      const buoyGroup = new THREE.Group();
      // Red buoy base
      const buoyBaseGeo = new THREE.CylinderGeometry(1.6, 2.2, 4, 12);
      const buoyBaseMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      const buoyBase = new THREE.Mesh(buoyBaseGeo, buoyBaseMat);
      buoyBase.position.y = 1.0;
      buoyGroup.add(buoyBase);

      // Warning Strobe on top
      const strobeGeo = new THREE.SphereGeometry(0.6, 8, 8);
      const strobeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const strobe = new THREE.Mesh(strobeGeo, strobeMat);
      strobe.position.y = 3.6;
      buoyGroup.add(strobe);

      buoyGroup.position.set(0, 0, zOffset);
      boundaryGroup.add(buoyGroup);
    });

    // D. WATER SURFACE TERRITORY BANNERS (INDIA vs SRI LANKA)
    // India Waters Floating Label
    const indiaLabelTex = createSignTexture(
      '🇮🇳 INDIAN TERRITORIAL WATERS (TAMIL NADU)',
      'SAFE FISHING ZONE • 24/7 COAST GUARD PATROL 1554',
      'rgba(6, 78, 59, 0.92)',
      '#10b981',
      '#ffffff',
      1024,
      256
    );
    const indiaSignGeo = new THREE.PlaneGeometry(65, 16);
    const indiaSignMat = new THREE.MeshBasicMaterial({
      map: indiaLabelTex,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const indiaSign = new THREE.Mesh(indiaSignGeo, indiaSignMat);
    indiaSign.position.set(-45, 12, 0);
    indiaSign.rotation.y = Math.PI / 2;
    boundaryGroup.add(indiaSign);

    // Sri Lanka Waters Floating Label
    const lkLabelTex = createSignTexture(
      '🇱🇰 SRI LANKA / FOREIGN INTERNATIONAL WATERS',
      'RESTRICTED ZONE • ENTRY STRICTLY PROHIBITED',
      'rgba(127, 29, 29, 0.92)',
      '#dc2626',
      '#fca5a5',
      1024,
      256
    );
    const lkSign = new THREE.Mesh(
      indiaSignGeo,
      new THREE.MeshBasicMaterial({ map: lkLabelTex, transparent: true, side: THREE.DoubleSide })
    );
    lkSign.position.set(45, 12, 0);
    lkSign.rotation.y = Math.PI / 2;
    boundaryGroup.add(lkSign);

    // E. 3D BUFFER ZONE RIBBONS PROJECTED ON WATER
    // 2km Yellow Ribbon
    const yellowRibbonGeo = new THREE.PlaneGeometry(360, 2);
    yellowRibbonGeo.rotateX(-Math.PI / 2);
    yellowRibbonGeo.rotateY(Math.PI / 2);
    const yellowRibbonMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const yellowRibbon = new THREE.Mesh(yellowRibbonGeo, yellowRibbonMat);
    yellowRibbon.position.set(-40, 0.4, 0); // 2km scale
    boundaryGroup.add(yellowRibbon);

    // 1km Orange Ribbon
    const orangeRibbon = new THREE.Mesh(
      yellowRibbonGeo,
      new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    orangeRibbon.position.set(-20, 0.4, 0); // 1km scale
    boundaryGroup.add(orangeRibbon);

    // 500m Red Ribbon
    const redRibbon = new THREE.Mesh(
      yellowRibbonGeo,
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    redRibbon.position.set(-10, 0.4, 0); // 500m scale
    boundaryGroup.add(redRibbon);

    // 8. 3D Safe Return Guide Vector (Airborne arrow)
    const arrowGroup = new THREE.Group();
    const arrowShaftGeo = new THREE.CylinderGeometry(0.6, 0.6, 16, 8);
    arrowShaftGeo.rotateZ(Math.PI / 2);
    const arrowShaftMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const arrowShaft = new THREE.Mesh(arrowShaftGeo, arrowShaftMat);

    const arrowHeadGeo = new THREE.ConeGeometry(2.2, 4.5, 8);
    arrowHeadGeo.rotateZ(-Math.PI / 2);
    const arrowHead = new THREE.Mesh(arrowHeadGeo, arrowShaftMat);
    arrowHead.position.x = 10;

    arrowGroup.add(arrowShaft);
    arrowGroup.add(arrowHead);
    arrowGroup.position.set(0, 18, 0);
    scene.add(arrowGroup);
    safeReturnArrowGroupRef.current = arrowGroup;

    // Mouse drag handlers for 3D Orbit
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      cameraAngleRef.current.theta -= deltaX * 0.008;
      cameraAngleRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - deltaY * 0.008)
      );

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      cameraAngleRef.current.distance = Math.max(
        25,
        Math.min(220, cameraAngleRef.current.distance + e.deltaY * 0.06)
      );
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: true });

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Animate Undulating Blue Ocean Waves
      if (waterGeometryRef.current && originalVerticesRef.current) {
        const pos = waterGeometryRef.current.attributes.position;
        const orig = originalVerticesRef.current;
        for (let i = 0; i < pos.count; i++) {
          const u = orig[i * 3];
          const v = orig[i * 3 + 2];
          const wave1 = Math.sin(u * 0.04 + elapsedTime * 2.0) * 1.4;
          const wave2 = Math.cos(v * 0.05 + elapsedTime * 1.6) * 1.0;
          const wave3 = Math.sin((u + v) * 0.07 + elapsedTime * 2.4) * 0.6;
          pos.setY(i, wave1 + wave2 + wave3);
        }
        pos.needsUpdate = true;
        waterGeometryRef.current.computeVertexNormals();
      }

      // Titanic Gentle Pitch & Roll on ocean waves
      if (titanicMeshGroupRef.current) {
        titanicMeshGroupRef.current.position.y = Math.sin(elapsedTime * 1.6) * 0.35;
        titanicMeshGroupRef.current.rotation.x = Math.sin(elapsedTime * 1.2) * 0.035; // pitch
        titanicMeshGroupRef.current.rotation.z = Math.cos(elapsedTime * 1.5) * 0.04; // roll
      }

      // Animate Funnel Smoke Rising
      smokeParticlesRef.current.forEach((pts, idx) => {
        const pos = pts.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) + 0.08;
          let z = pos.getZ(i) - 0.08; // blown aft by ship motion
          if (y > 18) {
            y = 5;
            z = 0;
          }
          pos.setY(i, y);
          pos.setZ(i, z);
        }
        pos.needsUpdate = true;
      });

      // Animate Centre-of-Ship Radar Detector Scanner & Rotating Sweep Beam
      if (centerRadarScannerRef.current) {
        centerRadarScannerRef.current.rotation.y += 0.09;
      }
      if (centerRadarSweepMeshRef.current) {
        centerRadarSweepMeshRef.current.rotation.y -= 0.035;
      }

      // Camera positioning
      if (cameraRef.current && titanicMeshGroupRef.current) {
        if (cameraMode === 'DRONE') {
          const { theta, phi, distance } = cameraAngleRef.current;
          cameraRef.current.position.x = distance * Math.sin(phi) * Math.sin(theta);
          cameraRef.current.position.y = distance * Math.cos(phi);
          cameraRef.current.position.z = distance * Math.sin(phi) * Math.cos(theta);
          cameraRef.current.lookAt(0, 3, 0);
        } else if (cameraMode === 'BRIDGE') {
          // Wheelhouse bridge of the Titanic
          cameraRef.current.position.set(0, 8.8, 10);
          cameraRef.current.lookAt(0, 8.0, 50);
        } else if (cameraMode === 'TOP_DOWN') {
          cameraRef.current.position.set(0, 140, 0);
          cameraRef.current.lookAt(0, 0, 0);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [isNightMode]);

  // Update Titanic Heading & Laser Fence Position when boat coordinates change
  useEffect(() => {
    // 1. Titanic Course Over Ground (COG)
    if (titanicMeshGroupRef.current) {
      const rad = -(boat.cog * Math.PI) / 180;
      titanicMeshGroupRef.current.rotation.y = rad;
    }

    // 2. Relative position of the Boundary Group (IMBL Fence & Territory Labels)
    if (boundaryGroupRef.current && boundaryMaterialRef.current) {
      const scaleUnits = 0.02; // 1000m = 20 units
      const distanceUnits = alert.distanceMeters * scaleUnits;

      if (alert.level === 'BREACH') {
        boundaryGroupRef.current.position.x = -distanceUnits;
      } else {
        boundaryGroupRef.current.position.x = distanceUnits;
      }

      // Dynamic color based on alert
      const colors = {
        SAFE: 0x00b4d8,
        YELLOW: 0xfacc15,
        ORANGE: 0xfb923c,
        RED: 0xef4444,
        BREACH: 0xe11d48,
      };

      boundaryMaterialRef.current.color.setHex(colors[alert.level]);
    }

    // 3. Safe Return Arrow Guide
    if (safeReturnArrowGroupRef.current) {
      if (alert.level !== 'SAFE') {
        safeReturnArrowGroupRef.current.visible = true;
        const arrowRad = -(alert.safeReturnBearing * Math.PI) / 180 + Math.PI / 2;
        safeReturnArrowGroupRef.current.rotation.y = arrowRad;
      } else {
        safeReturnArrowGroupRef.current.visible = false;
      }
    }
  }, [boat.cog, alert.distanceMeters, alert.level, alert.safeReturnBearing]);

  return (
    <div className="relative w-full h-[520px] lg:h-[620px] rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-2xl bg-slate-950">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Territory Guidance Banner (Makes Borders Super Clear & Intuitive!) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-[95%] max-w-2xl bg-slate-950/95 backdrop-blur-md border border-cyan-500/50 rounded-2xl px-4 py-2.5 shadow-2xl flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="text-base">🇮🇳</span>
            <span>INDIAN WATERS (SAFE)</span>
          </div>

          <div className="px-2.5 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 font-mono-num font-extrabold text-[11px] animate-pulse">
            🛑 IMBL BORDER LINE: {alert.distanceMeters}m
          </div>

          <div className="flex items-center gap-1.5 text-rose-400">
            <span>SRI LANKAN WATERS</span>
            <span className="text-base">🇱🇰</span>
          </div>
        </div>

        {/* Visual Progress Bar to the Border */}
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
          {/* India Side */}
          <div className="w-1/2 bg-gradient-to-r from-emerald-500 to-yellow-400 h-full relative">
            {/* Titanic Indicator Needle */}
            <div
              className="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow-lg shadow-white transform -translate-x-1/2"
              style={{
                left: `${Math.max(5, Math.min(95, 100 - (alert.distanceMeters / 3000) * 100))}%`,
              }}
              title="Titanic Ship Location"
            />
          </div>
          {/* Sri Lanka Side */}
          <div className="w-1/2 bg-rose-600 h-full" />
        </div>
      </div>

      {/* Top Left View Controls */}
      <div className="absolute top-16 left-3 z-10 flex flex-wrap items-center gap-2">
        {/* Model Badge */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-2">
          <Ship className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white tracking-wide">RMS TITANIC VESSEL</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 font-mono-num font-semibold">
            4-FUNNEL LINER
          </span>
        </div>

        {/* Camera Views */}
        <div className="flex bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 text-xs font-semibold">
          <button
            onClick={() => setCameraMode('DRONE')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              cameraMode === 'DRONE' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Drone Orbit
          </button>
          <button
            onClick={() => setCameraMode('BRIDGE')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              cameraMode === 'BRIDGE' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bridge View
          </button>
          <button
            onClick={() => setCameraMode('TOP_DOWN')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              cameraMode === 'TOP_DOWN' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Top-Down
          </button>
        </div>

        {/* Day / Night Toggle */}
        <button
          onClick={() => setIsNightMode(!isNightMode)}
          className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title={isNightMode ? 'Switch to Bright Day Sea' : 'Switch to Tactical Night Sea'}
        >
          {isNightMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
        </button>

        {/* Radar Scope Toggle */}
        <button
          onClick={() => setShowRadarScope(!showRadarScope)}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
            showRadarScope
              ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950'
              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title="Toggle Centre-of-Ship Radar Scope"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>Center Radar Scope</span>
        </button>
      </div>

      {/* Orbit Tip */}
      <div className="absolute top-16 right-3 z-10 hidden sm:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 shadow">
        <Rotate3d className="w-4 h-4 text-cyan-400" />
        <span>Drag to rotate 360° • Scroll to zoom Titanic</span>
      </div>

      {/* Tactical Circular Radar Detector Scope (Originating from Center of Ship) */}
      {showRadarScope && (
        <div className="absolute bottom-4 right-4 z-10 bg-slate-950/95 backdrop-blur-md border border-cyan-500/50 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 max-w-[240px]">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1.5 text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              RADAR DETECTOR
            </span>
            <span className="text-[10px] text-cyan-300 font-mono-num font-bold">CENTRE SHIP</span>
          </div>

          {/* Circular PPI Radar Display */}
          <div className="relative w-48 h-48 mx-auto rounded-full bg-[#02101e] border-2 border-cyan-500/60 overflow-hidden flex items-center justify-center shadow-inner shadow-cyan-950">
            {/* Concentric Range Rings */}
            {/* 2000m Yellow Ring */}
            <div className="absolute w-40 h-40 rounded-full border border-dashed border-yellow-500/50 pointer-events-none" />
            <span className="absolute top-1 text-[8px] text-yellow-400/80 font-mono-num">2.0 km</span>

            {/* 1000m Orange Ring */}
            <div className="absolute w-28 h-28 rounded-full border border-dashed border-orange-500/60 pointer-events-none" />
            <span className="absolute top-7 text-[8px] text-orange-400/80 font-mono-num">1.0 km</span>

            {/* 500m Red Ring */}
            <div className="absolute w-16 h-16 rounded-full border border-red-500/70 pointer-events-none" />
            <span className="absolute top-13 text-[8px] text-red-400/90 font-mono-num">500m</span>

            {/* Azimuth Crosshairs (Centered on Ship) */}
            <div className="absolute w-full h-[1px] bg-cyan-500/25 pointer-events-none" />
            <div className="absolute h-full w-[1px] bg-cyan-500/25 pointer-events-none" />

            {/* Rotating Radar Sweep Line from Center */}
            <div className="absolute inset-0 animate-radar origin-center pointer-events-none">
              <div
                className="w-1/2 h-full ml-auto"
                style={{
                  background: 'conic-gradient(from 0deg at 0% 50%, rgba(0, 245, 212, 0.45) 0deg, transparent 55deg)',
                }}
              />
            </div>

            {/* Center Titanic Marker */}
            <div className="relative z-10 w-4 h-4 rounded-full bg-cyan-500 border border-white flex items-center justify-center shadow-lg shadow-cyan-400">
              <span className="text-[7px] text-slate-950 font-bold">🚢</span>
            </div>

            {/* Target Detected: IMBL Border Echo */}
            <div
              className={`absolute top-0 bottom-0 w-[2px] transition-all duration-300 pointer-events-none ${
                alert.level === 'BREACH' ? 'bg-rose-500 shadow-lg shadow-rose-500' :
                alert.level === 'RED' ? 'bg-red-500 shadow-md shadow-red-500 animate-pulse' :
                alert.level === 'ORANGE' ? 'bg-amber-400' :
                alert.level === 'YELLOW' ? 'bg-yellow-400' : 'bg-cyan-400'
              }`}
              style={{
                // Scale distance on radar radius (0 to 3000m)
                left: `${Math.min(95, Math.max(10, 50 + (alert.distanceMeters / 3000) * 45))}%`,
              }}
            />
          </div>

          {/* Telemetry info */}
          <div className="space-y-0.5 text-[10px] font-mono-num text-slate-300 pt-1 border-t border-slate-800">
            <div className="flex justify-between">
              <span>SCANNER ORIGIN:</span>
              <span className="text-cyan-300 font-bold">CENTRE MAST (Z: 0.5)</span>
            </div>
            <div className="flex justify-between">
              <span>BORDER DISTANCE:</span>
              <span className="text-white font-bold">{alert.distanceMeters}m</span>
            </div>
            <div className="flex justify-between">
              <span>RADAR STATUS:</span>
              <span className={`font-bold ${
                alert.level === 'SAFE' ? 'text-emerald-400' :
                alert.level === 'YELLOW' ? 'text-yellow-300' : 'text-rose-400 animate-pulse'
              }`}>
                {alert.level}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating 3D Proximity Laser Fence HUD (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl max-w-sm">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-4 h-4 ${
              alert.level === 'BREACH' ? 'text-rose-400 animate-pulse' :
              alert.level === 'RED' ? 'text-red-400' :
              alert.level === 'ORANGE' ? 'text-amber-400' :
              alert.level === 'YELLOW' ? 'text-yellow-300' : 'text-cyan-400'
            }`} />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Border Laser Fence & Buoy Status
            </h4>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono-num ${
            alert.level === 'BREACH' ? 'bg-rose-950 text-rose-300 border border-rose-600 animate-pulse' :
            alert.level === 'RED' ? 'bg-red-950 text-red-300 border border-red-600' :
            alert.level === 'ORANGE' ? 'bg-amber-950 text-amber-300 border border-amber-600' :
            alert.level === 'YELLOW' ? 'bg-yellow-950 text-yellow-300 border border-yellow-600' :
            'bg-cyan-950 text-cyan-300 border border-cyan-800'
          }`}>
            {alert.level}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-baseline justify-between text-slate-300">
            <span>Distance to IMBL Fence:</span>
            <span className="font-mono-num font-bold text-white text-sm">
              {alert.distanceMeters >= 1000
                ? `${(alert.distanceMeters / 1000).toFixed(2)} km`
                : `${alert.distanceMeters} m`}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 leading-tight">
            {alert.level === 'SAFE' && 'Titanic is cruising safely in Indian waters.'}
            {alert.level === 'YELLOW' && 'Caution: Approaching 2.0 km Yellow warning boundary!'}
            {alert.level === 'ORANGE' && 'Warning: Approaching 1.0 km Orange alert fence!'}
            {alert.level === 'RED' && 'DANGER: Approaching 500m critical boundary fence!'}
            {alert.level === 'BREACH' && 'CRITICAL BREACH: Titanic has crossed IMBL into Sri Lankan waters!'}
          </div>

          {alert.level !== 'SAFE' && (
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/80">
              <span className="text-[11px] text-cyan-300 font-semibold font-tamil">
                பாதுகாப்பான வழி: {alert.safeReturnDirectionTa} ({alert.safeReturnBearing}°)
              </span>
              <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">
                Steer: {alert.safeReturnBearing}°
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
