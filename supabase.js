/* WRC Property — Supabase connection and database-powered workflows */
const WRC_SUPABASE_URL = 'https://zsmxwzplxjdudoshcova.supabase.co';
const WRC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_t6LOdR-6sleUqeuzHV_8xQ_uc-F96rf';
const wrcDb = window.supabase?.createClient(WRC_SUPABASE_URL, WRC_SUPABASE_PUBLISHABLE_KEY);
let wrcSession = null;
let wrcQueuedPhotos = [];
let wrcEditingProperty = null;
let wrcPreserveEditMode = false;
let wrcPasswordRecoveryActive = false;
let wrcExistingPhotos = [];
let wrcCoverPhotoId = null;
let wrcCoverPhotoKey = null;
const wrcPhotoPreviews = new Map();

const notice = (message, type = 'success') => {
  const el = document.querySelector('.success');
  if (!el) return;
  el.textContent = `${type === 'error' ? '!' : '✓'} ${message}`;
  el.style.display = 'block';
  el.style.background = type === 'error' ? '#f8e6e3' : '';
};

let wrcLanguage = (() => {
  try { return localStorage.getItem('wrc-language') === 'zh' ? 'zh' : 'en'; } catch (_) { return 'en'; }
})();
let wrcListingView = (() => {
  try { return localStorage.getItem('wrc-listing-view') === 'list' ? 'list' : 'grid'; } catch (_) { return 'grid'; }
})();
const wrcOriginalTextNodes = new WeakMap();
const wrcOriginalAttributes = new WeakMap();
const WRC_ZH = {
  'Home': '首页',
  'Commercial': '商业地产',
  'Residential': '住宅地产',
  'Latest Listings': '最新房源',
  'Latest listings': '最新房源',
  'Contact': '联系我们',
  'Contact WRC Property': '联系 WRC Property',
  'Agent sign in': '经纪人登录',
  'Agent sign in': '经纪人登录',
  'Add property': '添加房源',
  'Find the Right Property, Faster.': '更快找到合适的房产。',
  'WRC Property Collection': 'WRC 精选房源',
  'Curated property stock for smoother matching, clearer sharing and more confident client conversations.': '精选房源库存，让配对、分享和客户沟通更轻松。',
  'Browse listings': '浏览房源',
  'Client requirement': '客户需求',
  'Active stock': '在售房源',
  'To build a shortlist': '创建清单',
  'To share with clients': '分享给客户',
  'Find a space for business': '为业务寻找合适空间',
  'Find a place to call home': '寻找理想居所',
  'Fresh to market': '最新上市',
  'View all stock': '查看全部房源',
  'Made for the way you work': '为您的工作流程而设',
  'From requirement to shortlist—without the admin.': '从客户需求到精选清单，省去繁琐行政工作。',
  'Keep your stock organised, identify the strongest matches, and share only what your client needs to see.': '整理房源、快速筛选合适选项，只分享客户需要看的内容。',
  'Receive requirement': '接收客户需求',
  'Search your live stock': '搜索现有房源',
  'Share a polished shortlist': '分享专业精选清单',
  'Property stock': '房源库存',
  'Current available stock, ready to match and share.': '目前可用房源，随时可配对和分享。',
  'Search location / name': '搜索地点或房源名称',
  'Category': '类别',
  'Any': '不限',
  'Sale / Rent': '出售 / 出租',
  'Sale': '出售',
  'Rent': '出租',
  'Property type': '房产类型',
  'Any type': '不限类型',
  'Min price': '最低价格',
  'Max price': '最高价格',
  'Min size': '最小面积',
  'Max size': '最大面积',
  'Bedrooms': '卧室',
  'Reset': '重置',
  'View': '查看方式',
  'Grid': '网格',
  'List': '列表',
  '▦ Grid': '▦ 网格',
  '☰ List': '☰ 列表',
  'Browse available WRC Property listings.': '浏览 WRC Property 可用房源。',
  'For Rent': '出租',
  'For Sale': '出售',
  'View property →': '查看房源 →',
  '← Back to listings': '← 返回房源列表',
  'WhatsApp enquiry': 'WhatsApp 咨询',
  'Built-up': '建筑面积',
  'Land area': '土地面积',
  'Bathrooms': '浴室',
  'Tenure': '地契',
  'Furnishing': '装修',
  'Highlights': '亮点',
  'About this property': '房源介绍',
  'Copy listing link': '复制房源链接',
  'Share to social media': '分享到社交媒体',
  'Share this listing': '分享此房源',
  'More apps': '更多应用',
  'Instagram, TikTok and Xiao Hong Shu use the copied link. On mobile, choose': 'Instagram、TikTok 和小红书将使用已复制的链接。在手机上，请选择',
  'to share directly with installed apps.': '以直接分享到已安装的应用。',
  'Phone & WhatsApp': '电话与 WhatsApp',
  'Start a conversation': '开始联系',
  'Email': '邮箱',
  "Let's make the right match.": '让我们找到合适的配对。',
  'For stock enquiries, co-agency or client requirements.': '欢迎咨询房源、合作代理或客户需求。',
  'Internal property stock.': '内部房源管理。',
  'Sign in to manage listings, requirements and private shortlists.': '登录以管理房源、客户需求和私人精选清单。',
  'Use your approved WRC email and password.': '请使用已获批准的 WRC 电邮和密码。',
  'Work email': '工作电邮',
  'Password': '密码',
  'Sign in': '登录',
  'Set or reset password': '设置或重置密码',
  'Create your password.': '创建您的密码。',
  'Choose a password for your WRC Property management account.': '为您的 WRC Property 管理账户设置密码。',
  'Set password': '设置密码',
  'New password': '新密码',
  'Confirm password': '确认密码',
  'Save password': '保存密码',
  'Property information': '房源资料',
  'Complete the essentials now; you can enrich a listing anytime.': '先完成基本资料，稍后可随时补充详情。',
  'Property ID': '物业编号',
  'Property name': '房源名称',
  'Location': '地点',
  'Price (RM)': '价格（RM）',
  'Status': '状态',
  'Available': '可用',
  'Reserved': '已预留',
  'Sold': '已售出',
  'Rented': '已出租',
  'Hidden': '隐藏',
  'Built-up size (sq ft)': '建筑面积（平方英尺）',
  'Land size': '土地面积',
  'Address': '地址',
  'Description': '描述',
  'Photos': '照片',
  'Internal Remarks': '内部备注',
  'Save property →': '保存房源 →',
  'Update listing →': '更新房源 →',
  'Edit property': '编辑房源',
  'Update the listing details, availability or photos.': '更新房源资料、可用状态或照片。',
  'Stock management': '房源管理',
  'Edit listing': '编辑房源',
  'Hide this listing': '隐藏此房源',
  'Hidden listings do not appear in normal searches or client shortlists.': '隐藏房源不会出现在正常搜索或客户精选清单中。',
  'What are they looking for?': '客户在寻找什么？',
  'A strong brief makes a sharper shortlist.': '清晰需求能带来更精准的精选清单。',
  'Buy / Rent': '购买 / 租赁',
  'Buy': '购买',
  'Preferred location': '首选地点',
  'Budget (RM)': '预算（RM）',
  'Minimum size': '最小面积',
  'Client name': '客户姓名',
  'Phone': '电话',
  'Additional requirements': '其他需求',
  'Submit requirement →': '提交需求 →',
  'Private property collection': '私人房源精选',
  'Selected for you': '为您精选',
  'Enquire via WhatsApp': '通过 WhatsApp 咨询',
  'This private collection has been prepared by WRC Property. Availability and pricing are subject to confirmation.': '此私人精选由 WRC Property 准备。可用状态和价格以最终确认为准。'
};
const WRC_ZH_ATTRIBUTES = {
  'Property or location': '房源名称或地点',
  'e.g. WRC-2407': '例如 WRC-005',
  'Listing name': '房源名称',
  'Area, City': '地区、城市',
  'Full property address': '完整房源地址',
  'Separate key highlights with commas': '请用逗号分隔各项亮点',
  'Describe the property, condition and what makes it compelling.': '描述房源、现况和吸引之处。',
  'Owner details, viewing notes or internal-only information': '业主资料、看房备注或仅供内部使用的信息',
  'you@company.com': 'you@company.com',
  'Your password': '您的密码',
  'At least 8 characters': '至少 8 个字符',
  'Repeat your password': '再次输入您的密码'
};

