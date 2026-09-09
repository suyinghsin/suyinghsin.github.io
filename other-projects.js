const filters=document.querySelectorAll('[data-filter]');
const cards=document.querySelectorAll('.work-card');
const count=document.querySelector('#work-count');

filters.forEach(button=>button.addEventListener('click',()=>{
  const filter=button.dataset.filter;
  filters.forEach(item=>item.classList.toggle('is-active',item===button));
  let visible=0;
  cards.forEach(card=>{
    const show=filter==='all'||card.dataset.category===filter;
    card.classList.toggle('is-hidden',!show);
    if(show)visible+=1;
  });
  count.textContent=String(visible).padStart(2,'0');
}));
