/* ControlFut - SPA ligera sin frameworks. Datos en localStorage. 
   Refactored: utilities and storage helpers moved to utils.js and storage.js
*/

import { defaultData, loadAll, saveAll } from './storage.js';
import { uid, toast } from './utils.js';

let store = loadAll();
// Always start unauthenticated when the app or browser reloads:
let sessionUser = null;
localStorage.removeItem('sessionUser');

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
// removed function uid(prefix='id'){ return prefix + Math.random().toString(36).slice(2,9) }
// removed function toast(msg, timeout=4000, level='info'){ /* moved to utils.js */ }

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
      if (view==='analisisDatos') renderAnalisisDatos();
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
    const container = document.getElementById('mainpanel');
    if (!container) {
      // fallback to confirm if UI not available
      if (!confirm('Importar JSON reemplazará todos los datos actuales. ¿Continuar?')) { e.target.value = ''; return; }
      try {
        const text = await f.text();
        const parsed = JSON.parse(text);
        const keys = Object.keys(defaultData());
        for (const k of keys) if (!parsed[k]) throw new Error('Estructura inválida: falta '+k);
        for (const k of keys) { store[k] = parsed[k]; localStorage.setItem(k, JSON.stringify(store[k])); }
        toast('Datos importados');
        render();
      } catch (err){
        toast('Error al importar: '+err.message);
      } finally { e.target.value = ''; }
      return;
    }

    // remove existing import-validate if present
    const existing = container.querySelector('.import-validate-box');
    if (existing) { e.target.value = ''; return; }

    const box = document.createElement('div');
    box.className = 'message-box warning import-validate-box';
    box.setAttribute('role','dialog');
    box.innerHTML = `
      <div class="message-content">
        <strong>Importar JSON</strong><br>
        Importar reemplazará todos los datos actuales. Para confirmar, escriba <strong>IMPORTAR</strong> en el campo y presione Confirmar.
        <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
          <input id="confirmImportInput" placeholder="Escriba IMPORTAR" style="flex:1;padding:8px;border-radius:6px;border:1px solid #e6e9ee;background:#fff" />
          <button id="confirmImportBtn" class="btn danger" style="padding:8px 12px">Confirmar</button>
          <button id="cancelImportBtn" class="btn ghost" style="padding:8px 12px">Cancelar</button>
        </div>
      </div>
      <button class="message-close" aria-label="Cerrar mensaje">×</button>
    `;
    const firstChild = container.querySelector('.view') || container.firstChild;
    container.insertBefore(box, firstChild);

    const cleanup = ()=> {
      box.classList.add('hide');
      setTimeout(()=> { box.remove(); e.target.value = ''; }, 260);
    };

    box.querySelector('.message-close').addEventListener('click', cleanup);

    const input = box.querySelector('#confirmImportInput');
    const confirmBtn = box.querySelector('#confirmImportBtn');
    const cancelBtn = box.querySelector('#cancelImportBtn');

    cancelBtn.addEventListener('click', cleanup);
    input.addEventListener('keydown', (ev)=> { if (ev.key === 'Enter') confirmBtn.click(); });

    confirmBtn.addEventListener('click', async ()=> {
      const value = (input.value || '').trim().toLowerCase();
      if (value !== 'importar') {
        toast('Validación incorrecta: escribe "IMPORTAR" para confirmar', 4000, 'warning');
        input.focus();
        return;
      }
      // proceed with import
      try {
        const text = await f.text();
        const parsed = JSON.parse(text);
        // Validate keys
        const keys = Object.keys(defaultData());
        for (const k of keys) if (!parsed[k]) throw new Error('Estructura inválida: falta '+k);
        for (const k of keys) { store[k] = parsed[k]; localStorage.setItem(k, JSON.stringify(store[k])); }
        toast('Datos importados', 3000, 'success');
        render();
      } catch (err){
        toast('Error al importar: '+err.message, 5000, 'error');
      } finally {
        cleanup();
      }
    });

    // autofocus input
    setTimeout(()=> input.focus(), 120);
  });

  // Reset data (Herramientas -> Reiniciar datos) — now requires typed confirmation
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', ()=> {
      // create an inline validation message box that requests the user to type "REINICIAR"
      const container = document.getElementById('mainpanel');
      if (!container) return;
      // remove any existing inline prompts
      const existing = container.querySelector('.reset-validate-box');
      if (existing) existing.remove();

      const box = document.createElement('div');
      box.className = 'message-box warning reset-validate-box';
      box.setAttribute('role','dialog');
      box.innerHTML = `
        <div class="message-content">
          <strong>ATENCIÓN:</strong> Esta acción borrará todos los datos de la aplicación y no se podrá deshacer.<br>
          Para confirmar, escriba <strong>REINICIAR</strong> en el campo y presione Confirmar.
          <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
            <input id="confirmResetInput" placeholder="Escriba REINICIAR" style="flex:1;padding:8px;border-radius:6px;border:1px solid #e6e9ee;background:#fff" />
            <button id="confirmResetBtn" class="btn danger" style="padding:8px 12px">Confirmar</button>
            <button id="cancelResetBtn" class="btn ghost" style="padding:8px 12px">Cancelar</button>
          </div>
        </div>
        <button class="message-close" aria-label="Cerrar mensaje">×</button>
      `;
      // insert at top of mainpanel, before views
      const firstChild = container.querySelector('.view') || container.firstChild;
      container.insertBefore(box, firstChild);

      const cleanup = ()=> {
        box.classList.add('hide');
        setTimeout(()=> box.remove(), 260);
      };

      // close X
      box.querySelector('.message-close').addEventListener('click', cleanup);

      const input = box.querySelector('#confirmResetInput');
      const confirmBtn = box.querySelector('#confirmResetBtn');
      const cancelBtn = box.querySelector('#cancelResetBtn');

      // Cancel handler
      cancelBtn.addEventListener('click', cleanup);

      // Enter key support
      input.addEventListener('keydown', (e)=> { if (e.key === 'Enter') confirmBtn.click(); });

      confirmBtn.addEventListener('click', ()=> {
        const value = (input.value || '').trim().toLowerCase();
        if (value !== 'reiniciar') {
          toast('Validación incorrecta: escribe "REINICIAR" para confirmar', 4000, 'warning');
          input.focus();
          return;
        }
        // perform reset
        const keys = Object.keys(defaultData());
        for (const k of keys) localStorage.removeItem(k);
        localStorage.removeItem('sessionUser');
        store = defaultData();
        saveAll(store);
        sessionUser = null;
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.display = 'none';
        const userbox = document.getElementById('userbox'); if (userbox) userbox.textContent = '';
        const dashElReset = document.getElementById('dashboardUser'); if (dashElReset) dashElReset.textContent = '';
        cleanup();
        toast('Datos reiniciados', 3000, 'success');
        render();
        showView('login');
      });

      // focus input
      setTimeout(()=> input.focus(), 120);
    });
  }

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
    // do not show the user's name in the sidebar/topbar; only reveal the sidebar and welcome without attaching the name to the menu
    document.querySelector('.sidebar').style.display = 'block';
    toast('Bienvenido');
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
  document.getElementById('filterPerformance').addEventListener('change', renderPlayersList);

  // Analisis filters
  document.getElementById('searchAnalisis').addEventListener('input', renderAnalisisList);
  document.getElementById('analisisPosition').addEventListener('change', renderAnalisisList);
  document.getElementById('analisisStatus').addEventListener('change', renderAnalisisList);
  document.getElementById('analisisPerformance').addEventListener('change', renderAnalisisList);

  // Always start at the login view and hide the sidebar until a successful login
  document.querySelector('.sidebar').style.display = sessionUser ? 'block' : 'none';
  // Do not populate the sidebar with the signed-in user's name (menu should not display user's name).
  if (sessionUser) {
    const dashEl = document.getElementById('dashboardUser');
    if (dashEl) dashEl.textContent = `- ${sessionUser.name}`;
  }
  showView('login');
}

