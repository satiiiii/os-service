// src/components/Relatorios.js
import React, { useState } from 'react';
import { DEPTS, PRIORIDADES } from '../data/constants';
import { canViewRelatorios, getFilteredOS, canExportData } from '../utils/helpers';
import ExportButton from './ExportButton';
import { exportToAdvancedExcel } from '../utils/excelExportUtils';
import { exportarPDF, exportarXLSX } from '../utils/exportUtils';
import { addNotification, NOTIF_TYPES } from '../utils/notifications';
import RelatorioPeriodo from './RelatorioPeriodo';
import { getCurrentUser } from '../utils/auth';

export default function Relatorios({ os, currentUser }) {
  const [tab, setTab] = useState('resumo');
  const loggedUser = getCurrentUser();
  const canExport = canExportData(loggedUser);

  if (!canViewRelatorios(currentUser)) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
        <i className="ti ti-lock" style={{ fontSize: 40, color: '#d3d1c7', display: 'block', marginBottom: 12 }}></i>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#444', marginBottom: 6 }}>Acesso restrito</div>
        <div style={{ fontSize: 13, color: '#888' }}>Relatórios estão disponíveis apenas para Gestores e Administradores.</div>
      </div>
    );
  }

  const data = getFilteredOS(os, currentUser);
  const total = data.length;
  const concluidas = data.filter(o => o.status === 'Concluída').length;
  const recusadas = data.filter(o => o.status === 'Recusada').length;
  const abertas = data.filter(o => o.status === 'Aberta').length;
  const andamento = data.filter(o => o.status === 'Em andamento').length;
  const txConclusao = total ? Math.round((concluidas / total) * 100) : 0;
  const txRecusa = total ? Math.round((recusadas / total) * 100) : 0;

  const porDept = DEPTS.map(d => ({
    dept: d,
    total: data.filter(o => o.dept === d).length,
    concluidas: data.filter(o => o.dept === d && o.status === 'Concluída').length,
    andamento: data.filter(o => o.dept === d && o.status === 'Em andamento').length,
    abertas: data.filter(o => o.dept === d && o.status === 'Aberta').length,
    recusadas: data.filter(o => o.dept === d && o.status === 'Recusada').length,
  })).filter(x => x.total > 0);
  const maxDept = Math.max(1, ...porDept.map(x => x.total));

  const porPrio = PRIORIDADES.map(p => ({
    prio: p,
    count: data.filter(o => o.prio === p).length,
  }));
  const prioColors = { Urgente: '#a32d2d', Normal: '#854f0b', Baixa: '#5f5e5a' };

  const stats = {
    total,
    abertas,
    andamento,
    concluidas,
    recusadas,
    txConclusao,
    txRecusa,
    porDept: porDept.map(d => ({ dept: d.dept, total: d.total })),
    porPrio
  };

  const exportOSDoMes = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const osDoMes = data.filter(os => os.criado_em >= startOfMonth.getTime());
    if (osDoMes.length === 0) {
      addNotification('Nenhuma OS encontrada', 'Não há OS criadas neste mês.', NOTIF_TYPES.WARNING);
      return;
    }
    const statsMes = {
      total: osDoMes.length,
      abertas: osDoMes.filter(o => o.status === 'Aberta').length,
      andamento: osDoMes.filter(o => o.status === 'Em andamento').length,
      concluidas: osDoMes.filter(o => o.status === 'Concluída').length,
      recusadas: osDoMes.filter(o => o.status === 'Recusada').length,
      txConclusao: osDoMes.length ? Math.round((osDoMes.filter(o => o.status === 'Concluída').length / osDoMes.length) * 100) : 0,
      txRecusa: osDoMes.length ? Math.round((osDoMes.filter(o => o.status === 'Recusada').length / osDoMes.length) * 100) : 0,
      porDept: [...new Set(osDoMes.map(o => o.dept))].map(d => ({ dept: d, total: osDoMes.filter(o => o.dept === d).length })),
      porPrio: ['Urgente', 'Normal', 'Baixa'].map(p => ({ prio: p, count: osDoMes.filter(o => o.prio === p).length }))
    };
    await exportToAdvancedExcel(osDoMes, statsMes, 'os_mes_atual');
    addNotification('Exportado!', `${osDoMes.length} OS do mês atual exportadas com sucesso!`, NOTIF_TYPES.SUCCESS);
  };

  const exportOSUrgentes = async () => {
    const urgentes = data.filter(os => os.prio === 'Urgente');
    if (urgentes.length === 0) {
      addNotification('Nenhuma OS urgente', 'Não há OS com prioridade Urgente no momento.', NOTIF_TYPES.WARNING);
      return;
    }
    const statsUrgentes = {
      total: urgentes.length,
      abertas: urgentes.filter(o => o.status === 'Aberta').length,
      andamento: urgentes.filter(o => o.status === 'Em andamento').length,
      concluidas: urgentes.filter(o => o.status === 'Concluída').length,
      recusadas: urgentes.filter(o => o.status === 'Recusada').length,
      txConclusao: urgentes.length ? Math.round((urgentes.filter(o => o.status === 'Concluída').length / urgentes.length) * 100) : 0,
      txRecusa: urgentes.length ? Math.round((urgentes.filter(o => o.status === 'Recusada').length / urgentes.length) * 100) : 0,
      porDept: [...new Set(urgentes.map(o => o.dept))].map(d => ({ dept: d, total: urgentes.filter(o => o.dept === d).length })),
      porPrio: ['Urgente', 'Normal', 'Baixa'].map(p => ({ prio: p, count: urgentes.filter(o => o.prio === p).length }))
    };
    await exportToAdvancedExcel(urgentes, statsUrgentes, 'os_urgentes');
    addNotification('Exportado!', `${urgentes.length} OS urgentes exportadas com sucesso!`, NOTIF_TYPES.SUCCESS);
  };

  const exportMinhasOS = async () => {
    const minhasOS = data.filter(os => os.tecnico === currentUser?.nome);
    if (minhasOS.length === 0) {
      addNotification('Nenhuma OS atribuída', 'Não há OS atribuídas a você no momento.', NOTIF_TYPES.WARNING);
      return;
    }
    const statsMinhas = {
      total: minhasOS.length,
      abertas: minhasOS.filter(o => o.status === 'Aberta').length,
      andamento: minhasOS.filter(o => o.status === 'Em andamento').length,
      concluidas: minhasOS.filter(o => o.status === 'Concluída').length,
      recusadas: minhasOS.filter(o => o.status === 'Recusada').length,
      txConclusao: minhasOS.length ? Math.round((minhasOS.filter(o => o.status === 'Concluída').length / minhasOS.length) * 100) : 0,
      txRecusa: minhasOS.length ? Math.round((minhasOS.filter(o => o.status === 'Recusada').length / minhasOS.length) * 100) : 0,
      porDept: [...new Set(minhasOS.map(o => o.dept))].map(d => ({ dept: d, total: minhasOS.filter(o => o.dept === d).length })),
      porPrio: ['Urgente', 'Normal', 'Baixa'].map(p => ({ prio: p, count: minhasOS.filter(o => o.prio === p).length }))
    };
    await exportToAdvancedExcel(minhasOS, statsMinhas, 'minhas_os');
    addNotification('Exportado!', `${minhasOS.length} OS atribuídas a você exportadas com sucesso!`, NOTIF_TYPES.SUCCESS);
  };

  const exportOSConcluidas = async () => {
    const concluidasList = data.filter(os => os.status === 'Concluída');
    if (concluidasList.length === 0) {
      addNotification('Nenhuma OS concluída', 'Não há OS concluídas no momento.', NOTIF_TYPES.WARNING);
      return;
    }
    const statsConcluidas = {
      total: concluidasList.length,
      abertas: 0,
      andamento: 0,
      concluidas: concluidasList.length,
      recusadas: 0,
      txConclusao: 100,
      txRecusa: 0,
      porDept: [...new Set(concluidasList.map(o => o.dept))].map(d => ({ dept: d, total: concluidasList.filter(o => o.dept === d).length })),
      porPrio: ['Urgente', 'Normal', 'Baixa'].map(p => ({ prio: p, count: concluidasList.filter(o => o.prio === p).length }))
    };
    await exportToAdvancedExcel(concluidasList, statsConcluidas, 'os_concluidas');
    addNotification('Exportado!', `${concluidasList.length} OS concluídas exportadas com sucesso!`, NOTIF_TYPES.SUCCESS);
  };

  const exportPDFSimples = () => {
    if (data.length === 0) {
      addNotification('Nenhum dado', 'Não há OS para exportar.', NOTIF_TYPES.WARNING);
      return;
    }
    exportToPDF(data, `Relatório OS - ${new Date().toLocaleDateString('pt-BR')}`);
    addNotification('PDF gerado!', `Relatório com ${data.length} OS gerado com sucesso!`, NOTIF_TYPES.SUCCESS);
  };

  const exportJSONBackup = () => {
    if (data.length === 0) {
      addNotification('Nenhum dado', 'Não há OS para fazer backup.', NOTIF_TYPES.WARNING);
      return;
    }
    exportToJSON(data, `backup_os_${new Date().toISOString().slice(0, 10)}`);
    addNotification('Backup criado!', `${data.length} OS salvas em formato JSON!`, NOTIF_TYPES.SUCCESS);
  };

  return (
    <div>
      {canExport && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={exportOSDoMes} style={{ background: '#0c447c', color: 'white', borderColor: '#0c447c' }}>
            <i className="ti ti-calendar-month"></i> OS do Mês
          </button>
          <button className="btn btn-sm" onClick={exportOSUrgentes} style={{ background: '#a32d2d', color: 'white', borderColor: '#a32d2d' }}>
            <i className="ti ti-alert-triangle"></i> OS Urgentes
          </button>
          <button className="btn btn-sm" onClick={exportMinhasOS} style={{ background: '#0f6e56', color: 'white', borderColor: '#0f6e56' }}>
            <i className="ti ti-user"></i> Minhas OS
          </button>
          <button className="btn btn-sm" onClick={exportOSConcluidas} style={{ background: '#854f0b', color: 'white', borderColor: '#854f0b' }}>
            <i className="ti ti-check"></i> OS Concluídas
          </button>
          <button className="btn btn-sm" onClick={exportPDFSimples} style={{ background: '#e74c3c', color: 'white', borderColor: '#e74c3c' }}>
            <i className="ti ti-file-pdf"></i> PDF Rápido
          </button>
          <button className="btn btn-sm" onClick={exportJSONBackup} style={{ background: '#f39c12', color: 'white', borderColor: '#f39c12' }}>
            <i className="ti ti-database"></i> Backup JSON
          </button>
        </div>
      )}

      {canExport && (
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <ExportButton osList={data} variant="primary" />
        </div>
      )}

      <RelatorioPeriodo os={data} currentUser={currentUser} />

      <div className="tabs">
        <button className={`tab ${tab === 'resumo' ? 'active' : ''}`} onClick={() => setTab('resumo')}>Resumo Geral</button>
        <button className={`tab ${tab === 'dept' ? 'active' : ''}`} onClick={() => setTab('dept')}>Por Departamento</button>
        <button className={`tab ${tab === 'prio' ? 'active' : ''}`} onClick={() => setTab('prio')}>Por Prioridade</button>
      </div>

      {tab === 'resumo' && (
        <div>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="stat-card"><div className="stat-label">Taxa de conclusão</div><div className="stat-val green">{txConclusao}%</div></div>
            <div className="stat-card"><div className="stat-label">Taxa de recusa</div><div className="stat-val red">{txRecusa}%</div></div>
            <div className="stat-card"><div className="stat-label">Total de OS</div><div className="stat-val blue">{total}</div></div>
          </div>
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Distribuição de Status</div>
            {[
              { label: 'Abertas', val: abertas, color: '#0c447c' },
              { label: 'Em andamento', val: andamento, color: '#854f0b' },
              { label: 'Concluídas', val: concluidas, color: '#0f6e56' },
              { label: 'Recusadas', val: recusadas, color: '#a32d2d' },
            ].map(item => (
              <div key={item.label} className="dept-bar">
                <div className="dept-bar-label"><span>{item.label}</span><span>{item.val} ({total ? Math.round((item.val / total) * 100) : 0}%)</span></div>
                <div className="dept-bar-track"><div className="dept-bar-fill" style={{ width: total ? (item.val / total) * 100 + '%' : '0%', background: item.color }}></div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'dept' && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>OS por Departamento</div>
          {porDept.length === 0 ? <div style={{ fontSize: 13, color: '#888' }}>Sem dados de departamentos</div> : porDept.map(d => (
            <div key={d.dept} style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #f0f0ea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                <span>{d.dept}</span><span>{d.total} OS</span>
              </div>
              <div className="dept-bar-track" style={{ marginBottom: 6 }}><div className="dept-bar-fill" style={{ width: (d.total / maxDept) * 100 + '%' }}></div></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge badge-aberta">{d.abertas} abertas</span>
                <span className="badge badge-andamento">{d.andamento} andamento</span>
                <span className="badge badge-concluida">{d.concluidas} concluídas</span>
                {d.recusadas > 0 && <span className="badge badge-recusada">{d.recusadas} recusadas</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'prio' && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>OS por Prioridade</div>
          {porPrio.map(p => {
            const pct = total ? Math.round((p.count / total) * 100) : 0;
            return (
              <div key={p.prio} className="dept-bar">
                <div className="dept-bar-label"><span style={{ color: prioColors[p.prio] }}>{p.prio}</span><span>{p.count} OS ({pct}%)</span></div>
                <div className="dept-bar-track"><div className="dept-bar-fill" style={{ width: pct + '%', background: prioColors[p.prio] }}></div></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}