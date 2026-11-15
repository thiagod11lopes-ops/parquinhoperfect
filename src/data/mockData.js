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

/** Unidades de exemplo (modo exemplo). */
export const sampleUnitsData = [
  { id: 'sample-unit-1', name: 'Unidade Centro' },
  { id: 'sample-unit-2', name: 'Unidade Norte' },
  { id: 'sample-unit-3', name: 'Unidade Sul' },
  { id: 'sample-unit-4', name: 'Unidade Leste' },
  { id: 'sample-unit-5', name: 'Unidade Oeste' },
  { id: 'sample-unit-6', name: 'Unidade Jardins' },
  { id: 'sample-unit-7', name: 'Unidade Praia' },
]

/** Gerentes de exemplo por unidade (modo exemplo). */
export const sampleManagersData = [
  { id: 'sample-mgr-1a', unitId: 'sample-unit-1', name: 'Carla Mendes', email: 'carla.mendes@exemplo.com' },
  { id: 'sample-mgr-1b', unitId: 'sample-unit-1', name: 'Roberto Dias', email: 'roberto.dias@exemplo.com' },
  { id: 'sample-mgr-2a', unitId: 'sample-unit-2', name: 'Fernanda Lima', email: 'fernanda.lima@exemplo.com' },
  { id: 'sample-mgr-3a', unitId: 'sample-unit-3', name: 'Paulo Henrique', email: 'paulo.henrique@exemplo.com' },
  { id: 'sample-mgr-3b', unitId: 'sample-unit-3', name: 'Juliana Costa', email: 'juliana.costa@exemplo.com' },
  { id: 'sample-mgr-4a', unitId: 'sample-unit-4', name: 'Marcos Vieira', email: 'marcos.vieira@exemplo.com' },
  { id: 'sample-mgr-5a', unitId: 'sample-unit-5', name: 'Amanda Rocha', email: 'amanda.rocha@exemplo.com' },
  { id: 'sample-mgr-5b', unitId: 'sample-unit-5', name: 'Diego Nunes', email: 'diego.nunes@exemplo.com' },
  { id: 'sample-mgr-6a', unitId: 'sample-unit-6', name: 'Beatriz Lopes', email: 'beatriz.lopes@exemplo.com' },
  { id: 'sample-mgr-7a', unitId: 'sample-unit-7', name: 'Ricardo Alves', email: 'ricardo.alves@exemplo.com' },
  { id: 'sample-mgr-7b', unitId: 'sample-unit-7', name: 'Patrícia Souza', email: 'patricia.souza@exemplo.com' },
]

