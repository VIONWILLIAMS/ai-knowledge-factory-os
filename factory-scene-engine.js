/**
 * v1.2 standalone factory scene. Geometry extracted from main.js at 69536e0.
 * One complete factory, including the v1.1 intake/delivery layer.
 * This module owns only scene geometry, decorative motion and camera controls.
 * The original app, its data and its v1.1 renderer are unchanged.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function createFactoryScene({ canvas, container, onViewChange = () => {} }) {
const FACTORY_SHOWCASE_VERSION = '1.2';
let seed = 12026;
function random() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}
const state = {
  animationActive: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  wireframeMode: false,
  agvBots: [], amrBots: [], conveyorRollers: [], conveyorSurfaces: [],
  conveyorTracks: [], signalLights: [], knowledgeAssets: [], interactiveObjects: [],
  objectById: new Map(), objectIdSeeds: new Map(),
  twinFactory: { factory2: null, evolution: null, flowTokens: [], flowBeacons: [] },
};
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.55;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101620);
const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 500);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.minDistance = 5;
controls.maxDistance = 240;
controls.minPolarAngle = 0.03;
controls.maxPolarAngle = Math.PI * 0.49;
controls.screenSpacePanning = true;
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'scene-label-layer';
labelRenderer.domElement.hidden = true;
container.appendChild(labelRenderer.domElement);
scene.add(new THREE.AmbientLight(0x8799ad, 1.6));
scene.add(new THREE.HemisphereLight(0xd5e4ff, 0x73859a, 1.2));
const keyLight = new THREE.DirectionalLight(0xfff2d8, 4.8);
keyLight.position.set(35, 55, 32);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
Object.assign(keyLight.shadow.camera, { near: 0.5, far: 140, left: -40, right: 40, top: 40, bottom: -40 });
keyLight.shadow.bias = -0.0004;
keyLight.shadow.normalBias = 0.02;
keyLight.target.position.set(0, 0, 0);
scene.add(keyLight, keyLight.target);
const fillLight = new THREE.DirectionalLight(0xc8daf0, 1.7);
fillLight.position.set(-25, 20, 35);
scene.add(fillLight);
const bounceLight = new THREE.DirectionalLight(0x6f8eb8, 1.25);
bounceLight.position.set(0, 1, 0);
scene.add(bounceLight);

// Keep named geometry for future visual edits, without indexing every submesh.
function registerFactoryObject(object, meta = {}) {
  const id = ensureUniqueFactoryId(meta.id || object.name || `part-${state.objectById.size}`, object);
  object.userData = { ...object.userData, factoryObjectId: id, sceneName: meta.name || object.name };
  state.objectById.set(id, object);
  return object;
}

// Legacy builders attach annotations to geometry. Drop these dense annotations
// after construction; the standalone viewer uses only eight short landmark labels.
function createLabel(text, position, color, fontSize, layer) {
  const element = document.createElement('span');
  element.textContent = text;
  const label = new CSS2DObject(element);
  label.position.set(...position);
  label.userData.omittedAnnotation = true;
  return label;
}

const assetStores = [
  { key: 'knowledge', label: '知识资产仓', category: '概念 / 事实 / 引用 / 图谱节点', color: 0x3cc8ff },
  { key: 'skill', label: '技能资产仓', category: '技能画像 / 掌握等级 / 缺口路径', color: 0x3ee898 },
  { key: 'experience', label: '经验资产仓', category: '复盘 / 踩坑 / 决策日志 / 适用条件', color: 0xffa940 },
  { key: 'task', label: '任务资产仓', category: '行动卡 / 任务树 / 验收标准 / SLA', color: 0xa08cff },
  { key: 'kit', label: '套件资产仓', category: '模板 / Prompt / 代码片段 / 检查清单', color: 0xff6b6b },
];

const lifecycleStages = [
  { key: 'queued', label: '已入队', detail: '等待解析与来源识别', agent: 'Ingest Agent', material: 'assetTask', color: '#a08cff' },
  { key: 'parsing', label: '解析中', detail: '抽取正文、元数据与上下文', agent: 'Parse Agent', material: 'assetKnowledge', color: '#3cc8ff' },
  { key: 'qa', label: '质检中', detail: '去重、引用、冲突、时效检测', agent: 'QA Agent', material: 'assetWarning', color: '#ffa940' },
  { key: 'refining', label: '炼制中', detail: '摘要、chunk、标签、实体、关系边', agent: 'Refinery Agent', material: 'assetKnowledge', color: '#3cc8ff' },
  { key: 'stored', label: '已入仓', detail: '归档到五类资产仓', agent: 'Memory Agent', material: 'assetComplete', color: '#3ee898' },
  { key: 'reusable', label: '可复用', detail: '可被项目、任务与报告直接召回', agent: 'Memory Agent', material: 'assetLongTerm', color: '#a08cff' },
  { key: 'pushed', label: '已推送行动', detail: '生成行动卡、报告或复盘建议', agent: 'Action Agent', material: 'assetComplete', color: '#3ee898' },
];

const assetBlueprints = [
  { label: 'INT', source: '项目意图', title: '3D 知识工厂下一步目标', value: '任务资产', target: '任务资产仓', reusable: 82 },
  { label: 'PDF', source: 'PDF 报告', title: 'WebGPU 渲染管线研究报告', value: '知识资产', target: '知识资产仓', reusable: 74 },
  { label: 'WEB', source: '网页剪藏', title: 'Three.js 性能优化参考', value: '知识资产', target: '知识资产仓', reusable: 79 },
  { label: 'WR', source: '微信读书笔记', title: '空间认知与 3D 交互笔记', value: '经验资产', target: '经验资产仓', reusable: 68 },
  { label: 'MEET', source: '会议纪要', title: 'AI 工厂工作坊策划讨论', value: '经验资产', target: '经验资产仓', reusable: 88, risk: '缺少来源' },
  { label: 'CODE', source: '代码片段', title: 'CSS2D 标签与相机控制片段', value: '套件资产', target: '套件资产仓', reusable: 91 },
];

const mat = {
  floor: new THREE.MeshStandardMaterial({ color: 0x383a44, roughness: 0.55, metalness: 0.2 }),
  floorLine: new THREE.MeshStandardMaterial({ color: 0x4e5464, roughness: 0.3, metalness: 0.5 }),
  floorDark: new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.5, metalness: 0.3 }),
  floorGrid: new THREE.MeshStandardMaterial({ color: 0x303541, roughness: 0.6, metalness: 0.1 }),
  rackFrame: new THREE.MeshStandardMaterial({ color: 0x4a7eb5, roughness: 0.4, metalness: 0.75 }),
  rackBeam: new THREE.MeshStandardMaterial({ color: 0x5f8fca, roughness: 0.35, metalness: 0.8 }),
  rackShelf: new THREE.MeshStandardMaterial({ color: 0x465b70, roughness: 0.5, metalness: 0.5 }),
  pallet: new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.7, metalness: 0.05 }),
  boxBrown: new THREE.MeshStandardMaterial({ color: 0xb8956a, roughness: 0.65, metalness: 0.05 }),
  boxBlue: new THREE.MeshStandardMaterial({ color: 0x5588cc, roughness: 0.5, metalness: 0.1 }),
  boxWhite: new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 0.45, metalness: 0.05 }),
  boxGreen: new THREE.MeshStandardMaterial({ color: 0x55aa77, roughness: 0.5, metalness: 0.1 }),
  conveyorFrame: new THREE.MeshStandardMaterial({ color: 0x5a6e82, roughness: 0.3, metalness: 0.7 }),
  conveyorBelt: new THREE.MeshStandardMaterial({ color: 0x3a3d46, roughness: 0.7, metalness: 0.1 }),
  roller: new THREE.MeshStandardMaterial({ color: 0x707070, roughness: 0.2, metalness: 0.9 }),
  agvBody: new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.3, metalness: 0.5 }),
  agvBody2: new THREE.MeshStandardMaterial({ color: 0x35a0ff, roughness: 0.3, metalness: 0.5 }),
  amrBody: new THREE.MeshStandardMaterial({ color: 0x44cc88, roughness: 0.25, metalness: 0.45 }),
  amrBody2: new THREE.MeshStandardMaterial({ color: 0xeeaa44, roughness: 0.25, metalness: 0.45 }),
  signalGreen: new THREE.MeshStandardMaterial({ color: 0x00ff88, roughness: 0.1, metalness: 0.1, emissive: 0x00ff88, emissiveIntensity: 2.5 }),
  signalRed: new THREE.MeshStandardMaterial({ color: 0xff3344, roughness: 0.1, metalness: 0.1, emissive: 0xff3344, emissiveIntensity: 2.5 }),
  signalOrange: new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.1, metalness: 0.1, emissive: 0xffaa00, emissiveIntensity: 2.0 }),
  signBlue: new THREE.MeshStandardMaterial({ color: 0x2266cc, roughness: 0.3, metalness: 0.6 }),
  signCyan: new THREE.MeshStandardMaterial({ color: 0x22aaaa, roughness: 0.3, metalness: 0.6 }),
  signGreen: new THREE.MeshStandardMaterial({ color: 0x228844, roughness: 0.3, metalness: 0.6 }),
  signRed: new THREE.MeshStandardMaterial({ color: 0xbb3333, roughness: 0.3, metalness: 0.6 }),
  partition: new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0.35 }),
  coldWall: new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.25 }),
  post: new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.3, metalness: 0.7 }),
  dockFloor: new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.4, metalness: 0.3 }),
  assetKnowledge: new THREE.MeshStandardMaterial({ color: 0x3cc8ff, roughness: 0.42, metalness: 0.12, emissive: 0x0a3a55, emissiveIntensity: 0.4 }),
  assetSkill: new THREE.MeshStandardMaterial({ color: 0x3ee898, roughness: 0.42, metalness: 0.12, emissive: 0x0b4a2e, emissiveIntensity: 0.35 }),
  assetExperience: new THREE.MeshStandardMaterial({ color: 0xffa940, roughness: 0.45, metalness: 0.08, emissive: 0x5a3300, emissiveIntensity: 0.35 }),
  assetTask: new THREE.MeshStandardMaterial({ color: 0xa08cff, roughness: 0.44, metalness: 0.1, emissive: 0x2a1f55, emissiveIntensity: 0.35 }),
  assetKit: new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.44, metalness: 0.1, emissive: 0x5a1616, emissiveIntensity: 0.35 }),
  assetWarning: new THREE.MeshStandardMaterial({ color: 0xffc14a, roughness: 0.42, metalness: 0.1, emissive: 0x5a3600, emissiveIntensity: 0.55 }),
  assetRisk: new THREE.MeshStandardMaterial({ color: 0xff5c5c, roughness: 0.42, metalness: 0.1, emissive: 0x5a1515, emissiveIntensity: 0.7 }),
  assetComplete: new THREE.MeshStandardMaterial({ color: 0x3ee898, roughness: 0.4, metalness: 0.12, emissive: 0x0b4a2e, emissiveIntensity: 0.45 }),
  assetLongTerm: new THREE.MeshStandardMaterial({ color: 0xa08cff, roughness: 0.36, metalness: 0.14, emissive: 0x2a1f55, emissiveIntensity: 0.65 }),
  loopPulse: new THREE.MeshStandardMaterial({ color: 0x9ee7ff, roughness: 0.2, metalness: 0.15, emissive: 0x3cc8ff, emissiveIntensity: 1.2 }),
};

function createBox(w, h, d, material, opts = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  if (opts.castShadow !== false) mesh.castShadow = true;
  if (opts.receiveShadow) mesh.receiveShadow = true;
  if (opts.position) mesh.position.set(opts.position[0], opts.position[1], opts.position[2]);
  if (opts.rotation) mesh.rotation.set(opts.rotation[0], opts.rotation[1], opts.rotation[2]);
  if (opts.scale) mesh.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
  if (opts.name) { mesh.name = opts.name; state.interactiveObjects.push(mesh); }
  if (opts.data) mesh.userData = opts.data;
  if (opts.registry) registerFactoryObject(mesh, opts.registry);
  return mesh;
}

function createCylinder(rTop, rBot, h, seg, material, opts = {}) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, seg || 16);
  const mesh = new THREE.Mesh(geo, material);
  if (opts.castShadow !== false) mesh.castShadow = true;
  if (opts.receiveShadow) mesh.receiveShadow = true;
  if (opts.position) mesh.position.set(opts.position[0], opts.position[1], opts.position[2]);
  if (opts.rotation) mesh.rotation.set(opts.rotation[0], opts.rotation[1], opts.rotation[2]);
  if (opts.name) { mesh.name = opts.name; state.interactiveObjects.push(mesh); }
  if (opts.data) mesh.userData = opts.data;
  if (opts.registry) registerFactoryObject(mesh, opts.registry);
  return mesh;
}

function alignCylinderToHorizontalAxis(mesh, axisX, axisZ) {
  const axis = new THREE.Vector3(axisX, 0, axisZ);
  if (axis.lengthSq() === 0) return;
  axis.normalize();
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
}

function getConveyorLateral(dirX, dirZ) {
  return {
    lateralX: -dirZ,
    lateralZ: dirX,
  };
}

function slugifyFactoryId(value, fallback = 'object') {
  const raw = String(value || fallback).trim();
  const ascii = raw
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || fallback;
}

function ensureUniqueFactoryId(baseId, object) {
  const base = slugifyFactoryId(baseId, 'object');
  if (!state.objectById.has(base) || state.objectById.get(base) === object) return base;

  const next = (state.objectIdSeeds.get(base) || 1) + 1;
  state.objectIdSeeds.set(base, next);
  const candidate = `${base}-${String(next).padStart(2, '0')}`;
  if (!state.objectById.has(candidate) || state.objectById.get(candidate) === object) return candidate;
  return ensureUniqueFactoryId(candidate, object);
}

function getLifecycleStage(index) {
  return lifecycleStages[index % lifecycleStages.length];
}

function applyAssetStage(parcel) {
  const stage = getLifecycleStage(parcel.userData.lifecycleIndex || 0);
  const riskActive = Boolean(parcel.userData.risk) && stage.key === 'qa';
  parcel.material = riskActive ? mat.assetRisk : (mat[stage.material] || mat.assetKnowledge);
  parcel.material.wireframe = state.wireframeMode;
  parcel.userData.lifecycleKey = riskActive ? 'blocked' : stage.key;
  parcel.userData.lifecycleLabel = riskActive ? '需要人工确认' : stage.label;
  parcel.userData.stage = riskActive ? parcel.userData.risk : stage.detail;
  parcel.userData.assignedAgent = riskActive ? 'QA Agent' : stage.agent;
  parcel.userData.stageColor = riskActive ? '#ff5c5c' : stage.color;
}

function createKnowledgeAssetRecord(asset, segment, lifecycleIndex) {
  const stage = getLifecycleStage(lifecycleIndex);
  const id = `KF-${String(state.knowledgeAssets.length + 1).padStart(3, '0')}`;
  return {
    id,
    type: 'knowledge-asset',
    source: asset.source,
    sourceCode: asset.label,
    title: asset.title,
    value: asset.value,
    target: asset.target,
    confidence: 78 + Math.floor(random() * 19),
    reusableScore: asset.reusable + Math.floor((random() - 0.5) * 10),
    risk: asset.risk || '',
    rawInput: asset.rawInput || '',
    userCreated: Boolean(asset.userCreated),
    lifecycleIndex,
    lifecycleKey: stage.key,
    lifecycleLabel: stage.label,
    stage: stage.detail,
    stageColor: stage.color,
    assignedAgent: stage.agent,
    segment,
    transitionTimer: random() * 5,
    transitionEvery: 4.5 + random() * 4,
    createdAt: Date.now() - random() * 7200000,
    lastHandledAt: Date.now() - random() * 420000,
  };
}

function createKnowledgeAssetParcel(asset, track, options = {}) {
  const segment = options.segment ?? 0;
  const lifecycleIndex = options.lifecycleIndex ?? 0;
  const assetRecord = createKnowledgeAssetRecord(asset, segment, lifecycleIndex);
  const initialProgress = options.progress ?? ((segment * track.segLen + random() * track.segLen * 0.75) % track.trackLength);
  const lateralOffset = options.lateralOffset ?? ((random() - 0.5) * 0.3);
  const { lateralX, lateralZ } = getConveyorLateral(track.dirX, track.dirZ);
  const parcelX = track.trackStartX + track.dirX * initialProgress + lateralX * lateralOffset;
  const parcelZ = track.trackStartZ + track.dirZ * initialProgress + lateralZ * lateralOffset;
  const parcel = createBox(0.5, 0.4, 0.45, mat.assetKnowledge, {
    position: [parcelX, track.frameY, parcelZ],
    name: 'Knowledge Asset'
  });
  const assetLabel = createLabel(asset.label, [0, 0.4, 0], '#e7fbff', '8px', 'l7');
  assetLabel.element.classList.add('asset-floating-label');
  parcel.add(assetLabel);
  parcel.userData = {
    ...assetRecord,
    dirX: track.dirX,
    dirZ: track.dirZ,
    lateralX,
    lateralZ,
    trackStartX: track.trackStartX,
    trackStartZ: track.trackStartZ,
    trackLength: track.trackLength,
    progress: initialProgress,
    lateralOffset,
    speed: options.speed ?? (0.9 + random() * 0.45),
    movingAsset: true,
    trackName: track.name,
  };
  applyAssetStage(parcel);
  registerFactoryObject(parcel, {
    id: assetRecord.id,
    name: `${assetRecord.sourceCode} · ${assetRecord.title}`,
    module: '流水线系统',
    type: 'knowledge-asset',
    level: 'L2 组合对象',
    sourceFunction: 'createKnowledgeAssetParcel()',
    businessMeaning: `流动知识物料：${assetRecord.source} 正在被加工为 ${assetRecord.target}。`,
    status: assetRecord.lifecycleLabel,
    trackingMode: 'semantic',
    interactive: true,
  });
  scene.add(parcel);
  state.knowledgeAssets.unshift(parcel);
  state.conveyorSurfaces.push(parcel);
  return parcel;
}

// ─────────────────────────────────────
// FLOOR & KNOWLEDGE FACTORY ZONES
// ─────────────────────────────────────
function buildFloor() {
  // Main floor
  const floor = createBox(50, 0.2, 50, mat.floor, {
    position: [0, -0.1, 0],
    castShadow: false,
    receiveShadow: true,
    registry: {
      id: 'building.floor.main',
      name: '工厂主地板',
      module: '建筑结构系统',
      type: 'floor',
      level: 'L2 组合对象',
      sourceFunction: 'buildFloor()',
      businessMeaning: '承载知识工厂所有区域、流水线和 Agent 动线的主空间基座。',
      status: '运行中',
      trackingMode: 'semantic',
    },
  });
  scene.add(floor);

  // Grid lines on floor
  for (let x = -24; x <= 24; x += 2) {
    const line = createBox(0.04, 0.02, 50, mat.floorLine, {
      position: [x, 0.01, 0],
      castShadow: false
    });
    scene.add(line);
  }
  for (let z = -24; z <= 24; z += 2) {
    const line = createBox(50, 0.02, 0.04, mat.floorLine, {
      position: [0, 0.01, z],
      castShadow: false
    });
    scene.add(line);
  }

  // Zone colored floor sections: visible capability-production pipeline
  const zones = [
    { x: -19, z: -18, w: 9, d: 7, color: 0x24506f, name: '原料入口 · INPUT' },
    { x: -8, z: -18, w: 8, d: 7, color: 0x6b5126, name: 'AI质检闸口 · FILTER' },
    { x: 4, z: -18, w: 10, d: 7, color: 0x5a3e84, name: '知识炼制区 · REFINE' },
    { x: -19, z: -3, w: 11, d: 20, color: 0x223344, name: '五类资产仓 · ASSETIZE' },
    { x: 3, z: -3, w: 9, d: 9, color: 0x1f5a66, name: '长期记忆冷链 · MEMORY' },
    { x: 16, z: -4, w: 8, d: 10, color: 0x713b31, name: '行动输出区 · PUSH/ACT' },
    { x: 10, z: 12, w: 18, d: 10, color: 0x244e3f, name: '回路中心 · EVOLVE' },
  ];

  zones.forEach(z => {
    const zoneFloor = createBox(z.w, 0.15, z.d, mat.floorGrid, {
      position: [z.x, -0.07, z.z],
      castShadow: false,
      receiveShadow: true,
      registry: {
        id: `zone.${slugifyFactoryId(z.name)}`,
        name: z.name,
        module: '建筑结构系统',
        type: 'factory-zone',
        level: 'L1 业务组件',
        sourceFunction: 'buildFloor()',
        businessMeaning: `知识工厂业务分区：${z.name}。`,
        status: '运行中',
        trackingMode: 'semantic',
      },
    });
    scene.add(zoneFloor);

    // Zone border strips
    const borderGeo = new THREE.BoxGeometry(z.w + 0.15, 0.06, 0.12);
    const borderMat = new THREE.MeshStandardMaterial({
      color: z.color,
      roughness: 0.3,
      metalness: 0.6,
      emissive: z.color,
      emissiveIntensity: 0.5
    });
    const topBorder = new THREE.Mesh(borderGeo, borderMat);
    topBorder.position.set(z.x, 0.05, z.z - z.d / 2);
    scene.add(topBorder);

    const botBorder = new THREE.Mesh(borderGeo.clone(), borderMat);
    botBorder.position.set(z.x, 0.05, z.z + z.d / 2);
    scene.add(botBorder);

    const zoneLabel = createLabel(z.name, [z.x, 0.25, z.z], '#dbeafe', '10px', 'l2');
    scene.add(zoneLabel);
  });

  // Path lines for AI Agent workers
  const pathMaterial = new THREE.MeshStandardMaterial({
    color: 0x334455,
    roughness: 0.4,
    metalness: 0.6,
    emissive: 0x334455,
    emissiveIntensity: 0.3
  });

  // Main paths: a coherent factory route that matches the physical conveyors.
  const paths = [
    { x: -7, z: -18, w: 30, d: 0.35 },
    { x: 8, z: -12, w: 0.35, d: 12 },
    { x: -2, z: -6, w: 40, d: 0.35 },
    { x: -18.5, z: 0, w: 0.35, d: 24 },
    { x: 18, z: 3, w: 0.35, d: 18 },
    { x: 13, z: 12, w: 10, d: 0.35 },
  ];

  paths.forEach(p => {
    const pathLine = createBox(p.w, 0.04, p.d, pathMaterial, {
      position: [p.x, 0.03, p.z],
      castShadow: false,
      registry: {
        id: `agent-path.${String(paths.indexOf(p) + 1).padStart(2, '0')}`,
        name: `Agent 动线 ${paths.indexOf(p) + 1}`,
        module: '建筑结构系统',
        type: 'agent-path',
        level: 'L3 子物件',
        sourceFunction: 'buildFloor()',
        businessMeaning: 'Agent 工人在工厂内执行任务时的主移动路径。',
        status: '运行中',
        trackingMode: 'semantic',
      },
    });
    scene.add(pathLine);
  });

  // Route dots only on the actual production line, avoiding a noisy floor grid.
  const routeDots = [
    [-20, -18], [-16, -18], [-12, -18], [-8, -18], [-4, -18], [0, -18], [4, -18], [8, -18],
    [8, -14], [8, -10], [8, -6],
    [-18.5, -12], [-18.5, -8], [-18.5, -4], [-18.5, 0], [-18.5, 4], [-18.5, 8], [-18.5, 12],
    [-18, -6], [-14, -6], [-10, -6], [-6, -6], [-2, -6], [2, -6], [6, -6], [10, -6], [14, -6], [18, -6],
    [18, -2], [18, 2], [18, 6], [18, 10], [18, 12], [14, 12], [10, 12],
  ];
  routeDots.forEach(([x, z]) => {
    const dot = createCylinder(0.07, 0.07, 0.012, 8, pathMaterial, {
      position: [x, 0.06, z],
      castShadow: false,
    });
    dot.rotation.x = -Math.PI / 2;
    scene.add(dot);
  });
}

// ─────────────────────────────────────
// KNOWLEDGE ASSET RACKS (知识资产货架)
// ─────────────────────────────────────
function buildRack(x, z, bays, levels, assetKey = 'knowledge', categoryOverride = null) {
  const group = new THREE.Group();
  const bayW = 2.6;
  const levelH = 2.0;
  const rackW = bays * bayW;
  const rackH = levels * levelH;
  const rackD = 1.2;
  const store = assetStores.find(s => s.key === assetKey) || assetStores[0];
  const assetMaterials = {
    knowledge: mat.assetKnowledge,
    skill: mat.assetSkill,
    experience: mat.assetExperience,
    task: mat.assetTask,
    kit: mat.assetKit,
  };
  const assetMaterial = assetMaterials[assetKey] || mat.boxBlue;

  // Vertical posts
  for (let b = 0; b <= bays; b++) {
    const postFront = createBox(0.12, rackH, 0.12, mat.rackFrame, {
      position: [b * bayW - rackW / 2, rackH / 2, rackD / 2],
    });
    group.add(postFront);

    const postBack = createBox(0.12, rackH, 0.12, mat.rackFrame, {
      position: [b * bayW - rackW / 2, rackH / 2, -rackD / 2],
    });
    group.add(postBack);

    // Diagonal bracing between posts
    if (b < bays) {
      const braceTop = createBox(bayW + 0.1, 0.06, 0.06, mat.rackBeam, {
        position: [b * bayW - rackW / 2 + bayW / 2, rackH - 0.6, 0],
      });
      group.add(braceTop);

      const braceBot = createBox(bayW + 0.1, 0.06, 0.06, mat.rackBeam, {
        position: [b * bayW - rackW / 2 + bayW / 2, 0.6, 0],
      });
      group.add(braceBot);
    }
  }

  // Horizontal beams and shelves
  for (let l = 0; l < levels; l++) {
    const y = l * levelH + levelH / 2;

    // Shelves
    for (let b = 0; b < bays; b++) {
      const shelfX = b * bayW - rackW / 2 + bayW / 2;

      const shelfFront = createBox(bayW - 0.2, 0.06, 0.12, mat.rackShelf, {
        position: [shelfX, y, rackD / 2 - 0.06],
      });
      group.add(shelfFront);

      const shelfBack = createBox(bayW - 0.2, 0.06, 0.12, mat.rackShelf, {
        position: [shelfX, y, -rackD / 2 + 0.06],
      });
      group.add(shelfBack);

      // Cross beams
      for (let d of [-1, 1]) {
        const beam = createBox(0.06, 0.08, rackD - 0.2, mat.rackBeam, {
          position: [shelfX + (bayW / 2 - 0.3) * d, y, 0],
        });
        group.add(beam);
      }

      // Place boxes/pallets on shelves
      if (l % 2 === 0) {
        // Pallet + boxes
        const pallet = createBox(1.0, 0.1, 0.9, mat.pallet, {
          position: [shelfX + 0.1, y + 0.11, 0],
        });
        group.add(pallet);

        const box1 = createBox(0.4, 0.4, 0.4, assetMaterial, {
          position: [shelfX + 0.1, y + 0.36, 0.15],
        });
        group.add(box1);

        const box2 = createBox(0.35, 0.3, 0.35, mat.boxWhite, {
          position: [shelfX + 0.1, y + 0.36, -0.35],
        });
        group.add(box2);

        const box3 = createBox(0.3, 0.35, 0.3, mat.boxWhite, {
          position: [shelfX - 0.25, y + 0.28, 0.1],
        });
        group.add(box3);
      } else if (l % 2 === 1) {
        // Single larger item
        const pallet2 = createBox(1.1, 0.1, 0.9, mat.pallet, {
          position: [shelfX, y + 0.11, 0],
        });
        group.add(pallet2);

        const bigBox = createBox(0.8, 0.55, 0.7, assetMaterial, {
          position: [shelfX, y + 0.43, 0],
        });
        group.add(bigBox);
      }
    }
  }

  const displayLabel = categoryOverride || store.label;
  group.position.set(x, 0, z);
  group.name = `${displayLabel} ${x},${z}`;
  const category = categoryOverride || store.category;
  group.userData = { type: 'rack', bays, levels, category, assetKey, assetLabel: displayLabel, storeLabel: store.label };
  registerFactoryObject(group, {
    id: `asset-store.${assetKey}`,
    name: displayLabel,
    module: '资产库系统',
    type: 'rack',
    level: 'L1 业务组件',
    sourceFunction: 'buildRack()',
    businessMeaning: `${displayLabel}：按 ${category} 分类存放加工完成、可复用的知识资产。`,
    status: '运行中',
    trackingMode: 'semantic',
    interactive: true,
  });
  scene.add(group);

  const rackLabel = createLabel(
    displayLabel,
    [x, rackH + 0.65, z],
    `#${store.color.toString(16).padStart(6, '0')}`,
    categoryOverride ? '8px' : '10px',
    'l4'
  );
  scene.add(rackLabel);

  return group;
}

function buildAllRacks() {
  // Five asset stores: what the factory actually produces.
  const rackX = -22.1;
  const rackPositions = [
    { key: 'knowledge', z: -12 },
    { key: 'skill', z: -6 },
    { key: 'experience', z: 0 },
    { key: 'task', z: 6 },
    { key: 'kit', z: 12 },
  ];
  rackPositions.forEach(r => buildRack(rackX, r.z, 2, 3, r.key));
}

function buildMemoryVault(x, z, id, profile) {
  const group = new THREE.Group();
  const glowColor = profile.color;
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x253747,
    roughness: 0.38,
    metalness: 0.65,
    emissive: 0x102236,
    emissiveIntensity: 0.45,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: glowColor,
    roughness: 0.12,
    metalness: 0.08,
    transparent: true,
    opacity: 0.36,
    emissive: glowColor,
    emissiveIntensity: 0.8,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: glowColor,
    roughness: 0.22,
    metalness: 0.18,
    emissive: glowColor,
    emissiveIntensity: 1.9,
  });

  const base = createBox(1.8, 0.18, 1.1, baseMat, { position: [0, 0.12, 0] });
  group.add(base);

  const capsule = createCylinder(0.36, 0.36, 1.45, 32, glassMat, {
    position: [0, 0.86, 0],
  });
  alignCylinderToHorizontalAxis(capsule, 1, 0);
  group.add(capsule);

  const core = createCylinder(0.13, 0.13, 1.25, 24, coreMat, {
    position: [0, 0.86, 0],
  });
  alignCylinderToHorizontalAxis(core, 1, 0);
  core.userData = { type: 'signal', phase: random() * Math.PI * 2 };
  state.signalLights.push(core);
  group.add(core);

  for (let sx of [-0.84, 0.84]) {
    const cap = createBox(0.12, 0.82, 0.82, baseMat, { position: [sx, 0.86, 0] });
    group.add(cap);
  }

  const terminal = createBox(0.82, 0.46, 0.08, new THREE.MeshStandardMaterial({
    color: 0x0b1724,
    roughness: 0.28,
    metalness: 0.35,
    emissive: glowColor,
    emissiveIntensity: 0.55,
  }), { position: [0, 0.58, 0.62] });
  group.add(terminal);

  const statusLight = createCylinder(0.06, 0.06, 0.04, 16, coreMat, {
    position: [0.52, 1.38, 0.36],
  });
  statusLight.userData = { type: 'signal', phase: random() * Math.PI * 2 };
  state.signalLights.push(statusLight);
  group.add(statusLight);

  group.position.set(x, 0, z);
  group.name = id;
  group.userData = {
    type: 'memory-vault',
    id,
    title: profile.title,
    mode: profile.mode,
    contents: profile.contents,
    reviewCycle: profile.reviewCycle,
    confidence: profile.confidence,
  };
  registerFactoryObject(group, {
    id,
    name: profile.title,
    module: '长期记忆系统',
    type: 'memory-vault',
    level: 'L1 业务组件',
    sourceFunction: 'buildMemoryVault()',
    businessMeaning: `${profile.title}：${profile.contents}，按 ${profile.reviewCycle} 周期复核。`,
    status: '运行中',
    trackingMode: 'semantic',
    interactive: true,
  });
  scene.add(group);

  const label = createLabel(profile.title, [x, 1.75, z], '#c7f9ff', '8px', 'l5');
  scene.add(label);
  return group;
}

function buildColdMemoryVaults() {
  const vaults = [
    {
      id: 'MEM-COLD-01',
      x: 1.05,
      z: -3.8,
      color: 0x3cc8ff,
      title: '战略判断封存舱',
      mode: '长期记忆冻结 / 周期复核',
      contents: '高价值判断、研究结论、关键假设',
      reviewCycle: '30 天',
      confidence: 91,
    },
    {
      id: 'MEM-COLD-02',
      x: 3.15,
      z: -3.8,
      color: 0xa08cff,
      title: '核心方案冷藏舱',
      mode: '方案版本冻结 / 冲突保护',
      contents: '技术方案、架构取舍、关键约束',
      reviewCycle: '14 天',
      confidence: 88,
    },
    {
      id: 'MEM-COLD-03',
      x: 5.25,
      z: -3.8,
      color: 0x3ee898,
      title: '长期经验复核舱',
      mode: '经验沉淀 / 适用条件复验',
      contents: '复盘、踩坑、最佳实践、反例',
      reviewCycle: '21 天',
      confidence: 86,
    },
  ];
  vaults.forEach(vault => buildMemoryVault(vault.x, vault.z, vault.id, vault));
}

// ─────────────────────────────────────
// KNOWLEDGE PIPELINE CONVEYORS (知识流水线)
// ─────────────────────────────────────
function buildConveyor(startX, startZ, segments, dirX, dirZ, options = {}) {
  const group = new THREE.Group();
  const segLen = 2.5;
  const beltW = 1.2;
  const frameH = 0.6;
  const beltRun = segLen + 0.04;
  const beltCross = beltW - 0.2;
  const isXAxis = Math.abs(dirX) > 0;
  const { lateralX, lateralZ } = getConveyorLateral(dirX, dirZ);
  const conveyorName = options.name || 'knowledge-line';
  group.name = conveyorName;
  group.userData = {
    type: 'conveyor',
    id: conveyorName,
    dirX,
    dirZ,
    segments,
  };
  registerFactoryObject(group, {
    id: `conveyor.${conveyorName}`,
    name: `知识流水线 · ${conveyorName}`,
    module: '流水线系统',
    type: 'conveyor',
    level: 'L2 组合对象',
    sourceFunction: 'buildConveyor()',
    businessMeaning: `承载知识资产在 ${conveyorName} 段流动的生产线组合对象。`,
    status: '运行中',
    trackingMode: 'semantic',
    interactive: true,
  });

  for (let s = 0; s < segments; s++) {
    const cx = startX + dirX * s * segLen;
    const cz = startZ + dirZ * s * segLen;

    // Frame sides
    for (let side of [-1, 1]) {
      const siderail = createBox(
        isXAxis ? segLen : 0.06,
        0.08,
        isXAxis ? 0.06 : segLen,
        mat.conveyorFrame,
        {
          position: [cx + lateralX * side * beltW / 2, frameH, cz + lateralZ * side * beltW / 2],
        }
      );
      group.add(siderail);
    }

    // Rollers
    for (let r = 0; r < 6; r++) {
      const offset = -segLen / 2 + r * (segLen / 5);
      const roller = createCylinder(0.06, 0.06, beltW - 0.2, 8, mat.roller, {
        position: [cx + dirX * offset, frameH - 0.04, cz + dirZ * offset],
      });
      alignCylinderToHorizontalAxis(roller, lateralX, lateralZ);
      roller.userData = { type: 'roller', segment: s, conveyorGroup: group };
      registerFactoryObject(roller, {
        id: `conveyor.${conveyorName}.roller.${String(s + 1).padStart(2, '0')}.${r + 1}`,
        name: `${conveyorName} 滚筒 S${s + 1}-${r + 1}`,
        module: '流水线系统',
        type: 'roller',
        level: 'L3 子物件',
        sourceFunction: 'buildConveyor()',
        businessMeaning: '驱动或表现知识物料在产线上的持续流动。',
        status: '运行中',
        trackingMode: 'semantic',
      });
      group.add(roller);
      state.conveyorRollers.push(roller);
    }

    // Belt surface
    const belt = createBox(
      isXAxis ? beltRun : beltCross,
      0.04,
      isXAxis ? beltCross : beltRun,
      mat.conveyorBelt,
      {
        position: [cx, frameH + 0.06, cz],
      }
    );
    belt.userData = { type: 'belt', segment: s, dirX, dirZ, beltW, segLen };
    registerFactoryObject(belt, {
      id: `conveyor.${conveyorName}.belt.${String(s + 1).padStart(2, '0')}`,
      name: `${conveyorName} 皮带段 ${s + 1}`,
      module: '流水线系统',
      type: 'conveyor-belt',
      level: 'L3 子物件',
      sourceFunction: 'buildConveyor()',
      businessMeaning: '知识物料经过的可视化传送带表面。',
      status: '运行中',
      trackingMode: 'semantic',
    });
    group.add(belt);
    state.conveyorSurfaces.push(belt);
  }

  scene.add(group);

  // Support legs every 2 segments
  for (let s = 0; s < segments; s += 2) {
    const lx = startX + dirX * s * segLen;
    const lz = startZ + dirZ * s * segLen;
    for (let side of [-1, 1]) {
      const leg = createBox(0.08, frameH, 0.08, mat.conveyorFrame, {
        position: [lx + lateralX * side * beltW / 2, frameH / 2, lz + lateralZ * side * beltW / 2],
        registry: {
          id: `conveyor.${conveyorName}.support.${String(s + 1).padStart(2, '0')}.${side > 0 ? 'right' : 'left'}`,
          name: `${conveyorName} 支撑腿 ${s + 1}`,
          module: '流水线系统',
          type: 'conveyor-support',
          level: 'L3 子物件',
          sourceFunction: 'buildConveyor()',
          businessMeaning: '支撑流水线结构稳定的实体结构。',
          status: '运行中',
          trackingMode: 'semantic',
        },
      });
      group.add(leg);
    }
  }

  // Knowledge assets on conveyor
  const trackStartX = startX - dirX * segLen * 0.5;
  const trackStartZ = startZ - dirZ * segLen * 0.5;
  const trackLength = segments * segLen;
  const track = {
    startX,
    startZ,
    segments,
    dirX,
    dirZ,
    segLen,
    frameY: frameH + 0.3,
    trackStartX,
    trackStartZ,
    trackLength,
    name: conveyorName,
  };
  state.conveyorTracks.push(track);
  const shouldSpawnAssets = options.spawnAssets !== false;
  const assetEvery = options.assetEvery || 2;
  if (shouldSpawnAssets) {
    for (let s = 0; s < segments; s++) {
      if (s % assetEvery !== 0) continue;
      const asset = assetBlueprints[(s + state.knowledgeAssets.length) % assetBlueprints.length];
      const lifecycleIndex = (s + state.knowledgeAssets.length) % lifecycleStages.length;
      createKnowledgeAssetParcel(asset, track, {
        segment: s,
        lifecycleIndex,
      });
    }
  }

  return group;
}

function buildPipelineJunction(x, z, label, color = 0x38bdf8) {
  const padMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.28,
    metalness: 0.45,
    emissive: color,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.82,
  });
  const pad = createCylinder(0.72, 0.72, 0.08, 32, padMat, {
    position: [x, 0.72, z],
    castShadow: false,
  });
  pad.userData = { type: 'pipeline-junction', label };
  registerFactoryObject(pad, {
    id: `pipeline-junction.${slugifyFactoryId(label)}`,
    name: label,
    module: '流水线系统',
    type: 'pipeline-junction',
    level: 'L2 组合对象',
    sourceFunction: 'buildPipelineJunction()',
    businessMeaning: `${label}：知识资产在流水线上的关键路由/状态切换节点。`,
    status: '运行中',
    trackingMode: 'semantic',
    interactive: true,
  });
  scene.add(pad);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.025, 8, 48),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.2,
      metalness: 0.35,
      emissive: color,
      emissiveIntensity: 1.1,
      transparent: true,
      opacity: 0.9,
    })
  );
  ring.position.set(x, 0.79, z);
  ring.rotation.x = Math.PI / 2;
  registerFactoryObject(ring, {
    id: `pipeline-junction.${slugifyFactoryId(label)}.ring`,
    name: `${label} 状态环`,
    module: '流水线系统',
    type: 'junction-ring',
    level: 'L3 子物件',
    sourceFunction: 'buildPipelineJunction()',
    businessMeaning: '强调流水线节点状态的视觉环。',
    status: '运行中',
    trackingMode: 'semantic',
  });
  scene.add(ring);

  const nodeLabel = createLabel(label, [x, 1.35, z], '#e7fbff', '8px', 'l5');
  scene.add(nodeLabel);
}

function buildFlowMarker(x, z, dirX, dirZ, color = 0xffcc44) {
  const markerMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.25,
    metalness: 0.4,
    emissive: color,
    emissiveIntensity: 0.75,
  });
  const marker = new THREE.Group();
  const markerId = `flow-marker.${String(state.objectById.size + 1).padStart(3, '0')}`;
  const body = createBox(0.62, 0.035, 0.12, markerMat, {
    position: [-0.08, 0, 0],
    castShadow: false,
  });
  marker.add(body);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.36, 3), markerMat);
  head.position.set(0.34, 0, 0);
  head.rotation.z = -Math.PI / 2;
  marker.add(head);
  marker.position.set(x, 0.82, z);
  marker.rotation.y = Math.atan2(-dirZ, dirX);
  registerFactoryObject(marker, {
    id: markerId,
    name: '流水线方向标记',
    module: '流水线系统',
    type: 'flow-marker',
    level: 'L3 子物件',
    sourceFunction: 'buildFlowMarker()',
    businessMeaning: '指示知识物料在产线中的流动方向。',
    status: '运行中',
    trackingMode: 'semantic',
  });
  scene.add(marker);
}

function buildAllConveyors() {
  // 1. Main line: input -> intake -> quality -> refinement.
  buildConveyor(-20.75, -18, 12, 1, 0, {
    name: 'input-quality-refine',
    assetEvery: 3,
  });

  // 2. Router drop: refined knowledge enters the asset/output cross-dock.
  buildConveyor(8, -16.75, 5, 0, 1, {
    name: 'refine-router',
    assetEvery: 3,
  });

  // 3. Cross-dock spine: asset store handoff -> output dock.
  buildConveyor(-20.75, -6, 16, 1, 0, {
    name: 'asset-output-spine',
    assetEvery: 4,
  });

  // 4. Five-asset-store feeder: clear vertical branch in front of racks.
  buildConveyor(-18.5, -11, 10, 0, 1, {
    name: 'five-asset-store-feeder',
    assetEvery: 3,
  });

  // 5. Feedback loop: output results become evidence for the evolution core.
  buildConveyor(18, -4.75, 7, 0, 1, {
    name: 'feedback-rise',
    assetEvery: 3,
  });
  buildConveyor(16.75, 12, 4, -1, 0, {
    name: 'evolve-return',
    assetEvery: 4,
  });

  [
    { x: -8, z: -18, label: '质检卡口', color: 0xf59e0b },
    { x: 4, z: -18, label: '炼制入口', color: 0x8b5cf6 },
    { x: 8, z: -18, label: '路由分拨', color: 0x22d3ee },
    { x: 8, z: -6, label: '资产/输出分流', color: 0x38bdf8 },
    { x: -18.5, z: -6, label: '五类资产入仓', color: 0x3b82f6 },
    { x: 18, z: -6, label: '输出闸口', color: 0xf97316 },
    { x: 18, z: 12, label: '反馈回收', color: 0x22c55e },
    { x: 8, z: 12, label: '策略回灌', color: 0x22c55e },
  ].forEach(node => buildPipelineJunction(node.x, node.z, node.label, node.color));

  [
    { x: -17, z: -18, dx: 1, dz: 0 },
    { x: -5, z: -18, dx: 1, dz: 0 },
    { x: 5, z: -18, dx: 1, dz: 0 },
    { x: 8, z: -13, dx: 0, dz: 1 },
    { x: -15, z: -6, dx: 1, dz: 0 },
    { x: -4, z: -6, dx: 1, dz: 0 },
    { x: 8, z: -6, dx: 1, dz: 0 },
    { x: 15, z: -6, dx: 1, dz: 0 },
    { x: -18.5, z: -9, dx: 0, dz: 1 },
    { x: -18.5, z: 3, dx: 0, dz: 1 },
    { x: 18, z: 0, dx: 0, dz: 1 },
    { x: 18, z: 8, dx: 0, dz: 1 },
    { x: 13, z: 12, dx: -1, dz: 0 },
  ].forEach(marker => buildFlowMarker(marker.x, marker.z, marker.dx, marker.dz));
}

// ─────────────────────────────────────
// AGV / AMR AI AGENT WORKERS
// ─────────────────────────────────────
function getAgentProfile(id, family) {
  const profiles = {
    'AGV-01': { role: 'Ingest Worker', task: '意图/文档/链接统一入队', domain: '丢 → 收' },
    'AGV-02': { role: 'Parse Worker', task: 'PDF/网页/代码解析为结构化文本', domain: '收' },
    'AGV-03': { role: 'Filter Agent', task: '去重 / 来源 / 可信度预检', domain: '收 → 炼' },
    'AGV-04': { role: 'Extractor Agent', task: '概念 / 实体 / 方法抽取', domain: '炼' },
    'AGV-05': { role: 'Graph Builder', task: '关系边 / 冲突边 / 前置依赖建立', domain: '炼' },
    'AGV-06': { role: 'Asset Router', task: '路由到五类资产仓', domain: '沉' },
    'AGV-07': { role: 'Briefing Engine', task: '晨间简报与行动卡生成', domain: '推 → 做' },
    'AGV-08': { role: 'Kit Builder', task: '模板 / Prompt / 代码片段沉淀', domain: '沉' },
    'AMR-01': { role: 'Recall Matcher', task: '当前上下文经验召回', domain: '推' },
    'AMR-02': { role: 'Quality Sentinel', task: '冲突 / 过期 / 缺来源巡检', domain: '质检' },
    'AMR-03': { role: 'Memory Curator', task: '高价值长期资产周期复核', domain: '长期记忆' },
    'AMR-04': { role: 'Feedback Collector', task: '点击 / 忽略 / 修改 / 完成信号采集', domain: '进' },
    'AMR-05': { role: 'Model Tuner', task: '资产权重与能力指数更新', domain: '进' },
  };
  return profiles[id] || {
    role: family === 'agv' ? 'Asset Worker' : 'Patrol Worker',
    task: family === 'agv' ? '能力资产整理' : '知识资产巡检',
    domain: '能力生产',
  };
}

function buildAGV(x, z, color, id) {
  const group = new THREE.Group();
  const profile = getAgentProfile(id, 'agv');

  // Chassis
  const chassis = createBox(1.8, 0.2, 1.0, color, {
    position: [0, 0.15, 0],
  });
  group.add(chassis);

  // Top deck with lip
  const deck = createBox(1.5, 0.06, 0.85, new THREE.MeshStandardMaterial({
    ...color, color: 0x333333, roughness: 0.5, metalness: 0.6
  }), { position: [0, 0.28, 0] });
  group.add(deck);

  // Wheels
  for (let wx of [-0.6, 0.6]) {
    for (let wz of [-0.4, 0.4]) {
      const wheel = createCylinder(0.14, 0.14, 0.1, 16,
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.9 }),
        { position: [wx, 0.07, wz] });
      wheel.rotation.z = Math.PI / 2;
      group.add(wheel);
    }
  }

  // Sensor bar
  const sensorBar = createBox(1.6, 0.04, 0.08,
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.2, metalness: 0.7, emissive: 0x111111, emissiveIntensity: 0.5 }),
    { position: [0.2, 0.24, 0.45] });
  group.add(sensorBar);

  // Colored side stripe
  const stripe = createBox(1.5, 0.03, 0.04,
    new THREE.MeshStandardMaterial({ color: color.color, roughness: 0.2, metalness: 0.1, emissive: color.color, emissiveIntensity: 0.8 }),
    { position: [0, 0.18, 0.44] });
  group.add(stripe);

  // Top signal light
  const lightBase = createCylinder(0.05, 0.06, 0.15, 8,
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.8 }),
    { position: [0.3, 0.4, 0] });
  group.add(lightBase);

  const lightBulb = createCylinder(0.08, 0.06, 0.2, 16, mat.signalGreen, {
    position: [0.3, 0.55, 0],
  });
  lightBulb.userData = { type: 'signal', phase: random() * Math.PI * 2 };
  group.add(lightBulb);
  state.signalLights.push(lightBulb);

  // Cargo on top
  const cargo = createBox(0.6, 0.3, 0.55, mat.boxBrown, {
    position: [0, 0.45, 0],
  });
  group.add(cargo);

  group.position.set(x, 0, z);
  group.name = id;
  group.userData = {
    type: 'agv',
    id: id,
    speed: 0.5 + random() * 0.8,
    pathOffset: random() * Math.PI * 2,
    color: color.color,
    status: 'running',
    role: profile.role,
    task: profile.task,
    domain: profile.domain,
  };
  registerFactoryObject(group, {
    id,
    name: `${id} · ${profile.role}`,
    module: 'Agent 系统',
    type: 'agv',
    level: 'L1 业务组件',
    sourceFunction: 'buildAGV()',
    businessMeaning: `${profile.role}：${profile.task}，负责 ${profile.domain} 阶段。`,
    status: '运行中',
    trackingMode: 'semantic',
    interactive: true,
  });
  state.agvBots.push(group);
  scene.add(group);

  return group;
}

function buildAMR(x, z, color, id) {
  const group = new THREE.Group();
  const profile = getAgentProfile(id, 'amr');

  // Rounder chassis
  const chassisGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.22, 24);
  const chassis = new THREE.Mesh(chassisGeo, color);
  chassis.position.y = 0.15;
  group.add(chassis);

  // Top ring
  const ringGeo = new THREE.TorusGeometry(0.5, 0.04, 8, 24);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({
    color: color.color, roughness: 0.3, metalness: 0.7, emissive: color.color, emissiveIntensity: 0.4
  }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.28;
  group.add(ring);

  // Center dome
  const domeGeo = new THREE.SphereGeometry(0.25, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, new THREE.MeshStandardMaterial({
    color: 0x222222, roughness: 0.2, metalness: 0.5
  }));
  dome.position.y = 0.24;
  group.add(dome);

  // Sensor ring
  const sensorGeo = new THREE.TorusGeometry(0.42, 0.02, 8, 32);
  const sensor = new THREE.Mesh(sensorGeo, new THREE.MeshStandardMaterial({
    color: 0x000000, roughness: 0.1, metalness: 0.8, emissive: 0x003333, emissiveIntensity: 1.0
  }));
  sensor.rotation.x = Math.PI / 2;
  sensor.position.y = 0.32;
  group.add(sensor);

  // Omni wheels
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const wx = Math.cos(angle) * 0.52;
    const wz = Math.sin(angle) * 0.52;
    const wheel = createCylinder(0.08, 0.08, 0.04, 12,
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.9 }),
      { position: [wx, 0.06, wz] });
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
  }

  // Signal light on dome
  const lightBulb = createCylinder(0.04, 0.05, 0.12, 8, mat.signalOrange, {
    position: [0, 0.44, 0],
  });
  lightBulb.userData = { type: 'signal', phase: random() * Math.PI * 2 };
  group.add(lightBulb);
  state.signalLights.push(lightBulb);

  group.position.set(x, 0, z);
  group.name = id;
  group.userData = {
    type: 'amr',
    id: id,
    speed: 0.3 + random() * 0.6,
    pathOffset: random() * Math.PI * 2,
    color: color.color,
    status: 'running',
    role: profile.role,
    task: profile.task,
    domain: profile.domain,
  };
  registerFactoryObject(group, {
    id,
    name: `${id} · ${profile.role}`,
    module: 'Agent 系统',
    type: 'amr',
    level: 'L1 业务组件',
    sourceFunction: 'buildAMR()',
    businessMeaning: `${profile.role}：${profile.task}，负责 ${profile.domain} 阶段。`,
    status: '运行中',
    trackingMode: 'semantic',
    interactive: true,
  });
  state.amrBots.push(group);
  scene.add(group);

  return group;
}

function buildAllRobots() {
  // AGVs — AI Agent workers for structured knowledge movement
  const agvConfigs = [
    { x: -20, z: -18, color: mat.agvBody, id: 'AGV-01' },
    { x: -14, z: -18, color: mat.agvBody, id: 'AGV-02' },
    { x: -8, z: -18, color: mat.agvBody, id: 'AGV-03' },
    { x: 1, z: -18, color: mat.agvBody2, id: 'AGV-04' },
    { x: 7, z: -17, color: mat.agvBody2, id: 'AGV-05' },
    { x: -13, z: -3, color: mat.agvBody, id: 'AGV-06' },
    { x: 15, z: -4, color: mat.agvBody2, id: 'AGV-07' },
    { x: -16, z: 12, color: mat.agvBody, id: 'AGV-08' },
  ];
  agvConfigs.forEach(c => buildAGV(c.x, c.z, c.color, c.id));

  // AMRs — inspection/search agents for knowledge quality loops
  const amrConfigs = [
    { x: -3, z: 0, color: mat.amrBody, id: 'AMR-01' },
    { x: -8, z: -15, color: mat.amrBody2, id: 'AMR-02' },
    { x: 4, z: -6, color: mat.amrBody, id: 'AMR-03' },
    { x: 9, z: 11, color: mat.amrBody, id: 'AMR-04' },
    { x: 13, z: 13, color: mat.amrBody2, id: 'AMR-05' },
  ];
  amrConfigs.forEach(c => buildAMR(c.x, c.z, c.color, c.id));
}

// ─────────────────────────────────────
// ZONE SIGNAGE (知识工厂分区标识)
// ─────────────────────────────────────
function buildZoneSign(text, x, z, color = 0x2266cc) {
  const group = new THREE.Group();

  // Post
  const post = createBox(0.12, 4.5, 0.12, mat.post, {
    position: [0, 2.25, 0],
  });
  group.add(post);

  // Sign board
  const signBoard = createBox(2.2, 0.8, 0.08, new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.6,
    emissive: color,
    emissiveIntensity: 0.5
  }), { position: [0, 4.2, 0] });
  group.add(signBoard);

  // Frame border
  const frameTop = createBox(2.3, 0.04, 0.1, mat.agvBody, { position: [0, 4.6, 0] });
  const frameBot = createBox(2.3, 0.04, 0.1, mat.agvBody, { position: [0, 3.8, 0] });
  const frameL = createBox(0.04, 0.84, 0.1, mat.agvBody, { position: [-1.14, 4.2, 0] });
  const frameR = createBox(0.04, 0.84, 0.1, mat.agvBody, { position: [1.14, 4.2, 0] });
  group.add(frameTop); group.add(frameBot); group.add(frameL); group.add(frameR);

  // Label
  const label = createLabel(text, [0, 4.2, 0.06], '#ffffff', '16px', 'l1');
  group.add(label);

  group.position.set(x, 0, z);
  group.name = text;
  registerFactoryObject(group, {
    id: `zone-sign.${slugifyFactoryId(text)}`,
    name: text,
    module: '标注系统',
    type: 'zone-sign',
    level: 'L2 组合对象',
    sourceFunction: 'buildZoneSign()',
    businessMeaning: `用于标识工厂主区域的实体标牌：${text}。`,
    status: '运行中',
    trackingMode: 'semantic',
  });
  scene.add(group);
}

function buildAllSigns() {
  buildZoneSign('01 原料入口', -21, -22.5, 0x2266cc);
  buildZoneSign('02 AI 质检闸口', -8, -22.5, 0xcc8833);
  buildZoneSign('03 知识炼制区', 5, -22.5, 0x6655cc);
  buildZoneSign('五类资产仓', -26.5, -6, 0x3388dd);
  buildZoneSign('长期记忆冷链', 3.5, 2.5, 0x22aaaa);
  buildZoneSign('行动输出区', 19.5, -8.5, 0xdd5533);
  buildZoneSign('回路中心', 13, 15.5, 0x33aa77);

  // Hanging signs in the air
  const hangingPositions = [
    { text: '主线：丢 → 收 → 质检 → 炼', x: -8, z: -18, y: 6.5 },
    { text: '路由：炼制结果进入资产/输出分流', x: 8, z: -11, y: 6.2 },
    { text: '沉：五类资产归位与复用', x: -18.5, z: 1, y: 6.2 },
    { text: '推 → 做：行动卡 / 报告 / 复盘交付', x: 14, z: -6, y: 6.2 },
    { text: '进：反馈回收 → 策略回灌', x: 13, z: 12, y: 5.8 },
  ];
  hangingPositions.forEach(h => {
    const hangLabel = createLabel(h.text, [h.x, h.y, h.z], '#aaccff', '12px', 'l3');
    scene.add(hangLabel);
  });
}

// ─────────────────────────────────────
// FACILITY STRUCTURES
// ─────────────────────────────────────
function buildFacilities() {
  // Report and knowledge-product output dock
  const dock = createBox(6, 0.3, 3, mat.dockFloor, {
    position: [18, -0.05, -10],
    receiveShadow: true,
    registry: {
      id: 'output.dock',
      name: '行动输出区',
      module: '输出系统',
      type: 'output-dock',
      level: 'L1 业务组件',
      sourceFunction: 'buildFacilities()',
      businessMeaning: '行动卡、报告、复盘建议和项目包从这里交付给用户。',
      status: '运行中',
      trackingMode: 'semantic',
      interactive: true,
    },
  });
  scene.add(dock);

  // Dock doorframes
  for (let d = 0; d < 2; d++) {
    const dz = -10 + d * 4;
    // Left pillar
    const pillarL = createBox(0.2, 4, 0.2, mat.post, { position: [15.5, 2, dz] });
    const pillarR = createBox(0.2, 4, 0.2, mat.post, { position: [20.5, 2, dz] });
    const lintel = createBox(5.4, 0.2, 0.3, mat.post, { position: [18, 4, dz] });
    scene.add(pillarL); scene.add(pillarR); scene.add(lintel);

    // Roller shutter
    const shutter = createBox(4.8, 3.2, 0.04, new THREE.MeshStandardMaterial({
      color: 0x778899, roughness: 0.4, metalness: 0.8, transparent: true, opacity: 0.6
    }), { position: [18, 1.8, dz] });
    scene.add(shutter);
  }

  const dockLabel = createLabel('行动输出区 · 晨报/行动卡/复盘', [18, 4.8, -10], '#ffcc88', '11px', 'l5');
  scene.add(dockLabel);

  // Knowledge control tower / observation platform (center back)
  const towerBase = createCylinder(1.2, 1.5, 6, 16, new THREE.MeshStandardMaterial({
    color: 0x526a80, roughness: 0.42, metalness: 0.35
  }), {
    position: [20, 3, 18],
    registry: {
      id: 'control-tower.base',
      name: '能力中控塔底座',
      module: '运营 UI 系统',
      type: 'control-tower',
      level: 'L2 组合对象',
      sourceFunction: 'buildFacilities()',
      businessMeaning: '工厂运行状态、能力指数和运营态势的控制塔结构。',
      status: '运行中',
      trackingMode: 'semantic',
      interactive: true,
    },
  });
  scene.add(towerBase);

  const towerCab = createBox(3, 2.5, 3, new THREE.MeshStandardMaterial({
    color: 0x4c657c, roughness: 0.38, metalness: 0.25
  }), {
    position: [20, 7.3, 18],
    registry: {
      id: 'control-tower.cab',
      name: '能力中控塔控制舱',
      module: '运营 UI 系统',
      type: 'control-tower-cab',
      level: 'L2 组合对象',
      sourceFunction: 'buildFacilities()',
      businessMeaning: '观察和解释 7*24 自运行知识工厂状态的控制舱。',
      status: '运行中',
      trackingMode: 'semantic',
      interactive: true,
    },
  });
  scene.add(towerCab);

  // Glass windows on tower
  for (let wx of [-1, 0, 1]) {
    for (let wz of [-1, 0, 1]) {
      if (wx === 0 && wz === 0) continue;
      const window = createBox(0.6, 1.5, 0.04, new THREE.MeshStandardMaterial({
        color: 0x88ccff, roughness: 0.1, metalness: 0.1,
        emissive: 0x336688, emissiveIntensity: 0.8
      }), { position: [20 + wx * 1.1, 7.2 + (wz < 0 ? -0.2 : 0.2), 18 + 1.55] });
      scene.add(window);
    }
  }

  // Tower label
  const towerLabel = createLabel('能力中控塔', [20, 9.5, 18], '#ffcc88', '11px', 'l5');
  scene.add(towerLabel);

  // Long-memory cold-chain partition walls
  for (let w = 0; w < 5; w++) {
    const wall = createBox(0.1, 4, 3, mat.coldWall, {
      position: [0 + w * 2.1, 2, -4],
      castShadow: false
    });
    scene.add(wall);
  }
  buildColdMemoryVaults();

  // Safety bollards along pathways
  for (let b = 0; b < 12; b++) {
    const bollard = createCylinder(0.08, 0.1, 0.8, 8, new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0xffaa00,
      emissiveIntensity: 0.3
    }), {
      position: [-10 + b * 2, 0.4, -16],
    });
    scene.add(bollard);
  }

  // Agent energy and inference-budget stations (against wall)
  for (let c = 0; c < 4; c++) {
    const charger = createBox(0.4, 0.8, 0.3, new THREE.MeshStandardMaterial({
      color: 0x334455, roughness: 0.3, metalness: 0.7,
      emissive: 0x113344, emissiveIntensity: 0.6
    }), {
      position: [22, 0.4, -12 + c * 4],
      registry: {
        id: `agent.energy-station.${String(c + 1).padStart(2, '0')}`,
        name: `Agent 推理能量站 ${c + 1}`,
        module: 'Agent 系统',
        type: 'agent-energy-station',
        level: 'L2 组合对象',
        sourceFunction: 'buildFacilities()',
        businessMeaning: '表示 Agent 工人的算力、推理预算和运行补给能力。',
        status: '在线',
        trackingMode: 'semantic',
      },
    });
    scene.add(charger);

    const chargeLight = createCylinder(0.04, 0.04, 0.03, 8, mat.signalGreen, {
      position: [22.2, 0.85, -12 + c * 4],
    });
    chargeLight.userData = { type: 'signal', phase: random() * Math.PI * 2 };
    state.signalLights.push(chargeLight);
    scene.add(chargeLight);

    const chargeLabel = createLabel('Agent 推理能量站', [22, 1.2, -12 + c * 4], '#88aacc', '9px', 'l6');
    scene.add(chargeLabel);
  }

  // Feedback/evolution core: where user behavior updates asset weights.
  const coreBase = createCylinder(1.0, 1.25, 0.3, 32, new THREE.MeshStandardMaterial({
    color: 0x244e3f,
    roughness: 0.35,
    metalness: 0.55,
    emissive: 0x0f3a29,
    emissiveIntensity: 0.6
  }), { position: [10, 0.15, 12] });
  scene.add(coreBase);

  const core = createCylinder(0.7, 0.7, 1.2, 32, mat.loopPulse, {
    position: [10, 0.9, 12],
  });
  core.userData = { type: 'feedback-core', phase: random() * Math.PI * 2 };
  state.signalLights.push(core);
  registerFactoryObject(core, {
    id: 'feedback.core',
    name: '回路中心 · 反馈即进化',
    module: '反馈进化系统',
    type: 'feedback-core',
    level: 'L1 业务组件',
    sourceFunction: 'buildFacilities()',
    businessMeaning: '回收用户点击、忽略、修改、完成和引用行为，更新资产权重与能力指数。',
    status: '运行中',
    trackingMode: 'semantic',
    interactive: true,
  });
  scene.add(core);

  const ringGeo = new THREE.TorusGeometry(1.2, 0.035, 8, 48);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x3ee898,
    roughness: 0.2,
    metalness: 0.3,
    emissive: 0x3ee898,
    emissiveIntensity: 1.4
  });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(10, 1.1 + i * 0.35, 12);
    ring.rotation.x = Math.PI / 2;
    ring.userData = { type: 'feedback-ring', phase: i * 1.6 };
    registerFactoryObject(ring, {
      id: `feedback.core.ring.${i + 1}`,
      name: `反馈进化状态环 ${i + 1}`,
      module: '反馈进化系统',
      type: 'feedback-ring',
      level: 'L3 子物件',
      sourceFunction: 'buildFacilities()',
      businessMeaning: '表现反馈回收与策略回灌的动态状态环。',
      status: '运行中',
      trackingMode: 'semantic',
    });
    state.signalLights.push(ring);
    scene.add(ring);
  }

  const feedbackLabel = createLabel('回路中心 · 反馈即进化', [10, 2.6, 12], '#86efac', '11px', 'l5');
  scene.add(feedbackLabel);
}

// ─────────────────────────────────────
// AI QUALITY INSPECTION AREA (AI 质检区)
// ─────────────────────────────────────
function buildQualityInspection() {
  const qx = -8;
  const qz = -18;
  const tableTop = createBox(2.5, 0.08, 1.5, new THREE.MeshStandardMaterial({
    color: 0xdddddd, roughness: 0.2, metalness: 0.4
  }), {
    position: [qx, 0.9, qz],
    receiveShadow: true,
    registry: {
      id: 'quality.station.table',
      name: 'AI 质检工位',
      module: '质检系统',
      type: 'quality-station',
      level: 'L1 业务组件',
      sourceFunction: 'buildQualityInspection()',
      businessMeaning: '负责知识入库前的去重、引用检查、冲突检测、时效性检测和可信度评估。',
      status: '运行中',
      trackingMode: 'semantic',
      interactive: true,
    },
  });
  scene.add(tableTop);

  // Table legs
  for (let lx of [-1, 1]) {
    for (let lz of [-0.5, 0.5]) {
      const leg = createBox(0.06, 0.9, 0.06, mat.post, {
        position: [qx + lx * 1.1, 0.45, qz + lz * 1.2],
      });
      scene.add(leg);
    }
  }

  // Scanner arm
  const scannerPost = createBox(0.1, 1.2, 0.1, mat.post, { position: [qx, 1.5, qz + 1.2] });
  scene.add(scannerPost);
  const scannerArm = createBox(0.06, 0.06, 1.0, mat.conveyorFrame, { position: [qx, 2.1, qz] });
  scene.add(scannerArm);
  const scannerHead = createBox(0.3, 0.5, 0.15, new THREE.MeshStandardMaterial({
    color: 0x333333, roughness: 0.2, metalness: 0.7,
    emissive: 0x112244, emissiveIntensity: 0.8
  }), {
    position: [qx, 1.8, qz],
    registry: {
      id: 'quality.station.scanner-head',
      name: 'AI 质检扫描头',
      module: '质检系统',
      type: 'scanner-head',
      level: 'L2 组合对象',
      sourceFunction: 'buildQualityInspection()',
      businessMeaning: '扫描待检知识包，触发去重、来源、冲突、时效检测。',
      status: '运行中',
      trackingMode: 'semantic',
    },
  });
  scene.add(scannerHead);

  // Scan indicator
  const scanLight = createBox(0.04, 0.8, 0.04, new THREE.MeshStandardMaterial({
    color: 0xff0000, roughness: 0.1, emissive: 0xff0000, emissiveIntensity: 3.0
  }), { position: [qx, 1.5, qz] });
  scanLight.userData = { type: 'scanLight', phase: 0 };
  state.signalLights.push(scanLight);
  scene.add(scanLight);

  const qiLabel = createLabel('AI 质检工位 · 去重/引用/冲突/时效', [qx, 2.8, qz], '#ffaa44', '11px', 'l5');
  scene.add(qiLabel);

  // Pending knowledge packets
  for (let b = 0; b < 3; b++) {
    const box = createBox(0.4, 0.35, 0.4, b === 1 ? mat.boxBlue : mat.boxBrown, {
      position: [qx - 1 + b * 0.9, 0.2, qz - 1.5],
    });
    const sources = ['会议纪要', '微信读书笔记', '代码片段'];
    box.userData = { type: 'inspection-box', id: `KQ-${b + 1}`, source: sources[b] };
    registerFactoryObject(box, {
      id: `KQ-${b + 1}`,
      name: `${sources[b]}待检知识包`,
      module: '质检系统',
      type: 'inspection-box',
      level: 'L2 组合对象',
      sourceFunction: 'buildQualityInspection()',
      businessMeaning: `${sources[b]}进入 AI 质检队列，等待来源、重复、冲突和时效检查。`,
      status: '待 AI 质检',
      trackingMode: 'semantic',
      interactive: true,
    });
    scene.add(box);
  }
}

// ─────────────────────────────────────
// KNOWLEDGE FACTORY BUILDING STRUCTURE
// ─────────────────────────────────────
function buildBuildingStructure() {
  // Perimeter columns
  const colInterval = 6;
  for (let x = -24; x <= 24; x += colInterval) {
    for (let z of [-23, 23]) {
      const col = createBox(0.3, 8, 0.3, mat.post, { position: [x, 4, z] });
      scene.add(col);
    }
  }
  for (let z = -23; z <= 23; z += colInterval) {
    for (let x of [-24, 24]) {
      const col = createBox(0.3, 8, 0.3, mat.post, { position: [x, 4, z] });
      scene.add(col);
    }
  }

  // Roof truss lines
  for (let x = -24; x <= 24; x += 3) {
    const truss = createBox(0.06, 0.15, 46, mat.floorLine, {
      position: [x, 7.8, 0],
      castShadow: false
    });
    scene.add(truss);
  }

  // Cross trusses
  for (let z = -22; z <= 22; z += 4) {
    const truss = createBox(48, 0.08, 0.08, mat.floorLine, {
      position: [0, 8, z],
      castShadow: false
    });
    scene.add(truss);
  }

  // Roof panels (semi-transparent)
  const roofGeo = new THREE.PlaneGeometry(50, 48);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a3a,
    roughness: 0.6,
    metalness: 0.3,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.x = -Math.PI / 2;
  roof.position.y = 8.2;
  roof.receiveShadow = true;
  roof.castShadow = false;
  scene.add(roof);

  // Wall planes (semi-transparent, factory boundary)
  const wallMatBack = new THREE.MeshStandardMaterial({
    color: 0x334455,
    roughness: 0.6,
    metalness: 0.3,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
  });

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 8), wallMatBack);
  backWall.position.set(0, 4, -24);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 8), wallMatBack);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-25, 4, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);
}

// ─────────────────────────────────────
// GROUND DECORATION
// ─────────────────────────────────────
function buildDecoration() {
  // Knowledge product stacks near output docks
  for (let p = 0; p < 4; p++) {
    const px = 15 + (p % 2) * 2.5;
    const pz = -14 + Math.floor(p / 2) * 2.5;
    const pallet = createBox(1.2, 0.12, 1.0, mat.pallet, { position: [px, 0.05, pz] });
    scene.add(pallet);
    for (let b = 0; b < 3; b++) {
      const box = createBox(0.45, 0.4, 0.45, [mat.boxBrown, mat.boxBlue, mat.boxWhite][b], {
        position: [px + (random() - 0.5) * 0.3, 0.25 + b * 0.35, pz + (random() - 0.5) * 0.3],
      });
      scene.add(box);
    }
  }

  // Knowledge product packaging station
  const wrapBase = createCylinder(0.5, 0.55, 0.1, 16, mat.conveyorFrame, {
    position: [12, 0.05, -15],
    registry: {
      id: 'output.packaging.base',
      name: '发布打包区',
      module: '输出系统',
      type: 'packaging-station',
      level: 'L1 业务组件',
      sourceFunction: 'buildDecoration()',
      businessMeaning: '把行动卡、报告、复盘和项目资产包打包成用户可使用的输出物。',
      status: '运行中',
      trackingMode: 'semantic',
      interactive: true,
    },
  });
  scene.add(wrapBase);
  const wrapRoll = createCylinder(0.15, 0.15, 1.2, 8, mat.post, {
    position: [12, 0.7, -15],
  });
  scene.add(wrapRoll);
  const wrapLabel = createLabel('发布打包区', [12, 1.5, -15], '#ccddff', '10px', 'l8');
  scene.add(wrapLabel);

  // Direction markers are now attached to the conveyor layout in buildAllConveyors.
}

// ─────────────────────────────────────
// FACTORY NETWORK LAYER (个人工厂网络图层)
// ─────────────────────────────────────

function buildPrimaryFactoryCampus() {
  const sceneChildrenBeforeBuild = new Set(scene.children);

  buildFloor();
  buildAllRacks();
  buildAllConveyors();
  buildAllRobots();
  buildAllSigns();
  buildFacilities();
  buildQualityInspection();
  buildBuildingStructure();
  buildDecoration();

  const factory = new THREE.Group();
  factory.name = 'Factory 01 · Original Baseline';
  [...scene.children]
    .filter(child => !sceneChildrenBeforeBuild.has(child))
    .forEach(child => factory.add(child));

  factory.userData = {
    type: 'factory-campus',
    id: 'factory-01',
    title: '工厂 1 · 原工厂基线',
    factoryCampus: 'factory-01',
    lockedBaseline: true,
  };
  registerFactoryObject(factory, {
    id: 'campus.factory-01',
    name: '工厂 1 · 原工厂基线',
    module: '建筑结构系统',
    type: 'factory-campus',
    level: 'L1 业务组件',
    sourceFunction: 'buildPrimaryFactoryCampus()',
    businessMeaning: '保持原工厂空间、设备和生产逻辑不变的 1:1 对照基线。',
    status: '基线锁定',
    trackingMode: 'semantic',
    interactive: true,
  });
  scene.add(factory);
  return factory;
}

function createEvolutionMaterial(color, options = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.38,
    metalness: options.metalness ?? 0.62,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? (options.opacity !== undefined && options.opacity < 1),
    opacity: options.opacity ?? 1,
  });
  if (options.depthWrite === false) material.depthWrite = false;
  return material;
}

function createEvolutionStageLabel(code, title, subtitle, position, accent) {
  const names = { '00': '接收码头', '01': '机会雷达', '02': '中控塔', '03': '工厂矩阵',
    '04': '生产工位', '05': '质检闸口', '06': '交付码头', '07': '知识回流' };
  const element = document.createElement('div');
  element.className = 'scene-landmark';
  element.style.setProperty('--landmark-color', accent);
  element.textContent = `${code}  ${names[code] || title}`;
  const label = new CSS2DObject(element);
  label.position.set(...position);
  label.userData.landmark = true;
  return label;
}

function createEvolutionDetailLabel(text, position, color, id) {
  const label = createLabel(text, position, color, '9px', 'l6', {
    id,
    name: `工厂 2 · ${text}`,
    module: '建筑结构系统',
    businessMeaning: 'Factory 2 演进结构的近景细节标注，仅在单厂视角中显示。',
  });
  label.element.classList.add('factory-02-detail-label');
  return label;
}

function addEvolutionPart(group, object, type = 'factory-02-evolution-part') {
  object.userData = {
    ...object.userData,
    skipRegistry: true,
    type,
    factoryCampus: 'factory-02',
    evolutionSandbox: true,
  };
  group.add(object);
  return object;
}

function addEvolutionBox(group, size, material, position, options = {}) {
  return addEvolutionPart(group, createBox(size[0], size[1], size[2], material, {
    position,
    rotation: options.rotation,
    castShadow: options.castShadow,
    receiveShadow: options.receiveShadow,
  }), options.type || 'factory-02-evolution-part');
}

function addEvolutionCylinder(group, dimensions, material, position, options = {}) {
  return addEvolutionPart(group, createCylinder(
    dimensions[0],
    dimensions[1],
    dimensions[2],
    dimensions[3],
    material,
    {
      position,
      rotation: options.rotation,
      castShadow: options.castShadow,
      receiveShadow: options.receiveShadow,
    },
  ), options.type || 'factory-02-evolution-part');
}

function addEvolutionBeacon(group, position, color, phase = 0) {
  const material = createEvolutionMaterial(color, {
    roughness: 0.18,
    metalness: 0.18,
    emissive: color,
    emissiveIntensity: 2.2,
  });
  const beacon = addEvolutionCylinder(group, [0.09, 0.09, 0.32, 12], material, position, {
    castShadow: false,
    type: 'factory-02-flow-beacon',
  });
  state.twinFactory.flowBeacons.push({ object: beacon, phase, baseIntensity: 2.2 });
  return beacon;
}

function createEvolutionRouteSegment(group, start, end, material, options = {}) {
  const startVector = start.isVector3 ? start.clone() : new THREE.Vector3(...start);
  const endVector = end.isVector3 ? end.clone() : new THREE.Vector3(...end);
  const direction = endVector.clone().sub(startVector);
  const length = direction.length();
  if (!length) return null;

  const segment = createBox(length, options.height ?? 0.12, options.width ?? 0.22, material, {
    castShadow: false,
    receiveShadow: false,
  });
  segment.position.copy(startVector.clone().add(endVector).multiplyScalar(0.5));
  segment.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.clone().normalize());
  addEvolutionPart(group, segment, options.type || 'factory-02-flow-rail');

  if (options.arrow !== false) {
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry((options.width ?? 0.22) * 1.6, 0.62, 4),
      material,
    );
    arrow.position.copy(startVector.clone().lerp(endVector, 0.72));
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    addEvolutionPart(group, arrow, 'factory-02-flow-arrow');
  }
  return segment;
}

function buildEvolutionRoute(group, points, material, options = {}) {
  const vectors = points.map(point => point.isVector3 ? point.clone() : new THREE.Vector3(...point));
  for (let index = 0; index < vectors.length - 1; index++) {
    createEvolutionRouteSegment(group, vectors[index], vectors[index + 1], material, options);
  }
  if (options.closed && vectors.length > 2) {
    createEvolutionRouteSegment(group, vectors[vectors.length - 1], vectors[0], material, options);
  }

  if (options.supports) {
    const supportMat = options.supportMaterial || material;
    const supportPoints = vectors;
    supportPoints.forEach(point => {
      if (point.y < 1.2) return;
      addEvolutionBox(group, [0.12, point.y, 0.12], supportMat, [point.x, point.y * 0.5, point.z], {
        castShadow: false,
        type: 'factory-02-route-support',
      });
    });
  }
  return vectors;
}

function addEvolutionFlowTokens(group, points, material, options = {}) {
  const vectors = points.map(point => point.isVector3 ? point.clone() : new THREE.Vector3(...point));
  const curve = new THREE.CatmullRomCurve3(
    vectors,
    Boolean(options.closed),
    'catmullrom',
    options.tension ?? 0.18,
  );
  const count = options.count ?? 3;
  for (let index = 0; index < count; index++) {
    const token = new THREE.Group();
    const body = createBox(
      options.length ?? 0.72,
      options.height ?? 0.24,
      options.depth ?? 0.42,
      material,
      { castShadow: false },
    );
    body.userData.skipRegistry = true;
    token.add(body);

    const coreMaterial = createEvolutionMaterial(options.coreColor ?? 0xffffff, {
      roughness: 0.12,
      metalness: 0.12,
      emissive: options.coreColor ?? 0xffffff,
      emissiveIntensity: 2.4,
    });
    const core = createBox(0.28, 0.05, 0.2, coreMaterial, {
      position: [0, (options.height ?? 0.24) * 0.58, 0],
      castShadow: false,
    });
    core.userData.skipRegistry = true;
    token.add(core);
    token.userData = {
      skipRegistry: true,
      type: 'factory-02-flow-token',
      flowKind: options.kind || 'primary',
    };
    group.add(token);
    const progress = ((options.offset ?? 0) + index / count) % 1;
    token.position.copy(curve.getPointAt(progress));
    const tangent = curve.getTangentAt(progress).normalize();
    token.rotation.y = -Math.atan2(tangent.z, tangent.x);
    state.twinFactory.flowTokens.push({
      object: token,
      curve,
      progress,
      speed: options.speed ?? 0.035,
      phase: index * 1.4,
      kind: options.kind || 'primary',
    });
  }
}

function buildFactory2IntakeDock(materials) {
  const group = new THREE.Group();
  group.name = 'Factory 02 · Intake Protocol Dock';
  group.userData = {
    type: 'intake-protocol-dock',
    factoryCampus: 'factory-02',
    evolutionSandbox: true,
  };

  addEvolutionBox(group, [8.8, 0.18, 10.2], materials.platform, [-20.5, 0.12, -18], {
    receiveShadow: true,
    type: 'intake-dock-platform',
  });
  addEvolutionBox(group, [0.12, 0.08, 10.2], materials.cyan, [-24.82, 0.27, -18], { castShadow: false });
  addEvolutionBox(group, [0.12, 0.08, 10.2], materials.amber, [-16.18, 0.27, -18], { castShadow: false });

  const lanes = [
    { code: 'NEED', color: 0xffc14a },
    { code: 'FILE', color: 0x69d7ff },
    { code: 'DATA', color: 0x2df29a },
    { code: 'AGENT', color: 0xa08cff },
    { code: 'COLLAB', color: 0xf5f7fa },
  ];
  lanes.forEach((lane, index) => {
    const z = -21.2 + index * 1.6;
    const laneMaterial = createEvolutionMaterial(lane.color, {
      roughness: 0.26,
      metalness: 0.42,
      emissive: lane.color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.82,
    });
    addEvolutionBox(group, [7.8, 0.055, 0.92], laneMaterial, [-20.5, 0.24, z], { castShadow: false });
    addEvolutionBox(group, [0.16, 2.5, 0.16], materials.frame, [-24.1, 1.42, z - 0.52]);
    addEvolutionBox(group, [0.16, 2.5, 0.16], materials.frame, [-24.1, 1.42, z + 0.52]);
    addEvolutionBox(group, [0.16, 0.16, 1.2], laneMaterial, [-24.1, 2.65, z]);
    addEvolutionBeacon(group, [-23.72, 0.54, z], lane.color, index * 0.7);
    group.add(createEvolutionDetailLabel(
      lane.code,
      [-23.85, 3.05, z],
      `#${lane.color.toString(16).padStart(6, '0')}`,
      `factory-02.intake.lane.${lane.code.toLowerCase()}`,
    ));
  });

  // Temporary identity and project-space issuance pod.
  addEvolutionBox(group, [3.4, 0.2, 3.6], materials.platformLight, [-16.7, 0.28, -13.4], {
    receiveShadow: true,
  });
  addEvolutionBox(group, [2.8, 2.2, 3.0], materials.dark, [-16.7, 1.42, -13.4]);
  addEvolutionBox(group, [0.08, 1.5, 2.3], materials.glass, [-15.26, 1.55, -13.4], {
    castShadow: false,
  });
  addEvolutionBox(group, [1.7, 0.08, 0.08], materials.cyan, [-15.22, 1.7, -13.4], {
    castShadow: false,
  });
  group.add(createEvolutionDetailLabel(
    'TEMP IDENTITY + PROJECT SPACE',
    [-16.7, 3.05, -13.4],
    '#7df8ff',
    'factory-02.intake.identity-project-space',
  ));

  group.add(createEvolutionStageLabel(
    '00',
    'INTAKE DOCK',
    '需求 · 数据 · 权限 · 临时身份',
    [-21.2, 5.4, -20.4],
    '#7df8ff',
  ));

  registerFactoryObject(group, {
    id: 'factory-02.evolution.intake-dock',
    name: '工厂 2 · 接收协议码头',
    module: '流水线系统',
    type: 'intake-protocol-dock',
    level: 'L1 业务组件',
    sourceFunction: 'buildFactory2IntakeDock()',
    businessMeaning: '接收需求、文件、数据、外部 Agent 与协作者，并完成临时身份、项目空间、安全与权限检查。',
    status: 'Factory 2 第一阶段运行中',
    trackingMode: 'semantic',
    interactive: true,
  });
  return group;
}

function buildFactory2DeliveryDock(materials) {
  const group = new THREE.Group();
  group.name = 'Factory 02 · Delivery Protocol Dock';
  group.userData = {
    type: 'delivery-protocol-dock',
    factoryCampus: 'factory-02',
    evolutionSandbox: true,
  };

  addEvolutionBox(group, [10.4, 0.2, 12.6], materials.platform, [19.4, 0.14, -10], {
    receiveShadow: true,
    type: 'delivery-dock-platform',
  });
  const lanes = [
    { code: 'CODE', z: -14, color: 0x69d7ff },
    { code: 'REPORT', z: -10, color: 0xf5f7fa },
    { code: 'DECISION', z: -6, color: 0xffc14a },
  ];
  lanes.forEach((lane, index) => {
    const laneMaterial = createEvolutionMaterial(lane.color, {
      roughness: 0.24,
      metalness: 0.5,
      emissive: lane.color,
      emissiveIntensity: 0.62,
      transparent: true,
      opacity: 0.84,
    });
    addEvolutionBox(group, [8.7, 0.07, 1.4], laneMaterial, [19.6, 0.28, lane.z], { castShadow: false });
    addEvolutionBox(group, [0.18, 3.4, 0.18], materials.frameLight, [23.7, 1.86, lane.z - 0.9]);
    addEvolutionBox(group, [0.18, 3.4, 0.18], materials.frameLight, [23.7, 1.86, lane.z + 0.9]);
    addEvolutionBox(group, [0.18, 0.2, 2.0], laneMaterial, [23.7, 3.56, lane.z]);
    addEvolutionBeacon(group, [23.15, 0.56, lane.z], lane.color, 2.4 + index * 0.8);
    group.add(createEvolutionDetailLabel(
      lane.code,
      [23.3, 4.02, lane.z],
      `#${lane.color.toString(16).padStart(6, '0')}`,
      `factory-02.delivery.lane.${lane.code.toLowerCase()}`,
    ));
  });

  // Secure client handoff and audit pod.
  addEvolutionBox(group, [3.2, 0.2, 3.6], materials.platformLight, [18.2, 0.28, -16.8], {
    receiveShadow: true,
  });
  addEvolutionBox(group, [2.6, 2.4, 3.0], materials.dark, [18.2, 1.52, -16.8]);
  addEvolutionBox(group, [2.0, 1.55, 0.08], materials.glass, [18.2, 1.62, -15.26], {
    castShadow: false,
  });
  addEvolutionBox(group, [1.55, 0.08, 0.08], materials.green, [18.2, 1.72, -15.2], {
    castShadow: false,
  });
  group.add(createEvolutionDetailLabel(
    'CLIENT ACCESS + AUDIT HANDOFF',
    [18.2, 3.2, -16.8],
    '#73f7b7',
    'factory-02.delivery.client-access',
  ));

  group.add(createEvolutionStageLabel(
    '06',
    'DELIVERY DOCK',
    '封装 · 权限交接 · 审计 · 通知',
    [20.0, 5.9, -10],
    '#ffcf66',
  ));

  registerFactoryObject(group, {
    id: 'factory-02.evolution.delivery-dock',
    name: '工厂 2 · 交付协议码头',
    module: '输出系统',
    type: 'delivery-protocol-dock',
    level: 'L1 业务组件',
    sourceFunction: 'buildFactory2DeliveryDock()',
    businessMeaning: '对代码、报告和决策成果进行质量确认、版本封装、权限交接、审计与客户通知。',
    status: 'Factory 2 第一阶段运行中',
    trackingMode: 'semantic',
    interactive: true,
  });
  return group;
}

function buildFactory2StageArchitecture(materials) {
  const group = new THREE.Group();
  group.name = 'Factory 02 · Lifecycle Stage Architecture';

  // Opportunity radar: a physical scanning threshold after intake.
  addEvolutionCylinder(group, [2.25, 2.25, 0.16, 48], materials.platformLight, [-18, 0.2, -9], {
    receiveShadow: true,
  });
  [1.45, 2.15].forEach((radius, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.07, 8, 48), index === 0 ? materials.cyan : materials.amber);
    ring.position.set(-18, 0.36 + index * 0.04, -9);
    ring.rotation.x = Math.PI / 2;
    addEvolutionPart(group, ring, 'opportunity-radar-ring');
  });
  addEvolutionCylinder(group, [0.11, 0.14, 2.4, 12], materials.frameLight, [-18, 1.45, -9]);
  const radarDish = addEvolutionCylinder(group, [0.72, 0.72, 0.08, 24], materials.glass, [-18, 2.64, -9], {
    rotation: [Math.PI / 2, 0, -0.35],
    castShadow: false,
    type: 'opportunity-radar-dish',
  });
  radarDish.rotation.z = -0.35;
  group.add(createEvolutionStageLabel('01', 'OPPORTUNITY RADAR', '目标 · 约束 · 风险 · 时效', [-18, 4.8, -9], '#7df8ff'));

  // Executive tower remains in place; a new uplink ring makes it a lifecycle stage.
  const towerRing = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.1, 10, 64), materials.amber);
  towerRing.position.set(20, 0.26, 18);
  towerRing.rotation.x = Math.PI / 2;
  addEvolutionPart(group, towerRing, 'executive-uplink-ring');
  addEvolutionBox(group, [0.16, 7.8, 0.16], materials.amber, [18.3, 4.0, 18], { castShadow: false });
  addEvolutionBox(group, [0.16, 7.8, 0.16], materials.cyan, [21.7, 4.0, 18], { castShadow: false });
  group.add(createEvolutionStageLabel('02', 'EXECUTIVE UPLINK', 'CEO · CIO · COO · CTO · CFO', [20, 11.2, 18], '#ffcf66'));

  // Matrix assembly plaza.
  addEvolutionBox(group, [6.8, 0.18, 5.4], materials.platformLight, [0, 0.16, -2], { receiveShadow: true });
  for (let index = -2; index <= 2; index++) {
    addEvolutionBox(group, [0.045, 0.05, 4.8], materials.green, [index * 1.1, 0.3, -2], { castShadow: false });
    addEvolutionBox(group, [5.8, 0.05, 0.045], materials.cyan, [0, 0.31, -2 + index * 0.86], { castShadow: false });
  }
  [[-2.2, -3.6], [2.2, -3.6], [-2.2, -0.4], [2.2, -0.4]].forEach((point, index) => {
    addEvolutionBox(group, [0.42, 1.8, 0.42], materials.dark, [point[0], 1.15, point[1]]);
    addEvolutionBeacon(group, [point[0], 2.18, point[1]], index % 2 ? 0x2df29a : 0x69d7ff, 3 + index * 0.6);
  });
  group.add(createEvolutionStageLabel('03', 'FACTORY MATRIX', '能力扫描 · 临时组织 · 任务分工', [0, 5.0, -2], '#73f7b7'));

  // Agent production cells create a visible cluster instead of another UI panel.
  const agentCells = [[5.6, -9.8], [8.0, -9.8], [5.6, -6.8], [8.0, -6.8]];
  agentCells.forEach((point, index) => {
    addEvolutionBox(group, [1.8, 0.18, 2.1], materials.platformLight, [point[0], 0.18, point[1]], { receiveShadow: true });
    addEvolutionBox(group, [1.3, 1.35, 1.45], materials.dark, [point[0], 0.94, point[1]]);
    addEvolutionBox(group, [0.72, 0.7, 0.06], materials.glass, [point[0], 1.02, point[1] + 0.76], { castShadow: false });
    addEvolutionBeacon(group, [point[0] + 0.52, 1.72, point[1] - 0.48], index === 3 ? 0xffc14a : 0x2df29a, 5 + index * 0.5);
  });
  group.add(createEvolutionStageLabel('04', 'AGENT PRODUCTION', '研究 · 设计 · 开发 · 编排', [6.8, 4.7, -8.2], '#73f7b7'));

  // QA gate, with a clearly visible exception signal.
  addEvolutionBox(group, [4.8, 0.18, 3.8], materials.platformLight, [14, 0.16, -14], { receiveShadow: true });
  addEvolutionBox(group, [0.2, 3.4, 0.2], materials.frameLight, [12.2, 1.84, -14]);
  addEvolutionBox(group, [0.2, 3.4, 0.2], materials.frameLight, [15.8, 1.84, -14]);
  addEvolutionBox(group, [3.8, 0.2, 0.22], materials.amber, [14, 3.55, -14]);
  [-0.9, 0, 0.9].forEach((offset, index) => {
    addEvolutionBox(group, [0.055, 2.4, 0.055], index === 1 ? materials.red : materials.amber, [14 + offset, 1.72, -14], { castShadow: false });
  });
  group.add(createEvolutionStageLabel('05', 'QA GATE', '验收 · 冲突 · 版本 · 回工', [14, 5.25, -14], '#ff7b78'));

  // Knowledge return crown around the original feedback core.
  const knowledgeRing = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.1, 10, 64), materials.green);
  knowledgeRing.position.set(10, 4.8, 12);
  knowledgeRing.rotation.x = Math.PI / 2;
  addEvolutionPart(group, knowledgeRing, 'knowledge-return-crown');
  [-2.2, 2.2].forEach(xOffset => {
    addEvolutionBox(group, [0.14, 4.8, 0.14], materials.frame, [10 + xOffset, 2.4, 12], { castShadow: false });
  });
  group.add(createEvolutionStageLabel('07', 'KNOWLEDGE RETURN', '经验沉淀 · 权限回收 · 策略回灌', [10, 7.3, 12], '#73f7b7'));

  registerFactoryObject(group, {
    id: 'factory-02.evolution.stage-architecture',
    name: '工厂 2 · 生命周期阶段建筑',
    module: '建筑结构系统',
    type: 'lifecycle-stage-architecture',
    level: 'L1 业务组件',
    sourceFunction: 'buildFactory2StageArchitecture()',
    businessMeaning: '把机会识别、高管会诊、矩阵组队、Agent 生产、质检和知识回流表达为可追踪的空间节点。',
    status: 'Factory 2 第一阶段运行中',
    trackingMode: 'semantic',
  });
  return group;
}

function buildFactory2FlowNetwork(materials) {
  const group = new THREE.Group();
  group.name = 'Factory 02 · Visible Production Loop';
  group.userData = {
    type: 'visible-production-loop',
    factoryCampus: 'factory-02',
    evolutionSandbox: true,
  };

  const primaryPoints = [
    [-21.2, 0.54, -18],
    [-18, 0.54, -9],
    [0, 0.54, -2],
    [6.8, 0.54, -8.2],
    [14, 0.54, -14],
    [21.2, 0.54, -10],
  ];
  buildEvolutionRoute(group, primaryPoints, materials.amber, { width: 0.3, height: 0.14 });
  addEvolutionFlowTokens(group, primaryPoints, materials.amber, {
    count: 5,
    speed: 0.035,
    kind: 'primary',
    coreColor: 0xfff3cf,
  });

  const decisionPoints = [
    [-18, 3.2, -9],
    [-7, 4.4, -1],
    [7, 5.7, 8],
    [20, 7.6, 18],
    [11, 5.5, 9],
    [0, 3.2, -2],
  ];
  buildEvolutionRoute(group, decisionPoints, materials.cyan, {
    width: 0.12,
    height: 0.1,
    supports: true,
    supportMaterial: materials.frame,
  });
  addEvolutionFlowTokens(group, decisionPoints, materials.cyan, {
    count: 2,
    speed: 0.024,
    kind: 'decision',
    length: 0.5,
    height: 0.2,
    depth: 0.32,
    coreColor: 0xffffff,
  });

  const exceptionPoints = [
    [14, 0.72, -14],
    [9.5, 0.72, -16.2],
    [2, 0.72, -10.8],
    [6.8, 0.72, -8.2],
  ];
  buildEvolutionRoute(group, exceptionPoints, materials.red, {
    width: 0.16,
    height: 0.09,
    closed: true,
  });
  addEvolutionFlowTokens(group, exceptionPoints, materials.red, {
    count: 1,
    speed: 0.048,
    kind: 'exception',
    closed: true,
    length: 0.56,
    coreColor: 0xffe4e2,
  });

  const knowledgePoints = [
    [21.2, 5.2, -10],
    [23.2, 5.2, 6],
    [10, 5.2, 12],
    [-8, 5.2, 12],
    [-23.0, 5.2, 1],
    [-23.0, 5.2, -18],
  ];
  buildEvolutionRoute(group, knowledgePoints, materials.green, {
    width: 0.2,
    height: 0.12,
    supports: true,
    supportMaterial: materials.frame,
  });
  addEvolutionFlowTokens(group, knowledgePoints, materials.green, {
    count: 3,
    speed: 0.026,
    kind: 'knowledge-return',
    length: 0.58,
    height: 0.2,
    depth: 0.34,
    coreColor: 0xeafff5,
  });

  group.add(createEvolutionDetailLabel('PRIMARY TASK FLOW', [-3, 1.1, -5], '#ffcf66', 'factory-02.flow.primary'));
  group.add(createEvolutionDetailLabel('DECISION UPLINK', [2, 6.0, 4], '#7df8ff', 'factory-02.flow.decision'));
  group.add(createEvolutionDetailLabel('QA EXCEPTION / REWORK', [7, 1.25, -15], '#ff7b78', 'factory-02.flow.exception'));
  group.add(createEvolutionDetailLabel('KNOWLEDGE RETURN RAIL', [-6, 6.0, 12], '#73f7b7', 'factory-02.flow.knowledge-return'));

  registerFactoryObject(group, {
    id: 'factory-02.evolution.production-loop',
    name: '工厂 2 · 完整生产闭环',
    module: '流水线系统',
    type: 'visible-production-loop',
    level: 'L1 业务组件',
    sourceFunction: 'buildFactory2FlowNetwork()',
    businessMeaning: '用实体轨道与动态任务包表达主任务流、决策上行、质检回工和知识回流。',
    status: 'Factory 2 第一阶段运行中',
    trackingMode: 'semantic',
  });
  return group;
}

function buildFactory2Evolution() {
  const factory2 = state.twinFactory.factory2;
  if (!factory2 || state.twinFactory.evolution) return state.twinFactory.evolution;

  // The Original comparison is a true 1:1 mirror of the baseline factory.
  // Skip creating the evolution layer entirely so CSS2D labels cannot remain
  // visible after a hidden Three.js parent group is culled by CSS2DRenderer.
  if (FACTORY_SHOWCASE_VERSION === 'original') {
    const baselinePlaceholder = new THREE.Group();
    baselinePlaceholder.name = 'Factory 02 · Original Baseline Placeholder';
    baselinePlaceholder.visible = false;
    factory2.add(baselinePlaceholder);
    state.twinFactory.evolution = baselinePlaceholder;
    return baselinePlaceholder;
  }

  const materials = {
    dark: createEvolutionMaterial(0x111820, { roughness: 0.44, metalness: 0.74, emissive: 0x070c12, emissiveIntensity: 0.18 }),
    platform: createEvolutionMaterial(0x242b31, { roughness: 0.58, metalness: 0.46, emissive: 0x0d1116, emissiveIntensity: 0.12 }),
    platformLight: createEvolutionMaterial(0x4b5053, { roughness: 0.52, metalness: 0.32, emissive: 0x171a1b, emissiveIntensity: 0.1 }),
    frame: createEvolutionMaterial(0x2d3942, { roughness: 0.32, metalness: 0.82 }),
    frameLight: createEvolutionMaterial(0xcbd1cf, { roughness: 0.3, metalness: 0.76 }),
    glass: createEvolutionMaterial(0x85eaff, { roughness: 0.12, metalness: 0.12, emissive: 0x1b93a8, emissiveIntensity: 0.52, transparent: true, opacity: 0.38, depthWrite: false }),
    cyan: createEvolutionMaterial(0x69d7ff, { roughness: 0.2, metalness: 0.28, emissive: 0x3cc8ff, emissiveIntensity: 1.55 }),
    amber: createEvolutionMaterial(0xffbd52, { roughness: 0.2, metalness: 0.3, emissive: 0xff9d24, emissiveIntensity: 1.55 }),
    green: createEvolutionMaterial(0x62e6ad, { roughness: 0.2, metalness: 0.26, emissive: 0x2df29a, emissiveIntensity: 1.45 }),
    red: createEvolutionMaterial(0xff6969, { roughness: 0.22, metalness: 0.24, emissive: 0xff3b45, emissiveIntensity: 1.75 }),
  };

  const root = new THREE.Group();
  root.name = 'Factory 02 · Protocol City Evolution Layer';
  root.userData = {
    type: 'factory-02-evolution-layer',
    factoryCampus: 'factory-02',
    evolutionSandbox: true,
  };
  root.add(buildFactory2IntakeDock(materials));
  root.add(buildFactory2DeliveryDock(materials));
  root.add(buildFactory2StageArchitecture(materials));
  root.add(buildFactory2FlowNetwork(materials));

  registerFactoryObject(root, {
    id: 'factory-02.evolution.layer',
    name: '工厂 2 · 协议城市演进层',
    module: '建筑结构系统',
    type: 'factory-02-evolution-layer',
    level: 'L1 业务组件',
    sourceFunction: 'buildFactory2Evolution()',
    businessMeaning: '在不破坏原工厂结构的前提下，叠加接收、决策、临时组织、生产、验收、交付与知识回流的空间叙事。',
    status: '第一阶段已构建',
    trackingMode: 'semantic',
    interactive: true,
  });
  factory2.add(root);
  state.twinFactory.evolution = root;
  return root;
}

function animateRobots(dt) {
  const t = sceneTime;

  // Animate AGVs: move along paths
  state.agvBots.forEach(agv => {
    if (!state.animationActive) return;
    const phase = t * agv.userData.speed + agv.userData.pathOffset;
    // Circular-ish patrol
    const radius = 3 + Math.sin(agv.userData.pathOffset) * 2;
    const cx = agv.userData.pathOffset * 10;
    const cz = Math.sin(agv.userData.pathOffset * 3) * 8;
    agv.position.x += Math.cos(phase) * dt * 1.5 * agv.userData.speed;
    agv.position.z += Math.sin(phase * 0.7) * dt * 1.2 * agv.userData.speed;

    // Clamp to factory bounds
    agv.position.x = THREE.MathUtils.clamp(agv.position.x, -22, 21);
    agv.position.z = THREE.MathUtils.clamp(agv.position.z, -20, 20);

    // Smooth rotation toward movement direction
    const targetRot = Math.atan2(
      Math.cos(phase * 0.7) * 0.02,
      Math.cos(phase) * 0.025
    );
    agv.rotation.y = THREE.MathUtils.lerp(agv.rotation.y, targetRot, 0.05);

    // Bob up/down slightly
    agv.position.y = Math.sin(t * 3 + agv.userData.pathOffset) * 0.04 + 0.02;
  });

  // Animate AMRs: more organic movement
  state.amrBots.forEach(amr => {
    if (!state.animationActive) return;
    const phase = t * amr.userData.speed + amr.userData.pathOffset;
    amr.position.x += Math.cos(phase * 1.3) * dt * 1.2 * amr.userData.speed;
    amr.position.z += Math.sin(phase * 0.9) * dt * 1.2 * amr.userData.speed;
    amr.position.x = THREE.MathUtils.clamp(amr.position.x, -22, 21);
    amr.position.z = THREE.MathUtils.clamp(amr.position.z, -20, 20);
    amr.rotation.y = THREE.MathUtils.lerp(
      amr.rotation.y,
      Math.atan2(Math.sin(phase * 0.9), Math.cos(phase * 1.3)),
      0.06
    );
    amr.position.y = Math.abs(Math.sin(t * 2.5 + amr.userData.pathOffset)) * 0.03 + 0.01;

    // Rotate sensor ring
    const sensorRing = amr.children.find(c => c.geometry && c.geometry.type === 'TorusGeometry');
    if (sensorRing) {
      sensorRing.rotation.z += dt * 1.5;
    }
  });
}

function animateConveyors(t, dt) {
  if (!state.animationActive) return;

  // Rotate rollers
  state.conveyorRollers.forEach(r => {
    r.rotateY(dt * 4.8);
  });

  // Move knowledge assets on conveyor belt
  state.conveyorSurfaces.forEach(belt => {
    if (!belt.userData || !belt.userData.movingAsset) return;
    const {
      dirX,
      dirZ,
      trackStartX,
      trackStartZ,
      trackLength,
      lateralOffset,
      lateralX = -dirZ,
      lateralZ = dirX,
      speed = 1,
    } = belt.userData;
    if (dirX === undefined || dirZ === undefined || !trackLength) return;

    belt.userData.progress = (belt.userData.progress + speed * dt * 1.45) % trackLength;
    const progress = belt.userData.progress;
    belt.position.x = trackStartX + dirX * progress + lateralX * lateralOffset;
    belt.position.z = trackStartZ + dirZ * progress + lateralZ * lateralOffset;
    belt.position.y = 0.9;

    belt.userData.transitionTimer += dt;
    if (belt.userData.transitionTimer >= belt.userData.transitionEvery) {
      belt.userData.transitionTimer = 0;
      belt.userData.lifecycleIndex = (belt.userData.lifecycleIndex + 1) % lifecycleStages.length;
      belt.userData.lastHandledAt = Date.now();
      applyAssetStage(belt);
    }
  });
}

function animateLights(t) {
  state.signalLights.forEach(light => {
    if (!light.userData || light.userData.phase === undefined) return;
    const intensity = 0.5 + 0.5 * Math.sin(t * 4 + light.userData.phase);
    light.material.emissiveIntensity = 1.0 + intensity * 3.0;
    light.scale.setScalar(0.8 + intensity * 0.4);

    // Special scan light
    if (light.userData.type === 'scanLight') {
      light.material.emissiveIntensity = 2.0 + Math.abs(Math.sin(t * 6)) * 4.0;
    }
  });
}

function animateTwinFactoryEvolution(t, dt) {
  if (!state.animationActive || !state.twinFactory.evolution) return;

  state.twinFactory.flowTokens.forEach(token => {
    token.progress = (token.progress + token.speed * dt) % 1;
    const point = token.curve.getPointAt(token.progress);
    const tangent = token.curve.getTangentAt(token.progress).normalize();
    token.object.position.copy(point);
    token.object.rotation.y = -Math.atan2(tangent.z, tangent.x);
    const pulse = 1 + Math.sin(t * 4.2 + token.phase) * 0.08;
    const lift = token.kind === 'exception' ? Math.abs(Math.sin(t * 5.5 + token.phase)) * 0.08 : 0;
    token.object.position.y += lift;
    token.object.scale.setScalar(pulse);
  });

  state.twinFactory.flowBeacons.forEach(beacon => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.2 + beacon.phase);
    beacon.object.material.emissiveIntensity = beacon.baseIntensity + pulse * 1.8;
    beacon.object.scale.set(1, 0.82 + pulse * 0.42, 1);
  });
}

// Build only one factory. No clone, executive interior, network or business UI.
const factory = buildPrimaryFactoryCampus();
factory.name = '智能3D工厂 · v1.2 主场景';
factory.userData.sceneVersion = '1.2';
state.twinFactory.factory2 = factory;
buildFactory2Evolution();
const discardedLabels = [];
factory.traverse(object => { if (object.userData.omittedAnnotation) discardedLabels.push(object); });
discardedLabels.forEach(label => label.removeFromParent());
scene.updateMatrixWorld(true);
const factoryBounds = new THREE.Box3().setFromObject(factory);
const views = {
  overview: { direction: [0.22, 0.85, 1.4], bounds: factoryBounds },
  top: { direction: [0, 1, 0.03], bounds: factoryBounds },
  tower: { direction: [1, 0.55, 1.3], bounds: new THREE.Box3(new THREE.Vector3(14, 0, 12), new THREE.Vector3(25, 12, 23)) },
  line: { direction: [0.2, 1, 1.2], bounds: new THREE.Box3(new THREE.Vector3(-22, 0, -21), new THREE.Vector3(23, 6, 2)) },
};
let currentView = 'overview';
let labelsVisible = false;
let disposed = false;
let frameId = 0;
let sceneTime = 0;
let previousTime = 0;
let frames = 0;
let width = 1;
let height = 1;

function setView(name = 'overview') {
  const view = views[name];
  if (!view) return;
  currentView = name;
  const target = view.bounds.getCenter(new THREE.Vector3());
  const direction = new THREE.Vector3(...view.direction).normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
  const up = new THREE.Vector3().crossVectors(direction, right).normalize();
  const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanX = tanY * camera.aspect;
  // Reserve room for the slim page controls, including wrapped mobile controls.
  const verticalSpace = Math.max(0.38, Math.min(0.84, (height - 180) / height));
  const horizontalSpace = Math.max(0.65, Math.min(0.90, (width - 36) / width));
  let distance = 1;
  for (const x of [view.bounds.min.x, view.bounds.max.x]) {
    for (const y of [view.bounds.min.y, view.bounds.max.y]) {
      for (const z of [view.bounds.min.z, view.bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).sub(target);
        const depth = point.dot(direction);
        distance = Math.max(distance, depth + Math.abs(point.dot(right)) / (tanX * horizontalSpace),
          depth + Math.abs(point.dot(up)) / (tanY * verticalSpace));
      }
    }
  }
  // Bring the overview closer and aim lower to center the floor and equipment.
  // Leave extra side room when the viewport is tall or narrow.
  const overviewScale = name === 'overview' ? (camera.aspect >= 1.4 ? 0.82 : 0.90) : 1.04;
  if (name === 'overview') target.y -= 4.5;
  camera.position.copy(target).addScaledVector(direction, distance * overviewScale);
  controls.target.copy(target);
  controls.update();
  onViewChange(name);
}

function resize() {
  width = Math.max(1, container.clientWidth);
  height = Math.max(1, container.clientHeight);
  renderer.setSize(width, height, false);
  labelRenderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (views[currentView]) setView(currentView);
}
function setLabels(visible) {
  labelsVisible = Boolean(visible);
  labelRenderer.domElement.hidden = !labelsVisible;
  return labelsVisible;
}
function setMotion(enabled) {
  state.animationActive = Boolean(enabled);
  return state.animationActive;
}
function onControlStart() {
  currentView = 'free';
  onViewChange('free');
}
controls.addEventListener('start', onControlStart);
const onContextMenu = event => event.preventDefault();
canvas.addEventListener('contextmenu', onContextMenu);
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(container);
resize();
function render(timestamp) {
  if (disposed) return;
  frameId = requestAnimationFrame(render);
  const dt = Math.min((timestamp - (previousTime || timestamp)) / 1000, 0.05);
  previousTime = timestamp;
  if (document.hidden) return;
  if (state.animationActive) {
    sceneTime += dt;
    animateRobots(dt);
    animateConveyors(sceneTime, dt);
    animateLights(sceneTime);
    animateTwinFactoryEvolution(sceneTime, dt);
  }
  controls.update();
  renderer.render(scene, camera);
  if (labelsVisible) labelRenderer.render(scene, camera);
  frames++;
}
renderer.render(scene, camera);
frameId = requestAnimationFrame(render);
function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(frameId);
  resizeObserver.disconnect();
  controls.dispose();
  canvas.removeEventListener('contextmenu', onContextMenu);
  labelRenderer.domElement.remove();
  const geometries = new Set();
  const materials = new Set();
  scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.filter(Boolean).forEach(material => materials.add(material));
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  keyLight.shadow.map?.dispose();
  renderer.dispose();
}
return {
  setView, setLabels, setMotion, resize, dispose,
  get motionEnabled() { return state.animationActive; },
  get snapshot() {
    return { version: '1.2', factoryCount: 1, currentView, labelsVisible,
      motionEnabled: state.animationActive, frames,
      landmarks: 8, robots: state.agvBots.length + state.amrBots.length,
      conveyorTracks: state.conveyorTracks.length, flowTokens: state.twinFactory.flowTokens.length,
      drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      viewport: { width, height }, camera: camera.position.toArray(), target: controls.target.toArray() };
  },
};
}
