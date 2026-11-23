import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('matrix-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.42;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101827);
scene.fog = new THREE.Fog(0x101827, 70, 190);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(24, 30, 52);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 12);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 18;
controls.maxDistance = 92;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

const state = {
  activeOpportunity: 0,
  scanned: false,
  companyMode: false,
  storyStep: 0,
  storyTimers: [],
  nodes: [],
  links: [],
  packets: [],
  guideRails: [],
  hoveredNode: null,
  signalLights: [],
  selectedNodeId: null,
  demandSignal: null,
  radarActive: false,
};

const matrixIndustries = [
  { id: 'ai-software', label: 'AI 软件', color: 0x3cc8ff },
  { id: 'ecommerce', label: '电商零售', color: 0x3ee898 },
  { id: 'content-media', label: '内容媒体', color: 0xff5c5c },
  { id: 'consulting', label: '咨询研究', color: 0xa08cff },
  { id: 'investment', label: '投资情报', color: 0xfacc15 },
  { id: 'enterprise-ops', label: '企业运营', color: 0xffa940 },
];

const matrixCapabilities = [
  '数据接入',
  '情报研究',
  '需求洞察',
  '产品策略',
  '设计原型',
  '开发执行',
  '内容增长',
  '交付信用',
];

const matrixCapabilityColors = {
  '数据接入': 0x3cc8ff,
  '情报研究': 0x3ee898,
  '需求洞察': 0x22d3ee,
  '产品策略': 0xfacc15,
  '设计原型': 0xa08cff,
  '开发执行': 0xffa940,
  '内容增长': 0xff5c5c,
  '交付信用': 0x2df29a,
};

const matrixFactoryNodes = matrixIndustries.flatMap((industry, row) => (
  matrixCapabilities.map((capability, col) => ({
    id: `${industry.id}.${slug(capability)}`,
    name: `${industry.label} · ${capability}工厂`,
    industry: industry.label,
    industryColor: industry.color,
    capability,
    color: matrixCapabilityColors[capability] || industry.color,
    row,
    col,
    position: [(col - 3.5) * 9.6, 0, row * 7.8],
    match: Math.round(58 + ((row * 13 + col * 9) % 38)),
    credit: Math.round(72 + ((row * 11 + col * 7) % 25)),
    load: Math.round(18 + ((row * 17 + col * 13) % 66)),
    available: ((row + col) % 5) !== 0,
  }))
));

const matrixOpportunities = [
  {
    title: 'PFN MVP 临时公司',
    score: 96,
    demand: '一个早期创业者希望在 48 小时内完成 Personal Factory Network 演示原型、产品故事和首轮招募素材。',
    nodeIds: [
      'ai-software.qing-bao-yan-jiu',
      'ai-software.chan-pin-ce-lve',
      'ai-software.she-ji-yuan-xing',
      'ai-software.kai-fa-zhi-xing',
      'content-media.nei-rong-zeng-zhang',
      'enterprise-ops.jiao-fu-xin-yong',
    ],
    output: 'Personal Factory Network 演示原型、产品故事、发布素材和用户反馈闭环',
    revenue: '项目分成 / 模板订阅 / 能力调用',
  },
  {
    title: '客户需求洞察链',
    score: 92,
    demand: '一家企业持续收到客户反馈，但缺少自动化方式把需求、优先级、PRD 和交付复盘串起来。',
    nodeIds: [
      'enterprise-ops.shu-ju-jie-ru',
      'enterprise-ops.xu-qiu-dong-cha',
      'ai-software.chan-pin-ce-lve',
      'ai-software.kai-fa-zhi-xing',
      'enterprise-ops.jiao-fu-xin-yong',
    ],
    output: '客户需求地图、产品优先级、PRD 初稿和交付复盘',
    revenue: '企业运营服务 / 数据分析订阅',
  },
  {
    title: '电商内容增长链',
    score: 89,
    demand: '一个电商团队需要把选品数据、用户评论、内容脚本和投放复盘自动组织成可执行增长链路。',
    nodeIds: [
      'ecommerce.shu-ju-jie-ru',
      'ecommerce.xu-qiu-dong-cha',
      'content-media.qing-bao-yan-jiu',
      'content-media.nei-rong-zeng-zhang',
      'enterprise-ops.jiao-fu-xin-yong',
    ],
    output: '选品判断、内容脚本、投放复盘和复用素材库',
    revenue: '增长服务费 / 内容资产分成',
  },
];

const matrixStorySteps = [
  { label: '需求进入', status: '机会雷达捕获外部需求：正在解析意图、约束和预期产出。' },
  { label: '矩阵扫描', status: '矩阵扫描个人工厂能力、资源、信用和负载状态。' },
  { label: '能力匹配', status: '系统高亮最短可执行链路，过滤低信用或高负载节点。' },
  { label: '组建临时公司', status: '临时公司已生成：节点进入协作链路并开始交换任务。' },
  { label: '任务分工', status: '任务已分配回各个工厂，等待进入执行与资产沉淀。' },
];

const matrixStateNarrative = [
  { title: '外部需求入场', detail: '捕获目标、预算、期限、交付物和约束条件。', signal: 'INTENT' },
  { title: '全网能力扫描', detail: '读取每座工厂的能力、资源、负载和信用。', signal: 'SCAN' },
  { title: '供应链匹配', detail: '挑出可执行的节点组合，并压低非匹配节点噪声。', signal: 'MATCH' },
  { title: '临时公司成型', detail: '把候选节点升起，形成一次性协作组织。', signal: 'ORG' },
  { title: '任务回灌执行', detail: '分工回写到各工厂，等待执行和资产沉淀。', signal: 'RUN' },
];