/** Avaliações de entrega de exemplo (visível no modo exemplo para o gerente). */
export const sampleRatingsData = [
  {
    id: 'sample-rating-1',
    handoverId: 'sample-handover-1',
    stars: 5,
    comment: 'Entrega tranquila. A Emma estava feliz e contou o que aprendeu na roda da manhã.',
    authorRole: 'responsavel',
    authorName: 'Sara Silva',
    childId: 1,
    childName: 'Emma Silva',
    guardianName: 'Sara Silva',
    professorName: 'Profa. Raquel Verde',
    exitTime: '16:40',
    at: `${dateOffset(1)}T16:42:00.000Z`,
    date: dateOffset(1),
    time: '16:42',
  },
  {
    id: 'sample-rating-2',
    handoverId: 'sample-handover-1b',
    stars: 5,
    comment: 'Responsável pontual e muito atencioso na retirada.',
    authorRole: 'professor',
    authorName: 'Profa. Raquel Verde',
    childId: 1,
    childName: 'Emma Silva',
    guardianName: 'Sara Silva',
    professorName: 'Profa. Raquel Verde',
    exitTime: '16:40',
    at: `${dateOffset(1)}T16:43:00.000Z`,
    date: dateOffset(1),
    time: '16:43',
  },
  {
    id: 'sample-rating-3',
    handoverId: 'sample-handover-2',
    stars: 4,
    comment: 'Tudo certo na saída. Só demorou um pouco na conferência da mochila.',
    authorRole: 'responsavel',
    authorName: 'Miguel Santos',
    childId: 2,
    childName: 'Liam Santos',
    guardianName: 'Miguel Santos',
    professorName: 'Prof. David Lima',
    exitTime: '16:10',
    at: `${dateOffset(2)}T16:12:00.000Z`,
    date: dateOffset(2),
    time: '16:12',
  },
  {
    id: 'sample-rating-4',
    handoverId: 'sample-handover-2b',
    stars: 4,
    comment: 'Boa comunicação com a família no horário da saída.',
    authorRole: 'professor',
    authorName: 'Prof. David Lima',
    childId: 2,
    childName: 'Liam Santos',
    guardianName: 'Miguel Santos',
    professorName: 'Prof. David Lima',
    exitTime: '16:10',
    at: `${dateOffset(2)}T16:13:00.000Z`,
    date: dateOffset(2),
    time: '16:13',
  },
  {
    id: 'sample-rating-5',
    handoverId: 'sample-handover-3',
    stars: 5,
    comment: 'A Olívia saiu contando a história do dia. Adorei o acompanhamento!',
    authorRole: 'responsavel',
    authorName: 'Lisa Oliveira',
    childId: 3,
    childName: 'Olívia Oliveira',
    guardianName: 'Lisa Oliveira',
    professorName: 'Profa. Carla Branca',
    exitTime: '17:00',
    at: `${dateOffset(3)}T17:02:00.000Z`,
    date: dateOffset(3),
    time: '17:02',
  },
  {
    id: 'sample-rating-6',
    handoverId: 'sample-handover-4',
    stars: 3,
    comment: 'Faltou avisar antes sobre a atividade extra. No restante, ok.',
    authorRole: 'responsavel',
    authorName: 'Tomás Costa',
    childId: 4,
    childName: 'Noah Costa',
    guardianName: 'Tomás Costa',
    professorName: 'Prof. Tiago Clarke',
    exitTime: '15:50',
    at: `${dateOffset(4)}T15:52:00.000Z`,
    date: dateOffset(4),
    time: '15:52',
  },
  {
    id: 'sample-rating-7',
    handoverId: 'sample-handover-4b',
    stars: 4,
    comment: 'Retirada organizada. Família colaborou bem.',
    authorRole: 'professor',
    authorName: 'Prof. Tiago Clarke',
    childId: 4,
    childName: 'Noah Costa',
    guardianName: 'Tomás Costa',
    professorName: 'Prof. Tiago Clarke',
    exitTime: '15:50',
    at: `${dateOffset(4)}T15:53:00.000Z`,
    date: dateOffset(4),
    time: '15:53',
  },
  {
    id: 'sample-rating-8',
    handoverId: 'sample-handover-5',
    stars: 5,
    comment: 'Sempre muito carinhosos com a Ava. Obrigada!',
    authorRole: 'responsavel',
    authorName: 'Ana Souza',
    childId: 5,
    childName: 'Ava Souza',
    guardianName: 'Ana Souza',
    professorName: 'Profa. Beatriz Lopes',
    exitTime: '16:20',
    at: `${dateOffset(5)}T16:22:00.000Z`,
    date: dateOffset(5),
    time: '16:22',
  },
  {
    id: 'sample-rating-9',
    handoverId: 'sample-handover-6',
    stars: 2,
    comment: 'Demora na liberação e pouco retorno sobre o dia.',
    authorRole: 'responsavel',
    authorName: 'Cristiano Pereira',
    childId: 6,
    childName: 'Ethan Pereira',
    guardianName: 'Cristiano Pereira',
    professorName: 'Prof. André Campos',
    exitTime: '16:55',
    at: `${dateOffset(6)}T16:58:00.000Z`,
    date: dateOffset(6),
    time: '16:58',
  },
  {
    id: 'sample-rating-10',
    handoverId: 'sample-handover-7',
    stars: 5,
    comment: 'Entrega rápida e segura. Sofia veio contente.',
    authorRole: 'responsavel',
    authorName: 'Joana Ferreira',
    childId: 7,
    childName: 'Sofia Ferreira',
    guardianName: 'Joana Ferreira',
    professorName: 'Profa. Raquel Verde',
    exitTime: '16:35',
    at: `${dateOffset(2)}T16:36:00.000Z`,
    date: dateOffset(2),
    time: '16:36',
  },
  {
    id: 'sample-rating-11',
    handoverId: 'sample-handover-7b',
    stars: 5,
    comment: 'Família exemplar no horário combinado.',
    authorRole: 'professor',
    authorName: 'Profa. Raquel Verde',
    childId: 7,
    childName: 'Sofia Ferreira',
    guardianName: 'Joana Ferreira',
    professorName: 'Profa. Raquel Verde',
    exitTime: '16:35',
    at: `${dateOffset(2)}T16:37:00.000Z`,
    date: dateOffset(2),
    time: '16:37',
  },
  {
    id: 'sample-rating-12',
    handoverId: 'sample-handover-8',
    stars: 4,
    comment: 'Tudo certo. Poderiam enviar um resumo do dia no app.',
    authorRole: 'responsavel',
    authorName: 'Paulo Almeida',
    childId: 8,
    childName: 'Mason Almeida',
    guardianName: 'Paulo Almeida',
    professorName: 'Profa. Nina Patel',
    exitTime: '15:40',
    at: `${dateOffset(7)}T15:42:00.000Z`,
    date: dateOffset(7),
    time: '15:42',
  },
]

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
