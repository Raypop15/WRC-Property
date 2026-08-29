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
  if (state.view === 'catalogue') renderCatalogue(); else home();
}

function renderDatabaseSetup(errorMessage) {
  app.innerHTML = `${header(true)}<div class="shell page-title"><div class="eyebrow">One last setup</div><h1>Prepare your property database.</h1><p>WRC Property is connected to Supabase. Add the supplied database structure once, then your stock will load here.</p></div></div><main class="shell"><div class="form-wrap"><h2>Run the WRC database script</h2><p>In Supabase, open <b>SQL Editor</b>, create a new query, paste the complete <code>wrc-supabase-schema.sql</code> file, then click Run. Refresh this page afterwards.</p><p class="note">Technical message: ${errorMessage}</p></div></main>${footer()}`;
}

function renderSignIn() {
  app.innerHTML = `${header(true)}<div class="shell page-title"><div class="eyebrow">WRC Property</div><h1>Internal property stock.</h1><p>Sign in to manage listings, requirements and private shortlists.</p></div></div><main class="shell"><form class="form-wrap" style="max-width:520px" onsubmit="signInWithPassword(event)"><h2>Agent sign in</h2><p>Use your approved WRC email and password.</p><div class="form-field"><label>Work email</label><input id="agentEmail" type="email" required autocomplete="email" placeholder="you@company.com"></div><div class="form-field"><label>Password</label><input id="agentPassword" type="password" required minlength="8" autocomplete="current-password" placeholder="Your password"></div><button class="btn gold" style="margin-top:22px">Sign in</button><button class="link-btn" type="button" style="display:block;margin:18px 0 0" onclick="sendPasswordReset()">Set or reset password</button><div class="success"></div></form></main>${footer()}`;
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
    .find(item => item.querySelector('label')?.textContent.trim() === label);
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
};

const staticHome = window.home;
const staticCatalogue = window.catalogue;
const staticDetail = window.detail;
const staticRequirement = window.requirement;
const staticRenderCatalogue = window.renderCatalogue;

function renderPublicCatalogue() {
  staticRenderCatalogue();
  if (!wrcSession) {
    const note = document.querySelector('.results-head .note');
    if (note) note.textContent = 'Browse available WRC Property listings.';
  }
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
};
window.catalogue = function publicCatalogue(category) {
  state.view = 'catalogue';
  state.filter.category = category || '';
  renderPublicCatalogue();
};
function listingLink(id) {
  return `${window.location.origin}${window.location.pathname}#/property/${encodeURIComponent(id)}`;
}

function renderPropertyUnavailable() {
  app.innerHTML = `<main>${header(true)}<div class="shell page-title"><div class="eyebrow">WRC Property</div><h1>This listing is unavailable.</h1><p>It may no longer be available or the link is incorrect.</p></div></div></main>${footer()}`;
}

function renderDirectPropertyRoute() {
  const directPropertyId = window.location.hash.match(/^#\/property\/([^/?#]+)$/)?.[1];
  if (directPropertyId) window.detail(decodeURIComponent(directPropertyId), false);
}

window.sharePropertyLink = async function sharePropertyLink(id) {
  const link = listingLink(id);
  try { await navigator.clipboard.writeText(link); } catch (_) { /* Clipboard permission is optional. */ }
  alert(`Listing link copied. You can now send it to your client:\n${link}`);
};

window.detail = function publicDetail(id, updateUrl = true) {
  const property = properties.find(item => item.id === id);
  if (!property) return renderPropertyUnavailable();
  staticDetail(id);
  if (updateUrl && !window.wrcSharedMode) history.pushState({}, '', `#/property/${encodeURIComponent(id)}`);
  const aside = document.querySelector('.detail-aside');
  if (aside && !document.getElementById('sharePropertyLink')) {
    aside.insertAdjacentHTML('beforeend', `<button id="sharePropertyLink" class="btn outline small" style="width:100%;margin-top:10px" onclick="sharePropertyLink('${id}')">Copy listing link</button>`);
  }
  if (wrcSession) addListingControls(id);
};
window.requirement = function protectedRequirement() {
  if (!wrcSession) return renderSignIn();
  staticRequirement();
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
    .find(item => item.querySelector('label')?.textContent.trim() === label);
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
  const heading = form?.querySelector('h2')?.textContent || '';
  if (!wrcSession || !form?.matches('.form-wrap') || !/Property information|What are they looking for/.test(heading)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const wasEditing = Boolean(wrcEditingProperty?.id);
  const button = form.querySelector('button[type="submit"], button:not([type])');
  if (button) { button.disabled = true; button.textContent = 'Saving…'; }
  try {
    if (heading.includes('Property information')) {
      await saveProperty();
      wrcQueuedPhotos = [];
      wrcEditingProperty = null;
      await loadStock();
      alert(wasEditing ? 'Listing updated successfully.' : 'Property saved. It is now part of your WRC stock.');
    } else {
      await saveRequirement();
      notice('Requirement saved. You can now search matching stock.');
      form.reset();
    }
  } catch (error) {
    notice(error.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = heading.includes('Property information') ? (wasEditing ? 'Update listing →' : 'Save property →') : 'Submit requirement →'; }
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
}

async function loadPublicShortlist(id) {
  const { data, error } = await wrcDb.rpc('get_public_shortlist', { p_shortlist_id: id });
  if (error || !data?.length) {
    app.innerHTML = `<main>${header(true)}<div class="shell page-title"><div class="eyebrow">WRC Property</div><h1>This shortlist is unavailable.</h1><p>It may have expired, changed, or no longer contains available properties.</p></div></div></main>${footer()}`;
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