/* Authentication helpers */
function logout(){
  // Show an inline confirmation box (Yes / No) instead of native confirm()
  const container = document.getElementById('mainpanel');
  if (!container) {
    // fallback to classic confirm if UI not available
    if (!confirm('Cerrar sesión?')) return;
    sessionUser = null; localStorage.removeItem('sessionUser');
    document.getElementById('userbox').textContent = '';
    document.querySelector('.sidebar').style.display = 'none';
    showView('login');
    toast('Sesión cerrada');
    return;
  }

  // remove existing logout confirm if present
  const existing = container.querySelector('.logout-validate-box');
  if (existing) return; // already shown

  const box = document.createElement('div');
  box.className = 'message-box warning logout-validate-box';
  box.setAttribute('role','dialog');
  box.innerHTML = `
    <div class="message-content">
      <strong>Confirmar cierre de sesión</strong><br>
      ¿Desea cerrar la sesión actualmente activa? Seleccione <strong>SÍ</strong> para continuar o <strong>NO</strong> para cancelar.
      <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
        <button id="logoutYesBtn" class="btn danger" style="padding:8px 12px">SÍ</button>
        <button id="logoutNoBtn" class="btn ghost" style="padding:8px 12px">NO</button>
      </div>
    </div>
    <button class="message-close" aria-label="Cerrar mensaje">×</button>
  `;
  const firstChild = container.querySelector('.view') || container.firstChild;
  container.insertBefore(box, firstChild);

  const cleanup = ()=> {
    box.classList.add('hide');
    setTimeout(()=> box.remove(), 260);
  };

  box.querySelector('.message-close').addEventListener('click', cleanup);

  const yesBtn = box.querySelector('#logoutYesBtn');
  const noBtn = box.querySelector('#logoutNoBtn');

  noBtn.addEventListener('click', ()=> { cleanup(); toast('Operación cancelada', 1600, 'info'); });

  yesBtn.addEventListener('click', ()=> {
    // proceed with logout
    sessionUser = null;
    localStorage.removeItem('sessionUser');
    // don't display username in the menu; just hide the sidebar
    const dashElLogout = document.getElementById('dashboardUser'); if (dashElLogout) dashElLogout.textContent = '';
    document.querySelector('.sidebar').style.display = 'none';
    cleanup();
    showView('login');
    toast('Sesión cerrada', 2500, 'success');
  });
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
  renderAnalisisDatos();
}

