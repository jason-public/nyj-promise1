/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, Eye, Info } from 'lucide-react';

interface StationNode {
  name: string;
  code: string;
  pos: [number, number, number];
  color: number;
  line: string;
}

interface TransitLine {
  name: string;
  color: number;
  points: [number, number, number][];
}

const STATIONS: StationNode[] = [
  { name: '강일/미사', code: '4-01', pos: [-6, 0.2, 3], color: 0xf59e0b, line: '9호선' },
  { name: '945역(다산2동)', code: '4-02', pos: [-2, 0.4, 1.5], color: 0xf59e0b, line: '9호선' },
  { name: '왕숙지구', code: '4-01', pos: [1, 0.5, 0], color: 0xf59e0b, line: '9호선' },
  { name: '별내역', code: '4-03', pos: [-3, 0.3, -2], color: 0xe11d48, line: '8호선' },
  { name: '별내별가람역', code: '4-03', pos: [-1, 0.4, -3], color: 0xe11d48, line: '8호선' },
  { name: '청학역(신설)', code: '4-04', pos: [1.5, 0.5, -4], color: 0xe11d48, line: '8호선 연장' },
  { name: '의정부', code: '4-04', pos: [4, 0.6, -5.5], color: 0xe11d48, line: '8호선 연장' },
  { name: '하남시청', code: '4-05', pos: [-5, 0.2, 5], color: 0xea580c, line: '3호선' },
  { name: '남양주(덕소)', code: '4-05', pos: [2, 0.4, 4], color: 0xea580c, line: '3호선' },
  { name: '청량리/상봉', code: '4-06', pos: [-6, 0.3, -0.5], color: 0x0d9488, line: '경춘선 직결' },
  { name: '평내호평', code: '4-07-1', pos: [4, 0.5, 1], color: 0x6366f1, line: 'GTX-B' },
  { name: '마석', code: '4-07-1', pos: [7, 0.6, 2], color: 0x6366f1, line: 'GTX-B' },
  { name: '화도차량기지', code: '4-07-1', pos: [8.5, 0.7, 2.5], color: 0x6366f1, line: 'GTX-B 차량기지' },
];

const LINES: TransitLine[] = [
  // 9호선
  {
    name: '9호선 (강동하남남양주선)',
    color: 0xf59e0b,
    points: [
      [-6, 0.2, 3],
      [-4, 0.3, 2.2],
      [-2, 0.4, 1.5],
      [0, 0.45, 0.8],
      [1, 0.5, 0],
      [2.5, 0.55, -0.5],
    ],
  },
  // 8호선 별내선 및 청학~의정부 연장
  {
    name: '8호선 (별내선 ~ 의정부 연장)',
    color: 0xe11d48,
    points: [
      [-5, 0.1, -1],
      [-3, 0.3, -2],
      [-1, 0.4, -3],
      [0.2, 0.45, -3.5],
      [1.5, 0.5, -4],
      [2.8, 0.55, -4.8],
      [4, 0.6, -5.5],
    ],
  },
  // 3호선 송파하남선 덕소 연장
  {
    name: '3호선 (하남시청 ~ 덕소 연장)',
    color: 0xea580c,
    points: [
      [-5, 0.2, 5],
      [-3, 0.3, 4.8],
      [-0.5, 0.35, 4.4],
      [2, 0.4, 4],
    ],
  },
  // 경춘선-수인분당선 직결
  {
    name: '경춘선·수인분당선 직결',
    color: 0x0d9488,
    points: [
      [-6, 0.3, -0.5],
      [-4, 0.35, -0.2],
      [-1, 0.4, 0.5],
      [1, 0.45, 0.8],
      [4, 0.5, 1],
      [7, 0.6, 2],
    ],
  },
  // GTX-B
  {
    name: 'GTX-B 광역급행철도',
    color: 0x6366f1,
    points: [
      [-8, 0.4, -0.8],
      [-5, 0.45, -0.6],
      [-3, 0.5, -1.8],
      [1, 0.55, 0.1],
      [4, 0.6, 1.1],
      [7, 0.65, 2.1],
      [8.5, 0.7, 2.5],
    ],
  },
];

