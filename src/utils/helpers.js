// src/utils/helpers.js
// Funções auxiliares de formatação, permissões e filtros para o sistema de Ordens de Serviço.

// ========== FORMATAÇÃO DE DATAS ==========
export function formatDate(ts) {
  const d = new Date(ts);
  return (
    d.toLocaleDateString('pt-BR') +
    ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

export function formatDateShort(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR');
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'agora';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'min atrás';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h atrás';
  return Math.floor(diff / 86400000) + 'd atrás';
}

// ========== BADGES (CSS) ==========
export function getBadgeClass(status) {
  const map = {
    'Aberta': 'badge badge-aberta',
    'Em andamento': 'badge badge-andamento',
    'Concluída': 'badge badge-concluida',
    'Recusada': 'badge badge-recusada',
    'Cancelada': 'badge badge-cancelada',
  };
  return map[status] || 'badge badge-dept';
}

export function getPrioBadge(prio) {
  const map = {
    Urgente: 'badge badge-urgente',
    Normal: 'badge badge-normal',
    Baixa: 'badge badge-baixa',
  };
  return map[prio] || 'badge badge-dept';
}

// ========== UTILITÁRIOS DE ID (legado, não usado com Supabase) ==========
export function nextId(os) {
  return Math.max(0, ...os.map((o) => o.id)) + 1;
}

export function nextNum(os) {
  const n = Math.max(0, ...os.map((o) => parseInt(o.num.split('-')[1] || 0))) + 1;
  return 'OS-' + String(n).padStart(3, '0');
}

// ========== LOCALSTORAGE (fallback) ==========
export function loadFromStorage(key, fallback) {
  try {
    const d = localStorage.getItem(key);
    if (d) return JSON.parse(d);
  } catch (e) {}
  return fallback;
}

export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
}

// ========== PERMISSÕES GRANULARES ==========

// Visualização básica de OS
export function canViewOS(user, os) {
  if (!user) return false;
  if (user.role === 'Admin' || user.role === 'Gestor') return true;
  if (user.role === 'Técnico') return true;
  if (user.role === 'Solicitante') return os.solicitante === user.nome;
  return false;
}

export function canCreateOS(user) {
  if (!user) return false;
  return ['Admin', 'Gestor', 'Técnico', 'Solicitante'].includes(user.role);
}

export function canEditOS(user, os) {
  if (!user) return false;
  if (user.role === 'Admin' || user.role === 'Gestor') return true;
  if (user.role === 'Técnico') return (os.status === 'Aberta' || os.status === 'Em andamento');
  if (user.role === 'Solicitante') return os.solicitante === user.nome && os.status === 'Aberta';
  return false;
}

export function canAcceptOS(user, os) {
  return (user?.role === 'Técnico' || user?.role === 'Admin' || user?.role === 'Gestor') && os.status === 'Aberta';
}

export function canRejectOS(user, os) {
  return (user?.role === 'Técnico' || user?.role === 'Admin' || user?.role === 'Gestor') && os.status === 'Aberta';
}

export function canCompleteOS(user, os) {
  if (os.status !== 'Em andamento') return false;
  if (user?.role === 'Admin' || user?.role === 'Gestor') return true;
  if (user?.role === 'Técnico') return os.tecnico === user.nome || !os.tecnico;
  return false;
}

export function canReopenOS(user, os) {
  return (user?.role === 'Admin' || user?.role === 'Gestor') &&
         (os.status === 'Recusada' || os.status === 'Concluída' || os.status === 'Cancelada');
}

export function canCancelOS(user, os) {
  if (!user) return false;
  if (user.role === 'Solicitante') return os.solicitante === user.nome && os.status === 'Aberta';
  if (user.role === 'Admin' || user.role === 'Gestor') return os.status === 'Aberta' || os.status === 'Em andamento';
  return false;
}

export function canDeleteOS(user, os) {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  if (user.role === 'Gestor') return os.status !== 'Concluída';
  return false;
}

// ========== PERMISSÕES PARA RELATÓRIOS E DASHBOARD ==========
export function canViewRelatorios(user) {
  return user && ['Admin', 'Gestor'].includes(user.role);
}

export function canViewKPIs(user) {
  return user && ['Admin', 'Gestor'].includes(user.role);
}

export function canViewDashboard(user) {
  // Apenas Admin, Gestor e Técnico podem ver o Dashboard (Solicitante NÃO)
  return user && ['Admin', 'Gestor', 'Técnico'].includes(user.role);
}

export function canViewTechnicianDashboard(user) {
  return user && ['Admin', 'Gestor'].includes(user.role);
}

export function canExportData(user) {
  return user && ['Admin', 'Gestor'].includes(user.role);
}

export function canManageUsers(user) {
  return user?.role === 'Admin';
}

// ========== PERMISSÕES PARA ANEXOS ==========
export function canViewAttachments(user, os) {
  if (!user) return false;
  if (user.role === 'Admin' || user.role === 'Gestor') return true;
  if (user.role === 'Técnico') return true;
  if (user.role === 'Solicitante') return os.solicitante === user.nome;
  return false;
}

export function canAddAttachments(user, os) {
  if (!user) return false;
  if (user.role === 'Admin' || user.role === 'Gestor') return true;
  if (user.role === 'Técnico') return os.status === 'Aberta' || os.status === 'Em andamento';
  if (user.role === 'Solicitante') return os.solicitante === user.nome && os.status === 'Aberta';
  return false;
}

// ========== PERMISSÕES PARA COMPONENTES ADICIONAIS ==========
export function canViewProblemRanking(user) {
  return user && ['Admin', 'Gestor'].includes(user.role);
}

export function canViewTimeByDept(user) {
  return user && ['Admin', 'Gestor'].includes(user.role);
}

export function canViewCalendar(user) {
  return user && ['Admin', 'Gestor'].includes(user.role);
}

export function canViewAdvancedCharts(user) {
  return user && ['Admin', 'Gestor'].includes(user.role);
}

// ========== FILTRAGEM DE OS POR PERFIL ==========
export function getFilteredOS(osList, user) {
  if (!user) return [];
  if (user.role === 'Admin' || user.role === 'Gestor') return osList;
  if (user.role === 'Técnico') return osList.filter(os => os.status === 'Aberta' || os.status === 'Em andamento' || os.status === 'Concluída');
  if (user.role === 'Solicitante') return osList.filter(os => os.solicitante === user.nome);
  return [];
}

// ========== ESTATÍSTICAS DO USUÁRIO ==========
export function getUserStats(osList, user) {
  const filtered = getFilteredOS(osList, user);
  return {
    total: filtered.length,
    abertas: filtered.filter(o => o.status === 'Aberta').length,
    andamento: filtered.filter(o => o.status === 'Em andamento').length,
    concluidas: filtered.filter(o => o.status === 'Concluída').length,
    recusadas: filtered.filter(o => o.status === 'Recusada').length,
    canceladas: filtered.filter(o => o.status === 'Cancelada').length,
  };
}