/* small utilities used across the app */

export function uid(prefix='id'){ return prefix + Math.random().toString(36).slice(2,9) }

/* toast — creates an inline message box at top of mainpanel (info|success|warning|error) */
export function toast(msg, timeout=4000, level='info'){
  const container = document.getElementById('mainpanel');
  if (!container) return console.warn(msg);
  const box = document.createElement('div');
  box.className = `message-box ${level}`;
  box.setAttribute('role','status');
  box.innerHTML = `<div class="message-content">${msg}</div><button class="message-close" aria-label="Cerrar mensaje">×</button>`;
  const firstChild = container.querySelector('.view') || container.firstChild;
  container.insertBefore(box, firstChild);
  box.querySelector('.message-close').addEventListener('click', ()=> {
    box.classList.add('hide');
    setTimeout(()=> box.remove(), 260);
  });
  if (level !== 'error') {
    setTimeout(()=> {
      if (!document.body.contains(box)) return;
      box.classList.add('hide');
      setTimeout(()=> box.remove(), 260);
    }, timeout);
  }
}