const matrixCapabilityTasks = {
  '数据接入': '接入 API、客户反馈、文档和原始上下文，形成标准化需求包。',
  '情报研究': '补齐行业、竞品、技术和市场证据，输出判断依据。',
  '需求洞察': '聚类痛点、识别高价值场景，生成需求地图。',
  '产品策略': '拆解产品目标、版本范围、验收标准和路线优先级。',
  '设计原型': '生成关键交互、界面结构和演示动线。',
  '开发执行': '把方案转成可运行 demo、组件改造和测试闭环。',
  '内容增长': '生成发布文案、招募素材和传播脚本。',
  '交付信用': '记录交付结果、响应质量、复盘结论和信用评分。',
};

const materials = {
  base: new THREE.MeshStandardMaterial({ color: 0x1b2b43, roughness: 0.68, metalness: 0.2 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x121d2d, roughness: 0.74, metalness: 0.28 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x172133, roughness: 0.84, metalness: 0.08 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xb5e6ff, transparent: true, opacity: 0.36, roughness: 0.22, metalness: 0.05 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x304765, roughness: 0.46, metalness: 0.32 }),
  white: new THREE.MeshStandardMaterial({ color: 0xdce7f5, roughness: 0.6, metalness: 0.08 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xd5b85c, roughness: 0.62, metalness: 0.08 }),
  purple: new THREE.MeshStandardMaterial({ color: 0x9387d8, roughness: 0.62, metalness: 0.08 }),
  red: new THREE.MeshStandardMaterial({ color: 0xd97575, roughness: 0.62, metalness: 0.08 }),
};

function slug(value) {
  const map = {
    数据接入: 'shu-ju-jie-ru',
    情报研究: 'qing-bao-yan-jiu',
    需求洞察: 'xu-qiu-dong-cha',
    产品策略: 'chan-pin-ce-lve',
    设计原型: 'she-ji-yuan-xing',
    开发执行: 'kai-fa-zhi-xing',
    内容增长: 'nei-rong-zeng-zhang',
    交付信用: 'jiao-fu-xin-yong',
  };
  return map[value] || value.toLowerCase().replace(/\s+/g, '-');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]);
}

function createBox(size, position, material, parent, name) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name || 'matrix-box';
  parent.add(mesh);
  return mesh;
}

function createCylinder(radiusTop, radiusBottom, height, segments, material, position, parent, name, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name || 'matrix-cylinder';
  parent.add(mesh);
  return mesh;
}

function createMatrixMaterial(color, options = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.38,
    metalness: options.metalness ?? 0.06,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? (options.opacity !== undefined && options.opacity < 1),
    opacity: options.opacity ?? 1,
  });
  if (options.depthWrite === false) material.depthWrite = false;
  return material;
}

function setupLights() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.28));
  scene.add(new THREE.HemisphereLight(0xd8eaff, 0x182238, 2.2));

  const key = new THREE.DirectionalLight(0xd9ecff, 2.6);
  key.position.set(-24, 34, 18);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -62;
  key.shadow.camera.right = 62;
  key.shadow.camera.top = 62;
  key.shadow.camera.bottom = -62;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8fc7ff, 0.9);
  fill.position.set(26, 18, -22);
  scene.add(fill);

  const green = new THREE.PointLight(0x3ee898, 3.6, 105);
  green.position.set(0, 12, 18);
  scene.add(green);
}

function buildGround() {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(86, 0.18, 58), materials.floor);
  floor.position.set(0, -0.14, 19.6);
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(86, 32, 0x4b6687, 0x30435f);
  grid.position.set(0, 0.01, 19.6);
  scene.add(grid);

  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(86, 0.12, 58)),
    new THREE.LineBasicMaterial({ color: 0x3ee898, transparent: true, opacity: 0.34 })
  );
  border.position.copy(floor.position);
  scene.add(border);
}

function buildVisualGuides() {
  const railOptions = {
    roughness: 0.36,
    metalness: 0.16,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  };

  matrixCapabilities.forEach((capability, col) => {
    const x = (col - 3.5) * 9.6;
    const color = matrixCapabilityColors[capability] || 0x3cc8ff;
    const mat = createMatrixMaterial(color, {
      ...railOptions,
      emissive: color,
      emissiveIntensity: 0.34,
    });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 47.2), mat);
    rail.position.set(x, 0.05, 19.5);
    rail.userData = { type: 'capability-rail', phase: col * 0.18 };
    scene.add(rail);
    state.guideRails.push(rail);
  });

  matrixIndustries.forEach((industry, row) => {
    const mat = createMatrixMaterial(industry.color, {
      ...railOptions,
      emissive: industry.color,
      emissiveIntensity: 0.26,
      opacity: 0.2,
    });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(76, 0.03, 0.1), mat);
    rail.position.set(0, 0.06, row * 7.8);
    rail.userData = { type: 'industry-rail', phase: row * 0.28 };
    scene.add(rail);
    state.guideRails.push(rail);
  });

  const boundaryMat = createMatrixMaterial(0x3ee898, {
    emissive: 0x3ee898,
    emissiveIntensity: 1.1,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const boundary = new THREE.Mesh(new THREE.TorusGeometry(39.5, 0.055, 8, 128), boundaryMat);
  boundary.rotation.x = Math.PI / 2;
  boundary.position.set(0, 0.1, 19.5);
  boundary.userData = { type: 'matrix-boundary-ring', phase: 0 };
  scene.add(boundary);
  state.guideRails.push(boundary);
}

function buildDemandSignal() {
  const group = new THREE.Group();
  group.visible = false;
  group.position.set(-42, 1.25, -6);
  group.userData = {
    target: new THREE.Vector3(-42, 1.25, -6),
    phase: 0,
  };

  const coreMat = createMatrixMaterial(0xfff36a, {
    emissive: 0xffa940,
    emissiveIntensity: 1.4,
    roughness: 0.28,
    transparent: true,
    opacity: 0.96,
  });
  const shellMat = createMatrixMaterial(0x3cc8ff, {
    emissive: 0x3cc8ff,
    emissiveIntensity: 1.1,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const lineMat = createMatrixMaterial(0x3ee898, {
    emissive: 0x3ee898,
    emissiveIntensity: 1.6,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });

  const core = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.4, 0.52), coreMat);
  core.castShadow = true;
  core.name = 'incoming-demand-core';
  group.add(core);

  const shell = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.62, 0.82), shellMat);
  shell.name = 'incoming-demand-shell';
  group.add(shell);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.026, 8, 72), lineMat);
  ring.rotation.x = Math.PI / 2;
  ring.name = 'incoming-demand-scan-ring';
  group.add(ring);
  group.userData.ring = ring;

  scene.add(group);
  state.demandSignal = group;
}

