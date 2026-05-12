// src/components/ReliabilityDashboard.js
import React, { useState, useEffect } from 'react';
import { getFilteredOS } from '../utils/helpers';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { addNotification, NOTIF_TYPES } from '../utils/notifications';

export default function ReliabilityDashboard({ os, currentUser }) {
  const [indicadores, setIndicadores] = useState({
    custoPreventiva: 0,
    custoCorretiva: 0,
    tempoParadaTotal: 0,
    tempoManutencaoTotal: 0,
    numeroFalhas: 0,
    mttr: 0,
    mtbf: 0,
    mttf: 0,
    dadosMensais: [],
    equipamentosFalhas: []
  });
  const [periodo, setPeriodo] = useState('mensal'); // diario, mensal, anual
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Permissão
  if (currentUser?.role !== 'Admin' && currentUser?.role !== 'Gestor') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
        <i className="ti ti-lock" style={{ fontSize: 40, color: '#d3d1c7', display: 'block', marginBottom: 12 }}></i>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#444', marginBottom: 6 }}>Acesso restrito</div>
        <div style={{ fontSize: 13, color: '#888' }}>Indicadores de confiabilidade disponíveis apenas para Gestores e Administradores.</div>
      </div>
    );
  }

  useEffect(() => {
    calcularIndicadores();
  }, [os, periodo, dataInicio, dataFim]);

  const filtrarPorPeriodo = (osList) => {
    let inicio, fim;
    const agora = new Date();
    if (periodo === 'diario') {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      inicio.setHours(0,0,0,0);
      fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      fim.setHours(23,59,59,999);
    } else if (periodo === 'mensal') {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
      fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
      fim.setHours(23,59,59,999);
    } else if (periodo === 'anual') {
      inicio = new Date(agora.getFullYear(), 0, 1);
      fim = new Date(agora.getFullYear(), 11, 31);
      fim.setHours(23,59,59,999);
    } else if (periodo === 'custom' && dataInicio && dataFim) {
      inicio = new Date(dataInicio);
      fim = new Date(dataFim);
    } else {
      return osList;
    }
    return osList.filter(o => o.criado_em >= inicio.getTime() && o.criado_em <= fim.getTime());
  };

  const calcularIndicadores = () => {
    const osConcluidas = filtrarPorPeriodo(os.filter(o => o.status === 'Concluída' && o.tipo_manutencao));
    const osPreventiva = osConcluidas.filter(o => o.tipo_manutencao === 'PREVENTIVA');
    const osCorretiva = osConcluidas.filter(o => o.tipo_manutencao === 'CORRETIVA');

    const custoPreventiva = osPreventiva.reduce((acc, o) => acc + (o.custo_total || 0), 0);
    const custoCorretiva = osCorretiva.reduce((acc, o) => acc + (o.custo_total || 0), 0);
    const tempoParadaTotal = osCorretiva.reduce((acc, o) => acc + (o.tempo_parada || 0), 0);
    const tempoManutencaoTotal = osConcluidas.reduce((acc, o) => acc + (o.tempo_manutencao || 0), 0);
    const numeroFalhas = osCorretiva.length;

    const mttr = numeroFalhas > 0 ? (tempoParadaTotal / numeroFalhas).toFixed(1) : 0;

    const falhasOrdenadas = [...osCorretiva].sort((a,b) => a.criado_em - b.criado_em);
    let somaIntervalos = 0;
    let intervalosCount = 0;
    for (let i = 1; i < falhasOrdenadas.length; i++) {
      const intervalo = (falhasOrdenadas[i].criado_em - falhasOrdenadas[i-1].criado_em) / (1000 * 60 * 60);
      if (intervalo > 0 && intervalo < 10000) {
        somaIntervalos += intervalo;
        intervalosCount++;
      }
    }
    const mtbf = intervalosCount > 0 ? (somaIntervalos / intervalosCount).toFixed(1) : 0;
    const mttf = numeroFalhas > 0 ? (somaIntervalos / numeroFalhas).toFixed(1) : 0;

    const meses = {};
    osConcluidas.forEach(os => {
      const mes = new Date(os.criado_em).toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
      if (!meses[mes]) meses[mes] = { mes, preventiva: 0, corretiva: 0, tempoParada: 0 };
      if (os.tipo_manutencao === 'PREVENTIVA') meses[mes].preventiva += os.custo_total || 0;
      else meses[mes].corretiva += os.custo_total || 0;
      meses[mes].tempoParada += os.tempo_parada || 0;
    });
    const dadosMensais = Object.values(meses).sort((a,b) => a.mes.localeCompare(b.mes));

    const equipMap = new Map();
    osCorretiva.forEach(os => {
      if (!os.equipamento_tag) return;
      if (!equipMap.has(os.equipamento_tag)) {
        equipMap.set(os.equipamento_tag, { tag: os.equipamento_tag, nome: os.equipamento_nome || os.equipamento_tag, falhas: 0 });
      }
      equipMap.get(os.equipamento_tag).falhas++;
    });
    const equipamentosFalhas = Array.from(equipMap.values()).sort((a,b) => b.falhas - a.falhas).slice(0,5);

    setIndicadores({
      custoPreventiva,
      custoCorretiva,
      tempoParadaTotal,
      tempoManutencaoTotal,
      numeroFalhas,
      mttr,
      mtbf,
      mttf,
      dadosMensais,
      equipamentosFalhas
    });
  };

  // ==================== FUNÇÃO DE EXPORTAÇÃO EXCEL ====================
  const exportarDados = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const corVerde = 'FF0F6E56';
      const corVermelho = 'FFA32D2D';
      const corAzul = 'FF1A56A0';
      const corLaranja = 'FFF39C12';
      const corAmarelo = 'FFFFF9C4';
      const corCinzaClaro = 'FFF5F5F5';
      const corBranco = 'FFFFFFFF';
      const corPretoTexto = 'FF212121';
      const corCabecalho = 'FF0D3B2E';

      const estiloTitulo = {
        font: { name: 'Arial', bold: true, sz: 16, color: { rgb: corBranco } },
        fill: { patternType: 'solid', fgColor: { rgb: corCabecalho } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          bottom: { style: 'medium', color: { rgb: corVerde } }
        }
      };

      const estiloCabecalho = {
        font: { name: 'Arial', bold: true, sz: 11, color: { rgb: corBranco } },
        fill: { patternType: 'solid', fgColor: { rgb: corCabecalho } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: corBranco } },
          bottom: { style: 'thin', color: { rgb: corBranco } },
          left: { style: 'thin', color: { rgb: corBranco } },
          right: { style: 'thin', color: { rgb: corBranco } }
        }
      };

      const estiloSubCabecalho = {
        font: { name: 'Arial', bold: true, sz: 11, color: { rgb: corBranco } },
        fill: { patternType: 'solid', fgColor: { rgb: corVerde } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: { bottom: { style: 'thin', color: { rgb: corVerde } } }
      };

      const estiloDadoPar = {
        font: { name: 'Arial', sz: 10, color: { rgb: corPretoTexto } },
        fill: { patternType: 'solid', fgColor: { rgb: corBranco } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'hair', color: { rgb: 'FFE0E0E0' } },
          bottom: { style: 'hair', color: { rgb: 'FFE0E0E0' } },
          left: { style: 'hair', color: { rgb: 'FFE0E0E0' } },
          right: { style: 'hair', color: { rgb: 'FFE0E0E0' } }
        }
      };

      const estiloDadoImpar = {
        font: { name: 'Arial', sz: 10, color: { rgb: corPretoTexto } },
        fill: { patternType: 'solid', fgColor: { rgb: corCinzaClaro } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'hair', color: { rgb: 'FFE0E0E0' } },
          bottom: { style: 'hair', color: { rgb: 'FFE0E0E0' } },
          left: { style: 'hair', color: { rgb: 'FFE0E0E0' } },
          right: { style: 'hair', color: { rgb: 'FFE0E0E0' } }
        }
      };

      const estiloValorVerde = {
        font: { name: 'Arial', bold: true, sz: 11, color: { rgb: corBranco } },
        fill: { patternType: 'solid', fgColor: { rgb: corVerde } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: corBranco } },
          bottom: { style: 'thin', color: { rgb: corBranco } },
          left: { style: 'thin', color: { rgb: corBranco } },
          right: { style: 'thin', color: { rgb: corBranco } }
        }
      };

      const estiloValorVermelho = {
        ...estiloValorVerde,
        fill: { patternType: 'solid', fgColor: { rgb: corVermelho } }
      };

      const estiloValorAzul = {
        ...estiloValorVerde,
        fill: { patternType: 'solid', fgColor: { rgb: corAzul } }
      };

      const estiloValorLaranja = {
        ...estiloValorVerde,
        fill: { patternType: 'solid', fgColor: { rgb: corLaranja } }
      };

      const estiloNumero = {
        ...estiloDadoPar,
        alignment: { horizontal: 'right', vertical: 'center' },
        numFmt: '#,##0.00'
      };

      const periodoLabel = periodo === 'custom'
        ? `${dataInicio} a ${dataFim}`
        : periodo === 'diario' ? 'Hoje'
        : periodo === 'mensal' ? 'Este mês'
        : 'Este ano';

      const totalCustos = indicadores.custoPreventiva + indicadores.custoCorretiva;
      const disponibilidade = totalCustos > 0
        ? (1 - (indicadores.tempoParadaTotal / (indicadores.tempoParadaTotal + (periodo === 'mensal' ? 720 : 8760)))) * 100
        : 100;
      const ticketMedioCorretivo = indicadores.numeroFalhas > 0
        ? indicadores.custoCorretiva / indicadores.numeroFalhas
        : 0;
      const ticketMedioPreventivo = indicadores.numeroFalhas > 0
        ? indicadores.custoPreventiva / indicadores.numeroFalhas
        : 0;
      const relacaoPC = indicadores.custoPreventiva > 0
        ? (indicadores.custoCorretiva / indicadores.custoPreventiva) * 100
        : 0;

      // =================================================
      // ABA 1: DASHBOARD DE INDICADORES
      // =================================================
      const aoa1 = [];

      // Linha 1 - Título
      aoa1.push(['RELATÓRIO DE CONFIABILIDADE E MANUTENÇÃO', '', '', '', '']);
      aoa1.push([`Período: ${periodoLabel}`, '', `Gerado em: ${new Date().toLocaleString('pt-BR')}`, '', '']);
      aoa1.push(['']);

      // KPIs principais em cards
      aoa1.push(['INDICADORES FINANCEIROS', '', '', 'INDICADORES DE TEMPO', '']);
      aoa1.push(['Custo Preventivas (R$)', `R$ ${indicadores.custoPreventiva.toLocaleString('pt-BR', {minimumFractionDigits:2})}`, '', 'Tempo Total de Parada (h)', `${Number(indicadores.tempoParadaTotal).toFixed(1)} h`]);
      aoa1.push(['Custo Corretivas (R$)', `R$ ${indicadores.custoCorretiva.toLocaleString('pt-BR', {minimumFractionDigits:2})}`, '', 'Tempo Total de Manutenção (h)', `${Number(indicadores.tempoManutencaoTotal).toFixed(1)} h`]);
      aoa1.push(['Custo Total Geral (R$)', `R$ ${totalCustos.toLocaleString('pt-BR', {minimumFractionDigits:2})}`, '', 'Disponibilidade Estimada (%)', `${disponibilidade.toFixed(1)}%`]);
      aoa1.push(['']);

      aoa1.push(['INDICADORES DE CONFIABILIDADE (RCM)', '', '', 'ANÁLISE DE FALHAS', '']);
      aoa1.push(['MTTR – Tempo Médio de Reparo', `${indicadores.mttr} h`, '', 'Número de Falhas (OS Corretivas)', indicadores.numeroFalhas]);
      aoa1.push(['MTBF – Tempo Médio entre Falhas', `${indicadores.mtbf} h`, '', 'Ticket Médio Corretivo (R$)', `R$ ${ticketMedioCorretivo.toLocaleString('pt-BR', {minimumFractionDigits:2})}`]);
      aoa1.push(['MTTF – Tempo Médio até Falha', `${indicadores.mttf} h`, '', 'Ticket Médio Preventivo (R$)', `R$ ${ticketMedioPreventivo.toLocaleString('pt-BR', {minimumFractionDigits:2})}`]);
      aoa1.push(['']);

      aoa1.push(['ANÁLISE ESTRATÉGICA', '', '', '', '']);
      aoa1.push(['Relação Corretiva/Preventiva (%)', `${relacaoPC.toFixed(1)}%`, '', '', '']);
      aoa1.push(['Interpretação', relacaoPC > 100 ? '⚠️ Alta manutenção reativa — revisar plano preventivo' : relacaoPC > 60 ? '🔶 Manutenção moderadamente reativa' : '✅ Boa relação preventiva/corretiva', '', '', '']);
      aoa1.push(['']);
      aoa1.push(['NOTA TÉCNICA', '', '', '', '']);
      aoa1.push(['MTTR', 'Tempo médio para restaurar o equipamento após falha. Quanto menor, mais eficiente a equipe de reparo.', '', '', '']);
      aoa1.push(['MTBF', 'Tempo médio entre falhas consecutivas. Quanto maior, mais confiável o equipamento.', '', '', '']);
      aoa1.push(['MTTF', 'Tempo médio até a primeira falha. Usado para equipamentos não-reparáveis.', '', '', '']);

      const ws1 = XLSX.utils.aoa_to_sheet(aoa1);

      // Aplicar estilos manualmente via !ref e s (estilo cell-by-cell)
      const aplicarEstilo = (ws, addr, estilo) => {
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        ws[addr].s = estilo;
      };

      // Título
      ws1['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Título principal
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // Período
        { s: { r: 1, c: 2 }, e: { r: 1, c: 4 } }, // Data geração
      ];

      aplicarEstilo(ws1, 'A1', estiloTitulo);
      aplicarEstilo(ws1, 'A2', { font: { name: 'Arial', sz: 10, italic: true }, fill: { patternType: 'solid', fgColor: { rgb: 'FF1A3C32' } }, font: { color: { rgb: 'FFCCCCCC' }, sz: 10 } });

      // Colunas
      ws1['!cols'] = [
        { wch: 40 }, // A
        { wch: 28 }, // B
        { wch: 6 },  // C (espaço)
        { wch: 40 }, // D
        { wch: 28 }, // E
      ];

      // Altura das linhas
      ws1['!rows'] = [
        { hpt: 36 }, // linha 1 - título
        { hpt: 20 }, // linha 2 - subtítulo
        { hpt: 8 },
        { hpt: 22 }, // cabeçalhos de seção
        { hpt: 24 },
        { hpt: 24 },
        { hpt: 24 },
      ];

      XLSX.utils.book_append_sheet(workbook, ws1, '📊 Dashboard');

      // =================================================
      // ABA 2: EVOLUÇÃO MENSAL
      // =================================================
      if (indicadores.dadosMensais.length) {
        const aoa2 = [
          ['EVOLUÇÃO MENSAL DE CUSTOS E TEMPO DE PARADA'],
          [`Período analisado: ${periodoLabel}  |  Total de meses: ${indicadores.dadosMensais.length}`],
          [],
          ['Mês', 'Custo Preventiva (R$)', 'Custo Corretiva (R$)', 'Total Custos (R$)', 'Tempo de Parada (h)', 'Variação Corretiva (%)']
        ];

        let prevCorretiva = null;
        indicadores.dadosMensais.forEach((m, i) => {
          const total = m.preventiva + m.corretiva;
          const variacao = prevCorretiva !== null && prevCorretiva > 0
            ? (((m.corretiva - prevCorretiva) / prevCorretiva) * 100).toFixed(1) + '%'
            : '-';
          aoa2.push([
            m.mes,
            m.preventiva,
            m.corretiva,
            total,
            m.tempoParada,
            variacao
          ]);
          prevCorretiva = m.corretiva;
        });

        // Totais
        const totalPrev = indicadores.dadosMensais.reduce((s, m) => s + m.preventiva, 0);
        const totalCorr = indicadores.dadosMensais.reduce((s, m) => s + m.corretiva, 0);
        const totalParada = indicadores.dadosMensais.reduce((s, m) => s + m.tempoParada, 0);
        aoa2.push(['TOTAL GERAL', totalPrev, totalCorr, totalPrev + totalCorr, totalParada, '']);
        aoa2.push([]);
        aoa2.push(['MÉDIAS MENSAIS', totalPrev / indicadores.dadosMensais.length, totalCorr / indicadores.dadosMensais.length, (totalPrev + totalCorr) / indicadores.dadosMensais.length, totalParada / indicadores.dadosMensais.length, '']);

        const ws2 = XLSX.utils.aoa_to_sheet(aoa2);
        ws2['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        ];
        ws2['!cols'] = [
          { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 22 }
        ];
        XLSX.utils.book_append_sheet(workbook, ws2, '📈 Evolução Mensal');
      }

      // =================================================
      // ABA 3: EQUIPAMENTOS CRÍTICOS
      // =================================================
      if (indicadores.equipamentosFalhas.length) {
        const totalFalhas = indicadores.equipamentosFalhas.reduce((s, e) => s + e.falhas, 0);
        const aoa3 = [
          ['ANÁLISE DE EQUIPAMENTOS CRÍTICOS — TOP FALHAS'],
          [`Base: OS Corretivas concluídas  |  Período: ${periodoLabel}`],
          [],
          ['#', 'Equipamento', 'TAG', 'Nº de Falhas', '% do Total', 'Classificação', 'Ação Recomendada']
        ];

        indicadores.equipamentosFalhas.forEach((eq, i) => {
          const pct = ((eq.falhas / totalFalhas) * 100).toFixed(1);
          const classificacao = eq.falhas >= 5 ? '🔴 CRÍTICO' : eq.falhas >= 3 ? '🟠 ALTO' : eq.falhas >= 2 ? '🟡 MÉDIO' : '🟢 BAIXO';
          const acao = eq.falhas >= 5 ? 'Revisão completa urgente — avaliar substituição'
            : eq.falhas >= 3 ? 'Incluir em plano preventivo mensal'
            : eq.falhas >= 2 ? 'Monitorar — incluir em rota de inspeção'
            : 'Manter monitoramento padrão';
          aoa3.push([i + 1, eq.nome, eq.tag, eq.falhas, pct + '%', classificacao, acao]);
        });

        aoa3.push([]);
        aoa3.push(['ANÁLISE DE PARETO (80/20)', '', '', '', '', '', '']);
        aoa3.push(['Os equipamentos acima concentram as falhas. Focar recursos de manutenção preventiva neles pode reduzir até 80% das interrupções não planejadas.', '', '', '', '', '', '']);

        const ws3 = XLSX.utils.aoa_to_sheet(aoa3);
        ws3['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
          { s: { r: aoa3.length - 1, c: 0 }, e: { r: aoa3.length - 1, c: 6 } },
        ];
        ws3['!cols'] = [
          { wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 42 }
        ];
        XLSX.utils.book_append_sheet(workbook, ws3, '🏭 Equipamentos Críticos');
      }

      // =================================================
      // ABA 4: OS CORRETIVAS DETALHADAS
      // =================================================
      const osFiltradas = filtrarPorPeriodo(os.filter(o => o.status === 'Concluída' && o.tipo_manutencao === 'CORRETIVA'));
      if (osFiltradas.length) {
        const aoa4 = [
          ['DETALHAMENTO COMPLETO — OS CORRETIVAS CONCLUÍDAS'],
          [`Período: ${periodoLabel}  |  Total de registros: ${osFiltradas.length}`],
          [],
          ['Nº OS', 'Equipamento', 'TAG', 'Custo Total (R$)', 'Tempo Parada (h)', 'Tempo Manutenção (h)', 'Data Abertura', 'Data Conclusão', 'Responsável', 'Setor']
        ];

        osFiltradas
          .sort((a, b) => b.criado_em - a.criado_em)
          .forEach(o => {
            aoa4.push([
              o.num || '-',
              o.equipamento_nome || o.equipamento_tag || '-',
              o.equipamento_tag || '-',
              o.custo_total || 0,
              o.tempo_parada || 0,
              o.tempo_manutencao || 0,
              o.criado_em ? new Date(o.criado_em).toLocaleDateString('pt-BR') : '-',
              o.data_conclusao ? new Date(o.data_conclusao).toLocaleDateString('pt-BR') : '-',
              o.responsavel || '-',
              o.setor || o.area || '-'
            ]);
          });

        // Totais
        aoa4.push([]);
        aoa4.push([
          'TOTAIS',
          '',
          '',
          `=SUM(D5:D${osFiltradas.length + 4})`,
          `=SUM(E5:E${osFiltradas.length + 4})`,
          `=SUM(F5:F${osFiltradas.length + 4})`,
          '', '', '', ''
        ]);

        const ws4 = XLSX.utils.aoa_to_sheet(aoa4);
        ws4['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
        ];
        ws4['!cols'] = [
          { wch: 10 }, { wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
          { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 18 }
        ];
        ws4['!autofilter'] = { ref: 'A4:J4' };
        XLSX.utils.book_append_sheet(workbook, ws4, '🔧 OS Corretivas');
      }

      // =================================================
      // ABA 5: OS PREVENTIVAS DETALHADAS
      // =================================================
      const osPreventivas = filtrarPorPeriodo(os.filter(o => o.status === 'Concluída' && o.tipo_manutencao === 'PREVENTIVA'));
      if (osPreventivas.length) {
        const aoa5 = [
          ['DETALHAMENTO COMPLETO — OS PREVENTIVAS CONCLUÍDAS'],
          [`Período: ${periodoLabel}  |  Total de registros: ${osPreventivas.length}`],
          [],
          ['Nº OS', 'Equipamento', 'TAG', 'Custo Total (R$)', 'Tempo Manutenção (h)', 'Data Abertura', 'Data Conclusão', 'Responsável', 'Setor', 'Frequência']
        ];

        osPreventivas
          .sort((a, b) => b.criado_em - a.criado_em)
          .forEach(o => {
            aoa5.push([
              o.num || '-',
              o.equipamento_nome || o.equipamento_tag || '-',
              o.equipamento_tag || '-',
              o.custo_total || 0,
              o.tempo_manutencao || 0,
              o.criado_em ? new Date(o.criado_em).toLocaleDateString('pt-BR') : '-',
              o.data_conclusao ? new Date(o.data_conclusao).toLocaleDateString('pt-BR') : '-',
              o.responsavel || '-',
              o.setor || o.area || '-',
              o.frequencia || '-'
            ]);
          });

        const ws5 = XLSX.utils.aoa_to_sheet(aoa5);
        ws5['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
        ];
        ws5['!cols'] = [
          { wch: 10 }, { wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 20 },
          { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 14 }
        ];
        ws5['!autofilter'] = { ref: 'A4:J4' };
        XLSX.utils.book_append_sheet(workbook, ws5, '✅ OS Preventivas');
      }

      // =================================================
      // ABA 6: RESUMO EXECUTIVO
      // =================================================
      const aoa6 = [
        ['RESUMO EXECUTIVO — RELATÓRIO DE MANUTENÇÃO'],
        [`Elaborado em: ${new Date().toLocaleString('pt-BR')}  |  Período: ${periodoLabel}`],
        [],
        ['1. CONTEXTO'],
        ['Este relatório apresenta os principais indicadores de confiabilidade e custos de manutenção, gerado automaticamente pelo sistema de gestão de OS.'],
        [],
        ['2. RESULTADOS DO PERÍODO'],
        ['Total de OS corretivas encerradas:', indicadores.numeroFalhas],
        ['Total de OS preventivas encerradas:', osPreventivas.length],
        ['Custo total do período (R$):', indicadores.custoPreventiva + indicadores.custoCorretiva],
        ['Horas de parada não planejada (h):', indicadores.tempoParadaTotal],
        ['Disponibilidade estimada (%):', disponibilidade.toFixed(1) + '%'],
        [],
        ['3. INDICADORES DE CONFIABILIDADE'],
        ['MTTR (h):', indicadores.mttr, '→ Tempo médio para restaurar após falha'],
        ['MTBF (h):', indicadores.mtbf, '→ Tempo médio entre falhas consecutivas'],
        ['MTTF (h):', indicadores.mttf, '→ Tempo médio até primeira falha'],
        [],
        ['4. ANÁLISE FINANCEIRA'],
        ['Custo com manutenção preventiva (R$):', indicadores.custoPreventiva.toFixed(2)],
        ['Custo com manutenção corretiva (R$):', indicadores.custoCorretiva.toFixed(2)],
        ['Proporção corretiva/preventiva (%):', relacaoPC.toFixed(1) + '%'],
        ['Ticket médio corretivo (R$):', ticketMedioCorretivo.toFixed(2)],
        [],
        ['5. RECOMENDAÇÕES'],
        [relacaoPC > 100 ? '⚠️  Alta proporção de manutenção reativa. Recomenda-se revisar e reforçar o plano de manutenção preventiva para reduzir custos e paradas.' : '✅  Boa relação entre manutenção preventiva e corretiva. Manter o plano atual com revisões periódicas.'],
        [indicadores.equipamentosFalhas.length > 0 ? `🔴  Equipamento mais crítico: ${indicadores.equipamentosFalhas[0].nome} (${indicadores.equipamentosFalhas[0].falhas} falha(s)). Priorizar inspeção e revisão completa.` : ''],
        [],
        ['CONFIDENCIAL — USO INTERNO', '', ''],
      ];

      const ws6 = XLSX.utils.aoa_to_sheet(aoa6);
      ws6['!cols'] = [{ wch: 45 }, { wch: 20 }, { wch: 50 }];
      ws6['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } },
      ];
      XLSX.utils.book_append_sheet(workbook, ws6, '📋 Resumo Executivo');

      // Salvar
      const fileName = `relatorio_confiabilidade_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      addNotification('✅ Exportação concluída', 'Planilha Excel gerada com sucesso!', NOTIF_TYPES.SUCCESS);
    } catch (error) {
      console.error(error);
      addNotification('❌ Erro na exportação', 'Não foi possível gerar o arquivo Excel.', NOTIF_TYPES.ERROR);
    }
  };

  // ==================== FUNÇÃO DE EXPORTAÇÃO PDF ====================
  const exportarPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const VERDE = [15, 110, 86];
      const VERDE_ESCURO = [13, 59, 46];
      const VERMELHO = [163, 45, 45];
      const AZUL = [26, 86, 160];
      const CINZA_CLARO = [245, 245, 245];
      const CINZA = [120, 120, 120];
      const BRANCO = [255, 255, 255];
      const PRETO = [33, 33, 33];
      const LARANJA = [243, 156, 18];

      const periodoLabel = periodo === 'custom'
        ? `${dataInicio} a ${dataFim}`
        : periodo === 'diario' ? 'Hoje'
        : periodo === 'mensal' ? 'Este mês'
        : 'Este ano';

      const totalCustos = indicadores.custoPreventiva + indicadores.custoCorretiva;
      const disponibilidade = totalCustos > 0
        ? (1 - (indicadores.tempoParadaTotal / (indicadores.tempoParadaTotal + (periodo === 'mensal' ? 720 : 8760)))) * 100
        : 100;

      let y = 0; // cursor vertical

      // ---- CABEÇALHO ----
      doc.setFillColor(...VERDE_ESCURO);
      doc.rect(0, 0, 210, 38, 'F');

      doc.setFillColor(...VERDE);
      doc.rect(0, 35, 210, 3, 'F');

      doc.setTextColor(...BRANCO);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE CONFIABILIDADE', 105, 14, { align: 'center' });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Gestão de Manutenção — Indicadores e Análise de Custos', 105, 22, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(200, 230, 220);
      doc.text(`Período: ${periodoLabel}`, 14, 30);
      doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 196, 30, { align: 'right' });

      y = 45;

      // ---- SEÇÃO 1: KPI CARDS (3 colunas) ----
      const kpis = [
        { label: 'Custo Preventivas', valor: `R$ ${indicadores.custoPreventiva.toLocaleString('pt-BR', {minimumFractionDigits:2})}`, cor: VERDE },
        { label: 'Custo Corretivas', valor: `R$ ${indicadores.custoCorretiva.toLocaleString('pt-BR', {minimumFractionDigits:2})}`, cor: VERMELHO },
        { label: 'Custo Total Geral', valor: `R$ ${totalCustos.toLocaleString('pt-BR', {minimumFractionDigits:2})}`, cor: AZUL },
        { label: 'Nº de Falhas', valor: String(indicadores.numeroFalhas), cor: VERMELHO },
        { label: 'Tempo de Parada', valor: `${Number(indicadores.tempoParadaTotal).toFixed(1)} h`, cor: LARANJA },
        { label: 'Disponibilidade', valor: `${disponibilidade.toFixed(1)}%`, cor: VERDE },
      ];

      const cardW = 58, cardH = 20, cardGap = 8, cardX0 = 14;
      kpis.forEach((kpi, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = cardX0 + col * (cardW + cardGap);
        const cy = y + row * (cardH + 5);

        doc.setFillColor(...CINZA_CLARO);
        doc.roundedRect(x, cy, cardW, cardH, 3, 3, 'F');

        doc.setFillColor(...kpi.cor);
        doc.roundedRect(x, cy, 4, cardH, 2, 2, 'F');
        doc.rect(x + 2, cy, 2, cardH, 'F');

        doc.setTextColor(...CINZA);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(kpi.label.toUpperCase(), x + 8, cy + 7);

        doc.setTextColor(...PRETO);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(kpi.valor, x + 8, cy + 15);
      });

      y += 2 * (cardH + 5) + 8;

      // ---- SEÇÃO 2: INDICADORES RCM ----
      doc.setFillColor(...VERDE_ESCURO);
      doc.roundedRect(14, y, 182, 8, 2, 2, 'F');
      doc.setTextColor(...BRANCO);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('INDICADORES DE CONFIABILIDADE (RCM)', 18, y + 5.5);
      y += 11;

      const rcmData = [
        ['MTTR — Tempo Médio de Reparo', `${indicadores.mttr} h`, 'Eficiência da equipe na restauração pós-falha'],
        ['MTBF — Tempo Médio entre Falhas', `${indicadores.mtbf} h`, 'Mede a confiabilidade do equipamento'],
        ['MTTF — Tempo Médio até Falha', `${indicadores.mttf} h`, 'Referência para equipamentos não-reparáveis'],
        ['Tempo Total de Manutenção', `${Number(indicadores.tempoManutencaoTotal).toFixed(1)} h`, 'Soma de todos os tempos de intervenção'],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Indicador', 'Valor', 'Interpretação']],
        body: rcmData,
        theme: 'grid',
        headStyles: { fillColor: VERDE, textColor: BRANCO, fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: CINZA_CLARO },
        bodyStyles: { fontSize: 9, textColor: PRETO },
        columnStyles: {
          0: { cellWidth: 72, fontStyle: 'bold' },
          1: { cellWidth: 26, halign: 'center' },
          2: { cellWidth: 84 }
        },
        margin: { left: 14, right: 14 },
      });

      y = doc.lastAutoTable.finalY + 8;

      // ---- SEÇÃO 3: EQUIPAMENTOS CRÍTICOS ----
      if (indicadores.equipamentosFalhas.length > 0) {
        doc.setFillColor(...VERMELHO);
        doc.roundedRect(14, y, 182, 8, 2, 2, 'F');
        doc.setTextColor(...BRANCO);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('TOP EQUIPAMENTOS COM MAIS FALHAS', 18, y + 5.5);
        y += 11;

        const totalFalhas = indicadores.equipamentosFalhas.reduce((s, e) => s + e.falhas, 0);
        const equipData = indicadores.equipamentosFalhas.map((eq, i) => {
          const pct = ((eq.falhas / totalFalhas) * 100).toFixed(1);
          const nivel = eq.falhas >= 5 ? 'CRÍTICO' : eq.falhas >= 3 ? 'ALTO' : eq.falhas >= 2 ? 'MÉDIO' : 'BAIXO';
          return [String(i + 1), eq.nome, eq.tag, String(eq.falhas), `${pct}%`, nivel];
        });

        autoTable(doc, {
          startY: y,
          head: [['#', 'Equipamento', 'TAG', 'Falhas', '% Total', 'Nível']],
          body: equipData,
          theme: 'grid',
          headStyles: { fillColor: VERMELHO, textColor: BRANCO, fontStyle: 'bold', fontSize: 9 },
          alternateRowStyles: { fillColor: CINZA_CLARO },
          bodyStyles: { fontSize: 9, textColor: PRETO },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 75 },
            2: { cellWidth: 28 },
            3: { cellWidth: 16, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 23, halign: 'center' }
          },
          didDrawCell: (data) => {
            if (data.column.index === 5 && data.row.section === 'body') {
              const val = data.cell.raw;
              const cor = val === 'CRÍTICO' ? [163,45,45] : val === 'ALTO' ? [200,100,0] : val === 'MÉDIO' ? [180,140,0] : [30,130,70];
              doc.setTextColor(...cor);
              doc.setFontSize(8);
              doc.setFont('helvetica', 'bold');
              doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
              doc.setTextColor(...PRETO);
            }
          },
          margin: { left: 14, right: 14 },
        });

        y = doc.lastAutoTable.finalY + 8;
      }

      // ---- SEÇÃO 4: ANÁLISE FINANCEIRA ----
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(...AZUL);
      doc.roundedRect(14, y, 182, 8, 2, 2, 'F');
      doc.setTextColor(...BRANCO);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('ANÁLISE FINANCEIRA', 18, y + 5.5);
      y += 11;

      const relacaoPC = indicadores.custoPreventiva > 0
        ? (indicadores.custoCorretiva / indicadores.custoPreventiva) * 100
        : 0;

      const finData = [
        ['Custo Total Preventivas', `R$ ${indicadores.custoPreventiva.toLocaleString('pt-BR', {minimumFractionDigits:2})}`, 'Investimento em prevenção de falhas'],
        ['Custo Total Corretivas', `R$ ${indicadores.custoCorretiva.toLocaleString('pt-BR', {minimumFractionDigits:2})}`, 'Custo de falhas não planejadas'],
        ['Custo Total do Período', `R$ ${totalCustos.toLocaleString('pt-BR', {minimumFractionDigits:2})}`, 'Soma de todos os custos de manutenção'],
        ['Ticket Médio Corretivo', `R$ ${(indicadores.numeroFalhas > 0 ? indicadores.custoCorretiva / indicadores.numeroFalhas : 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}`, 'Custo médio por ocorrência corretiva'],
        ['Relação Corretiva/Preventiva', `${relacaoPC.toFixed(1)}%`, relacaoPC > 100 ? '⚠️ Alta reatividade — revisar plano preventivo' : '✅ Boa relação preventiva/corretiva'],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Indicador Financeiro', 'Valor', 'Observação']],
        body: finData,
        theme: 'grid',
        headStyles: { fillColor: AZUL, textColor: BRANCO, fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: CINZA_CLARO },
        bodyStyles: { fontSize: 9, textColor: PRETO },
        columnStyles: {
          0: { cellWidth: 72, fontStyle: 'bold' },
          1: { cellWidth: 36, halign: 'right' },
          2: { cellWidth: 74 }
        },
        margin: { left: 14, right: 14 },
      });

      y = doc.lastAutoTable.finalY + 8;

      // ---- SEÇÃO 5: OS DETALHADAS (nova página) ----
      const osFiltradas = filtrarPorPeriodo(os.filter(o => o.status === 'Concluída' && o.tipo_manutencao === 'CORRETIVA'));
      if (osFiltradas.length > 0) {
        doc.addPage();
        y = 14;

        doc.setFillColor(...VERDE_ESCURO);
        doc.rect(0, 0, 210, 12, 'F');
        doc.setTextColor(...BRANCO);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('OS CORRETIVAS CONCLUÍDAS — DETALHAMENTO', 105, 8, { align: 'center' });
        y = 18;

        const osData = osFiltradas
          .sort((a, b) => b.criado_em - a.criado_em)
          .slice(0, 50) // máx 50 registros para não explodir o PDF
          .map(o => [
            o.num || '-',
            (o.equipamento_nome || o.equipamento_tag || '-').substring(0, 30),
            `R$ ${(o.custo_total || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}`,
            `${o.tempo_parada || 0} h`,
            o.data_conclusao ? new Date(o.data_conclusao).toLocaleDateString('pt-BR') : '-',
          ]);

        autoTable(doc, {
          startY: y,
          head: [['Nº OS', 'Equipamento', 'Custo Total', 'T. Parada', 'Conclusão']],
          body: osData,
          theme: 'striped',
          headStyles: { fillColor: VERDE_ESCURO, textColor: BRANCO, fontStyle: 'bold', fontSize: 8.5 },
          alternateRowStyles: { fillColor: CINZA_CLARO },
          bodyStyles: { fontSize: 8.5, textColor: PRETO },
          columnStyles: {
            0: { cellWidth: 18, halign: 'center' },
            1: { cellWidth: 80 },
            2: { cellWidth: 32, halign: 'right' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 24, halign: 'center' },
          },
          margin: { left: 14, right: 14 },
        });

        if (osFiltradas.length > 50) {
          y = doc.lastAutoTable.finalY + 4;
          doc.setTextColor(...CINZA);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.text(`* Exibindo 50 de ${osFiltradas.length} registros. Para o detalhamento completo, utilize a exportação Excel.`, 14, y);
        }
      }

      // ---- RODAPÉ EM TODAS AS PÁGINAS ----
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(...CINZA_CLARO);
        doc.rect(0, 285, 210, 12, 'F');
        doc.setFillColor(...VERDE);
        doc.rect(0, 285, 210, 1, 'F');
        doc.setTextColor(...CINZA);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('CONFIDENCIAL — Uso interno. Documento gerado automaticamente pelo Sistema de Gestão de Manutenção.', 14, 291);
        doc.text(`Página ${i} de ${totalPages}`, 196, 291, { align: 'right' });
      }

      // Salvar
      const fileName = `relatorio_confiabilidade_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);
      addNotification('✅ PDF gerado', 'Relatório PDF exportado com sucesso!', NOTIF_TYPES.SUCCESS);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      addNotification('❌ Erro no PDF', 'Não foi possível gerar o arquivo PDF. Verifique se jsPDF está instalado.', NOTIF_TYPES.ERROR);
    }
  };

  // ==================== RENDER (com os botões de exportação) ====================
  return (
    <div>
      {/* Barra de ações com botões */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div className="card" style={{ flex: 1, marginBottom: 0, padding: '12px 20px' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Período</label>
              <select className="form-input" value={periodo} onChange={e => setPeriodo(e.target.value)}>
                <option value="diario">Hoje</option>
                <option value="mensal">Este mês</option>
                <option value="anual">Este ano</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            {periodo === 'custom' && (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Data inicial</label>
                  <input type="date" className="form-input" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Data final</label>
                  <input type="date" className="form-input" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={exportarDados} style={{ background: '#0f6e56', borderColor: '#0f6e56', whiteSpace: 'nowrap' }}>
            <i className="ti ti-file-spreadsheet"></i> Exportar Excel
          </button>
          <button className="btn btn-primary" onClick={exportarPDF} style={{ background: '#a32d2d', borderColor: '#a32d2d', whiteSpace: 'nowrap' }}>
            <i className="ti ti-file-type-pdf"></i> Exportar PDF
          </button>
        </div>
      </div>

      {/* Cards e gráficos (mesmo de antes) */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">💰 Custo Preventivas</div><div className="stat-val green">R$ {indicadores.custoPreventiva.toLocaleString('pt-BR')}</div></div>
        <div className="stat-card"><div className="stat-label">💸 Custo Corretivas</div><div className="stat-val red">R$ {indicadores.custoCorretiva.toLocaleString('pt-BR')}</div></div>
        <div className="stat-card"><div className="stat-label">⏱️ Tempo Parada Total</div><div className="stat-val blue">{indicadores.tempoParadaTotal.toFixed(1)} h</div></div>
        <div className="stat-card"><div className="stat-label">🛠️ Tempo Manutenção</div><div className="stat-val purple">{indicadores.tempoManutencaoTotal.toFixed(1)} h</div></div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">🔧 MTTR (médio reparo)</div><div className="stat-val">{indicadores.mttr} h</div></div>
        <div className="stat-card"><div className="stat-label">🔄 MTBF (entre falhas)</div><div className="stat-val">{indicadores.mtbf} h</div></div>
        <div className="stat-card"><div className="stat-label">⚙️ MTTF (até falha)</div><div className="stat-val">{indicadores.mttf} h</div></div>
        <div className="stat-card"><div className="stat-label">⚠️ Nº de Falhas</div><div className="stat-val">{indicadores.numeroFalhas}</div></div>
      </div>

      <div className="report-grid">
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>Custos mensais</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={indicadores.dadosMensais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
              <Legend />
              <Bar dataKey="preventiva" fill="#0f6e56" name="Preventiva" />
              <Bar dataKey="corretiva" fill="#a32d2d" name="Corretiva" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>Tempo de parada mensal (h)</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={indicadores.dadosMensais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="tempoParada" stroke="#f39c12" name="Parada (h)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>🏭 Equipamentos com mais falhas</div>
        {indicadores.equipamentosFalhas.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Nenhum dado de falha registrado</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {indicadores.equipamentosFalhas.map((eq, idx) => (
              <div key={eq.tag}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span><strong>{eq.nome}</strong> ({eq.tag})</span>
                  <span>{eq.falhas} falha(s)</span>
                </div>
                <div className="dept-bar-track">
                  <div className="dept-bar-fill" style={{ width: `${(eq.falhas / indicadores.equipamentosFalhas[0].falhas) * 100}%`, background: '#a32d2d' }}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}