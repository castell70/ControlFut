/* ControlFut - SPA ligera sin frameworks. Datos en localStorage. */

const STORAGE_KEYS = ['usuarios','jugadores','personalAdministrativo','personalSoporte','entrenamientos','analisisNotas','sessionUser'];

function defaultData() {
  const usuarios = [
    { id: 'u_admin', username: 'admin', password: '3000', name:'Administrador', email:'admin@club.local', phone:'000', role:'admin' },
  ];
  const jugadores = [
    { id:'p1', name:'Carlos López', age:27, position:'Delantero', number:9, status:'Activo', performance:'Bueno', goals:8, assists:3, minutes:1200, cards:2, joined:'2021-02-15', notes:'' },
    { id:'p2', name:'Miguel Torres', age:24, position:'Mediocampista', number:8, status:'Activo', performance:'Pendiente de evaluación', goals:2, assists:4, minutes:800, cards:1, joined:'2022-01-10', notes:'' },
    { id:'p3', name:'José Ruiz', age:30, position:'Defensor', number:4, status:'Activo', performance:'Bueno', goals:1, assists:1, minutes:1400, cards:5, joined:'2019-07-01', notes:'' },
    { id:'p4', name:'Andrés Peña', age:21, position:'Delantero', number:11, status:'Suspendido', performance:'Bajo', goals:0, assists:0, minutes:200, cards:3, joined:'2023-03-05', notes:'' },
    { id:'p5', name:'Juan Pérez', age:33, position:'Portero', number:1, status:'Retirado', performance:'Pendiente de evaluación', goals:0, assists:0, minutes:0, cards:0, joined:'2010-08-12', notes:'' },
  ];
  const personalAdministrativo = [
    { id:'a1', name:'Laura Gómez', role:'Gerente', phone:'555-0101', email:'laura@club.local', hired:'2018-06-01' },
    { id:'a2', name:'Raúl Díaz', role:'Contador', phone:'555-0102', email:'raul@club.local', hired:'2019-09-15' },
  ];
  const personalSoporte = [
    { id:'s1', name:'María López', role:'Fisioterapeuta', phone:'555-0201', email:'maria@club.local', hired:'2020-02-05' },
    { id:'s2', name:'Ricardo Sol', role:'Médico', phone:'555-0202', email:'ricardo@club.local', hired:'2017-11-11' },
  ];
  const entrenamientos = [
    { id:'t1', date:'2024-02-10', time:'09:00', type:'Táctico', attendance:['p1','p3'], notes:'' },
    { id:'t2', date:'2024-02-12', time:'10:30', type:'Físico', attendance:['p1','p2','p3'], notes:'' },
    { id:'t3', date:'2024-02-14', time:'08:00', type:'Técnico', attendance:['p3','p4'], notes:'' },
  ];
  const analisisNotas = [];
  return { usuarios, jugadores, personalAdministrativo, personalSoporte, entrenamientos, analisisNotas };
}

function loadAll() {
  const data = {};
  for (const key of Object.keys(defaultData())) {
    const raw = localStorage.getItem(key);
    data[key] = raw ? JSON.parse(raw) : defaultData()[key];
  }
  // Ensure admin exists in usuarios
  if (!data.usuarios.find(u=>u.username==='admin')) {
    data.usuarios.push({ id: 'u_admin', username: 'admin', password: '3000', name:'Administrador', email:'admin@club.local', phone:'000', role:'admin' });
  }
  return data;
}

function saveAll(store) {
  for (const k of Object.keys(store)) {
    localStorage.setItem(k, JSON.stringify(store[k]));
  }
}

let store = loadAll();
let sessionUser = JSON.parse(localStorage.getItem('sessionUser') || 'null');

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  initUI();
  render();

  // help button binding: open help modal
  const helpBtn = document.getElementById('helpBtn');
  const helpModal = document.getElementById('helpModal');
  if (document.getElementById('helpYear')) document.getElementById('helpYear').textContent = new Date().getFullYear();
  if (helpBtn && helpModal) {
    const openModal = ()=> {
      helpModal.setAttribute('aria-hidden','false');
      helpModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    const closeModal = ()=> {
      helpModal.setAttribute('aria-hidden','true');
      helpModal.classList.remove('open');
      document.body.style.overflow = '';
    };
    helpBtn.addEventListener('click', openModal);
    helpModal.querySelectorAll('[data-dismiss="modal"]').forEach(btn=> btn.addEventListener('click', closeModal));
    // close on Escape
    document.addEventListener('keydown', (e)=> { if (e.key==='Escape' && helpModal.classList.contains('open')) closeModal(); });
  }
});