function buildFactoryNode(node) {
  const group = new THREE.Group();
  group.position.set(...node.position);
  group.scale.setScalar(0.96);
  group.name = node.name;
  group.userData = { ...node, interactive: true, active: false, baseScale: 0.96, phase: node.row * 0.45 + node.col * 0.2 };

  const foundationMat = createMatrixMaterial(0x152238, {
    roughness: 0.52,
    metalness: 0.18,
    emissive: 0x07111f,
    emissiveIntensity: 0.14,
  });
  const platformMat = createMatrixMaterial(0x213754, {
    roughness: 0.44,
    metalness: 0.26,
    emissive: 0x0b1b2f,
    emissiveIntensity: 0.18,
  });
  const wallMat = createMatrixMaterial(0x324f72, {
    roughness: 0.4,
    metalness: 0.32,
    emissive: 0x0b1b2f,
    emissiveIntensity: 0.16,
  });
  const wallAltMat = createMatrixMaterial(0x27415f, {
    roughness: 0.42,
    metalness: 0.3,
    emissive: 0x0a192b,
    emissiveIntensity: 0.18,
  });
  const roofMat = createMatrixMaterial(0x486a91, {
    roughness: 0.32,
    metalness: 0.46,
    emissive: 0x102942,
    emissiveIntensity: 0.18,
  });
  const frameMat = createMatrixMaterial(0x8fb1c9, {
    roughness: 0.28,
    metalness: 0.62,
    emissive: 0x142d45,
    emissiveIntensity: 0.16,
  });
  const glassMat = createMatrixMaterial(0x9be8ff, {
    roughness: 0.12,
    transparent: true,
    opacity: 0.44,
    emissive: 0x31bde8,
    emissiveIntensity: 0.48,
    depthWrite: false,
  });
  const roofLineMat = createMatrixMaterial(0xc4d9ea, {
    roughness: 0.24,
    metalness: 0.58,
    transparent: true,
    opacity: 0.94,
  });
  const accentMat = createMatrixMaterial(node.color, {
    emissive: node.color,
    emissiveIntensity: 0.82,
    transparent: true,
    opacity: 0.9,
  });

  const addPart = (size, position, material, name, role = 'body') => {
    const part = createBox(size, position, material, group, name);
    part.userData = { matrixRole: role, matrixNodeId: node.id };
    return part;
  };
  const addCylinder = (radiusTop, radiusBottom, height, segments, material, position, name, rotation = [0, 0, 0], role = 'detail') => {
    const part = createCylinder(radiusTop, radiusBottom, height, segments, material, position, group, name, rotation);
    part.userData = { matrixRole: role, matrixNodeId: node.id, phase: node.row * 0.7 + node.col * 0.33 };
    return part;
  };

  addPart([5.35, 0.18, 3.2], [0, 0.08, 0], foundationMat, 'foundation-pad', 'pad');
  addPart([4.85, 0.08, 2.78], [0.04, 0.22, 0.04], platformMat, 'upper-platform', 'pad');

  for (let i = -2; i <= 2; i += 1) {
    addPart([0.026, 0.025, 2.55], [i * 0.56, 0.29, 0.04], frameMat, 'floor-grid-x', 'floor-line');
    if (Math.abs(i) <= 1) {
      addPart([4.55, 0.025, 0.026], [0.04, 0.3, i * 0.58], frameMat, 'floor-grid-z', 'floor-line');
    }
  }

  addPart([1.62, 1.02, 1.32], [-0.58, 0.82, -0.06], wallMat, 'main-production-block', 'body');
  addPart([0.96, 0.72, 1.04], [0.76, 0.64, 0.2], wallAltMat, 'side-service-block', 'body');
  addPart([0.56, 1.28, 0.56], [-1.58, 0.9, 0.58], glassMat, 'glass-core', 'glass');
  addPart([0.9, 0.54, 0.055], [-0.58, 0.88, -0.75], glassMat, 'front-glass-strip', 'glass');
  addPart([0.055, 0.46, 0.78], [0.18, 0.76, -0.05], glassMat, 'side-glass-strip', 'glass');
  addPart([2.48, 0.12, 1.86], [-0.44, 1.42, -0.04], roofMat, 'main-roof-slab', 'roof');
  addPart([0.98, 0.1, 1.18], [0.76, 1.08, 0.2], roofMat, 'service-roof-slab', 'roof');

  for (let i = -2; i <= 2; i += 1) {
    addPart([0.035, 0.04, 1.72], [-0.46 + i * 0.34, 1.51, -0.05], roofLineMat, 'roof-long-rib', 'roof');
  }
  for (let i = -1; i <= 1; i += 1) {
    addPart([2.22, 0.04, 0.035], [-0.46, 1.53, -0.05 + i * 0.48], roofLineMat, 'roof-cross-rib', 'roof');
  }

  [
    [-1.72, 0.84, -0.88],
    [0.74, 0.84, -0.88],
    [-1.72, 0.84, 0.94],
    [0.74, 0.84, 0.94],
  ].forEach((position, index) => {
    addPart([0.08, 1.22, 0.08], position, frameMat, `factory-corner-column-${index}`, 'frame');
  });

  addPart([1.08, 0.2, 0.56], [2.22, 0.42, -0.9], wallAltMat, 'external-module', 'body');
  addPart([1.32, 0.08, 0.72], [2.28, 0.27, -0.9], platformMat, 'external-module-pad', 'pad');
  addPart([0.48, 0.32, 0.42], [2.28, 0.68, -0.9], accentMat, 'capability-reactor', 'accent');
  addCylinder(0.045, 0.045, 2.2, 12, accentMat, [1.34, 0.45, -0.9], 'capability-pipe', [0, 0, Math.PI / 2], 'accent');
  addCylinder(0.16, 0.16, 0.72, 16, wallAltMat, [-2.16, 0.62, -0.75], 'left-storage-tank', [0, 0, 0], 'body');
  addCylinder(0.11, 0.11, 0.92, 16, glassMat, [-2.46, 0.7, -0.58], 'glass-observation-tank', [0, 0, 0], 'glass');

  [-0.2, 0.28, 0.76].forEach((x, index) => {
    addPart([0.06, 0.42, 0.06], [x, 0.58, 1.22], frameMat, `rear-utility-post-${index}`, 'frame');
  });
  addPart([1.1, 0.05, 0.05], [0.28, 0.82, 1.22], frameMat, 'rear-utility-rail', 'frame');

  if (node.capability === '数据接入') {
    addCylinder(0.18, 0.18, 0.055, 18, accentMat, [1.58, 1.08, 0.82], 'data-dish', [Math.PI / 2, 0.25, 0], 'accent');
    addCylinder(0.026, 0.026, 0.9, 8, frameMat, [1.58, 0.76, 0.82], 'data-antenna', [0, 0, 0], 'frame');
  } else if (node.capability === '情报研究') {
    addCylinder(0.09, 0.11, 1.18, 10, frameMat, [1.42, 1.02, 0.72], 'observation-tower', [0, 0, 0], 'frame');
    addPart([0.48, 0.18, 0.48], [1.42, 1.68, 0.72], glassMat, 'observation-room', 'glass');
  } else if (node.capability === '需求洞察') {
    addPart([0.66, 0.5, 0.66], [1.38, 0.78, 0.78], glassMat, 'insight-core', 'glass');
    addPart([0.44, 0.06, 0.44], [1.38, 1.08, 0.78], accentMat, 'insight-cap', 'accent');
  } else if (node.capability === '产品策略') {
    addPart([0.74, 0.42, 0.08], [1.38, 0.82, 0.86], accentMat, 'strategy-board', 'accent');
    addPart([0.12, 0.56, 0.08], [0.92, 0.76, 0.86], frameMat, 'strategy-board-stand', 'frame');
  } else if (node.capability === '设计原型') {
    addPart([0.7, 0.08, 0.78], [-0.44, 1.62, -0.04], glassMat, 'prototype-skylight', 'glass');
    addPart([0.28, 0.2, 0.28], [1.3, 0.58, 0.9], accentMat, 'prototype-printer', 'accent');
  } else if (node.capability === '开发执行') {
    addPart([1.28, 0.08, 0.26], [1.25, 0.54, 0.92], frameMat, 'dev-bench', 'frame');
    addPart([0.24, 0.18, 0.22], [0.82, 0.68, 0.92], accentMat, 'dev-unit-a', 'accent');
    addPart([0.24, 0.18, 0.22], [1.52, 0.68, 0.92], accentMat, 'dev-unit-b', 'accent');
  } else if (node.capability === '内容增长') {
    addCylinder(0.025, 0.025, 1.18, 8, frameMat, [1.5, 1.08, 0.84], 'broadcast-mast', [0, 0, 0], 'frame');
    addPart([0.52, 0.08, 0.24], [1.5, 1.62, 0.84], accentMat, 'broadcast-panel', 'accent');
  } else if (node.capability === '交付信用') {
    addPart([0.72, 0.5, 0.68], [1.38, 0.78, 0.76], wallAltMat, 'credit-vault', 'body');
    addPart([0.54, 0.06, 0.5], [1.38, 1.08, 0.76], accentMat, 'credit-seal', 'accent');
  }

  addPart([0.46, 0.08, 0.34], [1.76, 0.36, -1.08], platformMat, 'signal-base', 'signal-base');
  addCylinder(0.018, 0.018, 0.72, 8, frameMat, [1.76, 0.78, -1.08], 'signal-mast', [0, 0, 0], 'frame');
  addPart([0.16, 0.44, 0.12], [1.76, 1.2, -1.08], wallAltMat, 'signal-housing', 'signal-housing');
  [0xffc14a, 0x3cc8ff, 0x2df29a].forEach((color, index) => {
    const lensMat = createMatrixMaterial(color, {
      emissive: color,
      emissiveIntensity: index === 2 ? 2.2 : 0.5,
      transparent: true,
      opacity: index === 2 ? 0.95 : 0.5,
    });
    const lens = addCylinder(0.05, 0.05, 0.028, 16, lensMat, [1.76, 1.08 + index * 0.13, -1.15], `signal-lens-${index}`, [Math.PI / 2, 0, 0], index === 2 ? 'beacon' : 'signal-lens');
    lens.userData.phase = node.row * 0.7 + node.col * 0.33 + index * 0.2;
    if (index === 2) state.signalLights.push(lens);
  });

  const haloMat = createMatrixMaterial(0x3ee898, {
    emissive: 0x3ee898,
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.04, 8, 96), haloMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 0.38, 0);
  halo.visible = false;
  halo.userData = { matrixRole: 'route-halo', matrixNodeId: node.id };
  group.add(halo);

  const beamMat = createMatrixMaterial(node.color, {
    emissive: node.color,
    emissiveIntensity: 2.4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.4, 16), beamMat);
  beam.position.set(0, 2.35, 0);
  beam.visible = false;
  beam.userData = { matrixRole: 'route-beam', matrixNodeId: node.id };
  group.add(beam);

  group.userData.halo = halo;
  group.userData.beam = beam;

  scene.add(group);
  state.nodes.push(group);
  return group;
}

