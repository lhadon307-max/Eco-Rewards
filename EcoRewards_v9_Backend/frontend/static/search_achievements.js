/* Progressive enhancement for native select elements: type to filter categories and other lists.
 * Original selects remain DOM form controls; existing handlers receive change events. */
(function(){'use strict';
 function enhance(select){if(select.dataset.ecoEnhanced||select.multiple||select.disabled||select.options.length<4)return;
  select.dataset.ecoEnhanced='1'; const wrap=document.createElement('div');wrap.className='eco-picker';
  select.parentNode.insertBefore(wrap,select);wrap.appendChild(select);
  const input=document.createElement('input');input.className='eco-picker-search';input.type='text';input.autocomplete='off';
  input.setAttribute('aria-label','Search '+(select.closest('div')?.querySelector('label')?.textContent||'options').trim());
  input.placeholder='Search or select…';wrap.insertBefore(input,select);
  const menu=document.createElement('div');menu.className='eco-picker-menu';menu.setAttribute('role','listbox');wrap.appendChild(menu);
  let active=0;
  const options=()=>Array.from(select.options).filter(o=>!o.disabled);
  const sync=()=>{const chosen=select.selectedOptions[0];input.value=chosen&&chosen.value?chosen.textContent.trim():''};
  function close(){wrap.classList.remove('open');menu.innerHTML='';}
  function show(){const q=input.value.trim().toLocaleLowerCase();const list=options().filter(o=>o.textContent.toLocaleLowerCase().includes(q));
   menu.replaceChildren();active=0;
   if(!list.length){const empty=document.createElement('div');empty.className='eco-picker-empty';empty.textContent='No matching categories or options';menu.appendChild(empty)}
   list.forEach((o,i)=>{const button=document.createElement('button');button.type='button';button.className='eco-picker-option';button.textContent=o.textContent;button.setAttribute('role','option');if(i===active)button.classList.add('is-active');button.addEventListener('mousedown',e=>e.preventDefault());button.addEventListener('click',()=>{select.value=o.value;select.dispatchEvent(new Event('change',{bubbles:true}));sync();close()});menu.appendChild(button)});wrap.classList.add('open');}
  input.addEventListener('focus',()=>{input.select();show()});input.addEventListener('input',show);
  input.addEventListener('keydown',e=>{const buttons=[...menu.querySelectorAll('.eco-picker-option')];if(e.key==='Escape'){close();sync();return}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!wrap.classList.contains('open'))show();active=(active+(e.key==='ArrowDown'?1:-1)+buttons.length)%Math.max(1,buttons.length);buttons.forEach((b,i)=>b.classList.toggle('is-active',i===active));buttons[active]?.scrollIntoView({block:'nearest'})}if(e.key==='Enter'&&wrap.classList.contains('open')){e.preventDefault();buttons[active]?.click()}});
  input.addEventListener('blur',()=>setTimeout(()=>{if(!wrap.contains(document.activeElement)){close();sync()}},120));
  document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target)){close();sync()}});
  const observer=new MutationObserver(()=>{if(!wrap.classList.contains('open'))sync()});observer.observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['selected']});
  select.addEventListener('change',sync);sync();
 }
 function start(){document.querySelectorAll('select').forEach(enhance)}
 let pending=false;const observer=new MutationObserver(()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;start()})}});
 function init(){start();observer.observe(document.body,{childList:true,subtree:true})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
