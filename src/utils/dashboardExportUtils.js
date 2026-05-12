// src/utils/dashboardExportUtils.js
// Utilitário para exportar os dados do dashboard (gráficos e listagens) para um arquivo Excel com múltiplas abas.
// Utilizado em Dashboard.js (botão "Exportar Dashboard").

import * as XLSX from 'xlsx';

// Formata um timestamp (milissegundos) para data local brasileira (dd/mm/aaaa)
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('pt-BR');
};

// Exporta os dados do dashboard para um arquivo Excel (.xlsx)
// @param {Object} dashboardData - Dados do dashboard (totais, turnos, situações, top equipamentos, lista de OS, etc.)
// @param {string} fileName - Nome base do arquivo (sem extensão)
export async function exportDashboardToExcel(dashboardData, fileName = 'dashboard_os') {
  const workbook = XLSX.utils.book_new();

  // ========== ABA 1 - RESUMO EXECUTIVO ==========
  const resumoData = [
    ['📊 DASHBOARD EXECUTIVO - ORDENS DE SERVIÇO'],
    [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
    [],
    ['📈 INDICADORES PRINCIPAIS', ''],
    ['Indicador', 'Valor'],
    ['Total de OS', dashboardData.total],
    ['OS Abertas', dashboardData.abertas],
    ['OS em Andamento', dashboardData.andamento],
    ['OS Concluídas', dashboardData.concluidas],
    ['OS Recusadas', dashboardData.recusadas],
    ['Taxa de Conclusão', `${dashboardData.txConclusao}%`],
    ['Taxa de Recusa', `${dashboardData.txRecusa}%`],
    [],
    ['📊 OS POR TURNO', ''],
    ['Turno', 'Quantidade'],
    ...dashboardData.turnoData.map(t => [t.name, t.count]),
    [],
    ['📊 OS POR SITUAÇÃO INICIAL', ''],
    ['Situação', 'Quantidade'],
    ...dashboardData.situacaoData.map(s => [s.name, s.value]),
    [],
    ['🏆 TOP EQUIPAMENTOS COM MAIS OS', ''],
    ['Equipamento', 'Tag', 'Quantidade'],
    ...dashboardData.topEquipamentos.map(eq => [eq.nome, eq.tag, eq.count])
  ];

  const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo Executivo');

  // ========== ABA 2 - OS POR DEPARTAMENTO ==========
  const deptData = [
    ['📊 OS POR DEPARTAMENTO'],
    ['Departamento', 'Quantidade', 'Percentual'],
    ...dashboardData.byDept.map(d => [
      d.dept,
      d.count,
      dashboardData.total ? `${((d.count / dashboardData.total) * 100).toFixed(1)}%` : '0%'
    ])
  ];

  const deptSheet = XLSX.utils.aoa_to_sheet(deptData);
  XLSX.utils.book_append_sheet(workbook, deptSheet, 'Por Departamento');

  // ========== ABA 3 - TENDÊNCIA MENSAL ==========
  const tendenciaData = [
    ['📈 TENDÊNCIA MENSAL (Últimos 6 meses)'],
    ['Mês', 'OS Criadas', 'OS Concluídas'],
    ...dashboardData.monthlyData.map(m => [m.month, m.criadas, m.concluidas])
  ];

  const tendenciaSheet = XLSX.utils.aoa_to_sheet(tendenciaData);
  XLSX.utils.book_append_sheet(workbook, tendenciaSheet, 'Tendência Mensal');

  // ========== ABA 4 - DETALHAMENTO DOS TURNOS ==========
  const turnoDetalhadoData = [
    ['🕐 ANÁLISE POR TURNO'],
    ['Turno', 'Total OS', 'Percentual'],
    ...dashboardData.turnoData.map(t => [
      t.name,
      t.count,
      dashboardData.total ? `${((t.count / dashboardData.total) * 100).toFixed(1)}%` : '0%'
    ])
  ];

  const turnoSheet = XLSX.utils.aoa_to_sheet(turnoDetalhadoData);
  XLSX.utils.book_append_sheet(workbook, turnoSheet, 'Análise Turnos');

  // ========== ABA 5 - LISTA COMPLETA DE OS ==========
  // Nota: os objetos OS utilizam o campo "criado_em" (do Supabase), não "criadoEm".
  const listaOSData = [
    ['📋 LISTA COMPLETA DE OS'],
    ['Nº OS', 'Título', 'Status', 'Departamento', 'Turno', 'Solicitante', 'Técnico', 'Data Criação', 'Situação Inicial', 'Tag Equipamento', 'Célula', 'Localização'],
    ...dashboardData.listaOS.map(os => [
      os.num,
      os.titulo,
      os.status,
      os.dept,
      os.turno === 1 ? '1º Turno' : os.turno === 2 ? '2º Turno' : os.turno === 3 ? '3º Turno' : '-',
      os.solicitante,
      os.tecnico || 'Não atribuído',
      formatDate(os.criado_em),          // corrigido: usar criado_em
      os.situacao || '-',
      os.equipamento_tag || '-',
      os.celula || '-',
      os.localizacao || os.local || '-'
    ])
  ];

  const listaOSSheet = XLSX.utils.aoa_to_sheet(listaOSData);
  XLSX.utils.book_append_sheet(workbook, listaOSSheet, 'Lista Completa');

  // Salvar arquivo
  const fileNameFinal = `${fileName}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileNameFinal);

  return true;
}