function createRouteBand(start, end, opportunityIndex, segmentIndex) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const material = createMatrixMaterial(0x3ee898, {
    emissive: 0x3ee898,
    emissiveIntensity: 1.35,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, length, 16), material);
  band.position.copy(midpoint);
  band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  band.visible = false;
  band.userData = { opportunityIndex, phase: segmentIndex * 0.4, type: 'route-band' };
  scene.add(band);
  return band;
}

function buildLinks() {
  matrixOpportunities.forEach((opportunity, opportunityIndex) => {
    const points = opportunity.nodeIds
      .map(id => state.nodes.find(node => node.userData.id === id))
      .filter(Boolean)
      .map(node => new THREE.Vector3(node.position.x, 0.62, node.position.z));

    for (let i = 0; i < points.length - 1; i += 1) {
      const routeBand = createRouteBand(points[i], points[i + 1], opportunityIndex, i);
      state.links.push(routeBand);

      const packet = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.24, 0.42),
        new THREE.MeshStandardMaterial({
          color: 0xfff36a,
          emissive: 0xffa940,
          emissiveIntensity: 0.7,
          roughness: 0.42,
        })
      );
      packet.visible = false;
      packet.userData = { opportunityIndex, from: points[i], to: points[i + 1], phase: i / Math.max(points.length - 1, 1) };
      packet.castShadow = true;
      scene.add(packet);
      state.packets.push(packet);
    }
  });
}

