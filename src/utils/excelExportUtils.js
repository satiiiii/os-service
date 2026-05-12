// src/utils/excelExportUtils.js
// Utilitário para exportação avançada de OS para Excel, com múltiplas abas e formatação.
// Agora com campos de custos, tempos e indicadores de confiabilidade.

import * as XLSX from 'xlsx';

// Formata um timestamp (milissegundos) para data local brasileira (dd/mm/aaaa)
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('pt-BR');
};

// Formata um timestamp para data e hora local (dd/mm/aaaa hh:mm:ss)
const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('pt-BR');
};

// Função principal de exportação
export async function exportToAdvancedExcel(osList, stats, fileName = 'relatorio_os') {
  const workbook = XLSX.utils.book_new();

  // ==================== 1. DASHBOARD EXECUTIVO (inalterado) ====================
  const dashboardData = [];
  dashboardData.push(['RELATÓRIO GERENCIAL DE ORDENS DE SERVIÇO']);
  dashboardData.push([`Gerado em: ${new Date().toLocaleString('pt-BR')}`]);
  dashboardData.push([]);
  dashboardData.push(['📊 INDICADORES DE DESEMPENHO']);
  dashboardData.push([]);
  dashboardData.push(['Indicador', 'Valor', 'Meta', 'Status']);
  dashboardData.push(['Total de OS', stats.total, '-', '✅']);
  dashboardData.push(['Concluídas', stats.concluidas, `${Math.round(stats.total * 0.8)}`, stats.concluidas >= stats.total * 0.8 ? '✅ Acima da meta' : '⚠️ Abaixo da meta']);
  dashboardData.push(['Taxa de Conclusão', `${stats.txConclusao}%`, '80%', stats.txConclusao >= 80 ? '🎯 Excelente' : '📈 Precisa melhorar']);
  dashboardData.push(['Em Andamento', stats.andamento, '-', '🔄']);
  dashboardData.push(['Abertas', stats.abertas, '-', '⏳']);
  dashboardData.push(['Recusadas', stats.recusadas, '-', '❌']);
  dashboardData.push([]);
  dashboardData.push(['🎯 PRIORIDADE DAS OS']);
  dashboardData.push(['Prioridade', 'Quantidade', 'Percentual', 'Priorização']);
  stats.porPrio.forEach(p => {
    const percentual = stats.total ? ((p.count / stats.total) * 100).toFixed(1) : 0;
    let status = '';
    if (p.prio === 'Urgente') status = '🔥 Alta prioridade';
    else if (p.prio === 'Normal') status = '⚡ Média prioridade';
    else status = '✅ Baixa prioridade';
    dashboardData.push([p.prio, p.count, `${percentual}%`, status]);
  });
  dashboardData.push([]);
  dashboardData.push(['🏢 DEPARTAMENTOS MAIS SOLICITANTES']);
  dashboardData.push(['Departamento', 'Total OS', 'Percentual', 'Nível de Atividade']);
  const sortedDepts = [...stats.porDept].sort((a, b) => b.total - a.total).slice(0, 5);
  sortedDepts.forEach(d => {
    const percentual = stats.total ? ((d.total / stats.total) * 100).toFixed(1) : 0;
    let nivel = '';
    if (percentual > 30) nivel = '🔴 Muito Alto';
    else if (percentual > 15) nivel = '🟡 Alto';
    else nivel = '🟢 Normal';
    dashboardData.push([d.dept, d.total, `${percentual}%`, nivel]);
  });

  const dashboardSheet = XLSX.utils.aoa_to_sheet(dashboardData);
  dashboardSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
    { s: { r: 13, c: 0 }, e: { r: 13, c: 3 } },
    { s: { r: 19, c: 0 }, e: { r: 19, c: 3 } }
  ];
  XLSX.utils.book_append_sheet(workbook, dashboardSheet, 'Dashboard');

  // ==================== 2. LISTA COMPLETA (COM CUSTOS E HORÍMETROS) ====================
  const osHeaders = [
    'Nº OS', 'Título', 'Status', 'Departamento', 'Localização',
    'Prioridade', 'Turno', 'Solicitante', 'Técnico',
    'Tipo Manutenção', 'Custo Peças (R$)', 'Custo Mão Obra (R$)', 'Custo Total (R$)',
    'Tempo Parada (h)', 'Tempo Manutenção (h)', 'Horímetro Início (h)', 'Horímetro Fim (h)',
    'Data Criação', 'Data Programada', 'Data Conclusão', 'Tempo (dias)'
  ];

  const osRows = osList.map(os => {
    const tempoTotal = os.data_conclusao
      ? ((os.data_conclusao - os.criado_em) / (1000 * 60 * 60 * 24)).toFixed(1)
      : 'Em andamento';

    const getTurnoLabel = (turnoId) => {
      const turnos = { 1: '1º Turno', 2: '2º Turno', 3: '3º Turno' };
      return turnos[turnoId] || '-';
    };

    return [
      os.num,
      os.titulo,
      os.status,
      os.dept,
      os.local,
      os.prio,
      getTurnoLabel(os.turno),
      os.solicitante,
      os.tecnico || 'Não atribuído',
      os.tipo_manutencao === 'PREVENTIVA' ? 'Preventiva' : os.tipo_manutencao === 'CORRETIVA' ? 'Corretiva' : '-',
      os.custo_pecas ? os.custo_pecas.toFixed(2) : '0,00',
      os.custo_mao_obra ? os.custo_mao_obra.toFixed(2) : '0,00',
      os.custo_total ? os.custo_total.toFixed(2) : '0,00',
      os.tempo_parada || '0',
      os.tempo_manutencao || '0',
      os.horimetro_inicio || '-',
      os.horimetro_fim || '-',
      formatDate(os.criado_em),
      formatDate(os.data_programada),
      os.data_conclusao ? formatDate(os.data_conclusao) : '-',
      tempoTotal
    ];
  });

  const osSheet = XLSX.utils.aoa_to_sheet([osHeaders, ...osRows]);
  XLSX.utils.book_append_sheet(workbook, osSheet, 'Lista Completa');

  // ==================== 3. ANÁLISE POR STATUS (mantido) ====================
  const statusData = [];
  statusData.push(['📊 ANÁLISE DETALHADA POR STATUS']);
  statusData.push([]);

  const statusGroups = [
    { name: '✅ CONCLUÍDAS', status: 'Concluída', icon: '🎉' },
    { name: '🔄 EM ANDAMENTO', status: 'Em andamento', icon: '⚙️' },
    { name: '⏳ ABERTAS', status: 'Aberta', icon: '📋' },
    { name: '❌ RECUSADAS', status: 'Recusada', icon: '🚫' }
  ];

  statusGroups.forEach(group => {
    const filtered = osList.filter(os => os.status === group.status);
    if (filtered.length > 0) {
      statusData.push([`${group.icon} ${group.name} (${filtered.length} OS)`]);
      statusData.push(['Nº OS', 'Título', 'Departamento', 'Técnico', 'Data Criação', 'Prioridade']);
      filtered.forEach(os => {
        statusData.push([
          os.num,
          os.titulo,
          os.dept,
          os.tecnico || 'Não atribuído',
          formatDate(os.criado_em),
          os.prio
        ]);
      });
      statusData.push([]);
    }
  });

  const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
  XLSX.utils.book_append_sheet(workbook, statusSheet, 'Por Status');

  // ==================== 4. PERFORMANCE POR DEPARTAMENTO (mantido) ====================
  const deptData = [];
  deptData.push(['🏢 PERFORMANCE POR DEPARTAMENTO']);
  deptData.push([]);
  deptData.push(['Departamento', 'Total OS', 'Concluídas', 'Em Andamento', 'Abertas', 'Recusadas', 'Taxa Eficiência']);

  const uniqueDepts = [...new Set(osList.map(os => os.dept))];
  uniqueDepts.forEach(dept => {
    const deptOS = osList.filter(os => os.dept === dept);
    const total = deptOS.length;
    const concluidas = deptOS.filter(os => os.status === 'Concluída').length;
    const andamento = deptOS.filter(os => os.status === 'Em andamento').length;
    const abertas = deptOS.filter(os => os.status === 'Aberta').length;
    const recusadas = deptOS.filter(os => os.status === 'Recusada').length;
    const eficiencia = total ? ((concluidas / total) * 100).toFixed(1) : 0;

    let statusIcon = '';
    if (eficiencia >= 70) statusIcon = '🏆 Excelente';
    else if (eficiencia >= 50) statusIcon = '👍 Bom';
    else statusIcon = '⚠️ Atenção';

    deptData.push([dept, total, concluidas, andamento, abertas, recusadas, `${eficiencia}% ${statusIcon}`]);
  });

  const deptSheet = XLSX.utils.aoa_to_sheet(deptData);
  XLSX.utils.book_append_sheet(workbook, deptSheet, 'Por Depto');

  // ==================== 5. RANKING DE TÉCNICOS (mantido) ====================
  const tecnicosMap = new Map();
  osList.forEach(os => {
    if (os.tecnico && os.status === 'Concluída') {
      if (!tecnicosMap.has(os.tecnico)) {
        tecnicosMap.set(os.tecnico, { total: 0, tempos: [] });
      }
      const techStats = tecnicosMap.get(os.tecnico);
      techStats.total++;
      if (os.data_conclusao && os.criado_em) {
        const tempo = (os.data_conclusao - os.criado_em) / (1000 * 60 * 60 * 24);
        techStats.tempos.push(tempo);
      }
    }
  });

  const tecnicosData = [];
  tecnicosData.push(['🏆 RANKING DE PERFORMANCE DOS TÉCNICOS']);
  tecnicosData.push([]);
  tecnicosData.push(['Técnico', 'OS Concluídas', 'Tempo Médio (dias)', 'Avaliação']);

  const tecnicosRanking = Array.from(tecnicosMap.entries()).map(([nome, data]) => {
    const mediaTempo = data.tempos.length
      ? (data.tempos.reduce((a, b) => a + b, 0) / data.tempos.length).toFixed(1)
      : 0;
    let avaliacao = '';
    if (mediaTempo <= 2) avaliacao = '⭐ Excelente (Rápido)';
    else if (mediaTempo <= 5) avaliacao = '👍 Bom';
    else avaliacao = '📈 Pode melhorar';
    return [nome, data.total, mediaTempo, avaliacao];
  }).sort((a, b) => b[1] - a[1]);

  tecnicosRanking.forEach(tecnico => tecnicosData.push(tecnico));

  const tecnicosSheet = XLSX.utils.aoa_to_sheet(tecnicosData);
  XLSX.utils.book_append_sheet(workbook, tecnicosSheet, 'Ranking Técnicos');

  // ==================== 6. OS URGENTES (mantido) ====================
  const urgentesData = [];
  urgentesData.push(['🔥 OS COM PRIORIDADE URGENTE']);
  urgentesData.push([]);
  urgentesData.push(['Nº OS', 'Título', 'Departamento', 'Status', 'Solicitante', 'Técnico', 'Tempo Aberta']);

  const urgentes = osList.filter(os => os.prio === 'Urgente');
  if (urgentes.length === 0) {
    urgentesData.push(['✅ Nenhuma OS urgente no momento!']);
  } else {
    urgentes.forEach(os => {
      const tempoAberto = ((Date.now() - os.criado_em) / (1000 * 60 * 60)).toFixed(1);
      let alerta = '';
      if (tempoAberto > 48) alerta = '⚠️ CRÍTICO';
      else if (tempoAberto > 24) alerta = '⚠️ Atenção';
      else alerta = '✅ Monitorado';
      urgentesData.push([
        os.num,
        os.titulo,
        os.dept,
        os.status,
        os.solicitante,
        os.tecnico || 'Não atribuído',
        `${tempoAberto}h ${alerta}`
      ]);
    });
  }

  const urgentesSheet = XLSX.utils.aoa_to_sheet(urgentesData);
  XLSX.utils.book_append_sheet(workbook, urgentesSheet, 'OS Urgentes');

  // ==================== 7. RESUMO DO MÊS (mantido) ====================
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const osDoMes = osList.filter(os => os.criado_em >= startOfMonth.getTime());

  const mesData = [];
  mesData.push([`📅 RESUMO DO MÊS - ${now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`]);
  mesData.push([]);
  mesData.push(['Indicador', 'Valor', 'Tendência']);
  mesData.push(['Total OS no mês', osDoMes.length, osDoMes.length > 0 ? '📈 Ativo' : '📉 Inativo']);
  mesData.push(['Concluídas no mês', osDoMes.filter(o => o.status === 'Concluída').length, '✅']);
  mesData.push(['Média por dia', (osDoMes.length / now.getDate()).toFixed(1), '📊']);
  mesData.push([]);
  mesData.push(['📌 OS mais ativas por departamento no mês']);

  const deptMes = new Map();
  osDoMes.forEach(os => deptMes.set(os.dept, (deptMes.get(os.dept) || 0) + 1));
  const sortedDeptMes = Array.from(deptMes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  sortedDeptMes.forEach(([dept, total], index) => {
    const medalha = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
    mesData.push([`${medalha} ${dept}`, `${total} OS`, '']);
  });

  const mesSheet = XLSX.utils.aoa_to_sheet(mesData);
  XLSX.utils.book_append_sheet(workbook, mesSheet, 'Resumo do Mês');

  // ==================== 8. NOVA ABA: CUSTOS E INDICADORES DE CONFIABILIDADE ====================
  const custosIndicadores = [];

  // Calcular totais
  const totalPreventiva = osList.filter(o => o.tipo_manutencao === 'PREVENTIVA' && o.status === 'Concluída').reduce((acc, o) => acc + (o.custo_total || 0), 0);
  const totalCorretiva = osList.filter(o => o.tipo_manutencao === 'CORRETIVA' && o.status === 'Concluída').reduce((acc, o) => acc + (o.custo_total || 0), 0);
  const totalParada = osList.filter(o => o.tipo_manutencao === 'CORRETIVA' && o.status === 'Concluída').reduce((acc, o) => acc + (o.tempo_parada || 0), 0);
  const totalFalhas = osList.filter(o => o.tipo_manutencao === 'CORRETIVA' && o.status === 'Concluída').length;
  const mttr = totalFalhas > 0 ? (totalParada / totalFalhas).toFixed(1) : 0;

  // Cálculo simplificado de MTBF (baseado em data das falhas)
  const falhasOrdenadas = osList
    .filter(o => o.tipo_manutencao === 'CORRETIVA' && o.status === 'Concluída' && o.criado_em)
    .sort((a, b) => a.criado_em - b.criado_em);
  let somaIntervalos = 0;
  let intervalosCount = 0;
  for (let i = 1; i < falhasOrdenadas.length; i++) {
    const intervalo = (falhasOrdenadas[i].criado_em - falhasOrdenadas[i-1].criado_em) / (1000 * 60 * 60); // em horas
    if (intervalo > 0 && intervalo < 10000) { // ignorar intervalos muito longos
      somaIntervalos += intervalo;
      intervalosCount++;
    }
  }
  const mtbf = intervalosCount > 0 ? (somaIntervalos / intervalosCount).toFixed(1) : 0;

  custosIndicadores.push(['📊 RESUMO DE CUSTOS E INDICADORES DE CONFIABILIDADE']);
  custosIndicadores.push([`Gerado em: ${new Date().toLocaleString('pt-BR')}`]);
  custosIndicadores.push([]);
  custosIndicadores.push(['💰 CUSTOS TOTAIS']);
  custosIndicadores.push(['Tipo', 'Valor (R$)']);
  custosIndicadores.push(['Preventivas', totalPreventiva.toFixed(2)]);
  custosIndicadores.push(['Corretivas', totalCorretiva.toFixed(2)]);
  custosIndicadores.push(['TOTAL GERAL', (totalPreventiva + totalCorretiva).toFixed(2)]);
  custosIndicadores.push([]);
  custosIndicadores.push(['⏱️ INDICADORES DE PARADA']);
  custosIndicadores.push(['Indicador', 'Valor']);
  custosIndicadores.push(['Tempo Total de Parada (h)', totalParada.toFixed(1)]);
  custosIndicadores.push(['Número de Falhas', totalFalhas]);
  custosIndicadores.push(['MTTR - Tempo Médio de Reparo (h)', mttr]);
  custosIndicadores.push(['MTBF - Tempo Médio entre Falhas (h)', mtbf]);
  custosIndicadores.push([]);
  custosIndicadores.push(['📋 DETALHAMENTO POR OS (apenas corretivas concluídas)']);
  custosIndicadores.push(['Nº OS', 'Equipamento', 'Custo Total (R$)', 'Tempo Parada (h)', 'Data Conclusão']);

  const corretivasConcluidas = osList.filter(o => o.tipo_manutencao === 'CORRETIVA' && o.status === 'Concluída');
  corretivasConcluidas.forEach(os => {
    custosIndicadores.push([
      os.num,
      os.equipamento_nome || os.equipamento_tag || '-',
      (os.custo_total || 0).toFixed(2),
      os.tempo_parada || '0',
      formatDate(os.data_conclusao)
    ]);
  });

  const custosSheet = XLSX.utils.aoa_to_sheet(custosIndicadores);
  XLSX.utils.book_append_sheet(workbook, custosSheet, 'Custos e Indicadores');

  // Ajustar larguras das colunas
  const sheets = [dashboardSheet, osSheet, statusSheet, deptSheet, tecnicosSheet, urgentesSheet, mesSheet, custosSheet];
  sheets.forEach(sheet => {
    if (!sheet['!cols']) sheet['!cols'] = [];
    sheet['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 20 },
      { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
  });

  // Salvar arquivo
  const fileNameFinal = `${fileName}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileNameFinal);
}