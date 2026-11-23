const versions = {
  original: {
    key: 'Original Factory',
    title: 'Original · 原始结构',
    status: '原始基线 · 结构锁定',
    copy: '直接打开原始工厂结构，作为所有后续视觉版本的固定基线。',
  },
  '1.1': {
    key: 'Factory v1.1',
    title: 'v1.1 · 协议生产闭环',
    status: '当前可运行版本',
    copy: '新增接收码头、决策上行、生产主线、QA 回工和知识回流。',
  },
  '1.2': {
    key: 'Factory v1.2',
    title: 'v1.2 · 主场景提炼',
    status: '独立 3D 主界面 · 可运行',
    copy: '完整工厂独立为主场景，保留建筑、流水线与动效，提供四种视角及标注开关。',
  },
  '1.3': {
    key: 'Factory v1.3',
    title: 'v1.3 · 地标与灯光',
    status: '版本槽位已建立',
    copy: '当前继承 v1.1。计划强化中控塔、码头识别、夜间灯光和截图传播效果。',
  },
  '1.4': {
    key: 'Factory v1.4',
    title: 'v1.4 · 最终主视觉',
    status: '版本槽位已建立',
    copy: '当前继承 v1.1。用于汇总前几轮有效改动，形成最终可演示的单工厂主视觉。',
  },
};

const frame = document.getElementById('factory-stage-frame');
const loading = document.getElementById('stage-loading');
const loadingTitle = document.getElementById('stage-loading-title');
const versionTitle = document.getElementById('selected-version-title');
const versionCopy = document.getElementById('selected-version-copy');
const versionKey = document.getElementById('selected-version-key');
const versionStatus = document.getElementById('selected-version-status');
const reloadButton = document.getElementById('reload-version');
const standaloneLink = document.getElementById('open-scene');
const versionButtons = [...document.querySelectorAll('[data-version]')];

const queryVersion = new URLSearchParams(window.location.search).get('version');
let activeVersion = versions[queryVersion] ? queryVersion : '1.1';
let slowLoadTimer = null;

function buildStageUrl(version, reloadToken = '') {
  const url = new URL(version === '1.2' ? 'factory-scene.html' : 'index.html', window.location.href);
  if (version === '1.2') {
    url.searchParams.set('embedded', '1');
  } else {
    url.searchParams.set('showcase', '1');
    url.searchParams.set('solo', '1');
  }
  url.searchParams.set('version', version);
  if (reloadToken) url.searchParams.set('reload', reloadToken);
  return url.toString();
}

function setLoading(version) {
  clearTimeout(slowLoadTimer);
  loading.classList.remove('ready');
  loadingTitle.textContent = `正在装载 ${version === 'original' ? 'Original' : `v${version}`}`;
  slowLoadTimer = window.setTimeout(() => {
    loadingTitle.textContent = '3D 场景仍在构建，请稍候';
  }, 9000);
}

function applyVersionUI(version) {
  const meta = versions[version];
  versionButtons.forEach(button => {
    const isActive = button.dataset.version === version;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  versionTitle.textContent = meta.title;
  versionCopy.textContent = meta.copy;
  versionKey.textContent = meta.key;
  versionStatus.textContent = meta.status;
  document.body.dataset.activeVersion = version;
  standaloneLink.hidden = version !== '1.2';
}

function selectVersion(version, options = {}) {
  if (!versions[version]) return;
  const shouldReload = options.force || version !== activeVersion;
  activeVersion = version;
  applyVersionUI(version);

  const pageUrl = new URL(window.location.href);
  pageUrl.searchParams.set('version', version);
  window.history.replaceState({}, '', pageUrl);

  if (shouldReload) {
    setLoading(version);
    frame.src = buildStageUrl(version, options.reset ? String(Date.now()) : '');
  }
}

versionButtons.forEach(button => {
  button.addEventListener('click', () => selectVersion(button.dataset.version));
});

reloadButton.addEventListener('click', () => {
  selectVersion(activeVersion, { force: true, reset: true });
});

frame.addEventListener('load', () => {
  if (!loading.classList.contains('ready')) {
    loadingTitle.textContent = '正在构建单工厂 3D 空间';
  }
});

window.addEventListener('message', event => {
  if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type === 'factory-showcase-error' && event.data.version === activeVersion) {
    clearTimeout(slowLoadTimer);
    loadingTitle.textContent = event.data.message;
    return;
  }
  if (event.data?.type !== 'factory-showcase-ready') return;
  if (event.data.version !== activeVersion) return;
  clearTimeout(slowLoadTimer);
  loading.classList.add('ready');
});

applyVersionUI(activeVersion);
if (activeVersion !== '1.1') {
  setLoading(activeVersion);
  frame.src = buildStageUrl(activeVersion);
} else {
  setLoading(activeVersion);
}
