/* EcoRewards UI controller. All network calls go to the Flask /api endpoints.
 * Screens are organised by feature for easier maintenance and review.
 * IMPORTANT: button permissions are ALSO enforced on the backend.
 */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state = { user:null, points:0, reports:[], page:location.pathname==='/admin'?'admin':(new URLSearchParams(location.search).get('eco')==='tasks'?'tasks':'home'), filter:'all', adminSection:'overview', adminSearch:'', adminData:{points:[],events:[],users:[]},personSearch:'',selectedPersonId:null,personProfile:null,personLoading:false,taskLocation:null,taskRadius:5,nearbyTasks:[],taskLoading:false,taskSearched:false, taskCity:'',taskSuburb:'',citySuburbs:{},publishedNearbyCount:0,nearestPublishedKm:null };
const icon = (x)=>({'home':'◫','report':'⊕','tasks':'♧','my':'▤','rewards':'✧','admin':'▦','safety':'♢'}[x]||'•');
const fmt = s => s ? new Date(s).toLocaleDateString('en-AU',{day:'numeric',month:'short'}) : '—';
const label = s => ({pending:'Pending review',flagged:'Review flagged',approved:'Verified',referred:'Authority referral',resolved:'Resolved',rejected:'Rejected',available:'Available',claimed:'Claimed',safety_review:'Legacy: safety review',in_progress:'In progress',evidence_review:'Evidence review',unsafe_suspended:'Unsafe: suspended',withdrawn_review:'Withdrawn: review',completed:'Completed',none:'Not available'}[s]||s);
const tag = s => `<span class="tag ${esc(s)}">${esc(label(s))}</span>`;
const photo = (r, after=false) => r[after?'after_photo':'photo'] ? `<img class="report-photo" alt="${after?'After-cleanup':'Issue'} evidence" src="/uploads/${encodeURIComponent(r[after?'after_photo':'photo'])}">` : `<div class="report-photo">${r.category?.includes('Chemical')?'⚠':'♻'}</div>`;
const btn = (name,call,clazz='') => `<button class="btn ${clazz}" onclick="${call}">${name}</button>`;
const pageHeading=(eyebrow,title,subtitle,right='')=>`<div class="page-header"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="sub">${subtitle}</p></div>${right}</div>`;
// FUNCTION: toast()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('visible');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove('visible'),3700)}
// Shared HTTP helper parses errors, sends cookies and never treats failures as successes.
// FUNCTION: api()
// PURPOSE: Send HTTP request to Flask and handle server responses.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function api(path,options={}){const r=await fetch(path,{credentials:'same-origin',...options});const data=await r.json();if(!r.ok)throw Error(data.error||'Something went wrong.');return data;}
// FUNCTION: post()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function post(path,data){return api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}
// FUNCTION: refresh()
// PURPOSE: Reload server data so the interface shows up-to-date information.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function refresh(){try{const m=await api('/api/me');state.user=m.user;state.points=m.points||0;if(state.user?.role==='admin' && location.pathname!=='/admin' && location.pathname!=='/admin/intelligence'){location.replace('/admin');return;}if(state.user){state.reports=(await api('/api/reports')).reports;if(state.user.role==='admin'){state.adminData=await api('/api/admin/operations');if(!adminPages[state.page])state.page='admin';}}render();}catch(e){toast(e.message)}}
// FUNCTION: setPage()
// PURPOSE: Change current UI navigation or selection.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function setPage(p){state.page=p;document.getElementById('sidebar').classList.remove('open');history.replaceState({},'',p==='admin'?'/admin':'/');render()}
const adminPages={'admin':1,'a-reports':1,'a-safety':1,'a-referrals':1,'a-rewards':1,'a-activity':1,'a-person':1};
// FUNCTION: renderNav()
// PURPOSE: Draw the selected screen using current application data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function renderNav(){const admin=state.user?.role==='admin';const links=admin?[['admin','Dashboard'],['a-reports','Issue reports'],['a-safety','Cleanups'],['a-referrals','Referrals'],['a-rewards','Points history'],['a-activity','Community members']]:[['home','Overview'],['report','Report an issue'],['tasks','EcoTasks'],['my','My reports'],['rewards','My rewards']];$('#nav').innerHTML=links.map(([id,title])=>`<a href="#${id}" class="nav-item ${id===state.page?'active':''}" onclick="event.preventDefault();setPage('${id}')"><span class="nav-icon">${icon(id)}</span>${title}</a>`).join('');const space=document.getElementById('roleWorkspaceLinks');if(space)space.innerHTML=admin?'<span class="side-label">Operations tools</span><a href="/admin/intelligence" class="role-link">◈ &nbsp;Admin Intelligence</a>':'<span class="side-label">My cleaner account</span><a href="/cleaner/portal" class="role-link">✦ &nbsp;EcoCleaner Profile</a>';}
// FUNCTION: render()
// PURPOSE: Draw the selected screen using current application data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function render(){const logged=!!state.user;$('.sidebar').style.display=logged?'flex':'none';$('.topbar').style.display=logged?'flex':'none';$('#logout').style.display=logged?'block':'none';$('#topName').textContent=state.user?.name||'EcoRewards';$('#avatar').textContent=(state.user?.name||'E')[0].toUpperCase();if(!logged){$('#content').innerHTML=authHtml();return;}renderNav();const p=state.page;if(state.user.role==='admin'&&!adminPages[p])state.page='admin';if(p==='admin' && state.user.role!=='admin')state.page='home';const page=state.page;if(adminPages[page]&&state.user.role!=='admin'){state.page='home';return render();}$('#breadcrumb').innerHTML=`${state.user.role==='admin'?'Administration':'Community'} / <b>${page==='my'?'My activity':page==='report'?'New report':page==='tasks'?'EcoTasks':page==='rewards'?'EcoWallet':'Overview'}</b>`;$('#content').innerHTML=({home:homeHtml,report:reportHtml,tasks:tasksHtml,my:myHtml,rewards:rewardsHtml,admin:adminHtml,'a-reports':adminReportsHtml,'a-safety':adminSafetyHtml,'a-referrals':adminReferralsHtml,'a-rewards':adminRewardsHtml,'a-activity':adminActivityHtml,'a-person':adminPersonHtml}[page]||homeHtml)();}
// FUNCTION: authHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function authHtml(){return `<div class="auth-layout"><section class="auth-story"><span class="auth-kicker">Welcome to EcoRewards</span><h1>Better places begin with <em>people like you.</em></h1><p>Spot environmental issues, discover approved cleanups nearby and get recognised for every verified action.</p><div class="auth-story-image" role="img" aria-label="Community members helping care for a park"></div><div class="auth-story-foot"><span>✦ Community-led</span><span>◉ Safety-first</span><span>✧ Rewarding action</span></div></section><section class="card auth-panel"><div class="auth-symbol">✳</div><div class="eyebrow">Your community, your impact</div><h1 id="auth-title">Welcome back</h1><p>Sign in to continue making a difference.</p><form id="auth-form" onsubmit="submitAuth(event)"><div class="field" id="auth-name" style="display:none"><label>Your name</label><input name="name" autocomplete="name" placeholder="Full name"></div><div class="field"><label>Email address</label><input name="email" type="email" autocomplete="email" placeholder="Your email address" required></div><div class="field"><label>Password</label><input name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required></div><button class="btn full" id="auth-submit">Sign in →</button></form><p class="auth-bottom">New to EcoRewards? <button class="auth-switch" onclick="toggleAuth()" id="auth-toggle">Create an account</button></p></section></div>`}
let creating=false;
// FUNCTION: toggleAuth()
// PURPOSE: Switch between available screen states.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function toggleAuth(){creating=!creating;$('#auth-name').style.display=creating?'grid':'none';$('#auth-title').textContent=creating?'Join the movement.':'A cleaner future starts here.';$('#auth-submit').textContent=creating?'Create account →':'Sign in →';$('#auth-toggle').textContent=creating?'Back to sign in':'Create an account';}
// FUNCTION: fillDemo()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function fillDemo(role){if(creating)toggleAuth();const f=$('#auth-form');f.email.value=role==='admin'?'admin@demo.com':'maya@demo.com';f.password.value='Demo123!';}
// FUNCTION: submitAuth()
// PURPOSE: Send form information to backend API and show success or error.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function submitAuth(e){e.preventDefault();const f=e.target;try{await post('/api/'+(creating?'register':'login'),{name:f.elements.name.value,email:f.elements.email.value,password:f.elements.password.value});creating=false;state.page=location.pathname==='/admin'?'admin':'home';await refresh();toast('Welcome to EcoRewards!')}catch(err){toast(err.message)}}
// FUNCTION: logout()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function logout(){await post('/api/logout',{});state.user=null;state.reports=[];state.page='home';creating=false;history.replaceState({},'','/');render();}
// FUNCTION: row()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function row(r){return `<div class="report-row">${photo(r)}<div class="report-body"><strong>${esc(r.title)}</strong><div class="meta"><span>⌖ ${esc(r.location)}</span><span>· ${fmt(r.created_at)}</span></div></div>${tag(r.status)}</div>`;}
// FUNCTION: homeHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function homeHtml(){const mine=state.reports.filter(r=>r.user_id===state.user.id);const completed=mine.filter(r=>r.status==='resolved').length;const verified=mine.filter(r=>['approved','resolved'].includes(r.status)).length;const total=state.reports.filter(r=>r.task_status==='available').length;return `${pageHeading('COMMUNITY DASHBOARD',`Good to see you, ${esc(state.user.name.split(' ')[0])}.`,'Small actions today. A greener neighbourhood tomorrow.',btn('＋  Report an issue',"setPage('report')"))}<div class="hero"><div class="hero-copy"><div class="eyebrow">For cleaner neighbourhoods</div><h1>Make your neighbourhood a <em>better place.</em></h1><p>Report an issue. Find an approved cleanup nearby. Turn everyday action into lasting impact.</p><div class="hero-actions">${btn('Find an EcoTask →',"setPage('tasks')")}${btn('Report an issue',"setPage('report')",'light')}</div><div class="hero-caption">Built around safe, verified community action.</div></div><div class="hero-art" role="img" aria-label="A person helping clean a public green space"></div></div><div class="stat-grid"><button type="button" class="card stat metric-link" onclick="setPage('my')"><div class="stat-top">Your reports <span class="stat-icon">▤</span></div><strong>${mine.length}</strong><small>Issues you spotted ↗</small></button><button type="button" class="card stat metric-link" onclick="setPage('my')"><div class="stat-top">Verified reports <span class="stat-icon">✓</span></div><strong>${verified}</strong><small>Reviewed by our team ↗</small></button><button type="button" class="card stat metric-link" onclick="setPage('rewards')"><div class="stat-top">Your EcoPoints <span class="stat-icon">✧</span></div><strong>${state.points}</strong><small>Earned from verified actions ↗</small></button><button type="button" class="card stat metric-link" onclick="setPage('tasks')"><div class="stat-top">Open EcoTasks <span class="stat-icon">♧</span></div><strong>Nearby</strong><small>Choose a location to browse ↗</small></button></div><div class="two-col"><div><div class="section-head"><h2>Recent community reports</h2><a href="#" onclick="event.preventDefault();setPage('my')">View all →</a></div><div class="card panel"><div class="report-list">${state.reports.slice(0,4).map(row).join('')||'<div class="empty">No reports yet.</div>'}</div></div></div><div><div class="section-head"><h2>Your impact starts here</h2></div><div class="impact-card"><div class="impact-bubble"></div><div class="mini-label">YOUR PROGRESS</div><strong>${state.points}<span style="font-size:14px"> pts</span></strong><h3>Every action matters.</h3><p>Your points are credited only after a real person verifies the action.</p>${btn('View rewards →',"setPage('rewards')",'soft')}</div><div class="facts"><img class="fact-picture" src="/static/images/planting-tomorrow.jpg" alt="Young plant growing in soil"><div class="mini-label">A little perspective</div><div class="facts-number">Every action counts.</div><p>Reducing waste, reusing resources and caring for shared spaces all support Australia’s move towards a circular economy.</p><a href="https://www.dcceew.gov.au/environment/protection/waste" target="_blank" rel="noopener noreferrer">Explore Australian waste initiatives ↗</a></div></div></div>`}
// FUNCTION: reportHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function reportHtml(){return `${pageHeading('TAKE THE FIRST STEP','Report an environmental issue','Share what you noticed. Our team reviews every report before any cleanup task is available.')}<div class="card form-card"><form id="new-report" onsubmit="submitReport(event)"><div class="form-grid"><div class="field"><label>Issue title *</label><input name="title" required maxlength="120" placeholder="e.g. Litter near park entrance"></div><div class="field"><label>Issue category *</label><select name="category" required><option value="">Choose a category</option>${['General litter','Overflowing bins','Illegal dumping','Plastic pollution','Damaged green space','Chemical / hazardous waste','Needles or sharps','Oil or water contamination','Road / traffic hazard','Unknown material'].map(x=>`<option>${x}</option>`).join('')}</select></div></div><div class="field"><label>Description *</label><textarea name="description" required placeholder="What happened? Any risks or details we should know?"></textarea></div><div class="field"><label>Location *</label><input type="hidden" name="latitude"><input type="hidden" name="longitude"><input name="location" required oninput="clearReportCoords()" placeholder="e.g. West End, Brisbane – near the community garden"><button type="button" class="btn light sm" style="justify-self:start" onclick="getLocation()">⌖ Use my GPS</button><button type="button" class="btn light sm" onclick="geocodeReport()">Find coordinates for this location</button><small id="report-coord-status">For nearby EcoTasks, please set a GPS or searched location.</small></div><div class="field"><label>Photo evidence * (JPG/PNG/WEBP, up to 6MB)</label><div class="capture-actions"><label class="capture-tile">📁 Choose photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" onchange="previewPhoto(this)" required></label><button type="button" class="btn light" onclick="openCamera('new-report')">📷 Take photo</button></div><div id="new-report-photo-preview" class="photo-preview"></div></div><div class="notice warning"><b>Safety first:</b> Do not approach unknown chemicals, needles, traffic hazards, contaminated water or unstable locations. Reporting does not authorise cleanup. If there is immediate danger, call 000.</div><button class="btn" type="submit">Submit for review →</button></form></div>`}
// FUNCTION: getLocation()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function getLocation(){if(!navigator.geolocation){toast('Location unavailable. Type it instead.');return;}navigator.geolocation.getCurrentPosition(p=>{$('#new-report [name=location]').value=`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)} (GPS)`;setReportCoords(p.coords.latitude,p.coords.longitude);toast('Location saved.')},()=>toast('Location permission denied. Enter your location manually.'),{timeout:10000});}
// FUNCTION: clearReportCoords()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function clearReportCoords(){const f=$('#new-report');f.elements.latitude.value='';f.elements.longitude.value='';$('#report-coord-status').textContent='Location changed — search again to add coordinates.';}
// FUNCTION: setReportCoords()
// PURPOSE: Change current UI navigation or selection.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function setReportCoords(lat,lon){const form=$('#new-report');form.elements.latitude.value=lat;form.elements.longitude.value=lon;$('#report-coord-status').textContent='✓ Coordinates attached for nearby discovery';}
// FUNCTION: geocodeReport()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function geocodeReport(){const value=$('#new-report [name=location]').value.trim();if(!value)return toast('Enter the suburb or location first.');try{const data=await api(`/api/locations/search?q=${encodeURIComponent(value)}`);setReportCoords(data.latitude,data.longitude);toast('Location found. Check that it matches the issue.')}catch(e){toast(e.message)}}
// FUNCTION: submitReport()
// PURPOSE: Send form information to backend API and show success or error.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function submitReport(e){e.preventDefault();let f=e.target;if(!f.elements.latitude.value||!f.elements.longitude.value){toast('Set your location using GPS or Find coordinates before submitting.');return;}const b=f.querySelector('button[type=submit]');b.disabled=true;try{const result=await api('/api/reports',{method:'POST',body:new FormData(f)});toast(result.similar_image_flag?'Report submitted; similar-image flag for admin review.':'Report sent to admin for review.');await refresh();setPage('my')}catch(err){toast(err.message)}finally{b.disabled=false}}
// NEARBY ECO TASKS: users explicitly select a location and 2/5/10 km radius.
// The server filters tasks too, so the browser cannot show distant tasks by mistake.
// FUNCTION: tasksHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function tasksHtml(){
 if(!Object.keys(state.citySuburbs).length)queueMicrotask(ensureTaskCityList);
 const loc=state.taskLocation;
 const emptyMessage=state.publishedNearbyCount===0?'No low-risk EcoTasks have been published by an administrator yet.':state.nearestPublishedKm!==null?('Nearest published task is approximately '+state.nearestPublishedKm+' km away.'):'No tasks match this distance.';
 const available=state.nearbyTasks;
 const assigned=state.reports.filter(r=>r.assignee_id===state.user.id&&['safety_review','in_progress','evidence_review','unsafe_suspended','withdrawn_review'].includes(r.task_status));
 return `${pageHeading('EXPLORE NEARBY','Find an EcoTask','Choose where you want to help. We only show reviewed tasks near that location.')}
 <div class="card location-finder"><div><div class="eyebrow">YOUR SEARCH AREA</div><h2>Where would you like to help?</h2><p>Select a city and suburb or use GPS. The search uses approximate suburb centres and your chosen distance.</p></div>
 <div class="location-search-row"><label class="task-location-field">City<select id="task-city" onchange="taskCityChange(this.value)"><option value="">Choose city</option>${Object.keys(state.citySuburbs).map(c=>`<option value="${esc(c)}" ${state.taskCity===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label class="task-location-field">Suburb<select id="task-suburb" onchange="state.taskSuburb=this.value"><option value="">Choose suburb</option>${(state.citySuburbs[state.taskCity]||[]).map(s=>`<option value="${esc(s)}" ${state.taskSuburb===s?'selected':''}>${esc(s)}</option>`).join('')}</select></label><button class="btn light" onclick="findTaskLocation()">Show EcoTasks</button><button class="btn light" onclick="useTaskGPS()">Use my GPS</button></div>
 <div class="radius-controls"><span>Show tasks within</span>${[2,5,10].map(k=>`<button class="radius-chip ${state.taskRadius===k?'selected':''}" onclick="setTaskRadius(${k})">${k} km</button>`).join('')}</div>
 ${loc?`<div class="location-selected">✓ Searching near <strong>${esc(loc.label)}</strong> · ${state.taskRadius} km radius</div>`:'<div class="location-hint">Select a location first. We won’t show tasks across the entire platform.</div>'}</div>
 ${assigned.length?`<div class="section-head"><h2>Your current cleanup tasks</h2><span>${assigned.length} assigned</span></div><div class="task-grid">${assigned.map(r=>taskCard(r,true)).join('')}</div>`:''}
 <div class="section-head"><h2>Available near you</h2><span>${loc?state.taskLoading?'Searching...':available.length+' nearby task'+(available.length===1?'':'s'):'Choose location to see tasks'}</span></div>
 ${!loc?'<div class="card empty task-empty">📍<h3>Start with your location</h3><p>Choose your city and suburb, or use GPS, to see local cleanup opportunities.</p></div>':state.taskLoading?'<div class="card empty">Finding EcoTasks near you...</div>':`<div class="task-grid">${available.map(r=>taskCard(r,false)).join('')||'<div class="card empty task-empty"><h3>No published tasks nearby</h3><p>${emptyMessage} Try a different suburb or select 10 km.</p></div>'}</div>`}
 <div class="notice" style="margin-top:20px">Only tasks that an admin has reviewed and published appear here. Fill in the safety form as you claim. You can stop any time if anything seems unsafe.</div>`;
}
// FUNCTION: taskCard()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function taskCard(r,isMine){return `<div class="card task-card"><div class="task-image">${r.photo?`<img src="/uploads/${encodeURIComponent(r.photo)}" alt="Issue photo">`:'🌿'}</div><div class="task-inner">${tag(r.task_status)}<h3>${esc(r.title)}</h3><p>${esc(r.description.slice(0,125))}</p><div class="meta">⌖ ${esc(r.location)} ${!isMine&&r.distance_km!==undefined?`· ${r.distance_km.toFixed(1)} km away`:''}</div><div class="task-foot"><span class="points">50 EcoPoints</span>${isMine?btn('View task',`openTask(${r.id})`,'sm'):btn('View & claim',`claimTask(${r.id})`,'sm')}</div></div></div>`}
// FUNCTION: loadNearby()
// PURPOSE: Fetch data from API and update the displayed view.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function loadNearby(){if(!state.taskLocation)return;state.taskLoading=true;render();try{const loc=state.taskLocation;const data=await api(`/api/tasks/nearby?latitude=${loc.lat}&longitude=${loc.lon}&radius=${state.taskRadius}`);state.nearbyTasks=data.tasks;state.publishedNearbyCount=data.published_total||0;state.nearestPublishedKm=data.nearest_published_km;state.taskSearched=true;}catch(e){toast(e.message);state.nearbyTasks=[]}finally{state.taskLoading=false;render()}}
// FUNCTION: setTaskRadius()
// PURPOSE: Change current UI navigation or selection.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function setTaskRadius(km){state.taskRadius=km;state.nearbyTasks=[];if(state.taskLocation)loadNearby();else render()}
// FUNCTION: useTaskGPS()
// PURPOSE: Change current UI navigation or selection.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function useTaskGPS(){if(!navigator.geolocation){toast('GPS is not available. Search a suburb instead.');return;}navigator.geolocation.getCurrentPosition(p=>{state.taskLocation={lat:p.coords.latitude,lon:p.coords.longitude,label:'Your current location'};loadNearby()},()=>toast('Location permission denied. Search a suburb instead.'),{enableHighAccuracy:false,timeout:12000})}
// FUNCTION: findTaskLocation()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function ensureTaskCityList(){
 if(Object.keys(state.citySuburbs).length)return;
 try{const d=await api('/api/advanced/location-options');state.citySuburbs=d.cities; if(state.page==='tasks')render();}
 catch(e){toast('Could not load suburb list: '+e.message)}
}
function taskCityChange(city){state.taskCity=city;state.taskSuburb='';state.taskLocation=null;state.nearbyTasks=[];render()}
async function findTaskLocation(){
 if(!state.taskCity||!state.taskSuburb){toast('Select your city and suburb first.');return;}
 try{const result=await post('/api/advanced/location-resolve',{city:state.taskCity,suburb:state.taskSuburb});state.taskLocation={lat:result.latitude,lon:result.longitude,label:result.label};await loadNearby()}
 catch(e){toast(e.message)}
}
// FUNCTION: myHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function myHtml(){const mine=state.reports.filter(r=>r.user_id===state.user.id||r.assignee_id===state.user.id);return `${pageHeading('YOUR CONTRIBUTIONS','My activity','Track the environmental issues you reported and the cleanup tasks you accepted.',btn('＋ New report',"setPage('report')"))}<div class="card panel"><div class="report-list">${mine.map(r=>`<div>${row(r)}<div class="quick-actions" style="justify-content:flex-end;margin:7px 0 10px">${r.assignee_id===state.user.id?btn('Manage cleanup →',`openTask(${r.id})`,'sm light'):''}${btn('View timeline',`showTimeline(${r.id})`,'sm ghost')}</div></div>`).join('')||'<div class="empty">No activity yet. Report your first issue!</div>'}</div></div>`}
// FUNCTION: rewardsHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function rewardsHtml(){const mine=state.reports.filter(r=>r.assignee_id===state.user.id&&r.status==='resolved');return `${pageHeading('YOUR POSITIVE IMPACT','EcoWallet & achievements','Your achievements and EcoPoints, all in one place. Points recognise verified actions.')}<div class="wallet"><div><div class="eyebrow" style="color:#b7d7b8">YOUR BALANCE</div><strong>✧ ${state.points}</strong><p>EcoPoints earned from verified actions</p></div><div style="font-size:79px;opacity:.7">❋</div></div><div class="reward-grid"><div class="card reward"><div class="emoji">🌱</div><h3>First step</h3><p>Earn your first verified report.</p>${tag(state.points>=10?'completed':'pending')}</div><div class="card reward"><div class="emoji">🪴</div><h3>Cleanup hero</h3><p>Complete one admin-verified cleanup.</p>${tag(mine.length?'completed':'pending')}</div><div class="card reward"><div class="emoji">🌿</div><h3>Eco champion</h3><p>Collect 150 verified EcoPoints.</p>${tag(state.points>=150?'completed':'pending')}</div></div><div class="notice" style="margin-top:20px"><b>Proposed reward rules:</b> +10 points for a verified issue report; +50 points for a completed and admin-verified cleanup. No points for unsafe or unapproved cleanup. Existing earned points stay safe if you exit a task for safety.</div>`}
// FUNCTION: adminHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function adminHtml(){if(state.user.role!=='admin')return homeHtml();const rs=state.reports;const pending=rs.filter(r=>['pending','flagged'].includes(r.status));const holds=rs.filter(r=>['unsafe_suspended','withdrawn_review','safety_review','evidence_review'].includes(r.task_status));return `${pageHeading('ADMINISTRATION','Operations overview','Review reports, authorise safe community tasks and verify outcomes. All approvals are recorded.',btn('Community view ↗',"setPage('tasks')",'light'))}<div class="stat-grid"><div class="card stat admin-stat"><div class="stat-top">Total reports <span class="stat-icon">▤</span></div><strong>${rs.length}</strong><small>All community submissions</small></div><div class="card stat admin-stat"><div class="stat-top">Pending verification <span class="stat-icon">◷</span></div><strong>${pending.length}</strong><small>Require an admin decision</small></div><div class="card stat admin-stat"><div class="stat-top">Safety / evidence review <span class="stat-icon">♢</span></div><strong>${holds.length}</strong><small>Action needed before progress</small></div><div class="card stat admin-stat"><div class="stat-top">Resolved issues <span class="stat-icon">✓</span></div><strong>${rs.filter(r=>r.status==='resolved').length}</strong><small>Cleanup verified by admin</small></div></div><div class="notice warning"><b>Important referral status:</b> This screen does not send reports to authorities. “Refer” records a pending external referral, which must be completed using an official authority channel. Never publish high-risk cleanup tasks.</div><div class="card panel"><div class="section-head"><h2>Report management</h2><span class="mini-label">${rs.length} TOTAL REPORTS</span></div><div class="toolbar"><div class="segment" style="margin:0">${['all','pending','approved','referred','resolved','safety'].map(f=>`<button class="${state.filter===f?'active':''}" onclick="state.filter='${f}';render()">${f==='safety'?'Safety review':f[0].toUpperCase()+f.slice(1)}</button>`).join('')}</div></div><div class="table-wrap"><table class="report-table"><thead><tr><th>Issue</th><th>Reporter</th><th>Classification</th><th>Report status</th><th>Task status</th><th>Action</th></tr></thead><tbody>${rs.filter(r=>state.filter==='all'||(state.filter==='safety'?holds.some(x=>x.id===r.id):state.filter==='pending'?['pending','flagged'].includes(r.status):r.status===state.filter)).map(r=>`<tr><td><strong>${esc(r.title)}</strong><div class="meta">${esc(r.location)}</div></td><td>${esc(r.reporter_name)}</td><td>${r.risk==='high'?'<span class="important">High risk</span>':esc(r.risk)}</td><td>${tag(r.status)}</td><td>${tag(r.task_status)}</td><td>${btn('Review →',`reviewReport(${r.id})`,'sm light')}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No records in this filter.</td></tr>'}</tbody></table></div></div>`}
// Action buttons call the backend. Server independently checks role and valid task state.
// SINGLE-STEP CLAIM: the form is displayed BEFORE a user is assigned the task.
// FUNCTION: claimTask()
// PURPOSE: Open safety acknowledgement before claiming a task.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function claimTask(id){
 const r=state.nearbyTasks.find(t=>t.id===id);
 if(!r||!state.taskLocation){toast('Choose your location and search first.');return;}
 const checks=[['adult','I am 18 or older.'],['hazards','I have not identified chemicals, needles, broken glass or unknown materials.'],['location','There are no obvious traffic, water, height or other dangerous conditions.'],['ppe','I have suitable gloves, shoes and other required protection.'],['permission','I understand cleanup requires confirmed site permission and admin authorisation.'],['stop','I can stop or leave immediately if I feel unsafe, without losing existing earned points.']];
 modal(`${modalHead('Claim this EcoTask',esc(r.title)+' · '+r.distance_km.toFixed(1)+' km away')}
 <div class="claim-summary"><strong>One quick safety check</strong><p>This task has already been reviewed and published by an administrator. Complete the safety form now to claim it. Stop immediately if conditions differ or anything seems unsafe.</p></div>
 <form id="claim-consent" onsubmit="submitClaim(event,${id})">${checks.map(([key,statement])=>`<label class="check-row"><input type="checkbox" name="${key}" required><span>${statement}</span></label>`).join('')}
 <label class="check-row consent-final"><input type="checkbox" name="accepted" required><span>I have read these safety conditions and agree to submit my acknowledgement. This does not waive legal rights or remove the organiser’s safety obligations.</span></label>
 <button class="btn full" type="submit">Submit safety form & claim task →</button></form><p class="fineprint">The task is assigned when the form is accepted. No second admin approval is required. Only do the published low-risk work.</p>`);
}
// FUNCTION: submitClaim()
// PURPOSE: Send form information to backend API and show success or error.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function submitClaim(e,id){e.preventDefault();const f=e.target,answers={};['adult','hazards','location','ppe','permission','stop'].forEach(k=>answers[k]=f.elements[k].checked);
 const button=f.querySelector('button[type=submit]');button.disabled=true;
 try{await post(`/api/reports/${id}/claim`,{latitude:state.taskLocation.lat,longitude:state.taskLocation.lon,radius:state.taskRadius,answers,accepted:f.elements.accepted.checked});closeModal();await refresh();await loadNearby();toast('Task claimed! Your safety form is saved. You can stop at any time.');setPage('my');}catch(err){button.disabled=false;toast(err.message)}
}
// FUNCTION: modal()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function modal(html){$('#modal-root').innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`}
// FUNCTION: closeModal()
// PURPOSE: Close a dialog without changing saved data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function closeModal(){$('#modal-root').innerHTML=''}
const modalHead=(title,sub='')=>`<div class="modal-head"><div><div class="eyebrow">ECOREWARDS</div><h2>${title}</h2><p class="sub">${sub}</p></div><button class="close" onclick="closeModal()">×</button></div>`;
// FUNCTION: openTask()
// PURPOSE: Open the selected detail screen or camera.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function openTask(id){const r=state.reports.find(x=>x.id===id);if(!r)return;let body='';if(r.task_status==='claimed')body='<div class="notice warning">This old assignment requires administrator review. Please contact the team.</div>';
else if(r.task_status==='safety_review')body='<div class="notice">This older task is awaiting manual migration. Contact the administrator.</div>';
else if(r.task_status==='in_progress')body=`<div class="notice">You may stop any time. If conditions become unsafe, leave the area first. Never take extra photos if doing so puts you at risk.</div><form onsubmit="submitEvidence(event,${id})"><div class="field"><label>After-cleanup evidence photo *</label><div class="capture-actions"><label class="capture-tile">📁 Choose after photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" onchange="previewPhoto(this)" required></label><button type="button" class="btn light" onclick="openCamera('after-cleanup')">📷 Take photo</button></div><div class="photo-preview"></div></div><button class="btn full">Send evidence for verification →</button></form>`;
else body=`<div class="notice ${r.task_status==='unsafe_suspended'?'danger':''}">${esc(label(r.task_status))}. ${r.task_status==='unsafe_suspended'?'Do not return to the cleanup area. This task is suspended pending independent review.':'Admin review may be required.'}</div>`;
const ongoing=['claimed','safety_review','in_progress'].includes(r.task_status);
modal(`${modalHead(esc(r.title),`${esc(r.location)} · 50 points after verified cleanup`)}${body}${ongoing?`<div style="border-top:1px solid #e9eee8;margin-top:20px;padding-top:20px;display:grid;gap:8px"><button class="btn red full" onclick="stopTask(${id})">⛔ STOP TASK – UNSAFE</button><button class="btn ghost full" onclick="withdrawTask(${id})">Leave task for another reason</button></div>`:''}<div class="notice danger" style="margin-bottom:0">Emergency or immediate danger in Australia? Call <b>000</b>. For pollution concerns use <a href="https://www.qld.gov.au/environment/management/pollution-management/reporting" target="_blank" rel="noreferrer"><u>Queensland official reporting</u></a>. The app does not automatically contact authorities.</div>`)}
// FUNCTION: submitEvidence()
// PURPOSE: Send form information to backend API and show success or error.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function submitEvidence(e,id){e.preventDefault();const f=new FormData(e.target);try{await api(`/api/reports/${id}/complete`,{method:'POST',body:f});closeModal();await refresh();toast('Evidence submitted for admin verification.')}catch(err){toast(err.message)}}
// FUNCTION: stopTask()
// PURPOSE: Allow the person to stop cleanup if conditions are unsafe.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function stopTask(id){modal(`${modalHead('Stop work. Stay safe.','The task will be suspended immediately when you confirm below.')}<div class="notice danger"><b>Move to safety first.</b> Do not touch hazards, and never remain in danger to take a photo. If immediate danger, call <b>000</b>.</div><div class="field"><label>What did you notice? (optional)</label><textarea id="unsafe-reason" placeholder="e.g. found broken glass and unknown containers"></textarea></div><button class="btn red full" onclick="confirmStop(${id})">Confirm: suspend unsafe task</button><button class="btn light full" style="margin-top:9px" onclick="confirmStop(${id},true)">Stop now — skip details</button>`)}
// FUNCTION: confirmStop()
// PURPOSE: Allow the person to stop cleanup if conditions are unsafe.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function confirmStop(id,skip=false){try{await post(`/api/reports/${id}/stop`,{reason:skip?'User stopped: unsafe / no details':$('#unsafe-reason')?.value||'Unspecified safety concern'});closeModal();await refresh();toast('Task suspended and flagged for admin. No points deducted.')}catch(e){toast(e.message)}}
// FUNCTION: withdrawTask()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function withdrawTask(id){if(!confirm('Leave this assignment? It will be held for admin review.'))return;try{await post(`/api/reports/${id}/withdraw`,{});closeModal();await refresh();toast('Task withdrawn; no penalty.')}catch(e){toast(e.message)}}
// ADMIN REVIEW: all first-time decisions are accessible in one modal.
// Verify & Publish performs one backend transaction after site-safety confirmation.
// FUNCTION: reviewReport()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function reviewReport(id){
 const r=state.reports.find(x=>x.id===id); if(!r)return;
 const pending=['pending','flagged'].includes(r.status);
 let actions='';
 if(pending){
   if(r.risk!=='high')actions+=btn('✓ Verify & publish EcoTask',`adminAct(${id},'verify_publish',true)`,'soft')+' ';
   actions+=btn('Verify report only',`adminAct(${id},'approve')`,'light')+' ';
   actions+=btn('Refer to authority',`adminAct(${id},'refer')`,'light')+' '+btn('Reject',`adminAct(${id},'reject')`,'ghost');
 }
 if(r.status==='approved'&&r.task_status==='none'&&r.risk==='low')actions+=btn('Publish as EcoTask',`adminAct(${id},'publish',true)`,'soft');
 if(r.task_status==='available')actions+=btn('Remove from EcoTasks',`adminAct(${id},'unpublish')`,'light');
 if(r.task_status==='evidence_review')actions+=btn('✓ Approve cleanup · Mark resolved · Award 50 pts',`adminAct(${id},'resolve')`,'soft')+' '+btn('Request better photo',`adminAct(${id},'decline_evidence')`,'light');
 if(r.task_status==='withdrawn_review')actions+=btn('Reopen after new site review',`adminAct(${id},'reopen',true)`,'light');
 const finished=r.status==='resolved';
 const stage=finished?'<div class="completion-banner"><strong>✓ Issue resolved</strong><span>Cleanup verified, report closed and EcoPoints recorded.</span></div>':r.task_status==='evidence_review'?'<div class="review-banner"><strong>Ready for final review</strong><span>Compare the original and after-cleanup photos. Approving will mark this issue resolved.</span></div>':'';
 modal(`${modalHead(esc(r.title),`${esc(r.category)} · ${esc(r.location)}`)}${stage}<p>${esc(r.description)}</p>
 <div class="verification-strip"><div><strong>Photo & duplicate checks</strong><p>Free offline image fingerprints and nearby issue checks. Matches are reviewed by a person.</p></div>${btn('View checks →',`showPhotoChecks(${id})`,'sm light')}</div>
 <div class="evidence-pair"><div><span class="image-label">ISSUE REPORTED</span>${r.photo?`<img class="preview-image" src="/uploads/${encodeURIComponent(r.photo)}" alt="Issue photo">`:'<div class="evidence-placeholder">No original photo</div>'}</div>
 ${r.after_photo?`<div><span class="image-label">AFTER CLEANUP</span><img class="preview-image" src="/uploads/${encodeURIComponent(r.after_photo)}" alt="After cleanup photo"></div>`:''}</div>
 <div class="form-grid"><div class="notice">Report: ${tag(r.status)}<br>Risk: <b>${esc(r.risk)}</b></div><div class="notice">EcoTask: ${tag(r.task_status)}<br>Assigned: <b>${esc(r.assignee_name||'Not assigned')}</b></div></div>
 ${r.consent_at?`<div class="notice"><b>Safety consent submitted:</b> ${esc(fmt(r.consent_at))}</div>`:''}
 ${r.unsafe_reason?`<div class="notice danger"><b>Unsafe task:</b> ${esc(r.unsafe_reason)}. Do not republish without independent reassessment.</div>`:''}
 ${r.status==='referred'?'<div class="notice warning">Authority referral is pending external action. No automatic report has been sent.</div>':''}
 ${pending&&r.risk!=='high'?'<p class="decision-note">For a suitable task, choose <b>Verify & publish EcoTask</b> once. This confirms report authenticity and publishes the authorised cleanup together. Volunteer consent is collected when the task is claimed.</p>':''}
 <div class="quick-actions">${actions||'<span class="muted">No further action required.</span>'}</div>`);
}
// FUNCTION: adminAct()
// PURPOSE: Display or update administrator controls.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function adminAct(id,action,confirmSite=false){
 if(action==='approve'&&!confirm('Verify this report only? It will not appear as an EcoTask.'))return;
 if(confirmSite&&!confirm('Confirm that the site has been assessed, permission obtained, safe task boundaries documented and suitable controls arranged. Publish for community cleanup?'))return;
 if(action==='resolve'&&!confirm('Approve the final cleanup evidence, mark the report RESOLVED and award 50 points?'))return;
 try{await post(`/api/admin/reports/${id}`,{action,site_confirmed:confirmSite});closeModal();await refresh();toast(action==='verify_publish'?'Report verified and EcoTask published.':action==='resolve'?'Cleanup approved — issue resolved and points awarded.':`Saved: ${action.replaceAll('_',' ')}`)}catch(e){toast(e.message)}
}

