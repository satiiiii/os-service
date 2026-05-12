// src/components/RelatorioPeriodo.jsx
// Componente que permite selecionar um período (hoje, última semana, mês ou personalizado)
// e exportar as OS desse período para CSV ou PDF.
// Disponível apenas para Admin e Gestor.

import React, { useState } from 'react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { addNotification, NOTIF_TYPES } from '../utils/notifications';

export default function RelatorioPeriodo({ os, currentUser }) {
  const [periodo, setPeriodo] = useState('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(false);

  // Permissão: apenas Admin e Gestor
  if (currentUser?.role !== 'Admin' && currentUser?.role !== 'Gestor') {
    return null;
  }

  // Filtra as OS de acordo com o período escolhido
  const filtrarPorPeriodo = () => {
    let inicio, fim;
    const agora = new Date(); // data atual (não será modificada)

    if (periodo === 'hoje') {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      fim.setHours(23, 59, 59, 999);
    } 
    else if (periodo === 'semana') {
      inicio = new Date(agora);
      inicio.setDate(agora.getDate() - 7);
      inicio.setHours(0, 0, 0, 0);
      fim = agora;
    } 
    else if (periodo === 'mes') {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
      fim.setHours(23, 59, 59, 999);
    } 
    else if (periodo === 'custom' && dataInicio && dataFim) {
      inicio = new Date(dataInicio);
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
    } 
    else {
      return os; // sem filtro (não deveria ocorrer)
    }
    
    // Filtra OS cujo criadoEm esteja entre início e fim
    return os.filter(o => o.criadoEm >= inicio.getTime() && o.criadoEm <= fim.getTime());
  };

  const handleExport = async (tipo) => {
    setLoading(true);
    const dadosFiltrados = filtrarPorPeriodo();
    
    if (dadosFiltrados.length === 0) {
      addNotification('Nenhum dado', 'Não há OS no período selecionado.', NOTIF_TYPES.WARNING);
      setLoading(false);
      return;
    }
    
    const nomePeriodo = periodo === 'custom' ? `${dataInicio}_a_${dataFim}` : periodo;
    
    if (tipo === 'csv') {
      exportToCSV(dadosFiltrados, `relatorio_${nomePeriodo}`);
    } else if (tipo === 'pdf') {
      exportToPDF(dadosFiltrados, `Relatório OS - ${nomePeriodo}`);
    }
    
    addNotification('Relatório gerado', `${dadosFiltrados.length} OS exportadas.`, NOTIF_TYPES.SUCCESS);
    setLoading(false);
  };

  const totalFiltrado = filtrarPorPeriodo().length;

  return (
    <div className="card">
      <div style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-calendar" style={{ color: '#0c447c' }}></i>
        📅 Relatório por Período
      </div>
      
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ minWidth: '120px' }}>
          <label className="form-label">Período</label>
          <select className="form-input" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            <option value="hoje">Hoje</option>
            <option value="semana">Últimos 7 dias</option>
            <option value="mes">Este mês</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
        
        {periodo === 'custom' && (
          <>
            <div className="form-group">
              <label className="form-label">Data inicial</label>
              <input type="date" className="form-input" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data final</label>
              <input type="date" className="form-input" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </>
        )}
        
        <div className="form-group">
          <label className="form-label">Total encontrado</label>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0c447c' }}>{totalFiltrado}</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary" onClick={() => handleExport('csv')} disabled={loading}>
          <i className="ti ti-file-spreadsheet"></i> Exportar CSV
        </button>
        <button className="btn btn-primary" onClick={() => handleExport('pdf')} disabled={loading} style={{ background: '#a32d2d' }}>
          <i className="ti ti-file-pdf"></i> Exportar PDF
        </button>
      </div>
    </div>
  );
}