/* Simple renderer for the new "Análisis de datos" view (placeholder) */
function renderAnalisisDatos(){
  const el = document.getElementById('view-analisisDatos');
  if (!el) return;
  // summary KPIs
  const kpiHtml = `
    <section class="cards" style="margin-bottom:12px">
      <div class="card"><strong>${store.jugadores.length}</strong><div class="meta">Jugadores registrados</div></div>
      <div class="card"><strong>${store.entrenamientos.length}</strong><div class="meta">Sesiones guardadas</div></div>
      <div class="card"><strong>${store.analisisNotas.length}</strong><div class="meta">Notas de análisis</div></div>
    </section>
  `;

  // Build a performance score and comment for each player
  const perfMap = { 'Bueno': 20, 'Pendiente de evaluación': 6, 'Bajo': -4 };
  // compute score: weighted combination (goals*4 + assists*3 + minutes/120 - cards*2 + perfMap)
  const playersWithScore = store.jugadores.map(p=>{
    const goals = Number(p.goals || 0);
    const assists = Number(p.assists || 0);
    const minutes = Number(p.minutes || 0);
    const cards = Number(p.cards || 0);
    const perfBase = perfMap[p.performance] || 0;
    const score = Math.round(goals*4 + assists*3 + (minutes/120) - (cards*2) + perfBase);
    // auto-comments based on data
    const comments = [];
    if (goals >= 8) comments.push('Alto aporte goleador');
    else if (goals >= 4) comments.push('Contribución de gol sólida');
    else if (goals === 0) comments.push('Sin goles registrados');

    if (assists >= 6) comments.push('Excelente asistente');
    else if (assists >= 2) comments.push('Aporta juego colectivo');

    if (minutes >= 1000) comments.push('Jugador habitual');
    else if (minutes < 200) comments.push('Poca participación');

    if (cards >= 4) comments.push('Revisar disciplina (tarjetas frecuentes)');
    if (String(p.status).toLowerCase() === 'lesionado') comments.push('Actualmente lesionado');

    if (p.performance === 'Pendiente de evaluación') comments.push('Requiere evaluación técnica');

    const comment = comments.length ? comments.join(' · ') : 'Sin observaciones destacadas';
    return { ...p, score, comment, goals, assists, minutes, cards };
  });

  // sort by score desc, then goals desc
  playersWithScore.sort((a,b)=> {
    if (b.score !== a.score) return b.score - a.score;
    return (b.goals - a.goals) || (a.name.localeCompare(b.name));
  });

  // build table rows
  const rows = playersWithScore.map((p, i)=>`
    <tr>
      <td style="padding:8px 10px">${i+1}</td>
      <td style="padding:8px 10px"><strong>${p.name}</strong><div class="meta" style="margin-top:4px">${p.position} • #${p.number || '—'}</div></td>
      <td style="padding:8px 10px;text-align:center">${p.goals}</td>
      <td style="padding:8px 10px;text-align:center">${p.assists}</td>
      <td style="padding:8px 10px;text-align:center">${p.cards}</td>
      <td style="padding:8px 10px;text-align:center">${Math.round(p.minutes)}</td>
      <td style="padding:8px 10px;text-align:center"><strong>${p.score}</strong></td>
      <td style="padding:8px 10px;max-width:320px">${p.comment}</td>
    </tr>
  `).join('');

  const tableHtml = `
    <div class="card" style="overflow:auto">
      <h3 style="margin-top:0;margin-bottom:8px">Resumen rápido</h3>
      <p style="margin:0 0 12px;color:var(--muted)">Tabla de rendimiento — clasificada de mayor a menor según una puntuación compuesta por goles, asistencias, minutos jugados, tarjetas y evaluación de rendimiento.</p>
      <table style="width:100%;border-collapse:collapse;font-size:0.95rem">
        <thead>
          <tr style="text-align:left;color:#08303a">
            <th style="padding:8px 10px;width:36px">#</th>
            <th style="padding:8px 10px">Jugador</th>
            <th style="padding:8px 10px;text-align:center">Goles</th>
            <th style="padding:8px 10px;text-align:center">Asist.</th>
            <th style="padding:8px 10px;text-align:center">Tarj.</th>
            <th style="padding:8px 10px;text-align:center">Min.</th>
            <th style="padding:8px 10px;text-align:center">Punt.</th>
            <th style="padding:8px 10px">Comentarios de análisis</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="8" style="padding:12px;color:var(--muted)">No hay jugadores registrados.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  el.innerHTML = `<h2>Análisis de datos</h2>${kpiHtml}${tableHtml}`;
}

function renderDashboard(){
  const stats = {
    total: store.jugadores.length,
    // consider as "lesionados" any player with status 'Lesionado', an explicit injured flag,
    // or notes that include 'lesión'/'lesionado' (case-insensitive)
    lesionados: store.jugadores.filter(p=>{
      if (!p) return false;
      if (String(p.status).toLowerCase() === 'lesionado') return true;
      if (p.injured === true) return true;
      if (p.notes && /lesi[oó]n|lesionado/i.test(p.notes)) return true;
      return false;
    }).length,
    activo: store.jugadores.filter(p=>String(p.status) === 'Activo').length,
    pendiente: store.jugadores.filter(p=>p.performance === 'Pendiente de evaluación').length,
    bueno: store.jugadores.filter(p=>p.performance==='Bueno').length,
    bajo: store.jugadores.filter(p=>p.performance==='Bajo').length,
    suspendidos: store.jugadores.filter(p=>p.status==='Suspendido').length,
    retirados: store.jugadores.filter(p=>p.status==='Retirado').length,
  };
  const cards = document.getElementById('statsCards');
  cards.innerHTML = '';
  const mapping = [
    ['Total inscritos', stats.total],
    ['Activos', stats.activo],
    ['Pendiente Evaluación', stats.pendiente],
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
  // Populate two distinct lists: recientes y antiguos
  const listRecent = document.getElementById('recentPlayersRecent');
  const listOld = document.getElementById('recentPlayersOld');
  listRecent.innerHTML = '';
  listOld.innerHTML = '';
  const now = new Date();
  const recentPlayers = [];
  const oldPlayers = [];
  // ensure we iterate all players so lists represent the complete roster
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

  // if no players at all, show message in both lists
  if (recentPlayers.length === 0 && oldPlayers.length === 0) {
    listRecent.innerHTML = '<li>No hay jugadores.</li>';
    listOld.innerHTML = '<li>No hay jugadores.</li>';
  } else {
    if (recentPlayers.length > 0) {
      recentPlayers.forEach(p=>{
        const li = document.createElement('li');
        // include player status so dashboard lists clearly show estado
        li.innerHTML = `${p.name} • #${p.number || '—'} • ${p.position} • <strong>${p.status || '—'}</strong>
          <div class="meta">Ingreso: ${p.joined || '—'}</div>`;
        listRecent.appendChild(li);
      });
    } else {
      listRecent.innerHTML = '<li>No hay jugadores recientes.</li>';
    }

    if (oldPlayers.length > 0) {
      oldPlayers.forEach(p=>{
        const li = document.createElement('li');
        li.innerHTML = `${p.name} • #${p.number || '—'} • ${p.position} • <strong>${p.status || '—'}</strong>
          <div class="meta">Ingreso: ${p.joined || '—'}</div>`;
        listOld.appendChild(li);
      });
    } else {
      listOld.innerHTML = '<li>No hay jugadores antiguos.</li>';
    }
  }

  // notifications — disable the "bajo rendimiento" text entirely
  const chip = document.getElementById('notificationChip'); chip.textContent = '';
}

function renderPlayersList(){
  const list = document.getElementById('playersList');
  const q = document.getElementById('searchPlayers').value.toLowerCase();
  const pos = document.getElementById('filterPosition').value;
  const status = document.getElementById('filterStatus').value;
  const perf = document.getElementById('filterPerformance').value;
  const filtered = store.jugadores.filter(p=>{
    if (pos && p.position!==pos) return false;
    if (status && p.status!==status) return false;
    if (perf && p.performance!==perf) return false;
    if (q && !(p.name.toLowerCase().includes(q) || String(p.number).includes(q))) return false;
    return true;
  });
  list.innerHTML = '';

  // helper to remove any existing inline profile card in this list
  function clearInlineProfiles() {
    list.querySelectorAll('.inline-profile').forEach(n=>n.remove());
  }

  filtered.forEach(p=>{
    const li = document.createElement('li');
    li.setAttribute('data-id', p.id);
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
      if (action === 'view') {
        const li = list.querySelector(`li[data-id="${id}"]`);
        if (!li) return;
        const next = li.nextElementSibling;
        // toggle: if inline profile exists for this id, remove it
        if (next && next.classList.contains('inline-profile') && next.getAttribute('data-for') === id) {
          next.remove();
          return;
        }
        // remove other inline profiles first
        clearInlineProfiles();

        // build inline profile element
        const p = store.jugadores.find(x=>x.id===id);
        const profile = document.createElement('div');
        profile.className = 'inline-profile card profile';
        profile.setAttribute('data-for', id);
        profile.innerHTML = `<h4>${p.name} • #${p.number}</h4>
          <div class="meta">${p.position} • ${p.age} años • ${p.status}</div>
          <p><strong>Rendimiento:</strong> ${p.performance}</p>
          <p><strong>Goles:</strong> ${p.goals} • <strong>Asistencias:</strong> ${p.assists} • <strong>Minutos:</strong> ${p.minutes} • <strong>Tarjetas:</strong> ${p.cards}</p>
          <p><strong>Ingreso:</strong> ${p.joined}</p>
          <p>${p.notes||''}</p>
          <div class="row"><button class="btn primary inline-add-note" data-id="${id}">Agregar nota</button></div>
        `;
        // insert after the clicked li
        li.insertAdjacentElement('afterend', profile);

        // attach add-note handler
        profile.querySelector('.inline-add-note').addEventListener('click', ()=>{
          const note = prompt('Nota de seguimiento:');
          if (!note) return;
          store.analisisNotas.push({ id: uid('n'), playerId:id, text:note, date:new Date().toISOString() });
          localStorage.setItem('analisisNotas', JSON.stringify(store.analisisNotas));
          toast('Nota agregada');
        });

        // ensure it is visible (helpful on small screens)
        setTimeout(()=> profile.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
      }
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
    li.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <strong style="font-size:1rem">${a.name}</strong>
          <div class="meta" style="font-size:0.9rem;color:var(--muted)">${a.role}</div>
        </div>
        <div class="meta" style="display:flex;gap:10px;flex-wrap:wrap;color:var(--muted);font-size:0.92rem">
          <span>📧 ${a.email || '—'}</span>
          <span>📞 ${a.phone || '—'}</span>
          <span>🗓️ ${a.hired || '—'}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" data-id="${a.id}" data-action="edit">Editar</button>
        <button class="btn danger" data-id="${a.id}" data-action="del">Eliminar</button>
      </div>`;
    ul.appendChild(li);
  });

  ul.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.id;
      const action = b.dataset.action;
      if (action === 'del') {
        if (!confirm('Eliminar administrativo?')) return;
        store.personalAdministrativo = store.personalAdministrativo.filter(x=>x.id!==id);
        localStorage.setItem('personalAdministrativo', JSON.stringify(store.personalAdministrativo));
        renderAdmins();
        return;
      }
      if (action === 'edit') {
        // populate admin form for editing
        const a = store.personalAdministrativo.find(x=>x.id===id);
        if (!a) return toast('Administrativo no encontrado');
        const form = document.getElementById('adminForm');
        form.name.value = a.name || '';
        form.role.value = a.role || '';
        form.phone.value = a.phone || '';
        form.email.value = a.email || '';
        form.hired.value = a.hired || '';

        // swap submit handler temporarily
        const handler = function(e){
          e.preventDefault();
          const data = Object.fromEntries(new FormData(form).entries());
          Object.assign(a, data);
          localStorage.setItem('personalAdministrativo', JSON.stringify(store.personalAdministrativo));
          toast('Administrativo actualizado');
          form.removeEventListener('submit', handler);
          form.addEventListener('submit', adminFormDefaultSubmit);
          form.reset();
          renderAdmins();
          showView('registrarAdmin');
        };
        form.removeEventListener('submit', adminFormDefaultSubmit);
        form.addEventListener('submit', handler);
        // switch to form view
        showView('registrarAdmin');
      }
    });
  });
}

