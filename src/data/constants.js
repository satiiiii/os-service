// src/data/constants.js
// Constantes globais usadas no sistema de Ordens de Serviço.
// Departamentos, perfis, prioridades, status, turnos e dados iniciais de exemplo.

export const DEPTS = [
  'Terceiros',
  'Mecânico',
  'Elétrico',
  'Predial',
  'Pneumática',
  'Pintura',
  'Engenharia',
  'Ferramentaria',
];

export const ROLES = ['Solicitante', 'Técnico', 'Gestor', 'Admin'];

export const PRIORIDADES = ['Urgente', 'Normal', 'Baixa'];

export const STATUS_LIST = ['Aberta', 'Em andamento', 'Concluída', 'Recusada', 'Cancelada'];

export const TURNOS = [
  { id: 1, nome: '1º Turno', horario: '06:00 - 14:00' },
  { id: 2, nome: '2º Turno', horario: '14:00 - 22:00' },
  { id: 3, nome: '3º Turno', horario: '22:00 - 06:00' }
];

export const STORAGE_KEY = 'os_manager_v2';

// Dados iniciais de exemplo (apenas para demonstração, não são usados no Supabase)
export function getInitialData() {
  const now = Date.now();
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  
  return [
    {
      id: 1,
      num: 'OS-001',
      titulo: 'Vazamento de óleo',
      dept: 'Ferramentaria',
      local: 'Sala 101',
      desc: 'Ar-condicionado da sala 101 não está resfriando. Temperatura elevada prejudicando o trabalho.',
      status: 'Concluída',
      prio: 'Urgente',
      turno: 1,
      solicitante: 'Ana Silva',
      tecnico: 'Carlos Mota',
      criadoEm: baseDate.getTime() - 86400000 * 3,
      dataProgramada: baseDate.getTime() - 86400000 * 2,
      dataConclusao: baseDate.getTime() - 86400000,
      atualizadoEm: baseDate.getTime() - 86400000,
      historico: [
        { acao: 'OS criada', autor: 'Ana Silva', ts: baseDate.getTime() - 86400000 * 3 },
        { acao: 'Aceita por Carlos Mota', autor: 'Carlos Mota', ts: baseDate.getTime() - 86400000 * 2 },
        { acao: 'OS concluída', autor: 'Carlos Mota', ts: baseDate.getTime() - 86400000 },
      ],
    },
    {
      id: 2,
      num: 'OS-002',
      titulo: 'Computador travando constantemente',
      dept: 'TI',
      local: 'RH - Mesa 5',
      desc: 'Computador trava a cada 30 minutos, causando perda de trabalho.',
      status: 'Em andamento',
      prio: 'Normal',
      turno: 2,
      solicitante: 'João Pereira',
      tecnico: 'Marina Costa',
      criadoEm: baseDate.getTime() - 86400000,
      dataProgramada: baseDate.getTime(),
      dataConclusao: null,
      atualizadoEm: baseDate.getTime() - 3600000 * 2,
      historico: [
        { acao: 'OS criada', autor: 'João Pereira', ts: baseDate.getTime() - 86400000 },
        { acao: 'Aceita por Marina Costa', autor: 'Marina Costa', ts: baseDate.getTime() - 3600000 * 2 },
      ],
    },
    {
      id: 3,
      num: 'OS-003',
      titulo: 'Vazamento no banheiro masculino',
      dept: 'Hidráulica',
      local: 'Banheiro 2º andar',
      desc: 'Torneira pingando continuamente. Possível desperdício de água.',
      status: 'Aberta',
      prio: 'Normal',
      turno: 1,
      solicitante: 'Pedro Alves',
      tecnico: null,
      criadoEm: baseDate.getTime() - 3600000 * 5,
      dataProgramada: baseDate.getTime() + 86400000,
      dataConclusao: null,
      atualizadoEm: baseDate.getTime() - 3600000 * 5,
      historico: [{ acao: 'OS criada', autor: 'Pedro Alves', ts: baseDate.getTime() - 3600000 * 5 }],
    },
    {
      id: 4,
      num: 'OS-004',
      titulo: 'Lâmpada queimada no corredor',
      dept: 'Elétrica',
      local: 'Corredor 3º andar',
      desc: 'Duas lâmpadas queimadas deixando o corredor escuro e perigoso.',
      status: 'Aberta',
      prio: 'Baixa',
      turno: 3,
      solicitante: 'Lucia Fernandes',
      tecnico: null,
      criadoEm: baseDate.getTime() - 3600000 * 2,
      dataProgramada: baseDate.getTime() + 172800000,
      dataConclusao: null,
      atualizadoEm: baseDate.getTime() - 3600000 * 2,
      historico: [{ acao: 'OS criada', autor: 'Lucia Fernandes', ts: baseDate.getTime() - 3600000 * 2 }],
    },
    {
      id: 5,
      num: 'OS-005',
      titulo: 'Porta do almoxarifado travada',
      dept: 'Manutenção',
      local: 'Almoxarifado B',
      desc: 'Porta emperrada, impossível abrir sem forçar. Risco de dano ao equipamento.',
      status: 'Recusada',
      prio: 'Normal',
      turno: 2,
      solicitante: 'Roberto Lima',
      tecnico: null,
      criadoEm: baseDate.getTime() - 86400000 * 2,
      dataProgramada: baseDate.getTime() - 86400000,
      dataConclusao: null,
      atualizadoEm: baseDate.getTime() - 86400000,
      historico: [
        { acao: 'OS criada', autor: 'Roberto Lima', ts: baseDate.getTime() - 86400000 * 2 },
        { acao: 'Recusada: Será trocada pela construtora', autor: 'Carlos Mota', ts: baseDate.getTime() - 86400000 },
      ],
    },
  ];
}