/* Utilities */
function uid(prefix='id'){ return prefix + Math.random().toString(36).slice(2,9) }
function toast(msg, timeout=3000){
  const el = document.getElementById('toast');
  el.textContent = msg; el.style.opacity=1; el.style.transform='translateY(0)';
  setTimeout(()=>{ el.style.opacity=0; el.style.transform='translateY(8px)'; }, timeout);
}

/* Routing / Views */
const views = Array.from(document.querySelectorAll('.view'));
function showView(name) {
  views.forEach(v=>v.id==='view-'+name ? v.classList.add('active') : v.classList.remove('active'));
  // highlight sidebar
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
}

/* Initialization of UI & events */
function initUI(){
  // Sidebar buttons
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const view = btn.dataset.view;
      if (!requireAuth(view)) { toast('Acceso denegado. Inicia sesión'); showView('login'); return; }
      showView(view);
      if (view==='dashboard') renderDashboard();
      if (view==='registrarJugador') renderPlayersList();
      if (view==='registrarAdmin') renderAdmins();
      if (view==='registrarSoporte') renderSupport();
      if (view==='entrenamientos') renderTrainings();
      if (view==='analisis') renderAnalisisList();
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Import/Export
  document.getElementById('exportBtn').addEventListener('click', ()=>{
    const payload = {};
    for (const k of Object.keys(defaultData())) payload[k] = store[k];
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'controlfut-data.json'; a.click();
    URL.revokeObjectURL(url);
    toast('Exportado JSON');
  });
  document.getElementById('importFile').addEventListener('change', async (e)=>{
    const f = e.target.files[0]; if (!f) return;
    if (!confirm('Importar JSON reemplazará todos los datos actuales. ¿Continuar?')) return;
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      // Validate keys
      const keys = Object.keys(defaultData());
      for (const k of keys) if (!parsed[k]) throw new Error('Estructura inválida: falta '+k);
      for (const k of keys) { store[k] = parsed[k]; localStorage.setItem(k, JSON.stringify(store[k])); }
      toast('Datos importados');
      render();
    } catch (err){
      toast('Error al importar: '+err.message);
    } finally { e.target.value = ''; }
  });

  // Auth forms
  document.getElementById('showRegister').addEventListener('click', ()=> document.getElementById('registerCard').hidden = false);
  document.getElementById('cancelRegister').addEventListener('click', ()=> document.getElementById('registerCard').hidden = true);

  document.getElementById('registerForm').addEventListener('submit', e=>{
    e.preventDefault();
    const f = e.target;
    const data = Object.fromEntries(new FormData(f).entries());
    if (!/^\S+@\S+\.\S+$/.test(data.email)) return toast('Email inválido');
    if (data.password.length < 6) return toast('Contraseña mínimo 6 caracteres');
    if (store.usuarios.find(u=>u.username===data.username)) return toast('Nombre de usuario ya existe');
    const user = { id: uid('u'), username: data.username, password: data.password, name: data.name, email: data.email, phone: data.phone, role:'user' };
    store.usuarios.push(user); localStorage.setItem('usuarios', JSON.stringify(store.usuarios));
    toast('Usuario registrado');
    f.reset(); document.getElementById('registerCard').hidden = true;
  });

  document.getElementById('loginForm').addEventListener('submit', e=>{
    e.preventDefault();
    const fm = new FormData(e.target);
    const username = fm.get('username'), password = fm.get('password');
    const user = store.usuarios.find(u=>u.username===username && u.password===password);
    if (!user) return toast('Credenciales incorrectas');
    sessionUser = { id:user.id, username:user.username, role:user.role, name:user.name };
    localStorage.setItem('sessionUser', JSON.stringify(sessionUser));
    document.getElementById('userbox').textContent = `${user.name} (${user.username})`;
    // reveal sidebar now that user is authenticated
    document.querySelector('.sidebar').style.display = 'block';
    toast('Bienvenido '+user.name);
    showView('dashboard'); renderDashboard();
  });

  // Player form
  document.getElementById('playerForm').addEventListener('submit', e=>{
    e.preventDefault();
    if (!sessionUser) return toast('Inicia sesión');
    const fm = new FormData(e.target); const data = Object.fromEntries(fm.entries());
    data.age = Number(data.age); data.number = Number(data.number);
    data.goals = Number(data.goals||0); data.assists = Number(data.assists||0); data.minutes = Number(data.minutes||0); data.cards = Number(data.cards||0);
    // unique number for active players
    if (data.number && store.jugadores.find(p=>p.number===data.number && p.status==='Activo')) return toast('Número de camiseta ya asignado a un jugador activo');
    const player = { id: uid('p'), ...data };
    store.jugadores.push(player); localStorage.setItem('jugadores', JSON.stringify(store.jugadores));
    toast('Jugador guardado');
    e.target.reset(); renderPlayersList(); renderDashboard();
  });
  document.getElementById('resetPlayer').addEventListener('click', ()=> document.getElementById('playerForm').reset());

  // Admin form
  document.getElementById('adminForm').addEventListener('submit', e=>{
    e.preventDefault();
    if (!sessionUser) return toast('Inicia sesión');
    const data = Object.fromEntries(new FormData(e.target).entries());
    const admin = { id: uid('a'), ...data };
    store.personalAdministrativo.push(admin); localStorage.setItem('personalAdministrativo', JSON.stringify(store.personalAdministrativo));
    toast('Administrativo guardado'); e.target.reset(); renderAdmins();
  });
  document.getElementById('resetAdmin').addEventListener('click', ()=> document.getElementById('adminForm').reset());

  // Support form
  document.getElementById('supportForm').addEventListener('submit', e=>{
    e.preventDefault();
    if (!sessionUser) return toast('Inicia sesión');
    const data = Object.fromEntries(new FormData(e.target).entries());
    const s = { id: uid('s'), ...data };
    store.personalSoporte.push(s); localStorage.setItem('personalSoporte', JSON.stringify(store.personalSoporte));
    toast('Personal de soporte guardado'); e.target.reset(); renderSupport();
  });
  document.getElementById('resetSupport').addEventListener('click', ()=> document.getElementById('supportForm').reset());

  // Training form
  document.getElementById('trainingForm').addEventListener('submit', e=>{
    e.preventDefault();
    if (!sessionUser) return toast('Inicia sesión');
    const data = Object.fromEntries(new FormData(e.target).entries());
    const attendance = (data.attendance||'').split(',').map(s=>s.trim()).filter(Boolean);
    const t = { id: uid('t'), date:data.date, time:data.time, type:data.type, attendance, notes:data.notes };
    store.entrenamientos.push(t); localStorage.setItem('entrenamientos', JSON.stringify(store.entrenamientos));
    toast('Sesión guardada'); e.target.reset(); renderTrainings();
  });
  document.getElementById('resetTraining').addEventListener('click', ()=> document.getElementById('trainingForm').reset());

  // Players list filters
  document.getElementById('searchPlayers').addEventListener('input', renderPlayersList);
  document.getElementById('filterPosition').addEventListener('change', renderPlayersList);
  document.getElementById('filterStatus').addEventListener('change', renderPlayersList);

  // Analisis filters
  document.getElementById('searchAnalisis').addEventListener('input', renderAnalisisList);
  document.getElementById('analisisPosition').addEventListener('change', renderAnalisisList);
  document.getElementById('analisisStatus').addEventListener('change', renderAnalisisList);
  document.getElementById('analisisPerformance').addEventListener('change', renderAnalisisList);

  // Always start at the login view and hide the sidebar until a successful login
  document.querySelector('.sidebar').style.display = sessionUser ? 'block' : 'none';
  if (sessionUser) {
    document.getElementById('userbox').textContent = `${sessionUser.name} (${sessionUser.username})`;
  }
  showView('login');
}