function renderSupport(){
  const ul = document.getElementById('supportList'); ul.innerHTML='';
  store.personalSoporte.forEach(s=>{
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <strong style="font-size:1rem">${s.name}</strong>
          <div class="meta" style="font-size:0.9rem;color:var(--muted)">${s.role}</div>
        </div>
        <div class="meta" style="display:flex;gap:10px;flex-wrap:wrap;color:var(--muted);font-size:0.92rem">
          <span>📧 ${s.email || '—'}</span>
          <span>📞 ${s.phone || '—'}</span>
          <span>🗓️ ${s.hired || '—'}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" data-id="${s.id}" data-action="edit">Editar</button>
        <button class="btn danger" data-id="${s.id}" data-action="del">Eliminar</button>
      </div>`;
    ul.appendChild(li);
  });

  ul.querySelectorAll('button').forEach(b=>b.addEventListener('click', ()=>{
    const id = b.dataset.id;
    const action = b.dataset.action || 'del';
    if (action === 'del') {
      if (!confirm('Eliminar personal de soporte?')) return;
      store.personalSoporte = store.personalSoporte.filter(x=>x.id!==id);
      localStorage.setItem('personalSoporte', JSON.stringify(store.personalSoporte));
      renderSupport();
      return;
    }
    if (action === 'edit') {
      const s = store.personalSoporte.find(x=>x.id===id);
      if (!s) return toast('Personal de soporte no encontrado');
      const form = document.getElementById('supportForm');
      form.name.value = s.name || '';
      form.role.value = s.role || '';
      form.phone.value = s.phone || '';
      form.email.value = s.email || '';
      form.hired.value = s.hired || '';

      // one-time submit handler for editing
      const handler = function(e){
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        Object.assign(s, data);
        localStorage.setItem('personalSoporte', JSON.stringify(store.personalSoporte));
        toast('Personal de soporte actualizado');
        form.removeEventListener('submit', handler);
        form.reset();
        renderSupport();
        showView('registrarSoporte');
      };
      form.addEventListener('submit', handler);
      // switch to form view
      showView('registrarSoporte');
    }
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

  // helper to remove any existing inline profile card
  function clearInlineProfiles(){
    ul.querySelectorAll('.inline-profile').forEach(n=>n.remove());
  }

  filtered.forEach(p=>{
    const li = document.createElement('li');
    li.setAttribute('data-id', p.id);
    li.innerHTML = `<div><strong>${p.name}</strong><div class="meta">#${p.number} • ${p.position} • ${p.performance}</div></div>
      <div><button class="btn" data-id="${p.id}">Ver</button></div>`;
    ul.appendChild(li);
  });

  // click handler: insert profile below the clicked list item
  ul.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', (ev)=>{
      const id = b.dataset.id;
      const li = ul.querySelector(`li[data-id="${id}"]`);
      if (!li) return;
      // toggle: if an inline profile for this id already exists right after, remove it
      const next = li.nextElementSibling;
      if (next && next.classList.contains('inline-profile') && next.getAttribute('data-for') === id) {
        next.remove();
        return;
      }
      // remove other inline profiles first
      clearInlineProfiles();

      // build inline profile element
      const p = store.jugadores.find(x=>x.id===id);
      const profile = document.createElement('div');
      profile.className = 'inline-profile card profile';
      profile.setAttribute('data-for', id);
      profile.innerHTML = `
        <h4>${p.name} • #${p.number}</h4>
        <div class="meta">${p.position} • ${p.age} años • ${p.status}</div>
        <div class="profile-split" role="group" aria-label="Perfil y gráfico">
          <div class="profile-data">
            <p><strong>Rendimiento:</strong> ${p.performance}</p>
            <p><strong>Goles:</strong> ${p.goals} • <strong>Asistencias:</strong> ${p.assists} • <strong>Minutos:</strong> ${p.minutes} • <strong>Tarjetas:</strong> ${p.cards}</p>
            <p><strong>Ingreso:</strong> ${p.joined}</p>
            <p>${p.notes||''}</p>
            <div class="row" style="margin-top:10px"><button class="btn primary inline-add-note" data-id="${id}">Agregar nota</button></div>
          </div>
          <div class="profile-chart" aria-hidden="false">
            <canvas id="chart-${id}" width="520" height="320" role="img" aria-label="Gráfico de goles, asistencias y tarjetas"></canvas>
            <div class="chart-tooltip" id="tooltip-${id}"></div>
          </div>
        </div>
      `;
      // insert after the clicked li
      li.insertAdjacentElement('afterend', profile);

      // attach add-note handler
      profile.querySelector('.inline-add-note').addEventListener('click', ()=>{
        const note = prompt('Nota de seguimiento:');
        if (!note) return;
        store.analisisNotas.push({ id: uid('n'), playerId:id, text:note, date:new Date().toISOString() });
        localStorage.setItem('analisisNotas', JSON.stringify(store.analisisNotas));
        toast('Nota agregada');
      });

      // draw chart for this player
      setTimeout(()=> {
        const canvas = profile.querySelector(`#chart-${id}`);
        const tooltip = profile.querySelector(`#tooltip-${id}`);
        if (canvas && tooltip) drawBarChart(canvas, tooltip, { labels: ['Goles','Asistencias','Tarjetas'], values: [Number(p.goals||0), Number(p.assists||0), Number(p.cards||0)], colors: ['#0b7a5f','#0b6fa8','#ff9a3c'] });
      }, 80);

      // scroll into view smoothly on mobile / small screens
      setTimeout(()=> profile.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
    });
  });
}

