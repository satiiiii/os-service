// src/utils/exportUtils.js
// Utilitários de exportação para o Dashboard de Confiabilidade
// Dependências: xlsx (já instalada), jspdf + jspdf-autotable (instalar se não tiver)
// npm install jspdf jspdf-autotable

import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const fmt = (v, decimals = 2) =>
  Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtDate = (ts) => {
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('pt-BR');
};

const fmtDateTime = (ts) => {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('pt-BR');
};

const disponibilidade = (tempoParada, periodo) => {
  const horasPeriodo = periodo === 'diario' ? 24 : periodo === 'mensal' ? 720 : 8760;
  const d = (1 - tempoParada / (tempoParada + horasPeriodo)) * 100;
  return Math.max(0, Math.min(100, d)).toFixed(2);
};

const labelPeriodo = (periodo, dataInicio, dataFim) => {
  if (periodo === 'diario') return 'Hoje';
  if (periodo === 'mensal') return 'Este mês';
  if (periodo === 'anual') return 'Este ano';
  if (periodo === 'custom') return `${dataInicio} até ${dataFim}`;
  return periodo;
};

// ─────────────────────────────────────────────
// CORES XLSX
// ─────────────────────────────────────────────
const CORES = {
  headerVerde:   '0f6e56',
  headerVermelho:'a32d2d',
  headerAzul:    '1a6fa3',
  headerRoxo:    '5b2d8a',
  headerCinza:   '4a4a4a',
  bgVerde:       'e8f5f1',
  bgVermelho:    'fdf0f0',
  bgAzul:        'e8f0fd',
  bgAmarelo:     'fffbea',
  branco:        'ffffff',
  cinzaClaro:    'f2f2f2',
  cinzaMedio:    'd9d9d9',
  textoEscuro:   '1a1a1a',
};

// Aplica estilo em uma célula
const cell = (value, { bold = false, bg, color, align = 'left', border = false, format, italic = false, size = 11, wrap = false } = {}) => {
  const c = { v: value, t: typeof value === 'number' ? 'n' : 's' };
  if (format) c.z = format;
  c.s = {
    font: { name: 'Arial', sz: size, bold, italic, color: color ? { rgb: color } : { rgb: '1a1a1a' } },
    fill: bg ? { patternType: 'solid', fgColor: { rgb: bg } } : undefined,
    alignment: { horizontal: align, vertical: 'center', wrapText: wrap },
    border: border ? {
      top:    { style: 'thin', color: { rgb: 'cccccc' } },
      bottom: { style: 'thin', color: { rgb: 'cccccc' } },
      left:   { style: 'thin', color: { rgb: 'cccccc' } },
      right:  { style: 'thin', color: { rgb: 'cccccc' } },
    } : undefined,
  };
  return c;
};

// ─────────────────────────────────────────────
// SHEET HELPERS
// ─────────────────────────────────────────────
function buildSheet(rows) {
  const ws = {};
  let maxCol = 0;
  rows.forEach((row, r) => {
    row.forEach((val, c) => {
      if (c > maxCol) maxCol = c;
      const ref = XLSX.utils.encode_cell({ r, c });
      if (val === null || val === undefined) { ws[ref] = { v: '', t: 's' }; return; }
      if (typeof val === 'object' && val.v !== undefined) {
        ws[ref] = val;
      } else {
        ws[ref] = { v: val, t: typeof val === 'number' ? 'n' : 's', s: { font: { name: 'Arial', sz: 11 } } };
      }
    });
  });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: maxCol } });
  return ws;
}

function setColWidths(ws, widths) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

function setRowHeights(ws, heights) {
  ws['!rows'] = [];
  Object.entries(heights).forEach(([r, h]) => {
    ws['!rows'][+r] = { hpt: h };
  });
}

function mergeCells(ws, merges) {
  ws['!merges'] = (ws['!merges'] || []).concat(merges.map(([r1, c1, r2, c2]) => ({
    s: { r: r1, c: c1 }, e: { r: r2, c: c2 }
  })));
}

