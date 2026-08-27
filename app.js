(() => {
const cfg = window.MOT_CONFIG || {};
const toast = (msg) => { const el=document.querySelector('#toast'); if(!el)return; el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),3000); };
const configured = cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_');
const supabase = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY) : null;
let siteSettings = null;
let heroSlides = [];
let heroIndex = 0;
let heroTimer = null;

document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelector('#instagramLink').href = cfg.INSTAGRAM_URL || 'https://www.instagram.com/momentsontime.lb/';
document.querySelector('#footerInstagram').href = cfg.INSTAGRAM_URL || 'https://www.instagram.com/momentsontime.lb/';

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function remoteImage(url){return /^https?:\/\//i.test(String(url||'')) ? String(url) : '';}
function logoUrl(){return remoteImage(siteSettings?.logo_url);}
function formatPrice(value){
 if(value===null || value===undefined || value==='') return '';
 const number=Number(value); if(!Number.isFinite(number)) return '';
 const symbol=String(siteSettings?.currency_symbol||'$');
 return `${esc(symbol)}${number.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}
function setLogoElements(url){
 const logo=remoteImage(url);
 document.querySelectorAll('img[data-site-logo]').forEach(img=>{
   if(logo){img.src=logo;img.onerror=()=>{img.removeAttribute('src');img.classList.add('image-unavailable');};}
 });
 const favicon=document.querySelector('link[rel="icon"]');
 if(favicon && logo) favicon.href=logo;
}
function imageTag(url, alt, className=''){
 const src=remoteImage(url) || logoUrl();
 return `<img class="${esc(className)}" src="${esc(src)}" alt="${esc(alt)}" data-fallback-logo="${esc(logoUrl())}" onerror="this.onerror=null;const f=this.dataset.fallbackLogo;if(f&&this.src!==f)this.src=f;else this.classList.add('image-unavailable');">`;
}

let galleryItems = [];
let galleryIndex = 0;

function openLightbox(index){
 const box=document.querySelector('#imageLightbox');
 const img=document.querySelector('#lightboxImage');
 const caption=document.querySelector('#lightboxCaption');
 if(!box || !img || !galleryItems.length) return;
 galleryIndex=(index+galleryItems.length)%galleryItems.length;
 const item=galleryItems[galleryIndex];
 img.onerror=()=>{img.onerror=null; const fallback=logoUrl(); if(fallback && img.src!==fallback) img.src=fallback;};
 img.src=item.url || logoUrl();
 img.alt=item.alt || 'Moments On Time';
 caption.textContent=item.alt || '';
 box.classList.add('open');
 box.setAttribute('aria-hidden','false');
 document.body.classList.add('lightbox-open');
}
function closeLightbox(){
 const box=document.querySelector('#imageLightbox');
 if(!box)return;
 box.classList.remove('open');
 box.setAttribute('aria-hidden','true');
 document.body.classList.remove('lightbox-open');
}
function moveLightbox(step){ if(galleryItems.length>1) openLightbox(galleryIndex+step); }

function setupLightbox(){
 document.querySelector('#lightboxClose')?.addEventListener('click',closeLightbox);
 document.querySelector('#lightboxPrev')?.addEventListener('click',()=>moveLightbox(-1));
 document.querySelector('#lightboxNext')?.addEventListener('click',()=>moveLightbox(1));
 document.querySelector('#imageLightbox')?.addEventListener('click',e=>{if(e.target.id==='imageLightbox')closeLightbox();});
 document.addEventListener('keydown',e=>{
   if(!document.querySelector('#imageLightbox')?.classList.contains('open'))return;
   if(e.key==='Escape')closeLightbox();
   if(e.key==='ArrowLeft')moveLightbox(-1);
   if(e.key==='ArrowRight')moveLightbox(1);
 });
}

function renderHeroSlider(services){
 const slider=document.querySelector('#heroSlider');
 const withImages=(services||[]).filter(s=>remoteImage(s.image_url));
 heroSlides=withImages.length ? withImages : [{name:'Moments On Time',description:'Personalized gifts, souvenirs and mirrors.',image_url:logoUrl()}];
 heroIndex=0;
 if(heroTimer) clearInterval(heroTimer);
 slider.innerHTML=`<div class="hero-slides">${heroSlides.map((s,i)=>`<div class="hero-slide ${i===0?'active':''}" data-slide="${i}">${imageTag(s.image_url,s.name||'Moments On Time','hero-slide-image')}<div class="hero-slide-overlay"><strong>${esc(s.name||'Moments On Time')}</strong>${s.price!=null?`<span>${formatPrice(s.price)}</span>`:''}</div></div>`).join('')}</div>
 <button class="slider-btn slider-prev" type="button" aria-label="Previous service image">‹</button><button class="slider-btn slider-next" type="button" aria-label="Next service image">›</button>
 <div class="slider-dots">${heroSlides.map((_,i)=>`<button type="button" class="slider-dot ${i===0?'active':''}" data-slide-to="${i}" aria-label="Go to slide ${i+1}"></button>`).join('')}</div>`;
 const show=(index)=>{
   heroIndex=(index+heroSlides.length)%heroSlides.length;
   slider.querySelectorAll('.hero-slide').forEach((x,i)=>x.classList.toggle('active',i===heroIndex));
   slider.querySelectorAll('.slider-dot').forEach((x,i)=>x.classList.toggle('active',i===heroIndex));
 };
 slider.querySelector('.slider-prev').onclick=()=>show(heroIndex-1);
 slider.querySelector('.slider-next').onclick=()=>show(heroIndex+1);
 slider.querySelectorAll('.slider-dot').forEach(b=>b.onclick=()=>show(Number(b.dataset.slideTo)));
 if(heroSlides.length>1) heroTimer=setInterval(()=>show(heroIndex+1),4500);
}

async function loadSite(){
 if(!supabase){
   document.querySelector('#categoryGrid').innerHTML='<div class="empty">Categories are being prepared.</div>';
   document.querySelector('#serviceGrid').innerHTML='<div class="empty">Our collection is being prepared.</div>';
   document.querySelector('#heroSlider').innerHTML='<div class="empty">Loading...</div>';
   return;
 }
 const [{data:services,error:sErr},{data:categories,error:cErr},{data:settings,error:setErr}] = await Promise.all([
   supabase.from('services').select('*').eq('is_active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false}),
   supabase.from('categories').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false}),
   supabase.from('site_settings').select('*').eq('id',1).maybeSingle()
 ]);
 siteSettings=settings||{};
 if(sErr){console.error(sErr); toast('Could not load the collection. Please try again.');}
 if(cErr) console.error(cErr);
 if(setErr) console.error(setErr);
 if(settings){
   const textMap={brand_name:'#brandName',nav_categories:'#navCategories',nav_services:'#navServices',nav_about:'#navAbout',nav_contact:'#navContact',nav_cta:'#navCta',hero_eyebrow:'#heroEyebrow',hero_title:'#heroTitle',hero_text:'#heroText',hero_primary_cta:'#heroPrimaryCta',hero_secondary_cta:'#heroSecondaryCta',categories_eyebrow:'#categoriesEyebrow',categories_title:'#categoriesTitle',categories_intro:'#categoriesIntro',category_more_label:'#categoryMore',services_eyebrow:'#servicesEyebrow',services_title:'#servicesTitle',services_intro:'#servicesIntro',service_more_label:'#serviceMore',about_eyebrow:'#aboutEyebrow',about_title:'#aboutTitle',about_quote:'#aboutQuote',about_text:'#aboutText',contact_eyebrow:'#contactEyebrow',contact_title:'#contactTitle',contact_intro:'#contactIntro',contact_side_text:'#contactSideText',form_name_label:'#formNameLabel',form_phone_label:'#formPhoneLabel',form_email_label:'#formEmailLabel',form_service_label:'#formServiceLabel',form_message_label:'#formMessageLabel',form_service_placeholder:'#formServiceInput',form_message_placeholder:'#formMessageInput',form_submit:'#formSubmit'};
   Object.entries(textMap).forEach(([key,selector])=>{const el=document.querySelector(selector);if(!el||settings[key]==null||settings[key]==='')return;if(key.endsWith('_placeholder'))el.placeholder=settings[key];else el.textContent=settings[key];});
   if(settings.instagram_url){document.querySelector('#instagramLink').href=settings.instagram_url;document.querySelector('#footerInstagram').href=settings.instagram_url;}
   setLogoElements(settings.logo_url);
 }
 renderHeroSlider(services||[]);
 const imageMap = new Map((categories||[]).map(x=>[String(x.name||'').trim().toLowerCase(),remoteImage(x.image_url)]));
 const categoryLimit=Math.max(1,Number(settings?.category_limit)||4);
 const serviceLimit=Math.max(1,Number(settings?.service_limit)||4);
 const cats = (categories||[]).filter(c=>c.is_visible!==false).slice(0,categoryLimit).map(c=>String(c.name||'').trim()).filter(Boolean);
 const fallback=logoUrl();
 const categoryItems=cats.map(c=>({url:imageMap.get(c.toLowerCase())||fallback,alt:c,type:'category'}));
 const serviceItems=(services||[]).map(s=>({url:remoteImage(s.image_url)||fallback,alt:s.name,type:'service'}));
 galleryItems=[...serviceItems,...categoryItems].filter(x=>remoteImage(x.url));
 const galleryIndexFor=(type,alt)=>galleryItems.findIndex(x=>x.type===type&&x.alt===alt);
 const visibleServices=(services||[]).filter(s=>s.is_active!==false && (categories||[]).some(c=>c.is_visible!==false && String(c.name||'').trim().toLowerCase()===String(s.category||'').trim().toLowerCase()));
 const renderCards=(items,limit,type)=>{const shown=items.slice(0,limit);return shown.map(item=>{const gi=galleryIndexFor(type,type==='category'?String(item.name||'').trim():item.name);if(type==='category'){const img=imageMap.get(String(item.name||'').trim().toLowerCase())||fallback;return `<article class="category"><button class="category-image-button" type="button" data-lightbox-index="${gi}" aria-label="Expand ${esc(item.name)} image">${imageTag(img,item.name)}</button><a class="category-name" href="category.html?category=${encodeURIComponent(item.name)}" aria-label="View services in ${esc(item.name)}">${esc(item.name)}</a></article>`;}return `<article class="service-card" data-lightbox-index="${gi}" tabindex="0" role="button" aria-label="View ${esc(item.name)} image">${imageTag(item.image_url,item.name)}<div class="service-body"><h3>${esc(item.name)}</h3><p>${esc(item.description||'Personalized by Moments On Time.')}</p>${item.price!=null?`<div class="price">${formatPrice(item.price)}</div>`:''}</div></article>`;}).join('');};
 document.querySelector('#categoryGrid').innerHTML = cats.length ? renderCards((categories||[]).filter(c=>c.is_visible!==false),categoryLimit,'category') : '<div class="empty">No categories available.</div>';
 document.querySelector('#serviceGrid').innerHTML = visibleServices.length ? renderCards(visibleServices,serviceLimit,'service') : '<div class="empty">No services available.</div>';
 const catMore=document.querySelector('#categoryMore');if(catMore){catMore.hidden=(categories||[]).filter(c=>c.is_visible!==false).length<=categoryLimit;catMore.onclick=()=>{const next=Math.min(categoryLimit*2,(categories||[]).filter(c=>c.is_visible!==false).length);document.querySelector('#categoryGrid').innerHTML=renderCards((categories||[]).filter(c=>c.is_visible!==false),next,'category');bindGallery();catMore.textContent=next<(categories||[]).filter(c=>c.is_visible!==false).length?'Show more':'Show less';catMore.onclick=()=>{if(catMore.textContent==='Show less'){document.querySelector('#categoryGrid').innerHTML=renderCards((categories||[]).filter(c=>c.is_visible!==false),categoryLimit,'category');bindGallery();catMore.textContent='Show more';}else{const n=Math.min(next*2,(categories||[]).filter(c=>c.is_visible!==false).length);document.querySelector('#categoryGrid').innerHTML=renderCards((categories||[]).filter(c=>c.is_visible!==false),n,'category');bindGallery();catMore.textContent=n<(categories||[]).filter(c=>c.is_visible!==false).length?'Show more':'Show less';}};};}
 const svcMore=document.querySelector('#serviceMore');if(svcMore){svcMore.hidden=visibleServices.length<=serviceLimit;svcMore.onclick=()=>{const total=visibleServices.length;const shown=document.querySelectorAll('#serviceGrid .service-card').length;const next=Math.min(shown+serviceLimit,total);document.querySelector('#serviceGrid').innerHTML=renderCards(visibleServices,next,'service');bindGallery();svcMore.textContent=next<total?'Show more':'Show less';svcMore.onclick=()=>{if(svcMore.textContent==='Show less'){document.querySelector('#serviceGrid').innerHTML=renderCards(visibleServices,serviceLimit,'service');bindGallery();svcMore.textContent='Show more';}else{const n=Math.min(document.querySelectorAll('#serviceGrid .service-card').length+serviceLimit,total);document.querySelector('#serviceGrid').innerHTML=renderCards(visibleServices,n,'service');bindGallery();svcMore.textContent=n<total?'Show more':'Show less';}};};}
 const bindGallery=()=>document.querySelectorAll('[data-lightbox-index]').forEach(el=>{if(el.dataset.bound)return;el.dataset.bound='1';const open=()=>openLightbox(Number(el.dataset.lightboxIndex));el.addEventListener('click',open);if(el.tagName!=='BUTTON'){el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});}});bindGallery();
}

document.querySelector('#inquiryForm').addEventListener('submit', async e=>{
 e.preventDefault();
 if(!supabase){toast('Please try again later.');return;}
 const form=e.currentTarget;
 const phone=form.elements.phone.value.trim();
 const service=form.elements.service.value.trim();
 const message=form.elements.message.value.trim();
 if(!phone){form.elements.phone.focus();toast('Phone / WhatsApp is required.');return;}
 if(!service){form.elements.service.focus();toast('Service / category is required.');return;}
 if(!message){form.elements.message.focus();toast('Message is required.');return;}
 const obj=Object.fromEntries(new FormData(form).entries()); obj.phone=phone; obj.service=service; obj.message=message;
 const {data,error}=await supabase.from('inquiries').insert(obj).select('inquiry_number').single();
 if(error){console.error(error);toast(error.message);return;}
 form.reset();
 const number=data?.inquiry_number || 'pending';
 toast(`Request received — your inquiry number is ${number}. Please keep it for your call.`);
});
setupLightbox();
loadSite();
})();
