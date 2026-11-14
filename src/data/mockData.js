function pad(n) {
  return String(n).padStart(2, '0')
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dateOffset(daysAgo) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isoAt(hours, minutes) {
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

function clock(hours, minutes) {
  return `${pad(hours)}:${pad(minutes)}`
}

export const childrenData = [
  { id: 1, name: 'Emma Silva', age: 4, guardian: 'Sara Silva', phone: '(21) 9 8765-0101', allergies: 'Amendoim', plan: 'Mensal', entryTime: '08:15', exitTime: null, image: null },
  { id: 2, name: 'Liam Santos', age: 3, guardian: 'Miguel Santos', phone: '(21) 9 8765-0102', allergies: 'Nenhuma', plan: 'Anual', entryTime: '08:30', exitTime: null, image: null },
  { id: 3, name: 'Olívia Oliveira', age: 5, guardian: 'Lisa Oliveira', phone: '(21) 9 8765-0103', allergies: 'Lactose', plan: 'Mensal', entryTime: '08:05', exitTime: null, image: null },
  { id: 4, name: 'Noah Costa', age: 4, guardian: 'Tomás Costa', phone: '(21) 9 8765-0104', allergies: 'Nenhuma', plan: 'Anual', entryTime: '08:45', exitTime: null, image: null },
  { id: 5, name: 'Ava Souza', age: 3, guardian: 'Ana Souza', phone: '(21) 9 8765-0105', allergies: 'Glúten', plan: 'Mensal', entryTime: '09:00', exitTime: null, image: null },
  { id: 6, name: 'Ethan Pereira', age: 5, guardian: 'Cristiano Pereira', phone: '(21) 9 8765-0106', allergies: 'Nenhuma', plan: 'Anual', entryTime: '08:20', exitTime: null, image: null },
  { id: 7, name: 'Sofia Ferreira', age: 4, guardian: 'Joana Ferreira', phone: '(21) 9 8765-0107', allergies: 'Ovos', plan: 'Mensal', entryTime: '08:10', exitTime: null, image: null },
  { id: 8, name: 'Mason Almeida', age: 3, guardian: 'Paulo Almeida', phone: '(21) 9 8765-0108', allergies: 'Nenhuma', plan: 'Anual', entryTime: '08:50', exitTime: null, image: null },
  { id: 9, name: 'Isabella Rocha', age: 4, guardian: 'Marina Rocha', phone: '(21) 9 8765-0109', allergies: 'Nenhuma', plan: 'Mensal', entryTime: '09:10', exitTime: null, image: null },
  { id: 10, name: 'Gabriel Martins', age: 5, guardian: 'Roberto Martins', phone: '(21) 9 8765-0110', allergies: 'Camarão', plan: 'Anual', entryTime: '08:40', exitTime: null, image: null },
  { id: 11, name: 'Helena Dias', age: 3, guardian: 'Carla Dias', phone: '(21) 9 8765-0111', allergies: 'Nenhuma', plan: 'Mensal', entryTime: '09:20', exitTime: null, image: null },
  { id: 12, name: 'Arthur Nunes', age: 4, guardian: 'Felipe Nunes', phone: '(21) 9 8765-0112', allergies: 'Leite', plan: 'Anual', entryTime: '08:55', exitTime: null, image: null },
]

/** Crianças que entram no parquinho ao ativar exemplos (mín. 8) */
export const samplePresentChildIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const ATTENDANCE_PATTERN = {
  1: [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13],
  2: [0, 1, 3, 4, 6, 8, 10, 11, 13],
  3: [0, 1, 2, 3, 4, 6, 7, 8, 9, 11, 12],
  4: [0, 2, 3, 5, 7, 9, 12, 13],
  5: [1, 2, 4, 6, 8, 11, 13],
  6: [0, 1, 2, 4, 5, 7, 9, 10, 12],
  7: [0, 1, 2, 3, 5, 7, 8, 10, 11, 12],
  8: [0, 3, 5, 8, 10, 12],
  9: [0, 1, 2, 4, 6, 8, 9, 11],
  10: [0, 2, 3, 5, 7, 9, 10, 13],
  11: [1, 3, 5, 7, 9, 11],
  12: [0, 2, 4, 6, 8, 10, 12],
}

const EXIT_BY_CHILD = {
  1: '16:40', 2: '16:10', 3: '17:00', 4: '15:50',
  5: '16:20', 6: '16:55', 7: '16:35', 8: '15:40',
  9: '16:45', 10: '16:15', 11: '15:55', 12: '16:50',
}

let attendanceId = 1
export const attendanceData = childrenData.flatMap((child) => {
  const days = ATTENDANCE_PATTERN[child.id] || [0, 2, 4]
  // Histórico: dias anteriores com saída; hoje fica na presença ao vivo
  return days
    .filter((daysAgo) => daysAgo > 0)
    .map((daysAgo) => ({
      id: attendanceId++,
      childId: child.id,
      childName: child.name,
      date: dateOffset(daysAgo),
      entryTime: child.entryTime,
      exitTime: EXIT_BY_CHILD[child.id] || '16:30',
      guardian: child.guardian,
    }))
})

export const staffData = [
  { id: 1, name: 'Profa. Raquel Verde', email: 'raquel.verde@gmail.com', phone: '(21) 9 8765-0201', status: 'Ativo' },
  { id: 2, name: 'Prof. David Lima', email: 'david.lima@gmail.com', phone: '(21) 9 8765-0202', status: 'Ativo' },
  { id: 3, name: 'Profa. Carla Branca', email: 'carla.branca@gmail.com', phone: '(21) 9 8765-0203', status: 'Ativo' },
  { id: 4, name: 'Prof. Tiago Clarke', email: 'tiago.clarke@gmail.com', phone: '(21) 9 8765-0204', status: 'Ativo' },
  { id: 5, name: 'Profa. Nina Patel', email: 'nina.patel@gmail.com', phone: '(21) 9 8765-0205', status: 'De Licença' },
  { id: 6, name: 'Prof. André Campos', email: 'andre.campos@gmail.com', phone: '(21) 9 8765-0206', status: 'Ativo' },
  { id: 7, name: 'Profa. Beatriz Lopes', email: 'beatriz.lopes@gmail.com', phone: '(21) 9 8765-0207', status: 'Ativo' },
  { id: 8, name: 'Aux. Marcos Vieira', email: 'marcos.vieira@gmail.com', phone: '(21) 9 8765-0208', status: 'Ativo' },
]

export const activitiesData = [
  { id: 1, title: 'Roda da Manhã', description: 'Conversa e atividades do calendário', time: '08:30', startTime: '08:30', endTime: '09:00', professor: 'Profa. Raquel Verde', day: 'Diário' },
  { id: 2, title: 'Artes e Manuais', description: 'Sessão criativa de pintura e desenho', time: '10:00', startTime: '10:00', endTime: '10:45', professor: 'Profa. Carla Branca', day: 'Segunda-feira' },
  { id: 3, title: 'Hora da História', description: 'Leitura interativa e contação de histórias', time: '10:30', startTime: '10:30', endTime: '11:00', professor: 'Prof. David Lima', day: 'Terça-feira' },
  { id: 4, title: 'Brincadeira ao Ar Livre', description: 'Atividades supervisionadas no playground', time: '11:00', startTime: '11:00', endTime: '12:00', professor: 'Prof. Tiago Clarke', day: 'Diário' },
  { id: 5, title: 'Música e Movimento', description: 'Músicas, dança e atividades rítmicas', time: '14:00', startTime: '14:00', endTime: '14:30', professor: 'Profa. Beatriz Lopes', day: 'Quarta-feira' },
  { id: 6, title: 'Exploração Científica', description: 'Experimentos simples e estudo da natureza', time: '14:30', startTime: '14:30', endTime: '15:15', professor: 'Prof. André Campos', day: 'Quinta-feira' },
  { id: 7, title: 'Circuito Motor', description: 'Equilíbrio, corrida e coordenação', time: '09:30', startTime: '09:30', endTime: '10:10', professor: 'Aux. Marcos Vieira', day: 'Sexta-feira' },
  { id: 8, title: 'Hora do Lanche Guiado', description: 'Hábitos alimentares e autonomia', time: '15:00', startTime: '15:00', endTime: '15:25', professor: 'Profa. Raquel Verde', day: 'Diário' },
  { id: 9, title: 'Yoga Kids', description: 'Respiração e alongamentos suaves', time: '13:30', startTime: '13:30', endTime: '14:00', professor: 'Profa. Beatriz Lopes', day: 'Segunda-feira' },
  { id: 10, title: 'Oficina de Fantoches', description: 'Criação de personagens e teatro', time: '10:15', startTime: '10:15', endTime: '11:00', professor: 'Profa. Carla Branca', day: 'Quarta-feira' },
]

export const mealsData = [
  { day: 'Segunda-feira', breakfast: 'Aveia e frutas', lunch: 'Frango e legumes', snack: 'Fatias de maçã' },
  { day: 'Terça-feira', breakfast: 'Iogurte e granola', lunch: 'Macarrão com queijo', snack: 'Biscoitos e queijo' },
  { day: 'Quarta-feira', breakfast: 'Panquecas', lunch: 'Sanduíche de peru', snack: 'Banana' },
  { day: 'Quinta-feira', breakfast: 'Ovos e torrada', lunch: 'Massa e salada', snack: 'Uvas' },
  { day: 'Sexta-feira', breakfast: 'Cereal e leite', lunch: 'Pizza e salada', snack: 'Palitos de legumes' },
]

function buildWeekSchedule() {
  const staffShifts = [
    { staffId: 1, staffName: 'Profa. Raquel Verde', start: [8, 0], end: [16, 0] },
    { staffId: 2, staffName: 'Prof. David Lima', start: [8, 0], end: [12, 0] },
    { staffId: 3, staffName: 'Profa. Carla Branca', start: [8, 30], end: [16, 30] },
    { staffId: 4, staffName: 'Prof. Tiago Clarke', start: [12, 0], end: [17, 0] },
    { staffId: 6, staffName: 'Prof. André Campos', start: [9, 0], end: [15, 0] },
    { staffId: 7, staffName: 'Profa. Beatriz Lopes', start: [8, 0], end: [14, 0] },
    { staffId: 8, staffName: 'Aux. Marcos Vieira', start: [10, 0], end: [18, 0] },
  ]
  const rows = []
  let id = 1
  // 3 dias atrás → 3 dias à frente (0 = hoje)
  ;[-3, -2, -1, 0, 1, 2, 3].forEach((ago) => {
    const date = dateOffset(ago)
    staffShifts.forEach((shift, idx) => {
      if ((idx + Math.abs(ago)) % 3 === 0 && ago !== 0) return
      rows.push({
        id: id++,
        staffId: shift.staffId,
        staffName: shift.staffName,
        date,
        startTime: clock(shift.start[0], shift.start[1]),
        endTime: clock(shift.end[0], shift.end[1]),
      })
    })
  })
  return rows
}

export const staffScheduleData = buildWeekSchedule()

/**
 * Sessões ativas de exemplo (crianças no parquinho agora).
 */
export function buildSamplePresenceSessions(unitId = null) {
  const present = childrenData.filter((c) => samplePresentChildIds.includes(c.id))
  return present.map((child, index) => {
    const [hh, mm] = String(child.entryTime || '08:30').split(':').map(Number)
    return {
      id: 9000 + child.id,
      childId: child.id,
      childName: child.name,
      guardian: child.guardian || 'Responsável',
      status: 'in',
      entryTime: child.entryTime || clock(8, 15 + index * 5),
      entryAt: isoAt(Number.isFinite(hh) ? hh : 8, Number.isFinite(mm) ? mm : 30),
      exitTime: null,
      exitAt: null,
      date: todayKey(),
      unitId: unitId || null,
      confirmed: true,
    }
  })
}