/* small bar chart renderer used in análisis inline profile */
function drawBarChart(canvas, tooltipEl, data){
  // minimal responsive canvas drawing with hover tooltip
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  const padding = 14;
  const labels = data.labels || [];
  const values = data.values || [];
  const colors = data.colors || [];
  const maxVal = Math.max(1, ...values);
  const colCount = labels.length;
  const gap = 12;
  const colWidth = Math.max(18, (w - padding*2 - gap*(colCount-1)) / colCount);

  // clear
  ctx.clearRect(0,0,w,h);

  // draw baseline
  ctx.fillStyle = '#f4f7f6';
  ctx.fillRect(0,0,w,h);

  // draw columns
  const cols = [];
  for (let i=0;i<colCount;i++){
    const val = values[i] || 0;
    const ratio = val / maxVal;
    const colH = Math.max(6, (h - padding*2) * ratio);
    const x = padding + i*(colWidth + gap);
    const y = h - padding - colH;
    ctx.fillStyle = colors[i] || '#0b7a5f';
    // rounded rect
    const r = 6;
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+colWidth, y, x+colWidth, y+colH, r);
    ctx.arcTo(x+colWidth, y+colH, x, y+colH, r);
    ctx.arcTo(x, y+colH, x, y, r);
    ctx.arcTo(x, y, x+colWidth, y, r);
    ctx.closePath();
    ctx.fill();
    // save hit area
    cols.push({ x, y, w: colWidth, h: colH, label: labels[i], value: val });
    // draw label
    ctx.fillStyle = '#08303a';
    ctx.font = '12px system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + colWidth/2, h - 6);
  }

  // interaction: show tooltip on mousemove
  function moveHandler(e){
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    let found = null;
    for (const c of cols){
      if (mx >= c.x && mx <= c.x + c.w && my >= (h - padding - c.h) && my <= h - padding) { found = c; break; }
    }
    if (found){
      tooltipEl.style.display = 'block';
      tooltipEl.textContent = `${found.label}: ${found.value}`;
      // position tooltip near pointer but keep inside chart
      const left = Math.min(r.width - 10, Math.max(10, (found.x + found.w/2)));
      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${(r.top + window.scrollY) ? 8 : 8}px`;
      // highlight column by drawing lighter overlay
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle = '#f4f7f6';
      ctx.fillRect(0,0,w,h);
      for (const c of cols){
        ctx.fillStyle = (c === found) ? shadeColor(colors[labels.indexOf(c.label)] || '#0b7a5f', 12) : (colors[labels.indexOf(c.label)] || '#0b7a5f');
        // redraw
        const x = c.x, colH = c.h, y = h - padding - colH;
        const r2 = 6;
        ctx.beginPath();
        ctx.moveTo(x+r2, y);
        ctx.arcTo(x+c.w, y, x+c.w, y+colH, r2);
        ctx.arcTo(x+c.w, y+colH, x, y+colH, r2);
        ctx.arcTo(x, y+colH, x, y, r2);
        ctx.arcTo(x, y, x+c.w, y, r2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#08303a';
        ctx.font = '12px system-ui, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(c.label, x + c.w/2, h - 6);
      }
    } else {
      tooltipEl.style.display = 'none';
      // redraw normal
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle = '#f4f7f6';
      ctx.fillRect(0,0,w,h);
      for (let i=0;i<cols.length;i++){
        const c = cols[i];
        ctx.fillStyle = colors[i] || '#0b7a5f';
        const x = c.x, colH = c.h, y = h - padding - colH;
        const r2 = 6;
        ctx.beginPath();
        ctx.moveTo(x+r2, y);
        ctx.arcTo(x+c.w, y, x+c.w, y+colH, r2);
        ctx.arcTo(x+c.w, y+colH, x, y+colH, r2);
        ctx.arcTo(x, y+colH, x, y, r2);
        ctx.arcTo(x, y, x+c.w, y, r2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#08303a';
        ctx.font = '12px system-ui, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(c.label, x + c.w/2, h - 6);
      }
    }
  }

  function leaveHandler(){
    tooltipEl.style.display = 'none';
    // redraw normal
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#f4f7f6';
    ctx.fillRect(0,0,w,h);
    for (let i=0;i<cols.length;i++){
      const c = cols[i];
      ctx.fillStyle = colors[i] || '#0b7a5f';
      const x = c.x, colH = c.h, y = h - padding - colH;
      const r2 = 6;
      ctx.beginPath();
      ctx.moveTo(x+r2, y);
      ctx.arcTo(x+c.w, y, x+c.w, y+colH, r2);
      ctx.arcTo(x+c.w, y+colH, x, y+colH, r2);
      ctx.arcTo(x, y+colH, x, y, r2);
      ctx.arcTo(x, y, x+c.w, y, r2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#08303a';
      ctx.font = '12px system-ui, Arial';
      ctx.textAlign = 'center';
      ctx.fillText(c.label, x + c.w/2, h - 6);
    }
  }

  canvas.addEventListener('mousemove', moveHandler);
  canvas.addEventListener('mouseleave', leaveHandler);

  // small utility to slightly brighten color
  function shadeColor(hex, percent) {
    const c = hex.replace('#','');
    const num = parseInt(c,16);
    const r = Math.min(255, ((num >> 16) + percent));
    const g = Math.min(255, (((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, ((num & 0x0000FF) + percent));
    return `rgb(${r},${g},${b})`;
  }
}

/* initial binding for player form default handler */
playerFormDefaultSubmit = function(e){
  e.preventDefault(); // will be replaced by initUI
};