interface Props {
  onSelectPledge: (code: string) => void;
}

export const ThreeTransitMap: React.FC<Props> = ({ onSelectPledge }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [hoveredStation, setHoveredStation] = useState<StationNode | null>(null);
  const [useFallback, setUseFallback] = useState<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (useFallback || !mountRef.current) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setUseFallback(true);
      return;
    }

    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = 240;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f172a, 0.04);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 10, 14);
    camera.lookAt(0, 0, 0);

    // Ambient and directional lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x93c5fd, 1.2);
    dirLight.position.set(5, 12, 8);
    scene.add(dirLight);

    // Subtle grid platform representing urban topography
    const gridHelper = new THREE.GridHelper(26, 26, 0x334155, 0x1e293b);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // Abstract low-height city blocks
    const buildingGeo = new THREE.BoxGeometry(0.8, 1, 0.8);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2,
    });
    const cityGroup = new THREE.Group();

    const buildingCoords = [
      [-7, 0, -3], [-5, 0, -4], [-8, 0, 1], [-4, 0, 3], [-2, 0, -5],
      [0, 0, -2], [2, 0, -3], [3, 0, 3], [5, 0, -1], [6, 0, 3],
      [-1, 0, 3], [3, 0, -1], [6, 0, -3], [8, 0, 0]
    ];

    buildingCoords.forEach(([x, , z]) => {
      const h = 0.3 + Math.random() * 0.7;
      const bMesh = new THREE.Mesh(buildingGeo, buildingMat);
      bMesh.scale.set(0.6 + Math.random() * 0.4, h, 0.6 + Math.random() * 0.4);
      bMesh.position.set(x, h / 2, z);
      cityGroup.add(bMesh);
    });
    scene.add(cityGroup);

    // Render curves for transit lines
    const lineMeshes: THREE.Line[] = [];
    const splineCurves: THREE.CatmullRomCurve3[] = [];

    LINES.forEach((line) => {
      const vPoints = line.points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(vPoints);
      splineCurves.push(curve);

      const curvePoints = curve.getPoints(60);
      const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const material = new THREE.LineBasicMaterial({
        color: line.color,
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      const lineMesh = new THREE.Line(geometry, material);
      scene.add(lineMesh);
      lineMeshes.push(lineMesh);
    });

    // Station meshes & click targets
    const stationGroup = new THREE.Group();
    const stationSpheres: THREE.Mesh[] = [];
    const sphereGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const ringGeo = new THREE.RingGeometry(0.28, 0.42, 24);
    ringGeo.rotateX(-Math.PI / 2);

    STATIONS.forEach((st) => {
      const sphereMat = new THREE.MeshStandardMaterial({
        color: st.color,
        emissive: st.color,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(sphereGeo, sphereMat);
      mesh.position.set(st.pos[0], st.pos[1], st.pos[2]);
      (mesh as any).userData = st;

      const ringMat = new THREE.MeshBasicMaterial({
        color: st.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(st.pos[0], st.pos[1] - 0.05, st.pos[2]);

      stationGroup.add(mesh);
      stationGroup.add(ringMesh);
      stationSpheres.push(mesh);
    });
    scene.add(stationGroup);

    // Light pulse particles traveling along lines
    const particleCount = 25;
    const particleGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleGroup = new THREE.Group();
    const particles: { mesh: THREE.Mesh; curveIndex: number; progress: number; speed: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const pMesh = new THREE.Mesh(particleGeo, particleMat);
      const curveIndex = i % splineCurves.length;
      const progress = Math.random();
      const speed = 0.0015 + Math.random() * 0.002;
      particles.push({ mesh: pMesh, curveIndex, progress, speed });
      particleGroup.add(pMesh);
    }
    scene.add(particleGroup);

    // Raycaster for hover/click interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(stationSpheres);

      if (intersects.length > 0) {
        const found = (intersects[0].object as any).userData as StationNode;
        setHoveredStation(found);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredStation(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(stationSpheres);
      if (intersects.length > 0) {
        const found = (intersects[0].object as any).userData as StationNode;
        onSelectPledge(found.code);
      }
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          camera.aspect = w / height;
          camera.updateProjectionMatrix();
          renderer.setSize(w, height);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (isPlaying) {
        const delta = clock.getDelta();
        // Subtle orbital floating
        camera.position.x = Math.sin(clock.getElapsedTime() * 0.15) * 1.5;
        camera.position.z = 14 + Math.cos(clock.getElapsedTime() * 0.15) * 0.8;
        camera.lookAt(0, 0, 0);

        // Advance particles along transit curves
        particles.forEach((p) => {
          p.progress = (p.progress + p.speed) % 1;
          const point = splineCurves[p.curveIndex].getPoint(p.progress);
          p.mesh.position.copy(point);
        });

        // Pulsate station rings
        stationGroup.children.forEach((child, idx) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) {
            const scale = 1 + Math.sin(clock.getElapsedTime() * 2 + idx) * 0.15;
            child.scale.set(scale, scale, 1);
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleClick);

      // Dispose Three.js objects
      buildingGeo.dispose();
      buildingMat.dispose();
      sphereGeo.dispose();
      ringGeo.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      lineMeshes.forEach((m) => {
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material.dispose();
      });
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, [isPlaying, useFallback, onSelectPledge]);

  return (
    <div className="relative w-full bg-[#0F172A] rounded-xl overflow-hidden shadow-sm border border-slate-800 text-white mb-6">
      {/* Visual Canvas or Fallback */}
      {useFallback ? (
        <div className="h-[240px] flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-300">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-200 mb-1">상징적 철도망 2D 다이어그램 모드</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              WebGL 가속이 지원되지 않거나 모션 감소 모드가 활성화되어 정적 모드로 표시됩니다.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {STATIONS.map((st) => (
                <button
                  key={st.name}
                  onClick={() => onSelectPledge(st.code)}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  {st.line}: {st.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div ref={mountRef} className="w-full h-[240px] block" />
      )}

      {/* Top Left Title Overlay */}
      <div className="absolute top-3 left-4 pointer-events-none z-10 flex items-center gap-2">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-md">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">
            남양주시 광역철도망 인터랙티브 3D 시각화
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            (정거장 노드를 클릭하면 해당 공약 상세로 이동합니다)
          </span>
        </div>
      </div>

      {/* Hovered Station Tooltip */}
      {hoveredStation && (
        <div className="absolute bottom-3 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-indigo-500/50 rounded-lg p-2.5 shadow-xl transition-all pointer-events-none max-w-xs">
          <div className="text-[11px] font-semibold text-indigo-400">
            {hoveredStation.line} | 관리번호 [{hoveredStation.code}]
          </div>
          <div className="text-sm font-bold text-white">{hoveredStation.name}</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">클릭하여 공약 세부사항 보기 →</div>
        </div>
      )}

      {/* Legend & Controls Overlay */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
        <div className="hidden md:flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700/60 text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 9호선
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> 8호선
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> 3호선
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" /> 경춘직결
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> GTX-B
          </span>
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? '애니메이션 일시정지' : '애니메이션 재생'}
          className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <button
          onClick={() => setUseFallback(!useFallback)}
          title={useFallback ? '3D 모드로 전환' : '2D 정적 모드로 전환'}
          className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
        >
          <Eye size={14} />
        </button>
      </div>

      <div className="absolute bottom-2 right-4 text-[10px] text-slate-500 pointer-events-none hidden sm:block">
        ※ 본 3D 장면은 철도망 연결을 형상화한 상징적 시각화이며 실제 공정률이나 지형 측량과는 구분됩니다.
      </div>
    </div>
  );
};