// ─────────────────────────────────────────────
// SHEET 1: CAPA / RESUMO EXECUTIVO
// ─────────────────────────────────────────────
function sheetCapa(indicadores, periodo, dataInicio, dataFim, currentUser) {
  const disp = disponibilidade(indicadores.tempoParadaTotal, periodo);
  const custoTotal = indicadores.custoPreventiva + indicadores.custoCorretiva;
  const ticketCorr = indicadores.numeroFalhas > 0 ? (indicadores.custoCorretiva / indicadores.numeroFalhas) : 0;
  const ticketPrev = indicadores.numeroFalhas > 0 ? (indicadores.custoPreventiva / indicadores.numeroFalhas) : 0;
  const ratioPreventivo = custoTotal > 0 ? ((indicadores.custoPreventiva / custoTotal) * 100) : 0;

  const H1 = (t) => cell(t, { bold: true, size: 18, bg: CORES.headerVerde, color: CORES.branco, align: 'center' });
  const H2 = (t) => cell(t, { bold: true, size: 13, bg: CORES.cinzaClaro, color: CORES.textoEscuro });
  const lbl = (t) => cell(t, { bold: true, size: 11, bg: CORES.bgVerde, border: true });
  const val = (v, fmt) => cell(v, { size: 11, align: 'right', border: true, format: fmt });

  const rows = [
    [H1('RELATÓRIO DE CONFIABILIDADE E MANUTENÇÃO'), null, null, null, null],
    [cell(''), null, null, null, null],
    [cell('Gerado em:', { bold: true }), cell(fmtDateTime(Date.now()), { italic: true }), null, null, null],
    [cell('Período:', { bold: true }), cell(labelPeriodo(periodo, dataInicio, dataFim), { italic: true }), null, null, null],
    [cell('Responsável:', { bold: true }), cell(currentUser?.nome || currentUser?.email || '-', { italic: true }), null, null, null],
    [cell('')],
    [H2('💰 CUSTOS'), null, null, null, null],
    [lbl('Custo Preventivo (R$)'), null, val(indicadores.custoPreventiva, '#,##0.00'), null, null],
    [lbl('Custo Corretivo (R$)'),  null, val(indicadores.custoCorretiva,  '#,##0.00'), null, null],
    [lbl('Custo Total Geral (R$)'), null, val(custoTotal, '#,##0.00'), null, null],
    [lbl('% Preventivo no Total'),  null, val(ratioPreventivo / 100, '0.00%'), null, null],
    [lbl('Ticket Médio Corretivo (R$)'), null, val(ticketCorr, '#,##0.00'), null, null],
    [lbl('Ticket Médio Preventivo (R$)'), null, val(ticketPrev, '#,##0.00'), null, null],
    [cell('')],
    [H2('⏱️ TEMPO E DISPONIBILIDADE'), null, null, null, null],
    [lbl('Tempo Total de Parada (h)'),    null, val(indicadores.tempoParadaTotal, '#,##0.0'), null, null],
    [lbl('Tempo Total de Manutenção (h)'), null, val(indicadores.tempoManutencaoTotal, '#,##0.0'), null, null],
    [lbl('Disponibilidade Estimada (%)'), null, val(+disp / 100, '0.00%'), null, null],
    [cell('')],
    [H2('🔧 INDICADORES DE CONFIABILIDADE'), null, null, null, null],
    [lbl('Número de Falhas (OS Corretivas)'), null, val(indicadores.numeroFalhas, '#,##0'), null, null],
    [lbl('MTTR – Tempo Médio de Reparo (h)'),    null, val(+indicadores.mttr,  '#,##0.0'), null, null],
    [lbl('MTBF – Tempo Médio entre Falhas (h)'), null, val(+indicadores.mtbf,  '#,##0.0'), null, null],
    [lbl('MTTF – Tempo Médio até Falha (h)'),    null, val(+indicadores.mttf,  '#,##0.0'), null, null],
    [cell('')],
    [cell('* Disponibilidade calculada em relação ao período selecionado.', { italic: true, size: 9, color: '888888' })],
    [cell('* MTTR = Tempo total de parada / Número de falhas.', { italic: true, size: 9, color: '888888' })],
    [cell('* MTBF = Média dos intervalos entre falhas consecutivas.', { italic: true, size: 9, color: '888888' })],
  ];

  const ws = buildSheet(rows);
  setColWidths(ws, [35, 5, 22, 5, 22]);
  setRowHeights(ws, { 0: 36, 6: 24, 14: 24, 19: 24 });
  mergeCells(ws, [
    [0, 0, 0, 4],
    [7, 0, 7, 1],  [7, 2, 7, 4],
    [8, 0, 8, 1],  [8, 2, 8, 4],
    [9, 0, 9, 1],  [9, 2, 9, 4],
    [10, 0, 10, 1], [10, 2, 10, 4],
    [11, 0, 11, 1], [11, 2, 11, 4],
    [12, 0, 12, 1], [12, 2, 12, 4],
    [15, 0, 15, 1], [15, 2, 15, 4],
    [16, 0, 16, 1], [16, 2, 16, 4],
    [17, 0, 17, 1], [17, 2, 17, 4],
    [20, 0, 20, 1], [20, 2, 20, 4],
    [21, 0, 21, 1], [21, 2, 21, 4],
    [22, 0, 22, 1], [22, 2, 22, 4],
    [23, 0, 23, 1], [23, 2, 23, 4],
    [6, 0, 6, 4],
    [14, 0, 14, 4],
    [19, 0, 19, 4],
  ]);
  return ws;
}
// ─────────────────────────────────────────────
// SHEET 2: EVOLUÇÃO MENSAL
// ─────────────────────────────────────────────
function sheetMensal(dadosMensais) {
  const thdr = (t) => cell(t, { bold: true, bg: CORES.headerVerde, color: CORES.branco, align: 'center', border: true });
  const altRow = (r) => r % 2 === 0 ? CORES.branco : CORES.cinzaClaro;

  const header = [
    thdr('Mês'),
    thdr('Custo Preventiva (R$)'),
    thdr('Custo Corretiva (R$)'),
    thdr('Custo Total (R$)'),
    thdr('Tempo de Parada (h)'),
    thdr('% Preventivo'),
  ];

  const dataRows = dadosMensais.map((m, i) => {
    const total = m.preventiva + m.corretiva;
    const pct = total > 0 ? m.preventiva / total : 0;
    const bg = altRow(i);
    return [
      cell(m.mes,       { bg, border: true, align: 'center' }),
      cell(m.preventiva,{ bg, border: true, align: 'right', format: '#,##0.00' }),
      cell(m.corretiva, { bg, border: true, align: 'right', format: '#,##0.00' }),
      cell(total,       { bg, border: true, align: 'right', format: '#,##0.00', bold: true }),
      cell(m.tempoParada, { bg, border: true, align: 'right', format: '#,##0.0' }),
      cell(pct,         { bg, border: true, align: 'right', format: '0.00%' }),
    ];
  });

  const totPreventiva  = dadosMensais.reduce((a, m) => a + m.preventiva, 0);
  const totCorretiva   = dadosMensais.reduce((a, m) => a + m.corretiva, 0);
  const totTotal       = totPreventiva + totCorretiva;
  const totParada      = dadosMensais.reduce((a, m) => a + m.tempoParada, 0);
  const totPct         = totTotal > 0 ? totPreventiva / totTotal : 0;

  const totRow = [
    cell('TOTAL', { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'center' }),
    cell(totPreventiva, { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.00' }),
    cell(totCorretiva,  { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.00' }),
    cell(totTotal,      { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.00' }),
    cell(totParada,     { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.0' }),
    cell(totPct,        { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '0.00%' }),
  ];

  const rows = [
    [cell('EVOLUÇÃO MENSAL DE CUSTOS E PARADAS', { bold: true, size: 14, bg: CORES.headerVerde, color: CORES.branco, align: 'center' }),
     null, null, null, null, null],
    [cell('')],
    header,
    ...dataRows,
    totRow,
  ];

  const ws = buildSheet(rows);
  setColWidths(ws, [18, 22, 22, 22, 22, 16]);
  mergeCells(ws, [[0, 0, 0, 5]]);
  return ws;
}

// ─────────────────────────────────────────────
// SHEET 3: EQUIPAMENTOS CRÍTICOS
// ─────────────────────────────────────────────
function sheetEquipamentos(equipamentosFalhas) {
  const thdr = (t) => cell(t, { bold: true, bg: CORES.headerVermelho, color: CORES.branco, align: 'center', border: true });
  const maxFalhas = equipamentosFalhas[0]?.falhas || 1;

  const header = [
    thdr('Ranking'),
    thdr('Equipamento'),
    thdr('Tag / Código'),
    thdr('Nº Falhas'),
    thdr('Criticidade Relativa (%)'),
  ];

  const dataRows = equipamentosFalhas.map((eq, i) => {
    const pct = (eq.falhas / maxFalhas);
    const bgColor = i === 0 ? 'ffe0e0' : i === 1 ? 'fff0e0' : i === 2 ? 'fffbe0' : CORES.branco;
    return [
      cell(`${i + 1}º`, { bg: bgColor, border: true, align: 'center', bold: i < 3 }),
      cell(eq.nome,      { bg: bgColor, border: true }),
      cell(eq.tag,       { bg: bgColor, border: true, align: 'center' }),
      cell(eq.falhas,    { bg: bgColor, border: true, align: 'center', bold: true, format: '#,##0' }),
      cell(pct,          { bg: bgColor, border: true, align: 'right', format: '0.00%' }),
    ];
  });

  const rows = [
    [cell('TOP EQUIPAMENTOS COM MAIS FALHAS (CORRETIVAS)', { bold: true, size: 14, bg: CORES.headerVermelho, color: CORES.branco, align: 'center' }),
     null, null, null, null],
    [cell('')],
    header,
    ...dataRows,
  ];

  const ws = buildSheet(rows);
  setColWidths(ws, [12, 30, 20, 14, 24]);
  mergeCells(ws, [[0, 0, 0, 4]]);
  return ws;
}

// ─────────────────────────────────────────────
// SHEET 4: OS CORRETIVAS DETALHADAS
// ─────────────────────────────────────────────
function sheetOSCorretivas(os) {
  const thdr = (t) => cell(t, { bold: true, bg: CORES.headerVermelho, color: CORES.branco, align: 'center', border: true, wrap: true });
  const altRow = (r) => r % 2 === 0 ? CORES.branco : 'fff5f5';

  const header = [
    thdr('Nº OS'),
    thdr('Equipamento'),
    thdr('Tag'),
    thdr('Setor'),
    thdr('Descrição'),
    thdr('Data Abertura'),
    thdr('Data Conclusão'),
    thdr('Tempo Parada (h)'),
    thdr('Tempo Manutenção (h)'),
    thdr('Custo Mão de Obra (R$)'),
    thdr('Custo Material (R$)'),
    thdr('Custo Total (R$)'),
    thdr('Responsável'),
  ];

  const osConcluidas = os.filter(o => o.status === 'Concluída' && o.tipo_manutencao === 'CORRETIVA')
    .sort((a, b) => b.criado_em - a.criado_em);

  const dataRows = osConcluidas.map((o, i) => {
    const bg = altRow(i);
    return [
      cell(o.num || '-',                              { bg, border: true, align: 'center', bold: true }),
      cell(o.equipamento_nome || '-',                 { bg, border: true }),
      cell(o.equipamento_tag || '-',                  { bg, border: true, align: 'center' }),
      cell(o.setor || '-',                            { bg, border: true }),
      cell(o.descricao || '-',                        { bg, border: true, wrap: true }),
      cell(fmtDate(o.criado_em),                      { bg, border: true, align: 'center' }),
      cell(fmtDate(o.data_conclusao),                 { bg, border: true, align: 'center' }),
      cell(o.tempo_parada || 0,                       { bg, border: true, align: 'right', format: '#,##0.0' }),
      cell(o.tempo_manutencao || 0,                   { bg, border: true, align: 'right', format: '#,##0.0' }),
      cell(o.custo_mao_obra || 0,                     { bg, border: true, align: 'right', format: '#,##0.00' }),
      cell(o.custo_material || 0,                     { bg, border: true, align: 'right', format: '#,##0.00' }),
      cell(o.custo_total || 0,                        { bg, border: true, align: 'right', format: '#,##0.00', bold: true }),
      cell(o.responsavel_nome || o.responsavel || '-',{ bg, border: true }),
    ];
  });

  const sumField = (field) => osConcluidas.reduce((a, o) => a + (o[field] || 0), 0);
  const totRow = [
    cell('TOTAL', { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'center' }),
    cell('', { bg: CORES.headerCinza, border: true }),
    cell('', { bg: CORES.headerCinza, border: true }),
    cell('', { bg: CORES.headerCinza, border: true }),
    cell(`${osConcluidas.length} OS`, { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'center' }),
    cell('', { bg: CORES.headerCinza, border: true }),
    cell('', { bg: CORES.headerCinza, border: true }),
    cell(sumField('tempo_parada'),    { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.0' }),
    cell(sumField('tempo_manutencao'),{ bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.0' }),
    cell(sumField('custo_mao_obra'),  { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.00' }),
    cell(sumField('custo_material'),  { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.00' }),
    cell(sumField('custo_total'),     { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.00' }),
    cell('', { bg: CORES.headerCinza, border: true }),
  ];

  const rows = [
    [cell('DETALHAMENTO DAS OS CORRETIVAS CONCLUÍDAS', { bold: true, size: 14, bg: CORES.headerVermelho, color: CORES.branco, align: 'center' }),
     null, null, null, null, null, null, null, null, null, null, null, null],
    [cell('')],
    header,
    ...dataRows,
    totRow,
  ];

  const ws = buildSheet(rows);
  setColWidths(ws, [10, 25, 14, 16, 35, 14, 14, 16, 18, 20, 18, 18, 20]);
  setRowHeights(ws, { 0: 28 });
  ws['!freeze'] = { xSplit: 0, ySplit: 3 };
  mergeCells(ws, [[0, 0, 0, 12]]);
  return ws;
}

// ─────────────────────────────────────────────
// SHEET 5: OS PREVENTIVAS DETALHADAS
// ─────────────────────────────────────────────
function sheetOSPreventivas(os) {
  const thdr = (t) => cell(t, { bold: true, bg: CORES.headerVerde, color: CORES.branco, align: 'center', border: true, wrap: true });
  const altRow = (r) => r % 2 === 0 ? CORES.branco : CORES.bgVerde;

  const header = [
    thdr('Nº OS'),
    thdr('Equipamento'),
    thdr('Tag'),
    thdr('Setor'),
    thdr('Descrição'),
    thdr('Data Programada'),
    thdr('Data Conclusão'),
    thdr('Tempo Manutenção (h)'),
    thdr('Custo Mão de Obra (R$)'),
    thdr('Custo Material (R$)'),
    thdr('Custo Total (R$)'),
    thdr('Responsável'),
  ];

  const osConcluidas = os.filter(o => o.status === 'Concluída' && o.tipo_manutencao === 'PREVENTIVA')
    .sort((a, b) => b.criado_em - a.criado_em);

  const dataRows = osConcluidas.map((o, i) => {
    const bg = altRow(i);
    return [
      cell(o.num || '-',                              { bg, border: true, align: 'center', bold: true }),
      cell(o.equipamento_nome || '-',                 { bg, border: true }),
      cell(o.equipamento_tag || '-',                  { bg, border: true, align: 'center' }),
      cell(o.setor || '-',                            { bg, border: true }),
      cell(o.descricao || '-',                        { bg, border: true, wrap: true }),
      cell(fmtDate(o.data_programada || o.criado_em), { bg, border: true, align: 'center' }),
      cell(fmtDate(o.data_conclusao),                 { bg, border: true, align: 'center' }),
      cell(o.tempo_manutencao || 0,                   { bg, border: true, align: 'right', format: '#,##0.0' }),
      cell(o.custo_mao_obra || 0,                     { bg, border: true, align: 'right', format: '#,##0.00' }),
      cell(o.custo_material || 0,                     { bg, border: true, align: 'right', format: '#,##0.00' }),
      cell(o.custo_total || 0,                        { bg, border: true, align: 'right', format: '#,##0.00', bold: true }),
      cell(o.responsavel_nome || o.responsavel || '-',{ bg, border: true }),
    ];
  });

  const sumField = (field) => osConcluidas.reduce((a, o) => a + (o[field] || 0), 0);
  const totRow = [
    cell('TOTAL', { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'center' }),
    cell('', { bg: CORES.headerCinza, border: true }),
    cell('', { bg: CORES.headerCinza, border: true }),
    cell('', { bg: CORES.headerCinza, border: true }),
    cell(`${osConcluidas.length} OS`, { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'center' }),
    cell('', { bg: CORES.headerCinza, border: true }),
    cell('', { bg: CORES.headerCinza, border: true }),
    cell(sumField('tempo_manutencao'),{ bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.0' }),
    cell(sumField('custo_mao_obra'),  { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.00' }),
    cell(sumField('custo_material'),  { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.00' }),
    cell(sumField('custo_total'),     { bold: true, bg: CORES.headerCinza, color: CORES.branco, border: true, align: 'right', format: '#,##0.00' }),
    cell('', { bg: CORES.headerCinza, border: true }),
  ];

  const rows = [
    [cell('DETALHAMENTO DAS OS PREVENTIVAS CONCLUÍDAS', { bold: true, size: 14, bg: CORES.headerVerde, color: CORES.branco, align: 'center' }),
     null, null, null, null, null, null, null, null, null, null, null],
    [cell('')],
    header,
    ...dataRows,
    totRow,
  ];

  const ws = buildSheet(rows);
  setColWidths(ws, [10, 25, 14, 16, 35, 16, 14, 18, 20, 18, 18, 20]);
  setRowHeights(ws, { 0: 28 });
  ws['!freeze'] = { xSplit: 0, ySplit: 3 };
  mergeCells(ws, [[0, 0, 0, 11]]);
  return ws;
}

// ─────────────────────────────────────────────
// SHEET 6: ANÁLISE POR SETOR
// ─────────────────────────────────────────────
function sheetPorSetor(os) {
  const thdr = (t) => cell(t, { bold: true, bg: CORES.headerAzul, color: CORES.branco, align: 'center', border: true });
  const altRow = (r) => r % 2 === 0 ? CORES.branco : CORES.bgAzul;

  const osConcluidas = os.filter(o => o.status === 'Concluída' && o.tipo_manutencao);
  const setorMap = new Map();
  osConcluidas.forEach(o => {
    const s = o.setor || 'Não informado';
    if (!setorMap.has(s)) setorMap.set(s, { setor: s, preventiva: 0, corretiva: 0, falhas: 0, custo: 0, tempo: 0 });
    const e = setorMap.get(s);
    if (o.tipo_manutencao === 'PREVENTIVA') e.preventiva++;
    else { e.corretiva++; e.falhas++; }
    e.custo += o.custo_total || 0;
    e.tempo += o.tempo_parada || 0;
  });

  const setores = Array.from(setorMap.values()).sort((a, b) => b.custo - a.custo);
  const totCusto = setores.reduce((a, s) => a + s.custo, 0);

  const header = [
    thdr('Setor'),
    thdr('OS Preventivas'),
    thdr('OS Corretivas'),
    thdr('Total OS'),
    thdr('Nº Falhas'),
    thdr('Custo Total (R$)'),
    thdr('% do Custo Total'),
    thdr('Tempo Parada (h)'),
  ];

  const dataRows = setores.map((s, i) => {
    const bg = altRow(i);
    const pct = totCusto > 0 ? s.custo / totCusto : 0;
    return [
      cell(s.setor,                    { bg, border: true, bold: true }),
      cell(s.preventiva,               { bg, border: true, align: 'center', format: '#,##0' }),
      cell(s.corretiva,                { bg, border: true, align: 'center', format: '#,##0' }),
      cell(s.preventiva + s.corretiva, { bg, border: true, align: 'center', format: '#,##0', bold: true }),
      cell(s.falhas,                   { bg, border: true, align: 'center', format: '#,##0' }),
      cell(s.custo,                    { bg, border: true, align: 'right',  format: '#,##0.00', bold: true }),
      cell(pct,                        { bg, border: true, align: 'right',  format: '0.00%' }),
      cell(s.tempo,                    { bg, border: true, align: 'right',  format: '#,##0.0' }),
    ];
  });

  const rows = [
    [cell('ANÁLISE DE CUSTOS E FALHAS POR SETOR', { bold: true, size: 14, bg: CORES.headerAzul, color: CORES.branco, align: 'center' }),
     null, null, null, null, null, null, null],
    [cell('')],
    header,
    ...dataRows,
  ];

  const ws = buildSheet(rows);
  setColWidths(ws, [25, 16, 16, 12, 12, 22, 18, 18]);
  mergeCells(ws, [[0, 0, 0, 7]]);
  return ws;
}

// ─────────────────────────────────────────────
// SHEET 7: ANÁLISE POR RESPONSÁVEL
// ─────────────────────────────────────────────
function sheetPorResponsavel(os) {
  const thdr = (t) => cell(t, { bold: true, bg: CORES.headerRoxo, color: CORES.branco, align: 'center', border: true });
  const altRow = (r) => r % 2 === 0 ? CORES.branco : 'f5f0ff';

  const osConcluidas = os.filter(o => o.status === 'Concluída');
  const respMap = new Map();
  osConcluidas.forEach(o => {
    const r = o.responsavel_nome || o.responsavel || 'Não informado';
    if (!respMap.has(r)) respMap.set(r, { nome: r, total: 0, preventiva: 0, corretiva: 0, custo: 0, tempoPrev: 0, tempoCor: 0 });
    const e = respMap.get(r);
    e.total++;
    if (o.tipo_manutencao === 'PREVENTIVA') { e.preventiva++; e.tempoPrev += o.tempo_manutencao || 0; }
    else { e.corretiva++; e.tempoCor += o.tempo_manutencao || 0; }
    e.custo += o.custo_total || 0;
  });

  const responsaveis = Array.from(respMap.values()).sort((a, b) => b.total - a.total);

  const header = [
    thdr('Responsável'),
    thdr('OS Preventivas'),
    thdr('OS Corretivas'),
    thdr('Total OS'),
    thdr('Custo Total (R$)'),
    thdr('Tempo em Manutenção (h)'),
  ];

  const dataRows = responsaveis.map((r, i) => {
    const bg = altRow(i);
    return [
      cell(r.nome,              { bg, border: true, bold: true }),
      cell(r.preventiva,        { bg, border: true, align: 'center', format: '#,##0' }),
      cell(r.corretiva,         { bg, border: true, align: 'center', format: '#,##0' }),
      cell(r.total,             { bg, border: true, align: 'center', format: '#,##0', bold: true }),
      cell(r.custo,             { bg, border: true, align: 'right',  format: '#,##0.00', bold: true }),
      cell(r.tempoPrev + r.tempoCor, { bg, border: true, align: 'right', format: '#,##0.0' }),
    ];
  });

  const rows = [
    [cell('PRODUTIVIDADE POR RESPONSÁVEL', { bold: true, size: 14, bg: CORES.headerRoxo, color: CORES.branco, align: 'center' }),
     null, null, null, null, null],
    [cell('')],
    header,
    ...dataRows,
  ];

  const ws = buildSheet(rows);
  setColWidths(ws, [28, 16, 16, 12, 22, 24]);
  mergeCells(ws, [[0, 0, 0, 5]]);
  return ws;
}
// ─────────────────────────────────────────────
// EXPORTAR XLSX PRINCIPAL
// ─────────────────────────────────────────────
export function exportarXLSX({ indicadores, os, periodo, dataInicio, dataFim, currentUser }) {
  const wb = XLSX.utils.book_new();

  wb.Props = {
    Title: 'Relatório de Confiabilidade',
    Subject: 'Manutenção Industrial',
    Author: currentUser?.nome || 'Sistema',
    CreatedDate: new Date(),
  };

  XLSX.utils.book_append_sheet(wb, sheetCapa(indicadores, periodo, dataInicio, dataFim, currentUser),   '📊 Resumo Executivo');
  XLSX.utils.book_append_sheet(wb, sheetMensal(indicadores.dadosMensais),                               '📈 Evolução Mensal');
  XLSX.utils.book_append_sheet(wb, sheetEquipamentos(indicadores.equipamentosFalhas),                    '🏭 Equip. Críticos');
  XLSX.utils.book_append_sheet(wb, sheetOSCorretivas(os),                                               '🔴 OS Corretivas');
  XLSX.utils.book_append_sheet(wb, sheetOSPreventivas(os),                                              '🟢 OS Preventivas');
  XLSX.utils.book_append_sheet(wb, sheetPorSetor(os),                                                   '🏢 Por Setor');
  XLSX.utils.book_append_sheet(wb, sheetPorResponsavel(os),                                             '👷 Por Responsável');

  const fileName = `confiabilidade_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: 'xlsx', compression: true });
  return fileName;
}

// ─────────────────────────────────────────────
// EXPORTAR PDF
// ─────────────────────────────────────────────
// Usa jsPDF + jsPDF-AutoTable. 
// Instalar: npm install jspdf jspdf-autotable
export async function exportarPDF({ indicadores, os, periodo, dataInicio, dataFim, currentUser }) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const MARGIN = 14;
  const CONTENT_W = W - MARGIN * 2;
  const VERDE = [15, 110, 86];
  const VERMELHO = [163, 45, 45];
  const CINZA = [74, 74, 74];
  const CINZA_CLARO = [245, 245, 245];
  const BRANCO = [255, 255, 255];

  let y = MARGIN;

  const addPage = () => { doc.addPage(); y = MARGIN + 10; drawPageHeader(); };
  const checkY = (needed = 20) => { if (y + needed > 280) addPage(); };

  const drawPageHeader = () => {
    doc.setFillColor(...VERDE);
    doc.rect(0, 0, W, 10, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...BRANCO);
    doc.text('RELATÓRIO DE CONFIABILIDADE E MANUTENÇÃO', MARGIN, 6.5);
    doc.text(`Pág. ${doc.internal.getNumberOfPages()}`, W - MARGIN, 6.5, { align: 'right' });
    doc.setTextColor(0);
  };

  const drawPageFooter = () => {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(...CINZA_CLARO);
      doc.rect(0, 287, W, 10, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(...CINZA);
      doc.text(`Gerado em ${fmtDateTime(Date.now())} | ${currentUser?.nome || ''}`, MARGIN, 292);
      doc.text(`Página ${i} de ${totalPages}`, W - MARGIN, 292, { align: 'right' });
    }
    doc.setTextColor(0);
  };

  const sectionTitle = (title, color = VERDE) => {
    checkY(14);
    doc.setFillColor(...color);
    doc.roundedRect(MARGIN, y, CONTENT_W, 9, 1.5, 1.5, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRANCO);
    doc.text(title, MARGIN + 4, y + 6);
    doc.setTextColor(0);
    y += 13;
  };

  const kpiGrid = (items, cols = 2) => {
    const boxW = (CONTENT_W - (cols - 1) * 4) / cols;
    const boxH = 20;
    let col = 0;
    items.forEach((item, i) => {
      if (col === 0 && i > 0) { y += boxH + 3; }
      const x = MARGIN + col * (boxW + 4);
      doc.setFillColor(...(item.bg || CINZA_CLARO));
      doc.roundedRect(x, y, boxW, boxH, 2, 2, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...(item.labelColor || CINZA));
      doc.text(item.label, x + boxW / 2, y + 6.5, { align: 'center' });
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(item.valColor || [20, 20, 20]));
      doc.text(item.value, x + boxW / 2, y + 15, { align: 'center' });
      col++;
      if (col >= cols) { col = 0; }
    });
    y += boxH + 5;
  };

  const tableDefaults = (headColor = VERDE) => ({
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica', lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { fillColor: headColor, textColor: BRANCO, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    startY: y,
    didDrawPage: (d) => {
      drawPageHeader();
      y = d.cursor.y + 5;
    },
  });

  // CAPA
  doc.setFillColor(...VERDE);
  doc.rect(0, 0, W, 60, 'F');
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRANCO);
  doc.text('RELATÓRIO DE CONFIABILIDADE', W / 2, 28, { align: 'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text('& ANÁLISE DE MANUTENÇÃO', W / 2, 38, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(...BRANCO);
  doc.text(`Período: ${labelPeriodo(periodo, dataInicio, dataFim)}`, W / 2, 50, { align: 'center' });
  doc.text(`Gerado em: ${fmtDateTime(Date.now())}`, W / 2, 56, { align: 'center' });
  doc.setTextColor(0);
  y = 72;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...CINZA);
  doc.text(`Responsável: ${currentUser?.nome || currentUser?.email || '-'}`, MARGIN, y);
  y += 10;

  // Custos
  sectionTitle('💰  Custos de Manutenção');
  const custoTotal = indicadores.custoPreventiva + indicadores.custoCorretiva;
  const ratioP = custoTotal > 0 ? ((indicadores.custoPreventiva / custoTotal) * 100).toFixed(1) : '0.0';
  kpiGrid([
    { label: 'Custo Preventivo',   value: `R$ ${fmt(indicadores.custoPreventiva)}`, bg: [232, 245, 241], valColor: VERDE },
    { label: 'Custo Corretivo',    value: `R$ ${fmt(indicadores.custoCorretiva)}`,  bg: [253, 240, 240], valColor: VERMELHO },
    { label: 'Custo Total',        value: `R$ ${fmt(custoTotal)}`,                  bg: CINZA_CLARO,     valColor: [20, 20, 20] },
    { label: '% Preventivo',       value: `${ratioP}%`,                             bg: [232, 240, 253], valColor: [26, 111, 163] },
  ], 2);

  // Tempo e Disponibilidade
  sectionTitle('⏱️  Tempo e Disponibilidade');
  kpiGrid([
    { label: 'Tempo Total Parada',     value: `${fmt(indicadores.tempoParadaTotal, 1)} h`,    bg: CINZA_CLARO },
    { label: 'Tempo Total Manutenção', value: `${fmt(indicadores.tempoManutencaoTotal, 1)} h`, bg: CINZA_CLARO },
    { label: 'Disponibilidade Est.',   value: `${disponibilidade(indicadores.tempoParadaTotal, periodo)} %`, bg: [232, 245, 241], valColor: VERDE },
    { label: 'Nº de Falhas (Corret.)', value: String(indicadores.numeroFalhas),               bg: [253, 240, 240], valColor: VERMELHO },
  ], 2);

  // Confiabilidade
  sectionTitle('🔧  Indicadores de Confiabilidade');
  kpiGrid([
    { label: 'MTTR – Tempo Médio de Reparo',     value: `${indicadores.mttr} h`, bg: CINZA_CLARO },
    { label: 'MTBF – Tempo Médio entre Falhas',  value: `${indicadores.mtbf} h`, bg: CINZA_CLARO },
    { label: 'MTTF – Tempo Médio até Falha',     value: `${indicadores.mttf} h`, bg: CINZA_CLARO },
    { label: 'Ticket Médio Corretivo',
      value: `R$ ${fmt(indicadores.numeroFalhas > 0 ? indicadores.custoCorretiva / indicadores.numeroFalhas : 0)}`,
      bg: [253, 240, 240], valColor: VERMELHO },
  ], 2);

  // Evolução Mensal
  if (indicadores.dadosMensais.length > 0) {
    addPage();
    sectionTitle('📈  Evolução Mensal de Custos e Paradas');
    autoTable(doc, {
      ...tableDefaults(VERDE),
      head: [['Mês', 'Custo Prev. (R$)', 'Custo Corr. (R$)', 'Custo Total (R$)', 'Parada (h)', '% Prev.']],
      body: indicadores.dadosMensais.map(m => {
        const tot = m.preventiva + m.corretiva;
        return [
          m.mes,
          `R$ ${fmt(m.preventiva)}`,
          `R$ ${fmt(m.corretiva)}`,
          `R$ ${fmt(tot)}`,
          `${fmt(m.tempoParada, 1)} h`,
          `${tot > 0 ? ((m.preventiva / tot) * 100).toFixed(1) : '0.0'}%`,
        ];
      }),
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
    });
  }

  // Equipamentos críticos
  if (indicadores.equipamentosFalhas.length > 0) {
    checkY(40);
    sectionTitle('🏭  Equipamentos com Mais Falhas', VERMELHO);
    const maxF = indicadores.equipamentosFalhas[0].falhas;
    autoTable(doc, {
      ...tableDefaults(VERMELHO),
      head: [['Ranking', 'Equipamento', 'Tag', 'Nº Falhas', 'Criticidade (%)']],
      body: indicadores.equipamentosFalhas.map((eq, i) => [
        `${i + 1}º`,
        eq.nome,
        eq.tag,
        eq.falhas,
        `${((eq.falhas / maxF) * 100).toFixed(1)}%`,
      ]),
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        3: { halign: 'center', fontStyle: 'bold' },
        4: { halign: 'right' },
      },
    });
  }

  // OS Corretivas
  const osCorr = os.filter(o => o.status === 'Concluída' && o.tipo_manutencao === 'CORRETIVA')
    .sort((a, b) => b.criado_em - a.criado_em);
  if (osCorr.length > 0) {
    addPage();
    sectionTitle('🔴  Detalhamento – OS Corretivas Concluídas', VERMELHO);
    autoTable(doc, {
      ...tableDefaults(VERMELHO),
      head: [['Nº OS', 'Equipamento', 'Setor', 'Data', 'Parada (h)', 'Custo Total (R$)']],
      body: osCorr.map(o => [
        o.num || '-',
        o.equipamento_nome || o.equipamento_tag || '-',
        o.setor || '-',
        fmtDate(o.data_conclusao),
        fmt(o.tempo_parada || 0, 1),
        `R$ ${fmt(o.custo_total || 0)}`,
      ]),
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
      },
    });
  }

  // OS Preventivas
  const osPrev = os.filter(o => o.status === 'Concluída' && o.tipo_manutencao === 'PREVENTIVA')
    .sort((a, b) => b.criado_em - a.criado_em);
  if (osPrev.length > 0) {
    addPage();
    sectionTitle('🟢  Detalhamento – OS Preventivas Concluídas');
    autoTable(doc, {
      ...tableDefaults(VERDE),
      head: [['Nº OS', 'Equipamento', 'Setor', 'Data', 'Manutenção (h)', 'Custo Total (R$)']],
      body: osPrev.map(o => [
        o.num || '-',
        o.equipamento_nome || o.equipamento_tag || '-',
        o.setor || '-',
        fmtDate(o.data_conclusao),
        fmt(o.tempo_manutencao || 0, 1),
        `R$ ${fmt(o.custo_total || 0)}`,
      ]),
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
      },
    });
  }

  // Análise por Setor
  const osConcl = os.filter(o => o.status === 'Concluída' && o.tipo_manutencao);
  const setorMapAux = new Map();
  osConcl.forEach(o => {
    const s = o.setor || 'Não informado';
    if (!setorMapAux.has(s)) setorMapAux.set(s, { setor: s, preventiva: 0, corretiva: 0, custo: 0 });
    const e = setorMapAux.get(s);
    if (o.tipo_manutencao === 'PREVENTIVA') e.preventiva++; else e.corretiva++;
    e.custo += o.custo_total || 0;
  });
  const setoresAux = Array.from(setorMapAux.values()).sort((a, b) => b.custo - a.custo);
  if (setoresAux.length > 0) {
    checkY(40);
    sectionTitle('🏢  Análise por Setor', [26, 111, 163]);
    const totCustoSetor = setoresAux.reduce((a, s) => a + s.custo, 0);
    autoTable(doc, {
      ...tableDefaults([26, 111, 163]),
      head: [['Setor', 'OS Prev.', 'OS Corr.', 'Total OS', 'Custo Total (R$)', '% do Total']],
      body: setoresAux.map(s => [
        s.setor,
        s.preventiva,
        s.corretiva,
        s.preventiva + s.corretiva,
        `R$ ${fmt(s.custo)}`,
        `${totCustoSetor > 0 ? ((s.custo / totCustoSetor) * 100).toFixed(1) : '0.0'}%`,
      ]),
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center', fontStyle: 'bold' },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { halign: 'right' },
      },
    });
  }

  drawPageFooter();
  const fileName = `confiabilidade_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.pdf`;
  doc.save(fileName);
  return fileName;
}

// ─────────────────────────────────────────────
// ALIASES PARA COMPATIBILIDADE COM OUTROS COMPONENTES
// ─────────────────────────────────────────────
export const exportToPDF = exportarPDF;
export const exportToXLSX = exportarXLSX;
export const exportToJSON = (data) => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `export_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
};
export const exportToCSV = (data) => {
  if (!data?.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  for (const row of data) {
    const values = headers.map(h => JSON.stringify(row[h] ?? ''));
    csvRows.push(values.join(','));
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `export_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};