function getNodeById(id) {
  return matrixFactoryNodes.find(node => node.id === id);
}

function getRouteLabel(opportunity) {
  return opportunity.nodeIds.map(id => {
    const node = getNodeById(id);
    return node ? `${node.industry}/${node.capability}` : id;
  }).join(' → ');
}

function activeIds() {
  return new Set(matrixOpportunities[state.activeOpportunity]?.nodeIds || []);
}

function getSceneNodeById(id) {
  return state.nodes.find(node => node.userData.id === id) || null;
}

function getProfileNode() {
  if (state.selectedNodeId) {
    const selected = getNodeById(state.selectedNodeId);
    if (selected) return selected;
  }
  const routeNode = matrixOpportunities[state.activeOpportunity]?.nodeIds?.[0];
  return routeNode ? getNodeById(routeNode) : null;
}

function getNodeRoleLabel(node) {
  const index = matrixOpportunities[state.activeOpportunity]?.nodeIds?.indexOf(node.id) ?? -1;
  if (index >= 0) return `当前链路第 ${index + 1} 节点`;
  return '网络候选工厂';
}

function getFactoryInputs(node) {
  const base = {
    数据接入: ['API', '客户反馈', '原始资料'],
    情报研究: ['行业报告', '竞品动态', '证据源'],
    需求洞察: ['用户访谈', '痛点线索', '工单记录'],
    产品策略: ['目标约束', '路线图', '验收标准'],
    设计原型: ['交互草图', '品牌素材', '界面参考'],
    开发执行: ['代码仓库', '技术方案', '测试清单'],
    内容增长: ['发布渠道', '素材库', '用户反馈'],
    交付信用: ['复盘记录', '验收结果', '信用分'],
  };
  return base[node.capability] || ['资料', '资源', '上下文'];
}

function getAssignments(opportunity) {
  return opportunity.nodeIds.map((id, index) => {
    const node = getNodeById(id);
    if (!node) return null;
    return {
      step: index + 1,
      title: `${node.industry} · ${node.capability}`,
      task: matrixCapabilityTasks[node.capability] || `${node.capability} 能力执行与交付。`,
      credit: node.credit,
      load: node.load,
      available: node.available,
    };
  }).filter(Boolean);
}

function setStatus(message) {
  document.getElementById('matrix-status').textContent = message;
}

function updateDemandSignal() {
  if (!state.demandSignal) return;
  const signal = state.demandSignal;
  signal.visible = state.radarActive;
  if (!state.radarActive) return;

  const opportunity = matrixOpportunities[state.activeOpportunity];
  const routeNodes = opportunity.nodeIds.map(getSceneNodeById).filter(Boolean);
  const first = routeNodes[0];
  const last = routeNodes[routeNodes.length - 1];
  const routeCenter = routeNodes.reduce((sum, node) => sum.add(node.position), new THREE.Vector3()).divideScalar(Math.max(routeNodes.length, 1));
  const targets = [
    new THREE.Vector3(-42, 1.25, -6),
    new THREE.Vector3(-18, 1.55, 11),
    first ? first.position.clone().add(new THREE.Vector3(0, 2.0, 0)) : new THREE.Vector3(-12, 1.7, 8),
    routeCenter.clone().add(new THREE.Vector3(0, 2.5, 0)),
    last ? last.position.clone().add(new THREE.Vector3(0, 2.0, 0)) : routeCenter.clone().add(new THREE.Vector3(0, 2.2, 0)),
  ];
  signal.userData.target.copy(targets[state.storyStep] || targets[0]);
}

function renderStateFlow() {
  const flow = document.getElementById('state-flow');
  if (!flow) return;
  flow.innerHTML = matrixStateNarrative.map((item, index) => {
    const active = index === state.storyStep ? ' active' : '';
    const done = index < state.storyStep ? ' done' : '';
    return `
      <button class="state-item${active}${done}" type="button" data-story-step="${index}" aria-pressed="${index === state.storyStep}">
        <span class="state-index">${String(index + 1).padStart(2, '0')}</span>
        <span class="state-copy">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.detail)}</span>
        </span>
        <span class="state-signal">${escapeHtml(item.signal)}</span>
      </button>
    `;
  }).join('');

  flow.querySelectorAll('[data-story-step]').forEach(button => {
    button.addEventListener('click', () => {
      jumpToStoryStep(Number(button.dataset.storyStep));
    });
  });
}

