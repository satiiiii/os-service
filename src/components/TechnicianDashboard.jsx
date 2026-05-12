// src/components/TechnicianDashboard.jsx
// Componente que exibe a performance dos técnicos com base nas OS.
// Disponível apenas para Admin e Gestor.
// Mostra tabela com indicadores, gráfico de OS por mês e distribuição por prioridade.

import React, { useState, useEffect } from 'react';
import { getFilteredOS } from '../utils/helpers';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function TechnicianDashboard({ os, currentUser }) {
  const [techData, setTechData] = useState([]);
  const [techDetails, setTechDetails] = useState(null);

  // Apenas Admin e Gestor podem ver
  if (currentUser?.role !== 'Admin' && currentUser?.role !== 'Gestor') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
        <i className="ti ti-lock" style={{ fontSize: 40, color: '#d3d1c7', display: 'block', marginBottom: 12 }}></i>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#444', marginBottom: 6 }}>Acesso restrito</div>
        <div style={{ fontSize: 13, color: '#888' }}>
          Dashboard de Técnicos está disponível apenas para Gestores e Administradores.
        </div>
      </div>
    );
  }

  // Aplica permissões de visibilidade (solicitante vê apenas suas OS, etc.)
  const userOS = getFilteredOS(os, currentUser);

  useEffect(() => {
    analyzeTechnicians();
  }, [os]);

  const analyzeTechnicians = () => {
    const techMap = new Map();
    
    userOS.forEach(os => {
      if (os.tecnico) {
        if (!techMap.has(os.tecnico)) {
          techMap.set(os.tecnico, {
            nome: os.tecnico,
            total: 0,
            concluidas: 0,
            emAndamento: 0,
            abertas: 0,
            recusadas: 0,
            tempoTotal: 0,
            tempoCount: 0,
            urgentes: 0,
            urgentesConcluidas: 0,
            osPorMes: {},
            prioridades: { Urgente: 0, Normal: 0, Baixa: 0 }
          });
        }
        
        const tech = techMap.get(os.tecnico);
        tech.total++;
        
        if (os.status === 'Concluída') {
          tech.concluidas++;
          // Usa os nomes corretos do Supabase: criado_em e data_conclusao
          if (os.data_conclusao && os.criado_em) {
            const tempoDias = (os.data_conclusao - os.criado_em) / (1000 * 60 * 60 * 24);
            tech.tempoTotal += tempoDias;
            tech.tempoCount++;
          }
        } else if (os.status === 'Em andamento') {
          tech.emAndamento++;
        } else if (os.status === 'Aberta') {
          tech.abertas++;
        } else if (os.status === 'Recusada') {
          tech.recusadas++;
        }
        
        if (os.prio === 'Urgente') {
          tech.urgentes++;
          if (os.status === 'Concluída') tech.urgentesConcluidas++;
        }
        
        tech.prioridades[os.prio || 'Normal']++;
        
        // Usa criado_em (timestamp) e obtém o mês
        const month = new Date(os.criado_em).toLocaleString('pt-BR', { month: 'short' });
        tech.osPorMes[month] = (tech.osPorMes[month] || 0) + 1;
      }
    });
    
    const techArray = Array.from(techMap.values()).map(tech => ({
      ...tech,
      taxaConclusao: tech.total ? ((tech.concluidas / tech.total) * 100).toFixed(1) : 0,
      tempoMedioDias: tech.tempoCount ? (tech.tempoTotal / tech.tempoCount).toFixed(1) : 0,
      taxaUrgente: tech.urgentes ? ((tech.urgentesConcluidas / tech.urgentes) * 100).toFixed(1) : 0
    }));
    
    // Ordena por maior número de OS concluídas
    techArray.sort((a, b) => b.concluidas - a.concluidas);
    setTechData(techArray);
  };

  const showTechnicianDetails = (tech) => {
    setTechDetails(tech);
  };

  const getPerformanceColor = (taxa) => {
    if (taxa >= 80) return '#0f6e56';
    if (taxa >= 60) return '#2b7bc2';
    if (taxa >= 40) return '#854f0b';
    return '#a32d2d';
  };

  const getMonthlyData = () => {
    if (!techDetails) return [];
    return Object.entries(techDetails.osPorMes).map(([mes, total]) => ({ mes, total }));
  };

  return (
    <div className="card">
      <div style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-user-check" style={{ color: '#0c447c', fontSize: 20 }}></i>
        📊 Performance dos Técnicos
      </div>

      {/* Tabela de técnicos */}
      <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e5e0' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Técnico</th>
              <th style={{ textAlign: 'center', padding: '12px 8px' }}>Total OS</th>
              <th style={{ textAlign: 'center', padding: '12px 8px' }}>Concluídas</th>
              <th style={{ textAlign: 'center', padding: '12px 8px' }}>Taxa</th>
              <th style={{ textAlign: 'center', padding: '12px 8px' }}>Tempo Médio</th>
              <th style={{ textAlign: 'center', padding: '12px 8px' }}></th>
             </tr>
          </thead>
          <tbody>
            {techData.map(tech => (
              <tr key={tech.nome} style={{ borderBottom: '1px solid #f0f0ea' }}>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>{tech.nome}</td>
                <td style={{ textAlign: 'center', padding: '12px 8px' }}>{tech.total}</td>
                <td style={{ textAlign: 'center', padding: '12px 8px', color: '#0f6e56' }}>{tech.concluidas}</td>
                <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                  <span style={{ 
                    background: getPerformanceColor(tech.taxaConclusao),
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px'
                  }}>
                    {tech.taxaConclusao}%
                  </span>
                </td>
                <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                  {tech.tempoMedioDias > 0 ? `${tech.tempoMedioDias} dias` : '-'}
                </td>
                <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                  <button className="btn btn-sm" onClick={() => showTechnicianDetails(tech)} style={{ padding: '4px 8px' }}>
                    <i className="ti ti-chart-bar"></i> Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detalhes do técnico selecionado */}
      {techDetails && (
        <div style={{
          marginTop: 20,
          padding: 16,
          background: '#f0f0ea',
          borderRadius: 8,
          borderLeft: `4px solid ${getPerformanceColor(techDetails.taxaConclusao)}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>📈 Detalhes: {techDetails.nome}</div>
            <button className="btn btn-sm" onClick={() => setTechDetails(null)}>
              <i className="ti ti-x"></i> Fechar
            </button>
          </div>

          {/* Cards de métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'white', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#666' }}>Taxa de Conclusão</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: getPerformanceColor(techDetails.taxaConclusao) }}>
                {techDetails.taxaConclusao}%
              </div>
            </div>
            <div style={{ background: 'white', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#666' }}>Tempo Médio por OS</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#0c447c' }}>
                {techDetails.tempoMedioDias > 0 ? `${techDetails.tempoMedioDias} dias` : '-'}
              </div>
            </div>
            <div style={{ background: 'white', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#666' }}>OS Urgentes</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#a32d2d' }}>{techDetails.urgentes}</div>
            </div>
            <div style={{ background: 'white', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#666' }}>Em Andamento</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#854f0b' }}>{techDetails.emAndamento}</div>
            </div>
          </div>

          {/* Gráfico de OS por mês */}
          {getMonthlyData().length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 12 }}>OS por Mês</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={getMonthlyData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#0c447c" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distribuição por prioridade */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 12 }}>Distribuição por Prioridade</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {Object.entries(techDetails.prioridades).map(([prio, count]) => (
                <div key={prio} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: prio === 'Urgente' ? '#a32d2d' : prio === 'Normal' ? '#854f0b' : '#5f5e5a' }}></div>
                  <span style={{ fontSize: 13 }}>{prio}: {count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}