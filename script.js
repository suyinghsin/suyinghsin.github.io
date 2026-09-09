const items=document.querySelectorAll('.reveal');
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver' in window&&!reduceMotion){
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;setTimeout(()=>entry.target.classList.add('is-visible'),Number(entry.target.dataset.delay||0));observer.unobserve(entry.target)})},{threshold:.12});
  items.forEach(item=>observer.observe(item));
}else{
  items.forEach(item=>item.classList.add('is-visible'));
}

const glow=document.querySelector('.cursor-glow');
if(glow&&!reduceMotion&&window.matchMedia('(pointer: fine)').matches){window.addEventListener('pointermove',e=>{glow.style.left=`${e.clientX}px`;glow.style.top=`${e.clientY}px`},{passive:true})}

const homePage=document.querySelector('.home-page');
if(homePage&&!reduceMotion){
  requestAnimationFrame(()=>homePage.classList.add('home-motion-ready'));
}

const homeHero=homePage?.querySelector('.home-hero');
const heroCompass=homeHero?.querySelector('.hero-compass');
const heroTitle=homeHero?.querySelector('.hero-title');
if(heroTitle&&!reduceMotion){
  const letters=[];
  heroTitle.querySelectorAll('.hero-title-row').forEach(row=>{
    const rowText=row.textContent.trim();
    row.textContent='';
    [...rowText].forEach(letter=>{
      const glyph=document.createElement('span');
      glyph.className='hero-title-char';
      glyph.textContent=letter===' ' ? '\u00a0' : letter;
      glyph.setAttribute('aria-hidden','true');
      row.append(glyph);
      letters.push(glyph);
    });
  });
  requestAnimationFrame(()=>letters.forEach((glyph,index)=>{
    glyph.animate([
      {opacity:0,transform:'translateY(112%) rotate(8deg)',filter:'blur(8px)'},
      {opacity:1,transform:'translateY(0) rotate(0)',filter:'blur(0)'}
    ],{
      duration:760,
      delay:210+index*72,
      easing:'cubic-bezier(.16, 1, .3, 1)',
      fill:'both'
    });
  }));
}
if(homeHero&&heroCompass&&!reduceMotion&&window.matchMedia('(pointer: fine)').matches){
  let heroPointerFrame;
  homeHero.addEventListener('pointermove',event=>{
    const bounds=homeHero.getBoundingClientRect();
    const offsetX=(event.clientX-bounds.left)/bounds.width-.5;
    const offsetY=(event.clientY-bounds.top)/bounds.height-.5;
    cancelAnimationFrame(heroPointerFrame);
    heroPointerFrame=requestAnimationFrame(()=>{
      homeHero.style.setProperty('--hero-pointer-x',`${offsetX*18}px`);
      homeHero.style.setProperty('--hero-pointer-y',`${offsetY*14}px`);
      if(heroCompass){
        const angle=Math.atan2(event.clientY-(bounds.top+bounds.height/2),event.clientX-(bounds.left+bounds.width/2))*180/Math.PI+90;
        heroCompass.style.setProperty('--compass-angle',`${angle}deg`);
      }
    });
  },{passive:true});
  homeHero.addEventListener('pointerleave',()=>{
    homeHero.style.setProperty('--hero-pointer-x','0px');
    homeHero.style.setProperty('--hero-pointer-y','0px');
    heroCompass?.style.setProperty('--compass-angle','0deg');
  });
}

const stackedProjects=[...document.querySelectorAll('.home-page .project-card')];
stackedProjects.forEach((card,index)=>{
  card.style.zIndex=String(index+1);
  card.style.setProperty('--stack-index',String(index));
});

if(!reduceMotion&&window.matchMedia('(pointer: fine)').matches){document.querySelectorAll('.tilt').forEach(card=>{card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5,b=Number(card.dataset.tilt||0);card.style.transform=`rotate(${b}deg) rotateX(${-y*4}deg) rotateY(${x*6}deg) translateY(-4px)`});card.addEventListener('pointerleave',()=>{card.style.transform=`rotate(${Number(card.dataset.tilt||0)}deg)`})})}

const languageButton=document.querySelector('.language-toggle');
const languageNodes=document.querySelectorAll('[data-zh][data-en]');
let savedLanguage='zh';
try{savedLanguage=localStorage.getItem('portfolio-language')||'zh'}catch(error){}

function setLocalizedText(node,value){
  const parts=(value||'').split(/<br\s*\/?\s*>/i);
  if(parts.length===1){node.textContent=value;return}
  const content=[];
  parts.forEach((part,index)=>{
    if(index)content.push(document.createElement('br'));
    content.push(document.createTextNode(part));
  });
  node.replaceChildren(...content);
}

function setLanguage(language){
  document.documentElement.lang=language==='zh'?'zh-Hant':'en';
  languageNodes.forEach(node=>{setLocalizedText(node,node.dataset[language])});
  document.querySelectorAll('.lang-zh').forEach(node=>node.classList.toggle('active',language==='zh'));
  document.querySelectorAll('.lang-en').forEach(node=>node.classList.toggle('active',language==='en'));
  if(languageButton){
    languageButton.setAttribute('aria-label',language==='zh'?'切換為英文':'Switch to Chinese');
    languageButton.setAttribute('title',language==='zh'?'切換為英文':'Switch to Chinese');
  }
  try{localStorage.setItem('portfolio-language',language)}catch(error){}
}

setLanguage(savedLanguage);
if(languageButton){languageButton.addEventListener('click',()=>{const next=document.documentElement.lang.startsWith('zh')?'en':'zh';setLanguage(next)})}

const caseSections=[...document.querySelectorAll('[data-case-section]')];
const caseProgress=[...document.querySelectorAll('[data-progress]')];
if(caseSections.length&&caseProgress.length&&'IntersectionObserver' in window){
  const sectionObserver=new IntersectionObserver(entries=>{
    const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    caseProgress.forEach(link=>link.classList.toggle('is-active',link.dataset.progress===visible.target.id));
  },{rootMargin:'-32% 0px -48% 0px',threshold:[0,.2,.5]});
  caseSections.forEach(section=>sectionObserver.observe(section));
}

const productStage=document.querySelector('[data-product-stage]');
const productSteps=document.querySelectorAll('[data-product-step]');
if(productStage&&productSteps.length&&'IntersectionObserver' in window){
  const productImage=productStage.querySelector('[data-product-image]');
  const productSecondary=productStage.querySelector('[data-product-secondary]');
  const productLabel=productStage.querySelector('.product-stage__label');
  const productCount=productStage.querySelector('[data-product-count]');
  const productObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      const step=entry.target;
      productSteps.forEach(item=>item.classList.toggle('is-active',item===step));
      productStage.classList.add('is-changing');
      window.setTimeout(()=>{
        productStage.dataset.productStage=step.dataset.stage;
        productImage.src=step.dataset.image;
        productImage.alt=step.querySelector('h3').textContent;
        if(productSecondary&&step.dataset.secondary)productSecondary.src=step.dataset.secondary;
        productLabel.textContent=step.dataset.label;
        productCount.textContent=step.dataset.count;
        productStage.classList.remove('is-changing');
      },180);
    });
  },{rootMargin:'-38% 0px -38% 0px',threshold:0});
  productSteps.forEach(step=>productObserver.observe(step));
}