function renderNodeProfile() {
  const profile = document.getElementById('node-profile');
  if (!profile) return;
  const node = getProfileNode();
  if (!node) {
    profile.className = 'node-profile placeholder';
    profile.innerHTML = `
      <div class="node-profile-kicker">FACTORY PROFILE</div>
      <h3>等待选择工厂节点</h3>
      <p>点击 3D 工厂，右侧会显示该工厂的能力、资源、需求、信用和当前负载。</p>
    `;
    return;
  }

  const inRoute = activeIds().has(node.id);
  const selected = state.selectedNodeId === node.id;
  const statusClass = node.available ? 'available' : 'busy';
  const statusText = node.available ? '可接入' : '高负载';
  const chips = getFactoryInputs(node);
  profile.className = 'node-profile';
  profile.innerHTML = `
    <div class="node-profile-kicker">FACTORY PROFILE</div>
    <h3>${escapeHtml(node.name)}</h3>
    <div class="node-profile-meta">
      <span>${escapeHtml(getNodeRoleLabel(node))}</span>
      <span>${escapeHtml(node.industry)}</span>
      <span>${escapeHtml(node.capability)}</span>
      <span class="${statusClass}">${statusText}</span>
      ${selected ? '<span class="available">已选中</span>' : ''}
      ${inRoute ? '<span class="available">匹配链中</span>' : ''}
    </div>
    <div class="node-metrics">
      <div class="node-metric"><span>匹配度</span><strong>${node.match}%</strong></div>
      <div class="node-metric"><span>信用</span><strong>${node.credit}</strong></div>
      <div class="node-metric"><span>负载</span><strong>${node.load}%</strong></div>
    </div>
    <p>${escapeHtml(matrixCapabilityTasks[node.capability] || '执行当前能力节点对应的协作任务。')}</p>
    <div class="node-chip-row">
      ${chips.map(chip => `<span class="node-chip">${escapeHtml(chip)}</span>`).join('')}
    </div>
  `;
}

function renderStory() {
  const opportunity = matrixOpportunities[state.activeOpportunity];
  document.getElementById('story-title').textContent = opportunity.title;
  document.getElementById('story-score').textContent = `${opportunity.score}%`;
  document.getElementById('story-demand').textContent = opportunity.demand;
  document.getElementById('story-steps').innerHTML = matrixStorySteps.map((step, index) => {
    const active = index === state.storyStep ? ' active' : '';
    const done = index < state.storyStep ? ' done' : '';
    return `<span class="story-step${active}${done}">${escapeHtml(step.label)}</span>`;
  }).join('');

  const teamPlan = document.getElementById('team-plan');
  const assignments = getAssignments(opportunity);
  teamPlan.innerHTML = `
    <div class="team-head">
      <span>临时公司任务分工</span>
      <strong>${assignments.length} 个节点</strong>
    </div>
    ${assignments.map(item => `
      <div class="team-row${item.available ? '' : ' is-busy'}">
        <em>${String(item.step).padStart(2, '0')}</em>
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.task)}</span>
        </div>
        <b>${item.credit} / ${item.load}%</b>
      </div>
    `).join('')}
  `;
  teamPlan.classList.toggle('active', state.companyMode || state.storyStep >= 3);
  renderStateFlow();
  renderNodeProfile();
}

function renderOpportunities() {
  const list = document.getElementById('opportunity-list');
  list.innerHTML = matrixOpportunities.map((item, index) => {
    const active = index === state.activeOpportunity ? ' active' : '';
    return `
      <button class="opportunity-btn${active}" type="button" data-opportunity="${index}">
        <span class="opportunity-head"><strong>${escapeHtml(item.title)}</strong><em>${item.score}%</em></span>
        <span>${escapeHtml(getRouteLabel(item))}</span>
        <small>${escapeHtml(item.output)}</small>
        <b>${escapeHtml(item.revenue)}</b>
      </button>
    `;
  }).join('');

  list.querySelectorAll('[data-opportunity]').forEach(button => {
    button.addEventListener('click', () => {
      clearStoryTimers();
      state.activeOpportunity = Number(button.dataset.opportunity);
      state.radarActive = true;
      state.scanned = true;
      state.companyMode = false;
      state.storyStep = 2;
      state.selectedNodeId = matrixOpportunities[state.activeOpportunity]?.nodeIds?.[0] || null;
      applyActiveOpportunity();
      setStatus(`已高亮匹配链：${matrixOpportunities[state.activeOpportunity].title}`);
    });
  });
}

function setStoryStep(index, message) {
  state.storyStep = THREE.MathUtils.clamp(index, 0, matrixStorySteps.length - 1);
  state.radarActive = true;
  updateDemandSignal();
  renderStory();
  setStatus(message || matrixStorySteps[state.storyStep].status);
}

function jumpToStoryStep(index) {
  clearStoryTimers();
  state.storyStep = THREE.MathUtils.clamp(index, 0, matrixStorySteps.length - 1);
  state.radarActive = true;
  state.scanned = state.storyStep >= 1;
  state.companyMode = state.storyStep >= 3;
  if (state.storyStep >= 2 && !state.selectedNodeId) {
    state.selectedNodeId = matrixOpportunities[state.activeOpportunity]?.nodeIds?.[0] || null;
  }
  applyActiveOpportunity();
  setStatus(matrixStorySteps[state.storyStep].status);
}