/* Authentication helpers */
function logout(){
  if (!confirm('Cerrar sesión?')) return;
  sessionUser = null; localStorage.removeItem('sessionUser');
  document.getElementById('userbox').textContent = '';
  // hide sidebar on logout and return to login view
  document.querySelector('.sidebar').style.display = 'none';
  showView('login');
  toast('Sesión cerrada');
}

function requireAuth(view){
  // allow login view always
  if (view==='login' || view==='registrar') return true;
  return sessionUser != null;
}

/* Rendering functions */
function render(){
  // sync store with localStorage
  for (const k of Object.keys(store)) localStorage.setItem(k, JSON.stringify(store[k]));
  renderDashboard();
  renderPlayersList();
  renderAdmins();
  renderSupport();
  renderTrainings();
  renderAnalisisList();
}

function renderDashboard(){
  const stats = {
    total: store.jugadores.length,
    lesionados: 0,
    bueno: store.jugadores.filter(p=>p.performance==='Bueno').length,
    bajo: store.jugadores.filter(p=>p.performance==='Bajo').length,
    suspendidos: store.jugadores.filter(p=>p.status==='Suspendido').length,
    retirados: store.jugadores.filter(p=>p.status==='Retirado').length,
  };
  const cards = document.getElementById('statsCards');
  cards.innerHTML = '';
  const mapping = [
    ['Total inscritos', stats.total],
    ['Lesionados', stats.lesionados],
    ['Buen rendimiento', stats.bueno],
    ['Bajo rendimiento', stats.bajo],
    ['Suspendidos', stats.suspendidos],
    ['Retirados', stats.retirados],
  ];
  mapping.forEach(([label,val])=>{
    const c = document.createElement('div'); c.className='card';
    c.innerHTML = `<strong style="font-size:1.2rem">${val}</strong><div class="meta">${label}</div>`;
    cards.appendChild(c);
  });

  // Group recent vs old players based on joined date (recent = within last 2 years)
  const recent = document.getElementById('recentPlayers');
  recent.innerHTML = '';
  const now = new Date();
  const recentPlayers = [];
  const oldPlayers = [];
  store.jugadores.slice().reverse().forEach(p=>{
    const joinedDate = p.joined ? new Date(p.joined) : null;
    if (!joinedDate || isNaN(joinedDate)) {
      oldPlayers.push(p);
    } else {
      const years = (now - joinedDate) / (1000 * 60 * 60 * 24 * 365.25);
      if (years <= 2) recentPlayers.push(p);
      else oldPlayers.push(p);
    }
  });
  // Build grouped display
  if (recentPlayers.length === 0 && oldPlayers.length === 0) {
    recent.innerHTML = '<li>No hay jugadores.</li>';
  } else {
    if (recentPlayers.length > 0) {
      const headerR = document.createElement('li');
      headerR.innerHTML = `<strong>Recientes (ingresados en los últimos 2 años)</strong>`;
      headerR.style.background = 'transparent';
      headerR.style.padding = '6px 0';
      recent.appendChild(headerR);
      recentPlayers.slice(0,6).forEach(p=>{
        const li = document.createElement('li');
        li.innerHTML = `${p.name} • #${p.number} • ${p.position} <div class="meta">Ingreso: ${p.joined || '—'}</div>`;
        recent.appendChild(li);
      });
    }
    if (oldPlayers.length > 0) {
      const headerO = document.createElement('li');
      headerO.innerHTML = `<strong>Antiguos (más de 2 años)</strong>`;
      headerO.style.background = 'transparent';
      headerO.style.padding = '6px 0';
      recent.appendChild(headerO);
      oldPlayers.slice(0,6).forEach(p=>{
        const li = document.createElement('li');
        li.innerHTML = `${p.name} • #${p.number} • ${p.position} <div class="meta">Ingreso: ${p.joined || '—'}</div>`;
        recent.appendChild(li);
      });
    }
  }

  // notifications
  const chip = document.getElementById('notificationChip'); chip.textContent = '';
  // hide the specific "1 bajo rendimiento" message: only show when count is not exactly 1
  if (stats.bajo > 0 && stats.bajo !== 1) chip.textContent = `${stats.bajo} bajo rendimiento`;
}

