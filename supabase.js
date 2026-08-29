/* WRC Property — Supabase connection and database-powered workflows */
const WRC_SUPABASE_URL = 'https://zsmxwzplxjdudoshcova.supabase.co';
const WRC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_t6LOdR-6sleUqeuzHV_8xQ_uc-F96rf';
const wrcDb = window.supabase?.createClient(WRC_SUPABASE_URL, WRC_SUPABASE_PUBLISHABLE_KEY);
let wrcSession = null;
let wrcQueuedPhotos = [];
let wrcEditingProperty = null;
let wrcPreserveEditMode = false;

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
  const { data, error } = await wrcDb
    .from('properties')
    .select('*, property_photos(url, sort_order)')
    .order('date_added', { ascending: false });
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
  app.innerHTML = `${header(true)}<div class="shell page-title"><div class="eyebrow">WRC Property</div><h1>Internal property stock.</h1><p>Sign in to manage listings, requirements and private shortlists.</p></div></div><main class="shell"><form class="form-wrap" style="max-width:520px" onsubmit="sendMagicLink(event)"><h2>Agent sign in</h2><p>We will email you a secure sign-in link.</p><div class="form-field"><label>Work email</label><input id="agentEmail" type="email" required placeholder="you@company.com"></div><button class="btn gold" style="margin-top:22px">Email me a sign-in link</button><div class="success"></div></form></main>${footer()}`;
}

async function sendMagicLink(event) {
  event.preventDefault();
  const email = document.getElementById('agentEmail').value.trim();
  const { error } = await wrcDb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` }
  });
  if (error) notice(error.message, 'error');
  else notice('Check your email for your secure WRC Property sign-in link.');
}

function fieldValue(label) {
  const field = [...document.querySelectorAll('.form-field')]
    .find(item => item.querySelector('label')?.textContent.trim() === label);
  return field?.querySelector('input, select, textarea')?.value.trim() || '';
}

function optionalNumber(value) {
  return value === '' ? null : Number(value);
}

function enhancePropertyForm() {
  const grid = document.querySelector('.form-grid');
  const upload = document.querySelector('.upload');
  if (!grid || !upload) return;
  if (!document.getElementById('propertyPhotos')) {
    upload.innerHTML = `<label for="propertyPhotos" style="cursor:pointer">↑ &nbsp; Add property photos<br><small>JPG, PNG or WEBP · Add more photos any time before saving</small></label><input id="propertyPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple style="display:none"><div id="photoQueue" style="margin-top:12px;font-size:12px;color:var(--ink)">No photos added yet</div>`;
    document.getElementById('propertyPhotos').addEventListener('change', event => {
      const newFiles = [...event.target.files];
      const seen = new Set(wrcQueuedPhotos.map(file => `${file.name}-${file.size}-${file.lastModified}`));
      wrcQueuedPhotos.push(...newFiles.filter(file => !seen.has(`${file.name}-${file.size}-${file.lastModified}`)));
      document.getElementById('photoQueue').textContent = `${wrcQueuedPhotos.length} ${wrcQueuedPhotos.length === 1 ? 'photo' : 'photos'} ready to upload`;
      event.target.value = '';
    });
  }
  if (!document.getElementById('wrcExtraFields')) {
    grid.insertAdjacentHTML('beforeend', `<div id="wrcExtraFields" class="form-field"><label>Tenure</label><input placeholder="e.g. Freehold"></div><div class="form-field"><label>Furnishing</label><select><option>Unfurnished</option><option>Partly Furnished</option><option>Fully Furnished</option><option>Bare Unit</option></select></div><div class="form-field full"><label>Internal Remarks</label><textarea placeholder="Owner details, viewing notes or internal-only information"></textarea></div>`);
  }
}

const staticPropertyForm = window.propertyForm;
window.propertyForm = function propertyFormWithDatabase() {
  if (!wrcSession) return renderSignIn();
  if (!wrcPreserveEditMode) wrcEditingProperty = null;
  wrcQueuedPhotos = [];
  staticPropertyForm();
  enhancePropertyForm();
};

const staticHome = window.home;
const staticCatalogue = window.catalogue;
const staticDetail = window.detail;
window.home = function protectedHome() {
  if (!wrcSession) return renderSignIn();
  staticHome();
};
window.catalogue = function protectedCatalogue(category) {
  if (!wrcSession) return renderSignIn();
  staticCatalogue(category);
};
window.detail = function protectedDetail(id) {
  if (!wrcSession && !window.wrcSharedMode) return renderSignIn();
  staticDetail(id);
  if (wrcSession) addListingControls(id);
};
window.go = function protectedGo() { window.home(); };

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
  if (control) control.value = value ?? '';
}

window.editListing = async function editListing(propertyDbId) {
  const { data, error } = await wrcDb.from('properties').select('*').eq('id', propertyDbId).single();
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
  const { data: existingPhotos } = await wrcDb.from('property_photos').select('sort_order').eq('property_id', propertyDbId).order('sort_order', { ascending: false }).limit(1);
  const firstSortOrder = (existingPhotos?.[0]?.sort_order ?? -1) + 1;
  for (const [index, file] of [...files].entries()) {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
    const path = `${propertyDbId}/${Date.now()}-${index}-${safeName}`;
    const { error } = await wrcDb.storage.from('property-photos').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = wrcDb.storage.from('property-photos').getPublicUrl(path);
    photoRows.push({ property_id: propertyDbId, storage_path: path, url: data.publicUrl, sort_order: firstSortOrder + index });
  }
  if (photoRows.length) {
    const { error } = await wrcDb.from('property_photos').insert(photoRows);
    if (error) throw error;
  }
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
  await uploadPhotos(data.id, files);
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
  const sharedId = window.location.hash.match(/^#\/shortlist\/([\w-]+)$/)?.[1];
  if (sharedId) return loadPublicShortlist(sharedId);
  const { data } = await wrcDb.auth.getSession();
  wrcSession = data.session;
  if (wrcSession) await loadStock(); else renderSignIn();
}

wrcDb?.auth.onAuthStateChange((_event, session) => { wrcSession = session; });
startWrc();