function applyActiveOpportunity() {
  const ids = activeIds();
  const focusMode = state.radarActive || state.scanned || state.companyMode || Boolean(state.selectedNodeId);
  state.nodes.forEach(node => {
    const active = ids.has(node.userData.id) && (state.radarActive || state.scanned || state.companyMode);
    const selected = state.selectedNodeId === node.userData.id;
    const highlighted = active || selected;
    node.userData.active = active;
    node.userData.selected = selected;
    const scale = state.companyMode && active ? 1.34 : active ? 1.16 : selected ? 1.12 : node.userData.baseScale;
    node.scale.setScalar(scale);
    node.position.y = active ? (state.companyMode ? 0.68 : 0.55) : selected ? 0.34 : 0;
    if (node.userData.halo) {
      node.userData.halo.visible = (active && state.scanned) || selected;
      node.userData.halo.material.opacity = selected ? 0.56 : state.companyMode ? 0.72 : active && state.scanned ? 0.45 : 0;
    }
    if (node.userData.beam) {
      node.userData.beam.visible = active && state.companyMode;
      node.userData.beam.material.opacity = active && state.companyMode ? 0.46 : 0;
    }
    node.traverse(child => {
      if (!child.material) return;
      const role = child.userData?.matrixRole || 'body';
      if (child.userData.baseOpacity === undefined && child.material.opacity !== undefined) {
        child.userData.baseOpacity = child.material.opacity;
      }
      if (child.userData.baseEmissiveIntensity === undefined && child.material.emissiveIntensity !== undefined) {
        child.userData.baseEmissiveIntensity = child.material.emissiveIntensity;
      }
      if (!child.userData.baseColor && child.material.color) {
        child.userData.baseColor = child.material.color.clone();
      }
      if (child.material.color && child.userData.baseColor) {
        child.material.color.copy(child.userData.baseColor);
        if (highlighted && role !== 'route-halo' && role !== 'route-beam') {
          child.material.color.lerp(new THREE.Color(active ? 0xffffff : 0x8fdcff), active ? 0.12 : 0.16);
        } else if (focusMode && role !== 'route-halo' && role !== 'route-beam') {
          child.material.color.lerp(new THREE.Color(0x07111d), 0.46);
        }
      }
      if (child.material.emissiveIntensity !== undefined) {
        if (role === 'accent' || role === 'beacon') {
          child.material.emissiveIntensity = active ? 2.4 : selected ? 1.7 : focusMode ? child.userData.baseEmissiveIntensity * 0.35 : child.userData.baseEmissiveIntensity;
        } else if (role === 'glass') {
          child.material.emissiveIntensity = active ? 0.62 : selected ? 0.54 : focusMode ? child.userData.baseEmissiveIntensity * 0.55 : child.userData.baseEmissiveIntensity;
        } else {
          child.material.emissiveIntensity = highlighted ? child.userData.baseEmissiveIntensity * 1.25 : focusMode ? child.userData.baseEmissiveIntensity * 0.45 : child.userData.baseEmissiveIntensity;
        }
      }
      if (child.material.opacity !== undefined && child.material.transparent) {
        if (role === 'accent' || role === 'beacon') {
          child.material.opacity = active ? 1 : selected ? 0.95 : focusMode ? child.userData.baseOpacity * 0.62 : child.userData.baseOpacity;
        } else if (role === 'glass') {
          child.material.opacity = active ? 0.58 : selected ? 0.52 : focusMode ? child.userData.baseOpacity * 0.72 : child.userData.baseOpacity;
        } else {
          child.material.opacity = highlighted || !focusMode ? child.userData.baseOpacity : child.userData.baseOpacity * 0.6;
        }
      }
    });
  });

  state.links.forEach(link => {
    const active = link.userData.opportunityIndex === state.activeOpportunity;
    link.visible = active && state.scanned;
    link.material.opacity = active ? (state.companyMode ? 0.82 : 0.5) : 0;
  });

  state.packets.forEach(packet => {
    packet.visible = packet.userData.opportunityIndex === state.activeOpportunity && state.companyMode;
  });

  updateDemandSignal();
  renderStory();
  renderOpportunities();
}

function clearStoryTimers() {
  state.storyTimers.forEach(timer => clearTimeout(timer));
  state.storyTimers = [];
}

function runOpportunityRadar(index = 0) {
  clearStoryTimers();
  state.activeOpportunity = THREE.MathUtils.clamp(index, 0, matrixOpportunities.length - 1);
  state.radarActive = true;
  state.scanned = false;
  state.companyMode = false;
  state.selectedNodeId = null;
  applyActiveOpportunity();
  setStoryStep(0);
  document.getElementById('matrix-auto-run').classList.add('active');

  const schedule = (delay, action) => {
    const timer = setTimeout(action, delay);
    state.storyTimers.push(timer);
  };

  schedule(900, () => {
    state.scanned = true;
    state.companyMode = false;
    applyActiveOpportunity();
    setStoryStep(1);
  });
  schedule(1900, () => {
    const opportunity = matrixOpportunities[state.activeOpportunity];
    applyActiveOpportunity();
    setStoryStep(2, `已匹配 ${opportunity.nodeIds.length} 个节点：${getRouteLabel(opportunity)}`);
  });
  schedule(3100, () => {
    const opportunity = matrixOpportunities[state.activeOpportunity];
    state.companyMode = true;
    applyActiveOpportunity();
    setStoryStep(3, `临时公司已生成：${opportunity.title}`);
  });
  schedule(4300, () => {
    const opportunity = matrixOpportunities[state.activeOpportunity];
    state.companyMode = true;
    applyActiveOpportunity();
    setStoryStep(4, `任务分工已下发：${opportunity.output}`);
  });
}

