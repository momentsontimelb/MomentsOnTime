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
   document.querySelector('#categoryGrid').innerHTML='<div class="empty">Connect your Supabase publishable/anon key in <b>config.js</b> to load the website.</div>';
   document.querySelector('#serviceGrid').innerHTML='<div class="empty">The website is ready; add the Supabase key to show your live services.</div>';
   document.querySelector('#heroSlider').innerHTML='<div class="empty">Connect Supabase to load service images.</div>';
   return;
 }
 const [{data:services,error:sErr},{data:images,error:iErr},{data:settings,error:setErr}] = await Promise.all([
   supabase.from('services').select('*').eq('is_active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false}),
   supabase.from('category_images').select('*'),
   supabase.from('site_settings').select('*').eq('id',1).maybeSingle()
 ]);
 siteSettings=settings||{};
 if(sErr){console.error(sErr); toast('Could not load services. Check Supabase setup.');}
 if(iErr) console.error(iErr);
 if(setErr) console.error(setErr);
 if(settings){
   if(settings.hero_title) document.querySelector('h1').textContent=settings.hero_title;
   if(settings.hero_text) document.querySelector('#heroText').textContent=settings.hero_text;
   if(settings.instagram_url){document.querySelector('#instagramLink').href=settings.instagram_url;document.querySelector('#footerInstagram').href=settings.instagram_url;}
   setLogoElements(settings.logo_url);
 }
 renderHeroSlider(services||[]);
 const imageMap = new Map((images||[]).map(x=>[String(x.category||'').trim().toLowerCase(),remoteImage(x.image_url)]));
 const seen = new Set(), cats=[];
 for(const s of (services||[])){
   const c=(s.category||'').trim(); if(!c) continue;
   const k=c.toLowerCase(); if(!seen.has(k)){seen.add(k); cats.push(c);}
   if(cats.length===4) break;
 }
 const fallback=logoUrl();
 const categoryItems=cats.map(c=>({url:imageMap.get(c.toLowerCase())||fallback,alt:c,type:'category'}));
 const serviceItems=(services||[]).slice(0,9).map(s=>({url:remoteImage(s.image_url)||fallback,alt:s.name,type:'service'}));
 galleryItems=[...serviceItems,...categoryItems].filter(x=>remoteImage(x.url));
 const galleryIndexFor=(type,alt)=>galleryItems.findIndex(x=>x.type===type&&x.alt===alt);
 document.querySelector('#categoryGrid').innerHTML = cats.length ? cats.map(c=>{
   const img=imageMap.get(c.toLowerCase())||fallback;
   const gi=galleryIndexFor('category',c);
   return `<button class="category" type="button" data-lightbox-index="${gi}" aria-label="View ${esc(c)} image">${imageTag(img,c)}<span>${esc(c)}</span></button>`;
 }).join('') : '<div class="empty">Add services with categories in the CRM to populate these four cards.</div>';
 document.querySelector('#serviceGrid').innerHTML = (services||[]).slice(0,9).map(s=>{
   const gi=galleryIndexFor('service',s.name);
   return `<article class="service-card" data-lightbox-index="${gi}" tabindex="0" role="button" aria-label="View ${esc(s.name)} image">${imageTag(s.image_url,s.name)}<div class="service-body">
   <h3>${esc(s.name)}</h3><p>${esc(s.description||'Personalized by Moments On Time.')}</p>${s.price!=null?`<div class="price">${formatPrice(s.price)}</div>`:''}
   </div></article>`;
 }).join('') || '<div class="empty">No services yet.</div>';
 document.querySelectorAll('[data-lightbox-index]').forEach(el=>{
   const open=()=>openLightbox(Number(el.dataset.lightboxIndex));
   el.addEventListener('click',open);
   el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
 });
}

document.querySelector('#inquiryForm').addEventListener('submit', async e=>{
 e.preventDefault();
 if(!supabase){toast('Add your Supabase key first.');return;}
 const form=e.currentTarget;
 const phone=form.elements.phone.value.trim();
 if(!phone){form.elements.phone.focus();toast('Phone / WhatsApp is required.');return;}
 const obj=Object.fromEntries(new FormData(form).entries()); obj.phone=phone;
 const {error}=await supabase.from('inquiries').insert(obj);
 if(error){console.error(error);toast(error.message);return;}
 form.reset(); toast('Thank you — your request was sent.');
});
setupLightbox();
loadSite();
})();
