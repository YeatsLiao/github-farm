import { drawFarm, drawAssetPreview, hitTestCrop, STAGE_NAMES, WORLD } from '/src/living-farm.js';
import { ART_CATALOG, ART_BY_ID, RESIDENT_TYPES } from '/src/art-catalog.js';
import { FARM_ZONES, createFarmObjects, hitTestObject, moveFarmObject } from '/src/farm-objects.js';

const $ = id => document.getElementById(id);
const canvas = $('farm'), ctx = canvas.getContext('2d');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
let assets, scene, seconds = 0, evening = false, paused = motion.matches;
let selectedId = null, profile = 'medium', requestId = 0, controller;
let frameId = null, lastFrame = 0, renderBudget = 0;
let selectedObjectId = null, editing = false, undoLayouts = [];

function message(text = '') { $('message').textContent = text; $('message').hidden = !text; }
async function json(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '请求失败，请稍后重试');
  return result;
}
function image(url) {
  return new Promise((resolve, reject) => {
    const value = new Image();
    value.onload = () => resolve(value);
    value.onerror = () => reject(new Error('素材加载失败，请刷新页面重试'));
    value.src = url;
  });
}
function paint() {
  if (assets && scene) drawFarm(ctx, assets, scene, seconds, { evening, selectedId, selectedObjectId, editing });
}
function animate(now) {
  frameId = null;
  if (paused || document.hidden) { lastFrame = 0; renderBudget = 0; return; }
  if (!lastFrame) lastFrame = now;
  const elapsed = Math.min(now - lastFrame, 100);
  lastFrame = now;
  seconds += elapsed / 1000;
  renderBudget += elapsed;
  // 保留刷新间隔的余数，避免60Hz微小抖动使30fps节流退化为20fps。
  if (renderBudget >= 1000 / 30) {
    renderBudget %= 1000 / 30;
    paint();
  }
  frameId = requestAnimationFrame(animate);
}
function resumeLoop() {
  if (!paused && !document.hidden && frameId === null && assets && scene) frameId = requestAnimationFrame(animate);
}
function updatePause() {
  $('pause').textContent = paused ? '▶' : 'Ⅱ';
  $('pause').setAttribute('aria-label', paused ? '继续动画' : '暂停动画');
  $('pause').title = paused ? '继续动画' : '暂停动画';
  $('pause').setAttribute('aria-pressed', String(paused));
  if (frameId !== null) cancelAnimationFrame(frameId);
  frameId = null; lastFrame = 0; renderBudget = 0;
  paint(); resumeLoop();
}
function markCatalog(type) {
  for (const button of document.querySelectorAll('[data-art]')) button.setAttribute('aria-pressed', String(button.dataset.art === type));
}
function selectCrop(crop) {
  selectedObjectId = null;
  selectedId = crop?.id || null;
  markCatalog(crop?.cropType);
  $('crop-title').textContent = crop ? `${ART_BY_ID[crop.cropType]?.name || '作物'} · ${crop.total} 次贡献 · ${crop.stage < 0 ? '休耕' : STAGE_NAMES[crop.stage]}` : '每一簇，都有来处。';
  $('crop-detail').textContent = crop ? `${crop.id} 至 ${crop.end}。${crop.total ? '这簇作物记录这一周的耕耘。' : '这一周没有贡献，让土地歇一会儿。'}` : '点选田里的作物，查看对应日期、贡献量与生长阶段。';
  paint();
}
function showScene(next, resetLayout = true) {
  scene = next;
  if (resetLayout) { selectedId = null; selectedObjectId = null; undoLayouts = []; }
  if (!scene.objects) scene.objects = createFarmObjects(scene);
  $('farm-name').textContent = `${scene.username} 的农场`;
  $('source-badge').textContent = scene.source === 'demo' ? '演示' : 'GitHub';
  $('total').textContent = scene.total.toLocaleString('zh-CN');
  $('weeks').textContent = scene.crops.length;
  $('chickens').textContent = scene.chickens.length;
  $('ripe').textContent = scene.crops.filter(c => c.stage === 4).length;
  $('period').textContent = scene.period;
  $('demo-controls').hidden = scene.source !== 'demo';
  for (const button of document.querySelectorAll('[data-profile]')) button.setAttribute('aria-pressed', String(button.dataset.profile === profile));
  $('download').disabled = false;
  $('edit-layout').disabled = false; $('reset-layout').disabled = false;
  $('undo-layout').disabled = !undoLayouts.length;
  if (resetLayout) {
    selectCrop(null);
    $('layout-status').textContent = editing ? '先选中物件，再在所属区域内放置；方向键微调。' : '物件按住宅、畜牧、种植、池塘与林地分区布置。';
  }
  paint(); resumeLoop();
}
function selectObject(entity) {
  selectedId = null; selectedObjectId = entity?.id || null;
  if (!entity) { selectCrop(null); return; }
  const art = ART_BY_ID[entity.type]; markCatalog(art.id);
  $('crop-title').textContent = `${art.name} · ${art.category}`;
  const source = entity.language ? `语言点缀：${entity.language}。` : entity.ambient ? '常驻环境，不代表贡献数量。' : '由贡献统计带来的点缀，移动不会改变数据。';
  const zone = FARM_ZONES[entity.zone]?.name || '农场';
  const movable = art.movable && !entity.fixed;
  const behavior = { farmer: '沿四块田外的小径巡视，停下查看农田。', gardener: '沿水岸花带走动，停下来浇花。',
    angler: '在木平台上散步、持竿观鱼。', keeper: '在院门附近照料小鸡，撒下少许饲料。', villager: '从小院走上木桥，停下欣赏溪流。',
    pond: '水湾、溪流与池湾相连；岸线固定，鱼和花叶始终留在水里。', bridge: '跨溪木桥固定；居民从桥面通行，水流经过桥下。',
    deck: '岸边钓鱼平台固定，不可用作布置空地。', hedge: '固定田埂树篱，保护农田和通路。' };
  $('crop-detail').textContent = `${zone}。` + source + (behavior[art.id] || (movable ? '可在所属区域内调整位置，需避开通路与活动范围。' : '当前为固定景观、设施或自动活动角色。'));
  if (editing) $('layout-status').textContent = movable ? `已选中${art.name}，请在${zone}内放置；方向键每次移动4像素，Esc取消。` : `${art.name}固定，不支持移动。`;
  paint();
}
function buildCatalog() {
  const grid = $('asset-grid'); grid.replaceChildren();
  $('catalog-count').textContent = `${ART_CATALOG.length} 种 · ${RESIDENT_TYPES.length}位居民 · 点击查看`;
  grid.setAttribute('aria-label', `${ART_CATALOG.length}种农场素材`);
  for (const art of ART_CATALOG) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.art = art.id;
    button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-label', `${art.category}：${art.name}`);
    const thumb = document.createElement('canvas'); thumb.width = 128; thumb.height = 128; thumb.setAttribute('aria-hidden', 'true');
    drawAssetPreview(thumb.getContext('2d'), assets, art);
    const label = document.createElement('span'); label.textContent = art.name; button.append(thumb, label);
    button.addEventListener('click', () => {
      if (!scene) return;
      const entity = scene.objects.find(item => item.type === art.id);
      if (entity) selectObject(entity);
      else if (art.category === '作物' && scene.crops.some(crop => crop.cropType === art.id)) selectCrop(scene.crops.find(crop => crop.cropType === art.id));
      else {
        selectCrop(null); markCatalog(art.id);
        $('crop-title').textContent = `${art.name} · ${art.category}`;
        $('crop-detail').textContent = art.id === 'fish' ? '锦鲤在池塘内缓缓游动，是常驻环境角色。' : art.id === 'chicken' ? '两只常驻小鸡；累计 PR 可带来额外伙伴。' : '素材已入库；当前场景未触发此对象的展示条件。';
      }
    });
    grid.append(button);
  }
}
function rememberLayout() {
  undoLayouts.push(scene.objects);
  if (undoLayouts.length > 20) undoLayouts.shift();
  $('undo-layout').disabled = false;
}
function placeSelected(x, y) {
  const result = moveFarmObject(scene, selectedObjectId, x, y);
  if (!result.ok) { $('layout-status').textContent = result.reason; return; }
  const before = scene.objects.find(item => item.id === selectedObjectId);
  const after = result.scene.objects.find(item => item.id === selectedObjectId);
  if (before.x === after.x && before.y === after.y) return;
  rememberLayout(); scene = result.scene;
  $('layout-status').textContent = '已放置，可继续微调、撤销，或保存 PNG。'; paint();
}
$('edit-layout').addEventListener('click', () => {
  if (!scene) return;
  editing = !editing; selectedObjectId = null; selectedId = null; markCatalog(null);
  $('edit-layout').setAttribute('aria-pressed', String(editing));
  $('edit-layout').textContent = editing ? '完成布置' : '布置庭院';
  canvas.dataset.editing = String(editing);
  $('layout-status').textContent = editing ? '先在画布或素材册选中物件，再在所属区域内点击放置。' : '布置已保留在本次预览，可保存 PNG。';
  paint();
});
$('undo-layout').addEventListener('click', () => {
  if (!scene || !undoLayouts.length) return;
  scene = { ...scene, objects: undoLayouts.pop() };
  $('undo-layout').disabled = !undoLayouts.length;
  $('layout-status').textContent = '已撤销上一次布置。'; paint();
});
$('reset-layout').addEventListener('click', () => {
  if (!scene) return;
  const objects = createFarmObjects(scene);
  if (JSON.stringify(objects) === JSON.stringify(scene.objects)) return;
  rememberLayout(); scene = { ...scene, objects }; selectCrop(null);
  $('layout-status').textContent = '已恢复默认位置；贡献数据没有变化。';
});
async function requestFarm() {
  const username = $('username').value.trim();
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username) || username.includes('--')) {
    message('请输入有效的 GitHub 用户名：1–39 个字母、数字或单连字符。'); return;
  }
  const current = ++requestId;
  controller?.abort(); controller = new AbortController();
  $('generate').disabled = true; $('canvas-shell').setAttribute('aria-busy', 'true');
  if (!scene) $('loading').hidden = false;
  message();
  try {
    const params = new URLSearchParams({ user: username, mode: $('data-mode').value, profile });
    const result = await json(`/api/farm?${params}`, { signal: controller.signal });
    if (current === requestId) showScene(result);
  } catch (error) {
    if (error.name !== 'AbortError' && current === requestId) {
      message(error.message);
      if (scene) {
        profile = scene.profile || profile;
        $('data-mode').value = scene.source === 'demo' ? 'demo' : 'github';
        showScene(scene, false);
      }
    }
  } finally {
    if (current === requestId) {
      $('generate').disabled = false; $('loading').hidden = true;
      $('canvas-shell').setAttribute('aria-busy', 'false');
    }
  }
}
$('farm-form').addEventListener('submit', event => { event.preventDefault(); requestFarm(); });
$('data-mode').addEventListener('change', requestFarm);
for (const button of document.querySelectorAll('[data-profile]')) {
  button.addEventListener('click', () => { profile = button.dataset.profile; requestFarm(); });
}
for (const id of ['day', 'evening']) $(id).addEventListener('click', () => {
  evening = id === 'evening';
  $('day').setAttribute('aria-pressed', String(!evening));
  $('evening').setAttribute('aria-pressed', String(evening));
  $('scene-caption').textContent = evening ? '春日 · 暮色' : '春日 · 微风';
  paint();
});
$('pause').addEventListener('click', () => { paused = !paused; updatePause(); });
motion.addEventListener('change', event => { paused = event.matches; updatePause(); });
document.addEventListener('visibilitychange', () => { lastFrame = 0; renderBudget = 0; resumeLoop(); });
canvas.addEventListener('click', event => {
  if (!scene) return;
  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width * WORLD.width, y = (event.clientY - bounds.top) / bounds.height * WORLD.height;
  const entity = hitTestObject(scene, x, y, seconds, assets.manifest);
  const selected = scene.objects.find(item => item.id === selectedObjectId);
  if (editing && selected && ART_BY_ID[selected.type].movable && !selected.fixed && (!entity || entity.fixed || !ART_BY_ID[entity.type].movable)) { placeSelected(x, y); return; }
  if (entity) selectObject(entity);
  else selectCrop(hitTestCrop(scene, x, y));
});
canvas.addEventListener('keydown', event => {
  if (!scene) return;
  if (event.key === 'Escape') { selectCrop(null); $('layout-status').textContent = '已取消选择。'; return; }
  if (editing && selectedObjectId && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    const entity = scene.objects.find(item => item.id === selectedObjectId);
    placeSelected(entity.x + (event.key === 'ArrowRight' ? 4 : event.key === 'ArrowLeft' ? -4 : 0), entity.y + (event.key === 'ArrowDown' ? 4 : event.key === 'ArrowUp' ? -4 : 0));
    return;
  }
  if (!scene.crops.length || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const index = scene.crops.findIndex(crop => crop.id === selectedId);
  const next = index < 0 ? 0 : (index + (event.key === 'ArrowRight' ? 1 : -1) + scene.crops.length) % scene.crops.length;
  selectCrop(scene.crops[next]);
});
$('download').addEventListener('click', () => {
  if (!assets || !scene) return;
  const output = document.createElement('canvas'); output.width = 1536; output.height = 1024;
  drawFarm(output.getContext('2d'), assets, scene, seconds, { evening });
  const filename = `${scene.username}-farm-${scene.source}${evening ? '-evening' : ''}.png`;
  output.toBlob(blob => {
    if (!blob) { message('图片导出失败，请重试。'); return; }
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, 'image/png');
});

async function start() {
  updatePause();
  try {
    const [background, atlas, manifest, config] = await Promise.all([
      image('/assets/spring/background.png'), image('/assets/spring/sprites.png'),
      json('/assets/spring/manifest.json'), json('/api/config'),
    ]);
    assets = { background, atlas, manifest };
    buildCatalog();
    $('username').value = config.defaultUsername;
    const option = $('data-mode').querySelector('[value="github"]');
    if (config.githubAvailable) { option.disabled = false; option.textContent = 'GitHub 真实数据'; }
    await requestFarm();
  } catch (error) {
    $('loading').hidden = true;
    message(error.message);
  }
}
start();