function wrcTranslatedText(text) {
  const foundCount = text.match(/^(\d+) properties found$/);
  if (foundCount) return `${foundCount[1]} 个房源`;
  const oneFound = text.match(/^(\d+) property found$/);
  if (oneFound) return `${oneFound[1]} 个房源`;
  return WRC_ZH[text] || text;
}

function rememberWrcFormKeys() {
  document.querySelectorAll('.form-field label').forEach(label => {
    if (!label.dataset.wrcFieldKey) label.dataset.wrcFieldKey = label.textContent.trim();
  });
  document.querySelectorAll('.form-wrap h2').forEach(heading => {
    if (!heading.dataset.wrcHeadingKey) heading.dataset.wrcHeadingKey = heading.textContent.trim();
  });
}

function ensureWrcLanguageSwitch() {
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;
  let control = document.getElementById('wrcLanguageSwitch');
  if (!control) {
    topbar.insertAdjacentHTML('beforeend', '<button id="wrcLanguageSwitch" class="language-switch" type="button" data-wrc-no-translate="true" onclick="toggleWrcLanguage()"></button>');
    control = document.getElementById('wrcLanguageSwitch');
  }
  control.textContent = wrcLanguage === 'zh' ? 'EN' : '中文';
  control.setAttribute('aria-label', wrcLanguage === 'zh' ? 'Switch to English' : '切换至中文');
}

