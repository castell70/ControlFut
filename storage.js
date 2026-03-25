export function defaultData() {
  const usuarios = [
    { id: 'u_admin', username: 'admin', password: '3000', name:'', email:'admin@club.local', phone:'000', role:'admin' },
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

export function loadAll() {
  const data = {};
  for (const key of Object.keys(defaultData())) {
    const raw = localStorage.getItem(key);
    data[key] = raw ? JSON.parse(raw) : defaultData()[key];
  }
  // Ensure admin exists in usuarios
  if (!data.usuarios.find(u=>u.username==='admin')) {
    data.usuarios.push({ id: 'u_admin', username: 'admin', password: '3000', name:'', email:'admin@club.local', phone:'000', role:'admin' });
  }
  return data;
}

export function saveAll(store) {
  for (const k of Object.keys(store)) {
    localStorage.setItem(k, JSON.stringify(store[k]));
  }
}