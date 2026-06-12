const STORAGE_KEY = 'foundation_os_v2_entries';
const THEME_KEY = 'foundation_os_theme';
const domains = {
  exercise: { label:'Exercise', signal:'Movement', prompts:['30 min walk','Basketball','Swim','Strength circuit','Run'] },
  nutrition: { label:'Nutrition', signal:'Fuel', prompts:['Coffee','Ground beef + salad','Oatmeal','Protein meal','Hydration'] },
  sleep: { label:'Sleep', signal:'Recovery', prompts:['Slept well','Interrupted sleep','Nap','Early wake','High quality'] },
  connection: { label:'Connection', signal:'Closeness', prompts:['Quality talk','Walk together','Affection','Intimacy','Family time'] }
};
let entries = loadEntries();

function todayKey(d=new Date()){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function timeText(iso){ return new Date(iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
function dateLabel(key){ const d = new Date(key+'T12:00:00'); return d.toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'}); }
function loadEntries(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function saveEntries(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); render(); }
function getTodayEntries(domain){ return entries.filter(e => e.date === todayKey() && (!domain || e.domain === domain)); }
function getDomainScore(domain){ const n=getTodayEntries(domain).length; if(domain==='exercise'){ const mins=getTodayEntries(domain).reduce((a,e)=>a+(parseInt(e.meta?.extra)||0),0); return Math.min(100, mins ? Math.round(mins/45*80) : n*35); } return Math.min(100, n*75); }
function foundationScore(){ const vals = Object.keys(domains).map(getDomainScore); return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length); }
function escapeHtml(str=''){ return str.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function init(){
  const savedTheme = localStorage.getItem(THEME_KEY); if(savedTheme === 'dark') document.documentElement.classList.add('dark');
  document.getElementById('todayDate').textContent = dateLabel(todayKey()); document.querySelectorAll('.date-pill span').forEach(s=>s.textContent=dateLabel(todayKey()));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  document.querySelectorAll('.quick-form').forEach(form => form.addEventListener('submit', handleSubmit));
  document.getElementById('themeBtn').addEventListener('click', toggleTheme); document.querySelectorAll('input[type="time"]').forEach(i=>i.addEventListener('input', updateSleepTotal)); document.querySelectorAll('#qualityBtns button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#qualityBtns button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); updateSleepTotal();}));
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importFile').addEventListener('change', importData);
  document.getElementById('clearBtn').addEventListener('click', clearAll);
  renderChips(); render();
}
function switchView(id){ document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===id)); }
function handleSubmit(e){
  e.preventDefault(); const form=e.currentTarget; const domain=form.dataset.domain; let text=''; let meta={};
  if(domain === 'sleep'){
    const bed=form.querySelector('input[name="bed"]').value; const wake=form.querySelector('input[name="wake"]').value; const note=form.querySelector('textarea').value.trim(); const quality=document.querySelector('#qualityBtns button.active')?.textContent || 'Good';
    const total=calcSleep(bed,wake); text = [bed && `Bed ${bed}`, wake && `Wake ${wake}`, total && `Total ${total}`, `Quality ${quality}`, note].filter(Boolean).join(' · ');
    meta={bed,wake,total,quality}; if(!text) return;
  } else {
    text = form.querySelector('textarea').value.trim();
    const extras = Array.from(form.querySelectorAll('input')).map(i=>i.value.trim()).filter(Boolean); if(extras.length) meta.extra = extras.join(' · '); if(!text) return;
  }
  entries.unshift({ id: crypto.randomUUID(), domain, text, meta, date: todayKey(), createdAt: new Date().toISOString() });
  form.reset(); saveEntries();
}

function exerciseMinutes(){ return getTodayEntries('exercise').reduce((a,e)=>{ const m=(e.text.match(/(\d+)\s*min/i)||[])[1] || (e.meta?.extra?.match(/^(\d+)/)||[])[1]; return a+(parseInt(m)||0); },0); }
function latestSleepSummary(){ const e=getTodayEntries('sleep')[0]; return e?.meta?.total || (e?'Logged':'Not logged'); }
function calcSleep(bed,wake){ if(!bed||!wake) return ''; const [bh,bm]=bed.split(':').map(Number), [wh,wm]=wake.split(':').map(Number); let mins=(wh*60+wm)-(bh*60+bm); if(mins<0) mins+=1440; const h=Math.floor(mins/60), m=mins%60; return `${h}h ${String(m).padStart(2,'0')}m`; }
function updateSleepTotal(){ const bed=document.querySelector('input[name="bed"]')?.value; const wake=document.querySelector('input[name="wake"]')?.value; const total=calcSleep(bed,wake); const el=document.getElementById('sleepTotal'); const badge=document.getElementById('sleepBadge'); if(el){ el.textContent=total||'—'; badge.textContent=total?'Good':'Not set'; } }
function renderMetrics(){ const mins=exerciseMinutes(); const exCount=getTodayEntries('exercise').length; setText('exerciseMetric', `${mins || 0} min`); setText('exerciseSub', exCount?`${exCount} activity${exCount===1?'':'ies'}`:'No activity yet'); setText('exerciseScore', getDomainScore('exercise')); const nutCount=getTodayEntries('nutrition').length; setText('nutritionMetric', `${nutCount} entr${nutCount===1?'y':'ies'}`); setText('nutritionScore', getDomainScore('nutrition')); const conCount=getTodayEntries('connection').length; setText('connectionSub', conCount?`${conCount} connection entr${conCount===1?'y':'ies'}`:'No connection entries yet'); setText('connectionScore', getDomainScore('connection')); }
function setText(id,val){ const el=document.getElementById(id); if(el) el.textContent=val; }

function render(){ renderDashboard(); renderDomainEntries(); renderMetrics(); updateSleepTotal(); }
function renderDashboard(){
  const score = foundationScore(); document.getElementById('todayScore').textContent = `${score}%`; document.getElementById('ringValue').textContent = score;
  document.querySelector('.ring').style.opacity = .45 + (score/100)*.55;
  const icons={sleep:'☾',exercise:'↔',nutrition:'◒',connection:'♡'}; const names={nutrition:'Fuel'}; const cardWrap=document.getElementById('domainCards');
  cardWrap.innerHTML = ['sleep','exercise','nutrition','connection'].map(key=>{ const d=domains[key]; const count=getTodayEntries(key).length; const score=getDomainScore(key); const meta=key==='sleep' ? latestSleepSummary() : key==='exercise' ? `${exerciseMinutes()} min` : key==='nutrition' ? `${count} entries` : count ? 'Meaningful time' : 'Not logged'; const color=key==='sleep'?'#dbeafe':key==='exercise'?'#dcfce7':key==='nutrition'?'#ffedd5':'#fce7f3'; return `<article class="summary-row" onclick="switchView('${key}')"><div class="summary-icon" style="background:${color}">${icons[key]}</div><div><div class="summary-title">${names[key]||d.label}</div><div class="summary-meta">${meta} ${count?'· Today':''}</div></div><div class="summary-score">${score}<div class="small muted">/100</div></div><div class="chev">›</div></article>`; }).join('');
  const todays=getTodayEntries(); document.getElementById('entryCount').textContent = `${todays.length} ${todays.length===1?'entry':'entries'}`;
  const list=document.getElementById('todayEntries'); list.classList.toggle('empty', !todays.length); list.innerHTML = todays.length ? todays.map(entryHtml).join('') : 'No entries yet.';
  renderWeekBars();
}
function renderWeekBars(){
  const wrap=document.getElementById('weekBars'); const now=new Date(); const days=[];
  for(let i=6;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); const key=todayKey(d); const completed=Object.keys(domains).filter(domain=>entries.some(e=>e.date===key && e.domain===domain)).length; days.push({key,completed}); }
  wrap.innerHTML = days.map(day=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(6, day.completed/4*78)}px"></div><span>${dateLabel(day.key).split(' ')[0]}</span></div>`).join(''); document.getElementById('trendLabel').textContent = days.at(-1).completed>=3?'Great momentum':'Building signal';
}
function renderDomainEntries(){
  document.querySelectorAll('.domain-view').forEach(view=>{
    const domain=view.dataset.domain; const target=view.querySelector('.domain-entries'); const items=entries.filter(e=>e.domain===domain).slice(0,50);
    target.innerHTML = items.length ? items.map(entryHtml).join('') : `<div class="empty-card muted">No ${domains[domain].label.toLowerCase()} entries yet.</div>`;
  });
}
function entryHtml(e){ const title=e.domain==='nutrition'?'Fuel':domains[e.domain].label; return `<article class="entry"><div class="entry-top"><span>${title}</span><span>${e.date === todayKey() ? timeText(e.createdAt) : dateLabel(e.date)}</span></div><div class="entry-main">${escapeHtml(e.text)}</div>${e.meta?.extra?`<p class="muted small">${escapeHtml(e.meta.extra)}</p>`:''}<div class="entry-actions"><button class="delete" onclick="deleteEntry('${e.id}')">Delete</button></div></article>`; }
function deleteEntry(id){ entries = entries.filter(e=>e.id!==id); saveEntries(); }
function renderChips(){
  document.querySelectorAll('.chips').forEach(chipWrap=>{ const domain=chipWrap.dataset.target; chipWrap.innerHTML=domains[domain].prompts.map(p=>`<button type="button">${p}</button>`).join(''); chipWrap.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>fillPrompt(domain,btn.textContent))); });
}
function fillPrompt(domain,text){ const view=document.querySelector(`.domain-view[data-domain="${domain}"]`); const ta=view.querySelector('textarea'); ta.value = ta.value ? `${ta.value}\n${text}` : text; ta.focus(); }
function toggleTheme(){ document.documentElement.classList.toggle('dark'); localStorage.setItem(THEME_KEY, document.documentElement.classList.contains('dark')?'dark':'light'); }
function exportData(){ const blob=new Blob([JSON.stringify({app:'Foundation OS',version:1,exportedAt:new Date().toISOString(),entries}, null, 2)], {type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`foundation-os-export-${todayKey()}.json`; a.click(); URL.revokeObjectURL(a.href); }
function importData(ev){ const file=ev.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); if(Array.isArray(data.entries)){ entries=[...data.entries, ...entries]; saveEntries(); alert('Import complete.'); } else alert('Import file did not contain entries.'); }catch{ alert('Could not import JSON.'); } }; reader.readAsText(file); ev.target.value=''; }
function clearAll(){ if(confirm('Clear all Foundation OS entries on this device?')){ entries=[]; saveEntries(); } }
window.deleteEntry=deleteEntry; window.switchView=switchView; init();