function applyWrcLanguage() {
  ensureWrcLanguageSwitch();
  rememberWrcFormKeys();
  const chinese = wrcLanguage === 'zh';
  document.documentElement.lang = chinese ? 'zh-Hans' : 'en';
  document.title = chinese ? 'WRC Property — 房源管理' : 'WRC Property — Stock that moves';
  document.querySelectorAll('option').forEach(option => {
    if (!option.hasAttribute('value')) option.value = option.textContent.trim();
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(node => {
    const parent = node.parentElement;
    if (!parent || parent.closest('script, style, [data-wrc-no-translate]')) return;
    if (!wrcOriginalTextNodes.has(node)) wrcOriginalTextNodes.set(node, node.nodeValue);
    const original = wrcOriginalTextNodes.get(node);
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    const core = original.trim();
    node.nodeValue = chinese ? `${leading}${wrcTranslatedText(core)}${trailing}` : original;
  });
  document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(control => {
    const original = wrcOriginalAttributes.get(control) || control.getAttribute('placeholder');
    if (!wrcOriginalAttributes.has(control)) wrcOriginalAttributes.set(control, original);
    control.setAttribute('placeholder', chinese ? (WRC_ZH_ATTRIBUTES[original] || original) : original);
  });
}

function scheduleWrcLanguage() {
  requestAnimationFrame(applyWrcLanguage);
}

function applyWrcListingView() {
  const listingGrid = document.querySelector('.catalogue .listing-grid');
  if (!listingGrid) return;
  listingGrid.classList.toggle('list-view', wrcListingView === 'list');
  document.querySelectorAll('[data-wrc-listing-view]').forEach(button => {
    const selected = button.dataset.wrcListingView === wrcListingView;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function addWrcListingViewControl() {
  const resultsHead = document.querySelector('.catalogue .results-head');
  if (!resultsHead || document.getElementById('listingViewToolbar')) return;
  resultsHead.insertAdjacentHTML('beforebegin', `<div id="listingViewToolbar" class="listing-view-toolbar"><span>View</span><button class="listing-view-button" type="button" data-wrc-listing-view="grid" onclick="setWrcListingView('grid')">▦ Grid</button><button class="listing-view-button" type="button" data-wrc-listing-view="list" onclick="setWrcListingView('list')">☰ List</button></div>`);
  applyWrcListingView();
}

window.setWrcListingView = function setWrcListingView(view) {
  wrcListingView = view === 'list' ? 'list' : 'grid';
  try { localStorage.setItem('wrc-listing-view', wrcListingView); } catch (_) { /* Persistence is optional. */ }
  applyWrcListingView();
  scheduleWrcLanguage();
};

window.toggleWrcLanguage = function toggleWrcLanguage() {
  wrcLanguage = wrcLanguage === 'zh' ? 'en' : 'zh';
  try { localStorage.setItem('wrc-language', wrcLanguage); } catch (_) { /* Persistence is optional. */ }
  applyWrcLanguage();
};

function propertyFromDb(row) {
  const photos = (row.property_photos || [])
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(photo => photo.url)
    .filter(Boolean);
  return {
    id: row.property_id,
    dbId: row.id,
    category: row.category,
    type: row.property_type,
    name: row.property_name,
    location: row.location,
    address: row.address,
    deal: row.deal_type,
    status: row.status,
    price: Number(row.price || 0),
    built: Number(row.built_up_size || 0),
    land: row.land_size || '—',
    beds: row.bedrooms ?? '—',
    baths: row.bathrooms ?? '—',
    tenure: row.tenure || '—',
    furnishing: row.furnishing || '—',
    highlight: (row.highlights || [])[0] || 'WRC selected listing',
    highlights: row.highlights || [],
    description: row.description || '',
    photos: photos.length ? photos : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=85'],
    date: row.date_added || ''
  };
}

async function loadStock() {
  if (!wrcSession) {
    const { data, error } = await wrcDb.rpc('get_public_properties');
    if (error) {
      renderDatabaseSetup(error.message);
      return;
    }
    properties.splice(0, properties.length, ...(data || []).map(record => propertyFromDb(record.property)));
    state.selected.clear();
    if (state.view === 'catalogue') renderPublicCatalogue(); else home();
    scheduleWrcLanguage();
    renderDirectPropertyRoute();
    return;
  }

  let query = wrcDb
    .from('properties')
    .select('*, property_photos(id, url, sort_order)')
    .order('date_added', { ascending: false });
  const { data, error } = await query;
  if (error) {
    renderDatabaseSetup(error.message);
    return;
  }
  properties.splice(0, properties.length, ...data.map(propertyFromDb));
  state.selected.clear();
  if (state.view === 'catalogue') renderPublicCatalogue(); else home();
  scheduleWrcLanguage();
  renderDirectPropertyRoute();
}

function renderDatabaseSetup(errorMessage) {
  app.innerHTML = `${header(true)}<div class="shell page-title"><div class="eyebrow">One last setup</div><h1>Prepare your property database.</h1><p>WRC Property is connected to Supabase. Add the supplied database structure once, then your stock will load here.</p></div></div><main class="shell"><div class="form-wrap"><h2>Run the WRC database script</h2><p>In Supabase, open <b>SQL Editor</b>, create a new query, paste the complete <code>wrc-supabase-schema.sql</code> file, then click Run. Refresh this page afterwards.</p><p class="note">Technical message: ${errorMessage}</p></div></main>${footer()}`;
  scheduleWrcLanguage();
}

function renderSignIn() {
  app.innerHTML = `${header(true)}<div class="shell page-title"><div class="eyebrow">WRC Property</div><h1>Internal property stock.</h1><p>Sign in to manage listings, requirements and private shortlists.</p></div></div><main class="shell"><form class="form-wrap" style="max-width:520px" onsubmit="signInWithPassword(event)"><h2>Agent sign in</h2><p>Use your approved WRC email and password.</p><div class="form-field"><label>Work email</label><input id="agentEmail" type="email" required autocomplete="email" placeholder="you@company.com"></div><div class="form-field"><label>Password</label><input id="agentPassword" type="password" required minlength="8" autocomplete="current-password" placeholder="Your password"></div><button class="btn gold" style="margin-top:22px">Sign in</button><button class="link-btn" type="button" style="display:block;margin:18px 0 0" onclick="sendPasswordReset()">Set or reset password</button><div class="success"></div></form></main>${footer()}`;
  scheduleWrcLanguage();
}

async function signInWithPassword(event) {
  event.preventDefault();
  const email = document.getElementById('agentEmail').value.trim();
  const password = document.getElementById('agentPassword').value;
  const { data, error } = await wrcDb.auth.signInWithPassword({ email, password });
  if (error) notice(error.message, 'error');
  else {
    await setWrcManagementSession(data.session);
    if (!wrcSession) {
      await wrcDb.auth.signOut();
      renderSignIn();
      notice('This email is not approved for WRC Property management.', 'error');
      return;
    }
    await loadStock();
  }
}

async function sendPasswordReset() {
  const email = document.getElementById('agentEmail')?.value.trim();
  if (!email) return notice('Enter your work email first, then choose Set or reset password.', 'error');
  const { error } = await wrcDb.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname}`
  });
  if (error) notice(error.message, 'error');
  else notice('Check your email to set or reset your password.');
}

function renderSetPassword() {
  app.innerHTML = `${header(true)}<div class="shell page-title"><div class="eyebrow">WRC Property</div><h1>Create your password.</h1><p>Choose a password for your WRC Property management account.</p></div></div><main class="shell"><form class="form-wrap" style="max-width:520px" onsubmit="updatePassword(event)"><h2>Set password</h2><div class="form-field"><label>New password</label><input id="newPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></div><div class="form-field"><label>Confirm password</label><input id="confirmPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="Repeat your password"></div><button class="btn gold" style="margin-top:22px">Save password</button><div class="success"></div></form></main>${footer()}`;
  scheduleWrcLanguage();
}

async function updatePassword(event) {
  event.preventDefault();
  const password = document.getElementById('newPassword').value;
  const confirmation = document.getElementById('confirmPassword').value;
  if (password !== confirmation) return notice('The passwords do not match.', 'error');
  const { error } = await wrcDb.auth.updateUser({ password });
  if (error) return notice(error.message, 'error');
  wrcPasswordRecoveryActive = false;
  history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
  const { data } = await wrcDb.auth.getSession();
  await setWrcManagementSession(data.session);
  if (!wrcSession) {
    await wrcDb.auth.signOut();
    renderSignIn();
    return notice('This email is not approved for WRC Property management.', 'error');
  }
  await loadStock();
  alert('Password saved. You are now signed in.');
}

function fieldValue(label) {
  const field = [...document.querySelectorAll('.form-field')]
    .find(item => {
      const fieldLabel = item.querySelector('label');
      return fieldLabel?.dataset.wrcFieldKey === label || fieldLabel?.textContent.trim() === label;
    });
  return field?.querySelector('input, select, textarea')?.value.trim() || '';
}

function optionalNumber(value) {
  return value === '' ? null : Number(value);
}

const WRC_PROPERTY_TYPES = {
  Residential: [
    'Condominium', 'Serviced Residence', 'Apartment', 'Flat', 'Studio', 'SOHO',
    'Townhouse', 'Terrace House', 'Semi-Detached House', 'Bungalow', 'Villa',
    'Cluster House', 'Penthouse', 'Duplex', 'Landed Residential', 'Residential Land'
  ],
  Commercial: [
    'Shop Lot', 'Retail Lot', 'Office', 'Office Suite', 'Corporate Office',
    'Shop Office', 'Commercial Building', 'Commercial Bungalow', 'Commercial Land',
    'Hotel', 'Hotel Suite'
  ],
  Industrial: [
    'Factory', 'Semi-Detached Factory', 'Detached Factory', 'Terrace Factory',
    'Warehouse', 'Factory + Warehouse', 'Industrial Building', 'Industrial Land'
  ]
};

function propertyTypeChoices(category, selected = '') {
  const groups = category === 'Residential'
    ? [['Residential', WRC_PROPERTY_TYPES.Residential]]
    : [['Commercial', WRC_PROPERTY_TYPES.Commercial], ['Industrial', WRC_PROPERTY_TYPES.Industrial]];
  return `<option value="">Select property type</option>${groups.map(([label, types]) => `<optgroup label="${label}">${types.map(type => `<option value="${type}" ${selected === type ? 'selected' : ''}>${type}</option>`).join('')}</optgroup>`).join('')}`;
}

function photoFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function clearPhotoPreviews() {
  wrcPhotoPreviews.forEach(url => URL.revokeObjectURL(url));
  wrcPhotoPreviews.clear();
}

function previewUrl(file) {
  const key = photoFileKey(file);
  if (!wrcPhotoPreviews.has(key)) wrcPhotoPreviews.set(key, URL.createObjectURL(file));
  return wrcPhotoPreviews.get(key);
}

function renderPhotoPicker() {
  const queue = document.getElementById('photoQueue');
  if (!queue) return;
  if (!wrcCoverPhotoId && !wrcCoverPhotoKey) {
    wrcCoverPhotoId = wrcExistingPhotos[0]?.id || null;
    wrcCoverPhotoKey = wrcCoverPhotoId ? null : (wrcQueuedPhotos[0] ? photoFileKey(wrcQueuedPhotos[0]) : null);
  }
  const existingTiles = wrcExistingPhotos.map(photo => `<label class="photo-cover-option ${wrcCoverPhotoId === photo.id ? 'selected' : ''}"><input type="radio" name="coverPhoto" ${wrcCoverPhotoId === photo.id ? 'checked' : ''} onchange="selectCoverPhoto('existing','${photo.id}')"><span class="photo-cover-image" style="background-image:url('${photo.url}')"></span><span>${wrcCoverPhotoId === photo.id ? 'Cover photo' : 'Use as cover'}</span></label>`).join('');
  const newTiles = wrcQueuedPhotos.map((file, index) => {
    const selected = wrcCoverPhotoKey === photoFileKey(file);
    return `<label class="photo-cover-option ${selected ? 'selected' : ''}"><input type="radio" name="coverPhoto" ${selected ? 'checked' : ''} onchange="selectCoverPhoto('new','${index}')"><span class="photo-cover-image" style="background-image:url('${previewUrl(file)}')"></span><span>${selected ? 'Cover photo' : 'Use as cover'}</span></label>`;
  }).join('');
  const tiles = `${existingTiles}${newTiles}`;
  queue.innerHTML = tiles
    ? `<p class="photo-cover-help">Click an image to set the cover photo. It will show first on the listing.</p><div class="photo-cover-grid">${tiles}</div>`
    : 'No photos added yet';
}

window.selectCoverPhoto = function selectCoverPhoto(kind, value) {
  if (kind === 'existing') {
    wrcCoverPhotoId = value;
    wrcCoverPhotoKey = null;
  } else {
    const file = wrcQueuedPhotos[Number(value)];
    wrcCoverPhotoKey = file ? photoFileKey(file) : null;
    wrcCoverPhotoId = null;
  }
  renderPhotoPicker();
};

function enhancePropertyForm() {
  const grid = document.querySelector('.form-grid');
  const upload = document.querySelector('.upload');
  if (!grid || !upload) return;
  const categoryControl = [...document.querySelectorAll('.form-field')]
    .find(field => field.querySelector('label')?.textContent.trim() === 'Category')
    ?.querySelector('select');
  const typeField = [...document.querySelectorAll('.form-field')]
    .find(field => field.querySelector('label')?.textContent.trim() === 'Property type');
  let typeControl = typeField?.querySelector('input, select');
  if (typeControl?.tagName === 'INPUT') {
    typeControl.outerHTML = `<select id="wrcPropertyType" required>${propertyTypeChoices(categoryControl?.value)}</select>`;
    typeControl = typeField.querySelector('select');
  }
  if (categoryControl && typeControl && !typeControl.dataset.wrcChoicesBound) {
    categoryControl.addEventListener('change', () => {
      const currentValue = typeControl.value;
      typeControl.innerHTML = propertyTypeChoices(categoryControl.value, currentValue);
    });
    typeControl.dataset.wrcChoicesBound = 'true';
  }
  if (!document.getElementById('propertyPhotos')) {
    upload.innerHTML = `<label for="propertyPhotos" style="cursor:pointer">↑ &nbsp; Add property photos<br><small>JPG, PNG or WEBP · Add more photos any time before saving</small></label><input id="propertyPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple style="display:none"><div id="photoQueue" class="photo-queue">No photos added yet</div>`;
    document.getElementById('propertyPhotos').addEventListener('change', event => {
      const newFiles = [...event.target.files];
      const seen = new Set(wrcQueuedPhotos.map(photoFileKey));
      wrcQueuedPhotos.push(...newFiles.filter(file => !seen.has(photoFileKey(file))));
      event.target.value = '';
      renderPhotoPicker();
    });
    renderPhotoPicker();
  }
  if (!document.getElementById('wrcExtraFields')) {
    grid.insertAdjacentHTML('beforeend', `<div id="wrcExtraFields" class="form-field"><label>Tenure</label><input placeholder="e.g. Freehold"></div><div class="form-field"><label>Furnishing</label><select><option>Unfurnished</option><option>Partly Furnished</option><option>Fully Furnished</option><option>Bare Unit</option></select></div><div class="form-field full"><label>Internal Remarks</label><textarea placeholder="Owner details, viewing notes or internal-only information"></textarea></div>`);
  }
}

function nextWrcPropertyId() {
  const largestNumber = properties.reduce((largest, property) => {
    const match = String(property.id || '').match(/^WRC\s*-\s*(\d+)$/i);
    return match ? Math.max(largest, Number(match[1])) : largest;
  }, 0);
  return `WRC-${String(largestNumber + 1).padStart(3, '0')}`;
}

function setAutomaticPropertyId() {
  const field = [...document.querySelectorAll('.form-field')]
    .find(item => item.querySelector('label')?.textContent.trim() === 'Property ID');
  const input = field?.querySelector('input');
  if (!input) return;
  input.value = wrcEditingProperty?.property_id || nextWrcPropertyId();
  input.readOnly = true;
  input.title = 'This property ID is assigned automatically.';
}

const staticPropertyForm = window.propertyForm;
window.propertyForm = function propertyFormWithDatabase() {
  if (!wrcSession) return renderSignIn();
  if (!wrcPreserveEditMode) wrcEditingProperty = null;
  clearPhotoPreviews();
  wrcQueuedPhotos = [];
  wrcExistingPhotos = [...(wrcEditingProperty?.property_photos || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  wrcCoverPhotoId = wrcExistingPhotos[0]?.id || null;
  wrcCoverPhotoKey = null;
  staticPropertyForm();
  enhancePropertyForm();
  setAutomaticPropertyId();
  scheduleWrcLanguage();
};

const staticHome = window.home;
const staticCatalogue = window.catalogue;
const staticDetail = window.detail;
const staticRequirement = window.requirement;
const staticRenderCatalogue = window.renderCatalogue;
const staticContact = window.contact;
const WRC_WHATSAPP_PRIMARY_URL = 'https://wa.me/message/46E4PP57VPIKE1';

function whatsappIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.1A8.5 8.5 0 1 1 20.5 11.6Z"></path><path d="M8.8 8.1c.2-.4.4-.4.7-.4h.4c.2 0 .4.1.5.4l.7 1.6c.1.2.1.4 0 .6l-.5.7c.5 1 1.3 1.7 2.3 2.2l.7-.5c.2-.1.4-.1.6 0l1.6.7c.3.1.4.3.4.5v.4c0 .3 0 .5-.4.7-.4.2-1.1.3-1.8 0-1.1-.4-2.1-1.1-2.9-1.9-.9-.8-1.5-1.8-1.9-2.9-.3-.7-.2-1.4 0-1.8Z"></path></svg>`;
}

function renderPublicCatalogue() {
  staticRenderCatalogue();
  if (!wrcSession) {
    const note = document.querySelector('.results-head .note');
    if (note) note.textContent = 'Browse available WRC Property listings.';
  }
  addWrcListingViewControl();
  scheduleWrcLanguage();
}

window.home = function publicHome() {
  staticHome();
  if (!wrcSession) {
    const requirementButton = document.querySelector('.hero-actions .btn.outline');
    if (requirementButton) {
      requirementButton.textContent = 'Contact WRC Property';
      requirementButton.onclick = () => window.contact();
    }
    const workflowButton = document.querySelector('.workflow .btn');
    if (workflowButton) {
      workflowButton.textContent = 'Agent sign in';
      workflowButton.onclick = () => window.propertyForm();
    }
  }
  scheduleWrcLanguage();
};
window.catalogue = function publicCatalogue(category) {
  state.view = 'catalogue';
  state.filter.category = category || '';
  renderPublicCatalogue();
};
window.setFilter = function setPublicFilter(key, value) {
  state.filter[key] = value;
  renderPublicCatalogue();
};
window.clearFilters = function clearPublicFilters() {
  state.filter = { category: state.filter.category, deal: '', type: '', location: '', minPrice: '', maxPrice: '', minSize: '', maxSize: '', beds: '' };
  renderPublicCatalogue();
};
window.toggleSelected = function togglePublicSelected(id, selected) {
  if (selected) state.selected.add(id); else state.selected.delete(id);
  renderPublicCatalogue();
};
function listingLink(id) {
  return `${window.location.origin}${window.location.pathname}#/property/${encodeURIComponent(id)}`;
}

function renderPropertyUnavailable() {
  app.innerHTML = `<main>${header(true)}<div class="shell page-title"><div class="eyebrow">WRC Property</div><h1>This listing is unavailable.</h1><p>It may no longer be available or the link is incorrect.</p></div></div></main>${footer()}`;
  scheduleWrcLanguage();
}

function renderDirectPropertyRoute() {
  const route = window.location.hash;
  const directPropertyId = route.match(/^#\/property\/([^/?#]+)$/)?.[1];
  if (directPropertyId) return window.detail(decodeURIComponent(directPropertyId), false);

  // Shared links should open the same public page as a navigation click.
  if (route === '#/latest') return window.catalogue();
  if (route === '#/commercial') return window.catalogue('Commercial');
  if (route === '#/residential') return window.catalogue('Residential');
  if (route === '#/contact') return window.contact();
  if (route === '#/add') return window.propertyForm();
  if (route === '#/requirement') return window.requirement();
}

window.sharePropertyLink = async function sharePropertyLink(id) {
  const link = listingLink(id);
  try { await navigator.clipboard.writeText(link); } catch (_) { /* Clipboard permission is optional. */ }
  alert(`Listing link copied. You can now send it to your client:\n${link}`);
};

function socialShareText(property) {
  return `${property.name} · ${property.location} · ${fmt(property.price)}${property.deal === 'Rent' ? ' / month' : ''}`;
}

window.sharePropertySocial = function sharePropertySocial(id) {
  const property = properties.find(item => item.id === id);
  const aside = document.querySelector('.detail-aside');
  if (!property || !aside) return;
  const existingPanel = document.getElementById('socialSharePanel');
  if (existingPanel) {
    existingPanel.remove();
    return;
  }
  const link = listingLink(id);
  const shareText = socialShareText(property);
  const nativeShare = navigator.share
    ? `<button class="social-share-btn" type="button" onclick="nativeShareListing('${id}')">More apps</button>`
    : '';
  aside.insertAdjacentHTML('beforeend', `<div id="socialSharePanel" class="social-share-panel"><div class="social-share-title">Share this listing</div><div class="social-share-actions"><a class="social-share-btn" href="https://wa.me/?text=${encodeURIComponent(`${shareText}\n${link}`)}" target="_blank" rel="noopener">WhatsApp</a><a class="social-share-btn" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}" target="_blank" rel="noopener">Facebook</a><a class="social-share-btn" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(link)}" target="_blank" rel="noopener">X</a>${nativeShare}<button class="social-share-btn" type="button" onclick="copyPropertyLinkForSocial('${id}','Instagram')">Instagram</button><button class="social-share-btn" type="button" onclick="copyPropertyLinkForSocial('${id}','TikTok')">TikTok</button><button class="social-share-btn" type="button" onclick="copyPropertyLinkForSocial('${id}','Xiao Hong Shu')">Xiao Hong Shu</button></div><p>Instagram, TikTok and Xiao Hong Shu use the copied link. On mobile, choose <b>More apps</b> to share directly with installed apps.</p></div>`);
  scheduleWrcLanguage();
};

window.nativeShareListing = async function nativeShareListing(id) {
  const property = properties.find(item => item.id === id);
  if (!property || !navigator.share) return;
  try {
    await navigator.share({ title: property.name, text: socialShareText(property), url: listingLink(id) });
  } catch (error) {
    if (error?.name !== 'AbortError') window.copyPropertyLinkForSocial(id, 'your social media app');
  }
};

window.copyPropertyLinkForSocial = async function copyPropertyLinkForSocial(id, platform) {
  const link = listingLink(id);
  try { await navigator.clipboard.writeText(link); } catch (_) { /* Clipboard permission is optional. */ }
  alert(`Listing link copied. Open ${platform} and paste it into your post or message.`);
};

window.detail = function publicDetail(id, updateUrl = true) {
  const property = properties.find(item => item.id === id);
  if (!property) return renderPropertyUnavailable();
  staticDetail(id);
  if (updateUrl && !window.wrcSharedMode) history.pushState({}, '', `#/property/${encodeURIComponent(id)}`);
  const aside = document.querySelector('.detail-aside');
  if (aside && !document.getElementById('sharePropertyLink')) {
    aside.insertAdjacentHTML('beforeend', `<button id="sharePropertyLink" class="btn outline small" style="width:100%;margin-top:10px" onclick="sharePropertyLink('${id}')">Copy listing link</button><button class="btn outline small" style="width:100%;margin-top:10px" onclick="sharePropertySocial('${id}')">Share to social media</button>`);
  }
  if (wrcSession) addListingControls(id);
  scheduleWrcLanguage();
};
window.requirement = function protectedRequirement() {
  if (!wrcSession) return renderSignIn();
  staticRequirement();
  scheduleWrcLanguage();
};
window.whatsapp = function primaryWhatsapp() {
  window.open(WRC_WHATSAPP_PRIMARY_URL, '_blank', 'noopener');
};
window.contact = function wrcContact() {
  staticContact();
  const phoneCard = [...document.querySelectorAll('.property-card')]
    .find(card => card.textContent.includes('Phone & WhatsApp'));
  const phoneHeading = phoneCard?.querySelector('h2');
  if (phoneHeading && !document.getElementById('primaryWhatsappLink')) {
    phoneHeading.insertAdjacentHTML('afterend', `<a id="primaryWhatsappLink" class="whatsapp-direct-link" href="${WRC_WHATSAPP_PRIMARY_URL}" target="_blank" rel="noopener">${whatsappIcon()} <span>WhatsApp this number</span></a>`);
  }
  scheduleWrcLanguage();
};
window.go = function publicGo() { window.home(); };

function addListingControls(propertyId) {
  const property = properties.find(item => item.id === propertyId);
  const aside = document.querySelector('.detail-aside');
  if (!property?.dbId || !aside) return;
  aside.insertAdjacentHTML('beforeend', `<div style="margin-top:22px;padding-top:18px;border-top:1px solid var(--line)"><div class="eyebrow" style="margin-bottom:10px">Stock management</div><button class="btn small" style="width:100%;margin-bottom:9px" onclick="editListing('${property.dbId}')">Edit listing</button><button class="btn outline small" style="width:100%" onclick="hideListing('${property.dbId}', '${property.name.replace(/'/g, "\\'")}')">Hide this listing</button><p class="note" style="margin:10px 0 0">Hidden listings do not appear in normal searches or client shortlists.</p></div>`);
}

function setFieldValue(label, value) {
  const field = [...document.querySelectorAll('.form-field')]
    .find(item => {
      const fieldLabel = item.querySelector('label');
      return fieldLabel?.dataset.wrcFieldKey === label || fieldLabel?.textContent.trim() === label;
    });
  const control = field?.querySelector('input, select, textarea');
  if (control) {
    control.value = value ?? '';
    if (label === 'Category') control.dispatchEvent(new Event('change'));
  }
}

window.editListing = async function editListing(propertyDbId) {
  const { data, error } = await wrcDb.from('properties').select('*, property_photos(id, url, sort_order)').eq('id', propertyDbId).single();
  if (error) return alert(error.message);
  wrcEditingProperty = data;
  wrcPreserveEditMode = true;
  window.propertyForm();
  wrcPreserveEditMode = false;
  document.querySelector('.page-title h1').textContent = 'Edit property';
  document.querySelector('.page-title p').textContent = 'Update the listing details, availability or photos.';
  document.querySelector('.form-wrap h2').textContent = 'Property information';
  setFieldValue('Property ID', data.property_id);
  setFieldValue('Property name', data.property_name);
  setFieldValue('Category', data.category);
  setFieldValue('Property type', data.property_type);
  setFieldValue('Location', data.location);
  setFieldValue('Sale / Rent', data.deal_type);
  setFieldValue('Price (RM)', data.price);
  setFieldValue('Status', data.status);
  setFieldValue('Built-up size (sq ft)', data.built_up_size);
  setFieldValue('Land size', data.land_size);
  setFieldValue('Bedrooms', data.bedrooms);
  setFieldValue('Bathrooms', data.bathrooms);
  setFieldValue('Address', data.address);
  setFieldValue('Highlights', (data.highlights || []).join(', '));
  setFieldValue('Description', data.description);
  setFieldValue('Tenure', data.tenure);
  setFieldValue('Furnishing', data.furnishing);
  setFieldValue('Internal Remarks', data.internal_remarks);
  const button = document.querySelector('.form-wrap button[type="submit"], .form-wrap button:not([type])');
  if (button) button.textContent = 'Update listing →';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.hideListing = async function hideListing(propertyDbId, propertyName) {
  if (!window.confirm(`Hide “${propertyName}”? You can restore it later in Supabase.`)) return;
  const { error } = await wrcDb.from('properties').update({ status: 'Hidden' }).eq('id', propertyDbId);
  if (error) return alert(error.message);
  alert('Listing hidden. It will no longer appear in searches or shortlists.');
  state.view = 'catalogue';
  state.filter = { category: '', deal: '', type: '', location: '', minPrice: '', maxPrice: '', minSize: '', maxSize: '', beds: '' };
  await loadStock();
};

async function uploadPhotos(propertyDbId, files) {
  const photoRows = [];
  const uploadedFiles = [];
  const { data: existingPhotos } = await wrcDb.from('property_photos').select('sort_order').eq('property_id', propertyDbId).order('sort_order', { ascending: false }).limit(1);
  const firstSortOrder = (existingPhotos?.[0]?.sort_order ?? -1) + 1;
  for (const [index, file] of [...files].entries()) {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
    const path = `${propertyDbId}/${Date.now()}-${index}-${safeName}`;
    const { error } = await wrcDb.storage.from('property-photos').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = wrcDb.storage.from('property-photos').getPublicUrl(path);
    photoRows.push({ property_id: propertyDbId, storage_path: path, url: data.publicUrl, sort_order: firstSortOrder + index });
    uploadedFiles.push({ key: photoFileKey(file), path });
  }
  if (photoRows.length) {
    const { data, error } = await wrcDb.from('property_photos').insert(photoRows).select('id, storage_path');
    if (error) throw error;
    const idsByPath = new Map((data || []).map(photo => [photo.storage_path, photo.id]));
    return new Map(uploadedFiles.map(photo => [photo.key, idsByPath.get(photo.path)]));
  }
  return new Map();
}

async function setCoverPhoto(propertyDbId, coverPhotoId) {
  if (!coverPhotoId) return;
  const { data: allPhotos, error } = await wrcDb
    .from('property_photos')
    .select('id, sort_order')
    .eq('property_id', propertyDbId)
    .order('sort_order');
  if (error) throw error;
  const orderedPhotos = [
    ...(allPhotos || []).filter(photo => photo.id === coverPhotoId),
    ...(allPhotos || []).filter(photo => photo.id !== coverPhotoId)
  ];
  await Promise.all(orderedPhotos.map((photo, index) => (
    photo.sort_order === index
      ? Promise.resolve()
      : wrcDb.from('property_photos').update({ sort_order: index }).eq('id', photo.id).then(({ error: updateError }) => {
        if (updateError) throw updateError;
      })
  )));
}

async function saveProperty() {
  const property = {
    property_id: fieldValue('Property ID'),
    property_name: fieldValue('Property name'),
    category: fieldValue('Category'),
    property_type: fieldValue('Property type'),
    location: fieldValue('Location'),
    address: fieldValue('Address'),
    deal_type: fieldValue('Sale / Rent'),
    status: fieldValue('Status'),
    price: optionalNumber(fieldValue('Price (RM)')) || 0,
    built_up_size: optionalNumber(fieldValue('Built-up size (sq ft)')),
    land_size: fieldValue('Land size'),
    bedrooms: optionalNumber(fieldValue('Bedrooms')),
    bathrooms: optionalNumber(fieldValue('Bathrooms')),
    tenure: fieldValue('Tenure'),
    furnishing: fieldValue('Furnishing'),
    description: fieldValue('Description'),
    highlights: fieldValue('Highlights').split(',').map(value => value.trim()).filter(Boolean),
    internal_remarks: fieldValue('Internal Remarks')
  };
  const result = wrcEditingProperty?.id
    ? await wrcDb.from('properties').update(property).eq('id', wrcEditingProperty.id).select().single()
    : await wrcDb.from('properties').insert(property).select().single();
  const { data, error } = result;
  if (error) throw error;
  const files = wrcQueuedPhotos.length ? wrcQueuedPhotos : (document.getElementById('propertyPhotos')?.files || []);
  const uploadedPhotoIds = await uploadPhotos(data.id, files);
  const selectedCoverPhotoId = wrcCoverPhotoId || uploadedPhotoIds.get(wrcCoverPhotoKey);
  await setCoverPhoto(data.id, selectedCoverPhotoId);
  return data;
}

async function saveRequirement() {
  const { error } = await wrcDb.from('client_requirements').insert({
    category: fieldValue('Category'),
    deal_type: fieldValue('Buy / Rent') === 'Buy' ? 'Sale' : fieldValue('Buy / Rent'),
    preferred_location: fieldValue('Preferred location'),
    budget: fieldValue('Budget (RM)'),
    property_type: fieldValue('Property type'),
    minimum_size: fieldValue('Minimum size'),
    bedrooms: fieldValue('Bedrooms'),
    additional_requirements: fieldValue('Additional requirements'),
    client_name: fieldValue('Client name'),
    phone: fieldValue('Phone'),
    whatsapp: fieldValue('WhatsApp')
  });
  if (error) throw error;
}

document.addEventListener('submit', async event => {
  const form = event.target;
  const headingElement = form?.querySelector('h2');
  const heading = headingElement?.dataset.wrcHeadingKey || headingElement?.textContent || '';
  if (!wrcSession || !form?.matches('.form-wrap') || !/Property information|What are they looking for/.test(heading)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const wasEditing = Boolean(wrcEditingProperty?.id);
  const button = form.querySelector('button[type="submit"], button:not([type])');
  if (button) { button.disabled = true; button.textContent = 'Saving…'; }
  try {
    if (heading.includes('Property information')) {
      const savedProperty = await saveProperty();
      wrcQueuedPhotos = [];
      wrcEditingProperty = null;
      await loadStock();
      window.detail(savedProperty.property_id);
    } else {
      await saveRequirement();
      notice('Requirement saved. You can now search matching stock.');
      form.reset();
    }
  } catch (error) {
    notice(error.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = heading.includes('Property information') ? (wasEditing ? 'Update listing →' : 'Save property →') : 'Submit requirement →'; }
    scheduleWrcLanguage();
  }
}, true);

function sharedPropertyFromRpc(record) {
  const row = record.property || record;
  return {
    id: row.property_id,
    type: row.property_type,
    name: row.property_name,
    location: row.location,
    address: row.address,
    deal: row.deal_type,
    status: row.status,
    price: Number(row.price || 0),
    built: Number(row.built_up_size || 0),
    land: row.land_size || '—',
    beds: row.bedrooms ?? '—',
    baths: row.bathrooms ?? '—',
    tenure: row.tenure || '—',
    furnishing: row.furnishing || '—',
    highlight: (row.highlights || [])[0] || 'WRC selected listing',
    highlights: row.highlights || [],
    description: row.description || '',
    photos: row.photos?.length ? row.photos : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=85']
  };
}

function renderSharedShortlist(items, title = 'A considered shortlist.') {
  app.innerHTML = `<main><section class="share-hero"><div class="shell topbar"><a class="brand" href="#/"><span>WRC</span> PROPERTY</a><span style="font-size:12px;color:#c4d2c9">Private property collection</span></div><div class="shell share-title"><div class="eyebrow">Selected for you</div><h1>${title}</h1><p>${items.length} ${items.length === 1 ? 'property' : 'properties'} selected to match your brief.</p></div></section><section class="section"><div class="shell"><p class="note">This private collection has been prepared by WRC Property. Availability and pricing are subject to confirmation.</p><div class="listing-grid">${items.map(property => card(property, true)).join('')}</div><div style="text-align:center;margin-top:40px"><button class="btn" onclick="shareShortlistOnWhatsApp()">Enquire via WhatsApp</button></div></div></section></main>${footer()}`;
  scheduleWrcLanguage();
}

async function loadPublicShortlist(id) {
  const { data, error } = await wrcDb.rpc('get_public_shortlist', { p_shortlist_id: id });
  if (error || !data?.length) {
    app.innerHTML = `<main>${header(true)}<div class="shell page-title"><div class="eyebrow">WRC Property</div><h1>This shortlist is unavailable.</h1><p>It may have expired, changed, or no longer contains available properties.</p></div></div></main>${footer()}`;
    scheduleWrcLanguage();
    return;
  }
  const items = data.map(sharedPropertyFromRpc);
  properties.splice(0, properties.length, ...items);
  window.wrcSharedMode = true;
  window.wrcCurrentShareUrl = window.location.href;
  renderSharedShortlist(items, data[0].title || 'A considered shortlist.');
}

window.shareShortlistOnWhatsApp = function () {
  const link = window.wrcCurrentShareUrl || window.location.href;
  window.open(`https://wa.me/?text=${encodeURIComponent(`Hello, here is your private WRC Property shortlist: ${link}`)}`, '_blank');
};

window.shortlist = async function createShareableShortlist() {
  if (!wrcSession) return renderSignIn();
  const selected = properties.filter(property => state.selected.has(property.id));
  const selectedDbIds = selected.map(property => property.dbId).filter(Boolean);
  if (!selectedDbIds.length) return;
  const { data: shortlist, error } = await wrcDb.from('shortlists').insert({ title: 'Your WRC Property Shortlist' }).select().single();
  if (error) return alert(error.message);
  const { error: itemError } = await wrcDb.from('shortlist_items').insert(selectedDbIds.map(property_id => ({ shortlist_id: shortlist.id, property_id })));
  if (itemError) return alert(itemError.message);
  const link = `${window.location.href.split('#')[0]}#/shortlist/${shortlist.id}`;
  window.wrcCurrentShareUrl = link;
  try { await navigator.clipboard.writeText(link); } catch (_) { /* Clipboard permission is optional. */ }
  history.pushState({}, '', `#/shortlist/${shortlist.id}`);
  renderSharedShortlist(selected);
  alert('Private shortlist link created and copied. You can now share it through WhatsApp.');
};

async function startWrc() {
  if (!wrcDb) return;
  if (/(?:^#|[&#])type=recovery(?:&|$)/.test(window.location.hash)) {
    wrcPasswordRecoveryActive = true;
    renderSetPassword();
    return;
  }
  const sharedId = window.location.hash.match(/^#\/shortlist\/([\w-]+)$/)?.[1];
  if (sharedId) return loadPublicShortlist(sharedId);
  const { data } = await wrcDb.auth.getSession();
  await setWrcManagementSession(data.session);
  await loadStock();
  renderDirectPropertyRoute();
}

async function setWrcManagementSession(session) {
  wrcSession = session;
  if (session) {
    const { data, error } = await wrcDb.rpc('is_wrc_agent');
    if (error || data !== true) wrcSession = null;
  }
  window.wrcSession = wrcSession;
}

wrcDb?.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    wrcPasswordRecoveryActive = true;
    wrcSession = null;
    window.wrcSession = null;
    renderSetPassword();
    return;
  }
  if (wrcPasswordRecoveryActive) return;
  await setWrcManagementSession(session);
  await loadStock();
  renderDirectPropertyRoute();
});
startWrc();
