// src/utils/notificationTriggers.js
// Módulo opcional para verificar automaticamente OS urgentes e violações de SLA.
// Para ativar, chame `startAutoNotifications` em App.js (por exemplo, dentro de um useEffect).
// IMPORTANTE: As funções utilizam os campos do Supabase: criado_em e data_programada.

import { addNotification, NOTIF_TYPES } from './notifications';

// Verifica OS urgentes abertas há mais de 1 hora
export function checkUrgentOS(osList) {
  const urgentOS = osList.filter(os => 
    os.prio === 'Urgente' && 
    os.status === 'Aberta' &&
    (Date.now() - os.criado_em) > 3600000 // 1 hora
  );
  urgentOS.forEach(os => {
    addNotification(
      '⚠️ OS Urgente Aguardando',
      `A OS ${os.num} - ${os.titulo} está há mais de 1 hora sem atendimento!`,
      NOTIF_TYPES.WARNING,
      null,
      os.id
    );
  });
}

// Verifica OS em andamento que ultrapassaram o prazo (data programada)
export function checkSLAViolations(osList) {
  const slaMap = {
    'Urgente': 24 * 3600000,  // 24 horas
    'Normal': 72 * 3600000,   // 72 horas
    'Baixa': 120 * 3600000    // 120 horas
  };
  osList.forEach(os => {
    if (os.status === 'Em andamento' && os.data_programada) {
      const tempoDecorrido = Date.now() - os.data_programada;
      const slaLimit = slaMap[os.prio];
      if (tempoDecorrido > slaLimit && !os.slaNotified) {
        addNotification(
          '⏰ SLA Estourado',
          `A OS ${os.num} ultrapassou o prazo de ${slaLimit/3600000}h (Prioridade ${os.prio})`,
          NOTIF_TYPES.ERROR,
          null,
          os.id
        );
        // Marcar como notificado (isso exigiria atualizar o objeto no estado, não persistirá)
        os.slaNotified = true;
      }
    }
  });
}

// Inicia a verificação periódica a cada 5 minutos (apenas para Admin/Gestor)
export function startAutoNotifications(osList, currentUser) {
  setInterval(() => {
    if (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Gestor')) {
      checkUrgentOS(osList);
      checkSLAViolations(osList);
    }
  }, 300000); // 5 minutos
}