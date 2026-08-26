(() => {
const cfg=window.MOT_CONFIG||{}, configured=cfg.SUPABASE_PUBLISHABLE_KEY&&!cfg.SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_');
const sb=configured?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY):null;
const app=document.querySelector('#app'); let state={tab:'dashboard',services:[],inquiries:[],categories:[]}; let siteSettings={};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const slug=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const notice=(m,ok=false)=>`<div class="notice ${ok?'success':''}">${esc(m)}</div>`;
const imageExt=file=>(file?.name?.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
const remoteImage=url=>/^https?:\/\//i.test(String(url||''))?String(url):'';
const currentLogo=()=>remoteImage(siteSettings?.logo_url);
const imgFallback=(url,alt,cls='thumb')=>{const src=remoteImage(url)||currentLogo(); return `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" data-fallback-logo="${esc(currentLogo())}" onerror="this.onerror=null;const f=this.dataset.fallbackLogo;if(f&&this.src!==f)this.src=f;else this.classList.add('image-unavailable');">`;};
async function loadPublicSettings(){ if(!sb)return; const {data}=await sb.from('site_settings').select('*').eq('id',1).maybeSingle(); if(data){siteSettings=data; const logo=currentLogo(); const favicon=document.querySelector('link[rel="icon"]'); if(favicon&&logo)favicon.href=logo;} }

async function login(){
 await loadPublicSettings();
 const logo=currentLogo();
 app.innerHTML=`<div class="login"><div class="loginbox">${logo?imgFallback(logo,'Moments On Time','crm-login-logo'):''}<h2 style="text-align:center;margin-bottom:8px">Moments On Time CRM</h2><p class="small" style="text-align:center;margin-bottom:20px">Manage your services, website images, settings and customer requests.</p>
 ${!configured?notice('Add the Supabase publishable/anon key in config.js before logging in.'):''}
 <form id="loginForm"><div class="field"><label>Email</label><input name="email" type="email" required></div><div class="field"><label>Password</label><input name="password" type="password" required></div><button class="btn btn-primary">Sign in</button></form><p id="loginMsg" class="small" style="margin-top:14px"></p></div></div>`;
 document.querySelector('#loginForm').addEventListener('submit',async e=>{e.preventDefault(); if(!sb)return; const o=Object.fromEntries(new FormData(e.currentTarget)); const {error}=await sb.auth.signInWithPassword(o); document.querySelector('#loginMsg').textContent=error?error.message:'Signing in…';});
}

function shell(){
 app.innerHTML=`<div class="crm"><header class="crmbar"><a class="crmbrand" href="../">${currentLogo()?imgFallback(currentLogo(),'Moments On Time','crm-logo'):''}<span>Moments On Time CRM</span></a><div style="display:flex;align-items:center;gap:10px"><span id="userEmail" class="small"></span><button id="logout" class="btn-sm">Sign out</button></div></header>
 <div class="crm-layout"><aside class="sidebar"><button class="sidebtn active" data-tab="dashboard">Dashboard</button><button class="sidebtn" data-tab="services">Services</button><button class="sidebtn" data-tab="categories">Top 4 Categories</button><button class="sidebtn" data-tab="inquiries">Inquiries</button><button class="sidebtn" data-tab="settings">Site settings</button></aside><main id="main" class="main"></main></div></div>`;
 document.querySelector('#logout').onclick=async()=>{const {error}=await sb.auth.signOut(); if(error) alert(error.message); else login();};
 document.querySelectorAll('.sidebtn').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;document.querySelectorAll('.sidebtn').forEach(x=>x.classList.toggle('active',x===b));renderTab()});
}
async function ensureAdmin(){
 const {data:{user}}=await sb.auth.getUser(); if(!user)return false;
 const {data,error}=await sb.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(error||!data){const logo=currentLogo(); app.innerHTML=`<div class="login"><div class="loginbox">${logo?imgFallback(logo,'Moments On Time','crm-login-logo'):''}<h2>CRM access not enabled</h2><p class="small">Your Supabase Auth account exists, but its UUID is not in <code>admin_users</code>. Add it in the SQL Editor using the comment at the end of <code>supabase/setup.sql</code>.</p><button class="btn btn-secondary" onclick="location.reload()">Retry</button></div></div>`;return false}
 return true;
}
async function refresh(){
 const [s,i,c]=await Promise.all([
   sb.from('services').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false}),
   sb.from('inquiries').select('*').order('created_at',{ascending:false}),
   sb.from('category_images').select('*').order('category')
 ]);
 state.services=s.data||[];state.inquiries=i.data||[];state.categories=c.data||[];
 if(s.error) console.error(s.error); if(i.error) console.error(i.error); if(c.error) console.error(c.error);
}
function renderTab(){
 const m=document.querySelector('#main'); if(!m)return;
 if(state.tab==='dashboard') m.innerHTML=`<div class="toolbar"><div><div class="eyebrow">Overview</div><h2>Dashboard</h2></div></div>
 <div class="stats"><div class="stat">Services<b>${state.services.length}</b><span class="small">in your catalogue</span></div><div class="stat">Active<b>${state.services.filter(x=>x.is_active).length}</b><span class="small">visible on website</span></div><div class="stat">Categories<b>${new Set(state.services.map(x=>x.category).filter(Boolean)).size}</b><span class="small">from services</span></div><div class="stat">New inquiries<b>${state.inquiries.filter(x=>x.status==='new').length}</b><span class="small">need attention</span></div></div>
 <div class="panel" style="margin-top:20px"><h3>How it works</h3><p class="small">The public website reads active services from Supabase. Its category section automatically takes the first four distinct categories in service sort order. Website images are stored in the <code>site-media</code> Supabase Storage bucket.</p></div>`;
 if(state.tab==='services') renderServices(m);
 if(state.tab==='categories') renderCategories(m);
 if(state.tab==='inquiries') renderInquiries(m);
 if(state.tab==='settings') renderSettings(m);
}
function renderServices(m){
 m.innerHTML=`<div class="toolbar"><div><div class="eyebrow">Catalogue</div><h2>Services</h2></div><button id="newService" class="btn btn-primary">+ Add service</button></div><div id="serviceEditor"></div><div class="panel"><div class="tablewrap"><table class="table"><thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Active</th><th>Order</th><th></th></tr></thead><tbody>${state.services.map(s=>`<tr><td>${(remoteImage(s.image_url)||currentLogo())?imgFallback(s.image_url,s.name):'—'}</td><td><b>${esc(s.name)}</b><div class="small">${esc(s.description||'')}</div></td><td>${esc(s.category)}</td><td>${s.price??'—'}</td><td>${s.is_active?'Yes':'No'}</td><td>${s.sort_order}</td><td><div class="actions-sm"><button class="btn-sm edit" data-id="${s.id}">Edit</button><button class="btn-sm btn-danger del" data-id="${s.id}">Delete</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
 document.querySelector('#newService').onclick=()=>editor();
 document.querySelectorAll('.edit').forEach(b=>b.onclick=()=>editor(state.services.find(x=>x.id===b.dataset.id)));
 document.querySelectorAll('.del').forEach(b=>b.onclick=()=>deleteService(b.dataset.id));
}
function editor(s=null){
 const box=document.querySelector('#serviceEditor');
 box.innerHTML=`<div class="panel"><h3>${s?'Edit':'New'} service</h3><form id="serviceForm"><input type="hidden" name="id" value="${esc(s?.id||'')}"><div class="grid2"><div class="field"><label>Name *</label><input name="name" required value="${esc(s?.name||'')}"></div><div class="field"><label>Category *</label><input name="category" required value="${esc(s?.category||'')}"></div><div class="field"><label>Price</label><input name="price" type="number" step="0.01" min="0" value="${esc(s?.price??'')}"></div><div class="field"><label>Sort order</label><input name="sort_order" type="number" value="${esc(s?.sort_order??0)}"></div><div class="field"><label>Service image</label><input id="serviceImage" name="image_file" type="file" accept="image/*"><div class="small" style="margin-top:7px">Upload directly to Supabase Storage (max 6MB).</div></div><div class="field"><label>Active</label><select name="is_active"><option value="true" ${s?.is_active!==false?'selected':''}>Yes</option><option value="false" ${s?.is_active===false?'selected':''}>No</option></select></div></div>
 ${s?.image_url?`<div class="image-editor"><img id="servicePreview" src="${esc(remoteImage(s.image_url)||currentLogo())}" data-fallback-logo="${esc(currentLogo())}" onerror="this.onerror=null;const f=this.dataset.fallbackLogo;if(f)this.src=f;"><label class="small"><input id="removeServiceImage" type="checkbox"> Remove current image</label></div>`:''}
 <div class="field"><label>Description</label><textarea name="description">${esc(s?.description||'')}</textarea></div><div class="actions"><button class="btn btn-primary">Save service</button><button type="button" class="btn btn-secondary" id="cancelEditor">Cancel</button></div></form></div>`;
 const fileInput=document.querySelector('#serviceImage'); fileInput.onchange=()=>{const f=fileInput.files[0]; if(f){if(!f.type.startsWith('image/')){alert('Please choose an image.');fileInput.value='';return;} if(f.size>6*1024*1024){alert('Please keep images under 6MB.');fileInput.value='';return;} if(document.querySelector('#servicePreview'))document.querySelector('#servicePreview').src=URL.createObjectURL(f);}};
 document.querySelector('#cancelEditor').onclick=()=>box.innerHTML='';
 document.querySelector('#serviceForm').onsubmit=async e=>{e.preventDefault(); await saveService(e.currentTarget,s);};
}
async function uploadFile(file,path){
 const {error}=await sb.storage.from('site-media').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
 if(error) throw error;
 const {data}=sb.storage.from('site-media').getPublicUrl(path); return data.publicUrl;
}
async function removeStorage(path){if(!path)return; const {error}=await sb.storage.from('site-media').remove([path]); if(error) console.warn('Could not remove old storage file:',error.message);}
async function saveService(form,s){
 const o=Object.fromEntries(new FormData(form)); const file=form.elements.image_file.files[0]; const removeImage=document.querySelector('#removeServiceImage')?.checked;
 o.price=o.price===''?null:Number(o.price); o.sort_order=Number(o.sort_order||0); o.is_active=o.is_active==='true';
 delete o.id; delete o.image_file;
 let newPath=null,newUrl=null;
 try{
   if(file){newPath=`services/${s?.id||crypto.randomUUID()}/${Date.now()}.${imageExt(file)}`;newUrl=await uploadFile(file,newPath);o.image_url=newUrl;o.image_storage_path=newPath;}
   else if(s && removeImage){o.image_url=null;o.image_storage_path=null;}
   else {delete o.image_url;delete o.image_storage_path;}
   const q=s?sb.from('services').update(o).eq('id',s.id):sb.from('services').insert(o).select('id').single();
   const {data,error}=await q;
   if(error) throw error;
   if(s && file && s.image_storage_path) await removeStorage(s.image_storage_path);
   if(s && removeImage && !file && s.image_storage_path) await removeStorage(s.image_storage_path);
   await refresh(); renderServices(document.querySelector('#main'));
 }catch(err){if(newPath)await removeStorage(newPath);alert(err.message||String(err));}
}
async function deleteService(id){
 if(!confirm('Delete this service and its stored image?'))return;
 const s=state.services.find(x=>x.id===id);
 const {error}=await sb.from('services').delete().eq('id',id);
 if(error){alert(error.message);return;}
 if(s?.image_storage_path)await removeStorage(s.image_storage_path);
 await refresh(); renderTab();
}
function renderCategories(m){
 const cats=[];const seen=new Set();for(const s of state.services){const c=(s.category||'').trim();const k=c.toLowerCase();if(c&&!seen.has(k)){seen.add(k);cats.push(c)}if(cats.length===4)break}
 const imgMap=new Map(state.categories.map(x=>[x.category.toLowerCase(),x]));
 m.innerHTML=`<div class="toolbar"><div><div class="eyebrow">Website hero cards</div><h2>Top 4 Categories</h2></div></div><div class="panel"><p class="small">These four are derived automatically from the first four distinct categories in your services. Upload, replace or delete each category image. Files are stored in the <code>site-media</code> Supabase Storage bucket.</p></div>
 <div class="category-grid">${cats.map(c=>{const x=imgMap.get(c.toLowerCase())||{};return `<div class="panel" style="margin:0"><h3>${esc(c)}</h3>${(remoteImage(x.image_url)||currentLogo())?`<img src="${esc(remoteImage(x.image_url)||currentLogo())}" data-fallback-logo="${esc(currentLogo())}" onerror="this.onerror=null;const f=this.dataset.fallbackLogo;if(f)this.src=f;" style="width:100%;height:190px;object-fit:cover;border-radius:14px;margin-bottom:12px">`:''}<div class="drop"><input type="file" accept="image/*" data-category="${esc(c)}"><div class="small" style="margin-top:8px">Choose category image</div></div><div class="actions" style="margin-top:10px">${x.image_url?`<button class="btn-sm btn-danger remove-category" data-category="${esc(c)}">Delete image</button>`:''}</div><div class="small" style="margin-top:9px">${x.storage_path?esc(x.storage_path):'No image uploaded yet.'}</div></div>`}).join('')||'<div class="empty">Add services with categories first.</div>'}</div>`;
 document.querySelectorAll('input[type=file][data-category]').forEach(inp=>inp.onchange=()=>uploadCategory(inp.dataset.category,inp.files[0]));
 document.querySelectorAll('.remove-category').forEach(b=>b.onclick=()=>deleteCategoryImage(b.dataset.category));
}
async function uploadCategory(category,file){
 if(!file)return; if(!file.type.startsWith('image/')){alert('Please choose an image.');return} if(file.size>6*1024*1024){alert('Please keep category images under 6MB.');return}
 const old=state.categories.find(x=>x.category.toLowerCase()===category.toLowerCase());
 const path=`categories/${slug(category)}/${Date.now()}.${imageExt(file)}`;
 try{const url=await uploadFile(file,path);const {error}=await sb.from('category_images').upsert({category,image_url:url,storage_path:path},{onConflict:'category'});if(error)throw error;if(old?.storage_path)await removeStorage(old.storage_path);await refresh();renderCategories(document.querySelector('#main'));}catch(err){await removeStorage(path);alert(err.message||String(err));}
}
async function deleteCategoryImage(category){
 if(!confirm(`Delete the image for ${category}?`))return; const old=state.categories.find(x=>x.category.toLowerCase()===category.toLowerCase());
 const {error}=await sb.from('category_images').delete().eq('category',category);if(error){alert(error.message);return;}if(old?.storage_path)await removeStorage(old.storage_path);await refresh();renderCategories(document.querySelector('#main'));
}
function renderInquiries(m){
 const statuses=['new','contacted','completed','cancelled'];
 const statusLabels={new:'New',contacted:'Contacted',completed:'Completed',cancelled:'Cancelled'};
 const statusClass=v=>`status-badge status-${esc(v)}`;
 const formatDate=v=>{try{return new Date(v).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return v||'—';}};
 const renderRows=()=>{
   const q=(document.querySelector('#inquirySearch')?.value||'').trim().toLowerCase();
   const filter=document.querySelector('#inquiryStatusFilter')?.value||'all';
   const rows=state.inquiries.filter(x=>{
     const hay=[x.name,x.email,x.phone,x.service,x.message,x.status].map(v=>String(v??'').toLowerCase()).join(' ');
     return (!q||hay.includes(q))&&(filter==='all'||x.status===filter);
   });
   const tbody=document.querySelector('#inquiryRows');
   if(!tbody)return;
   tbody.innerHTML=rows.length?rows.map(x=>`<tr>
     <td><div class="date-main">${esc(formatDate(x.created_at))}</div></td>
     <td><b>${esc(x.name||'—')}</b><div class="small">${esc(x.email||'No email')}</div></td>
     <td>${esc(x.phone||'—')}</td>
     <td>${esc(x.service||'—')}</td>
     <td><span class="message-preview">${esc(x.message||'—')}</span></td>
     <td><select class="status-select ${statusClass(x.status||'new')}" data-id="${esc(x.id)}" aria-label="Change inquiry status">${statuses.map(v=>`<option value="${v}" ${x.status===v?'selected':''}>${statusLabels[v]}</option>`).join('')}</select></td>
     <td><button class="btn-sm btn-view view-inquiry" data-id="${esc(x.id)}">View</button></td>
   </tr>`).join(''):`<tr><td colspan="7"><div class="empty-state"><strong>No inquiries found</strong><span>Try changing the search or filters.</span></div></td></tr>`;
   document.querySelector('#inquiryCount').textContent=`${rows.length} ${rows.length===1?'inquiry':'inquiries'}`;
   document.querySelectorAll('.status-select').forEach(select=>select.onchange=async()=>{
     const value=select.value, id=select.dataset.id;
     select.className=`status-select ${statusClass(value)}`;
     const {error}=await sb.from('inquiries').update({status:value}).eq('id',id);
     if(error){alert(error.message);await refresh();renderInquiries(document.querySelector('#main'));return;}
     const item=state.inquiries.find(x=>x.id===id);if(item)item.status=value;
   });
   document.querySelectorAll('.view-inquiry').forEach(b=>b.onclick=()=>openInquiryModal(state.inquiries.find(x=>x.id===b.dataset.id)));
 };
 m.innerHTML=`<div class="toolbar"><div><div class="eyebrow">Customer requests</div><h2>Inquiries</h2></div><span id="inquiryCount" class="results-count"></span></div>
 <div class="panel inquiry-tools"><div class="search-wrap"><span class="search-icon">⌕</span><input id="inquirySearch" class="search-input" type="search" placeholder="Search name, phone, email, service or message..."></div>
 <div class="filter-wrap"><label for="inquiryStatusFilter">Status</label><select id="inquiryStatusFilter" class="filter-select"><option value="all">All statuses</option>${statuses.map(v=>`<option value="${v}">${statusLabels[v]}</option>`).join('')}</select></div></div>
 <div class="panel"><div class="tablewrap"><table class="table inquiry-table"><thead><tr><th>Date</th><th>Customer</th><th>Phone</th><th>Service</th><th>Message</th><th>Status</th><th></th></tr></thead><tbody id="inquiryRows"></tbody></table></div></div>
 <div id="inquiryModal" class="modal-backdrop" aria-hidden="true"></div>`;
 document.querySelector('#inquirySearch').oninput=renderRows;
 document.querySelector('#inquiryStatusFilter').onchange=renderRows;
 renderRows();
}
function openInquiryModal(x){
 if(!x)return;
 const modal=document.querySelector('#inquiryModal');
 const statusLabels={new:'New',contacted:'Contacted',completed:'Completed',cancelled:'Cancelled'};
 const status=x.status||'new';
 modal.innerHTML=`<div class="modal-card inquiry-modal" role="dialog" aria-modal="true" aria-labelledby="inquiryModalTitle">
   <div class="modal-head"><div><div class="eyebrow">Customer inquiry</div><h3 id="inquiryModalTitle">${esc(x.name||'Inquiry details')}</h3></div><button class="modal-close" id="closeInquiryModal" aria-label="Close">×</button></div>
   <div class="inquiry-detail-grid">
     <div class="detail-item"><span>Submitted</span><strong>${esc(new Date(x.created_at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}))}</strong></div>
     <div class="detail-item"><span>Status</span><strong><span class="status-badge status-${esc(status)}">${esc(statusLabels[status]||status)}</span></strong></div>
     <div class="detail-item"><span>Phone / WhatsApp</span><strong>${esc(x.phone||'—')}</strong></div>
     <div class="detail-item"><span>Email</span><strong>${esc(x.email||'—')}</strong></div>
     <div class="detail-item"><span>Service</span><strong>${esc(x.service||'—')}</strong></div>
     <div class="detail-item"><span>Inquiry ID</span><strong class="detail-id">${esc(x.id||'—')}</strong></div>
   </div>
   <div class="detail-message"><span>Message</span><p>${esc(x.message||'No message provided.')}</p></div>
 </div>`;
 modal.classList.add('open');modal.setAttribute('aria-hidden','false');
 const close=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');};
 document.querySelector('#closeInquiryModal').onclick=close;
 modal.onclick=e=>{if(e.target===modal)close();};
 document.onkeydown=e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close();};
}
async function renderSettings(m){
 const {data:s,error}=await sb.from('site_settings').select('*').eq('id',1).maybeSingle(); if(error)console.error(error);
 m.innerHTML=`<div class="toolbar"><div><div class="eyebrow">Website</div><h2>Site settings</h2></div></div>
 <div class="panel"><form id="settingsForm"><div class="grid2"><div class="field"><label>Hero title</label><input name="hero_title" value="${esc(s?.hero_title||'')}"></div><div class="field"><label>Instagram URL</label><input name="instagram_url" value="${esc(s?.instagram_url||cfg.INSTAGRAM_URL||'')}"></div><div class="field"><label>Phone</label><input name="phone" value="${esc(s?.phone||'')}"></div><div class="field"><label>WhatsApp</label><input name="whatsapp" value="${esc(s?.whatsapp||'')}"></div><div class="field"><label>Email</label><input name="email" type="email" value="${esc(s?.email||'')}"></div><div class="field"><label>Currency code</label><select name="currency_code"><option value="USD" ${String(s?.currency_code||'USD').toUpperCase()==='USD'?'selected':''}>USD — US Dollar</option><option value="EUR" ${String(s?.currency_code||'').toUpperCase()==='EUR'?'selected':''}>EUR — Euro</option><option value="LBP" ${String(s?.currency_code||'').toUpperCase()==='LBP'?'selected':''}>LBP — Lebanese Pound</option><option value="GBP" ${String(s?.currency_code||'').toUpperCase()==='GBP'?'selected':''}>GBP — British Pound</option></select></div><div class="field"><label>Currency symbol</label><input name="currency_symbol" value="${esc(s?.currency_symbol||'$')}" maxlength="8" placeholder="$"></div></div>
 <div class="field"><label>Hero text</label><textarea name="hero_text">${esc(s?.hero_text||'')}</textarea></div>
 <div class="field"><label>Website logo</label><input id="logoFile" type="file" accept="image/*"><div class="small" style="margin-top:7px">Upload/replace the logo in Supabase Storage. Max 6MB.</div></div>
 <div class="image-editor"><img id="logoPreview" src="${esc(remoteImage(s?.logo_url)||'')}" alt="Logo preview"><div class="actions"><button type="button" class="btn-sm btn-danger" id="deleteLogo" ${s?.logo_url?'':'disabled'}>Delete logo</button></div><div class="small">${s?.logo_storage_path?esc(s.logo_storage_path):'No Supabase logo uploaded yet.'}</div></div>
 <div class="actions"><button class="btn btn-primary">Save settings</button></div></form></div>`;
 const file=document.querySelector('#logoFile'); file.onchange=()=>{const f=file.files[0];if(!f)return;if(!f.type.startsWith('image/')){alert('Please choose an image.');file.value='';return}if(f.size>6*1024*1024){alert('Please keep the logo under 6MB.');file.value='';return}document.querySelector('#logoPreview').src=URL.createObjectURL(f);};
 document.querySelector('#deleteLogo').onclick=async()=>{if(!s?.logo_url)return;if(!confirm('Delete the website logo from Supabase?'))return; if(s.logo_storage_path)await removeStorage(s.logo_storage_path);const {error}=await sb.from('site_settings').update({logo_url:null,logo_storage_path:null}).eq('id',1);if(error){alert(error.message);return;}renderSettings(document.querySelector('#main'));};
 document.querySelector('#settingsForm').onsubmit=async e=>{
   e.preventDefault(); const o=Object.fromEntries(new FormData(e.currentTarget)); delete o.image_file;
   const logoFile=file.files[0]; let newPath=null;
   try{
     if(logoFile){newPath=`branding/logo-${Date.now()}.${imageExt(logoFile)}`;const url=await uploadFile(logoFile,newPath);o.logo_url=url;o.logo_storage_path=newPath;}
     else {delete o.logo_url;delete o.logo_storage_path;}
     const {error}=await sb.from('site_settings').update(o).eq('id',1); if(error)throw error;
     if(logoFile && s?.logo_storage_path)await removeStorage(s.logo_storage_path);
     alert('Settings saved.'); await renderSettings(document.querySelector('#main'));
   }catch(err){if(newPath)await removeStorage(newPath);alert(err.message||String(err));}
 };
}
async function start(){
 if(!sb){login();return}
 const {data:{session}}=await sb.auth.getSession(); if(!session){login();return}
 if(!(await ensureAdmin()))return;
 shell(); document.querySelector('#userEmail').textContent=session.user.email||''; await refresh();
 const {data:settings}=await sb.from('site_settings').select('*').eq('id',1).maybeSingle(); if(settings){siteSettings=settings; const logo=currentLogo(); const el=document.querySelector('#crmLogo'); if(el&&logo)el.src=logo;}
 renderTab();
}
sb?.auth.onAuthStateChange((_event,session)=>{if(session){setTimeout(start,0);}else{setTimeout(login,0);}});
start();
})();