// FUNCTION: showTimeline()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function showTimeline(id){try{const r=await api(`/api/events/${id}`);modal(`${modalHead('Activity timeline','Auditable changes for this issue')}<div class="step-line">${r.events.length?r.events.map(e=>`<div><strong>${esc(e.action.replaceAll('_',' '))}</strong><p>${esc(e.detail||'Status recorded')} · ${fmt(e.created_at)}</p></div>`).join(''):'<p>No logged activity for this seeded sample.</p>'}</div>`)}catch(e){toast(e.message)}}
// Refresh after changes. The local application uses its own backend; external services need separate configuration.
refresh();
if('serviceWorker' in navigator){navigator.serviceWorker.register('/static/sw.js').catch(()=>{});}


// ===== ADMIN WORKSPACE (separate screens) =====
// Each module below is isolated so students can quickly find its purpose.
// FUNCTION: adminJump()
// PURPOSE: Display or update administrator controls.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function openAdminMetric(metric){
 state.adminSearch=''; state.filter=metric==='high-risk'?'all':metric;
 state.adminMetric=metric;
 setPage('a-reports');
}
function metricCard(title,count,subtitle,target,iconText){
 return `<button type="button" class="card stat admin-stat metric-link" onclick="openAdminMetric('${target}')" aria-label="View ${esc(title)}"><div class="stat-top">${esc(title)} <span class="stat-icon">${iconText}</span></div><strong>${count}</strong><small>${esc(subtitle)}</small><span class="metric-go">View matching reports ↗</span></button>`;
}
function adminReportMatches(r){let metric=state.adminMetric||'all';return metric==='all'||(metric==='high-risk'?r.risk==='high':metric==='pending'?['pending','flagged'].includes(r.status):metric==='completed'?r.task_status==='completed'||r.status==='resolved':metric==='available'?r.task_status==='available':r.status===metric)}
function adminJump(id){setPage(id)}
// FUNCTION: adminShell()
// PURPOSE: Display or update administrator controls.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function adminShell(title,description,body,action=''){
 const tabs=[['admin','Overview'],['a-reports','Issue reports'],['a-safety','Cleanups'],['a-referrals','Referrals'],['a-rewards','Points history'],['a-activity','Community members']];
 return pageHeading('ADMIN WORKSPACE',title,description,action)+`<div class="admin-tabs">${tabs.map(([id,name])=>`<button onclick="adminJump('${id}')" class="${state.page===id?'selected':''}">${name}</button>`).join('')}</div>`+body;
}
// FUNCTION: adminKpi()
// PURPOSE: Display or update administrator controls.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function adminKpi(name,value,info,iconText='◉'){return `<div class="card stat"><div class="stat-top">${esc(name)} <span>${iconText}</span></div><strong>${value}</strong><small>${esc(info)}</small></div>`}
// FUNCTION: adminTable()
// PURPOSE: Display or update administrator controls.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function adminTable(rows){return `<div class="card panel"><div class="table-wrap"><table class="report-table"><thead><tr><th>Issue & location</th><th>Submitted by</th><th>What happens next?</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.title)}</b><div class="meta">${esc(r.location)} · ${fmt(r.created_at)}</div></td><td>${esc(r.reporter_name)}</td><td>${r.task_status==='unsafe_suspended'?'Unsafe — task paused':r.task_status==='safety_review'?'Legacy task awaiting review':r.task_status==='evidence_review'?'Approve photo to resolve issue':r.status==='referred'?'Contact authority':r.status==='pending'||r.status==='flagged'?'Review once: verify, publish or refer':r.status==='approved'&&r.task_status==='none'?'Choose whether to publish as EcoTask':r.status==='resolved'?'✓ Completed & resolved':r.task_status==='available'?'Published — ready to claim':label(r.status)}</td><td>${btn('Review',`reviewReport(${r.id})`,'sm light')}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Nothing needs review here.</td></tr>'}</tbody></table></div></div>`}
// FUNCTION: adminHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function adminHtml(){const rs=state.reports,newReports=rs.filter(r=>['pending','flagged'].includes(r.status)),cleanups=rs.filter(r=>['evidence_review','unsafe_suspended','withdrawn_review'].includes(r.task_status)),referrals=rs.filter(r=>r.status==='referred');
 return adminShell('Good to see you.','Explore real-time reports and open the related records by clicking any statistic.',
 `<div class="stat-grid dashboard-metrics">
 ${metricCard('Total reports',rs.length,'All recorded issues','all','▤')}
 ${metricCard('Completed tasks',rs.filter(r=>r.task_status==='completed'||r.status==='resolved').length,'Verified and resolved','completed','✓')}
 ${metricCard('High-risk reports',rs.filter(r=>r.risk==='high').length,'Never publish as EcoTasks','high-risk','⚠')}
 ${metricCard('Available EcoTasks',rs.filter(r=>r.status==='approved'&&r.risk==='low'&&r.task_status==='available').length,'Published and ready to claim','available','♧')}
 </div><div class="admin-action-grid">
 ${[['New reports',newReports.length,'Review what people have reported','a-reports'],['Cleanup requests',cleanups.length,'Review completed cleanups or unsafe stops','a-safety'],['Authority follow-ups',referrals.length,'Track serious issue referrals','a-referrals'],['Community members',(state.adminData?.users||[]).filter(x=>x.role==='user').length,'Find a person and view their history','a-activity']].map(([name,num,desc,page])=>`<button class="admin-action" onclick="setPage('${page}')"><span class="admin-action-count">${num}</span><strong>${name}</strong><small>${desc}</small><span class="action-arrow">Open →</span></button>`).join('')}</div>
 <div class="section-head"><h2>Needs attention</h2>${btn('All reports',"openAdminMetric('all')",'sm light')}</div>
 ${adminTable([...cleanups,...newReports.filter(x=>!cleanups.some(y=>y.id===x.id))].slice(0,6))}
 <div class="admin-help"><strong>Demo tasks</strong><p>Sample reports are marked [DEMO] and are intended for testing only. High-risk records must never become cleanup tasks.</p></div>`);
}
// FUNCTION: adminReportsHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function adminReportsHtml(){const rs=state.reports.filter(r=>adminReportMatches(r)&&`${r.title} ${r.location} ${r.category}`.toLowerCase().includes(state.adminSearch.toLowerCase()));return adminShell('Issue reports','Review each issue once: verify it, publish a safe EcoTask, refer it or reject it.',`<div class="admin-controls"><input placeholder="Search issues or locations" value="${esc(state.adminSearch)}" oninput="state.adminSearch=this.value; updateAdminRows()" id="admin-search"><select onchange="state.filter=this.value;state.adminMetric=this.value;render()">${['all','pending','approved','available','completed','high-risk','referred','resolved','rejected'].map(x=>`<option value="${x}" ${(state.adminMetric||state.filter)===x?'selected':''}>${x.toUpperCase()}</option>`).join('')}</select></div><div id="admin-results">${adminTable(rs)}</div>`)}
// FUNCTION: updateAdminRows()
// PURPOSE: Display or update administrator controls.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function updateAdminRows(){const rs=state.reports.filter(r=>adminReportMatches(r)&&`${r.title} ${r.location} ${r.category}`.toLowerCase().includes(state.adminSearch.toLowerCase()));const node=$('#admin-results');if(node)node.innerHTML=adminTable(rs)}
// FUNCTION: adminSafetyHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function adminSafetyHtml(){const rs=state.reports.filter(r=>['claimed','safety_review','in_progress','unsafe_suspended','withdrawn_review','evidence_review'].includes(r.task_status));return adminShell('Cleanup reviews','Review submitted cleanup evidence, withdrawals and tasks stopped for safety. Claim consent is saved automatically.',`<div class="notice danger"><b>Unsafe task rule:</b> Any task stopped as unsafe stays suspended. No automated reassignment, and users lose no previously earned points.</div><div class="admin-queue-strip">${['in_progress','evidence_review','unsafe_suspended','withdrawn_review'].map(status=>`<div class="mini-count"><strong>${rs.filter(r=>r.task_status===status).length}</strong><small>${esc(label(status))}</small></div>`).join('')}</div>${adminTable(rs)}`)}
// FUNCTION: adminReferralsHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function adminReferralsHtml(){const rs=state.reports.filter(r=>r.status==='referred');return adminShell('Authority follow-ups','View serious issues and record referrals through official channels.',`<div class="notice warning"><b>Referral status:</b> "Pending external" means the administrator must use an official channel. Do not claim authorities have been notified.</div><div class="referral-links"><a href="https://www.brisbane.qld.gov.au/online-services/report-an-issue" target="_blank" rel="noopener">↗ Brisbane City Council reporting</a><a href="https://www.qld.gov.au/environment/management/pollution-management/reporting" target="_blank" rel="noopener">↗ Queensland pollution reporting</a></div>${adminTable(rs)}`)}
// FUNCTION: adminRewardsHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function adminRewardsHtml(){const pts=state.adminData?.points||[];const users=state.adminData?.users||[];return adminShell('Points history','See who earned points and why.',`<div class="stat-grid">${adminKpi('Points issued',pts.reduce((a,p)=>a+p.amount,0),'All recorded transactions','✧')}${adminKpi('Reward transactions',pts.length,'Duplicate awards prevented','▤')}${adminKpi('Registered community users',users.filter(u=>u.role==='user').length,'Users only','♙')}</div><div class="card panel"><div class="table-wrap"><table class="report-table"><thead><tr><th>Recipient</th><th>Report ID</th><th>Reason</th><th>Points</th><th>Date</th></tr></thead><tbody>${pts.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>#${p.report_id}</td><td>${esc(p.reason.replaceAll('_',' '))}</td><td class="positive">+${p.amount}</td><td>${fmt(p.created_at)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">No reward transactions yet. Approve a valid report to generate one.</td></tr>'}</tbody></table></div></div>`)}
// ===== ADMIN PEOPLE DIRECTORY =====
// Each user has one searchable profile with reports, tasks, reward history and events.
// Avoid scanning a single endless activity log for a particular person's information.
// FUNCTION: adminActivityHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function adminActivityHtml(){
 const users=(state.adminData?.users||[]).filter(u=>u.role==='user');
 return adminShell('People','Find a community member, open their profile, and review their complete journey.',
 `<div class="people-layout"><section class="card people-directory"><div class="directory-top"><div class="mini-label">COMMUNITY DIRECTORY</div><h2>People <span class="directory-count">${users.length}</span></h2><p>Search by name or email to review an individual account.</p><input id="people-search" type="search" placeholder="⌕  Search name or email..." value="${esc(state.personSearch)}" oninput="state.personSearch=this.value;renderPeopleList()" aria-label="Search people" /></div><div id="people-list" class="people-list">${peopleListHtml()}</div></section><section id="person-detail" class="person-detail">${personDetailHtml()}</section></div>`);
}
// FUNCTION: peopleListHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function peopleListHtml(){
 const query=state.personSearch.trim().toLowerCase();
 const users=(state.adminData?.users||[]).filter(u=>u.role==='user'&&`${u.name} ${u.email||''}`.toLowerCase().includes(query));
 return users.map(u=>`<button type="button" class="person-list-item ${state.selectedPersonId===u.id?'selected':''}" onclick="openPersonProfile(${u.id})"><span class="person-avatar">${esc((u.name||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span><span class="person-meta"><strong>${esc(u.name)}</strong><small>${esc(u.email||'')}</small></span><span class="person-chevron">›</span></button>`).join('')||'<div class="empty">No matching people found.</div>';
}
// FUNCTION: renderPeopleList()
// PURPOSE: Draw the selected screen using current application data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function renderPeopleList(){const root=$('#people-list');if(root)root.innerHTML=peopleListHtml()}
// FUNCTION: openPersonProfile()
// PURPOSE: Open the selected detail screen or camera.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function openPersonProfile(id){
 state.selectedPersonId=id;state.personLoading=true;state.personProfile=null;
 setPage('a-activity');renderPeopleList();const slot=$('#person-detail');if(slot)slot.innerHTML=personDetailHtml();
 try{const result=await api(`/api/admin/users/${id}/profile`);
   if(state.selectedPersonId!==id)return;
   state.personProfile=result;state.personLoading=false;const detail=$('#person-detail');if(detail)detail.innerHTML=personDetailHtml();renderPeopleList();
 }catch(e){state.personLoading=false;toast(e.message);const detail=$('#person-detail');if(detail)detail.innerHTML='<div class="card profile-placeholder">Unable to load this person.</div>'}
}
// FUNCTION: personDetailHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function personDetailHtml(){
 if(state.personLoading)return '<div class="card profile-placeholder">Loading profile and activity history…</div>';
 const d=state.personProfile;
 if(!d)return '<div class="card profile-placeholder"><div class="profile-placeholder-icon">◎</div><h2>Select a person</h2><p>Choose a community member from the directory to review their reports, tasks, rewards and activity.</p></div>';
 const u=d.user, sum=d.summary;
 return `<div class="card person-profile"><div class="profile-header"><span class="person-avatar large">${esc(u.name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span><div><div class="mini-label">COMMUNITY PROFILE · #${u.id}</div><h2>${esc(u.name)}</h2><p>${esc(u.email)}</p></div></div><div class="profile-kpis"><div><strong>${sum.reports_submitted}</strong><span>Reports submitted</span></div><div><strong>${sum.tasks_claimed}</strong><span>Cleanup claims</span></div><div><strong>${sum.points_earned}</strong><span>EcoPoints earned</span></div></div></div>
 <div class="card profile-section"><div class="section-head"><h2>Reports & cleanup tasks</h2><span class="mini-label">${d.reports.length} RELATED</span></div><div class="profile-records">${d.reports.map(r=>`<div class="profile-record"><div><strong>${esc(r.title)}</strong><p>${esc(r.location)} · ${fmt(r.created_at)} · ${r.user_id===u.id?'Reported':'Assigned cleanup'}</p><span>${tag(r.status)} ${tag(r.task_status)}</span></div>${btn('Review →',`reviewReport(${r.id})`,'sm light')}</div>`).join('')||'<p class="empty">No related reports yet.</p>'}</div></div>
 <div class="card profile-section"><div class="section-head"><h2>Rewards history</h2><span class="mini-label">${d.points.length} TRANSACTIONS</span></div>${d.points.length?d.points.map(p=>`<div class="profile-record"><div><strong>${esc(p.reason.replaceAll('_',' '))}</strong><p>Issue #${p.report_id} · ${fmt(p.created_at)}</p></div><strong class="positive">+${p.amount} pts</strong></div>`).join(''):'<p class="empty">No points awarded yet.</p>'}</div>
 <div class="card profile-section"><div class="section-head"><h2>Activity history</h2><span class="mini-label">${d.events.length} EVENTS</span></div>${d.events.length?d.events.map(e=>`<div class="profile-event"><span class="feed-dot"></span><div><strong>${esc(e.action.replaceAll('_',' '))}</strong><p>${esc(e.title)} · ${esc(e.actor_name||'System')}</p><small>${fmt(e.created_at)}${e.detail?' · '+esc(e.detail):''}</small></div>${btn('Open →',`reviewReport(${e.report_id})`,'sm ghost')}</div>`).join(''):'<p class="empty">No recorded events for this person yet.</p>'}</div>`;
}
// FUNCTION: adminPersonHtml()
// PURPOSE: Create the HTML for a user or admin screen.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function adminPersonHtml(){return adminActivityHtml()}
// ===== CAMERA / PHOTO INPUT =====
// Camera API works on HTTPS or localhost, where browsers grant permissions.
// File picker remains available for devices that do not support live capture.
let activeCameraStream=null;
// FUNCTION: previewPhoto()
// PURPOSE: Build uploaded-image display or preview.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function previewPhoto(input){const box=input.closest('form')?.querySelector('.photo-preview');if(!box||!input.files?.[0])return;const url=URL.createObjectURL(input.files[0]);box.innerHTML=`<img src="${url}" alt="Selected photo preview"><span>${esc(input.files[0].name)}</span>`;}
// FUNCTION: openCamera()
// PURPOSE: Open the selected detail screen or camera.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function openCamera(formType){
 const form=formType==='new-report'?$('#new-report'):document.querySelector('.modal form:not(#safety-form)');
 if(!form){toast('Open a photo form first.');return;} if(formType==='after-cleanup'){const input=form.querySelector('input[name=photo]');input.setAttribute('capture','environment');input.click();return;}
 const fileInput=form.querySelector('input[name=photo]');if(!fileInput){toast('Photo input not found.');return;}
 if(!navigator.mediaDevices?.getUserMedia){fileInput.setAttribute('capture','environment');fileInput.click();return;}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});activeCameraStream=stream;
  modal(`${modalHead('Take a photo','Review the scene from a safe place. Never approach hazards for a photo.')}<video id="camera-video" autoplay playsinline muted style="width:100%;max-height:320px;border-radius:14px;background:#111"></video><canvas id="camera-canvas" hidden></canvas><div class="quick-actions"><button class="btn" onclick="captureCamera('${formType}')">📷 Capture</button><button class="btn light" onclick="stopCamera()">Cancel</button></div>`);
  $('#camera-video').srcObject=stream;
 }catch(err){toast('Camera permission unavailable. Please use Choose photo.');fileInput.setAttribute('capture','environment');fileInput.click();}
}
// FUNCTION: stopCamera()
// PURPOSE: Allow the person to stop cleanup if conditions are unsafe.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function stopCamera(){if(activeCameraStream){activeCameraStream.getTracks().forEach(t=>t.stop());activeCameraStream=null;}closeModal()}
// FUNCTION: captureCamera()
// PURPOSE: Handle this user interface action or prepare its data.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
function captureCamera(formType){const v=$('#camera-video'),c=$('#camera-canvas');if(!v||!c||!v.videoWidth)return toast('Camera is not ready.');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);c.toBlob(blob=>{
 const file=new File([blob],'ecorewards-camera-'+Date.now()+'.jpg',{type:'image/jpeg'});const f=formType==='new-report'?$('#new-report'):document.querySelector('.modal form:not(#safety-form)');
 // For the report screen the form remains in DOM behind the camera modal.
 if(!f){stopCamera();toast('Photo captured; reopen form and choose file.');return;}
 const input=f.querySelector('input[name=photo]');const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;previewPhoto(input);stopCamera();toast('Photo captured and attached.');
 },'image/jpeg',0.87)}
const oldCloseModal=closeModal;
closeModal=function(){if(activeCameraStream){activeCameraStream.getTracks().forEach(t=>t.stop());activeCameraStream=null;}oldCloseModal();};


// ===== PHOTO CHECK REVIEW =====
// Calls admin-only endpoint and presents evidence side by side.
// Flagged means "needs review", never automatic fraud/rejection.
// FUNCTION: showPhotoChecks()
// PURPOSE: Build uploaded-image display or preview.
// CONNECTION: Called by the UI; API/database changes happen on the Flask backend.
async function showPhotoChecks(id){
 try{
  const data=await api(`/api/admin/reports/${id}/photo-checks`);
  const current=state.reports.find(r=>r.id===id);
  const pic=current?.photo?`<img class="verify-photo" src="/uploads/${encodeURIComponent(current.photo)}" alt="New report photo">`:'';
  const matches=data.matches.map(m=>`<div class="match-result"><div>${pic}<small>New report #${id}</small></div><div>${m.photo?`<img class="verify-photo" src="/uploads/${encodeURIComponent(m.photo)}" alt="Previously reported photo">`:''}<small>Earlier report #${m.matched_report_id}</small></div><div><strong>${esc(m.match_type.replaceAll('_',' '))}</strong><p>${esc(m.explanation)}</p><p>${esc(m.title)} · ${esc(m.location)}</p>${btn('Open earlier report',`reviewReport(${m.matched_report_id})`,'sm light')}</div></div>`).join('');
  modal(`${modalHead('Photo verification','No paid API. Compare suspected matches manually.')}<div class="notice">${esc(data.notice)}</div>${matches||'<div class="notice">No matches found among stored images. This does not prove the photo is original.</div>'}<div class="notice warning">Google/online photos cannot be reliably screened without an external search provider. ${esc(data.online_check)}</div><div class="quick-actions">${btn('Back to report',`reviewReport(${id})`,'light')}</div>`);
 }catch(e){toast(e.message)}
}
