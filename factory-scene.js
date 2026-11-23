const container = document.getElementById('factory-scene-stage');
const canvas = document.getElementById('factory-scene-canvas');
const loading = document.getElementById('scene-loading');
const loadingStatus = document.getElementById('scene-loading-status');
const errorMessage = document.getElementById('scene-error');
const status = document.getElementById('scene-status');
const viewButtons = [...document.querySelectorAll('[data-scene-view]')];
const actionButtons = [...document.querySelectorAll('[data-scene-action]')];
const labelsButton = document.querySelector('[data-scene-action="labels"]');
const motionButton = document.querySelector('[data-scene-action="motion"]');
const viewNames = { overview: '工厂全景', top: '工厂俯视', tower: '中控塔', line: '生产流水线', free: '自由视角' };
let currentView = 'overview';
let scene;

document.body.classList.toggle('embedded', new URLSearchParams(location.search).get('embedded') === '1');
viewButtons.concat(actionButtons).forEach(button => { button.disabled = true; });

function updateStatus() {
  status.textContent = `${viewNames[currentView]} · ${scene?.motionEnabled ? '动效运行中' : '动效已暂停'}`;
}

function onViewChange(view) {
  currentView = view;
  viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sceneView === view)));
  updateStatus();
}

function notifyParent(type, extra = {}) {
  if (window.parent !== window) window.parent.postMessage({ type, version: '1.2', ...extra }, location.origin);
}

try {
  const { createFactoryScene } = await import('./factory-scene-engine.js');
  scene = createFactoryScene({ canvas, container, onViewChange });
  viewButtons.forEach(button => button.addEventListener('click', () => scene.setView(button.dataset.sceneView)));
  labelsButton.addEventListener('click', () => {
    const visible = scene.setLabels(labelsButton.getAttribute('aria-pressed') !== 'true');
    labelsButton.setAttribute('aria-pressed', String(visible));
  });
  motionButton.setAttribute('aria-pressed', String(scene.motionEnabled));
  motionButton.addEventListener('click', () => {
    motionButton.setAttribute('aria-pressed', String(scene.setMotion(!scene.motionEnabled)));
    updateStatus();
  });
  document.querySelector('[data-scene-action="reset"]').addEventListener('click', () => scene.setView('overview'));
  viewButtons.concat(actionButtons).forEach(button => { button.disabled = false; });
  updateStatus();
  loading.hidden = true;
  container.dataset.ready = 'true';
  notifyParent('factory-showcase-ready');
  window.addEventListener('pagehide', event => { if (!event.persisted) scene.dispose(); }, { once: true });
} catch (error) {
  loadingStatus.textContent = '工厂场景暂时无法打开';
  errorMessage.textContent = `请检查网络和浏览器的 3D 支持后刷新。${error.message ? `（${error.message}）` : ''}`;
  errorMessage.hidden = false;
  status.textContent = '场景加载失败';
  container.dataset.ready = 'error';
  notifyParent('factory-showcase-error', { message: '工厂场景加载失败，请全屏打开查看详情或刷新重试。' });
  console.error('Factory scene initialization failed:', error);
}
