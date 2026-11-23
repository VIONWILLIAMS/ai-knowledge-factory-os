/* ============================================================
   AI Knowledge Factory OS — Core 3D Engine
   Three.js r160 · Modular · Production-Ready
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';

const FACTORY_FOOTPRINT_SIZE = 50;
const TWIN_FACTORY_GAP = 18;
const TWIN_FACTORY_OFFSET_X = FACTORY_FOOTPRINT_SIZE + TWIN_FACTORY_GAP;
const TWIN_FACTORY_CENTER_X = TWIN_FACTORY_OFFSET_X * 0.5;
const PAGE_PARAMS = new URLSearchParams(window.location.search);
const IS_GITHUB_PAGES = window.location.hostname.endsWith('.github.io');
const FACTORY_SHOWCASE_MODE = PAGE_PARAMS.get('showcase') === '1';
const FACTORY_SOLO_SHOWCASE_MODE = FACTORY_SHOWCASE_MODE && PAGE_PARAMS.get('solo') === '1';
const FACTORY_VERSION_IDS = new Set(['original', '1.1', '1.2', '1.3', '1.4']);
const requestedFactoryVersion = PAGE_PARAMS.get('version') || '1.1';
const FACTORY_SHOWCASE_VERSION = FACTORY_VERSION_IDS.has(requestedFactoryVersion)
  ? requestedFactoryVersion
  : '1.1';
const FACTORY_VERSION_META = {
  original: {
    title: 'ORIGINAL MIRROR',
    subtitle: '原工厂 1:1 镜像 · 无演进增量',
  },
  '1.1': {
    title: 'v1.1 · PROTOCOL LOOP',
    subtitle: '接收 / 决策 / 生产 / 交付闭环',
  },
  '1.2': {
    title: 'v1.2 · DELTA SLOT',
    subtitle: '继承 v1.1 · 等待下一轮结构增量',
  },
  '1.3': {
    title: 'v1.3 · DELTA SLOT',
    subtitle: '继承 v1.1 · 等待地标与灯光增量',
  },
  '1.4': {
    title: 'v1.4 · DELTA SLOT',
    subtitle: '继承 v1.1 · 等待最终主视觉增量',
  },
};
document.body.classList.toggle('factory-showcase-mode', FACTORY_SHOWCASE_MODE);
document.body.classList.toggle('factory-solo-showcase-mode', FACTORY_SOLO_SHOWCASE_MODE);
document.body.dataset.factoryVersion = FACTORY_SHOWCASE_VERSION;
document.body.dataset.cameraView = FACTORY_SOLO_SHOWCASE_MODE ? 'single' : 'dual';

// ─────────────────────────────────────
// STATE
// ─────────────────────────────────────
const state = {
  animationActive: true,
  nightMode: false,
  lightMode: false,
  wireframeMode: false,
  cruiseMode: false,
  textLayerVisible: true,
  textLayers: {
    l1: true,
    l2: true,
    l3: true,
    l4: true,
    l5: true,
    l6: true,
    l7: true,
    l8: true,
  },
  clock: new THREE.Clock(),
  fpsFrames: 0,
  fpsTime: 0,
  startTime: Date.now() - 127 * 3600000,
  // Arrays for animated objects
  agvBots: [],
  amrBots: [],
  conveyorRollers: [],
  conveyorSurfaces: [],
  conveyorTracks: [],
  signalLights: [],
  pathNodes: [],
  knowledgeAssets: [],
  // Synthetic autonomous-ops data for the 7*24 factory prototype
  ops: {
    cycle: 127,
    heartbeatOnline: 10,
    heartbeatTotal: 10,
    backlog: 42,
    activeJobs: 19,
    blockedTasks: 3,
    outputsToday: 18,
    interventionRequests: 2,
    agentLoad: 72,
    lastRender: 0,
  },
  agents: [
    { id: 'A01', role: 'Ingest Agent', status: 'running', task: '监听输入箱并建立任务实例', load: 64, success: 98, output: '9 个新资料已入队' },
    { id: 'A02', role: 'Parse Agent', status: 'running', task: '解析 PDF / 网页 / 会议纪要', load: 78, success: 95, output: '12 个结构化片段' },
    { id: 'A03', role: 'QA Agent', status: 'blocked', task: '处理互斥引用与缺来源资产', load: 88, success: 91, output: '2 个待人工确认' },
    { id: 'A04', role: 'Refinery Agent', status: 'running', task: '摘要 / chunk / 标签 / 实体抽取', load: 74, success: 96, output: '37 个可召回 chunk' },
    { id: 'A05', role: 'Memory Agent', status: 'idle', task: '长期记忆候选复核', load: 41, success: 97, output: '3 个高价值资产入冷链' },
    { id: 'A06', role: 'Action Agent', status: 'running', task: '生成行动卡与项目推进建议', load: 69, success: 94, output: '5 张行动卡已生成' },
  ],
  outputs: [
    { type: 'ACTION', name: '3D 学习行动卡', detail: '下一步聚焦 WebGPU 粒子系统，验收为完成 1 个 compute demo。', status: 'ready' },
    { type: 'MEMO', name: '项目决策备忘', detail: '将光照优化经验沉淀为移动端性能检查清单。', status: 'ready' },
    { type: 'SKILL', name: '技能图谱更新', detail: 'Shader 基础从 L2 提升到 L3，新增 WGSL 缺口路径。', status: 'ready' },
  ],
  alerts: [
    { severity: 'warn', name: '会议纪要碎片缺少原始来源链接', detail: '影响 17 项资产 · 请求补充引用', action: '请求人工确认', owner: 'QA Agent' },
    { severity: 'critical', name: 'GLM Provider 结论存在 2 条互斥引用', detail: '冲突待消解 · 已分派 Graph Builder', action: '分派冲突消解', owner: 'QA Agent' },
    { severity: 'warn', name: '战略判断 #M-042 超过复核周期', detail: '已过期 12 天 · 进入冷链复核', action: '重新炼制', owner: 'Memory Agent' },
  ],
  // KPI data
  kpi: {
    backlog: 42,
    activeJobs: 19,
    outputsToday: 18,
    blockedTasks: 3,
    interventionRequests: 2,
    agentLoad: 72,
    capabilityIndex: 83.6,
  },
  // Interactive objects map
  interactiveObjects: [],
  // 3D object registry for the Component Console
  objectRegistry: [],
  objectById: new Map(),
  objectIdSeeds: new Map(),
  selectedFactoryObjectId: null,
  selectionHelper: null,
  workbench: {
    mode: 'run',
    opsPanelOpen: false,
  },
  executiveTower: {
    open: false,
    activeAgent: 'ceo',
    group: null,
    seats: new Map(),
    interactiveObjects: [],
    animatedObjects: [],
    previousCameraPose: null,
    chatMessages: [],
    decisionLog: [
      { role: 'CEO', text: '确定今日主线：优先打磨塔内经营叙事。' },
      { role: 'CIO', text: '补齐输入：整理用户讨论、竞品信号和行业素材。' },
      { role: 'COO', text: '拆成任务：入口、空间、详情、网络跳转和验收。' },
      { role: 'CTO', text: '执行自动化：调用 Codex / 脚本 / 前端组件升级。' },
      { role: 'CFO', text: '评估价值：沉淀 demo 素材、产品资产和潜在商业机会。' },
    ],
    lastConversation: null,
    pendingReturnAssetId: null,
    chatBusy: false,
    boardRoomOpen: false,
    boardBusy: false,
    modelRoute: {
      state: 'checking',
      configured: false,
      model: 'glm-5.2',
      latencyMs: null,
      detail: '正在检测本地 GLM-5.2 代理。',
    },
    taskHandoff: {
      status: 'idle',
      title: '等待会议结论',
      detail: '召集高管群聊后，可把结论生成工厂任务并回流到外部 Live Queue 与流水线。',
    },
  },
  componentConsole: {
    open: false,
    selectedId: null,
    module: 'all',
    level: 'all',
    type: 'all',
    search: '',
    semanticOnly: false,
    interactiveOnly: false,
    labelsOnly: false,
  },
  layoutEditor: {
    open: false,
    selectedId: null,
    mode: 'translate',
    snap: true,
    dragging: false,
    previousAnimationActive: true,
    previousCruiseMode: false,
    transformControls: null,
    savedTransforms: new Map(),
    defaultTransforms: new Map(),
    dirtyIds: new Set(),
    search: '',
    status: '选择一个可编排组件',
  },
  factoryNetwork: {
    open: false,
    group: null,
    nodes: [],
    links: [],
    packets: [],
    activeOpportunity: 0,
    status: '网络层待启动',
  },
  factoryMatrix: {
    open: false,
    scanned: false,
    companyMode: false,
    storyMode: false,
    storyStep: 0,
    storyTimers: [],
    group: null,
    nodes: [],
    links: [],
    packets: [],
    activeOpportunity: 0,
    status: '矩阵层待启动',
  },
  twinFactory: {
    factory1: null,
    factory2: null,
    campus: null,
    offsetX: TWIN_FACTORY_OFFSET_X,
    evolution: null,
    flowTokens: [],
    flowBeacons: [],
  },
};

const LAYOUT_STORAGE_KEY = 'AI_KNOWLEDGE_FACTORY_LAYOUT_V1';
const LAYOUT_VERSION = 1;
const EDITABLE_LEVELS = new Set(['L1 业务组件', 'L2 组合对象']);
const TRANSLATION_SNAP = 0.5;
const ROTATION_SNAP = THREE.MathUtils.degToRad(15);
const PRIMARY_LAYOUT_TYPES = new Set([
  'rack',
  'conveyor',
  'memory-vault',
  'quality-station',
  'output-dock',
  'packaging-station',
  'feedback-core',
  'control-tower',
  'control-tower-cab',
]);

const componentModules = [
  '工厂网络系统',
  '资产库系统',
  '流水线系统',
  'Agent 系统',
  '质检系统',
  '长期记忆系统',
  '输出系统',
  '反馈进化系统',
  '标注系统',
  '建筑结构系统',
  '环境系统',
  '运营 UI 系统',
  '未归类对象',
];

const componentModuleNotes = {
  '工厂网络系统': '外部个人工厂、供需匹配、协作机会与临时供应链图层。',
  '资产库系统': '五类资产仓、货架结构、资产槽位与可复用资产存放单元。',
  '流水线系统': '知识从输入、质检、炼制、沉淀、输出到进化的物理流动网络。',
  'Agent 系统': 'AGV / AMR 工人、推理能量站与自动执行能力载体。',
  '质检系统': '去重、引用、冲突、时效、可信度检查相关工位。',
  '长期记忆系统': '高价值长期资产、战略判断、核心方案与周期复核结构。',
  '输出系统': '行动卡、报告、复盘、项目包等知识产品交付区域。',
  '反馈进化系统': '用户行为反馈、资产权重更新与策略回灌闭环。',
  '标注系统': 'L1-L8 文字标注、语义说明与可视化信息层。',
  '建筑结构系统': '地板、分区、柱网、屋顶、墙体、路径线等空间骨架。',
  '环境系统': '灯光、雾、主题视觉与动态信号。',
  '运营 UI 系统': 'KPI、任务队列、告警、控制按钮等屏幕级运营界面。',
  '未归类对象': '自动发现但尚未绑定明确业务语义的 3D 物件。',
};

const executiveAgents = [
  {
    id: 'ceo',
    title: 'CEO Agent',
    name: '首席方向官',
    color: '#facc15',
    mission: '管理长期意图、优先级和关键决策，让工厂围绕真正重要的目标运行。',
    focus: '今日主线：把中控塔升级为个人数字工厂经营中枢。',
    task: '判断 M6 优先级，压缩无效展示，突出 AI 高管团队正在替用户经营工厂。',
    signal: 'PFN Demo 叙事已进入可演示阶段，下一步需要让用户清楚看到产出与机会。',
    recommendation: '先完成塔内作战室，再把“今日决策”映射到外部生产任务和工厂网络机会。',
  },
  {
    id: 'cio',
    title: 'CIO Agent',
    name: '首席信息官',
    color: '#3cc8ff',
    mission: '管理信息入口、资料质量、知识流和信息缺口。',
    focus: '输入源：用户讨论、产品文档、行业信号、竞品观察。',
    task: '把“个人工厂、持续运行、工厂网络、临时公司”整理成可被工厂执行的意图文档。',
    signal: '当前知识资产足够支撑 MVP，但仍缺少真实案例、用户场景和外部数据源。',
    recommendation: '建立 3 个常驻输入流：行业情报、用户反馈、项目进展，持续喂给工厂。',
  },
  {
    id: 'coo',
    title: 'COO Agent',
    name: '首席运营官',
    color: '#3ee898',
    mission: '管理任务队列、Agent 调度、流程瓶颈和交付节奏。',
    focus: '运行状态：输入、质检、炼制、沉淀、输出、进化。',
    task: '把塔内空间拆成入口、空间、角色、详情、返回、网络跳转、验收七个执行单元。',
    signal: '主界面按钮和面板较多，进入塔内时必须隐藏外部 UI，避免认知负担。',
    recommendation: '塔内只保留三类动作：返回工厂、查看决策、进入工厂网络。',
  },
  {
    id: 'cto',
    title: 'CTO Agent',
    name: '首席技术官',
    color: '#a08cff',
    mission: '管理自动化工具链、代码生产、系统能力和技术风险。',
    focus: '工具链：Three.js、CSS2D、Codex、组件后台、布局编辑器。',
    task: '将 GLM-5.2 后端代理、塔内 3D 指挥舱、右侧群聊和任务回流组成最小闭环。',
    signal: '模型 key 不能进入浏览器包，需要由本地 server 代理调用并保留本地 fallback。',
    recommendation: '把中控塔升级为“模型路由 + 高管会诊 + 临时协作舱 + 工厂任务”的一体化控制面。',
  },
  {
    id: 'cfo',
    title: 'CFO Agent',
    name: '首席价值官',
    color: '#ffa940',
    mission: '管理时间成本、算力成本、资产回报和可变现机会。',
    focus: '价值指标：可复用资产、输出数量、机会撮合、潜在收入结构。',
    task: '评估本次改造是否提升 demo 的商业理解度和展示转化率。',
    signal: '“五个 AI 高管队友经营个人工厂”比纯知识库更容易被市场理解。',
    recommendation: '把每次 demo 讨论沉淀成产品资产：脚本、截图、案例、功能路线和销售叙事。',
  },
];

const EXECUTIVE_TOWER_ORIGIN = new THREE.Vector3(0, 0, -96);
const EXECUTIVE_TOWER_CAMERA = {
  position: new THREE.Vector3(0, 5.2, -79),
  target: new THREE.Vector3(0, 2.85, -101.5),
};

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

const sourceTypeMap = {
  INT: { label: 'INT', source: '项目意图' },
  PDF: { label: 'PDF', source: 'PDF / 文档' },
  WEB: { label: 'WEB', source: '网页 / 链接' },
  WR: { label: 'WR', source: '读书笔记' },
  MEET: { label: 'MEET', source: '会议纪要' },
  CODE: { label: 'CODE', source: '代码片段' },
};

const targetTypeMap = {
  knowledge: { value: '知识资产', target: '知识资产仓', reusable: 78 },
  skill: { value: '技能资产', target: '技能资产仓', reusable: 72 },
  experience: { value: '经验资产', target: '经验资产仓', reusable: 82 },
  task: { value: '任务资产', target: '任务资产仓', reusable: 76 },
  kit: { value: '套件资产', target: '套件资产仓', reusable: 86 },
};

const networkFactories = [
  {
    id: 'industry-intel',
    name: '行业情报工厂',
    role: '外部信号供应',
    supply: 'Agent 趋势 / 竞品动态 / 市场机会',
    demand: '产品原型证据与验证反馈',
    match: 94,
    relation: '供应给我',
    color: 0x3cc8ff,
    position: [-72, 0, 54],
  },
  {
    id: 'data-intake',
    name: '数据接入工厂',
    role: 'API 原料入口',
    supply: 'Twitter / GitHub / CRM / 文档连接器',
    demand: '明确的意图边界与清洗策略',
    match: 88,
    relation: '供应给我',
    color: 0x22d3ee,
    position: [-54, 0, 50],
  },
  {
    id: 'customer-insight',
    name: '客户洞察工厂',
    role: '反馈与需求聚类',
    supply: '用户痛点 / 需求地图 / 留存风险',
    demand: '可访谈用户与产品实验',
    match: 91,
    relation: '双向匹配',
    color: 0x3ee898,
    position: [-36, 0, 48],
  },
  {
    id: 'ui-design',
    name: 'UI 设计工厂',
    role: '视觉与交互供应',
    supply: '视觉系统 / 原型动线 / 演示页面',
    demand: '清晰产品剧情与验收口径',
    match: 86,
    relation: '供应给我',
    color: 0xa08cff,
    position: [-18, 0, 46],
  },
  {
    id: 'codex-dev',
    name: 'Codex 开发工厂',
    role: '代码执行器',
    supply: '代码改造 / 测试修复 / 组件实现',
    demand: '任务上下文 / 文件范围 / 验证标准',
    match: 97,
    relation: '被我调用',
    color: 0xffa940,
    position: [0, 0, 46],
  },
  {
    id: 'content-growth',
    name: '内容增长工厂',
    role: '发布与传播',
    supply: '发布文案 / 社媒脚本 / 用户招募',
    demand: '可传播概念与演示素材',
    match: 82,
    relation: '供应给我',
    color: 0xff6b6b,
    position: [18, 0, 46],
  },
  {
    id: 'knowledge-assets',
    name: '知识资产工厂',
    role: '资产沉淀',
    supply: '模板 / 方法论 / 经验资产 / 复用包',
    demand: '真实项目输入与复盘记录',
    match: 89,
    relation: '双向匹配',
    color: 0x60a5fa,
    position: [36, 0, 48],
  },
  {
    id: 'delivery-chain',
    name: '交付供应链工厂',
    role: '临时公司编排',
    supply: '任务拆单 / SLA / 交付验收',
    demand: '多工厂信用与能力边界',
    match: 92,
    relation: '组织协作',
    color: 0xfacc15,
    position: [54, 0, 50],
  },
  {
    id: 'credit-ledger',
    name: '信用评估工厂',
    role: '履约记录',
    supply: '交付质量 / 响应速度 / 信用评分',
    demand: '可验证成果和协作日志',
    match: 84,
    relation: '信用背书',
    color: 0x34d399,
    position: [72, 0, 54],
  },
  {
    id: 'my-supply',
    name: '我的能力外供工厂',
    role: 'AI 产品原型供应',
    supply: '3D demo / 产品定义 / 项目工厂设计',
    demand: '早期客户 / 市场反馈 / 付费验证',
    match: 90,
    relation: '我供应别人',
    color: 0x38bdf8,
    position: [0, 0, 72],
  },
];

const networkOpportunities = [
  {
    title: 'PFN MVP Launch Cell',
    score: 96,
    route: '行业情报 → 产品定义 → UI 设计 → Codex 开发 → 内容增长 → 用户反馈',
    output: 'Personal Factory Network 可演示原型与首批用户反馈包',
    revenue: '项目协作 / 模板订阅 / 能力调用',
  },
  {
    title: 'Agent 行业情报订阅链',
    score: 91,
    route: '数据接入 → 行业情报 → 知识资产 → 内容增长',
    output: '每日 Agent 行业简报、趋势判断和机会预警',
    revenue: '情报订阅 / 报告授权',
  },
  {
    title: '客户需求洞察供应链',
    score: 88,
    route: '客户洞察 → 产品策略 → 开发任务 → 交付复盘',
    output: '需求地图、PRD 初稿、版本优先级和行动卡',
    revenue: '企业运营服务 / 项目分成',
  },
];

const matrixIndustries = [
  { key: 'ai-software', label: 'AI 软件', color: 0x3cc8ff },
  { key: 'ecommerce', label: '电商零售', color: 0x3ee898 },
  { key: 'content-media', label: '内容媒体', color: 0xff6b6b },
  { key: 'consulting', label: '咨询研究', color: 0xa08cff },
  { key: 'investment', label: '投资情报', color: 0xffa940 },
  { key: 'enterprise-ops', label: '企业运营', color: 0x34d399 },
];

const matrixCapabilities = [
  { key: 'data-intake', label: '数据接入', color: 0x22d3ee },
  { key: 'research', label: '情报研究', color: 0x3cc8ff },
  { key: 'insight', label: '需求洞察', color: 0x3ee898 },
  { key: 'strategy', label: '产品策略', color: 0xfacc15 },
  { key: 'design', label: '设计原型', color: 0xa08cff },
  { key: 'development', label: '开发执行', color: 0xffa940 },
  { key: 'growth', label: '内容增长', color: 0xff6b6b },
  { key: 'credit', label: '交付信用', color: 0x34d399 },
];

const matrixFactoryNodes = matrixIndustries.flatMap((industry, row) => (
  matrixCapabilities.map((capability, col) => ({
    id: `${industry.key}.${capability.key}`,
    name: `${industry.label} · ${capability.label}工厂`,
    industry: industry.label,
    capability: capability.label,
    row,
    col,
    color: capability.color,
    industryColor: industry.color,
    position: [(col - 3.5) * 11.7, 0, 111 + row * 8.4],
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
      'ai-software.research',
      'ai-software.strategy',
      'ai-software.design',
      'ai-software.development',
      'content-media.growth',
      'enterprise-ops.credit',
    ],
    output: 'Personal Factory Network 演示原型、产品故事、发布素材和用户反馈闭环',
    revenue: '项目分成 / 模板订阅 / 能力调用',
  },
  {
    title: '客户需求洞察链',
    score: 92,
    demand: '一家企业持续收到客户反馈，但缺少自动化方式把需求、优先级、PRD 和交付复盘串起来。',
    nodeIds: [
      'enterprise-ops.data-intake',
      'enterprise-ops.insight',
      'ai-software.strategy',
      'ai-software.development',
      'enterprise-ops.credit',
    ],
    output: '客户需求地图、产品优先级、PRD 初稿和交付复盘',
    revenue: '企业运营服务 / 数据分析订阅',
  },
  {
    title: '电商内容增长链',
    score: 89,
    demand: '一个电商团队需要把选品数据、用户评论、内容脚本和投放复盘自动组织成可执行增长链路。',
    nodeIds: [
      'ecommerce.data-intake',
      'ecommerce.insight',
      'content-media.research',
      'content-media.growth',
      'ecommerce.credit',
    ],
    output: '选品机会、商品卖点、内容脚本、投放复盘和供应链风险提示',
    revenue: '运营代管 / 内容授权 / 成交分成',
  },
];

const matrixStorySteps = [
  { key: 'demand', label: '需求进入', status: '机会雷达捕获外部需求：正在解析意图、约束和预期产出。' },
  { key: 'scan', label: '矩阵扫描', status: '矩阵扫描个人工厂能力、资源、信用和负载状态。' },
  { key: 'match', label: '能力匹配', status: '系统高亮最短可执行链路，过滤低信用或高负载节点。' },
  { key: 'company', label: '组建临时公司', status: '临时公司已生成：节点进入协作链路并开始交换任务。' },
  { key: 'dispatch', label: '任务分工', status: '任务已分配回各个工厂，等待进入主工厂执行与沉淀资产。' },
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

// ─────────────────────────────────────
// SCENE SETUP
// ─────────────────────────────────────
const canvas = document.getElementById('three-canvas');
const container = document.getElementById('canvas-container');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.55;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x121827, 0.000025);
scene.background = new THREE.Color(0x121827);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 240);
const factoryViewCenterX = FACTORY_SOLO_SHOWCASE_MODE ? 0 : TWIN_FACTORY_CENTER_X;
camera.position.set(
  factoryViewCenterX,
  FACTORY_SOLO_SHOWCASE_MODE ? 52 : 64,
  FACTORY_SOLO_SHOWCASE_MODE ? 76 : (FACTORY_SHOWCASE_MODE ? 100 : 92),
);
camera.lookAt(factoryViewCenterX, 1.2, 0);

// CSS2D Renderer for labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'fixed';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'auto';
labelRenderer.domElement.style.zIndex = '10';
document.body.appendChild(labelRenderer.domElement);

// Orbit Controls
const controls = new OrbitControls(camera, labelRenderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(factoryViewCenterX, 1.2, 0);
controls.minDistance = 8;
controls.maxDistance = 260;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minPolarAngle = 0.2;
controls.enablePan = true;
controls.panSpeed = 0.9;
controls.screenSpacePanning = true;
controls.update();
// Mouse map: left drag rotates, right drag pans the whole 3D workspace, wheel zooms.
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.PAN
};
labelRenderer.domElement.addEventListener('contextmenu', event => event.preventDefault());

// ─────────────────────────────────────
// LIGHTING
// ─────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x4a5674, 1.75);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0xb8c7ff, 0x64708a, 0.95);
scene.add(hemisphereLight);

const dirLight = new THREE.DirectionalLight(0xfff2d8, 4.8);
dirLight.position.set(64, 58, 42);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 180;
dirLight.shadow.camera.left = -85;
dirLight.shadow.camera.right = 85;
dirLight.shadow.camera.top = 70;
dirLight.shadow.camera.bottom = -20;
dirLight.shadow.bias = -0.0004;
dirLight.shadow.normalBias = 0.02;
scene.add(dirLight);
dirLight.target.position.set(TWIN_FACTORY_CENTER_X, 0, 0);
scene.add(dirLight.target);

// Secondary fill light
const fillLight = new THREE.DirectionalLight(0xb0c5ff, 1.45);
fillLight.position.set(-15, 10, -10);
scene.add(fillLight);

// Ground bounce
const bounceLight = new THREE.DirectionalLight(0x6f8eb8, 1.25);
bounceLight.position.set(0, 1, 0);
scene.add(bounceLight);

// ─────────────────────────────────────
// MATERIALS LIBRARY
// ─────────────────────────────────────
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

const visualThemes = {
  dark: {
    background: 0x121827,
    fog: 0x121827,
    fogDensity: 0.000025,
    exposure: 1.55,
    ambient: 1.75,
    hemisphere: 0.95,
    directional: 4.8,
    fill: 1.45,
    bounce: 1.25,
    materials: {
      floor: 0x383a44,
      floorLine: 0x4e5464,
      floorDark: 0x2a2d36,
      floorGrid: 0x303541,
      rackFrame: 0x4a7eb5,
      rackBeam: 0x5f8fca,
      rackShelf: 0x465b70,
      conveyorFrame: 0x5a6e82,
      conveyorBelt: 0x3a3d46,
      roller: 0x707070,
      post: 0x556677,
      dockFloor: 0x3a3a40,
    },
  },
  light: {
    background: 0xe7edf5,
    fog: 0xe7edf5,
    fogDensity: 0.000018,
    exposure: 1.22,
    ambient: 2.05,
    hemisphere: 1.25,
    directional: 3.9,
    fill: 1.25,
    bounce: 1.05,
    materials: {
      floor: 0xb9c3d0,
      floorLine: 0xd8e0eb,
      floorDark: 0x9faabd,
      floorGrid: 0xacb7c6,
      rackFrame: 0x2e6da3,
      rackBeam: 0x4f8fc7,
      rackShelf: 0x95a5b8,
      conveyorFrame: 0x70879f,
      conveyorBelt: 0x8b95a3,
      roller: 0xa7afba,
      post: 0x60758b,
      dockFloor: 0xa5adbb,
    },
  },
  night: {
    background: 0x050810,
    fog: 0x050810,
    fogDensity: 0.00008,
    exposure: 0.7,
    ambient: 0.4,
    hemisphere: 0.2,
    directional: 1.2,
    fill: 0.45,
    bounce: 0.35,
    materials: {
      floor: 0x202633,
      floorLine: 0x344052,
      floorDark: 0x161b26,
      floorGrid: 0x242c3a,
      rackFrame: 0x315b86,
      rackBeam: 0x446f9e,
      rackShelf: 0x2f4358,
      conveyorFrame: 0x3f5265,
      conveyorBelt: 0x252a35,
      roller: 0x555f6b,
      post: 0x3d5064,
      dockFloor: 0x262b34,
    },
  },
};

function applyMaterialTheme(theme) {
  Object.entries(theme.materials).forEach(([key, color]) => {
    if (mat[key]?.color) mat[key].color.setHex(color);
  });
}

function applyVisualTheme() {
  const mode = state.nightMode ? 'night' : state.lightMode ? 'light' : 'dark';
  const theme = visualThemes[mode];
  document.body.classList.toggle('light-mode', mode === 'light');
  document.body.classList.toggle('night-mode', mode === 'night');

  scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity);
  scene.background = new THREE.Color(theme.background);
  renderer.toneMappingExposure = theme.exposure;
  ambientLight.intensity = theme.ambient;
  hemisphereLight.intensity = theme.hemisphere;
  dirLight.intensity = theme.directional;
  fillLight.intensity = theme.fill;
  bounceLight.intensity = theme.bounce;
  applyMaterialTheme(theme);
  window.__knowledgeFactoryTheme = {
    mode,
    background: `#${theme.background.toString(16).padStart(6, '0')}`,
    floor: `#${theme.materials.floor.toString(16).padStart(6, '0')}`,
    exposure: theme.exposure,
  };
}

// ─────────────────────────────────────
// HELPERS
// ─────────────────────────────────────
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

function isCss2DObject(object) {
  return Boolean(object?.element && object.constructor?.name === 'CSS2DObject');
}

function getObjectText(object) {
  if (isCss2DObject(object)) return object.element.textContent || '';
  return object.userData?.labelText || object.userData?.id || object.name || object.type || object.constructor?.name || '';
}

function findRegisteredAncestor(object) {
  let parent = object?.parent;
  while (parent && parent !== scene) {
    if (parent.userData?.factoryObjectId) return parent;
    parent = parent.parent;
  }
  return null;
}

function getTrackingMeta(object) {
  return object?.userData?.factoryTracking || {};
}

function inferModuleFromObject(object) {
  const meta = getTrackingMeta(object);
  if (meta.module) return meta.module;

  const udType = object.userData?.type;
  const typeMap = {
    rack: '资产库系统',
    agv: 'Agent 系统',
    amr: 'Agent 系统',
    'knowledge-asset': '流水线系统',
    belt: '流水线系统',
    roller: '流水线系统',
    'pipeline-junction': '流水线系统',
    'inspection-box': '质检系统',
    'memory-vault': '长期记忆系统',
    'feedback-core': '反馈进化系统',
    'feedback-ring': '反馈进化系统',
    scanLight: '质检系统',
    signal: '环境系统',
  };
  if (typeMap[udType]) return typeMap[udType];
  if (isCss2DObject(object)) return '标注系统';
  if (object.isLight) return '环境系统';

  const ancestor = findRegisteredAncestor(object);
  if (ancestor) return getTrackingMeta(ancestor).module || inferModuleFromObject(ancestor);
  return object.isMesh || object.type === 'Group' ? '未归类对象' : '环境系统';
}

function inferTypeFromObject(object) {
  const meta = getTrackingMeta(object);
  if (meta.type) return meta.type;
  if (object.userData?.type) return object.userData.type;
  if (isCss2DObject(object)) return 'label';
  if (object.isLight) return object.type;
  if (object.isMesh) return 'mesh';
  return object.type || object.constructor?.name || 'object3d';
}

function inferLevelFromObject(object) {
  const meta = getTrackingMeta(object);
  if (meta.level) return meta.level;
  if (isCss2DObject(object)) return 'L3 子物件';
  if (object.type === 'Group') return object.children?.length ? 'L2 组合对象' : 'L3 子物件';
  return object.userData?.type && ['rack', 'agv', 'amr', 'memory-vault', 'feedback-core'].includes(object.userData.type)
    ? 'L1 业务组件'
    : 'L3 子物件';
}

function inferBusinessMeaning(object) {
  const meta = getTrackingMeta(object);
  if (meta.businessMeaning) return meta.businessMeaning;
  const module = inferModuleFromObject(object);
  if (module === '标注系统') return '用于降低或提升 3D 主视觉中的语义信息密度。';
  if (module === '环境系统') return '支撑场景光照、主题氛围或运行状态信号。';
  if (module === '未归类对象') return '自动发现的 3D 子物件，尚未绑定明确业务语义。';
  return `${module}中的自动发现物件，需要在后续迭代中补充精确业务语义。`;
}

function inferSourceFunction(object) {
  const meta = getTrackingMeta(object);
  if (meta.sourceFunction) return meta.sourceFunction;
  if (isCss2DObject(object)) return 'createLabel()';
  const module = inferModuleFromObject(object);
  const sourceMap = {
    '资产库系统': 'buildRack()',
    '流水线系统': 'buildConveyor() / buildAllConveyors()',
    'Agent 系统': 'buildAGV() / buildAMR() / buildFacilities()',
    '质检系统': 'buildQualityInspection()',
    '长期记忆系统': 'buildMemoryVault()',
    '输出系统': 'buildFacilities() / buildDecoration()',
    '反馈进化系统': 'buildFacilities()',
    '建筑结构系统': 'buildFloor() / buildBuildingStructure()',
    '环境系统': 'lighting setup / animateLights()',
  };
  return sourceMap[module] || 'scene traversal';
}

function createAutoFactoryId(object) {
  const module = inferModuleFromObject(object);
  const type = inferTypeFromObject(object);
  const text = getObjectText(object);
  const prefix = module === '标注系统' ? `label.${object.userData?.labelLayer || 'l8'}` : `auto.${type}`;
  return `${prefix}.${slugifyFactoryId(text || object.uuid.slice(0, 8), object.uuid.slice(0, 8))}`;
}

function registerFactoryObject(object, meta = {}) {
  if (!object || object.userData?.skipRegistry) return null;
  if (!object.userData) object.userData = {};

  const existingId = object.userData.factoryObjectId;
  const requestedId = meta.id || existingId || object.userData.id || object.name || createAutoFactoryId(object);
  const id = existingId || ensureUniqueFactoryId(requestedId, object);
  const trackingMode = meta.trackingMode || (meta.businessMeaning || meta.module || meta.sourceFunction ? 'semantic' : 'auto-indexed');

  object.userData.factoryObjectId = id;
  object.userData.factoryTracking = {
    ...object.userData.factoryTracking,
    ...meta,
    id,
    trackingMode,
  };

  if (meta.name && !object.name) object.name = meta.name;
  if (meta.labelLayer) object.userData.labelLayer = meta.labelLayer;
  if (meta.interactive && !state.interactiveObjects.includes(object)) {
    state.interactiveObjects.push(object);
  }

  state.objectById.set(id, object);
  return id;
}

function isRegistryTarget(object) {
  return Boolean(object && object !== scene && object !== camera && !object.userData?.skipRegistry);
}

function indexSceneObjects() {
  scene.traverse(object => {
    if (!isRegistryTarget(object)) return;
    if (!object.userData?.factoryObjectId) {
      registerFactoryObject(object, {
        id: createAutoFactoryId(object),
        name: getObjectText(object),
        module: inferModuleFromObject(object),
        type: inferTypeFromObject(object),
        level: inferLevelFromObject(object),
        sourceFunction: inferSourceFunction(object),
        businessMeaning: inferBusinessMeaning(object),
        status: '已自动索引',
        trackingMode: 'auto-indexed',
      });
    }
  });
  refreshObjectRegistry();
  return getRegistryStats();
}

function isObjectCurrentlyVisible(object) {
  let node = object;
  while (node && node !== scene) {
    if (!node.visible) return false;
    node = node.parent;
  }
  return true;
}

function isObjectInteractive(object) {
  let node = object;
  while (node && node !== scene) {
    if (state.interactiveObjects.includes(node)) return true;
    node = node.parent;
  }
  return false;
}

function getWorldPositionRecord(object) {
  const pos = new THREE.Vector3();
  object.getWorldPosition(pos);
  return {
    x: Number(pos.x.toFixed(2)),
    y: Number(pos.y.toFixed(2)),
    z: Number(pos.z.toFixed(2)),
  };
}

function getRotationRecord(object) {
  return {
    x: Number(object.rotation.x.toFixed(2)),
    y: Number(object.rotation.y.toFixed(2)),
    z: Number(object.rotation.z.toFixed(2)),
  };
}

function getFactoryObjectRecord(object) {
  const meta = getTrackingMeta(object);
  const id = object.userData.factoryObjectId;
  const parentId = object.parent?.userData?.factoryObjectId || '';
  const labelLayer = meta.labelLayer || object.userData.labelLayer || object.element?.dataset?.labelLayer || '';
  return {
    id,
    name: meta.name || object.userData.id || object.name || getObjectText(object) || id,
    module: meta.module || inferModuleFromObject(object),
    type: meta.type || inferTypeFromObject(object),
    level: meta.level || inferLevelFromObject(object),
    sourceFunction: meta.sourceFunction || inferSourceFunction(object),
    businessMeaning: meta.businessMeaning || inferBusinessMeaning(object),
    position: getWorldPositionRecord(object),
    rotation: getRotationRecord(object),
    visible: isObjectCurrentlyVisible(object),
    interactive: isObjectInteractive(object),
    labelLayer,
    parentId,
    childCount: object.children?.length || 0,
    status: meta.status || (object.visible ? '运行中' : '隐藏'),
    trackingMode: meta.trackingMode || 'auto-indexed',
    objectClass: object.type || object.constructor?.name || 'Object3D',
  };
}

function refreshObjectRegistry() {
  state.objectRegistry = Array.from(state.objectById.values())
    .filter(isRegistryTarget)
    .map(getFactoryObjectRecord)
    .sort((a, b) => {
      const moduleDelta = componentModules.indexOf(a.module) - componentModules.indexOf(b.module);
      if (moduleDelta !== 0) return moduleDelta;
      return a.id.localeCompare(b.id);
    });
  return state.objectRegistry;
}

function getSceneObjectCount() {
  let count = 0;
  scene.traverse(object => {
    if (isRegistryTarget(object)) count += 1;
  });
  return count;
}

function getRegistryStats(records = refreshObjectRegistry()) {
  const semantic = records.filter(record => record.trackingMode === 'semantic').length;
  const labels = records.filter(record => record.type === 'label' || record.labelLayer).length;
  const interactive = records.filter(record => record.interactive).length;
  return {
    totalTracked: records.length,
    sceneObjectCount: getSceneObjectCount(),
    semantic,
    autoIndexed: records.length - semantic,
    interactive,
    labels,
    unmapped: records.length - semantic,
  };
}

function getFactoryObjectById(id) {
  return state.objectById.get(id) || null;
}

function getObjectBounds(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (!Number.isFinite(box.min.x) || box.isEmpty()) {
    const pos = new THREE.Vector3();
    object.getWorldPosition(pos);
    box.setFromCenterAndSize(pos, new THREE.Vector3(1, 1, 1));
  }
  return box;
}

function getFocusObject(object) {
  let focus = object;
  let box = getObjectBounds(focus);
  const size = new THREE.Vector3();
  box.getSize(size);
  const tooSmall = Math.max(size.x, size.y, size.z) < 0.35;
  if (!tooSmall) return focus;

  let parent = object.parent;
  while (parent && parent !== scene) {
    if (parent.userData?.factoryTracking?.trackingMode === 'semantic') return parent;
    parent = parent.parent;
  }
  return focus;
}

function clearSelectionHelper() {
  if (!state.selectionHelper) return;
  scene.remove(state.selectionHelper);
  state.selectionHelper.geometry?.dispose?.();
  state.selectionHelper.material?.dispose?.();
  state.selectionHelper = null;
}

function highlightFactoryObject(object) {
  clearSelectionHelper();
  const helper = new THREE.BoxHelper(object, 0xfff36a);
  helper.userData.skipRegistry = true;
  helper.material.transparent = true;
  helper.material.opacity = 0.95;
  scene.add(helper);
  state.selectionHelper = helper;
}

function animateCameraToObject(object) {
  const focus = getFocusObject(object);
  const box = getObjectBounds(focus);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const distance = THREE.MathUtils.clamp(maxDim * 2.8 + 5, 6, 30);
  const viewDir = new THREE.Vector3(1.1, 0.85, 1.1).normalize();
  const endTarget = center.clone();
  const endPos = center.clone().add(viewDir.multiplyScalar(distance));
  endPos.y = Math.max(endPos.y, center.y + 3.2);

  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const duration = 850;
  const startTime = performance.now();
  state.cruiseMode = false;
  controls.enabled = true;
  document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));

  function anim(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();
    if (t < 1) requestAnimationFrame(anim);
  }
  requestAnimationFrame(anim);
}

function focusFactoryObject(id) {
  const object = getFactoryObjectById(id);
  if (!object) return false;
  state.selectedFactoryObjectId = id;
  state.componentConsole.selectedId = id;
  animateCameraToObject(object);
  highlightFactoryObject(getFocusObject(object));
  showFactoryObjectInfo(object);
  return true;
}

function createLabel(text, position, color = '#aaccff', fontSize = '11px', layer = 'l8', meta = {}) {
  const div = document.createElement('div');
  div.textContent = text;
  div.className = `scene-label scene-label-${layer}`;
  div.dataset.labelLayer = layer;
  div.style.color = color;
  div.style.fontFamily = "'JetBrains Mono', monospace";
  div.style.fontSize = fontSize;
  div.style.fontWeight = '600';
  div.style.textShadow = '0 0 8px rgba(0,0,0,0.8)';
  div.style.letterSpacing = '0.04em';
  div.style.pointerEvents = 'none';
  const label = new CSS2DObject(div);
  label.position.set(position[0], position[1], position[2]);
  label.userData = {
    type: 'label',
    labelLayer: layer,
    labelText: text,
  };
  registerFactoryObject(label, {
    id: meta.id || `label.${layer}.${slugifyFactoryId(text, 'text')}`,
    name: meta.name || text,
    module: meta.module || '标注系统',
    type: 'label',
    level: meta.level || 'L3 子物件',
    sourceFunction: meta.sourceFunction || 'createLabel()',
    businessMeaning: meta.businessMeaning || `${layer.toUpperCase()} 文字标注，用于解释工厂空间或物件语义。`,
    labelLayer: layer,
    status: '跟随 3D 场景渲染',
    trackingMode: 'semantic',
  });
  return label;
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
    confidence: 78 + Math.floor(Math.random() * 19),
    reusableScore: asset.reusable + Math.floor((Math.random() - 0.5) * 10),
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
    transitionTimer: Math.random() * 5,
    transitionEvery: 4.5 + Math.random() * 4,
    createdAt: Date.now() - Math.random() * 7200000,
    lastHandledAt: Date.now() - Math.random() * 420000,
  };
}

function formatRelativeTime(timestamp) {
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s 前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m 前`;
  return `${Math.floor(minutes / 60)}h 前`;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function summarizeInput(text) {
  const compact = (text || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '用户提交了一条新原料，等待 Agent 解析。';
  return compact.length > 86 ? `${compact.slice(0, 86)}...` : compact;
}

function createUserAssetBlueprint({ inputType, targetType, title, content }) {
  const source = sourceTypeMap[inputType] || sourceTypeMap.INT;
  const target = targetTypeMap[targetType] || targetTypeMap.task;
  return {
    label: source.label,
    source: source.source,
    title: title || summarizeInput(content).slice(0, 32) || '未命名输入任务',
    value: target.value,
    target: target.target,
    reusable: target.reusable,
    rawInput: summarizeInput(content),
    userCreated: true,
  };
}

function createKnowledgeAssetParcel(asset, track, options = {}) {
  const segment = options.segment ?? 0;
  const lifecycleIndex = options.lifecycleIndex ?? 0;
  const assetRecord = createKnowledgeAssetRecord(asset, segment, lifecycleIndex);
  const initialProgress = options.progress ?? ((segment * track.segLen + Math.random() * track.segLen * 0.75) % track.trackLength);
  const lateralOffset = options.lateralOffset ?? ((Math.random() - 0.5) * 0.3);
  const { lateralX, lateralZ } = getConveyorLateral(track.dirX, track.dirZ);
  const parcelX = track.trackStartX + track.dirX * initialProgress + lateralX * lateralOffset;
  const parcelZ = track.trackStartZ + track.dirZ * initialProgress + lateralZ * lateralOffset;
  const parcel = createBox(0.5, 0.4, 0.45, mat.assetKnowledge, {
    position: [parcelX, track.frameY, parcelZ],
    name: 'Knowledge Asset'
  });
  const assetLabel = createLabel(asset.label, [0, 0.4, 0], '#e7fbff', '8px', 'l7');
  assetLabel.element.classList.add('asset-floating-label');
  assetLabel.element.style.pointerEvents = 'auto';
  assetLabel.element.title = '打开资产任务卡';
  assetLabel.element.addEventListener('click', (event) => {
    event.stopPropagation();
    showKnowledgeAssetPanel(parcel);
  });
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
    speed: options.speed ?? (0.9 + Math.random() * 0.45),
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
  core.userData = { type: 'signal', phase: Math.random() * Math.PI * 2 };
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
  statusLight.userData = { type: 'signal', phase: Math.random() * Math.PI * 2 };
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
  lightBulb.userData = { type: 'signal', phase: Math.random() * Math.PI * 2 };
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
    speed: 0.5 + Math.random() * 0.8,
    pathOffset: Math.random() * Math.PI * 2,
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
  lightBulb.userData = { type: 'signal', phase: Math.random() * Math.PI * 2 };
  group.add(lightBulb);
  state.signalLights.push(lightBulb);

  group.position.set(x, 0, z);
  group.name = id;
  group.userData = {
    type: 'amr',
    id: id,
    speed: 0.3 + Math.random() * 0.6,
    pathOffset: Math.random() * Math.PI * 2,
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
    color: 0x334455, roughness: 0.3, metalness: 0.7
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
    color: 0x223344, roughness: 0.2, metalness: 0.5
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
    chargeLight.userData = { type: 'signal', phase: Math.random() * Math.PI * 2 };
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
  core.userData = { type: 'feedback-core', phase: Math.random() * Math.PI * 2 };
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
    opacity: 0.4,
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
        position: [px + (Math.random() - 0.5) * 0.3, 0.25 + b * 0.35, pz + (Math.random() - 0.5) * 0.3],
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
function createNetworkMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.34,
    metalness: options.metalness ?? 0.35,
    emissive: color,
    emissiveIntensity: options.emissiveIntensity ?? 0.45,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
}

function createNetworkPart(w, h, d, material, position, options = {}) {
  const part = createBox(w, h, d, material, {
    position,
    castShadow: options.castShadow !== false,
    receiveShadow: options.receiveShadow,
  });
  part.userData = {
    ...part.userData,
    type: options.type || 'network-part',
    networkNodeId: options.nodeId || '',
  };
  return part;
}

function buildMiniFactoryNode(factory, index) {
  const group = new THREE.Group();
  const color = factory.color;
  const accentMat = createNetworkMaterial(color, { emissiveIntensity: 0.65 });
  const baseMat = createNetworkMaterial(0x182334, { emissiveIntensity: 0.18, metalness: 0.18 });
  const floorMat = createNetworkMaterial(0x273246, { emissiveIntensity: 0.18, metalness: 0.14 });
  const rackMat = createNetworkMaterial(0x426b96, { emissiveIntensity: 0.32, metalness: 0.58 });
  const beltMat = createNetworkMaterial(0x222936, { emissiveIntensity: 0.18, metalness: 0.18 });
  const glassMat = createNetworkMaterial(color, {
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.32,
    metalness: 0.08,
  });

  const base = createNetworkPart(7.4, 0.18, 4.2, floorMat, [0, 0.03, 0], {
    nodeId: factory.id,
    receiveShadow: true,
  });
  group.add(base);

  for (let gx = -3; gx <= 3; gx += 1.5) {
    group.add(createNetworkPart(0.025, 0.035, 4.1, baseMat, [gx, 0.16, 0], { nodeId: factory.id, castShadow: false }));
  }
  for (let gz = -1.5; gz <= 1.5; gz += 1.5) {
    group.add(createNetworkPart(7.2, 0.035, 0.025, baseMat, [0, 0.16, gz], { nodeId: factory.id, castShadow: false }));
  }

  // Small control tower.
  group.add(createNetworkPart(0.7, 1.9, 0.7, baseMat, [-2.7, 1.05, 1.25], { nodeId: factory.id }));
  group.add(createNetworkPart(1.35, 0.72, 1.1, glassMat, [-2.7, 2.33, 1.25], { nodeId: factory.id }));

  // Asset rack blocks.
  for (let r = 0; r < 3; r++) {
    const rx = -0.9 + r * 1.2;
    group.add(createNetworkPart(0.12, 1.35, 0.12, rackMat, [rx - 0.42, 0.82, -1.15], { nodeId: factory.id }));
    group.add(createNetworkPart(0.12, 1.35, 0.12, rackMat, [rx + 0.42, 0.82, -1.15], { nodeId: factory.id }));
    group.add(createNetworkPart(0.95, 0.08, 0.9, baseMat, [rx, 0.55, -1.15], { nodeId: factory.id }));
    group.add(createNetworkPart(0.95, 0.08, 0.9, baseMat, [rx, 1.08, -1.15], { nodeId: factory.id }));
    group.add(createNetworkPart(0.44, 0.32, 0.42, accentMat, [rx + 0.1, 1.34, -1.12], { nodeId: factory.id }));
  }

  // One visible production line and output gate.
  group.add(createNetworkPart(4.2, 0.12, 0.62, beltMat, [0.7, 0.38, 0.7], { nodeId: factory.id }));
  for (let s = -1.2; s <= 2.4; s += 0.9) {
    const roller = createCylinder(0.06, 0.06, 0.55, 10, accentMat, {
      position: [s, 0.48, 0.7],
      castShadow: false,
    });
    alignCylinderToHorizontalAxis(roller, 0, 1);
    roller.userData = { type: 'network-roller', networkNodeId: factory.id, phase: index + s };
    group.add(roller);
    state.signalLights.push(roller);
  }
  group.add(createNetworkPart(1.05, 1.35, 0.18, accentMat, [2.95, 0.82, -0.2], { nodeId: factory.id }));

  // Status beacon.
  const beaconBase = createCylinder(0.24, 0.32, 0.12, 18, baseMat, { position: [2.95, 0.22, 1.4] });
  beaconBase.userData = { type: 'network-part', networkNodeId: factory.id };
  group.add(beaconBase);
  const beacon = createCylinder(0.16, 0.12, 0.32, 18, accentMat, { position: [2.95, 0.46, 1.4] });
  beacon.userData = { type: 'signal', phase: index * 0.65, networkNodeId: factory.id };
  group.add(beacon);
  state.signalLights.push(beacon);

  const scoreLabel = createLabel(`${factory.match}% · ${factory.relation}`, [0, 3.65, 0], '#e7fbff', '8px', 'l6', {
    id: `network-label.${factory.id}.score`,
    name: `${factory.name} 匹配分数`,
    module: '工厂网络系统',
    businessMeaning: `${factory.name} 与我的个人工厂之间的供需匹配分数。`,
  });
  scoreLabel.element.classList.add('factory-network-label');
  group.add(scoreLabel);

  const nameLabel = createLabel(factory.name, [0, 4.2, 0], `#${color.toString(16).padStart(6, '0')}`, '10px', 'l6', {
    id: `network-label.${factory.id}.name`,
    name: `${factory.name} 名称标签`,
    module: '工厂网络系统',
    businessMeaning: `${factory.name} 在个人工厂网络中的节点标签。`,
  });
  nameLabel.element.classList.add('factory-network-label', 'factory-network-name-label');
  group.add(nameLabel);

  group.position.set(factory.position[0], factory.position[1], factory.position[2]);
  group.name = factory.name;
  group.userData = {
    type: 'network-factory',
    id: factory.id,
    title: factory.name,
    role: factory.role,
    supply: factory.supply,
    demand: factory.demand,
    match: factory.match,
    relation: factory.relation,
    color,
    phase: index * 0.45,
  };
  registerFactoryObject(group, {
    id: `network.factory.${factory.id}`,
    name: factory.name,
    module: '工厂网络系统',
    type: 'network-factory',
    level: 'L1 业务组件',
    sourceFunction: 'buildFactoryNetworkLayer()',
    businessMeaning: `${factory.name}：${factory.role}。供给 ${factory.supply}；需求 ${factory.demand}。`,
    status: '可匹配',
    trackingMode: 'semantic',
    interactive: true,
  });

  state.factoryNetwork.nodes.push(group);
  return group;
}

function createNetworkLink(start, end, factory, index) {
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const diff = endVec.clone().sub(startVec);
  const length = diff.length();
  const linkMat = createNetworkMaterial(factory.color, {
    emissiveIntensity: 1.1,
    transparent: true,
    opacity: 0.42,
    roughness: 0.18,
    metalness: 0.2,
  });
  const link = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, length, 8), linkMat);
  link.position.copy(startVec.clone().add(endVec).multiplyScalar(0.5));
  link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.clone().normalize());
  link.userData = {
    type: 'network-link',
    id: `network-link.${factory.id}`,
    factoryId: factory.id,
    relation: factory.relation,
    phase: index * 0.7,
  };
  registerFactoryObject(link, {
    id: `network.link.${factory.id}`,
    name: `${factory.name} 匹配光束`,
    module: '工厂网络系统',
    type: 'network-link',
    level: 'L2 组合对象',
    sourceFunction: 'buildFactoryNetworkLayer()',
    businessMeaning: `表示我的个人工厂与 ${factory.name} 的供需匹配关系：${factory.relation}。`,
    status: '匹配中',
    trackingMode: 'semantic',
  });
  state.factoryNetwork.links.push(link);

  const packetMat = createNetworkMaterial(factory.color, {
    emissiveIntensity: 2.4,
    roughness: 0.2,
    metalness: 0.16,
  });
  const packet = createBox(0.36, 0.22, 0.28, packetMat, {
    position: [startVec.x, startVec.y, startVec.z],
    castShadow: false,
  });
  packet.userData = {
    type: 'network-packet',
    id: `network-packet.${factory.id}`,
    factoryId: factory.id,
    start: startVec,
    end: endVec,
    progress: (index * 0.11) % 1,
    speed: 0.045 + (factory.match - 80) * 0.001,
  };
  registerFactoryObject(packet, {
    id: `network.packet.${factory.id}`,
    name: `${factory.name} 协作物料`,
    module: '工厂网络系统',
    type: 'network-packet',
    level: 'L3 子物件',
    sourceFunction: 'buildFactoryNetworkLayer()',
    businessMeaning: `在工厂网络中流动的协作资产、任务订单或能力调用请求。`,
    status: '流动中',
    trackingMode: 'semantic',
  });
  state.factoryNetwork.packets.push(packet);

  return { link, packet };
}

function buildFactoryNetworkLayer() {
  if (state.factoryNetwork.group) return state.factoryNetwork.group;

  const group = new THREE.Group();
  group.name = 'Factory Network Layer';
  group.visible = false;
  group.userData = { type: 'factory-network-layer' };
  registerFactoryObject(group, {
    id: 'network.layer',
    name: '工厂网络图层',
    module: '工厂网络系统',
    type: 'factory-network-layer',
    level: 'L1 业务组件',
    sourceFunction: 'buildFactoryNetworkLayer()',
    businessMeaning: '展示个人工厂之间的能力供给、需求缺口、自动撮合和临时供应链关系。',
    status: '可切换',
    trackingMode: 'semantic',
  });

  const networkGroundMat = createNetworkMaterial(0x16233a, {
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.72,
    metalness: 0.12,
  });
  const networkGround = createBox(162, 0.08, 40, networkGroundMat, {
    position: [0, -0.16, 58],
    castShadow: false,
    receiveShadow: true,
  });
  networkGround.userData = { type: 'network-ground' };
  group.add(networkGround);

  const horizonLineMat = createNetworkMaterial(0x3cc8ff, {
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.58,
  });
  for (let x = -72; x <= 72; x += 18) {
    const line = createBox(0.045, 0.035, 38, horizonLineMat, {
      position: [x, -0.06, 58],
      castShadow: false,
    });
    line.userData = { type: 'network-grid-line' };
    group.add(line);
  }
  for (let z = 42; z <= 76; z += 8.5) {
    const line = createBox(160, 0.035, 0.045, horizonLineMat, {
      position: [0, -0.05, z],
      castShadow: false,
    });
    line.userData = { type: 'network-grid-line' };
    group.add(line);
  }

  const centerRing = new THREE.Mesh(
    new THREE.TorusGeometry(30.5, 0.08, 8, 96),
    createNetworkMaterial(0xfacc15, {
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.86,
      metalness: 0.14,
    })
  );
  centerRing.rotation.x = Math.PI / 2;
  centerRing.position.set(0, 0.16, 0);
  centerRing.userData = { type: 'network-center-ring', phase: 0 };
  registerFactoryObject(centerRing, {
    id: 'network.center-ring',
    name: '我的个人工厂网络中心环',
    module: '工厂网络系统',
    type: 'network-center-ring',
    level: 'L2 组合对象',
    sourceFunction: 'buildFactoryNetworkLayer()',
    businessMeaning: '把当前主工厂标记为工厂网络中的个人中心节点。',
    status: '中心节点',
    trackingMode: 'semantic',
  });
  state.signalLights.push(centerRing);
  group.add(centerRing);

  const centerLabel = createLabel('我的个人工厂 · 中心节点', [0, 10.4, 27], '#facc15', '12px', 'l6', {
    id: 'network-label.my-factory',
    name: '我的个人工厂网络中心标签',
    module: '工厂网络系统',
    businessMeaning: '标记当前主工厂是个人智能生产组织的中心。',
  });
  centerLabel.element.classList.add('factory-network-label', 'factory-network-name-label');
  group.add(centerLabel);

  const linkStart = [0, 2.4, 27.5];
  networkFactories.forEach((factory, index) => {
    const node = buildMiniFactoryNode(factory, index);
    group.add(node);
    const end = [factory.position[0], 2.2, factory.position[2] - 1.6];
    const { link, packet } = createNetworkLink(linkStart, end, factory, index);
    group.add(link);
    group.add(packet);
  });

  state.factoryNetwork.group = group;
  scene.add(group);
  return group;
}

function animateFactoryNetwork(t, dt) {
  if (!state.factoryNetwork.group || !state.factoryNetwork.open) return;
  const activeIds = getActiveNetworkFactoryIds();
  state.factoryNetwork.nodes.forEach(node => {
    const base = activeIds.has(node.userData.id) ? 1.035 : 1;
    const pulse = base + Math.sin(t * 1.8 + node.userData.phase) * 0.018;
    node.scale.setScalar(pulse);
  });
  state.factoryNetwork.links.forEach(link => {
    const active = activeIds.has(link.userData.factoryId);
    link.material.opacity = active ? 0.7 : 0.34 + Math.sin(t * 2 + link.userData.phase) * 0.08;
  });
  state.factoryNetwork.packets.forEach(packet => {
    const ud = packet.userData;
    ud.progress = (ud.progress + ud.speed * dt) % 1;
    const eased = ud.progress < 0.5
      ? 2 * ud.progress * ud.progress
      : 1 - Math.pow(-2 * ud.progress + 2, 2) / 2;
    packet.position.lerpVectors(ud.start, ud.end, eased);
    packet.position.y += Math.sin(t * 5 + eased * Math.PI) * 0.08;
    packet.rotation.y += dt * 1.8;
  });
}

function animateCameraToNetwork() {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos = new THREE.Vector3(42, 46, 104);
  const endTarget = new THREE.Vector3(0, 2.2, 38);
  const duration = 900;
  const startTime = performance.now();
  state.cruiseMode = false;
  controls.enabled = true;
  document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));

  function anim(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();
    if (t < 1) requestAnimationFrame(anim);
  }
  requestAnimationFrame(anim);
}

function createMatrixPart(w, h, d, material, position, nodeId, options = {}) {
  const part = createBox(w, h, d, material, {
    position,
    castShadow: options.castShadow !== false,
    receiveShadow: options.receiveShadow,
    rotation: options.rotation,
  });
  part.userData = {
    ...part.userData,
    type: options.type || 'matrix-part',
    matrixNodeId: nodeId,
    matrixRole: options.role || 'body',
  };
  return part;
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

function createMatrixSphere(radius, material, position, nodeId, options = {}) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, options.widthSegments || 18, options.heightSegments || 12),
    material,
  );
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = options.castShadow !== false;
  mesh.receiveShadow = !!options.receiveShadow;
  mesh.userData = {
    type: options.type || 'matrix-signal',
    matrixNodeId: nodeId,
    matrixRole: options.role || 'beacon',
    phase: options.phase,
  };
  return mesh;
}

function createMatrixCalloutLabel(node) {
  const div = document.createElement('div');
  div.className = 'scene-label scene-label-l6 factory-matrix-label factory-matrix-callout';
  div.dataset.labelLayer = 'l6';
  div.style.pointerEvents = 'none';
  div.innerHTML = `
    <span class="matrix-callout-dot"></span>
    <strong>${escapeHtml(node.capability)}</strong>
    <em>${node.match}%</em>
  `;
  const label = new CSS2DObject(div);
  label.position.set(2.75, 2.35, -1.28);
  label.userData = {
    type: 'label',
    labelLayer: 'l6',
    labelText: `${node.capability} ${node.match}%`,
    matrixNodeId: node.id,
  };
  registerFactoryObject(label, {
    id: `matrix.callout.${node.id}`,
    name: `${node.name} 参数标注`,
    module: '工厂网络系统',
    type: 'matrix-callout-label',
    level: 'L3 子物件',
    sourceFunction: 'createMatrixCalloutLabel()',
    businessMeaning: `矩阵节点 ${node.name} 的撮合参数浮动标注。`,
    labelLayer: 'l6',
    status: '仅在节点高亮时显示',
    trackingMode: 'semantic',
  });
  return label;
}

function buildMatrixFactoryNode(node) {
  const group = new THREE.Group();
  const foundationMat = createMatrixMaterial(0x0c1422, {
    roughness: 0.48,
    metalness: 0.18,
    emissive: 0x030812,
    emissiveIntensity: 0.08,
  });
  const platformMat = createMatrixMaterial(0x162235, {
    roughness: 0.42,
    metalness: 0.26,
    emissive: 0x07111d,
    emissiveIntensity: 0.12,
  });
  const wallMat = createMatrixMaterial(0x20324a, {
    roughness: 0.38,
    metalness: 0.32,
    emissive: 0x07111d,
    emissiveIntensity: 0.1,
  });
  const wallAltMat = createMatrixMaterial(0x17263b, {
    roughness: 0.42,
    metalness: 0.3,
    emissive: 0x06101c,
    emissiveIntensity: 0.12,
  });
  const roofMat = createMatrixMaterial(0x2c4360, {
    roughness: 0.3,
    metalness: 0.46,
    emissive: 0x081727,
    emissiveIntensity: 0.08,
  });
  const frameMat = createMatrixMaterial(0x54718d, {
    roughness: 0.28,
    metalness: 0.62,
    emissive: 0x07111d,
    emissiveIntensity: 0.08,
  });
  const glassMat = createMatrixMaterial(0x6bd7ff, {
    roughness: 0.12,
    transparent: true,
    opacity: 0.34,
    emissive: 0x1e9fc8,
    emissiveIntensity: 0.32,
    depthWrite: false,
  });
  const roofLineMat = createMatrixMaterial(0x83a7c2, {
    roughness: 0.24,
    metalness: 0.58,
    transparent: true,
    opacity: 0.86,
  });
  const accentMat = createMatrixMaterial(node.color, {
    emissive: node.color,
    emissiveIntensity: 0.82,
    transparent: true,
    opacity: 0.9,
  });
  const signalMat = createMatrixMaterial(0x2df29a, {
    emissive: 0x2df29a,
    emissiveIntensity: 2.2,
    metalness: 0.02,
  });
  const mutedSignalMat = createMatrixMaterial(node.industryColor, {
    emissive: node.industryColor,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.72,
  });

  const addPart = (w, h, d, material, position, options = {}) => {
    const part = createMatrixPart(w, h, d, material, position, node.id, options);
    group.add(part);
    return part;
  };
  const addCylinder = (rTop, rBot, h, segments, material, position, options = {}) => {
    const cylinder = createCylinder(rTop, rBot, h, segments, material, {
      position,
      rotation: options.rotation,
      castShadow: options.castShadow,
      receiveShadow: options.receiveShadow,
    });
    cylinder.userData = {
      type: options.type || 'matrix-cylinder',
      matrixNodeId: node.id,
      matrixRole: options.role || 'detail',
      phase: options.phase,
    };
    group.add(cylinder);
    return cylinder;
  };

  addPart(5.35, 0.18, 3.2, foundationMat, [0, 0.08, 0], {
    receiveShadow: true,
    role: 'pad',
  });
  addPart(4.85, 0.08, 2.78, platformMat, [0.04, 0.22, 0.04], {
    receiveShadow: true,
    role: 'pad',
  });

  for (let i = -2; i <= 2; i++) {
    addPart(0.026, 0.025, 2.55, frameMat, [i * 0.56, 0.29, 0.04], {
      castShadow: false,
      role: 'floor-line',
    });
    if (Math.abs(i) <= 1) {
      addPart(4.55, 0.025, 0.026, frameMat, [0.04, 0.3, i * 0.58], {
        castShadow: false,
        role: 'floor-line',
      });
    }
  }

  addPart(1.62, 1.02, 1.32, wallMat, [-0.58, 0.82, -0.06], { role: 'body' });
  addPart(0.96, 0.72, 1.04, wallAltMat, [0.76, 0.64, 0.2], { role: 'body' });
  addPart(0.56, 1.28, 0.56, glassMat, [-1.58, 0.9, 0.58], { role: 'glass' });
  addPart(0.9, 0.54, 0.055, glassMat, [-0.58, 0.88, -0.75], { role: 'glass' });
  addPart(0.055, 0.46, 0.78, glassMat, [0.18, 0.76, -0.05], { role: 'glass' });
  addPart(2.48, 0.12, 1.86, roofMat, [-0.44, 1.42, -0.04], { role: 'roof' });
  addPart(0.98, 0.1, 1.18, roofMat, [0.76, 1.08, 0.2], { role: 'roof' });

  for (let i = -2; i <= 2; i++) {
    addPart(0.035, 0.04, 1.72, roofLineMat, [-0.46 + i * 0.34, 1.51, -0.05], {
      castShadow: false,
      role: 'roof',
    });
  }
  for (let i = -1; i <= 1; i++) {
    addPart(2.22, 0.04, 0.035, roofLineMat, [-0.46, 1.53, -0.05 + i * 0.48], {
      castShadow: false,
      role: 'roof',
    });
  }

  [
    [-1.72, 0.84, -0.88],
    [0.74, 0.84, -0.88],
    [-1.72, 0.84, 0.94],
    [0.74, 0.84, 0.94],
  ].forEach(position => {
    addPart(0.08, 1.22, 0.08, frameMat, position, { role: 'frame' });
  });

  addPart(1.08, 0.2, 0.56, wallAltMat, [2.22, 0.42, -0.9], { role: 'body' });
  addPart(1.32, 0.08, 0.72, platformMat, [2.28, 0.27, -0.9], { role: 'pad' });
  addPart(0.48, 0.32, 0.42, accentMat, [2.28, 0.68, -0.9], { role: 'accent' });
  addCylinder(0.045, 0.045, 2.2, 12, accentMat, [1.34, 0.45, -0.9], {
    rotation: [0, 0, Math.PI / 2],
    castShadow: false,
    role: 'accent',
    type: 'matrix-pipe',
  });
  addCylinder(0.16, 0.16, 0.72, 16, wallAltMat, [-2.16, 0.62, -0.75], {
    role: 'body',
    type: 'matrix-tank',
  });
  addCylinder(0.11, 0.11, 0.92, 16, glassMat, [-2.46, 0.7, -0.58], {
    role: 'glass',
    type: 'matrix-tank',
  });

  [-0.2, 0.28, 0.76].forEach(x => {
    addPart(0.06, 0.42, 0.06, frameMat, [x, 0.58, 1.22], { role: 'frame' });
  });
  addPart(1.1, 0.05, 0.05, frameMat, [0.28, 0.82, 1.22], {
    castShadow: false,
    role: 'frame',
  });

  const cap = node.capability;
  if (cap === '数据接入') {
    addCylinder(0.18, 0.18, 0.055, 18, accentMat, [1.58, 1.08, 0.82], {
      rotation: [Math.PI / 2, 0.25, 0],
      castShadow: false,
      role: 'accent',
      type: 'matrix-dish',
    });
    addCylinder(0.026, 0.026, 0.9, 8, frameMat, [1.58, 0.76, 0.82], {
      castShadow: false,
      role: 'frame',
      type: 'matrix-antenna',
    });
  } else if (cap === '情报研究') {
    addCylinder(0.09, 0.11, 1.18, 10, frameMat, [1.42, 1.02, 0.72], {
      role: 'frame',
      type: 'matrix-observation-tower',
    });
    addPart(0.48, 0.18, 0.48, glassMat, [1.42, 1.68, 0.72], { role: 'glass' });
  } else if (cap === '需求洞察') {
    addPart(0.66, 0.5, 0.66, glassMat, [1.38, 0.78, 0.78], { role: 'glass' });
    addPart(0.44, 0.06, 0.44, accentMat, [1.38, 1.08, 0.78], { role: 'accent' });
  } else if (cap === '产品策略') {
    addPart(0.74, 0.42, 0.08, accentMat, [1.38, 0.82, 0.86], { role: 'accent' });
    addPart(0.12, 0.56, 0.08, frameMat, [0.92, 0.76, 0.86], { role: 'frame' });
  } else if (cap === '设计原型') {
    addPart(0.7, 0.08, 0.78, glassMat, [-0.44, 1.62, -0.04], { role: 'glass' });
    addPart(0.28, 0.2, 0.28, accentMat, [1.3, 0.58, 0.9], { role: 'accent' });
  } else if (cap === '开发执行') {
    addPart(1.28, 0.08, 0.26, frameMat, [1.25, 0.54, 0.92], { role: 'frame' });
    addPart(0.24, 0.18, 0.22, accentMat, [0.82, 0.68, 0.92], { role: 'accent' });
    addPart(0.24, 0.18, 0.22, accentMat, [1.52, 0.68, 0.92], { role: 'accent' });
  } else if (cap === '内容增长') {
    addCylinder(0.025, 0.025, 1.18, 8, frameMat, [1.5, 1.08, 0.84], {
      castShadow: false,
      role: 'frame',
      type: 'matrix-broadcast-mast',
    });
    addPart(0.52, 0.08, 0.24, accentMat, [1.5, 1.62, 0.84], { role: 'accent' });
  } else if (cap === '交付信用') {
    addPart(0.72, 0.5, 0.68, wallAltMat, [1.38, 0.78, 0.76], { role: 'body' });
    addPart(0.54, 0.06, 0.5, accentMat, [1.38, 1.08, 0.76], { role: 'accent' });
  }

  addPart(0.46, 0.08, 0.34, platformMat, [1.76, 0.36, -1.08], {
    role: 'signal-base',
    type: 'matrix-signal-base',
  });
  const signalMast = createCylinder(0.018, 0.018, 0.72, 8, frameMat, {
    position: [1.76, 0.78, -1.08],
    castShadow: false,
  });
  signalMast.userData = { type: 'matrix-signal-mast', matrixNodeId: node.id, matrixRole: 'frame' };
  group.add(signalMast);

  addPart(0.16, 0.44, 0.12, wallAltMat, [1.76, 1.2, -1.08], {
    role: 'signal-housing',
    type: 'matrix-signal-housing',
  });
  const signalLensColors = [0xffc14a, 0x3cc8ff, 0x2df29a];
  signalLensColors.forEach((color, index) => {
    const lensMat = createMatrixMaterial(color, {
      emissive: color,
      emissiveIntensity: index === 2 ? 2.2 : 0.5,
      transparent: true,
      opacity: index === 2 ? 0.95 : 0.5,
    });
    const lens = createCylinder(0.05, 0.05, 0.028, 16, lensMat, {
      position: [1.76, 1.08 + index * 0.13, -1.15],
      rotation: [Math.PI / 2, 0, 0],
      castShadow: false,
    });
    lens.userData = {
      type: 'matrix-signal-lens',
      matrixNodeId: node.id,
      matrixRole: index === 2 ? 'beacon' : 'signal-lens',
      phase: node.row * 0.7 + node.col * 0.33 + index * 0.2,
    };
    group.add(lens);
    if (index === 2) state.signalLights.push(lens);
  });

  const callout = createMatrixCalloutLabel(node);
  group.add(callout);

  group.position.set(node.position[0], node.position[1], node.position[2]);
  group.scale.setScalar(0.96);
  group.name = node.name;
  group.userData = {
    type: 'matrix-factory',
    id: node.id,
    title: node.name,
    industry: node.industry,
    capability: node.capability,
    match: node.match,
    credit: node.credit,
    load: node.load,
    available: node.available,
    phase: node.row * 0.45 + node.col * 0.2,
    baseY: node.position[1],
    baseScale: 0.96,
    calloutElement: callout.element,
  };
  registerFactoryObject(group, {
    id: `matrix.factory.${node.id}`,
    name: node.name,
    module: '工厂网络系统',
    type: 'matrix-factory',
    level: 'L1 业务组件',
    sourceFunction: 'buildFactoryMatrixLayer()',
    businessMeaning: `${node.industry} 场景中的 ${node.capability} 能力工厂，可作为协作经济网络中的供给或需求节点。`,
    status: '矩阵待扫描',
    trackingMode: 'semantic',
    interactive: true,
  });

  state.factoryMatrix.nodes.push(group);
  return group;
}

function createMatrixLink(startNode, endNode, opportunityIndex, segmentIndex) {
  const start = new THREE.Vector3(startNode.position.x, 2.05, startNode.position.z);
  const end = new THREE.Vector3(endNode.position.x, 2.05, endNode.position.z);
  const diff = end.clone().sub(start);
  const length = diff.length();
  const color = matrixOpportunities[opportunityIndex]?.score > 92 ? 0x24e89a : 0x34d399;
  const linkMat = createMatrixMaterial(color, {
    emissive: color,
    emissiveIntensity: 1.35,
    transparent: true,
    opacity: 0.0,
    metalness: 0.02,
  });
  const link = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, length, 10), linkMat);
  link.position.copy(start.clone().add(end).multiplyScalar(0.5));
  link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.clone().normalize());
  link.visible = false;
  link.userData = {
    type: 'matrix-link',
    opportunityIndex,
    segmentIndex,
    phase: opportunityIndex + segmentIndex * 0.35,
  };
  registerFactoryObject(link, {
    id: `matrix.link.${opportunityIndex}.${segmentIndex}`,
    name: `矩阵供应链连线 ${opportunityIndex + 1}-${segmentIndex + 1}`,
    module: '工厂网络系统',
    type: 'matrix-link',
    level: 'L2 组合对象',
    sourceFunction: 'buildFactoryMatrixLayer()',
    businessMeaning: '把矩阵中的相关工厂抽取出来，形成临时公司或供应链的连接关系。',
    status: '待高亮',
    trackingMode: 'semantic',
  });

  const packet = createMatrixSphere(0.18, createMatrixMaterial(color, {
    emissive: color,
    emissiveIntensity: 2.45,
    metalness: 0.02,
  }), [start.x, start.y, start.z], `matrix-packet-${opportunityIndex}-${segmentIndex}`, {
    castShadow: false,
  });
  packet.visible = false;
  packet.userData = {
    type: 'matrix-packet',
    opportunityIndex,
    segmentIndex,
    start,
    end,
    progress: (segmentIndex * 0.18) % 1,
    speed: 0.06,
  };
  registerFactoryObject(packet, {
    id: `matrix.packet.${opportunityIndex}.${segmentIndex}`,
    name: `矩阵协作物料 ${opportunityIndex + 1}-${segmentIndex + 1}`,
    module: '工厂网络系统',
    type: 'matrix-packet',
    level: 'L3 子物件',
    sourceFunction: 'buildFactoryMatrixLayer()',
    businessMeaning: '矩阵供应链中流动的需求、资产、任务或交付物。',
    status: '待流动',
    trackingMode: 'semantic',
  });

  state.factoryMatrix.links.push(link);
  state.factoryMatrix.packets.push(packet);
  return { link, packet };
}

function buildFactoryMatrixLayer() {
  if (state.factoryMatrix.group) return state.factoryMatrix.group;

  const group = new THREE.Group();
  group.name = 'Factory Matrix Network Layer';
  group.visible = false;
  group.userData = { type: 'factory-matrix-layer' };
  registerFactoryObject(group, {
    id: 'matrix.layer',
    name: '工厂矩阵网络图层',
    module: '工厂网络系统',
    type: 'factory-matrix-layer',
    level: 'L1 业务组件',
    sourceFunction: 'buildFactoryMatrixLayer()',
    businessMeaning: '展示能力链与行业场景构成的生产力矩阵，用于自动发现大规模撮合机会。',
    status: '可切换',
    trackingMode: 'semantic',
  });

  const boundaryMat = createMatrixMaterial(0x3cc8ff, {
    roughness: 0.28,
    emissive: 0x3cc8ff,
    emissiveIntensity: 0.48,
    transparent: true,
    opacity: 0.38,
  });
  [
    { size: [110, 0.035, 0.05], position: [0, -0.08, 102] },
    { size: [110, 0.035, 0.05], position: [0, -0.08, 164] },
    { size: [0.05, 0.035, 62], position: [-55, -0.08, 133] },
    { size: [0.05, 0.035, 62], position: [55, -0.08, 133] },
  ].forEach((edge, index) => {
    const rail = createBox(edge.size[0], edge.size[1], edge.size[2], boundaryMat, {
      position: edge.position,
      castShadow: false,
    });
    rail.userData = { type: 'matrix-network-boundary', index };
    group.add(rail);
  });

  const lineMat = createMatrixMaterial(0x3cc8ff, {
    emissive: 0x3cc8ff,
    emissiveIntensity: 0.28,
    transparent: true,
    opacity: 0.28,
  });
  const nodeDotMat = createMatrixMaterial(0x3ee898, {
    emissive: 0x3ee898,
    emissiveIntensity: 0.85,
    transparent: true,
    opacity: 0.72,
  });
  matrixCapabilities.forEach((capability, col) => {
    const x = (col - 3.5) * 11.7;
    const line = createBox(0.035, 0.03, 55, lineMat, {
      position: [x, -0.05, 133],
      castShadow: false,
    });
    line.userData = { type: 'matrix-grid-line' };
    group.add(line);
    const label = createLabel(capability.label, [x, 1.08, 104.2], `#${capability.color.toString(16).padStart(6, '0')}`, '9px', 'l6', {
      id: `matrix-label.capability.${capability.key}`,
      name: `${capability.label} 能力列`,
      module: '工厂网络系统',
      businessMeaning: `工厂矩阵横轴能力列：${capability.label}。`,
    });
    label.element.classList.add('factory-matrix-label');
    group.add(label);
  });

  matrixIndustries.forEach((industry, row) => {
    const z = 111 + row * 8.4;
    const line = createBox(98, 0.03, 0.035, lineMat, {
      position: [0, -0.04, z],
      castShadow: false,
    });
    line.userData = { type: 'matrix-grid-line' };
    group.add(line);
    const label = createLabel(industry.label, [-51, 1.2, z], `#${industry.color.toString(16).padStart(6, '0')}`, '10px', 'l6', {
      id: `matrix-label.industry.${industry.key}`,
      name: `${industry.label} 行业行`,
      module: '工厂网络系统',
      businessMeaning: `工厂矩阵纵轴行业/场景行：${industry.label}。`,
    });
    label.element.classList.add('factory-matrix-label', 'factory-matrix-axis-label');
    group.add(label);
  });

  matrixCapabilities.forEach((capability, col) => {
    const x = (col - 3.5) * 11.7;
    matrixIndustries.forEach((industry, row) => {
      const z = 111 + row * 8.4;
      const dot = createCylinder(0.055, 0.055, 0.025, 12, nodeDotMat, {
        position: [x, -0.015, z],
        castShadow: false,
      });
      dot.userData = {
        type: 'matrix-network-node',
        capability: capability.label,
        industry: industry.label,
      };
      group.add(dot);
    });
  });

  const titleLabel = createLabel('PFN Matrix Engine', [-17, 4.8, 101.2], '#9fffd2', '12px', 'l6', {
    id: 'matrix-label.title',
    name: '工厂矩阵标题标注',
    module: '工厂网络系统',
    businessMeaning: '矩阵网络展示层的标题标注。',
  });
  titleLabel.element.classList.add('factory-matrix-label', 'factory-matrix-title-label');
  group.add(titleLabel);

  matrixFactoryNodes.forEach(node => {
    const nodeGroup = buildMatrixFactoryNode(node);
    group.add(nodeGroup);
  });

  const byId = new Map(state.factoryMatrix.nodes.map(node => [node.userData.id, node]));
  matrixOpportunities.forEach((opportunity, opportunityIndex) => {
    for (let i = 0; i < opportunity.nodeIds.length - 1; i++) {
      const startNode = byId.get(opportunity.nodeIds[i]);
      const endNode = byId.get(opportunity.nodeIds[i + 1]);
      if (!startNode || !endNode) continue;
      const { link, packet } = createMatrixLink(startNode, endNode, opportunityIndex, i);
      group.add(link);
      group.add(packet);
    }
  });

  state.factoryMatrix.group = group;
  scene.add(group);
  return group;
}

function getActiveMatrixNodeIds() {
  return new Set(matrixOpportunities[state.factoryMatrix.activeOpportunity]?.nodeIds || []);
}

function animateFactoryMatrix(t, dt) {
  if (!state.factoryMatrix.group || !state.factoryMatrix.open) return;
  const activeIds = getActiveMatrixNodeIds();
  state.factoryMatrix.nodes.forEach(node => {
    const active = activeIds.has(node.userData.id);
    const targetY = state.factoryMatrix.companyMode && active ? 1.28 : active ? 0.42 : 0;
    node.position.y = THREE.MathUtils.lerp(node.position.y, targetY, 0.08);
    const baseScale = state.factoryMatrix.companyMode && active ? 1.38 : active ? 1.16 : node.userData.baseScale;
    const pulse = baseScale + Math.sin(t * 1.9 + node.userData.phase) * (active ? 0.018 : 0.004);
    node.scale.setScalar(pulse);
  });

  state.factoryMatrix.links.forEach(link => {
    const active = link.userData.opportunityIndex === state.factoryMatrix.activeOpportunity;
    link.visible = active && (state.factoryMatrix.scanned || state.factoryMatrix.companyMode);
    if (link.visible) link.material.opacity = state.factoryMatrix.companyMode ? 0.62 : 0.32 + Math.sin(t * 2 + link.userData.phase) * 0.06;
  });

  state.factoryMatrix.packets.forEach(packet => {
    const active = packet.userData.opportunityIndex === state.factoryMatrix.activeOpportunity;
    packet.visible = active && state.factoryMatrix.companyMode;
    if (!packet.visible) return;
    const ud = packet.userData;
    ud.progress = (ud.progress + ud.speed * dt) % 1;
    packet.position.lerpVectors(ud.start, ud.end, ud.progress);
    packet.position.y = 2.55 + Math.sin(t * 4 + ud.progress * Math.PI) * 0.13;
    packet.rotation.y += dt * 1.9;
  });
}

function animateCameraToMatrix() {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos = new THREE.Vector3(36, 44, 176);
  const endTarget = new THREE.Vector3(-8, 1.2, 132);
  const duration = 980;
  const startTime = performance.now();
  state.cruiseMode = false;
  controls.enabled = true;
  document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));

  function anim(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();
    if (t < 1) requestAnimationFrame(anim);
  }
  requestAnimationFrame(anim);
}

function animateCameraToPose(endPos, endTarget, duration = 900, onDone) {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const targetPos = endPos.clone();
  const targetLook = endTarget.clone();
  const startTime = performance.now();
  state.cruiseMode = false;
  controls.enabled = true;

  function anim() {
    const t = Math.min((performance.now() - startTime) / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    camera.position.lerpVectors(startPos, targetPos, ease);
    controls.target.lerpVectors(startTarget, targetLook, ease);
    controls.update();
    if (t < 1) {
      requestAnimationFrame(anim);
    } else if (onDone) {
      onDone();
    }
  }
  requestAnimationFrame(anim);
}

function createTowerCockpitLabel(text, position, color = '#dffcff', size = '10px') {
  const div = document.createElement('div');
  div.className = 'tower-cockpit-label';
  div.textContent = text;
  div.style.color = color;
  div.style.fontSize = size;
  div.style.textShadow = `0 0 10px ${color}, 0 2px 6px rgba(0,0,0,0.9)`;
  const label = new CSS2DObject(div);
  label.position.set(position[0], position[1], position[2]);
  label.userData.skipRegistry = true;
  return label;
}

function createCockpitPanel(width, height, colorHex, options = {}) {
  const panel = new THREE.Group();
  const color = new THREE.Color(colorHex);
  const frameDepth = options.frameDepth ?? 0.02;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: options.opacity ?? 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  glass.userData.skipRegistry = true;
  panel.add(glass);

  const edgeMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const top = createBox(width, 0.035, 0.02, edgeMaterial, { position: [0, height / 2, 0.02], castShadow: false });
  const bottom = createBox(width, 0.035, 0.02, edgeMaterial, { position: [0, -height / 2, 0.02], castShadow: false });
  const left = createBox(0.035, height, 0.02, edgeMaterial, { position: [-width / 2, 0, 0.02], castShadow: false });
  const right = createBox(0.035, height, 0.02, edgeMaterial, { position: [width / 2, 0, 0.02], castShadow: false });
  panel.add(top, bottom, left, right);

  const cornerLength = Math.min(width, height) * 0.16;
  const notchMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  [
    [-width / 2 + cornerLength * 0.5, height / 2 - 0.11, 0],
    [width / 2 - cornerLength * 0.5, height / 2 - 0.11, 0],
    [-width / 2 + cornerLength * 0.5, -height / 2 + 0.11, 0],
    [width / 2 - cornerLength * 0.5, -height / 2 + 0.11, 0],
  ].forEach(([x, y]) => {
    const notch = createBox(cornerLength, 0.02, frameDepth, notchMaterial, {
      position: [x, y, 0.04],
      castShadow: false,
    });
    panel.add(notch);
  });

  const lineMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  for (let i = 0; i < 4; i++) {
    const y = -height * 0.28 + i * height * 0.18;
    const x = -width * 0.18 + (i % 2) * width * 0.18;
    const line = createBox(width * (0.24 + i * 0.07), 0.018, 0.02, lineMaterial, {
      position: [x, y, 0.03],
      castShadow: false,
    });
    panel.add(line);
  }
  return panel;
}

function createCylinderBetween(start, end, radius, material, options = {}) {
  const diff = end.clone().sub(start);
  const length = diff.length();
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, options.segments || 12), material);
  cylinder.position.copy(start.clone().add(end).multiplyScalar(0.5));
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.clone().normalize());
  cylinder.userData.skipRegistry = true;
  return cylinder;
}

function setObjectOpacity(object, opacity) {
  object.traverse(child => {
    if (!child.material) return;
    child.material.transparent = true;
    child.material.opacity = opacity;
  });
}

function buildCockpitChair(group, materialSet, origin) {
  const chair = new THREE.Group();
  chair.position.copy(origin).add(new THREE.Vector3(0, 0.25, 4.85));
  const base = createCylinder(0.46, 0.58, 0.28, 16, materialSet.darkMetal, { position: [0, 0.14, 0], receiveShadow: true });
  const seat = createBox(1.28, 0.28, 1.08, materialSet.panel, { position: [0, 0.48, 0], receiveShadow: true });
  const back = createBox(1.18, 1.78, 0.28, materialSet.panel, { position: [0, 1.35, 0.48], rotation: [-0.12, 0, 0], receiveShadow: true });
  const head = createBox(0.8, 0.34, 0.2, materialSet.darkMetal, { position: [0, 2.34, 0.62], receiveShadow: true });
  const armL = createBox(0.2, 0.28, 1.14, materialSet.darkMetal, { position: [-0.8, 0.72, -0.02] });
  const armR = createBox(0.2, 0.28, 1.14, materialSet.darkMetal, { position: [0.8, 0.72, -0.02] });
  const cyanTrim = createBox(0.94, 0.035, 0.035, materialSet.cyanLight, { position: [0, 2.08, 0.78], castShadow: false });
  const shoulderL = createBox(0.22, 0.78, 0.18, materialSet.darkMetal, { position: [-0.62, 1.35, 0.64], rotation: [-0.1, 0, 0] });
  const shoulderR = createBox(0.22, 0.78, 0.18, materialSet.darkMetal, { position: [0.62, 1.35, 0.64], rotation: [-0.1, 0, 0] });
  const footRail = createBox(1.7, 0.08, 0.16, materialSet.cyanLight, { position: [0, 0.18, -0.76], castShadow: false });
  chair.add(base, seat, back, head, armL, armR, cyanTrim, shoulderL, shoulderR, footRail);
  group.add(chair);
  return chair;
}

function buildExecutiveAgentSeat(group, agent, localPosition, rotationY, materialSet) {
  const seatGroup = new THREE.Group();
  seatGroup.position.copy(EXECUTIVE_TOWER_ORIGIN).add(new THREE.Vector3(localPosition[0], localPosition[1], localPosition[2]));
  seatGroup.rotation.y = rotationY;
  seatGroup.userData.type = 'executive-agent-seat';
  seatGroup.userData.executiveAgentId = agent.id;
  seatGroup.userData.title = agent.title;

  const color = new THREE.Color(agent.color);
  const colorHex = color.getHex();
  const accentMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 1.3,
    roughness: 0.26,
    metalness: 0.35,
    transparent: true,
    opacity: 0.92,
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const consoleMat = new THREE.MeshStandardMaterial({
    color: 0x132033,
    emissive: colorHex,
    emissiveIntensity: 0.24,
    roughness: 0.34,
    metalness: 0.72,
  });

  const chairBase = createCylinder(0.35, 0.42, 0.22, 14, materialSet.darkMetal, { position: [0, 0.12, 0.64] });
  const chairSeat = createBox(0.92, 0.2, 0.78, materialSet.panel, { position: [0, 0.38, 0.62], receiveShadow: true });
  const chairBack = createBox(0.82, 1.1, 0.18, materialSet.panel, { position: [0, 1.02, 1.03], rotation: [-0.1, 0, 0] });
  const console = createBox(1.72, 0.22, 0.92, consoleMat, { position: [0, 0.58, -0.58], rotation: [-0.18, 0, 0], receiveShadow: true });
  const screen = createBox(1.42, 0.035, 0.58, glowMat, { position: [0, 0.78, -0.7], rotation: [-0.18, 0, 0], castShadow: false });
  const pad = createBox(1.05, 0.04, 0.08, accentMat, { position: [0, 0.72, -1.08], rotation: [-0.18, 0, 0], castShadow: false });
  const rail = createBox(1.86, 0.08, 0.12, accentMat, { position: [0, 0.18, -1.1], castShadow: false });
  const sideRailL = createBox(0.08, 0.08, 0.9, accentMat, { position: [-0.68, 0.18, -0.42], castShadow: false });
  const sideRailR = createBox(0.08, 0.08, 0.9, accentMat, { position: [0.68, 0.18, -0.42], castShadow: false });
  const statusTower = createCylinder(0.055, 0.055, 0.62, 10, accentMat, { position: [0.78, 1.02, -0.18], castShadow: false });
  const statusDot = createCylinder(0.12, 0.12, 0.04, 16, glowMat, { position: [0.78, 1.36, -0.18], castShadow: false });
  statusDot.rotation.x = Math.PI / 2;

  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.025, 8, 64), glowMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 0.08, 0.04);
  halo.userData.skipRegistry = true;
  const pulseRingMat = glowMat.clone();
  pulseRingMat.opacity = 0.18;
  const pulseRing = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.018, 8, 72), pulseRingMat);
  pulseRing.rotation.x = Math.PI / 2;
  pulseRing.position.set(0, 0.09, 0.24);
  pulseRing.userData.skipRegistry = true;

  const hit = createBox(2.25, 1.7, 2.2, new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), {
    position: [0, 0.9, 0],
    castShadow: false,
    data: {
      type: 'executive-agent-seat',
      executiveAgentId: agent.id,
      title: agent.title,
    },
  });
  state.interactiveObjects.push(hit);
  state.executiveTower.interactiveObjects.push(hit);

  const label = createTowerCockpitLabel(agent.title.replace(' Agent', ''), [0, 1.9, -0.2], agent.color, '10px');
  seatGroup.add(chairBase, chairSeat, chairBack, console, screen, pad, rail, sideRailL, sideRailR, statusTower, statusDot, halo, pulseRing, hit, label);
  seatGroup.userData.accentMaterial = accentMat;
  seatGroup.userData.glowMaterial = glowMat;
  seatGroup.userData.consoleMaterial = consoleMat;
  seatGroup.userData.halo = halo;
  seatGroup.userData.pulseRing = pulseRing;
  seatGroup.userData.screen = screen;
  seatGroup.userData.pad = pad;
  seatGroup.userData.baseScale = seatGroup.scale.clone();
  group.add(seatGroup);
  state.executiveTower.seats.set(agent.id, seatGroup);
}

function addExecutiveCockpitDetailing(group, materialSet, origin) {
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x101827, roughness: 0.48, metalness: 0.88 });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x38475c, roughness: 0.42, metalness: 0.82 });
  const boltMat = new THREE.MeshStandardMaterial({ color: 0x6f8299, roughness: 0.38, metalness: 0.86 });
  const cyanGlass = new THREE.MeshBasicMaterial({
    color: 0x78f4ff,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const greenGlass = new THREE.MeshBasicMaterial({
    color: 0x3ee898,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const orangeGlass = new THREE.MeshBasicMaterial({
    color: 0xffa940,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // Segmented metal deck plates and bolt rings make the floor read as engineered machinery.
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const radius = i % 2 === 0 ? 5.8 : 7.2;
    const deck = createBox(1.42, 0.035, 2.45, deckMat, {
      position: [origin.x + Math.sin(angle) * radius, 0.5, origin.z + Math.cos(angle) * radius - 0.9],
      rotation: [0, angle, 0],
      receiveShadow: true,
    });
    const seam = createBox(1.18, 0.04, 0.035, seamMat, {
      position: [origin.x + Math.sin(angle) * (radius + 0.22), 0.54, origin.z + Math.cos(angle) * (radius + 0.22) - 0.9],
      rotation: [0, angle, 0],
      castShadow: false,
    });
    group.add(deck, seam);
  }

  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const radius = i % 2 === 0 ? 4.8 : 8.65;
    const bolt = createCylinder(0.055, 0.055, 0.035, 10, boltMat, {
      position: [origin.x + Math.sin(angle) * radius, 0.55, origin.z + Math.cos(angle) * radius - 0.45],
      castShadow: false,
    });
    group.add(bolt);
  }

  // Forward command console bank under the observation window.
  for (let i = -3; i <= 3; i++) {
    const width = i === 0 ? 1.6 : 1.28;
    const consoleBase = createBox(width, 0.32, 0.72, materialSet.darkMetal, {
      position: [origin.x + i * 1.55, 1.02, origin.z - 5.28 + Math.abs(i) * 0.05],
      rotation: [-0.08, 0, 0],
      receiveShadow: true,
    });
    const consoleScreen = createBox(width * 0.76, 0.035, 0.42, i % 3 === 0 ? greenGlass : cyanGlass, {
      position: [origin.x + i * 1.55, 1.26, origin.z - 5.45 + Math.abs(i) * 0.05],
      rotation: [-0.18, 0, 0],
      castShadow: false,
    });
    group.add(consoleBase, consoleScreen);
    for (let j = 0; j < 3; j++) {
      const key = createBox(0.16, 0.035, 0.08, j === 2 ? orangeGlass : materialSet.cyanLight, {
        position: [origin.x + i * 1.55 - 0.26 + j * 0.26, 1.3, origin.z - 5.05 + Math.abs(i) * 0.05],
        castShadow: false,
      });
      group.add(key);
    }
  }

  // Five radial work lanes from each executive seat into the central intent table.
  executiveAgents.forEach((agent, index) => {
    const angle = (index / executiveAgents.length) * Math.PI * 2 + Math.PI * 0.08;
    const color = new THREE.Color(agent.color);
    const laneMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const lane = createBox(0.045, 0.028, 5.6, laneMat, {
      position: [origin.x + Math.sin(angle) * 2.55, 0.64, origin.z - 1.2 + Math.cos(angle) * 2.55],
      rotation: [0, angle, 0],
      castShadow: false,
    });
    group.add(lane);

    for (let j = 0; j < 3; j++) {
      const beadMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.08 + j * 0.012, 14, 8), beadMat);
      bead.userData = {
        skipRegistry: true,
        angle,
        radius: 4.8 - j * 1.1,
        phase: index * 0.28 + j * 0.33,
        speed: 0.18 + j * 0.035,
        baseY: 0.82 + j * 0.08,
        center: origin.clone(),
      };
      bead.position.set(
        origin.x + Math.sin(angle) * bead.userData.radius,
        bead.userData.baseY,
        origin.z - 1.2 + Math.cos(angle) * bead.userData.radius,
      );
      group.add(bead);
      state.executiveTower.animatedObjects.push({ object: bead, kind: 'data-beacon', speed: bead.userData.speed });
    }
  });

  // Side equipment racks, sensor pillars, and diagnostic blocks enrich the cockpit silhouette.
  [-1, 1].forEach(side => {
    for (let i = 0; i < 3; i++) {
      const z = origin.z - 4.9 + i * 2.35;
      const rack = createBox(0.42, 1.25 + i * 0.12, 0.68, materialSet.darkMetal, {
        position: [origin.x + side * 7.05, 1.18 + i * 0.08, z],
        receiveShadow: true,
      });
      const rackScreen = createBox(0.035, 0.56, 0.46, i === 1 ? orangeGlass : cyanGlass, {
        position: [origin.x + side * 6.8, 1.46 + i * 0.08, z],
        rotation: [0, side * Math.PI / 2, 0],
        castShadow: false,
      });
      const antenna = createCylinder(0.025, 0.025, 0.95, 8, materialSet.cyanLight, {
        position: [origin.x + side * 7.08, 2.35 + i * 0.08, z + 0.18],
        castShadow: false,
      });
      group.add(rack, rackScreen, antenna);
    }
  });

  // Small controls on the central table surface.
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const radius = 1.25 + (i % 3) * 0.22;
    const control = createBox(0.18, 0.04, 0.08, i % 4 === 0 ? orangeGlass : cyanGlass, {
      position: [origin.x + Math.sin(angle) * radius, 1.44, origin.z - 1.2 + Math.cos(angle) * radius],
      rotation: [0, angle, 0],
      castShadow: false,
    });
    group.add(control);
  }
}

function addStrategicCrucibleSystem(group, materialSet, origin, seatPlacements) {
  const coreCenter = new THREE.Vector3(origin.x, 2.08, origin.z - 1.2);
  const coreBase = new THREE.Vector3(origin.x, 1.36, origin.z - 1.2);

  const chamberMat = new THREE.MeshBasicMaterial({
    color: 0xdffcff,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const chamber = new THREE.Group();
  chamber.name = 'Temporary Collaboration Chamber Shell';
  chamber.position.copy(coreCenter);
  chamber.userData = { skipRegistry: true, baseScale: 1 };
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.18 + i * 0.34, 0.012, 8, 96), chamberMat.clone());
    ring.position.y = i * 0.18;
    ring.rotation.x = Math.PI / 2;
    ring.userData.skipRegistry = true;
    chamber.add(ring);
  }
  [-0.7, 0, 0.7].forEach(angle => {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(2.32, 0.01, 8, 96), chamberMat.clone());
    arc.rotation.set(Math.PI / 2, angle, 0);
    arc.scale.z = 0.42;
    arc.userData.skipRegistry = true;
    chamber.add(arc);
  });
  group.add(chamber);
  state.executiveTower.animatedObjects.push({ object: chamber, kind: 'chamber-shell', speed: 0.08 });

  executiveAgents.forEach((agent, index) => {
    const placement = seatPlacements[agent.id];
    if (!placement) return;
    const color = new THREE.Color(agent.color);
    const beamMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const start = EXECUTIVE_TOWER_ORIGIN.clone().add(new THREE.Vector3(
      placement.pos[0] * 0.84,
      1.05,
      placement.pos[2] * 0.84,
    ));
    const end = coreBase.clone();
    const beam = createCylinderBetween(start, end, 0.02, beamMat, { segments: 10 });
    beam.userData = { skipRegistry: true, agentId: agent.id };
    group.add(beam);
    state.executiveTower.animatedObjects.push({ object: beam, kind: 'intent-beam', speed: 0.2 });

    for (let j = 0; j < 2; j++) {
      const pulseMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), pulseMat);
      pulse.userData = {
        skipRegistry: true,
        agentId: agent.id,
        start,
        end,
        progress: (index * 0.17 + j * 0.45) % 1,
        speed: 0.18 + j * 0.05,
      };
      pulse.position.copy(start);
      group.add(pulse);
      state.executiveTower.animatedObjects.push({ object: pulse, kind: 'intent-pulse', speed: pulse.userData.speed });
    }
  });

  const conduitCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(origin.x, 1.28, origin.z - 1.2),
    new THREE.Vector3(origin.x, 1.08, origin.z + 1.8),
    new THREE.Vector3(origin.x, 1.42, origin.z + 4.6),
    new THREE.Vector3(origin.x, 2.25, origin.z + 7.2),
  ]);
  const conduitMat = new THREE.MeshBasicMaterial({
    color: 0xffc14a,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const conduit = new THREE.Mesh(new THREE.TubeGeometry(conduitCurve, 72, 0.04, 10, false), conduitMat);
  conduit.userData = { skipRegistry: true, curve: conduitCurve };
  group.add(conduit);
  state.executiveTower.animatedObjects.push({ object: conduit, kind: 'reflux-conduit', speed: 0.08 });

  for (let i = 0; i < 4; i++) {
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0xffd37a,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const refluxPulse = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 8), pulseMat);
    refluxPulse.userData = {
      skipRegistry: true,
      curve: conduitCurve,
      progress: i * 0.24,
      speed: 0.18 + i * 0.02,
    };
    refluxPulse.visible = false;
    group.add(refluxPulse);
    state.executiveTower.animatedObjects.push({ object: refluxPulse, kind: 'reflux-pulse', speed: refluxPulse.userData.speed });
  }
}

function buildExecutiveTowerInterior() {
  if (state.executiveTower.group) return state.executiveTower.group;

  const group = new THREE.Group();
  group.name = 'Executive Tower Cockpit Interior';
  group.visible = false;
  state.executiveTower.group = group;
  state.executiveTower.seats = new Map();
  state.executiveTower.interactiveObjects = [];
  state.executiveTower.animatedObjects = [];

  registerFactoryObject(group, {
    id: 'executive-tower.interior',
    name: '中控塔内部 3D 指挥舱',
    module: '运营 UI 系统',
    type: 'executive-cockpit',
    level: 'L1 业务组件',
    sourceFunction: 'buildExecutiveTowerInterior()',
    businessMeaning: 'CEO/CIO/COO/CTO/CFO 五个 AI 高管队友经营个人数字工厂的 3D 指挥舱。',
    status: '运行中',
    trackingMode: 'semantic',
  });

  const materialSet = {
    floor: new THREE.MeshStandardMaterial({ color: 0x141c2b, roughness: 0.58, metalness: 0.72 }),
    floorDark: new THREE.MeshStandardMaterial({ color: 0x0a101a, roughness: 0.52, metalness: 0.86 }),
    hull: new THREE.MeshStandardMaterial({ color: 0x263344, roughness: 0.45, metalness: 0.74 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x1a2433, roughness: 0.38, metalness: 0.72 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x08101c, roughness: 0.42, metalness: 0.84 }),
    cyanLight: new THREE.MeshStandardMaterial({ color: 0x99f6ff, emissive: 0x3cc8ff, emissiveIntensity: 2.6, roughness: 0.2, metalness: 0.25 }),
    glass: new THREE.MeshBasicMaterial({ color: 0x78f4ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    windowGlass: new THREE.MeshBasicMaterial({ color: 0x9befff, transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false }),
    warmLight: new THREE.MeshStandardMaterial({ color: 0xffcf66, emissive: 0xffa940, emissiveIntensity: 1.8, roughness: 0.22, metalness: 0.3 }),
  };

  const origin = EXECUTIVE_TOWER_ORIGIN;
  const floor = createCylinder(9.7, 10.4, 0.34, 96, materialSet.floor, {
    position: [origin.x, 0, origin.z],
    receiveShadow: true,
    registry: {
      id: 'executive-tower.floor-platform',
      name: '指挥舱圆形地台',
      module: '运营 UI 系统',
      type: 'cockpit-floor',
      level: 'L2 组合对象',
      sourceFunction: 'buildExecutiveTowerInterior()',
      businessMeaning: '塔内指挥舱的环形地台和空间基座。',
      trackingMode: 'semantic',
    },
  });
  group.add(floor);

  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.035, 8, 128), materialSet.cyanLight);
  innerRing.position.set(origin.x, 0.28, origin.z);
  innerRing.rotation.x = Math.PI / 2;
  innerRing.userData.skipRegistry = true;
  group.add(innerRing);
  state.executiveTower.animatedObjects.push({ object: innerRing, kind: 'slow-ring', speed: 0.08 });

  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.028, 8, 128), materialSet.cyanLight);
  outerRing.position.set(origin.x, 0.32, origin.z);
  outerRing.rotation.x = Math.PI / 2;
  outerRing.userData.skipRegistry = true;
  group.add(outerRing);
  state.executiveTower.animatedObjects.push({ object: outerRing, kind: 'slow-ring', speed: -0.045 });

  // Radial floor rails, deck grooves, and hull ribs.
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const length = i % 2 === 0 ? 8.8 : 6.6;
    const rail = createBox(0.035, 0.035, length, materialSet.hull, {
      position: [origin.x + Math.sin(angle) * length * 0.25, 0.42, origin.z + Math.cos(angle) * length * 0.25],
      rotation: [0, angle, 0],
      castShadow: false,
    });
    group.add(rail);
  }
  for (let i = -4; i <= 4; i++) {
    const groove = createBox(0.026, 0.026, 6.8, materialSet.cyanLight, {
      position: [origin.x + i * 1.35, 0.46, origin.z + 0.35],
      rotation: [0, 0, 0],
      castShadow: false,
    });
    groove.material = groove.material.clone();
    groove.material.emissiveIntensity = i === 0 ? 2.8 : 1.4;
    group.add(groove);
  }

  const canopyOuter = new THREE.Mesh(new THREE.TorusGeometry(7.55, 0.065, 10, 128), materialSet.hull);
  canopyOuter.position.set(origin.x, 6.05, origin.z - 1.95);
  canopyOuter.rotation.x = Math.PI / 2;
  canopyOuter.userData.skipRegistry = true;
  const canopyInner = new THREE.Mesh(new THREE.TorusGeometry(6.7, 0.035, 8, 128), materialSet.cyanLight);
  canopyInner.position.set(origin.x, 6.02, origin.z - 1.95);
  canopyInner.rotation.x = Math.PI / 2;
  canopyInner.userData.skipRegistry = true;
  group.add(canopyOuter, canopyInner);
  state.executiveTower.animatedObjects.push({ object: canopyInner, kind: 'slow-ring', speed: 0.035 });

  [-1, 1].forEach(side => {
    const sideWall = createBox(0.28, 3.65, 8.5, materialSet.hull, {
      position: [origin.x + side * 8.35, 2.85, origin.z - 2.75],
      rotation: [0, side * 0.14, 0],
      receiveShadow: true,
    });
    const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 2.45), materialSet.windowGlass);
    sideGlass.position.set(origin.x + side * 8.08, 3.08, origin.z - 2.25);
    sideGlass.rotation.set(0, side * (Math.PI / 2 - 0.12), 0);
    sideGlass.userData.skipRegistry = true;
    group.add(sideWall, sideGlass);
    for (let j = 0; j < 4; j++) {
      const strip = createBox(0.08, 0.08, 1.25, materialSet.cyanLight, {
        position: [origin.x + side * 7.82, 4.64, origin.z - 5.6 + j * 1.65],
        rotation: [0, side * (Math.PI / 2 - 0.12), 0],
        castShadow: false,
      });
      group.add(strip);
    }
  });

  for (let i = -5; i <= 5; i++) {
    const x = i * 1.8;
    const ceiling = createBox(1.05, 0.08, 0.16, materialSet.cyanLight, {
      position: [origin.x + x, 6.68, origin.z - 7.95],
      castShadow: false,
    });
    group.add(ceiling);
  }

  // Front observation window and external factory hologram.
  const windowFrame = createBox(12.2, 3.8, 0.16, materialSet.hull, {
    position: [origin.x, 3.35, origin.z - 8.75],
    castShadow: false,
  });
  const windowGlass = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 3.35), materialSet.windowGlass);
  windowGlass.position.set(origin.x, 3.35, origin.z - 8.66);
  windowGlass.userData.skipRegistry = true;
  group.add(windowFrame, windowGlass);

  const outsideSignal = new THREE.Mesh(new THREE.SphereGeometry(0.78, 28, 16), new THREE.MeshBasicMaterial({
    color: 0x3cc8ff,
    transparent: true,
    opacity: 0.2,
    wireframe: true,
    depthWrite: false,
  }));
  outsideSignal.position.set(origin.x + 3.6, 3.35, origin.z - 9.15);
  outsideSignal.userData.skipRegistry = true;
  const outsideOrbit = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.018, 8, 72), materialSet.cyanLight);
  outsideOrbit.position.copy(outsideSignal.position);
  outsideOrbit.rotation.set(Math.PI / 2, 0.3, 0);
  outsideOrbit.userData.skipRegistry = true;
  group.add(outsideSignal, outsideOrbit);
  state.executiveTower.animatedObjects.push({ object: outsideSignal, kind: 'signal-sphere', speed: 0.16 });

  for (let i = -3; i <= 3; i++) {
    const mini = createBox(0.8, 0.06, 0.42, materialSet.cyanLight, {
      position: [origin.x + i * 1.35, 2.68 + (i % 2) * 0.12, origin.z - 8.48],
      rotation: [0, 0.18, 0],
      castShadow: false,
    });
    group.add(mini);
  }

  // Curved hull wall panels.
  for (let i = -4; i <= 4; i++) {
    const x = i * 2.18;
    const panel = createBox(1.6, 2.3, 0.18, materialSet.panel, {
      position: [origin.x + x, 3.15, origin.z - 9.18 + Math.abs(i) * 0.12],
      rotation: [0, -i * 0.05, 0],
      receiveShadow: true,
    });
    group.add(panel);
  }

  const panelSpecs = [
    { pos: [-5.4, 4.2, -7.7], rot: [0, 0.35, 0], w: 3.2, h: 1.15, color: '#3cc8ff', label: 'FACTORY OPS' },
    { pos: [5.4, 4.2, -7.7], rot: [0, -0.35, 0], w: 3.2, h: 1.15, color: '#3ee898', label: 'VALUE / ROI' },
    { pos: [-7.4, 2.8, -3.2], rot: [0, 1.0, 0], w: 2.5, h: 1.0, color: '#a08cff', label: 'KNOWLEDGE FLOW' },
    { pos: [7.4, 2.8, -3.2], rot: [0, -1.0, 0], w: 2.5, h: 1.0, color: '#ffa940', label: 'OPPORTUNITY RADAR' },
  ];
  panelSpecs.forEach(spec => {
    const p = createCockpitPanel(spec.w, spec.h, spec.color);
    p.position.set(origin.x + spec.pos[0], spec.pos[1], origin.z + spec.pos[2]);
    p.rotation.set(spec.rot[0], spec.rot[1], spec.rot[2]);
    group.add(p);
    group.add(createTowerCockpitLabel(spec.label, [origin.x + spec.pos[0], spec.pos[1] + spec.h * 0.55, origin.z + spec.pos[2] + 0.04], spec.color, '8px'));
  });

  // Central holographic intent table.
  const tableBase = createCylinder(1.55, 1.85, 0.5, 48, materialSet.darkMetal, {
    position: [origin.x, 0.62, origin.z - 1.2],
    receiveShadow: true,
  });
  const tableTop = createCylinder(2.55, 2.25, 0.18, 64, materialSet.panel, {
    position: [origin.x, 1.02, origin.z - 1.2],
    receiveShadow: true,
  });
  const holoRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.028, 8, 96), materialSet.cyanLight);
  holoRing.position.set(origin.x, 1.26, origin.z - 1.2);
  holoRing.rotation.x = Math.PI / 2;
  holoRing.userData.skipRegistry = true;
  const holoDisc = new THREE.Mesh(new THREE.CircleGeometry(1.72, 64), materialSet.glass);
  holoDisc.position.set(origin.x, 1.3, origin.z - 1.2);
  holoDisc.rotation.x = -Math.PI / 2;
  holoDisc.userData.skipRegistry = true;
  group.add(tableBase, tableTop, holoRing, holoDisc);
  state.executiveTower.animatedObjects.push({ object: holoRing, kind: 'fast-ring', speed: 0.55 });

  const modelCoreMat = new THREE.MeshStandardMaterial({
    color: 0xf5fbff,
    emissive: 0xbfefff,
    emissiveIntensity: 1.85,
    roughness: 0.16,
    metalness: 0.2,
    transparent: true,
    opacity: 0.74,
  });
  const modelCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 1), modelCoreMat);
  modelCore.position.set(origin.x, 2.08, origin.z - 1.2);
  modelCore.userData = { skipRegistry: true, baseY: 2.08 };
  const modelCoreWire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.08, 1), new THREE.MeshBasicMaterial({
    color: 0xdffcff,
    transparent: true,
    opacity: 0.2,
    wireframe: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  modelCoreWire.position.copy(modelCore.position);
  modelCoreWire.userData = { skipRegistry: true, baseY: 2.08 };
  const modelCoreShell = new THREE.Mesh(new THREE.SphereGeometry(1.28, 32, 18), new THREE.MeshBasicMaterial({
    color: 0xdffcff,
    transparent: true,
    opacity: 0.06,
    wireframe: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  modelCoreShell.position.copy(modelCore.position);
  modelCoreShell.userData = { skipRegistry: true, baseY: 2.08 };
  const modelOrbit = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.02, 8, 96), materialSet.cyanLight);
  modelOrbit.position.copy(modelCore.position);
  modelOrbit.rotation.set(Math.PI / 2, 0.24, 0);
  modelOrbit.userData.skipRegistry = true;
  group.add(modelCore, modelCoreWire, modelCoreShell, modelOrbit);
  state.executiveTower.animatedObjects.push({ object: modelCore, kind: 'model-core', speed: 0.42 });
  state.executiveTower.animatedObjects.push({ object: modelCoreWire, kind: 'model-core-wire', speed: -0.26 });
  state.executiveTower.animatedObjects.push({ object: modelCoreShell, kind: 'model-core-wire', speed: 0.18 });
  state.executiveTower.animatedObjects.push({ object: modelOrbit, kind: 'fast-ring', speed: 0.7 });
  group.add(createTowerCockpitLabel('STRATEGIC CRUCIBLE · GLM-5.2', [origin.x, 3.12, origin.z - 1.2], '#dffcff', '9px'));

  addExecutiveCockpitDetailing(group, materialSet, origin);

  const floatingPanel = createCockpitPanel(3.4, 1.25, '#78f4ff', { opacity: 0.14 });
  floatingPanel.position.set(origin.x, 2.5, origin.z - 1.95);
  floatingPanel.rotation.x = -0.16;
  group.add(floatingPanel);
  group.add(createTowerCockpitLabel('CURRENT INTENT · PFN DEMO', [origin.x, 3.34, origin.z - 1.98], '#9fffd2', '9px'));

  buildCockpitChair(group, materialSet, origin);

  const seatPlacements = {
    ceo: { pos: [0, 0.25, 5.6], rot: 0 },
    cio: { pos: [-5.6, 0.25, 1.4], rot: -0.72 },
    coo: { pos: [5.6, 0.25, 1.4], rot: 0.72 },
    cto: { pos: [-4.2, 0.25, -4.15], rot: -0.32 },
    cfo: { pos: [4.2, 0.25, -4.15], rot: 0.32 },
  };
  executiveAgents.forEach(agent => {
    const placement = seatPlacements[agent.id];
    buildExecutiveAgentSeat(group, agent, placement.pos, placement.rot, materialSet);
  });
  addStrategicCrucibleSystem(group, materialSet, origin, seatPlacements);

  // PFN Gate behind the command chair.
  const gate = new THREE.Group();
  gate.position.set(origin.x, 2.25, origin.z + 7.2);
  const gateRing = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.035, 8, 96), new THREE.MeshBasicMaterial({
    color: 0xffd37a,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  gateRing.userData.skipRegistry = true;
  const gateCore = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.18, 64), new THREE.MeshBasicMaterial({
    color: 0xffcf66,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  gateCore.userData.skipRegistry = true;
  gate.add(gateRing, gateCore);
  for (let i = 0; i < 3; i++) {
    const pod = createBox(0.62, 0.34, 0.48, i === 1 ? materialSet.warmLight : materialSet.cyanLight, {
      position: [-0.72 + i * 0.72, -1.02, 0.18],
      castShadow: false,
    });
    pod.userData.skipRegistry = true;
    gate.add(pod);
    state.executiveTower.animatedObjects.push({ object: pod, kind: 'collab-pod', speed: 0.18 + i * 0.04 });
  }
  group.add(gate);
  state.executiveTower.animatedObjects.push({ object: gateRing, kind: 'gate-ring', speed: -0.22 });
  group.add(createTowerCockpitLabel('TEMP COLLAB POD GATE', [origin.x + 2.55, 4.1, origin.z + 7.2], '#ffa940', '9px'));

  // Soft local lighting for cockpit depth.
  const cockpitLight = new THREE.PointLight(0x7df8ff, 2.8, 18, 1.6);
  cockpitLight.position.set(origin.x, 4.2, origin.z - 1.8);
  cockpitLight.userData.skipRegistry = true;
  group.add(cockpitLight);
  const warmBackLight = new THREE.PointLight(0xffa940, 1.4, 10, 1.8);
  warmBackLight.position.set(origin.x, 2.6, origin.z + 5.6);
  warmBackLight.userData.skipRegistry = true;
  group.add(warmBackLight);

  scene.add(group);
  selectExecutiveTowerAgent(state.executiveTower.activeAgent);
  return group;
}

// ─────────────────────────────────────
// BUILD ALL STATIC GEOMETRY
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

function createCloneSafeUserData(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return typeof value === 'function' ? undefined : value;
  if (value.isObject3D || value instanceof Element) return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);

  if (Array.isArray(value)) {
    const clonedArray = value
      .map(item => createCloneSafeUserData(item, seen))
      .filter(item => item !== undefined);
    seen.delete(value);
    return clonedArray;
  }

  const clonedObject = {};
  Object.entries(value).forEach(([key, item]) => {
    const clonedValue = createCloneSafeUserData(item, seen);
    if (clonedValue !== undefined) clonedObject[key] = clonedValue;
  });
  seen.delete(value);
  return clonedObject;
}

function cloneFactoryStructure(sourceFactory) {
  const originalUserData = new Map();
  sourceFactory.traverse(object => {
    originalUserData.set(object, object.userData);
    object.userData = createCloneSafeUserData(object.userData) || {};
  });

  let clonedFactory;
  try {
    clonedFactory = sourceFactory.clone(true);
  } finally {
    sourceFactory.traverse(object => {
      object.userData = originalUserData.get(object) || {};
    });
  }
  return clonedFactory;
}

function cloneFactoryRuntimeState(sourceFactory, clonedFactory) {
  const sourceObjects = [];
  const clonedObjects = [];
  sourceFactory.traverse(object => sourceObjects.push(object));
  clonedFactory.traverse(object => clonedObjects.push(object));
  const cloneBySource = new Map();
  sourceObjects.forEach((object, index) => cloneBySource.set(object, clonedObjects[index]));

  ['agvBots', 'amrBots', 'conveyorRollers', 'conveyorSurfaces', 'signalLights'].forEach(key => {
    const sourceRuntimeObjects = state[key].filter(object => cloneBySource.has(object));
    sourceRuntimeObjects.forEach(object => {
      const clone = cloneBySource.get(object);
      if (clone) state[key].push(clone);
    });
  });

  return cloneBySource;
}

function namespaceFactoryTwoObjects(sourceFactory, clonedFactory, cloneBySource) {
  const sourceByClone = new Map([...cloneBySource].map(([source, clone]) => [clone, source]));
  clonedFactory.traverse(clonedObject => {
    clonedObject.userData = {
      ...clonedObject.userData,
      factoryCampus: 'factory-02',
      evolutionSandbox: true,
    };

    if (clonedObject.isCSS2DObject && clonedObject.element) {
      clonedObject.element.classList.add('factory-02-copy-label');
    }

    if (clonedObject === clonedFactory) return;
    const sourceObject = sourceByClone.get(clonedObject);
    const sourceId = sourceObject?.userData?.factoryObjectId;
    if (!sourceId) return;
    const sourceTracking = sourceObject.userData.factoryTracking || {};
    delete clonedObject.userData.factoryObjectId;
    delete clonedObject.userData.factoryTracking;
    registerFactoryObject(clonedObject, {
      ...sourceTracking,
      id: `factory-02.${sourceId}`,
      name: sourceTracking.name ? `工厂 2 · ${sourceTracking.name}` : undefined,
      businessMeaning: `工厂 2 演进副本：${sourceTracking.businessMeaning || sourceTracking.name || sourceId}`,
      status: '工厂 2 对照运行',
      factoryCampus: 'factory-02',
    });
  });
}

function createFactoryCampusLabel(title, subtitle, position, accent) {
  const element = document.createElement('div');
  element.className = 'factory-campus-label';
  element.style.setProperty('--campus-accent', accent);
  element.innerHTML = `<strong>${title}</strong><span>${subtitle}</span>`;
  const label = new CSS2DObject(element);
  label.position.set(position[0], position[1], position[2]);
  label.userData = { skipRegistry: true, type: 'factory-campus-label' };
  return label;
}

function buildTwinFactoryCampus() {
  const factory1 = buildPrimaryFactoryCampus();
  const factory2 = cloneFactoryStructure(factory1);
  const cloneBySource = cloneFactoryRuntimeState(factory1, factory2);
  namespaceFactoryTwoObjects(factory1, factory2, cloneBySource);
  const showcaseVersion = FACTORY_VERSION_META[FACTORY_SHOWCASE_VERSION];

  factory2.position.set(FACTORY_SOLO_SHOWCASE_MODE ? 0 : state.twinFactory.offsetX, 0, 0);
  factory2.name = 'Factory 02 · Evolution Sandbox';
  factory2.userData = {
    type: 'factory-campus',
    id: 'factory-02',
    title: '工厂 2 · 演进实验场',
    factoryCampus: 'factory-02',
    evolutionSandbox: true,
  };
  registerFactoryObject(factory2, {
    id: 'campus.factory-02',
    name: '工厂 2 · 演进实验场',
    module: '建筑结构系统',
    type: 'factory-campus',
    level: 'L1 业务组件',
    sourceFunction: 'buildTwinFactoryCampus()',
    businessMeaning: '从原工厂 1:1 复制的独立演进空间，后续所有结构优化优先在这里验证。',
    status: 'Factory 2 第一阶段演进中',
    trackingMode: 'semantic',
    interactive: true,
  });
  if (FACTORY_SOLO_SHOWCASE_MODE) {
    if (FACTORY_SHOWCASE_VERSION === 'original') {
      factory2.visible = false;
    } else {
      scene.remove(factory1);
      scene.add(factory2);
    }
  } else {
    scene.add(factory2);
  }

  const campus = new THREE.Group();
  campus.name = FACTORY_SOLO_SHOWCASE_MODE
    ? 'Single Factory Version Campus'
    : 'Twin Factory Comparison Campus';
  const campusCenterX = state.twinFactory.offsetX * 0.5;
  const campusGap = state.twinFactory.offsetX - FACTORY_FOOTPRINT_SIZE;
  const factoryHalfWidth = FACTORY_FOOTPRINT_SIZE * 0.5;
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x242a34,
    roughness: 0.58,
    metalness: 0.34,
    emissive: 0x101722,
    emissiveIntensity: 0.24,
  });
  const baselineMat = new THREE.MeshStandardMaterial({
    color: 0x3cc8ff,
    roughness: 0.24,
    metalness: 0.46,
    emissive: 0x16759b,
    emissiveIntensity: 1.25,
  });
  const evolutionMat = new THREE.MeshStandardMaterial({
    color: 0xffb648,
    roughness: 0.24,
    metalness: 0.46,
    emissive: 0xa85d00,
    emissiveIntensity: 1.35,
  });

  if (FACTORY_SOLO_SHOWCASE_MODE) {
    const accent = FACTORY_SHOWCASE_VERSION === 'original' ? baselineMat : evolutionMat;
    const half = 25.2;
    campus.add(createBox(50.4, 0.045, 0.12, accent, { position: [0, 0.045, -half], castShadow: false }));
    campus.add(createBox(50.4, 0.045, 0.12, accent, { position: [0, 0.045, half], castShadow: false }));
    campus.add(createBox(0.12, 0.045, 50.4, accent, { position: [-half, 0.045, 0], castShadow: false }));
    campus.add(createBox(0.12, 0.045, 50.4, accent, { position: [half, 0.045, 0], castShadow: false }));
    campus.add(createFactoryCampusLabel(
      FACTORY_SHOWCASE_VERSION === 'original'
        ? 'FACTORY · ORIGINAL BASELINE'
        : `FACTORY · ${showcaseVersion.title}`,
      FACTORY_SHOWCASE_VERSION === 'original'
        ? '原始工厂结构 · 固定版本基线'
        : showcaseVersion.subtitle,
      [0, 10.6, -25.6],
      FACTORY_SHOWCASE_VERSION === 'original' ? '#3cc8ff' : '#ffb648',
    ));
  } else {
    campus.add(createBox(campusGap, 0.16, FACTORY_FOOTPRINT_SIZE, seamMat, {
      position: [campusCenterX, -0.08, 0],
      castShadow: false,
      receiveShadow: true,
    }));
    campus.add(createBox(0.12, 0.035, 49.5, baselineMat, {
      position: [factoryHalfWidth + 0.15, 0.04, 0],
      castShadow: false,
    }));
    campus.add(createBox(0.12, 0.035, 49.5, evolutionMat, {
      position: [state.twinFactory.offsetX - factoryHalfWidth - 0.15, 0.04, 0],
      castShadow: false,
    }));

    [0, state.twinFactory.offsetX].forEach((centerX, index) => {
      const accent = index === 0 ? baselineMat : evolutionMat;
      const half = 25.2;
      campus.add(createBox(50.4, 0.045, 0.12, accent, { position: [centerX, 0.045, -half], castShadow: false }));
      campus.add(createBox(50.4, 0.045, 0.12, accent, { position: [centerX, 0.045, half], castShadow: false }));
      campus.add(createBox(0.12, 0.045, 50.4, accent, { position: [centerX - half, 0.045, 0], castShadow: false }));
      campus.add(createBox(0.12, 0.045, 50.4, accent, { position: [centerX + half, 0.045, 0], castShadow: false }));
    });

    campus.add(createFactoryCampusLabel(
      'FACTORY 01 · ORIGINAL BASELINE',
      '原工厂结构 · 锁定对照',
      [0, 10.6, -25.6],
      '#3cc8ff',
    ));
    campus.add(createFactoryCampusLabel(
      FACTORY_SHOWCASE_MODE
        ? `FACTORY 02 · ${showcaseVersion.title}`
        : 'FACTORY 02 · EVOLUTION SANDBOX',
      FACTORY_SHOWCASE_MODE
        ? showcaseVersion.subtitle
        : '1:1 副本 · 新方案只在这里迭代',
      [state.twinFactory.offsetX, 10.6, -25.6],
      '#ffb648',
    ));
    campus.add(createFactoryCampusLabel(
      FACTORY_SHOWCASE_MODE ? 'VERSION COMPARISON SEAM' : '1:1 ITERATION SEAM',
      FACTORY_SHOWCASE_MODE
        ? `左侧锁定 Original · 右侧 ${FACTORY_SHOWCASE_VERSION}`
        : '基线不动 · 右侧持续演进',
      [campusCenterX, 2.2, 23.8],
      '#f5d38b',
    ));
  }

  registerFactoryObject(campus, {
    id: FACTORY_SOLO_SHOWCASE_MODE ? 'campus.single-factory' : 'campus.twin-factory',
    name: FACTORY_SOLO_SHOWCASE_MODE ? '单工厂版本画布' : '双工厂 1:1 对照园区',
    module: '建筑结构系统',
    type: 'factory-campus-system',
    level: 'L1 业务组件',
    sourceFunction: 'buildTwinFactoryCampus()',
    businessMeaning: FACTORY_SOLO_SHOWCASE_MODE
      ? '根据项目目录选择，只展示当前工厂版本，使空间和视觉层级得到完整画幅。'
      : '把原工厂基线与演进工厂并列展示，使空间修改可以实时对照且不破坏基线。',
    status: FACTORY_SOLO_SHOWCASE_MODE ? '单版本展示中' : '双工厂并列运行',
    trackingMode: 'semantic',
  });
  scene.add(campus);

  state.twinFactory.factory1 = factory1;
  state.twinFactory.factory2 = factory2;
  state.twinFactory.campus = campus;
}

// ─────────────────────────────────────
// FACTORY 02 · PROTOCOL CITY EVOLUTION
// ─────────────────────────────────────
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
  const element = document.createElement('div');
  element.className = 'factory-evolution-stage-label';
  element.dataset.stage = code;
  element.style.setProperty('--stage-accent', accent);
  element.innerHTML = `
    <span class="stage-code">${code}</span>
    <span class="stage-copy"><strong>${title}</strong><em>${subtitle}</em></span>
  `;
  const label = new CSS2DObject(element);
  label.position.set(position[0], position[1], position[2]);
  label.userData = { skipRegistry: true, type: 'factory-evolution-stage-label' };
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
    state.twinFactory.flowTokens.push({
      object: token,
      curve,
      progress: (options.offset ?? 0) + index / count,
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

function buildScene() {
  buildTwinFactoryCampus();
  buildFactory2Evolution();
  buildFactoryNetworkLayer();
  buildExecutiveTowerInterior();
}

// ─────────────────────────────────────
// ANIMATION SYSTEM
// ─────────────────────────────────────
function animateRobots(dt) {
  const t = performance.now() * 0.001;

  // Animate AGVs: move along paths
  state.agvBots.forEach(agv => {
    if (!state.animationActive) return;
    const phase = t * agv.userData.speed + agv.userData.pathOffset;
    // Circular-ish patrol
    const radius = 3 + Math.sin(agv.userData.pathOffset) * 2;
    const cx = agv.userData.pathOffset * 10;
    const cz = Math.sin(agv.userData.pathOffset * 3) * 8;
    agv.position.x += Math.cos(phase) * 0.025 * agv.userData.speed;
    agv.position.z += Math.sin(phase * 0.7) * 0.02 * agv.userData.speed;

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
    amr.position.x += Math.cos(phase * 1.3) * 0.02 * amr.userData.speed;
    amr.position.z += Math.sin(phase * 0.9) * 0.02 * amr.userData.speed;
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
    r.rotateY(0.08);
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

function animateCruise(t) {
  if (!state.cruiseMode) return;
  const centerX = FACTORY_SOLO_SHOWCASE_MODE ? 0 : state.twinFactory.offsetX * 0.5;
  const radius = FACTORY_SOLO_SHOWCASE_MODE ? 48 : 76;
  const height = FACTORY_SOLO_SHOWCASE_MODE ? 24 : 30;
  const speed = 0.15;
  const angle = t * speed;
  camera.position.set(
    centerX + Math.cos(angle) * radius,
    height + Math.sin(t * 0.3) * 4,
    Math.sin(angle) * radius
  );
  camera.lookAt(centerX, 1.5, 0);
}

// ─────────────────────────────────────
// INTERACTION: RAYCASTING & CLICK
// ─────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function getRaycastInteractiveObjects() {
  if (state.executiveTower.open) return state.interactiveObjects;
  return state.interactiveObjects.filter(obj => obj.userData?.type !== 'executive-agent-seat');
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  if (state.layoutEditor.open) {
    updateLayoutEditorHover(event);
    return;
  }

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(getRaycastInteractiveObjects(), true);

  const tooltip = document.getElementById('tooltip');
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    // Walk up to find labeled parent
    while (obj && !obj.userData.type && !obj.userData.factoryObjectId && obj.parent && obj !== scene) {
      obj = obj.parent;
    }
    if (obj?.userData?.networkNodeId) {
      while (obj?.parent && obj.parent !== scene && obj.userData?.type !== 'network-factory') {
        obj = obj.parent;
      }
    }
    if (obj?.userData?.matrixNodeId) {
      while (obj?.parent && obj.parent !== scene && obj.userData?.type !== 'matrix-factory') {
        obj = obj.parent;
      }
    }
    if (obj.userData.type || obj.userData.factoryObjectId || obj.name) {
      const record = obj.userData.factoryObjectId ? getFactoryObjectRecord(obj) : null;
      const typeMap = {
        'agv': 'AGV 产线 Agent',
        'amr': 'AMR 巡检 Agent',
        'rack': '五类资产仓',
        'inspection-box': '待检知识包',
        'knowledge-asset': '流动能力资产',
        'feedback-core': '回路中心',
        'memory-vault': '长期记忆冷链舱',
        'network-factory': '外部个人工厂',
        'matrix-factory': '矩阵工厂节点',
        'executive-agent-seat': 'AI 高管席位'
      };
      const typeName = record?.type || typeMap[obj.userData.type] || obj.userData.type || '';
      const displayName = obj.userData.title || record?.name || obj.userData.id || obj.name || typeName;
      tooltip.textContent = `${displayName}`;
      tooltip.classList.remove('hidden');
      tooltip.style.left = (event.clientX + 18) + 'px';
      tooltip.style.top = (event.clientY - 30) + 'px';
      document.body.style.cursor = 'pointer';
    }
  } else {
    tooltip.classList.add('hidden');
    document.body.style.cursor = 'default';
  }
}

function showKnowledgeAssetPanel(obj) {
  const panel = document.getElementById('object-info-panel');
  const title = document.getElementById('obj-info-title');
  const content = document.getElementById('obj-info-content');
  const ud = obj.userData;
  const safeTitle = escapeHtml(ud.title);
  const safeSourceCode = escapeHtml(ud.sourceCode);
  const safeSource = escapeHtml(ud.source);
  const safeLifecycle = escapeHtml(ud.lifecycleLabel);
  const safeStage = escapeHtml(ud.stage);
  const safeAgent = escapeHtml(ud.assignedAgent);
  const safeValue = escapeHtml(ud.value);
  const safeTarget = escapeHtml(ud.target);
  const safeRisk = escapeHtml(ud.risk || '无阻塞风险');
  const safeRawInput = escapeHtml(ud.rawInput);

  title.textContent = `ASSET JOB — ${ud.id}`;
  content.innerHTML = `
    <div class="asset-card-head">
      <div>
        <strong>${safeTitle}</strong>
        <span>${safeSourceCode} · ${safeSource}</span>
      </div>
      <em style="border-color:${ud.stageColor};color:${ud.stageColor}">${safeLifecycle}</em>
    </div>
    <div class="info-row"><span class="info-label">当前阶段</span><span class="info-val" style="color:${ud.stageColor}">● ${safeStage}</span></div>
    <div class="info-row"><span class="info-label">负责 Agent</span><span class="info-val">${safeAgent}</span></div>
    <div class="info-row"><span class="info-label">产出类型</span><span class="info-val">${safeValue}</span></div>
    <div class="info-row"><span class="info-label">目标仓位</span><span class="info-val">${safeTarget}</span></div>
    <div class="info-row"><span class="info-label">可信度</span><span class="info-val">${ud.confidence}%</span></div>
    <div class="info-row"><span class="info-label">复用价值</span><span class="info-val">${ud.reusableScore}%</span></div>
    <div class="info-row"><span class="info-label">风险状态</span><span class="info-val">${safeRisk}</span></div>
    ${ud.rawInput ? `<div class="info-row"><span class="info-label">原始输入</span><span class="info-val">${safeRawInput}</span></div>` : ''}
    <div class="info-row"><span class="info-label">最近处理</span><span class="info-val">${formatRelativeTime(ud.lastHandledAt)}</span></div>
    <div class="info-actions">
      <span>自动归档</span>
      <span>召回候选</span>
      <span>${ud.risk ? '请求确认' : '可生成行动'}</span>
    </div>
  `;
  panel.classList.remove('hidden');
}

function formatPosition(position) {
  if (!position) return '(0, 0, 0)';
  return `(${position.x}, ${position.y}, ${position.z})`;
}

function yesNo(value) {
  return value ? '是' : '否';
}

function showFactoryObjectInfo(obj) {
  if (!obj?.userData?.factoryObjectId) return;
  const panel = document.getElementById('object-info-panel');
  const title = document.getElementById('obj-info-title');
  const content = document.getElementById('obj-info-content');
  const record = getFactoryObjectRecord(obj);
  title.textContent = `OBJECT — ${record.name}`;
  content.innerHTML = `
    <div class="info-row"><span class="info-label">对象 ID</span><span class="info-val">${escapeHtml(record.id)}</span></div>
    <div class="info-row"><span class="info-label">所属模块</span><span class="info-val">${escapeHtml(record.module)}</span></div>
    <div class="info-row"><span class="info-label">类型 / 层级</span><span class="info-val">${escapeHtml(record.type)} · ${escapeHtml(record.level)}</span></div>
    <div class="info-row"><span class="info-label">追踪模式</span><span class="info-val">${escapeHtml(record.trackingMode)}</span></div>
    <div class="info-row"><span class="info-label">业务含义</span><span class="info-val">${escapeHtml(record.businessMeaning)}</span></div>
    <div class="info-row"><span class="info-label">代码来源</span><span class="info-val">${escapeHtml(record.sourceFunction)}</span></div>
    <div class="info-row"><span class="info-label">世界坐标</span><span class="info-val">${escapeHtml(formatPosition(record.position))}</span></div>
    <div class="info-row"><span class="info-label">父级对象</span><span class="info-val">${escapeHtml(record.parentId || '无')}</span></div>
    <div class="info-row"><span class="info-label">子对象数</span><span class="info-val">${record.childCount}</span></div>
    <div class="info-row"><span class="info-label">可见 / 可交互</span><span class="info-val">${yesNo(record.visible)} / ${yesNo(record.interactive)}</span></div>
    <div class="info-row"><span class="info-label">标注层</span><span class="info-val">${escapeHtml(record.labelLayer || '无')}</span></div>
    <div class="info-actions">
      <span>${escapeHtml(record.status)}</span>
      <span>${escapeHtml(record.objectClass)}</span>
      <span>${record.trackingMode === 'semantic' ? '已绑定语义' : '待补语义'}</span>
    </div>
  `;
  panel.classList.remove('hidden');
}

function onClick(event) {
  // Ignore clicks on UI elements
  if (event.target.closest('#left-sidebar') ||
      event.target.closest('#right-sidebar') ||
      event.target.closest('#top-bar') ||
      event.target.closest('#bottom-controls') ||
      event.target.closest('#layout-editor-panel') ||
      event.target.closest('#factory-network-panel') ||
      event.target.closest('#factory-matrix-panel') ||
      event.target.closest('#executive-tower') ||
      event.target.closest('#component-console') ||
      event.target.closest('#text-layer-menu') ||
      event.target.closest('#object-info-panel') ||
      event.target.closest('#policy-panel') ||
      event.target.closest('#ingest-panel') ||
      event.target.closest('button')) return;

  if (state.layoutEditor.open) {
    selectEditableObjectFromPointer(event);
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(getRaycastInteractiveObjects(), true);

  const panel = document.getElementById('object-info-panel');
  const title = document.getElementById('obj-info-title');
  const content = document.getElementById('obj-info-content');

  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !obj.userData.type && !obj.userData.factoryObjectId && obj.parent && obj !== scene) {
      obj = obj.parent;
    }
    if (obj?.userData?.networkNodeId) {
      while (obj?.parent && obj.parent !== scene && obj.userData?.type !== 'network-factory') {
        obj = obj.parent;
      }
    }
    if (obj?.userData?.matrixNodeId) {
      while (obj?.parent && obj.parent !== scene && obj.userData?.type !== 'matrix-factory') {
        obj = obj.parent;
      }
    }

    const ud = obj.userData;

    if (isControlTowerObject(obj)) {
      setExecutiveTowerOpen(true);
      return;
    }

    if (ud.type === 'executive-agent-seat') {
      renderExecutiveAgentDetail(ud.executiveAgentId);
      return;
    }

    if (ud.type === 'agv') {
      title.textContent = `AGENT DETAILS — ${ud.id}`;
      content.innerHTML = `
        <div class="info-row"><span class="info-label">类型</span><span class="info-val">AGV 知识整理 Agent</span></div>
        <div class="info-row"><span class="info-label">编号</span><span class="info-val">${ud.id}</span></div>
        <div class="info-row"><span class="info-label">角色</span><span class="info-val">${ud.role}</span></div>
        <div class="info-row"><span class="info-label">状态</span><span class="info-val" style="color:#3ee898">● 运行中</span></div>
        <div class="info-row"><span class="info-label">吞吐</span><span class="info-val">${(ud.speed * 42).toFixed(0)} 资产/min</span></div>
        <div class="info-row"><span class="info-label">当前工单</span><span class="info-val">${ud.task}</span></div>
        <div class="info-row"><span class="info-label">处理域</span><span class="info-val">${ud.domain}</span></div>
        <div class="info-row"><span class="info-label">推理预算</span><span class="info-val">${(70 + Math.random() * 28).toFixed(0)}%</span></div>
        <div class="info-row"><span class="info-label">位置</span><span class="info-val">(${obj.position.x.toFixed(1)}, ${obj.position.z.toFixed(1)})</span></div>
      `;
    } else if (ud.type === 'amr') {
      title.textContent = `AGENT DETAILS — ${ud.id}`;
      content.innerHTML = `
        <div class="info-row"><span class="info-label">类型</span><span class="info-val">AMR 质检/检索 Agent</span></div>
        <div class="info-row"><span class="info-label">编号</span><span class="info-val">${ud.id}</span></div>
        <div class="info-row"><span class="info-label">角色</span><span class="info-val">${ud.role}</span></div>
        <div class="info-row"><span class="info-label">状态</span><span class="info-val" style="color:#3ee898">● 运行中</span></div>
        <div class="info-row"><span class="info-label">巡检频率</span><span class="info-val">${(ud.speed * 28).toFixed(0)} 项/min</span></div>
        <div class="info-row"><span class="info-label">当前工单</span><span class="info-val">${ud.task}</span></div>
        <div class="info-row"><span class="info-label">处理域</span><span class="info-val">${ud.domain}</span></div>
        <div class="info-row"><span class="info-label">推理预算</span><span class="info-val">${(65 + Math.random() * 30).toFixed(0)}%</span></div>
        <div class="info-row"><span class="info-label">向量索引</span><span class="info-val" style="color:#3ee898">● 在线</span></div>
      `;
    } else if (ud.type === 'rack') {
      title.textContent = ud.assetLabel || '五类资产仓';
      content.innerHTML = `
        <div class="info-row"><span class="info-label">类型</span><span class="info-val">${ud.assetLabel || '资产仓'}</span></div>
        <div class="info-row"><span class="info-label">分类轴</span><span class="info-val">${ud.category}</span></div>
        <div class="info-row"><span class="info-label">闭环阶段</span><span class="info-val">沉 ASSETIZE</span></div>
        <div class="info-row"><span class="info-label">列数</span><span class="info-val">${ud.bays}</span></div>
        <div class="info-row"><span class="info-label">层数</span><span class="info-val">${ud.levels}</span></div>
        <div class="info-row"><span class="info-label">资产槽位</span><span class="info-val">${ud.bays * ud.levels * 2}</span></div>
        <div class="info-row"><span class="info-label">可复用率</span><span class="info-val">${(60 + Math.random() * 35).toFixed(0)}%</span></div>
        <div class="info-row"><span class="info-label">下一步</span><span class="info-val">可被召回 / 可被行动卡引用</span></div>
        <div class="info-row"><span class="info-label">位置</span><span class="info-val">(${obj.position.x.toFixed(1)}, ${obj.position.z.toFixed(1)})</span></div>
      `;
    } else if (ud.type === 'knowledge-asset') {
      showKnowledgeAssetPanel(obj);
      return;
    } else if (ud.type === 'inspection-box') {
      title.textContent = `待检知识包 — ${ud.id}`;
      content.innerHTML = `
        <div class="info-row"><span class="info-label">编号</span><span class="info-val">${ud.id}</span></div>
        <div class="info-row"><span class="info-label">来源</span><span class="info-val">${ud.source}</span></div>
        <div class="info-row"><span class="info-label">状态</span><span class="info-val" style="color:#ffa940">● 待 AI 质检</span></div>
        <div class="info-row"><span class="info-label">检查项</span><span class="info-val">去重 / 引用 / 冲突 / 时效性</span></div>
        <div class="info-row"><span class="info-label">可信度</span><span class="info-val">${(72 + Math.random() * 20).toFixed(0)}%</span></div>
        <div class="info-row"><span class="info-label">入库时间</span><span class="info-val">${new Date(Date.now() - Math.random() * 86400000).toLocaleTimeString()}</span></div>
      `;
    } else if (ud.type === 'feedback-core') {
      title.textContent = '回路中心 · FEEDBACK LOOP';
      content.innerHTML = `
        <div class="info-row"><span class="info-label">类型</span><span class="info-val">反馈进化核心</span></div>
        <div class="info-row"><span class="info-label">闭环阶段</span><span class="info-val">进 EVOLVE</span></div>
        <div class="info-row"><span class="info-label">输入信号</span><span class="info-val">点击 / 忽略 / 修改 / 完成 / 引用</span></div>
        <div class="info-row"><span class="info-label">更新对象</span><span class="info-val">资产权重 / 技能画像 / 经验置信度</span></div>
        <div class="info-row"><span class="info-label">能力指数</span><span class="info-val" style="color:#3ee898">● ${state.kpi.capabilityIndex.toFixed(1)}</span></div>
        <div class="info-row"><span class="info-label">下一步</span><span class="info-val">让下一次推送更精准</span></div>
      `;
    } else if (ud.type === 'memory-vault') {
      title.textContent = `${ud.id} · ${ud.title}`;
      content.innerHTML = `
        <div class="info-row"><span class="info-label">类型</span><span class="info-val">长期记忆冷链舱</span></div>
        <div class="info-row"><span class="info-label">模式</span><span class="info-val">${ud.mode}</span></div>
        <div class="info-row"><span class="info-label">封存内容</span><span class="info-val">${ud.contents}</span></div>
        <div class="info-row"><span class="info-label">复核周期</span><span class="info-val">${ud.reviewCycle}</span></div>
        <div class="info-row"><span class="info-label">置信度</span><span class="info-val" style="color:#3ee898">● ${ud.confidence}%</span></div>
        <div class="info-row"><span class="info-label">和资产仓区别</span><span class="info-val">资产仓负责分类复用；冷链舱负责高价值结论冻结、复核与回灌。</span></div>
      `;
    } else if (ud.type === 'network-factory') {
      showNetworkFactoryInfo(obj);
      return;
    } else if (ud.type === 'matrix-factory') {
      showMatrixFactoryInfo(obj);
      return;
    } else {
      showFactoryObjectInfo(obj);
      return;
    }
    panel.classList.remove('hidden');
  } else {
    panel.classList.add('hidden');
  }
}

document.getElementById('obj-info-close').addEventListener('click', () => {
  document.getElementById('object-info-panel').classList.add('hidden');
});

window.addEventListener('mousemove', onMouseMove, { passive: true });
window.addEventListener('click', onClick);

// ─────────────────────────────────────
// CAMERA PRESETS
// ─────────────────────────────────────
const cameraPresets = {
  free: null,
  dual: { pos: [TWIN_FACTORY_CENTER_X, 64, 92], target: [TWIN_FACTORY_CENTER_X, 1.2, 0] },
  factory1: { pos: [35, 22, 35], target: [0, 1.5, 0] },
  factory2: { pos: [TWIN_FACTORY_OFFSET_X + 30, 24, 34], target: [TWIN_FACTORY_OFFSET_X, 2.2, -2] },
  overview: { pos: [TWIN_FACTORY_CENTER_X, 64, 82], target: [TWIN_FACTORY_CENTER_X, 0, -2] },
  intake: { pos: [-24, 8, -12], target: [-17, 1.2, -18] },
  quality: { pos: [-4, 7, -10], target: [-8, 1.2, -18] },
  refinery: { pos: [12, 8, -9], target: [4, 1.2, -18] },
  assets: { pos: [-15, 7, 15], target: [-22, 2.8, 0] },
  output: { pos: [24, 8, 2], target: [16, 2.2, -5] },
  evolve: { pos: [18, 9, 20], target: [10, 1.5, 12] },
  cruise: { pos: [0, 16, 30], target: [0, 1, -5] },
};

function setCameraView(view) {
  document.body.dataset.cameraView = view;
  document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');

  if (view === 'free') {
    state.cruiseMode = false;
    controls.enabled = true;
    return;
  }
  if (view === 'cruise') {
    state.cruiseMode = true;
    controls.enabled = false;
    return;
  }

  state.cruiseMode = false;
  controls.enabled = true;
  const preset = cameraPresets[view];
  if (!preset) return;

  // Smooth transition
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos = new THREE.Vector3(...preset.pos);
  const endTarget = new THREE.Vector3(...preset.target);
  const duration = 800;
  const startTime = performance.now();

  function anim(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1.0);
    // Ease in-out
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();
    if (t < 1) requestAnimationFrame(anim);
  }
  requestAnimationFrame(anim);
}

document.querySelectorAll('.cam-btn').forEach(btn => {
  btn.addEventListener('click', () => setCameraView(btn.dataset.view));
});

// ─────────────────────────────────────
// UI: TOGGLE BUTTONS
// ─────────────────────────────────────
document.getElementById('toggle-animation').addEventListener('click', function() {
  state.animationActive = !state.animationActive;
  this.classList.toggle('active', state.animationActive);
  this.querySelector('.ctrl-icon').textContent = state.animationActive ? '▶' : '⏸';
  this.querySelector('.ctrl-text').textContent = state.animationActive ? '产线流动' : '产线暂停';
});

const nightToggle = document.getElementById('toggle-night');
const themeToggle = document.getElementById('toggle-theme');

function updateVisualToggleButtons() {
  nightToggle.classList.toggle('active', state.nightMode);
  nightToggle.querySelector('.ctrl-icon').textContent = state.nightMode ? '☀' : '🌙';
  nightToggle.querySelector('.ctrl-text').textContent = state.nightMode ? '退出夜班' : '夜班巡检';

  themeToggle.classList.toggle('active', state.lightMode);
  themeToggle.querySelector('.ctrl-icon').textContent = state.lightMode ? '◐' : '☼';
  themeToggle.querySelector('.ctrl-text').textContent = state.lightMode ? '深色模式' : '浅色模式';
}

nightToggle.addEventListener('click', function() {
  state.nightMode = !state.nightMode;
  if (state.nightMode) state.lightMode = false;
  applyVisualTheme();
  updateVisualToggleButtons();
  renderInitialFrame();
});

themeToggle.addEventListener('click', function() {
  state.lightMode = !state.lightMode;
  if (state.lightMode) state.nightMode = false;
  applyVisualTheme();
  updateVisualToggleButtons();
  renderInitialFrame();
});

document.getElementById('toggle-wireframe').addEventListener('click', function() {
  state.wireframeMode = !state.wireframeMode;
  this.classList.toggle('active', state.wireframeMode);

  scene.traverse(child => {
    if (child.isMesh && child.material && !child.material.isLineBasicMaterial) {
      if (state.wireframeMode) {
        child.userData._origWireframe = child.material.wireframe;
        child.material.wireframe = true;
      } else if (child.userData._origWireframe !== undefined) {
        child.material.wireframe = child.userData._origWireframe;
      }
    }
  });
  this.querySelector('.ctrl-icon').textContent = state.wireframeMode ? '⌁' : '⌁';
  this.childNodes[1].textContent = state.wireframeMode ? ' 结构视图' : ' 实景视图';
});

const textLayerMenu = document.getElementById('text-layer-menu');
const textLayerToggle = document.getElementById('toggle-labels');
const textLayerInputs = Array.from(document.querySelectorAll('[data-layer]'));

function applyTextLayerVisibility() {
  const layers = state.textLayers;
  const allVisible = Object.values(layers).every(Boolean);
  const allHidden = Object.values(layers).every(v => !v);

  Object.keys(layers).forEach(key => {
    document.body.classList.toggle(`hide-label-${key}`, !layers[key]);
  });
  document.getElementById('object-info-panel').classList.add('hidden');
  document.getElementById('tooltip').classList.add('hidden');

  state.textLayerVisible = !allHidden;
  textLayerToggle.classList.toggle('active', !allHidden);
  textLayerToggle.querySelector('.ctrl-icon').textContent = allHidden ? '○' : 'Aa';
  textLayerToggle.querySelector('.ctrl-text').textContent = allHidden
    ? '无标注'
    : allVisible
      ? '文字标注'
      : '局部标注';

  textLayerInputs.forEach(input => {
    input.checked = Boolean(layers[input.dataset.layer]);
  });
}

function setTextLayerMenuOpen(open) {
  textLayerMenu.classList.toggle('hidden', !open);
  textLayerToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

textLayerToggle.addEventListener('click', function() {
  setTextLayerMenuOpen(textLayerMenu.classList.contains('hidden'));
});

document.addEventListener('click', (event) => {
  if (textLayerMenu.classList.contains('hidden')) return;
  if (event.target.closest('#text-layer-menu') || event.target.closest('#toggle-labels')) return;
  setTextLayerMenuOpen(false);
});

document.getElementById('text-menu-close').addEventListener('click', () => {
  setTextLayerMenuOpen(false);
});

textLayerInputs.forEach(input => {
  input.addEventListener('change', () => {
    state.textLayers[input.dataset.layer] = input.checked;
    applyTextLayerVisibility();
  });
});

document.getElementById('show-all-text').addEventListener('click', () => {
  Object.keys(state.textLayers).forEach(key => {
    state.textLayers[key] = true;
  });
  applyTextLayerVisibility();
});

document.getElementById('clean-view-text').addEventListener('click', () => {
  Object.keys(state.textLayers).forEach(key => {
    state.textLayers[key] = false;
  });
  applyTextLayerVisibility();
  setTextLayerMenuOpen(false);
});

const ingestPanel = document.getElementById('ingest-panel');
const ingestToggle = document.getElementById('toggle-ingest');
const ingestForm = document.getElementById('ingest-form');
const ingestHint = document.getElementById('ingest-hint');

function setIngestPanelOpen(open) {
  ingestPanel.classList.toggle('hidden', !open);
  ingestToggle.classList.toggle('active', open);
  ingestToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    setTextLayerMenuOpen(false);
    setPolicyPanelOpen(false);
    document.getElementById('ingest-title').focus();
  }
}

function submitKnowledgeInput(event) {
  event.preventDefault();
  const title = document.getElementById('ingest-title').value.trim();
  const content = document.getElementById('ingest-content').value.trim();
  const inputType = document.getElementById('ingest-type').value;
  const targetType = document.getElementById('ingest-target').value;

  if (!title && !content) {
    ingestHint.textContent = '先输入一个标题或原始内容，工厂才能生成任务。';
    return;
  }

  const track = state.conveyorTracks[0];
  if (!track) {
    ingestHint.textContent = '产线尚未就绪，请稍后再提交。';
    return;
  }

  const blueprint = createUserAssetBlueprint({ inputType, targetType, title, content });
  const newAsset = createKnowledgeAssetParcel(blueprint, track, {
    segment: 0,
    lifecycleIndex: 0,
    progress: 0.15,
    lateralOffset: 0,
    speed: 1.35,
  });

  state.ops.backlog = Math.min(state.ops.backlog + 1, 99);
  state.ops.activeJobs = Math.min(state.ops.activeJobs + 1, 36);
  state.ops.cycle += 1;
  state.agents[0].load = Math.min(state.agents[0].load + 7, 92);
  state.agents[0].output = `${newAsset.userData.id} 已从输入箱入队`;
  state.outputs.unshift({
    type: 'INTAKE',
    name: `已接收 · ${blueprint.title}`,
    detail: `${blueprint.source} → ${blueprint.target}，${newAsset.userData.id} 正在由 Ingest Agent 处理。`,
    status: 'queued',
  });
  state.outputs = state.outputs.slice(0, 5);

  renderOpsPanels();
  showKnowledgeAssetPanel(newAsset);
  setCameraView('intake');
  setIngestPanelOpen(false);
  ingestForm.reset();
  ingestHint.textContent = '提交后会进入 Live Queue，并在 3D 流水线上生成一个新物料。';
}

ingestToggle.addEventListener('click', () => {
  setIngestPanelOpen(ingestPanel.classList.contains('hidden'));
});

document.getElementById('ingest-panel-close').addEventListener('click', () => {
  setIngestPanelOpen(false);
});

ingestForm.addEventListener('submit', submitKnowledgeInput);

document.addEventListener('click', (event) => {
  if (ingestPanel.classList.contains('hidden')) return;
  if (event.target.closest('#ingest-panel') || event.target.closest('#toggle-ingest')) return;
  setIngestPanelOpen(false);
});

const policyPanel = document.getElementById('policy-panel');
const policyToggle = document.getElementById('toggle-policy');

function setPolicyPanelOpen(open) {
  policyPanel.classList.toggle('hidden', !open);
  policyToggle.classList.toggle('active', open);
  policyToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

policyToggle.addEventListener('click', () => {
  setPolicyPanelOpen(policyPanel.classList.contains('hidden'));
  setTextLayerMenuOpen(false);
});

document.addEventListener('click', (event) => {
  if (policyPanel.classList.contains('hidden')) return;
  if (event.target.closest('#policy-panel') || event.target.closest('#toggle-policy')) return;
  setPolicyPanelOpen(false);
});

document.getElementById('policy-panel-close').addEventListener('click', () => {
  setPolicyPanelOpen(false);
});

// ─────────────────────────────────────
// WORKBENCH MODES
// ─────────────────────────────────────
const opsPanelToggle = document.getElementById('toggle-ops-panel');
const modeButtons = Array.from(document.querySelectorAll('[data-work-mode]'));

function setOpsPanelOpen(open) {
  state.workbench.opsPanelOpen = open;
  document.body.classList.toggle('ops-panel-open', open);
  opsPanelToggle.classList.toggle('active', open);
  opsPanelToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function setWorkbenchMode(mode) {
  state.workbench.mode = mode;
  document.body.classList.toggle('mode-run', mode === 'run');
  document.body.classList.toggle('mode-inspect', mode === 'inspect');
  document.body.classList.toggle('mode-edit', mode === 'edit');
  modeButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.workMode === mode);
  });

  if (mode === 'edit') {
    if (state.executiveTower.open) setExecutiveTowerOpen(false);
    setFactoryNetworkOpen(false, { preserveCamera: true });
    setFactoryMatrixOpen(false, { preserveCamera: true });
    setOpsPanelOpen(false);
    document.getElementById('object-info-panel').classList.add('hidden');
    setTextLayerMenuOpen(false);
    setIngestPanelOpen(false);
    setPolicyPanelOpen(false);
    setComponentConsoleOpen(false);
    setLayoutEditorOpen(true);
    return;
  }

  if (state.layoutEditor.open) setLayoutEditorOpen(false);
  if (mode === 'inspect') setOpsPanelOpen(false);
  if (mode === 'run') {
    document.getElementById('object-info-panel').classList.add('hidden');
  }
}

opsPanelToggle.addEventListener('click', () => {
  setOpsPanelOpen(!state.workbench.opsPanelOpen);
  if (!state.workbench.opsPanelOpen && state.workbench.mode === 'run') return;
  if (state.workbench.opsPanelOpen) setWorkbenchMode('run');
});

modeButtons.forEach(button => {
  button.addEventListener('click', () => setWorkbenchMode(button.dataset.workMode));
});

// ─────────────────────────────────────
// EXECUTIVE TOWER INTERIOR
// ─────────────────────────────────────
const executiveTowerPanel = document.getElementById('executive-tower');
const executiveTowerToggle = document.getElementById('toggle-executive-tower');
const executiveAgentDetail = document.getElementById('executive-agent-detail');
const towerActiveAgent = document.getElementById('tower-active-agent');
const towerChatMode = document.getElementById('tower-chat-mode');
const towerChatLog = document.getElementById('tower-chat-log');
const towerChatForm = document.getElementById('tower-chat-form');
const towerChatInput = document.getElementById('tower-chat-input');
const towerDecisionFlow = document.getElementById('tower-decision-flow');
const towerCreateTask = document.getElementById('tower-create-task');
const towerSaveDecision = document.getElementById('tower-save-decision');
const towerTaskHandoff = document.getElementById('tower-task-handoff');
const towerHandoffTitle = document.getElementById('tower-handoff-title');
const towerHandoffDetail = document.getElementById('tower-handoff-detail');
const towerReturnFactory = document.getElementById('tower-return-factory');
const towerModelRoute = document.getElementById('tower-model-route');
const towerModelStatus = document.getElementById('tower-model-status');
const towerModelLatency = document.getElementById('tower-model-latency');
const towerModelCard = document.getElementById('tower-model-card');
const towerModelCardTitle = document.getElementById('tower-model-card-title');
const towerModelCardDetail = document.getElementById('tower-model-card-detail');
const towerChatSubmitButtons = Array.from(document.querySelectorAll('[data-tower-busy-button]'));
const towerDecisionDock = document.getElementById('tower-decision-dock');
const towerDecisionDockToggle = document.getElementById('tower-decision-dock-toggle');
const towerAgentDock = document.getElementById('tower-agent-dock');
const towerAgentDockToggle = document.getElementById('tower-agent-dock-toggle');
const towerChatDock = document.getElementById('tower-chat-dock');
const towerChatDockToggle = document.getElementById('tower-chat-dock-toggle');
const towerAgentWatchList = document.getElementById('tower-agent-watch-list');
const towerAskAgentSubmit = document.getElementById('tower-ask-agent-submit');
const towerOpenBoardRoom = document.getElementById('tower-open-board-room');
const towerBoardRoom = document.getElementById('tower-board-room');
const towerBoardClose = document.getElementById('tower-board-close');
const towerBoardForm = document.getElementById('tower-board-form');
const towerBoardAgenda = document.getElementById('tower-board-agenda');
const towerBoardStart = document.getElementById('tower-board-start');
const towerBoardFlow = document.getElementById('tower-board-flow');
const towerBoardStatusTitle = document.getElementById('tower-board-status-title');
const towerBoardStatusDetail = document.getElementById('tower-board-status-detail');
const towerBoardCreateTask = document.getElementById('tower-board-create-task');
const towerBoardSaveDecision = document.getElementById('tower-board-save-decision');

function getExecutiveAgent(id) {
  return executiveAgents.find(agent => agent.id === id) || executiveAgents[0];
}

function getExecutiveRoleCode(agentId) {
  return getExecutiveAgent(agentId).title.split(' ')[0];
}

function getExecutiveAgentIdFromRole(role = '') {
  const normalized = String(role).toLowerCase();
  if (normalized.includes('cio')) return 'cio';
  if (normalized.includes('coo')) return 'coo';
  if (normalized.includes('cto')) return 'cto';
  if (normalized.includes('cfo')) return 'cfo';
  if (normalized.includes('ceo')) return 'ceo';
  return state.executiveTower.activeAgent;
}

function setTowerModelStatus(routeState, { title, detail, latencyMs, model, configured } = {}) {
  state.executiveTower.modelRoute = {
    ...state.executiveTower.modelRoute,
    state: routeState,
    configured: configured ?? state.executiveTower.modelRoute.configured,
    model: model || state.executiveTower.modelRoute.model,
    latencyMs: latencyMs ?? state.executiveTower.modelRoute.latencyMs,
    detail: detail || state.executiveTower.modelRoute.detail,
  };
  const route = state.executiveTower.modelRoute;
  if (towerModelRoute) towerModelRoute.textContent = `${route.model.toUpperCase()} ROUTE`;
  if (towerModelStatus) towerModelStatus.textContent = title || route.detail;
  if (towerModelLatency) {
    towerModelLatency.textContent = Number.isFinite(route.latencyMs)
      ? `${route.latencyMs}ms`
      : route.configured
        ? 'server proxy ready'
        : 'local fallback ready';
  }
  if (towerModelCard) towerModelCard.dataset.modelState = routeState;
  if (towerModelCardTitle) towerModelCardTitle.textContent = title || route.detail;
  if (towerModelCardDetail) towerModelCardDetail.textContent = detail || route.detail;
}

function setTowerChatBusy(busy) {
  state.executiveTower.chatBusy = busy;
  towerChatSubmitButtons.forEach(button => {
    button.disabled = busy;
    button.classList.toggle('loading', busy);
  });
  if (towerChatInput) towerChatInput.disabled = busy;
  if (towerBoardAgenda) towerBoardAgenda.disabled = busy;
  if (towerBoardStart) towerBoardStart.textContent = busy ? '会议生成中' : '启动高管会议';
  if (towerBoardRoom) towerBoardRoom.classList.toggle('busy', busy);
  renderExecutiveBoardFlow();
}

async function refreshTowerModelStatus() {
  if (IS_GITHUB_PAGES) {
    setTowerModelStatus('fallback', {
      configured: false,
      title: '在线演示 · 使用内置规则',
      detail: '高管问答、会议和任务回流由演示规则驱动。GLM-5.2 可通过本地 Node 服务接入。',
    });
    return;
  }
  try {
    const response = await fetch('/api/glm-status', { headers: { accept: 'application/json' } });
    const data = await response.json();
    setTowerModelStatus(data.configured ? 'online' : 'fallback', {
      configured: Boolean(data.configured),
      model: data.model || 'glm-5.2',
      title: data.configured ? 'GLM-5.2 已接入中控塔' : 'GLM-5.2 未配置，使用本地规则',
      detail: data.configured
        ? '高管问答会通过本地后端代理调用 GLM-5.2，浏览器端不会接触 API key。'
        : '本地服务没有读取到 ZAI_API_KEY / GLM_API_KEY；现在使用内置经营规则保持流程可用。',
    });
  } catch {
    setTowerModelStatus('fallback', {
      configured: false,
      title: '模型状态不可用，使用本地规则',
      detail: '暂时无法访问 /api/glm-status；中控塔会保持本地会诊、任务生成和回流能力。',
    });
  }
}

function makeExecutiveChatMessage({ speaker, agentId = '', text, type = 'agent', channel = 'chat' }) {
  return {
    id: `tower-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    speaker,
    agentId,
    text,
    type,
    channel,
    createdAt: Date.now(),
  };
}

function renderExecutiveChat() {
  if (!towerChatLog) return;
  if (state.executiveTower.chatMessages.length === 0) {
    state.executiveTower.chatMessages.push(makeExecutiveChatMessage({
      speaker: 'SYSTEM',
      text: '中控塔已进入会议模式。底部可以问当前高管；需要五高管会诊时，打开 AI 高管会议舱。',
      type: 'system',
    }));
  }
  const visibleMessages = state.executiveTower.chatMessages.filter(message => message.channel !== 'board');
  towerChatLog.innerHTML = visibleMessages.slice(-12).map(message => {
    const agent = message.agentId ? getExecutiveAgent(message.agentId) : null;
    const accent = agent?.color || (message.type === 'user' ? '#e7fbff' : '#3ee898');
    return `
      <div class="tower-chat-message tower-chat-${escapeHtml(message.type)}" style="--agent-color:${accent}">
        <div class="tower-chat-speaker">
          <span>${escapeHtml(message.speaker)}</span>
          <em>${formatRelativeTime(message.createdAt)}</em>
        </div>
        <p>${escapeHtml(message.text)}</p>
      </div>
    `;
  }).join('');
  towerChatLog.scrollTop = towerChatLog.scrollHeight;
}

function renderExecutiveDecisionLog() {
  if (!towerDecisionFlow) return;
  towerDecisionFlow.innerHTML = state.executiveTower.decisionLog.slice(-7).map(item => `
    <li><span>${escapeHtml(item.role)}</span><strong>${escapeHtml(item.text)}</strong></li>
  `).join('');
}

function setTowerDecisionDockCollapsed(collapsed) {
  if (!towerDecisionDock || !towerDecisionDockToggle) return;
  towerDecisionDock.classList.toggle('collapsed', collapsed);
  towerDecisionDockToggle.textContent = collapsed ? '展开' : '收起';
  towerDecisionDockToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

function setTowerAgentDockCollapsed(collapsed) {
  if (!towerAgentDock || !towerAgentDockToggle) return;
  towerAgentDock.classList.toggle('collapsed', collapsed);
  towerAgentDockToggle.textContent = collapsed ? '展开' : '高管';
  towerAgentDockToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

function setTowerChatDockOpen(open, { focus = false } = {}) {
  if (!towerChatDock || !towerChatDockToggle) return;
  towerChatDock.classList.toggle('collapsed', !open);
  towerChatDock.style.setProperty('transition', 'none', 'important');
  towerChatDock.style.setProperty('transform', open ? 'translateX(-50%)' : 'translate(-50%, calc(100% - 52px))', 'important');
  towerChatDock.querySelectorAll('button, textarea, input, form, .tower-chat-dock-body').forEach(element => {
    if (open) {
      element.style.setProperty('transition', 'none', 'important');
      element.style.setProperty('visibility', 'visible', 'important');
    } else {
      element.style.removeProperty('visibility');
    }
  });
  towerChatDockToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  towerChatDockToggle.querySelector('em').textContent = open ? '点击向下收起' : '点击弹起 / 向下收起';
  if (open && focus && towerChatInput) {
    window.setTimeout(() => towerChatInput.focus(), 160);
  }
}

function setTowerBoardStatus(title, detail) {
  if (towerBoardStatusTitle) towerBoardStatusTitle.textContent = title;
  if (towerBoardStatusDetail) towerBoardStatusDetail.textContent = detail;
}

function renderExecutiveBoardFlow() {
  if (!towerBoardFlow) return;
  const latest = state.executiveTower.lastConversation;
  const hasBoardConversation = latest?.mode === 'board';
  const messages = state.executiveTower.chatMessages
    .filter(message => message.channel === 'board' && (message.type === 'user' || message.type === 'agent' || message.type === 'decision'))
    .slice(-8);
  if (state.executiveTower.boardBusy && state.executiveTower.boardRoomOpen) {
    setTowerBoardStatus('GLM-5.2 正在组织会议', '五位高管正在围绕议题形成角色意见、会议摘要和任务回流建议。');
  } else if (hasBoardConversation) {
    setTowerBoardStatus('高管会议已形成任务候选', '可以直接生成工厂任务，或把会议结论加入今日决策流。');
  } else if (!hasBoardConversation) {
    setTowerBoardStatus('等待会议议题', '会议舱会集中生成五高管会诊、CEO 总结，并把结论交给右侧任务回流。');
  }

  if (!hasBoardConversation && messages.length === 0) {
    towerBoardFlow.innerHTML = executiveAgents.map(agent => `
      <div class="tower-board-seat-row" style="--agent-color:${agent.color}">
        <span>${escapeHtml(getExecutiveRoleCode(agent.id))}</span>
        <strong>${escapeHtml(agent.focus)}</strong>
        <em>${escapeHtml(agent.task)}</em>
      </div>
    `).join('');
    return;
  }

  towerBoardFlow.innerHTML = messages.map(message => {
    const agent = message.agentId ? getExecutiveAgent(message.agentId) : null;
    const accent = agent?.color || (message.type === 'user' ? '#e7fbff' : '#3ee898');
    return `
      <div class="tower-board-message" style="--agent-color:${accent}">
        <span>${escapeHtml(message.speaker)}</span>
        <strong>${escapeHtml(message.text)}</strong>
        <em>${message.type === 'user' ? '会议议题' : message.type === 'decision' ? '会议总结' : escapeHtml(agent?.mission || '高管会诊意见')}</em>
      </div>
    `;
  }).join('');
  towerBoardFlow.scrollTop = towerBoardFlow.scrollHeight;
}

function setTowerBoardRoomOpen(open, { prefill = true, focus = false } = {}) {
  if (!towerBoardRoom) return;
  state.executiveTower.boardRoomOpen = open;
  towerBoardRoom.classList.toggle('hidden', !open);
  towerBoardRoom.setAttribute('aria-hidden', open ? 'false' : 'true');
  towerBoardRoom.querySelectorAll('button, textarea, input, form, .tower-board-flow, .tower-board-status').forEach(element => {
    if (open) {
      element.style.setProperty('transition', 'none', 'important');
      element.style.setProperty('visibility', 'visible', 'important');
    } else {
      element.style.removeProperty('visibility');
    }
  });
  if (!open) return;
  setTowerChatDockOpen(false);
  if (prefill && towerBoardAgenda && !towerBoardAgenda.value.trim()) {
    const draft = towerChatInput?.value.trim() || state.executiveTower.lastConversation?.question || '';
    if (draft) towerBoardAgenda.value = draft;
  }
  renderExecutiveBoardFlow();
  if (focus && towerBoardAgenda) {
    window.setTimeout(() => towerBoardAgenda.focus(), 120);
  }
}

function renderExecutiveAgentWatchList(agent) {
  if (!towerAgentWatchList) return;
  const watched = [
    { label: '当前盯防', text: agent.task },
    { label: '关键信号', text: agent.signal },
    { label: '下一动作', text: agent.recommendation },
  ];
  towerAgentWatchList.innerHTML = watched.map(item => `
    <div class="tower-watch-item">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.text)}</strong>
    </div>
  `).join('');
}

function setTowerActionButtonsEnabled(enabled) {
  const latest = state.executiveTower.lastConversation;
  const boardEnabled = enabled && latest?.mode === 'board';
  if (towerCreateTask) towerCreateTask.disabled = !enabled;
  if (towerSaveDecision) towerSaveDecision.disabled = !enabled;
  if (towerBoardCreateTask) towerBoardCreateTask.disabled = !boardEnabled;
  if (towerBoardSaveDecision) towerBoardSaveDecision.disabled = !boardEnabled;
}

function setTowerTaskHandoff(status, { title, detail, assetId } = {}) {
  state.executiveTower.taskHandoff = {
    status,
    title: title || state.executiveTower.taskHandoff.title,
    detail: detail || state.executiveTower.taskHandoff.detail,
  };
  if (assetId) state.executiveTower.taskHandoff.assetId = assetId;
  if (!towerTaskHandoff) return;
  towerTaskHandoff.dataset.handoffStatus = status;
  towerHandoffTitle.textContent = state.executiveTower.taskHandoff.title;
  towerHandoffDetail.textContent = state.executiveTower.taskHandoff.detail;
  if (towerReturnFactory) {
    towerReturnFactory.textContent = status === 'queued' ? '返回外部工厂查看任务' : '返回外部工厂';
  }
}

function getPendingTowerAsset() {
  const assetId = state.executiveTower.pendingReturnAssetId;
  if (!assetId) return null;
  return state.knowledgeAssets.find(asset => asset.userData.id === assetId) || null;
}

function revealPendingTowerTaskInFactory() {
  const asset = getPendingTowerAsset();
  if (!asset) return;
  setOpsPanelOpen(true);
  setCameraView('intake');
  showKnowledgeAssetPanel(asset);
}

function returnFromExecutiveTower() {
  const shouldRevealTask = Boolean(getPendingTowerAsset());
  setExecutiveTowerOpen(false);
  if (shouldRevealTask) {
    window.setTimeout(revealPendingTowerTaskInFactory, 900);
  }
}

function buildExecutiveResponse(agent, question, mode = 'single') {
  const cleanQuestion = summarizeInput(question);
  const roleCode = getExecutiveRoleCode(agent.id);
  const patterns = {
    ceo: {
      diagnosis: '先判断这件事是否服务长期主线，再压缩成 1 个优先级最高的经营动作。',
      action: '建议把问题转成“目标 / 约束 / 今日决策 / 下一步验证”四段，让工厂只围绕主线推进。',
      output: '产出应是一个可执行的经营决策，而不是泛泛讨论。',
    },
    cio: {
      diagnosis: '这个问题需要先补齐输入源、证据链和信息缺口，避免凭感觉决策。',
      action: '建议启动资料收集任务：用户场景、竞品表达、真实案例、外部数据源各补 1 组。',
      output: '产出应是一个可追溯的信息包和知识资产卡。',
    },
    coo: {
      diagnosis: '需要把模糊意图拆成队列、负责人、验收标准和节奏。',
      action: '建议拆成 3 个工单：需求澄清、原型改造、验收录制，并设置今日可完成边界。',
      output: '产出应进入 Live Queue，推动外部工厂持续运行。',
    },
    cto: {
      diagnosis: '从系统实现看，先做最小闭环：输入、回复、生成任务、刷新队列。',
      action: '建议通过本地后端代理接入 GLM-5.2，浏览器端只调用安全接口，并保留本地规则作为降级能力。',
      output: '产出应是可点击、可复用、可扩展的技术能力模块。',
    },
    cfo: {
      diagnosis: '要看这件事是否降低时间成本、提升资产复用率，或者打开新的收入机会。',
      action: '建议把每次高管讨论沉淀为可复用资产：销售脚本、需求证据、功能路线和演示素材。',
      output: '产出应能进入资产仓，并支撑后续商业化判断。',
    },
  };
  const selected = patterns[agent.id] || patterns.ceo;
  const prefix = mode === 'board' ? `${roleCode} 参会意见` : `${roleCode} 回答`;
  return `${prefix}：针对「${cleanQuestion}」，${selected.diagnosis} ${selected.action} ${selected.output}`;
}

function createExecutiveConversationSummary(question, messages) {
  const cleanQuestion = summarizeInput(question);
  const agentCodes = messages.map(message => message.speaker).join(' / ');
  return `围绕「${cleanQuestion}」，${agentCodes} 已完成一轮会诊。结论：先把意图转成可执行任务，再让外部工厂进入资料收集、原型改造、价值评估和输出沉淀。`;
}

function askExecutiveAgentLocal(question, agentId = state.executiveTower.activeAgent) {
  const agent = getExecutiveAgent(agentId);
  const answer = buildExecutiveResponse(agent, question, 'single');
  const message = makeExecutiveChatMessage({
    speaker: getExecutiveRoleCode(agent.id),
    agentId: agent.id,
    text: answer,
    type: 'agent',
  });
  state.executiveTower.chatMessages.push(message);
  state.executiveTower.lastConversation = {
    mode: 'single',
    question,
    summary: answer,
    agentIds: [agent.id],
    createdAt: Date.now(),
    taskCreated: false,
  };
  if (towerChatMode) towerChatMode.textContent = `问 ${getExecutiveRoleCode(agent.id)}`;
  setTowerActionButtonsEnabled(true);
  setTowerTaskHandoff('ready', {
    title: '会议结论可转入流水线',
    detail: '点击「生成工厂任务」后，会创建一条任务资产并同步到外部 Live Queue。',
  });
  renderExecutiveChat();
}

function askExecutiveBoardLocal(question) {
  const boardMessages = executiveAgents.map(agent => makeExecutiveChatMessage({
    speaker: getExecutiveRoleCode(agent.id),
    agentId: agent.id,
    text: buildExecutiveResponse(agent, question, 'board'),
    type: 'agent',
    channel: 'board',
  }));
  state.executiveTower.chatMessages.push(...boardMessages);
  const summary = createExecutiveConversationSummary(question, boardMessages);
  state.executiveTower.chatMessages.push(makeExecutiveChatMessage({
    speaker: 'CEO 总结',
    agentId: 'ceo',
    text: summary,
    type: 'decision',
    channel: 'board',
  }));
  state.executiveTower.lastConversation = {
    mode: 'board',
    question,
    summary,
    agentIds: executiveAgents.map(agent => agent.id),
    createdAt: Date.now(),
    taskCreated: false,
  };
  setTowerActionButtonsEnabled(true);
  setTowerTaskHandoff('ready', {
    title: '高管群聊已形成任务候选',
    detail: '点击「生成工厂任务」即可把 CEO/CIO/COO/CTO/CFO 的结论回流到工厂流水线。',
  });
  setTowerBoardStatus('高管会议已形成任务候选', '可以直接生成工厂任务，或把 CEO 总结加入今日决策流。');
  renderExecutiveChat();
  renderExecutiveBoardFlow();
}

function buildGlmExecutivePayload(question, mode, agentId = state.executiveTower.activeAgent) {
  return {
    mode,
    agentId,
    question,
    agents: executiveAgents.map(agent => ({
      id: agent.id,
      title: agent.title,
      mission: agent.mission,
      focus: agent.focus,
    })),
    ops: {
      backlog: state.ops.backlog,
      activeJobs: state.ops.activeJobs,
      blockedTasks: state.ops.blockedTasks,
      outputsToday: state.ops.outputsToday,
    },
  };
}

function normalizeGlmExecutiveMessages(payload, mode, agentId) {
  const sourceMessages = Array.isArray(payload?.messages) ? payload.messages : [];
  const messages = sourceMessages
    .map(message => {
      const speaker = String(message?.speaker || '').trim() || getExecutiveRoleCode(agentId);
      const resolvedAgentId = executiveAgents.some(agent => agent.id === message?.agentId)
        ? message.agentId
        : getExecutiveAgentIdFromRole(speaker);
      const text = String(message?.text || '').trim();
      if (!text) return null;
      return makeExecutiveChatMessage({
        speaker,
        agentId: resolvedAgentId,
        text,
        type: speaker.includes('总结') ? 'decision' : 'agent',
        channel: mode === 'board' ? 'board' : 'chat',
      });
    })
    .filter(Boolean);

  if (messages.length === 0) return null;
  const agentIds = Array.from(new Set(messages.map(message => message.agentId).filter(Boolean)));
  const summary = String(payload?.summary || messages.map(message => message.text).join(' ')).trim();
  const decisionFlow = Array.isArray(payload?.decisionFlow)
    ? payload.decisionFlow
      .map(item => ({
        role: String(item?.role || 'BOARD').slice(0, 12),
        text: String(item?.text || '').trim(),
      }))
      .filter(item => item.text)
      .slice(0, 5)
    : [];

  return {
    messages,
    summary,
    decisionFlow,
    agentIds: agentIds.length ? agentIds : [agentId],
    handoffTitle: String(payload?.handoffTitle || (mode === 'board' ? 'GLM 高管群聊已形成任务候选' : 'GLM 建议可转入流水线')).trim(),
    handoffDetail: String(payload?.handoffDetail || '点击「生成工厂任务」即可把 GLM-5.2 会诊结论回流到外部 Live Queue。').trim(),
  };
}

function applyGlmExecutiveConversation(question, mode, payload) {
  const normalized = normalizeGlmExecutiveMessages(payload, mode, state.executiveTower.activeAgent);
  if (!normalized) throw new Error('GLM response is empty.');
  state.executiveTower.chatMessages.push(...normalized.messages);
  state.executiveTower.lastConversation = {
    mode,
    question,
    summary: normalized.summary,
    agentIds: normalized.agentIds,
    createdAt: Date.now(),
    taskCreated: false,
    provider: payload?.model || 'glm-5.2',
  };
  if (towerChatMode && mode !== 'board') towerChatMode.textContent = `GLM 问 ${getExecutiveRoleCode(normalized.agentIds[0])}`;
  setTowerActionButtonsEnabled(true);
  setTowerTaskHandoff('ready', {
    title: normalized.handoffTitle,
    detail: normalized.handoffDetail,
  });
  if (normalized.decisionFlow.length) {
    state.executiveTower.latestDecisionDraft = normalized.decisionFlow;
  }
  setTowerModelStatus('online', {
    configured: true,
    model: payload?.model || 'glm-5.2',
    latencyMs: payload?.latencyMs,
    title: 'GLM-5.2 已生成会诊结论',
    detail: '这轮高管消息来自本地后端代理调用的 GLM-5.2，可继续生成工厂任务或沉淀到今日决策。',
  });
  if (mode === 'board') {
    setTowerBoardStatus('GLM 高管会议已形成任务候选', '可以直接生成工厂任务，或把会议结论加入今日决策流。');
  }
  renderExecutiveChat();
  renderExecutiveBoardFlow();
}

async function askExecutiveAgent(question, agentId = state.executiveTower.activeAgent) {
  if (IS_GITHUB_PAGES) return askExecutiveAgentLocal(question, agentId);
  setTowerChatBusy(true);
  setTowerModelStatus('thinking', {
    title: `GLM-5.2 正在询问 ${getExecutiveRoleCode(agentId)}`,
    detail: '模型会把问题压缩成该高管角色视角下的经营判断，并保留任务回流所需摘要。',
  });
  try {
    const response = await fetch('/api/glm-executive-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(buildGlmExecutivePayload(question, 'single', agentId)),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload?.error || 'GLM request failed.');
    applyGlmExecutiveConversation(question, 'single', payload);
  } catch (error) {
    setTowerModelStatus('fallback', {
      configured: state.executiveTower.modelRoute.configured,
      title: 'GLM 调用失败，已切回本地高管规则',
      detail: error instanceof Error ? error.message : String(error),
    });
    askExecutiveAgentLocal(question, agentId);
  } finally {
    setTowerChatBusy(false);
  }
}

async function askExecutiveBoard(question) {
  setTowerBoardRoomOpen(true, { prefill: false });
  if (IS_GITHUB_PAGES) return askExecutiveBoardLocal(question);
  state.executiveTower.boardBusy = true;
  setTowerChatBusy(true);
  setTowerBoardStatus('GLM-5.2 正在组织会议', '五位高管正在围绕议题形成角色意见、会议摘要和任务回流建议。');
  setTowerModelStatus('thinking', {
    title: 'GLM-5.2 正在召集五高管群聊',
    detail: '模型会同时输出 CEO/CIO/COO/CTO/CFO 参会意见、会诊摘要和任务回流提示。',
  });
  try {
    const response = await fetch('/api/glm-executive-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(buildGlmExecutivePayload(question, 'board', state.executiveTower.activeAgent)),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload?.error || 'GLM request failed.');
    applyGlmExecutiveConversation(question, 'board', payload);
  } catch (error) {
    setTowerModelStatus('fallback', {
      configured: state.executiveTower.modelRoute.configured,
      title: 'GLM 群聊失败，已切回本地会诊',
      detail: error instanceof Error ? error.message : String(error),
    });
    askExecutiveBoardLocal(question);
  } finally {
    state.executiveTower.boardBusy = false;
    setTowerChatBusy(false);
  }
}

function saveLatestExecutiveDecision() {
  const latest = state.executiveTower.lastConversation;
  if (!latest) {
    state.executiveTower.chatMessages.push(makeExecutiveChatMessage({
      speaker: 'SYSTEM',
      text: '还没有可保存的高管讨论，先输入一个问题。',
      type: 'system',
    }));
    renderExecutiveChat();
    return;
  }
  const role = latest.mode === 'board' ? 'BOARD' : getExecutiveRoleCode(latest.agentIds[0]);
  if (Array.isArray(state.executiveTower.latestDecisionDraft) && state.executiveTower.latestDecisionDraft.length) {
    state.executiveTower.decisionLog.push(...state.executiveTower.latestDecisionDraft);
    state.executiveTower.latestDecisionDraft = [];
  } else {
    state.executiveTower.decisionLog.push({
      role,
      text: latest.summary,
    });
  }
  state.executiveTower.chatMessages.push(makeExecutiveChatMessage({
    speaker: 'SYSTEM',
    text: '已加入今日决策流。',
    type: 'system',
  }));
  renderExecutiveDecisionLog();
  renderExecutiveChat();
}

function createTaskFromExecutiveConversation() {
  const latest = state.executiveTower.lastConversation;
  const track = state.conveyorTracks[0];
  if (!latest || !track) return;
  if (latest.taskCreated) {
    state.executiveTower.chatMessages.push(makeExecutiveChatMessage({
      speaker: 'FACTORY',
      text: '这一轮讨论已经生成过工厂任务，避免重复入队。',
      type: 'system',
    }));
    renderExecutiveChat();
    return;
  }

  const blueprint = createUserAssetBlueprint({
    inputType: 'INT',
    targetType: 'task',
    title: latest.mode === 'board' ? '高管会议生成任务' : `${getExecutiveRoleCode(latest.agentIds[0])} 建议执行任务`,
    content: `${latest.question}\n\n${latest.summary}`,
  });
  const newAsset = createKnowledgeAssetParcel(blueprint, track, {
    segment: 0,
    lifecycleIndex: 0,
    progress: 0.1,
    lateralOffset: 0.12,
    speed: 1.28,
  });

  latest.taskCreated = true;
  state.ops.backlog = Math.min(state.ops.backlog + 1, 99);
  state.ops.activeJobs = Math.min(state.ops.activeJobs + 1, 36);
  state.ops.cycle += 1;
  state.agents[0].load = Math.min(state.agents[0].load + 5, 92);
  state.agents[0].output = `${newAsset.userData.id} 来自中控塔会议`;
  state.outputs.unshift({
    type: 'TASK',
    name: `中控塔任务 · ${blueprint.title}`,
    detail: `${newAsset.userData.id} 已进入流水线：${newAsset.userData.lifecycleLabel} · ${newAsset.userData.assignedAgent}`,
    status: 'queued',
  });
  state.outputs = state.outputs.slice(0, 5);
  state.executiveTower.pendingReturnAssetId = newAsset.userData.id;
  setTowerTaskHandoff('queued', {
    assetId: newAsset.userData.id,
    title: `${newAsset.userData.id} 已进入外部工厂`,
    detail: '返回外部工厂后会自动展开运营面板，并定位这条中控塔生成的 Live Queue 任务。',
  });
  state.executiveTower.chatMessages.push(makeExecutiveChatMessage({
    speaker: 'FACTORY',
    text: `${newAsset.userData.id} 已发送到外部工厂流水线，并同步进入 Live Queue。`,
    type: 'system',
  }));
  renderOpsPanels();
  renderExecutiveChat();
}

function selectExecutiveTowerAgent(agentId) {
  const selected = getExecutiveAgent(agentId);
  state.executiveTower.activeAgent = selected.id;
  state.executiveTower.seats.forEach((seat, id) => {
    const active = id === selected.id;
    seat.userData.accentMaterial.emissiveIntensity = active ? 3.2 : 1.0;
    seat.userData.glowMaterial.opacity = active ? 0.52 : 0.22;
    seat.userData.consoleMaterial.emissiveIntensity = active ? 0.76 : 0.2;
    seat.userData.halo.scale.setScalar(active ? 1.18 : 1);
    seat.userData.screen.scale.set(active ? 1.08 : 1, active ? 1.06 : 1, 1);
    seat.scale.lerp(new THREE.Vector3(active ? 1.08 : 1, active ? 1.08 : 1, active ? 1.08 : 1), 1);
  });
}

function renderExecutiveAgentDetail(id = state.executiveTower.activeAgent) {
  const agent = getExecutiveAgent(id);
  state.executiveTower.activeAgent = agent.id;
  selectExecutiveTowerAgent(agent.id);
  if (towerActiveAgent) towerActiveAgent.textContent = agent.title;
  if (towerChatMode && !state.executiveTower.chatBusy) towerChatMode.textContent = `问 ${getExecutiveRoleCode(agent.id)}`;
  if (towerAskAgentSubmit && !state.executiveTower.chatBusy) towerAskAgentSubmit.textContent = `问 ${getExecutiveRoleCode(agent.id)}`;
  renderExecutiveAgentWatchList(agent);
  if (executiveAgentDetail) {
    executiveAgentDetail.style.setProperty('--agent-color', agent.color);
    executiveAgentDetail.innerHTML = `
      <div class="agent-detail-hero" style="--agent-color:${agent.color}">
        <strong>${escapeHtml(agent.title)} · ${escapeHtml(agent.name)}</strong>
        <span>${escapeHtml(agent.mission)}</span>
      </div>
      <div class="agent-detail-grid">
        <div>
          <span>当前关注</span>
          <strong>${escapeHtml(agent.focus)}</strong>
        </div>
        <div>
          <span>正在处理</span>
          <strong>${escapeHtml(agent.task)}</strong>
        </div>
        <div>
          <span>关键发现</span>
          <strong>${escapeHtml(agent.signal)}</strong>
        </div>
        <div>
          <span>连接到外部工厂</span>
          <strong>${agent.id === 'cto' ? '开发套件 / 组件后台 / 布局编辑器' : agent.id === 'cfo' ? '资产仓 / 工厂网络 / 机会雷达' : '任务队列 / 流水线 / 资产沉淀'}</strong>
        </div>
      </div>
      <div class="agent-recommendation" style="--agent-color:${agent.color}">
        <span>推荐动作</span>
        <strong>${escapeHtml(agent.recommendation)}</strong>
      </div>
    `;
  }
  document.querySelectorAll('[data-executive-agent]').forEach(button => {
    const buttonAgent = getExecutiveAgent(button.dataset.executiveAgent);
    button.style.setProperty('--agent-color', buttonAgent.color);
    button.classList.toggle('active', button.dataset.executiveAgent === agent.id);
  });
}

function updateExecutiveTowerInterior(t, dt) {
  const group = state.executiveTower.group;
  if (!group?.visible) return;
  const towerMode = state.executiveTower.taskHandoff.status === 'queued'
    ? 'refluxing'
    : state.executiveTower.chatBusy
      ? 'consulting'
      : state.executiveTower.lastConversation
        ? 'collaborating'
        : 'idle';
  state.executiveTower.animatedObjects.forEach(item => {
    if (item.kind === 'slow-ring' || item.kind === 'fast-ring' || item.kind === 'gate-ring') {
      item.object.rotation.z += item.speed * dt;
      item.object.material.emissiveIntensity = item.kind === 'fast-ring'
        ? 2.2 + Math.sin(t * 3.2) * 0.45
        : 1.45 + Math.sin(t * 1.8) * 0.22;
    } else if (item.kind === 'signal-sphere') {
      item.object.rotation.y += item.speed * dt;
      item.object.rotation.x += item.speed * 0.45 * dt;
      item.object.material.opacity = 0.18 + Math.sin(t * 2.4) * 0.05;
    } else if (item.kind === 'model-core' || item.kind === 'model-core-wire') {
      const activeMultiplier = towerMode === 'consulting' ? 2.2 : towerMode === 'collaborating' ? 1.55 : towerMode === 'refluxing' ? 1.8 : 1;
      item.object.rotation.y += item.speed * activeMultiplier * dt;
      item.object.rotation.x += item.speed * 0.55 * activeMultiplier * dt;
      item.object.position.y = item.object.userData.baseY + Math.sin(t * 2.8 * activeMultiplier) * 0.08;
      item.object.scale.setScalar(towerMode === 'consulting' ? 1.08 + Math.sin(t * 6) * 0.04 : towerMode === 'refluxing' ? 0.96 : 1);
      if (item.object.material.emissiveIntensity !== undefined) {
        item.object.material.emissiveIntensity = (towerMode === 'idle' ? 1.65 : 2.4) + Math.sin(t * 3.5) * 0.42;
      }
      if (item.object.material.opacity !== undefined && item.kind === 'model-core-wire') {
        item.object.material.opacity = towerMode === 'idle' ? 0.12 : towerMode === 'refluxing' ? 0.24 : 0.2 + Math.sin(t * 2.4) * 0.04;
      }
    } else if (item.kind === 'data-beacon') {
      const ud = item.object.userData;
      ud.phase = (ud.phase + item.speed * dt) % 1;
      const radius = THREE.MathUtils.lerp(4.8, 1.0, ud.phase);
      item.object.position.set(
        ud.center.x + Math.sin(ud.angle) * radius,
        ud.baseY + Math.sin(t * 5 + ud.phase * Math.PI) * 0.05,
        ud.center.z - 1.2 + Math.cos(ud.angle) * radius,
      );
      item.object.material.opacity = 0.38 + (1 - ud.phase) * 0.42;
    } else if (item.kind === 'collab-pod') {
      const pulse = 1 + Math.sin(t * 2.4 + item.object.position.x) * 0.08;
      item.object.scale.setScalar(pulse);
      if (item.object.material.emissiveIntensity !== undefined) {
        item.object.material.emissiveIntensity = 1.4 + Math.sin(t * 2.1) * 0.28;
      }
    } else if (item.kind === 'chamber-shell') {
      const targetScale = towerMode === 'idle' ? 0.18 : towerMode === 'refluxing' ? 0.62 : 1;
      item.object.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
      const opacity = towerMode === 'idle' ? 0.035 : towerMode === 'consulting' ? 0.12 : towerMode === 'collaborating' ? 0.18 : 0.08;
      setObjectOpacity(item.object, opacity + Math.sin(t * 2) * 0.018);
      item.object.rotation.y += dt * 0.08;
    } else if (item.kind === 'intent-beam') {
      const active = towerMode === 'consulting' || towerMode === 'collaborating' || towerMode === 'refluxing';
      item.object.material.opacity = active ? 0.34 + Math.sin(t * 4.5) * 0.08 : 0.11;
      item.object.scale.set(active ? 1.05 : 1, 1, active ? 1.05 : 1);
    } else if (item.kind === 'intent-pulse') {
      const active = towerMode === 'consulting' || towerMode === 'collaborating' || towerMode === 'refluxing';
      const ud = item.object.userData;
      ud.progress = (ud.progress + item.speed * (active ? 2.4 : 0.45) * dt) % 1;
      item.object.position.lerpVectors(ud.start, ud.end, ud.progress);
      item.object.visible = active || ud.progress < 0.35;
      item.object.material.opacity = active ? 0.36 + (1 - ud.progress) * 0.48 : 0.12;
    } else if (item.kind === 'reflux-conduit') {
      const active = towerMode === 'refluxing';
      item.object.material.opacity = active ? 0.48 + Math.sin(t * 4) * 0.08 : state.executiveTower.lastConversation ? 0.2 : 0.08;
    } else if (item.kind === 'reflux-pulse') {
      const active = towerMode === 'refluxing';
      const ud = item.object.userData;
      ud.progress = (ud.progress + item.speed * (active ? 3.2 : 0.4) * dt) % 1;
      item.object.position.copy(ud.curve.getPointAt(ud.progress));
      item.object.visible = active;
      item.object.material.opacity = active ? 0.45 + Math.sin(t * 8 + ud.progress * Math.PI) * 0.18 : 0;
    }
  });
  state.executiveTower.seats.forEach((seat, id) => {
    const active = id === state.executiveTower.activeAgent;
    const engaged = towerMode === 'consulting' || towerMode === 'collaborating' || towerMode === 'refluxing';
    const pulse = active ? 1 + Math.sin(t * 5.2) * 0.07 : 1 + Math.sin(t * 2.2 + seat.position.x) * 0.018;
    seat.userData.pad.scale.x = pulse;
    seat.userData.halo.material.opacity = active ? 0.46 + Math.sin(t * 4.2) * 0.08 : engaged ? 0.28 : 0.18;
    if (seat.userData.pulseRing) {
      seat.userData.pulseRing.material.opacity = engaged ? (active ? 0.54 : 0.32) + Math.sin(t * 5 + seat.position.x) * 0.08 : 0.14;
      const ringScale = engaged ? 1.08 + Math.sin(t * 3.5 + seat.position.z) * 0.06 : 1;
      seat.userData.pulseRing.scale.setScalar(ringScale);
    }
  });
}

function setExecutiveTowerOpen(open) {
  const group = buildExecutiveTowerInterior();
  if (state.executiveTower.open === open) {
    if (open) {
      group.visible = true;
      renderExecutiveAgentDetail(state.executiveTower.activeAgent);
      renderExecutiveChat();
      renderExecutiveDecisionLog();
      refreshTowerModelStatus();
      animateCameraToPose(EXECUTIVE_TOWER_CAMERA.position, EXECUTIVE_TOWER_CAMERA.target, 850);
    }
    return;
  }
  if (open) {
    state.executiveTower.previousCameraPose = {
      position: camera.position.clone(),
      target: controls.target.clone(),
    };
  }
  state.executiveTower.open = open;
  executiveTowerPanel.classList.toggle('hidden', !open);
  executiveTowerPanel.style.setProperty('transition', 'none', 'important');
  executiveTowerPanel.style.setProperty('opacity', open ? '1' : '0', 'important');
  executiveTowerPanel.style.setProperty('visibility', open ? 'visible' : 'hidden', 'important');
  document.body.classList.toggle('executive-tower-active', open);
  executiveTowerToggle.classList.toggle('active', open);
  executiveTowerToggle.setAttribute('aria-expanded', open ? 'true' : 'false');

  if (!open) {
    setTowerBoardRoomOpen(false);
    controls.enabled = true;
    const previous = state.executiveTower.previousCameraPose;
    if (previous) {
      animateCameraToPose(previous.position, previous.target, 850, () => {
        if (!state.executiveTower.open && group) group.visible = false;
      });
    } else if (group) {
      group.visible = false;
    }
    return;
  }

  group.visible = true;
  setFactoryNetworkOpen(false, { preserveCamera: true });
  setFactoryMatrixOpen(false, { preserveCamera: true });
  if (state.layoutEditor.open) setLayoutEditorOpen(false);
  setOpsPanelOpen(false);
  setTextLayerMenuOpen(false);
  setIngestPanelOpen(false);
  setPolicyPanelOpen(false);
  setComponentConsoleOpen(false);
  document.getElementById('object-info-panel').classList.add('hidden');
  document.getElementById('tooltip').classList.add('hidden');
  controls.enabled = true;
  setTowerDecisionDockCollapsed(false);
  setTowerAgentDockCollapsed(false);
  setTowerChatDockOpen(false);
  setTowerBoardRoomOpen(false);
  renderExecutiveAgentDetail(state.executiveTower.activeAgent);
  renderExecutiveChat();
  renderExecutiveDecisionLog();
  renderExecutiveBoardFlow();
  refreshTowerModelStatus();
  animateCameraToPose(EXECUTIVE_TOWER_CAMERA.position, EXECUTIVE_TOWER_CAMERA.target, 1050);
}

function isControlTowerObject(obj) {
  if (!obj?.userData?.factoryObjectId) return false;
  const record = getFactoryObjectRecord(obj);
  return record?.id?.startsWith('control-tower.') || record?.type === 'control-tower' || record?.type === 'control-tower-cab';
}

executiveTowerToggle.addEventListener('click', () => {
  setExecutiveTowerOpen(!state.executiveTower.open);
});
document.getElementById('executive-tower-close').addEventListener('click', () => {
  returnFromExecutiveTower();
});
towerReturnFactory.addEventListener('click', () => {
  returnFromExecutiveTower();
});
document.getElementById('tower-network-jump').addEventListener('click', () => {
  window.location.href = getServedAppUrl('/factory-matrix.html?radar=1');
});
document.getElementById('tower-show-decision').addEventListener('click', () => {
  saveLatestExecutiveDecision();
});
if (towerDecisionDockToggle) {
  towerDecisionDockToggle.addEventListener('click', () => {
    setTowerDecisionDockCollapsed(!towerDecisionDock.classList.contains('collapsed'));
  });
}
if (towerAgentDockToggle) {
  towerAgentDockToggle.addEventListener('click', () => {
    setTowerAgentDockCollapsed(!towerAgentDock.classList.contains('collapsed'));
  });
}
if (towerChatDockToggle) {
  towerChatDockToggle.addEventListener('click', () => {
    setTowerChatDockOpen(towerChatDock.classList.contains('collapsed'), { focus: true });
  });
}
if (towerOpenBoardRoom) {
  towerOpenBoardRoom.addEventListener('click', () => {
    setTowerBoardRoomOpen(true, { prefill: true, focus: true });
  });
}
if (towerBoardClose) {
  towerBoardClose.addEventListener('click', () => {
    setTowerBoardRoomOpen(false);
  });
}
document.querySelectorAll('[data-executive-agent]').forEach(button => {
  button.addEventListener('click', () => renderExecutiveAgentDetail(button.dataset.executiveAgent));
});
document.querySelectorAll('[data-tower-prompt]').forEach(button => {
  button.addEventListener('click', () => {
    if (!towerChatInput) return;
    setTowerChatDockOpen(true, { focus: true });
    towerChatInput.value = button.dataset.towerPrompt || '';
    if (towerBoardAgenda && state.executiveTower.boardRoomOpen) {
      towerBoardAgenda.value = towerChatInput.value;
    }
    towerChatInput.focus();
  });
});
if (towerChatForm) {
  towerChatForm.addEventListener('submit', event => {
    event.preventDefault();
    setTowerChatDockOpen(true);
    const question = towerChatInput.value.trim();
    if (!question) {
      state.executiveTower.chatMessages.push(makeExecutiveChatMessage({
        speaker: 'SYSTEM',
        text: '先输入一个问题、意图或经营指令。',
        type: 'system',
      }));
      renderExecutiveChat();
      return;
    }
    state.executiveTower.chatMessages.push(makeExecutiveChatMessage({
      speaker: 'YOU',
      text: question,
      type: 'user',
    }));
    askExecutiveAgent(question, state.executiveTower.activeAgent);
    towerChatInput.value = '';
  });
}
if (towerBoardForm) {
  towerBoardForm.addEventListener('submit', event => {
    event.preventDefault();
    const question = towerBoardAgenda.value.trim();
    if (!question) {
      setTowerBoardStatus('先输入会议议题', '会议舱需要一个明确议题，才能召集 CEO/CIO/COO/CTO/CFO 形成会诊结论。');
      towerBoardAgenda.focus();
      return;
    }
    state.executiveTower.chatMessages = state.executiveTower.chatMessages.filter(message => message.channel !== 'board');
    setTowerActionButtonsEnabled(false);
    state.executiveTower.chatMessages.push(makeExecutiveChatMessage({
      speaker: 'MEETING TOPIC',
      text: question,
      type: 'user',
      channel: 'board',
    }));
    renderExecutiveBoardFlow();
    askExecutiveBoard(question);
  });
}
if (towerCreateTask) towerCreateTask.addEventListener('click', createTaskFromExecutiveConversation);
if (towerSaveDecision) towerSaveDecision.addEventListener('click', saveLatestExecutiveDecision);
if (towerBoardCreateTask) towerBoardCreateTask.addEventListener('click', createTaskFromExecutiveConversation);
if (towerBoardSaveDecision) towerBoardSaveDecision.addEventListener('click', saveLatestExecutiveDecision);
setTowerTaskHandoff('idle', state.executiveTower.taskHandoff);
renderExecutiveAgentDetail('ceo');
renderExecutiveDecisionLog();
renderExecutiveBoardFlow();
refreshTowerModelStatus();

// ─────────────────────────────────────
// FACTORY NETWORK UI
// ─────────────────────────────────────
const factoryNetworkPanel = document.getElementById('factory-network-panel');
const factoryNetworkToggle = document.getElementById('toggle-factory-network');
const factoryNetworkStatus = document.getElementById('factory-network-status');
const factoryNetworkOpportunityList = document.getElementById('factory-network-opportunities');

function getActiveNetworkFactoryIds() {
  const routes = [
    ['industry-intel', 'ui-design', 'codex-dev', 'content-growth', 'customer-insight'],
    ['data-intake', 'industry-intel', 'knowledge-assets', 'content-growth'],
    ['customer-insight', 'delivery-chain', 'codex-dev', 'credit-ledger'],
  ];
  return new Set(routes[state.factoryNetwork.activeOpportunity] || routes[0]);
}

function renderFactoryNetworkPanel() {
  const activeIds = getActiveNetworkFactoryIds();
  factoryNetworkOpportunityList.innerHTML = networkOpportunities.map((item, index) => {
    const active = index === state.factoryNetwork.activeOpportunity ? ' active' : '';
    return `
      <button class="network-opportunity${active}" type="button" data-network-opportunity="${index}">
        <span class="network-opportunity-head">
          <strong>${escapeHtml(item.title)}</strong>
          <em>${item.score}%</em>
        </span>
        <span>${escapeHtml(item.route)}</span>
        <small>${escapeHtml(item.output)}</small>
        <b>${escapeHtml(item.revenue)}</b>
      </button>
    `;
  }).join('');
  factoryNetworkOpportunityList.querySelectorAll('[data-network-opportunity]').forEach(button => {
    button.addEventListener('click', () => {
      setActiveNetworkOpportunity(Number(button.dataset.networkOpportunity));
    });
  });
  state.factoryNetwork.nodes.forEach(node => {
    const active = activeIds.has(node.userData.id);
    node.userData.networkActive = active;
    node.traverse(child => {
      if (!child.material?.emissiveIntensity) return;
      child.material.emissiveIntensity = active ? Math.max(child.material.emissiveIntensity, 0.9) : child.material.emissiveIntensity;
    });
  });
  const active = networkOpportunities[state.factoryNetwork.activeOpportunity];
  setFactoryNetworkStatus(active ? `已高亮：${active.title}` : state.factoryNetwork.status);
}

function setFactoryNetworkStatus(message) {
  state.factoryNetwork.status = message;
  if (factoryNetworkStatus) factoryNetworkStatus.textContent = message;
}

function setActiveNetworkOpportunity(index) {
  state.factoryNetwork.activeOpportunity = THREE.MathUtils.clamp(index, 0, networkOpportunities.length - 1);
  const activeIds = getActiveNetworkFactoryIds();
  state.factoryNetwork.links.forEach(link => {
    const active = activeIds.has(link.userData.factoryId);
    link.userData.networkActive = active;
    link.material.opacity = active ? 0.72 : 0.26;
  });
  state.factoryNetwork.packets.forEach(packet => {
    packet.visible = activeIds.has(packet.userData.factoryId);
  });
  renderFactoryNetworkPanel();
}

function setFactoryNetworkOpen(open, options = {}) {
  buildFactoryNetworkLayer();
  state.factoryNetwork.open = open;
  state.factoryNetwork.group.visible = open;
  document.body.classList.toggle('network-layer-active', open);
  factoryNetworkPanel.classList.toggle('hidden', !open);
  factoryNetworkToggle.classList.toggle('active', open);
  factoryNetworkToggle.setAttribute('aria-expanded', open ? 'true' : 'false');

  if (!open) {
    if (!options.preserveCamera) setCameraView('overview');
    return;
  }

  setFactoryMatrixOpen(false, { preserveCamera: true });
  if (state.executiveTower.open) setExecutiveTowerOpen(false);
  if (state.layoutEditor.open) setLayoutEditorOpen(false);
  setOpsPanelOpen(false);
  setTextLayerMenuOpen(false);
  setIngestPanelOpen(false);
  setPolicyPanelOpen(false);
  setComponentConsoleOpen(false);
  document.getElementById('object-info-panel').classList.add('hidden');
  document.getElementById('tooltip').classList.add('hidden');
  setActiveNetworkOpportunity(state.factoryNetwork.activeOpportunity);
  setFactoryNetworkStatus('正在扫描供需关系与协作机会');
  animateCameraToNetwork();
}

function showNetworkFactoryInfo(obj) {
  const panel = document.getElementById('object-info-panel');
  const title = document.getElementById('obj-info-title');
  const content = document.getElementById('obj-info-content');
  const ud = obj.userData;
  title.textContent = `NETWORK FACTORY — ${ud.title}`;
  content.innerHTML = `
    <div class="asset-card-head">
      <div>
        <strong>${escapeHtml(ud.title)}</strong>
        <span>${escapeHtml(ud.role)} · ${escapeHtml(ud.relation)}</span>
      </div>
      <em style="border-color:#3ee898;color:#3ee898">${ud.match}%</em>
    </div>
    <div class="info-row"><span class="info-label">可供应</span><span class="info-val">${escapeHtml(ud.supply)}</span></div>
    <div class="info-row"><span class="info-label">当前需求</span><span class="info-val">${escapeHtml(ud.demand)}</span></div>
    <div class="info-row"><span class="info-label">匹配关系</span><span class="info-val">${escapeHtml(ud.relation)}</span></div>
    <div class="info-row"><span class="info-label">协作方式</span><span class="info-val">能力调用 / 资产交换 / 临时供应链</span></div>
    <div class="info-row"><span class="info-label">沉淀资产</span><span class="info-val">交付记录、工厂信用、可复用流程和收入线索</span></div>
    <div class="info-actions">
      <span>可撮合</span>
      <span>可接单</span>
      <span>可供应链协作</span>
    </div>
  `;
  panel.classList.remove('hidden');
}

factoryNetworkToggle.addEventListener('click', () => {
  setFactoryNetworkOpen(!state.factoryNetwork.open);
});
document.getElementById('factory-network-close').addEventListener('click', () => {
  setFactoryNetworkOpen(false);
});
document.getElementById('network-return').addEventListener('click', () => {
  setFactoryNetworkOpen(false);
});
document.getElementById('network-scan').addEventListener('click', () => {
  setFactoryNetworkStatus('已完成扫描：发现 8 个高相关工厂、3 条可启动供应链');
  setActiveNetworkOpportunity(0);
});
document.getElementById('network-chain').addEventListener('click', () => {
  const next = (state.factoryNetwork.activeOpportunity + 1) % networkOpportunities.length;
  setActiveNetworkOpportunity(next);
  setFactoryNetworkStatus(`已生成临时供应链：${networkOpportunities[next].title}`);
});

const factoryMatrixPanel = document.getElementById('factory-matrix-panel');
const factoryMatrixToggle = document.getElementById('toggle-factory-matrix');
const opportunityRadarToggle = document.getElementById('toggle-opportunity-radar');
const factoryMatrixStatus = document.getElementById('factory-matrix-status');
const factoryMatrixOpportunityList = document.getElementById('factory-matrix-opportunities');
const matrixStoryTitle = document.getElementById('matrix-story-title');
const matrixStoryScore = document.getElementById('matrix-story-score');
const matrixStoryDemand = document.getElementById('matrix-story-demand');
const matrixStoryStepsEl = document.getElementById('matrix-story-steps');
const matrixTeamPlan = document.getElementById('matrix-team-plan');

function getServedAppUrl(path) {
  const base = window.location.protocol === 'file:' ? 'http://localhost:8081/' : window.location.href;
  return new URL(path.replace(/^\//, ''), base).href;
}

function openFactoryMatrixPage(autoRun = false) {
  window.location.href = getServedAppUrl(autoRun ? '/factory-matrix.html?radar=1' : '/factory-matrix.html');
}

function getMatrixNodeById(id) {
  return matrixFactoryNodes.find(node => node.id === id);
}

function getMatrixRouteLabel(opportunity) {
  return opportunity.nodeIds.map(id => {
    const node = getMatrixNodeById(id);
    return node ? `${node.industry}/${node.capability}` : id;
  }).join(' → ');
}

function setFactoryMatrixStatus(message) {
  state.factoryMatrix.status = message;
  if (factoryMatrixStatus) factoryMatrixStatus.textContent = message;
}

function clearMatrixStoryTimers() {
  state.factoryMatrix.storyTimers.forEach(timer => clearTimeout(timer));
  state.factoryMatrix.storyTimers = [];
}

function getMatrixTeamAssignments(opportunity) {
  return opportunity.nodeIds.map((id, index) => {
    const node = getMatrixNodeById(id);
    if (!node) return null;
    return {
      id,
      step: index + 1,
      title: `${node.industry} · ${node.capability}`,
      task: matrixCapabilityTasks[node.capability] || `${node.capability} 能力执行与交付。`,
      credit: node.credit,
      load: node.load,
      available: node.available,
    };
  }).filter(Boolean);
}

function renderMatrixStory() {
  const opportunity = matrixOpportunities[state.factoryMatrix.activeOpportunity];
  if (!opportunity) return;
  if (matrixStoryTitle) matrixStoryTitle.textContent = opportunity.title;
  if (matrixStoryScore) matrixStoryScore.textContent = `${opportunity.score}%`;
  if (matrixStoryDemand) matrixStoryDemand.textContent = opportunity.demand || opportunity.output;
  if (matrixStoryStepsEl) {
    matrixStoryStepsEl.innerHTML = matrixStorySteps.map((step, index) => {
      const active = index === state.factoryMatrix.storyStep ? ' active' : '';
      const done = index < state.factoryMatrix.storyStep ? ' done' : '';
      return `<span class="matrix-story-step${active}${done}" data-story-step="${index}">${escapeHtml(step.label)}</span>`;
    }).join('');
  }
  if (matrixTeamPlan) {
    const assignments = getMatrixTeamAssignments(opportunity);
    matrixTeamPlan.innerHTML = `
      <div class="matrix-team-head">
        <span>临时公司任务分工</span>
        <strong>${escapeHtml(assignments.length)} 个节点</strong>
      </div>
      ${assignments.map(item => `
        <div class="matrix-team-row${item.available ? '' : ' is-busy'}">
          <em>${String(item.step).padStart(2, '0')}</em>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.task)}</span>
          </div>
          <b>${item.credit} / ${item.load}%</b>
        </div>
      `).join('')}
    `;
    matrixTeamPlan.classList.toggle('active', state.factoryMatrix.companyMode || state.factoryMatrix.storyStep >= 3);
  }
}

function setMatrixStoryStep(stepIndex, statusOverride) {
  state.factoryMatrix.storyStep = THREE.MathUtils.clamp(stepIndex, 0, matrixStorySteps.length - 1);
  const step = matrixStorySteps[state.factoryMatrix.storyStep];
  renderMatrixStory();
  setFactoryMatrixStatus(statusOverride || step.status);
}

function renderFactoryMatrixPanel() {
  factoryMatrixOpportunityList.innerHTML = matrixOpportunities.map((item, index) => {
    const active = index === state.factoryMatrix.activeOpportunity ? ' active' : '';
    const route = getMatrixRouteLabel(item);
    return `
      <button class="network-opportunity${active}" type="button" data-matrix-opportunity="${index}">
        <span class="network-opportunity-head">
          <strong>${escapeHtml(item.title)}</strong>
          <em>${item.score}%</em>
        </span>
        <span>${escapeHtml(route)}</span>
        <small>${escapeHtml(item.output)}</small>
        <b>${escapeHtml(item.revenue)}</b>
      </button>
    `;
  }).join('');
  factoryMatrixOpportunityList.querySelectorAll('[data-matrix-opportunity]').forEach(button => {
    button.addEventListener('click', () => {
      setActiveMatrixOpportunity(Number(button.dataset.matrixOpportunity), { scanned: true });
    });
  });
  const active = matrixOpportunities[state.factoryMatrix.activeOpportunity];
  if (active) setFactoryMatrixStatus(state.factoryMatrix.companyMode ? `临时公司已生成：${active.title}` : `已高亮：${active.title}`);
  renderMatrixStory();
}

function setActiveMatrixOpportunity(index, options = {}) {
  state.factoryMatrix.activeOpportunity = THREE.MathUtils.clamp(index, 0, matrixOpportunities.length - 1);
  if (options.scanned) state.factoryMatrix.scanned = true;
  const activeIds = getActiveMatrixNodeIds();
  state.factoryMatrix.nodes.forEach(node => {
    const active = activeIds.has(node.userData.id);
    node.userData.matrixActive = active;
    node.userData.calloutElement?.classList.toggle('matrix-callout-active', active && state.factoryMatrix.scanned);
    node.userData.calloutElement?.classList.toggle('matrix-callout-company', active && state.factoryMatrix.companyMode);
    node.traverse(child => {
      if (!child.material) return;
      const role = child.userData?.matrixRole;
      if (role === 'accent' || role === 'beacon') {
        child.material.emissiveIntensity = active ? 2.1 : 0.34;
        if (child.material.opacity !== undefined) child.material.opacity = active ? 1 : 0.62;
      } else if (role === 'glass') {
        child.material.opacity = active ? 0.58 : 0.32;
      } else if (role === 'body' || role === 'roof') {
        child.material.opacity = active ? 1 : 0.82;
      }
    });
  });
  state.factoryMatrix.links.forEach(link => {
    const active = link.userData.opportunityIndex === state.factoryMatrix.activeOpportunity;
    link.visible = active && state.factoryMatrix.scanned;
    link.material.opacity = active ? 0.58 : 0;
  });
  state.factoryMatrix.packets.forEach(packet => {
    packet.visible = packet.userData.opportunityIndex === state.factoryMatrix.activeOpportunity && state.factoryMatrix.companyMode;
  });
  renderFactoryMatrixPanel();
}

function runMatrixOpportunityStory(index = 0) {
  clearMatrixStoryTimers();
  state.factoryMatrix.storyMode = true;
  state.factoryMatrix.scanned = false;
  state.factoryMatrix.companyMode = false;
  state.factoryMatrix.activeOpportunity = THREE.MathUtils.clamp(index, 0, matrixOpportunities.length - 1);
  if (!state.factoryMatrix.open) {
    setFactoryMatrixOpen(true, { preserveCamera: false });
  }
  opportunityRadarToggle?.classList.add('active');
  opportunityRadarToggle?.setAttribute('aria-expanded', 'true');
  setActiveMatrixOpportunity(state.factoryMatrix.activeOpportunity);
  setMatrixStoryStep(0);

  const schedule = (delay, action) => {
    const timer = setTimeout(action, delay);
    state.factoryMatrix.storyTimers.push(timer);
  };

  schedule(1100, () => {
    state.factoryMatrix.scanned = true;
    state.factoryMatrix.companyMode = false;
    setActiveMatrixOpportunity(state.factoryMatrix.activeOpportunity, { scanned: true });
    setMatrixStoryStep(1);
  });
  schedule(2300, () => {
    const opportunity = matrixOpportunities[state.factoryMatrix.activeOpportunity];
    setActiveMatrixOpportunity(state.factoryMatrix.activeOpportunity, { scanned: true });
    setMatrixStoryStep(2, `已匹配 ${opportunity.nodeIds.length} 个节点：${getMatrixRouteLabel(opportunity)}`);
  });
  schedule(3600, () => {
    const opportunity = matrixOpportunities[state.factoryMatrix.activeOpportunity];
    state.factoryMatrix.companyMode = true;
    setActiveMatrixOpportunity(state.factoryMatrix.activeOpportunity, { scanned: true });
    setMatrixStoryStep(3, `临时公司已生成：${opportunity.title}`);
  });
  schedule(4900, () => {
    const opportunity = matrixOpportunities[state.factoryMatrix.activeOpportunity];
    state.factoryMatrix.companyMode = true;
    setActiveMatrixOpportunity(state.factoryMatrix.activeOpportunity, { scanned: true });
    setMatrixStoryStep(4, `任务分工已下发：${opportunity.output}`);
  });
}

function setFactoryMatrixOpen(open, options = {}) {
  if (open) {
    openFactoryMatrixPage(false);
    return;
  }
  state.factoryMatrix.open = open;
  if (state.factoryMatrix.group) state.factoryMatrix.group.visible = false;
  document.body.classList.toggle('matrix-layer-active', open);
  factoryMatrixPanel.classList.toggle('hidden', !open);
  factoryMatrixToggle.classList.toggle('active', open);
  factoryMatrixToggle.setAttribute('aria-expanded', open ? 'true' : 'false');

  if (!open) {
    clearMatrixStoryTimers();
    state.factoryMatrix.companyMode = false;
    state.factoryMatrix.storyMode = false;
    state.factoryMatrix.storyStep = 0;
    opportunityRadarToggle?.classList.remove('active');
    opportunityRadarToggle?.setAttribute('aria-expanded', 'false');
    applyVisualTheme();
    if (!options.preserveCamera) setCameraView('overview');
    return;
  }

  setFactoryNetworkOpen(false, { preserveCamera: true });
  if (state.layoutEditor.open) setLayoutEditorOpen(false);
  setOpsPanelOpen(false);
  setTextLayerMenuOpen(false);
  setIngestPanelOpen(false);
  setPolicyPanelOpen(false);
  setComponentConsoleOpen(false);
  document.getElementById('object-info-panel').classList.add('hidden');
  document.getElementById('tooltip').classList.add('hidden');
  state.factoryMatrix.scanned = false;
  state.factoryMatrix.companyMode = false;
  if (!state.factoryMatrix.storyMode) state.factoryMatrix.storyStep = 0;
  setActiveMatrixOpportunity(state.factoryMatrix.activeOpportunity);
  setFactoryMatrixStatus('矩阵已展开：48 座工厂等待扫描');
  opportunityRadarToggle?.setAttribute('aria-expanded', state.factoryMatrix.storyMode ? 'true' : 'false');
  animateCameraToMatrix();
}

function showMatrixFactoryInfo(obj) {
  const panel = document.getElementById('object-info-panel');
  const title = document.getElementById('obj-info-title');
  const content = document.getElementById('obj-info-content');
  const ud = obj.userData;
  const active = getActiveMatrixNodeIds().has(ud.id);
  title.textContent = `MATRIX FACTORY — ${ud.title}`;
  content.innerHTML = `
    <div class="asset-card-head">
      <div>
        <strong>${escapeHtml(ud.title)}</strong>
        <span>${escapeHtml(ud.industry)} · ${escapeHtml(ud.capability)}</span>
      </div>
      <em style="border-color:${active ? '#facc15' : '#3cc8ff'};color:${active ? '#facc15' : '#3cc8ff'}">${ud.match}%</em>
    </div>
    <div class="info-row"><span class="info-label">矩阵位置</span><span class="info-val">${escapeHtml(ud.industry)} / ${escapeHtml(ud.capability)}</span></div>
    <div class="info-row"><span class="info-label">可供应</span><span class="info-val">${escapeHtml(ud.capability)} 能力、流程资产、交付经验</span></div>
    <div class="info-row"><span class="info-label">可需求</span><span class="info-val">上游数据、下游交付、信用背书或跨行业场景</span></div>
    <div class="info-row"><span class="info-label">信用分</span><span class="info-val">${ud.credit} / 100</span></div>
    <div class="info-row"><span class="info-label">当前负载</span><span class="info-val">${ud.load}% · ${ud.available ? '可加入临时公司' : '高负载待排队'}</span></div>
    <div class="info-row"><span class="info-label">撮合状态</span><span class="info-val">${active ? '● 当前临时公司候选节点' : '待扫描或待匹配'}</span></div>
    <div class="info-row"><span class="info-label">网络意义</span><span class="info-val">把个人能力从静态简历升级成可调用、可协作、可复用的生产节点。</span></div>
    <div class="info-actions">
      <span>${active ? '已高亮' : '待匹配'}</span>
      <span>可供应</span>
      <span>可需求</span>
    </div>
  `;
  panel.classList.remove('hidden');
}

factoryMatrixToggle.addEventListener('click', () => {
  openFactoryMatrixPage(false);
});
opportunityRadarToggle.addEventListener('click', () => {
  openFactoryMatrixPage(true);
});
document.getElementById('factory-matrix-close').addEventListener('click', () => {
  setFactoryMatrixOpen(false);
});
document.getElementById('matrix-return').addEventListener('click', () => {
  setFactoryMatrixOpen(false);
});
document.getElementById('matrix-scan').addEventListener('click', () => {
  clearMatrixStoryTimers();
  state.factoryMatrix.storyMode = false;
  state.factoryMatrix.companyMode = false;
  setActiveMatrixOpportunity(0, { scanned: true });
  setMatrixStoryStep(1, '矩阵扫描完成：发现 126 个撮合机会、7 条高价值供应链');
});
document.getElementById('matrix-highlight').addEventListener('click', () => {
  clearMatrixStoryTimers();
  state.factoryMatrix.storyMode = false;
  const next = (state.factoryMatrix.activeOpportunity + 1) % matrixOpportunities.length;
  state.factoryMatrix.companyMode = false;
  setActiveMatrixOpportunity(next, { scanned: true });
  setMatrixStoryStep(2, `已高亮匹配链：${matrixOpportunities[next].title}`);
});
document.getElementById('matrix-company').addEventListener('click', () => {
  clearMatrixStoryTimers();
  state.factoryMatrix.storyMode = false;
  state.factoryMatrix.scanned = true;
  state.factoryMatrix.companyMode = true;
  setActiveMatrixOpportunity(state.factoryMatrix.activeOpportunity, { scanned: true });
  setMatrixStoryStep(3, `临时公司已生成：${matrixOpportunities[state.factoryMatrix.activeOpportunity].title}`);
});

// ─────────────────────────────────────
// FACTORY LAYOUT EDITOR
// ─────────────────────────────────────
const layoutEditorPanel = document.getElementById('layout-editor-panel');
const layoutEditorToggle = document.getElementById('toggle-layout-editor');
const layoutObjectSearch = document.getElementById('layout-object-search');
const layoutObjectList = document.getElementById('layout-object-list');
const layoutCurrentDetail = document.getElementById('layout-current-detail');
const layoutStatus = document.getElementById('layout-status');
const layoutModeTranslate = document.getElementById('layout-mode-translate');
const layoutModeRotate = document.getElementById('layout-mode-rotate');
const layoutSnapToggle = document.getElementById('layout-snap-toggle');
const layoutAnimationToggle = document.getElementById('toggle-animation');

function cloneTransform(object) {
  return {
    position: {
      x: Number(object.position.x.toFixed(3)),
      y: Number(object.position.y.toFixed(3)),
      z: Number(object.position.z.toFixed(3)),
    },
    rotation: {
      x: Number(object.rotation.x.toFixed(4)),
      y: Number(object.rotation.y.toFixed(4)),
      z: Number(object.rotation.z.toFixed(4)),
    },
  };
}

function applyTransformToObject(object, transform) {
  if (!object || !transform) return;
  const previousPosition = object.position.clone();
  if (transform.position) {
    object.position.set(
      Number(transform.position.x) || 0,
      Number(transform.position.y) || 0,
      Number(transform.position.z) || 0
    );
  }
  if (transform.rotation) {
    object.rotation.set(
      Number(transform.rotation.x) || 0,
      Number(transform.rotation.y) || 0,
      Number(transform.rotation.z) || 0
    );
  }
  object.updateMatrixWorld(true);
  applyLinkedLayoutDelta(object, object.position.clone().sub(previousPosition));
  object.userData.layoutLastPosition = object.position.clone();
}

function applyLinkedLayoutDelta(object, delta) {
  if (!object || !delta || delta.lengthSq() < 0.000001) return;
  if (object.userData?.type !== 'conveyor') return;
  const conveyorName = object.userData.id || object.name;
  state.conveyorTracks.forEach(track => {
    if (track.name !== conveyorName) return;
    track.startX += delta.x;
    track.startZ += delta.z;
    track.trackStartX += delta.x;
    track.trackStartZ += delta.z;
    track.frameY += delta.y;
  });
  state.knowledgeAssets.forEach(asset => {
    if (asset.userData?.trackName !== conveyorName) return;
    asset.position.add(delta);
    asset.userData.trackStartX += delta.x;
    asset.userData.trackStartZ += delta.z;
  });
}

function syncSelectedLayoutDependents() {
  const object = getFactoryObjectById(state.layoutEditor.selectedId);
  if (!object) return;
  const previousPosition = object.userData.layoutLastPosition || object.position.clone();
  const delta = object.position.clone().sub(previousPosition);
  applyLinkedLayoutDelta(object, delta);
  object.userData.layoutLastPosition = object.position.clone();
}

function serializeTransformMap(transformMap) {
  return Object.fromEntries(Array.from(transformMap.entries()).map(([id, transform]) => [id, {
    position: { ...transform.position },
    rotation: { ...transform.rotation },
  }]));
}

function captureDefaultLayoutTransforms() {
  state.layoutEditor.defaultTransforms.clear();
  refreshObjectRegistry().forEach(record => {
    const object = getFactoryObjectById(record.id);
    if (object) state.layoutEditor.defaultTransforms.set(record.id, cloneTransform(object));
  });
}

function readSavedLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== LAYOUT_VERSION || typeof parsed.transforms !== 'object') return null;
    return parsed;
  } catch (error) {
    console.warn('Layout storage read failed:', error);
    return null;
  }
}

function writeSavedLayout(payload) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn('Layout storage write failed:', error);
    return false;
  }
}

function loadSavedLayoutTransforms() {
  const saved = readSavedLayout();
  state.layoutEditor.savedTransforms.clear();
  if (!saved) return 0;
  Object.entries(saved.transforms).forEach(([id, transform]) => {
    if (getFactoryObjectById(id)) state.layoutEditor.savedTransforms.set(id, transform);
  });
  return state.layoutEditor.savedTransforms.size;
}

function applySavedLayout() {
  const count = loadSavedLayoutTransforms();
  state.layoutEditor.savedTransforms.forEach((transform, id) => {
    applyTransformToObject(getFactoryObjectById(id), transform);
  });
  refreshObjectRegistry();
  return count;
}

function isEditableFactoryRecord(record) {
  if (!record) return false;
  if (record.trackingMode !== 'semantic') return false;
  if (!EDITABLE_LEVELS.has(record.level)) return false;
  if (record.type === 'label' || record.labelLayer) return false;
  const object = getFactoryObjectById(record.id);
  return Boolean(object && object.isObject3D && !isCss2DObject(object));
}

function getEditableFactoryRecords() {
  const query = state.layoutEditor.search.trim().toLowerCase();
  return refreshObjectRegistry()
    .filter(isEditableFactoryRecord)
    .filter(record => PRIMARY_LAYOUT_TYPES.has(record.type))
    .filter(record => {
      if (!query) return true;
      return [
        record.id,
        record.name,
        record.module,
        record.type,
        record.level,
        record.businessMeaning,
      ].join(' ').toLowerCase().includes(query);
    });
}

function getEditableRaycastTargets() {
  const targets = [];
  getEditableFactoryRecords().forEach(record => {
    const object = getFactoryObjectById(record.id);
    if (!object) return;
    object.traverse(child => {
      if (child.isMesh && !child.userData?.skipRegistry) targets.push(child);
    });
  });
  return targets;
}

function findEditableAncestor(object) {
  let node = object;
  while (node && node !== scene) {
    const id = node.userData?.factoryObjectId;
    if (id) {
      const record = getFactoryObjectRecord(node);
      if (isEditableFactoryRecord(record)) return node;
    }
    node = node.parent;
  }
  return null;
}

function getEditableObjectFromPointer(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(getEditableRaycastTargets(), false);
  if (!intersects.length) return null;
  return findEditableAncestor(intersects[0].object);
}

function setLayoutStatus(message) {
  state.layoutEditor.status = message;
  if (layoutStatus) layoutStatus.textContent = message;
}

function markLayoutDirty(id) {
  if (!id) return;
  state.layoutEditor.dirtyIds.add(id);
  const object = getFactoryObjectById(id);
  if (object) state.layoutEditor.savedTransforms.set(id, cloneTransform(object));
}

function markTransformControlsRegistrySafe(transformControls) {
  transformControls.traverse?.(child => {
    child.userData = { ...child.userData, skipRegistry: true };
  });
  if (transformControls.userData) transformControls.userData.skipRegistry = true;
}

function ensureLayoutTransformControls() {
  if (state.layoutEditor.transformControls) return state.layoutEditor.transformControls;

  const transformControls = new TransformControls(camera, labelRenderer.domElement);
  transformControls.userData.skipRegistry = true;
  transformControls.setMode(state.layoutEditor.mode);
  transformControls.setSpace('world');
  transformControls.setTranslationSnap(state.layoutEditor.snap ? TRANSLATION_SNAP : null);
  transformControls.setRotationSnap(state.layoutEditor.snap ? ROTATION_SNAP : null);
  transformControls.visible = false;
  markTransformControlsRegistrySafe(transformControls);

  transformControls.addEventListener('dragging-changed', event => {
    state.layoutEditor.dragging = event.value;
    controls.enabled = !event.value;
    if (!event.value && state.layoutEditor.selectedId) {
      markLayoutDirty(state.layoutEditor.selectedId);
      if (!state.layoutEditor.open) showFactoryObjectInfo(getFactoryObjectById(state.layoutEditor.selectedId));
      renderLayoutCurrentDetail();
      setLayoutStatus(`${state.layoutEditor.selectedId} 已更新，保存后刷新仍生效`);
    }
  });
  transformControls.addEventListener('objectChange', () => {
    if (!state.layoutEditor.selectedId) return;
    syncSelectedLayoutDependents();
    markLayoutDirty(state.layoutEditor.selectedId);
    renderLayoutCurrentDetail();
  });

  scene.add(transformControls);
  state.layoutEditor.transformControls = transformControls;
  return transformControls;
}

function setLayoutEditorMode(mode) {
  state.layoutEditor.mode = mode;
  const transformControls = ensureLayoutTransformControls();
  transformControls.setMode(mode);
  layoutModeTranslate.classList.toggle('active', mode === 'translate');
  layoutModeRotate.classList.toggle('active', mode === 'rotate');
}

function setLayoutSnap(enabled) {
  state.layoutEditor.snap = enabled;
  const transformControls = ensureLayoutTransformControls();
  transformControls.setTranslationSnap(enabled ? TRANSLATION_SNAP : null);
  transformControls.setRotationSnap(enabled ? ROTATION_SNAP : null);
  layoutSnapToggle.classList.toggle('active', enabled);
  layoutSnapToggle.textContent = enabled ? '吸附 0.5m / 15°' : '自由拖拽';
}

function selectEditableObject(id, shouldFocus = true) {
  const object = getFactoryObjectById(id);
  if (!object) return false;
  const record = getFactoryObjectRecord(object);
  if (!isEditableFactoryRecord(record)) {
    setLayoutStatus('该对象当前锁定，仅 L1/L2 语义组件可编辑');
    return false;
  }

  ensureLayoutTransformControls().attach(object);
  object.userData.layoutLastPosition = object.position.clone();
  state.layoutEditor.transformControls.visible = true;
  state.layoutEditor.selectedId = id;
  state.selectedFactoryObjectId = id;
  highlightFactoryObject(object);
  if (!state.layoutEditor.open) {
    showFactoryObjectInfo(object);
  } else {
    document.getElementById('object-info-panel').classList.add('hidden');
  }
  if (shouldFocus) animateCameraToObject(object);
  renderLayoutEditor();
  setLayoutStatus(`${record.name} 已选中`);
  return true;
}

function selectEditableObjectFromPointer(event) {
  if (state.layoutEditor.dragging) return;
  const object = getEditableObjectFromPointer(event);
  if (!object) {
    setLayoutStatus('未命中可编排组件');
    return;
  }
  selectEditableObject(object.userData.factoryObjectId, false);
}

function updateLayoutEditorHover(event) {
  if (state.layoutEditor.dragging) return;
  const object = getEditableObjectFromPointer(event);
  const tooltip = document.getElementById('tooltip');
  if (!object) {
    tooltip.classList.add('hidden');
    document.body.style.cursor = 'crosshair';
    return;
  }
  const record = getFactoryObjectRecord(object);
  tooltip.textContent = record.name;
  tooltip.classList.remove('hidden');
  tooltip.style.left = (event.clientX + 18) + 'px';
  tooltip.style.top = (event.clientY - 30) + 'px';
  document.body.style.cursor = 'pointer';
}

function formatLayoutVector(vector, precision = 2) {
  if (!vector) return '(0, 0, 0)';
  return `(${Number(vector.x).toFixed(precision)}, ${Number(vector.y).toFixed(precision)}, ${Number(vector.z).toFixed(precision)})`;
}

function formatRotationDegrees(rotation) {
  if (!rotation) return '(0°, 0°, 0°)';
  return `(${THREE.MathUtils.radToDeg(rotation.x).toFixed(1)}°, ${THREE.MathUtils.radToDeg(rotation.y).toFixed(1)}°, ${THREE.MathUtils.radToDeg(rotation.z).toFixed(1)}°)`;
}

function renderLayoutObjectList() {
  const records = getEditableFactoryRecords();
  if (!records.length) {
    layoutObjectList.innerHTML = '<div class="layout-current-empty">没有匹配的可编排组件。</div>';
    return;
  }
  layoutObjectList.innerHTML = records.map(record => {
    const active = record.id === state.layoutEditor.selectedId ? ' active' : '';
    return `
      <button class="layout-object-btn${active}" type="button" data-layout-object-id="${escapeHtml(record.id)}">
        <span>
          <strong>${escapeHtml(record.name)}</strong>
          <small>${escapeHtml(record.id)}</small>
        </span>
        <em>${escapeHtml(record.type)}</em>
      </button>
    `;
  }).join('');
  layoutObjectList.querySelectorAll('[data-layout-object-id]').forEach(button => {
    button.addEventListener('click', () => selectEditableObject(button.dataset.layoutObjectId));
  });
}

function renderLayoutCurrentDetail() {
  const object = getFactoryObjectById(state.layoutEditor.selectedId);
  if (!object) {
    layoutCurrentDetail.innerHTML = '<div class="layout-current-empty">选择一级模块后，可用方向键式按钮微调位置；需要更多对象请进入组件后台。</div>';
    return;
  }
  const record = getFactoryObjectRecord(object);
  const dirty = state.layoutEditor.dirtyIds.has(record.id) ? '未保存' : '已同步';
  layoutCurrentDetail.innerHTML = `
    <div class="layout-detail-row"><span>对象</span><span>${escapeHtml(record.name)}</span></div>
    <div class="layout-detail-row"><span>ID</span><span>${escapeHtml(record.id)}</span></div>
    <div class="layout-detail-row"><span>模块</span><span>${escapeHtml(record.module)}</span></div>
    <div class="layout-detail-row"><span>类型</span><span>${escapeHtml(record.type)} · ${escapeHtml(record.level)}</span></div>
    <div class="layout-detail-row"><span>位置</span><span>${escapeHtml(formatLayoutVector(object.position))}</span></div>
    <div class="layout-detail-row"><span>旋转</span><span>${escapeHtml(formatRotationDegrees(object.rotation))}</span></div>
    <div class="layout-detail-row"><span>状态</span><span>${dirty}</span></div>
  `;
}

function nudgeSelectedLayoutObject(dx, dz) {
  const object = getFactoryObjectById(state.layoutEditor.selectedId);
  if (!object) {
    setLayoutStatus('先选择一个一级模块');
    return;
  }
  const step = state.layoutEditor.snap ? TRANSLATION_SNAP : 0.2;
  object.position.x += dx * step;
  object.position.z += dz * step;
  object.updateMatrixWorld(true);
  syncSelectedLayoutDependents();
  markLayoutDirty(state.layoutEditor.selectedId);
  highlightFactoryObject(object);
  renderLayoutCurrentDetail();
  setLayoutStatus(`${state.layoutEditor.selectedId} 已微调，保存后刷新仍生效`);
}

function rotateSelectedLayoutObject(direction) {
  const object = getFactoryObjectById(state.layoutEditor.selectedId);
  if (!object) {
    setLayoutStatus('先选择一个一级模块');
    return;
  }
  const step = state.layoutEditor.snap ? ROTATION_SNAP : THREE.MathUtils.degToRad(5);
  object.rotation.y += direction * step;
  object.updateMatrixWorld(true);
  markLayoutDirty(state.layoutEditor.selectedId);
  highlightFactoryObject(object);
  renderLayoutCurrentDetail();
  setLayoutStatus(`${state.layoutEditor.selectedId} 已旋转，保存后刷新仍生效`);
}

function renderLayoutEditor() {
  renderLayoutObjectList();
  renderLayoutCurrentDetail();
  setLayoutEditorMode(state.layoutEditor.mode);
  setLayoutSnap(state.layoutEditor.snap);
  layoutObjectSearch.value = state.layoutEditor.search;
  layoutEditorToggle.classList.toggle('active', state.layoutEditor.open);
  layoutEditorToggle.setAttribute('aria-expanded', state.layoutEditor.open ? 'true' : 'false');
}

function setAnimationButtonState(active) {
  layoutAnimationToggle.classList.toggle('active', active);
  layoutAnimationToggle.querySelector('.ctrl-icon').textContent = active ? '▶' : '⏸';
  layoutAnimationToggle.querySelector('.ctrl-text').textContent = active ? '产线流动' : '产线暂停';
}

function setLayoutEditorOpen(open, options = {}) {
  if (state.layoutEditor.open === open && !options.selectedId) return;
  state.layoutEditor.open = open;
  layoutEditorPanel.classList.toggle('hidden', !open);
  document.body.classList.toggle('layout-editing', open);
  layoutEditorToggle.classList.toggle('active', open);
  layoutEditorToggle.setAttribute('aria-expanded', open ? 'true' : 'false');

  if (open) {
    if (state.executiveTower.open) setExecutiveTowerOpen(false);
    state.layoutEditor.previousAnimationActive = state.animationActive;
    state.layoutEditor.previousCruiseMode = state.cruiseMode;
    state.animationActive = false;
    state.cruiseMode = false;
    controls.enabled = true;
    setAnimationButtonState(false);
    setTextLayerMenuOpen(false);
    setIngestPanelOpen(false);
    setPolicyPanelOpen(false);
    setComponentConsoleOpen(false);
    ensureLayoutTransformControls();
    renderLayoutEditor();
    if (options.selectedId) selectEditableObject(options.selectedId);
    layoutObjectSearch.focus();
    setLayoutStatus(options.selectedId ? '对象已进入编辑模式' : '选择一个可编排组件');
    return;
  }

  const transformControls = state.layoutEditor.transformControls;
  if (transformControls) {
    transformControls.detach();
    transformControls.visible = false;
  }
  controls.enabled = true;
  state.layoutEditor.dragging = false;
  if (state.layoutEditor.previousCruiseMode) {
    state.cruiseMode = true;
    controls.enabled = false;
  } else {
    state.cruiseMode = false;
  }
  state.animationActive = state.layoutEditor.previousAnimationActive;
  setAnimationButtonState(state.animationActive);
  document.getElementById('tooltip').classList.add('hidden');
  document.body.style.cursor = 'default';
}

function saveLayout() {
  if (!state.layoutEditor.dirtyIds.size) {
    setLayoutStatus('没有新的布局变更');
    return;
  }
  state.layoutEditor.dirtyIds.forEach(id => {
    const object = getFactoryObjectById(id);
    if (object) state.layoutEditor.savedTransforms.set(id, cloneTransform(object));
  });
  const payload = {
    version: LAYOUT_VERSION,
    updatedAt: new Date().toISOString(),
    transforms: serializeTransformMap(state.layoutEditor.savedTransforms),
  };
  if (writeSavedLayout(payload)) {
    state.layoutEditor.dirtyIds.clear();
    renderLayoutEditor();
    setLayoutStatus(`已保存 ${state.layoutEditor.savedTransforms.size} 个布局对象`);
  } else {
    setLayoutStatus('保存失败：浏览器本地存储不可用');
  }
}

function resetLayout() {
  try {
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  } catch (error) {
    console.warn('Layout storage reset failed:', error);
  }
  state.layoutEditor.savedTransforms.clear();
  state.layoutEditor.dirtyIds.clear();
  state.layoutEditor.defaultTransforms.forEach((transform, id) => {
    applyTransformToObject(getFactoryObjectById(id), transform);
  });
  if (state.layoutEditor.selectedId) {
    const object = getFactoryObjectById(state.layoutEditor.selectedId);
    if (object) {
      ensureLayoutTransformControls().attach(object);
      highlightFactoryObject(object);
      if (!state.layoutEditor.open) showFactoryObjectInfo(object);
    }
  }
  renderLayoutEditor();
  setLayoutStatus('已恢复默认布局');
}

layoutEditorToggle.addEventListener('click', () => {
  if (state.layoutEditor.open) {
    setWorkbenchMode('run');
  } else {
    setWorkbenchMode('edit');
  }
});
document.getElementById('layout-editor-close').addEventListener('click', () => {
  setWorkbenchMode('run');
});
layoutObjectSearch.addEventListener('input', () => {
  state.layoutEditor.search = layoutObjectSearch.value;
  renderLayoutObjectList();
});
layoutModeTranslate.addEventListener('click', () => setLayoutEditorMode('translate'));
layoutModeRotate.addEventListener('click', () => setLayoutEditorMode('rotate'));
layoutSnapToggle.addEventListener('click', () => setLayoutSnap(!state.layoutEditor.snap));
document.querySelectorAll('[data-layout-nudge]').forEach(button => {
  button.addEventListener('click', () => {
    const [axis, rawDirection] = button.dataset.layoutNudge.split(':');
    const direction = Number(rawDirection);
    nudgeSelectedLayoutObject(axis === 'x' ? direction : 0, axis === 'z' ? direction : 0);
  });
});
document.querySelectorAll('[data-layout-rotate]').forEach(button => {
  button.addEventListener('click', () => rotateSelectedLayoutObject(Number(button.dataset.layoutRotate)));
});
document.getElementById('layout-save').addEventListener('click', saveLayout);
document.getElementById('layout-reset').addEventListener('click', resetLayout);

// ─────────────────────────────────────
// COMPONENT CONSOLE
// ─────────────────────────────────────
const componentConsoleEl = document.getElementById('component-console');
const componentConsoleToggle = document.getElementById('toggle-component-console');
const componentSearchInput = document.getElementById('component-search-input');
const componentLevelFilter = document.getElementById('component-level-filter');
const componentTypeFilter = document.getElementById('component-type-filter');
const componentUnmappedFilter = document.getElementById('component-unmapped-filter');
const componentInteractiveFilter = document.getElementById('component-interactive-filter');
const componentLabelFilter = document.getElementById('component-label-filter');

function filteredComponentRecords() {
  const query = state.componentConsole.search.trim().toLowerCase();
  return refreshObjectRegistry().filter(record => {
    if (state.componentConsole.module !== 'all' && record.module !== state.componentConsole.module) return false;
    if (state.componentConsole.level !== 'all' && record.level !== state.componentConsole.level) return false;
    if (state.componentConsole.type !== 'all' && record.type !== state.componentConsole.type) return false;
    if (state.componentConsole.semanticOnly && record.trackingMode !== 'auto-indexed') return false;
    if (state.componentConsole.interactiveOnly && !record.interactive) return false;
    if (state.componentConsole.labelsOnly && record.type !== 'label' && !record.labelLayer) return false;
    if (!query) return true;
    const searchable = [
      record.id,
      record.name,
      record.module,
      record.type,
      record.level,
      record.sourceFunction,
      record.businessMeaning,
      record.labelLayer,
      record.status,
    ].join(' ').toLowerCase();
    return searchable.includes(query);
  });
}

function renderComponentStats(records = refreshObjectRegistry()) {
  const stats = getRegistryStats(records);
  const statsEl = document.getElementById('component-stats');
  statsEl.innerHTML = [
    ['组件总数', stats.totalTracked],
    ['场景对象数', stats.sceneObjectCount],
    ['语义登记', stats.semantic],
    ['自动发现', stats.autoIndexed],
    ['可交互', stats.interactive],
    ['文字标注', stats.labels],
  ].map(([label, value]) => `
    <div class="component-stat">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join('');
}

function renderComponentModuleList(records = refreshObjectRegistry()) {
  const list = document.getElementById('component-module-list');
  const moduleCounts = records.reduce((acc, record) => {
    acc[record.module] = (acc[record.module] || 0) + 1;
    return acc;
  }, {});
  const modules = ['all', ...componentModules.filter(module => moduleCounts[module])];
  list.innerHTML = modules.map(module => {
    const label = module === 'all' ? '全部对象' : module;
    const count = module === 'all' ? records.length : moduleCounts[module];
    const active = state.componentConsole.module === module ? ' active' : '';
    return `
      <button class="module-nav-btn${active}" type="button" data-module="${escapeHtml(module)}" title="${escapeHtml(componentModuleNotes[module] || '查看该模块下的对象')}">
        <strong>${escapeHtml(label)}</strong>
        <span>${count}</span>
      </button>
    `;
  }).join('');
  list.querySelectorAll('[data-module]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.componentConsole.module = btn.dataset.module;
      renderComponentConsole();
    });
  });
}

function renderComponentTypeOptions(records = refreshObjectRegistry()) {
  const types = Array.from(new Set(records.map(record => record.type))).sort();
  const current = state.componentConsole.type;
  componentTypeFilter.innerHTML = '<option value="all">全部类型</option>' + types.map(type => (
    `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`
  )).join('');
  componentTypeFilter.value = types.includes(current) ? current : 'all';
  state.componentConsole.type = componentTypeFilter.value;
}

function renderComponentRows(records) {
  const tbody = document.getElementById('component-object-list');
  if (!records.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="component-empty">没有匹配的对象。调整搜索词或筛选条件后重试。</div>
        </td>
      </tr>
    `;
    return;
  }
  tbody.innerHTML = records.map(record => {
    const active = record.id === state.componentConsole.selectedId ? ' active' : '';
    const trackingClass = record.trackingMode === 'semantic' ? 'semantic' : 'auto-indexed';
    return `
      <tr class="component-row${active}" data-object-id="${escapeHtml(record.id)}">
        <td class="component-name-cell">
          <strong>${escapeHtml(record.name)}</strong>
          <span>${escapeHtml(record.id)}</span>
        </td>
        <td>${escapeHtml(record.module)}</td>
        <td><span class="component-pill ${trackingClass}">${escapeHtml(record.type)}</span></td>
        <td>${escapeHtml(record.level)}</td>
        <td>${escapeHtml(record.status)}</td>
        <td class="component-muted">${escapeHtml(formatPosition(record.position))}</td>
      </tr>
    `;
  }).join('');
  tbody.querySelectorAll('[data-object-id]').forEach(row => {
    row.addEventListener('click', () => {
      state.componentConsole.selectedId = row.dataset.objectId;
      renderComponentConsole();
    });
  });
}

function renderComponentDetail(record) {
  const detail = document.getElementById('component-detail-content');
  if (!record) {
    detail.innerHTML = '<div class="component-empty">选择左侧对象后查看完整追踪信息。</div>';
    return;
  }
  const trackingClass = record.trackingMode === 'semantic' ? 'semantic' : 'auto-indexed';
  const editable = isEditableFactoryRecord(record);
  detail.innerHTML = `
    <div class="component-detail-title">
      <strong>${escapeHtml(record.name)}</strong>
      <span>${escapeHtml(record.id)}</span>
    </div>
    <div class="component-detail-grid">
      <div class="component-detail-row"><span>模块</span><span>${escapeHtml(record.module)}</span></div>
      <div class="component-detail-row"><span>类型</span><span><span class="component-pill ${trackingClass}">${escapeHtml(record.type)}</span></span></div>
      <div class="component-detail-row"><span>层级</span><span>${escapeHtml(record.level)}</span></div>
      <div class="component-detail-row"><span>追踪</span><span>${escapeHtml(record.trackingMode)}</span></div>
      <div class="component-detail-row"><span>业务含义</span><span>${escapeHtml(record.businessMeaning)}</span></div>
      <div class="component-detail-row"><span>代码来源</span><span>${escapeHtml(record.sourceFunction)}</span></div>
      <div class="component-detail-row"><span>位置</span><span>${escapeHtml(formatPosition(record.position))}</span></div>
      <div class="component-detail-row"><span>旋转</span><span>${escapeHtml(formatPosition(record.rotation))}</span></div>
      <div class="component-detail-row"><span>父级</span><span>${escapeHtml(record.parentId || '无')}</span></div>
      <div class="component-detail-row"><span>子对象</span><span>${record.childCount}</span></div>
      <div class="component-detail-row"><span>可见</span><span>${yesNo(record.visible)}</span></div>
      <div class="component-detail-row"><span>可交互</span><span>${yesNo(record.interactive)}</span></div>
      <div class="component-detail-row"><span>标注层</span><span>${escapeHtml(record.labelLayer || '无')}</span></div>
      <div class="component-detail-row"><span>对象类</span><span>${escapeHtml(record.objectClass)}</span></div>
    </div>
    <div class="component-detail-actions">
      <button id="component-focus-object" class="console-btn primary" type="button">定位到 3D</button>
      ${editable ? '<button id="component-edit-object" class="console-btn primary" type="button">编辑此对象</button>' : ''}
      <button id="component-copy-id" class="console-btn" type="button">复制 ID</button>
    </div>
  `;
  document.getElementById('component-focus-object').addEventListener('click', () => {
    setComponentConsoleOpen(false);
    focusFactoryObject(record.id);
  });
  if (editable) {
    document.getElementById('component-edit-object').addEventListener('click', () => {
      setComponentConsoleOpen(false);
      setLayoutEditorOpen(true, { selectedId: record.id });
    });
  }
  document.getElementById('component-copy-id').addEventListener('click', () => copyText(record.id));
}

function renderComponentConsole() {
  indexSceneObjects();
  const allRecords = refreshObjectRegistry();
  renderComponentStats(allRecords);
  renderComponentModuleList(allRecords);
  renderComponentTypeOptions(allRecords);
  const records = filteredComponentRecords();
  if (!records.some(record => record.id === state.componentConsole.selectedId)) {
    state.componentConsole.selectedId = records[0]?.id || null;
  }
  renderComponentRows(records);
  const selected = records.find(record => record.id === state.componentConsole.selectedId)
    || allRecords.find(record => record.id === state.componentConsole.selectedId);
  renderComponentDetail(selected);
}

function setComponentConsoleOpen(open) {
  state.componentConsole.open = open;
  componentConsoleEl.classList.toggle('hidden', !open);
  componentConsoleToggle.classList.toggle('active', open);
  componentConsoleToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    if (state.executiveTower.open) setExecutiveTowerOpen(false);
    if (state.layoutEditor.open) setWorkbenchMode('inspect');
    setTextLayerMenuOpen(false);
    setIngestPanelOpen(false);
    setPolicyPanelOpen(false);
    renderComponentConsole();
    componentSearchInput.focus();
  }
}

function copyText(value) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).catch(() => fallbackCopyText(value));
  } else {
    fallbackCopyText(value);
  }
}

function fallbackCopyText(value) {
  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  textArea.remove();
}

function exportComponentRegistry() {
  const records = refreshObjectRegistry();
  const payload = {
    exportedAt: new Date().toISOString(),
    product: 'AI KNOWLEDGE FACTORY OS v1.2',
    stats: getRegistryStats(records),
    records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `ai-knowledge-factory-object-registry-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

componentConsoleToggle.addEventListener('click', () => {
  setComponentConsoleOpen(!state.componentConsole.open);
});
document.getElementById('component-console-close').addEventListener('click', () => {
  setComponentConsoleOpen(false);
});
document.getElementById('component-export-json').addEventListener('click', exportComponentRegistry);
componentSearchInput.addEventListener('input', () => {
  state.componentConsole.search = componentSearchInput.value;
  renderComponentConsole();
});
componentLevelFilter.addEventListener('change', () => {
  state.componentConsole.level = componentLevelFilter.value;
  renderComponentConsole();
});
componentTypeFilter.addEventListener('change', () => {
  state.componentConsole.type = componentTypeFilter.value;
  renderComponentConsole();
});
componentUnmappedFilter.addEventListener('change', () => {
  state.componentConsole.semanticOnly = componentUnmappedFilter.checked;
  renderComponentConsole();
});
componentInteractiveFilter.addEventListener('change', () => {
  state.componentConsole.interactiveOnly = componentInteractiveFilter.checked;
  renderComponentConsole();
});
componentLabelFilter.addEventListener('change', () => {
  state.componentConsole.labelsOnly = componentLabelFilter.checked;
  renderComponentConsole();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (state.executiveTower.open) setExecutiveTowerOpen(false);
    if (state.factoryMatrix.open) setFactoryMatrixOpen(false);
    if (state.factoryNetwork.open) setFactoryNetworkOpen(false);
    if (state.layoutEditor.open) setWorkbenchMode('run');
    setTextLayerMenuOpen(false);
    setPolicyPanelOpen(false);
    setIngestPanelOpen(false);
  }
});

applyTextLayerVisibility();
updateVisualToggleButtons();

// ─────────────────────────────────────
// UI: CLOCK & FPS & UPDATES
// ─────────────────────────────────────
function statusClass(status) {
  if (status === 'blocked' || status === 'critical') return 'status-blocked';
  if (status === 'idle' || status === 'pending' || status === 'warn') return 'status-pending';
  return 'status-running';
}

function lifecycleStatusClass(asset) {
  if (asset.userData.lifecycleKey === 'blocked') return 'status-blocked';
  if (asset.userData.lifecycleKey === 'queued' || asset.userData.lifecycleKey === 'qa') return 'status-pending';
  return 'status-running';
}

function renderOpsCounters() {
  const ops = state.ops;
  document.getElementById('cycle-counter').textContent = `#${ops.cycle}`;
  document.getElementById('heartbeat-counter').textContent = `${ops.heartbeatOnline}/${ops.heartbeatTotal}`;
  document.getElementById('backlog-counter').textContent = ops.backlog.toString();
  document.getElementById('blocked-counter').textContent = ops.blockedTasks.toString();
  document.getElementById('outputs-counter').textContent = ops.outputsToday.toString();

  document.getElementById('metric-orders').textContent = ops.backlog.toString();
  document.getElementById('metric-robots').innerHTML = `${ops.activeJobs}<span class="metric-unit">项</span>`;
  document.getElementById('metric-sort').innerHTML = `${ops.outputsToday}<span class="metric-unit">项</span>`;
  document.getElementById('metric-capacity').textContent = ops.blockedTasks.toString();
  document.getElementById('metric-temp').textContent = ops.interventionRequests.toString();
  document.getElementById('metric-alerts').innerHTML = `${Math.round(ops.agentLoad)}<span class="metric-unit">%</span>`;
}

function renderLiveQueue() {
  const queue = state.knowledgeAssets.slice(0, 5).map(asset => {
    const ud = asset.userData;
    return `
      <div class="task-item ${lifecycleStatusClass(asset)}${ud.userCreated ? ' user-created' : ''}" data-asset-id="${ud.id}">
        <div class="task-status-dot"></div>
        <div class="task-body">
          <div class="task-name">${escapeHtml(ud.id)} · ${escapeHtml(ud.title)}</div>
          <div class="task-detail">${escapeHtml(ud.lifecycleLabel)} · ${escapeHtml(ud.assignedAgent)} · ${escapeHtml(ud.target)}</div>
        </div>
        <div class="task-score">${ud.confidence}%</div>
      </div>
    `;
  }).join('');
  const queueEl = document.getElementById('task-queue');
  queueEl.innerHTML = queue;
  queueEl.querySelectorAll('[data-asset-id]').forEach(item => {
    item.addEventListener('click', () => {
      const asset = state.knowledgeAssets.find(a => a.userData.id === item.dataset.assetId);
      if (asset) showKnowledgeAssetPanel(asset);
    });
  });
}

function renderAgentFleet() {
  const fleet = state.agents.slice(0, 6).map(agent => `
    <div class="agent-card ${statusClass(agent.status)}">
      <div class="agent-card-head">
        <span>${agent.role}</span>
        <strong>${agent.load}%</strong>
      </div>
      <div class="agent-detail">${agent.task}</div>
      <div class="agent-bar"><span style="width:${agent.load}%"></span></div>
      <div class="agent-meta">
        <span>${agent.id} · ${agent.status === 'blocked' ? '需介入' : agent.status === 'idle' ? '待命' : '运行中'}</span>
        <span>${agent.success}% OK</span>
      </div>
      <div class="agent-output">${agent.output}</div>
    </div>
  `).join('');
  document.getElementById('agent-fleet').innerHTML = fleet;
}

function renderOutputs() {
  const outputs = state.outputs.map(output => `
    <div class="push-item push-${output.type.toLowerCase()}">
      <div class="push-name"><span class="output-type">${escapeHtml(output.type)}</span>${escapeHtml(output.name)}</div>
      <div class="push-detail">${escapeHtml(output.detail)}</div>
    </div>
  `).join('');
  document.getElementById('push-panel').innerHTML = outputs;
}

function renderAlerts() {
  const alerts = state.alerts.map(alert => `
    <div class="alert-item alert-${alert.severity}">
      <div class="alert-indicator"></div>
      <div class="alert-body">
        <div class="alert-name">${alert.name}</div>
        <div class="alert-time">${alert.detail} · ${alert.owner}</div>
        <button class="alert-action" type="button">${alert.action}</button>
      </div>
    </div>
  `).join('');
  document.getElementById('alert-panel').innerHTML = alerts;
}

function renderOpsPanels() {
  renderOpsCounters();
  renderLiveQueue();
  renderAgentFleet();
  renderOutputs();
  renderAlerts();
}

function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toTimeString().split(' ')[0];
}

function updateFPS(dt) {
  state.fpsFrames++;
  state.fpsTime += dt;
  if (state.fpsTime >= 1) {
    document.getElementById('fps-counter').textContent = Math.round(state.fpsFrames / state.fpsTime);
    state.fpsFrames = 0;
    state.fpsTime = 0;
  }

  // Random latency jitter
  if (Math.random() < 0.1) {
    document.getElementById('latency-counter').textContent = (10 + Math.random() * 8).toFixed(0) + 'ms';
  }
}

function updateUptime() {
  const elapsed = Math.floor((Date.now() - state.startTime) / 3600000);
  document.getElementById('uptime-counter').textContent = elapsed + 'h';
}

// Autonomous ops wobble — make 7*24 operations feel alive
function updateOpsWobble(t) {
  if (t - state.ops.lastRender < 1.4) return;
  state.ops.lastRender = t;

  const avgLoad = state.agents.reduce((sum, agent) => sum + agent.load, 0) / state.agents.length;
  state.ops.agentLoad = THREE.MathUtils.clamp(avgLoad + (Math.random() - 0.5) * 4, 52, 88);
  state.ops.backlog = THREE.MathUtils.clamp(state.ops.backlog + Math.floor((Math.random() - 0.38) * 3), 32, 58);
  state.ops.activeJobs = THREE.MathUtils.clamp(state.ops.activeJobs + Math.floor((Math.random() - 0.45) * 2), 15, 26);
  state.ops.outputsToday = THREE.MathUtils.clamp(state.ops.outputsToday + (Math.random() < 0.18 ? 1 : 0), 18, 36);
  state.ops.blockedTasks = state.alerts.filter(alert => alert.severity === 'critical').length + (Math.random() < 0.28 ? 2 : 1);
  state.ops.interventionRequests = THREE.MathUtils.clamp(state.ops.blockedTasks - 1, 1, 4);
  if (Math.random() < 0.22) state.ops.cycle += 1;

  state.agents.forEach(agent => {
    const drift = agent.status === 'blocked' ? 2 : (Math.random() - 0.45) * 5;
    agent.load = Math.round(THREE.MathUtils.clamp(agent.load + drift, 28, agent.status === 'blocked' ? 94 : 86));
  });

  renderOpsPanels();
}

// ─────────────────────────────────────
// RENDER LOOP
// ─────────────────────────────────────
function animate(timestamp) {
  requestAnimationFrame(animate);

  const dt = Math.min(state.clock.getDelta(), 0.1);
  const t = timestamp * 0.001;

  // Update controls (when not in cruise)
  if (!state.cruiseMode) {
    controls.update();
  }

  // Animation systems
  animateRobots(dt);
  animateConveyors(t, dt);
  animateLights(t);
  animateTwinFactoryEvolution(t, dt);
  animateFactoryNetwork(t, dt);
  animateFactoryMatrix(t, dt);
  updateExecutiveTowerInterior(t, dt);
  animateCruise(t);
  if (state.selectionHelper) state.selectionHelper.update();

  // Render
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);

  // UI updates (throttled)
  updateFPS(dt);
  updateOpsWobble(t);
}

// ─────────────────────────────────────
// RESIZE HANDLER
// ─────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ─────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────
window.addEventListener('keydown', (e) => {
  const targetTag = e.target?.tagName?.toLowerCase();
  const isTyping = ['input', 'textarea', 'select'].includes(targetTag);
  if (state.executiveTower.open) {
    if (e.key === 'Escape') setExecutiveTowerOpen(false);
    return;
  }
  if (state.componentConsole.open) {
    if (e.key === 'Escape') setComponentConsoleOpen(false);
    return;
  }
  if (state.layoutEditor.open) {
    if (e.key === 'Escape') setWorkbenchMode('run');
    if (isTyping) return;
    if (e.key.toLowerCase() === 'g') setLayoutEditorMode('translate');
    if (e.key.toLowerCase() === 'r') setLayoutEditorMode('rotate');
    return;
  }
  if (state.factoryNetwork.open && e.key === 'Escape') {
    setFactoryNetworkOpen(false);
    return;
  }
  if (state.factoryMatrix.open && e.key === 'Escape') {
    setFactoryMatrixOpen(false);
    return;
  }
  if (isTyping) return;
  switch (e.key.toLowerCase()) {
    case '1': setCameraView('free'); break;
    case '2': setCameraView('overview'); break;
    case '3': setCameraView('intake'); break;
    case '4': setCameraView('quality'); break;
    case '5': setCameraView('refinery'); break;
    case '6': setCameraView('assets'); break;
    case '7': setCameraView('output'); break;
    case '8': setCameraView('evolve'); break;
    case '9': setCameraView('cruise'); break;
    case ' ':
      e.preventDefault();
      document.getElementById('toggle-animation').click();
      break;
    case 'l':
      document.getElementById('toggle-labels').click();
      break;
    case 'f':
      setCameraView('free');
      break;
    case 'n':
      setFactoryNetworkOpen(!state.factoryNetwork.open);
      break;
    case 't':
      setExecutiveTowerOpen(true);
      break;
    case 'm':
      openFactoryMatrixPage(false);
      break;
    default: break;
  }
});

// ─────────────────────────────────────
// LAUNCH
// ─────────────────────────────────────
function simulateLoading(callback) {
  const loadingScreen = document.getElementById('loading-screen');
  const pctEl = document.getElementById('loading-pct');
  const detailEl = document.getElementById('loading-detail');
  const barFill = document.querySelector('.loading-bar-fill');

  const steps = [
    { pct: 15, msg: 'Initializing knowledge-twin renderer...' },
    { pct: 30, msg: 'Loading semantic asset materials...' },
    { pct: 45, msg: 'Constructing knowledge factory geometry...' },
    { pct: 60, msg: 'Building knowledge asset racks...' },
    { pct: 75, msg: 'Deploying AI Agent worker fleet...' },
    { pct: 88, msg: 'Calibrating semantic pipeline network...' },
    { pct: 96, msg: 'Establishing knowledge twin link...' },
    { pct: 100, msg: 'SYSTEM READY' },
  ];

  let stepIndex = 0;
  const advance = () => {
    if (stepIndex >= steps.length) {
      setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        setTimeout(callback, 600);
      }, 300);
      return;
    }
    const step = steps[stepIndex];
    pctEl.textContent = step.pct;
    detailEl.textContent = step.msg;
    barFill.style.width = step.pct + '%';
    stepIndex++;
    setTimeout(advance, 200 + Math.random() * 250);
  };
  advance();
}

function renderInitialFrame() {
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

// Build scene then show
buildScene();
indexSceneObjects();
captureDefaultLayoutTransforms();
const appliedLayoutCount = applySavedLayout();
applyVisualTheme();
renderOpsPanels();
setWorkbenchMode('run');
renderInitialFrame();

window.knowledgeFactoryDebug = {
  get registry() { return refreshObjectRegistry(); },
  get stats() { return getRegistryStats(); },
  get layoutEditor() { return state.layoutEditor; },
  focusFactoryObject,
  indexSceneObjects,
  setFactoryNetworkOpen,
  setFactoryMatrixOpen,
  setExecutiveTowerOpen,
  setLayoutEditorOpen,
  selectEditableObject,
  saveLayout,
  resetLayout,
};

simulateLoading(() => {
  // Start render loop
  requestAnimationFrame(animate);

  if (PAGE_PARAMS.get('tower') === '1' || PAGE_PARAMS.get('view') === 'tower') {
    setTimeout(() => setExecutiveTowerOpen(true), 120);
  }

  if (FACTORY_SHOWCASE_MODE && window.parent !== window) {
    window.parent.postMessage({
      type: 'factory-showcase-ready',
      version: FACTORY_SHOWCASE_VERSION,
    }, window.location.origin);
  }

  // Start clock updates
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateUptime, 30000);
});

console.log('%c⬡ AI KNOWLEDGE FACTORY OS v1.2 %cAUTONOMOUS OPS ACTIVE',
  'color: #3cc8ff; font-size: 16px; font-weight: bold;',
  'color: #8896a8;');
console.log('%cControls: Mouse drag=rotate | Scroll=zoom | Click object=info | 1-9=camera presets | Space=toggle animation',
  'color: #556070; font-size: 11px;');
console.log('%cObject Registry:', 'color:#3ee898;', getRegistryStats());
if (appliedLayoutCount) {
  console.log('%cLayout Editor:', 'color:#3cc8ff;', `Applied ${appliedLayoutCount} saved transforms`);
}
