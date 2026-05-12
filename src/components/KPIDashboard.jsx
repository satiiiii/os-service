// src/components/KPIDashboard.jsx
// Componente que calcula e exibe KPIs (Indicadores de Performance) para Gestores e Administradores.
// Utiliza apenas os dados de OS, sem dependências externas (RDP, IA, etc.).

import React, { useState, useEffect } from 'react';
import { getFilteredOS } from '../utils/helpers';

export default function KPIDashboard({ os, currentUser }) {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Permissão: apenas Admin e Gestor podem visualizar KPIs
  if (currentUser?.role !== 'Admin' && currentUser?.role !== 'Gestor') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
        <i className="ti ti-lock" style={{ fontSize: 40, color: '#d3d1c7', display: 'block', marginBottom: 12 }}></i>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#444', marginBottom: 6 }}>Acesso restrito</div>
        <div style={{ fontSize: 13, color: '#888' }}>KPIs estão disponíveis apenas para Gestores e Administradores.</div>
      </div>
    );
  }

  // Recálculo sempre que a lista de OS mudar
  useEffect(() => {
    calculateKPIs();
  }, [os]);

  const calculateKPIs = () => {
    // Aplica filtros de permissão (ex: solicitante vê apenas suas OS, etc.)
    const allOS = getFilteredOS(os, currentUser);
    const concluidas = allOS.filter(o => o.status === 'Concluída');
    const reabertas = allOS.filter(o => o.historico?.some(h => h.acao.includes('Reaberta')));
    const urgentes = allOS.filter(o => o.prio === 'Urgente');

    // MTTR - Tempo médio de resolução (em dias)
    let totalTempoResolucao = 0;
    concluidas.forEach(os => {
      if (os.dataConclusao && os.criadoEm) {
        const tempoDias = (os.dataConclusao - os.criadoEm) / (1000 * 60 * 60 * 24);
        totalTempoResolucao += tempoDias;
      }
    });
    const mttr = concluidas.length ? (totalTempoResolucao / concluidas.length).toFixed(1) : 0;

    // MTBF - Tempo médio entre falhas (com base nas OS, intervalo entre criações)
    const sortedByDate = [...allOS].sort((a, b) => a.criadoEm - b.criadoEm);
    let totalIntervalos = 0;
    let intervalosCount = 0;
    for (let i = 1; i < sortedByDate.length; i++) {
      const intervalo = (sortedByDate[i].criadoEm - sortedByDate[i-1].criadoEm) / (1000 * 60 * 60 * 24);
      if (intervalo > 0 && intervalo < 30) { // ignora intervalos muito longos
        totalIntervalos += intervalo;
        intervalosCount++;
      }
    }
    const mtbf = intervalosCount ? (totalIntervalos / intervalosCount).toFixed(1) : 0;

    // Taxa de retrabalho (OS que foram reabertas)
    const taxaRetrabalho = allOS.length ? ((reabertas.length / allOS.length) * 100).toFixed(1) : 0;

    // Eficiência por técnico (média de dias por OS concluída)
    const tecnicosMap = new Map();
    concluidas.forEach(os => {
      if (os.tecnico) {
        if (!tecnicosMap.has(os.tecnico)) {
          tecnicosMap.set(os.tecnico, { total: 0, diasTotal: 0 });
        }
        const tech = tecnicosMap.get(os.tecnico);
        tech.total++;
        if (os.dataConclusao && os.criadoEm) {
          tech.diasTotal += (os.dataConclusao - os.criadoEm) / (1000 * 60 * 60 * 24);
        }
      }
    });
    const eficienciaTecnicos = Array.from(tecnicosMap.entries()).map(([nome, data]) => ({
      nome: nome.split(' ')[0],
      total: data.total,
      mediaDias: data.diasTotal / data.total
    })).sort((a, b) => a.mediaDias - b.mediaDias); // menor tempo primeiro

    // Distribuição por prioridade
    const prioridadeDist = {
      Urgente: urgentes.length,
      Normal: allOS.filter(o => o.prio === 'Normal').length,
      Baixa: allOS.filter(o => o.prio === 'Baixa').length
    };

    // Distribuição por status (incluindo "Aguardando Aprovação" mesmo que não usado, mantido por compatibilidade)
    const statusDist = {
      Aberta: allOS.filter(o => o.status === 'Aberta').length,
      Andamento: allOS.filter(o => o.status === 'Em andamento').length,
      Concluida: concluidas.length,
      Recusada: allOS.filter(o => o.status === 'Recusada').length,
      Aguardando: allOS.filter(o => o.status === 'Aguardando Aprovação').length
    };

    setKpiData({
      mttr,
      mtbf,
      taxaRetrabalho,
      eficienciaTecnicos,
      prioridadeDist,
      statusDist,
      totalOS: allOS.length,
      urgentesPendentes: urgentes.filter(o => o.status !== 'Concluída').length
    });
    setLoading(false);
  };

  if (loading) return <div className="card" style={{ textAlign: 'center', padding: 40 }}>Carregando KPIs...</div>;

  return (
    <div>
      {/* Cards principais de MTTR, MTBF, retrabalho e urgentes pendentes */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">⏱️ MTTR</div>
          <div className="stat-val blue">{kpiData.mttr} <span style={{ fontSize: '12px' }}>dias</span></div>
          <div style={{ fontSize: '11px', color: '#666' }}>Tempo médio de resolução</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🔄 MTBF</div>
          <div className="stat-val amber">{kpiData.mtbf} <span style={{ fontSize: '12px' }}>dias</span></div>
          <div style={{ fontSize: '11px', color: '#666' }}>Tempo entre falhas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🔄 Retrabalho</div>
          <div className="stat-val red">{kpiData.taxaRetrabalho}%</div>
          <div style={{ fontSize: '11px', color: '#666' }}>OS que foram reabertas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🔥 Urgentes Pendentes</div>
          <div className="stat-val red">{kpiData.urgentesPendentes}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>Aguardando solução</div>
        </div>
      </div>

      {/* Performance dos técnicos (ranking) */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
          <i className="ti ti-trophy" style={{ marginRight: 6, color: '#185fa5' }}></i>
          Performance dos Técnicos (menor tempo = melhor)
        </div>
        {kpiData.eficienciaTecnicos.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>Nenhum dado de técnico disponível</div>
        ) : (
          <div>
            {kpiData.eficienciaTecnicos.map((tec, index) => (
              <div key={tec.nome} className="dept-bar">
                <div className="dept-bar-label">
                  <span>
                    {index === 0 && '🥇 '}
                    {index === 1 && '🥈 '}
                    {index === 2 && '🥉 '}
                    {tec.nome}
                  </span>
                  <span>{tec.mediaDias.toFixed(1)} dias (média)</span>
                </div>
                <div className="dept-bar-track">
                  <div className="dept-bar-fill" style={{ width: `${Math.min(100, (tec.mediaDias / 10) * 100)}%`, background: index === 0 ? '#0f6e56' : '#0c447c' }}></div>
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{tec.total} OS concluídas</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distribuições de Status e Prioridade */}
      <div className="report-grid">
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
            <i className="ti ti-chart-pie"></i> Distribuição por Status
          </div>
          {Object.entries(kpiData.statusDist).filter(([_, v]) => v > 0).map(([status, count]) => (
            <div key={status} className="dept-bar">
              <div className="dept-bar-label">
                <span>{status === 'Concluida' ? 'Concluídas' : status}</span>
                <span>{count} ({((count / kpiData.totalOS) * 100).toFixed(0)}%)</span>
              </div>
              <div className="dept-bar-track">
                <div className="dept-bar-fill" style={{ width: `${(count / kpiData.totalOS) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
            <i className="ti ti-alert-triangle"></i> Distribuição por Prioridade
          </div>
          {Object.entries(kpiData.prioridadeDist).map(([prio, count]) => (
            <div key={prio} className="dept-bar">
              <div className="dept-bar-label">
                <span style={{ color: prio === 'Urgente' ? '#a32d2d' : prio === 'Normal' ? '#854f0b' : '#5f5e5a' }}>{prio}</span>
                <span>{count}</span>
              </div>
              <div className="dept-bar-track">
                <div className="dept-bar-fill" style={{ 
                  width: `${(count / kpiData.totalOS) * 100}%`,
                  background: prio === 'Urgente' ? '#a32d2d' : prio === 'Normal' ? '#854f0b' : '#5f5e5a'
                }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo executivo com comentários automáticos */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
          <i className="ti ti-report"></i> Resumo Executivo
        </div>
        <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#444' }}>
          📊 Total de OS no sistema: <strong>{kpiData.totalOS}</strong><br />
          ⏱️ Tempo médio para resolver uma OS: <strong>{kpiData.mttr} dias</strong>
          {kpiData.mttr < 3 ? ' 🎉 Excelente!' : kpiData.mttr < 7 ? ' 👍 Bom' : ' ⚠️ Pode melhorar'}<br />
          🔄 Taxa de retrabalho: <strong>{kpiData.taxaRetrabalho}%</strong>
          {kpiData.taxaRetrabalho < 5 ? ' 🎉 Muito bom!' : kpiData.taxaRetrabalho < 15 ? ' 👍 Aceitável' : ' ⚠️ Atenção necessária'}<br />
          🔥 OS urgentes pendentes: <strong>{kpiData.urgentesPendentes}</strong>
          {kpiData.urgentesPendentes === 0 ? ' ✅ Nenhuma pendência!' : kpiData.urgentesPendentes < 5 ? ' ⚠️ Poucas pendências' : ' 🚨 Muitas pendências!'}
        </div>
      </div>
    </div>
  );
}