function renderPlayersList(){
  const list = document.getElementById('playersList');
  const q = document.getElementById('searchPlayers').value.toLowerCase();
  const pos = document.getElementById('filterPosition').value;
  const status = document.getElementById('filterStatus').value;
  const filtered = store.jugadores.filter(p=>{
    if (pos && p.position!==pos) return false;
    if (status && p.status!==status) return false;
    if (q && !(p.name.toLowerCase().includes(q) || String(p.number).includes(q))) return false;
    return true;
  });
  list.innerHTML = '';
  filtered.forEach(p=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${p.name}</strong><div class="meta">#${p.number} • ${p.position} • ${p.status}</div></div>
      <div class="actions">
        <button class="btn" data-id="${p.id}" data-action="view">Ver</button>
        <button class="btn ghost" data-id="${p.id}" data-action="edit">Editar</button>
        <button class="btn danger" data-id="${p.id}" data-action="del">Eliminar</button>
      </div>`;
    list.appendChild(li);
  });
  // actions
  list.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = btn.dataset.id; const action = btn.dataset.action;
      if (action==='view'){ showPlayerProfile(id); showView('analisis'); document.querySelector('.nav-btn[data-view="analisis"]').classList.add('active'); }
      if (action==='del'){ if (!confirm('Eliminar jugador?')) return; store.jugadores = store.jugadores.filter(x=>x.id!==id); localStorage.setItem('jugadores', JSON.stringify(store.jugadores)); toast('Jugador eliminado'); renderPlayersList(); renderDashboard(); }
      if (action==='edit'){ editPlayer(id); }
    });
  });
}

function showPlayerProfile(id){
  const p = store.jugadores.find(x=>x.id===id);
  const el = document.getElementById('playerProfile'); if (!p) return el.innerHTML='<p>No encontrado</p>';
  el.innerHTML = `<h4>${p.name} • #${p.number}</h4>
    <div class="meta">${p.position} • ${p.age} años • ${p.status}</div>
    <p><strong>Rendimiento:</strong> ${p.performance}</p>
    <p><strong>Goles:</strong> ${p.goals} • <strong>Asistencias:</strong> ${p.assists} • <strong>Minutos:</strong> ${p.minutes} • <strong>Tarjetas:</strong> ${p.cards}</p>
    <p><strong>Ingreso:</strong> ${p.joined}</p>
    <p>${p.notes||''}</p>
    <div class="row"><button class="btn primary" id="addNoteBtn">Agregar nota</button></div>
  `;
  document.getElementById('addNoteBtn').addEventListener('click', ()=>{
    const note = prompt('Nota de seguimiento:');
    if (!note) return;
    store.analisisNotas.push({ id: uid('n'), playerId:id, text:note, date:new Date().toISOString() });
    localStorage.setItem('analisisNotas', JSON.stringify(store.analisisNotas));
    toast('Nota agregada');
  });
}

function editPlayer(id){
  const p = store.jugadores.find(x=>x.id===id); if (!p) return;
  // populate playerForm for editing (simple replace on submit)
  const form = document.getElementById('playerForm');
  form.name.value = p.name; form.age.value = p.age; form.position.value = p.position; form.number.value = p.number;
  form.status.value = p.status; form.performance.value = p.performance; form.goals.value = p.goals; form.assists.value = p.assists;
  form.minutes.value = p.minutes; form.cards.value = p.cards; form.joined.value = p.joined; form.notes.value = p.notes || '';
  // change submit handler temporarily
  const handler = function(e){
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.age = Number(data.age); data.number = Number(data.number);
    data.goals = Number(data.goals||0); data.assists = Number(data.assists||0); data.minutes = Number(data.minutes||0); data.cards = Number(data.cards||0);
    // check duplicates
    if (store.jugadores.find(x=>x.number===data.number && x.id!==id && x.status==='Activo')) { toast('Número duplicado'); return; }
    Object.assign(p, data);
    localStorage.setItem('jugadores', JSON.stringify(store.jugadores));
    toast('Jugador actualizado');
    form.removeEventListener('submit', handler);
    form.addEventListener('submit', playerFormDefaultSubmit);
    form.reset();
    renderPlayersList(); renderDashboard();
  };
  // swap handlers
  form.removeEventListener('submit', playerFormDefaultSubmit);
  form.addEventListener('submit', handler);
  showView('registrarJugador');
}

function playerFormDefaultSubmit(e){ /* placeholder to allow swapping */ }

function renderAdmins(){
  const ul = document.getElementById('adminsList'); ul.innerHTML='';
  store.personalAdministrativo.forEach(a=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${a.name}</strong><div class="meta">${a.role} • ${a.email}</div></div>
      <div><button class="btn danger" data-id="${a.id}">Eliminar</button></div>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll('button').forEach(b=>b.addEventListener('click', ()=>{
    if (!confirm('Eliminar administrativo?')) return;
    store.personalAdministrativo = store.personalAdministrativo.filter(x=>x.id!==b.dataset.id);
    localStorage.setItem('personalAdministrativo', JSON.stringify(store.personalAdministrativo)); renderAdmins();
  }));
}

function renderSupport(){
  const ul = document.getElementById('supportList'); ul.innerHTML='';
  store.personalSoporte.forEach(s=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${s.name}</strong><div class="meta">${s.role} • ${s.email}</div></div>
      <div><button class="btn danger" data-id="${s.id}">Eliminar</button></div>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll('button').forEach(b=>b.addEventListener('click', ()=>{
    if (!confirm('Eliminar personal de soporte?')) return;
    store.personalSoporte = store.personalSoporte.filter(x=>x.id!==b.dataset.id);
    localStorage.setItem('personalSoporte', JSON.stringify(store.personalSoporte)); renderSupport();
  }));
}

function renderTrainings(){
  const ul = document.getElementById('trainingList'); ul.innerHTML='';
  store.entrenamientos.forEach(t=>{
    // Map attendance ids to player names (fallback to id if not found)
    const names = (t.attendance||[]).map(id=>{
      const p = store.jugadores.find(j=>j.id===id);
      return p ? p.name : id;
    });
    const attendeeLine = names.length ? names.join(', ') : 'Sin asistentes';
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="width:100%"><strong>${t.date} ${t.time}</strong>
        <div class="meta">${t.type} • Asistencias: ${names.length}</div>
        <div class="attendees" title="${attendeeLine}">${attendeeLine}</div>
      </div>
      <div class="actions"><button class="btn ghost" data-id="${t.id}" data-action="edit">Editar</button><button class="btn danger" data-id="${t.id}" data-action="del">Eliminar</button></div>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.id; const action = b.dataset.action;
      if (action==='del'){ if (!confirm('Eliminar sesión?')) return; store.entrenamientos = store.entrenamientos.filter(x=>x.id!==id); localStorage.setItem('entrenamientos', JSON.stringify(store.entrenamientos)); renderTrainings(); }
      else if (action==='edit'){ const t = store.entrenamientos.find(x=>x.id===id); if (!t) return; const form = document.getElementById('trainingForm'); form.date.value=t.date; form.time.value=t.time; form.type.value=t.type; form.attendance.value=(t.attendance||[]).join(','); form.notes.value=t.notes||''; showView('entrenamientos'); }
    });
  });
}

function renderAnalisisList(){
  const ul = document.getElementById('analisisList'); ul.innerHTML='';
  const q = document.getElementById('searchAnalisis').value.toLowerCase();
  const pos = document.getElementById('analisisPosition').value;
  const status = document.getElementById('analisisStatus').value;
  const perf = document.getElementById('analisisPerformance').value;
  const filtered = store.jugadores.filter(p=>{
    if (pos && p.position!==pos) return false;
    if (status && p.status!==status) return false;
    if (perf && p.performance!==perf) return false;
    if (q && !p.name.toLowerCase().includes(q)) return false;
    return true;
  });
  filtered.forEach(p=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${p.name}</strong><div class="meta">#${p.number} • ${p.position} • ${p.performance}</div></div>
      <div><button class="btn" data-id="${p.id}">Ver</button></div>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll('button').forEach(b=>b.addEventListener('click', ()=> showPlayerProfile(b.dataset.id)));
}

/* initial binding for player form default handler */
playerFormDefaultSubmit = function(e){
  e.preventDefault(); // will be replaced by initUI
};