function setupInteractions() {
  document.getElementById('matrix-auto-run').addEventListener('click', () => {
    runOpportunityRadar(state.activeOpportunity);
  });
  document.getElementById('matrix-scan').addEventListener('click', () => {
    clearStoryTimers();
    state.radarActive = true;
    state.scanned = true;
    state.companyMode = false;
    state.activeOpportunity = 0;
    state.selectedNodeId = matrixOpportunities[state.activeOpportunity]?.nodeIds?.[0] || null;
    applyActiveOpportunity();
    setStoryStep(1, '矩阵扫描完成：发现 126 个撮合机会、7 条高价值供应链。');
  });
  document.getElementById('matrix-highlight').addEventListener('click', () => {
    clearStoryTimers();
    state.activeOpportunity = (state.activeOpportunity + 1) % matrixOpportunities.length;
    state.radarActive = true;
    state.scanned = true;
    state.companyMode = false;
    state.selectedNodeId = matrixOpportunities[state.activeOpportunity]?.nodeIds?.[0] || null;
    applyActiveOpportunity();
    setStoryStep(2, `已高亮匹配链：${matrixOpportunities[state.activeOpportunity].title}`);
  });
  document.getElementById('matrix-company').addEventListener('click', () => {
    clearStoryTimers();
    state.radarActive = true;
    state.scanned = true;
    state.companyMode = true;
    state.selectedNodeId = matrixOpportunities[state.activeOpportunity]?.nodeIds?.[0] || null;
    applyActiveOpportunity();
    setStoryStep(3, `临时公司已生成：${matrixOpportunities[state.activeOpportunity].title}`);
  });

  window.addEventListener('pointermove', event => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(state.nodes, true);
    let node = hits[0]?.object;
    while (node && !node.userData?.interactive) node = node.parent;
    if (state.hoveredNode && state.hoveredNode !== node && !state.hoveredNode.userData.active && !state.hoveredNode.userData.selected) {
      state.hoveredNode.scale.setScalar(state.hoveredNode.userData.baseScale || 0.96);
    }
    if (node && !node.userData.active && !node.userData.selected) node.scale.setScalar(1.08);
    state.hoveredNode = node || null;
  });

  window.addEventListener('click', event => {
    if (event.target.closest('button') || event.target.closest('a') || event.target.closest('aside') || event.target.closest('header')) return;
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(state.nodes, true);
    let node = hits[0]?.object;
    while (node && !node.userData?.interactive) node = node.parent;
    if (!node) return;
    state.selectedNodeId = node.userData.id;
    const found = matrixOpportunities.findIndex(item => item.nodeIds.includes(node.userData.id));
    if (found >= 0) {
      clearStoryTimers();
      state.activeOpportunity = found;
      state.radarActive = true;
      state.scanned = true;
      state.companyMode = false;
      applyActiveOpportunity();
      setStoryStep(2, `节点进入候选链：${node.userData.industry} / ${node.userData.capability}`);
    } else {
      applyActiveOpportunity();
      setStatus(`已选中工厂节点：${node.userData.industry} / ${node.userData.capability}`);
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  controls.update();

  state.nodes.forEach(node => {
    if (!node.userData.active) return;
    node.position.y += (0.55 + Math.sin(t * 2.3 + node.userData.row) * 0.04 - node.position.y) * 0.08;
  });

  state.links.forEach(link => {
    if (link.visible) {
      link.material.opacity = (state.companyMode ? 0.65 : 0.4) + Math.sin(t * 2 + link.userData.phase) * 0.06;
    }
  });

  state.packets.forEach(packet => {
    if (!packet.visible) return;
    const progress = (t * 0.18 + packet.userData.phase) % 1;
    packet.position.lerpVectors(packet.userData.from, packet.userData.to, progress);
    packet.position.y = 0.8 + Math.sin(progress * Math.PI) * 0.2;
  });

  state.guideRails.forEach(rail => {
    if (!rail.material || rail.material.opacity === undefined) return;
    const base = rail.userData.type === 'industry-rail' ? 0.18 : rail.userData.type === 'matrix-boundary-ring' ? 0.34 : 0.24;
    rail.material.opacity = base + Math.sin(t * 1.5 + rail.userData.phase) * 0.035;
  });

  state.nodes.forEach(node => {
    if (node.userData.halo?.visible) {
      node.userData.halo.rotation.z += 0.012;
      node.userData.halo.material.opacity = (state.companyMode ? 0.68 : 0.42) + Math.sin(t * 2.6 + node.userData.phase) * 0.08;
    }
    if (node.userData.beam?.visible) {
      node.userData.beam.material.opacity = 0.36 + Math.sin(t * 3.4 + node.userData.phase) * 0.08;
    }
  });

  state.signalLights.forEach(light => {
    const pulse = 1.7 + Math.sin(t * 3.2 + light.userData.phase) * 0.55;
    light.material.emissiveIntensity = light.parent?.userData?.active ? pulse + 0.9 : pulse;
  });

  if (state.demandSignal?.visible) {
    state.demandSignal.position.lerp(state.demandSignal.userData.target, 0.08);
    state.demandSignal.rotation.y += 0.014;
    state.demandSignal.rotation.z = Math.sin(t * 1.8) * 0.08;
    const ring = state.demandSignal.userData.ring;
    if (ring) {
      ring.rotation.z -= 0.028;
      const pulse = 1 + Math.sin(t * 3.4) * 0.16;
      ring.scale.setScalar(pulse);
      ring.material.opacity = 0.38 + Math.sin(t * 2.8) * 0.12;
    }
  }

  renderer.render(scene, camera);
}

function init() {
  setupLights();
  buildGround();
  buildVisualGuides();
  buildDemandSignal();
  matrixFactoryNodes.forEach(buildFactoryNode);
  buildLinks();
  setupInteractions();
  applyActiveOpportunity();
  setStatus('矩阵子页面已启动，等待机会雷达扫描。');

  if (new URLSearchParams(window.location.search).get('radar') === '1') {
    setTimeout(() => runOpportunityRadar(0), 500);
  }

  animate();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
