// src/components/Dashboard.js
import React from 'react';
import { DEPTS } from '../data/constants';
import { getBadgeClass, timeAgo, getFilteredOS, getUserStats } from '../utils/helpers';
import { exportDashboardToExcel } from '../utils/dashboardExportUtils';
import { addNotification, NOTIF_TYPES } from '../utils/notifications';
import ProblemRanking from './ProblemRanking';
import TimeByDept from './TimeByDept';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function Dashboard({ os, currentUser }) {
  const userOS = getFilteredOS(os, currentUser);
  const stats = getUserStats(os, currentUser);
  const { total, abertas, andamento, concluidas, recusadas } = stats;

  // ========== TEMPO MÉDIO DE RESPOSTA (criação → aceitação) ==========
  const getTempoRespostaMedio = () => {
    const osAceitas = userOS.filter(o => o.historico && o.historico.some(h => h.acao && h.acao.includes('Aceita')));
    if (osAceitas.length === 0) return 0;

    let totalHoras = 0;
    osAceitas.forEach(os => {
      const aceite = os.historico.find(h => h.acao && h.acao.includes('Aceita'));
      if (aceite && os.criadoEm) {
        const horas = (aceite.ts - os.criadoEm) / (1000 * 60 * 60);
        totalHoras += horas;
      }
    });
    return (totalHoras / osAceitas.length).toFixed(1);
  };
  const tempoRespostaMedio = getTempoRespostaMedio();

  // ========== DADOS PARA GRÁFICOS ==========
  // 1. OS por departamento (top 6)
  const byDept = DEPTS.map((d) => ({
    dept: d,
    count: userOS.filter((o) => o.dept === d).length,
  }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const deptColors = ['#0c447c', '#185fa5', '#2b7bc2', '#4797db', '#6db3f0', '#93cff5'];

  // 2. Distribuição por status (pizza)
  const statusData = [
    { name: 'Abertas', value: abertas, color: '#0c447c' },
    { name: 'Em andamento', value: andamento, color: '#854f0b' },
    { name: 'Concluídas', value: concluidas, color: '#0f6e56' },
    { name: 'Recusadas', value: recusadas, color: '#a32d2d' },
  ].filter(s => s.value > 0);

  // 3. Tendência mensal (últimos 6 meses)
  const getMonthlyData = () => {
    const months = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('pt-BR', { month: 'short' });
      months[monthKey] = { month: monthKey, criadas: 0, concluidas: 0 };
    }
    userOS.forEach(os => {
      const createdDate = new Date(os.criadoEm);
      const monthKey = createdDate.toLocaleString('pt-BR', { month: 'short' });
      if (months[monthKey]) {
        months[monthKey].criadas++;
        if (os.status === 'Concluída' && os.dataConclusao) months[monthKey].concluidas++;
      }
    });
    return Object.values(months);
  };
  const monthlyData = getMonthlyData();

  // 4. OS por turno
  const getTurnoData = () => {
    const turnosMap = {
      1: { name: '1º Turno', count: 0, cor: '#0c447c' },
      2: { name: '2º Turno', count: 0, cor: '#854f0b' },
      3: { name: '3º Turno', count: 0, cor: '#5f5e5a' }
    };
    userOS.forEach(os => {
      if (os.turno === 1) turnosMap[1].count++;
      else if (os.turno === 2) turnosMap[2].count++;
      else if (os.turno === 3) turnosMap[3].count++;
    });
    return Object.values(turnosMap);
  };
  const turnoData = getTurnoData();

  // 5. Top 5 equipamentos com mais OS
  const getTopEquipamentos = () => {
    const equipMap = new Map();
    userOS.forEach(os => {
      if (os.equipamentoTag && os.equipamentoNome) {
        const key = `${os.equipamentoTag}|${os.equipamentoNome}`;
        if (!equipMap.has(key)) equipMap.set(key, { tag: os.equipamentoTag, nome: os.equipamentoNome, count: 0 });
        equipMap.get(key).count++;
      }
    });
    const equipArray = Array.from(equipMap.values()).sort((a, b) => b.count - a.count);
    return equipArray.slice(0, 5).map(eq => ({
      nome: eq.nome.length > 25 ? eq.nome.substring(0, 22) + '...' : eq.nome,
      tag: eq.tag,
      count: eq.count,
      label: `${eq.nome.substring(0, 20)} (${eq.tag})`
    }));
  };
  const topEquipamentos = getTopEquipamentos();
  const equipamentoColors = ['#a32d2d', '#854f0b', '#0c447c', '#0f6e56', '#5f5e5a'];

  // 6. OS por situação inicial
  const getSituacaoData = () => {
    const situacaoMap = new Map();
    userOS.forEach(os => {
      if (os.situacao) situacaoMap.set(os.situacao, (situacaoMap.get(os.situacao) || 0) + 1);
    });
    const coresMap = {
      'Máquina Parada por Quebra': '#a32d2d',
      'Trabalho Deficiente': '#854f0b',
      'Trabalhando': '#0f6e56',
      'Liberada p/ Manutenção': '#0c447c'
    };
    return Array.from(situacaoMap.entries()).map(([nome, valor]) => ({
      name: nome,
      value: valor,
      color: coresMap[nome] || '#185fa5'
    }));
  };
  const situacaoData = getSituacaoData();

  // 7. OS por hora do dia
  const getOSPorHora = () => {
    const horas = Array(24).fill(0);
    userOS.forEach(os => {
      const hora = new Date(os.criadoEm).getHours();
      horas[hora]++;
    });
    return horas.map((count, hora) => ({ hora: `${hora}:00`, count }));
  };
  const osPorHora = getOSPorHora();

  // ========== MENSAGEM DE BOAS-VINDAS ==========
  const getWelcomeMessage = () => {
    if (currentUser?.role === 'Solicitante') return `Bem-vindo, ${currentUser.nome}! Aqui estão suas OS.`;
    if (currentUser?.role === 'Técnico') return `Painel do Técnico - Todas as OS disponíveis para atendimento.`;
    return `Visão geral do sistema - ${total} OS no total.`;
  };

  // ========== EXPORTAÇÃO DO DASHBOARD ==========
  const handleExportDashboard = async () => {
    const dashboardData = {
      total,
      abertas,
      andamento,
      concluidas,
      recusadas,
      txConclusao: total ? Math.round((concluidas / total) * 100) : 0,
      txRecusa: total ? Math.round((recusadas / total) * 100) : 0,
      turnoData,
      situacaoData,
      topEquipamentos,
      byDept,
      monthlyData,
      listaOS: userOS
    };
    try {
      await exportDashboardToExcel(dashboardData, 'dashboard_os');
      addNotification('Dashboard exportado!', 'Os dados foram exportados com sucesso para Excel.', NOTIF_TYPES.SUCCESS);
    } catch (error) {
      addNotification('Erro na exportação', 'Ocorreu um erro ao exportar os dados.', NOTIF_TYPES.ERROR);
    }
  };

  // ========== Tooltip personalizado para gráficos ==========
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          padding: '10px',
          border: '1px solid #e5e5e0',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
          <p style={{ margin: 0, color: payload[0].color }}>
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  const turno1Count = userOS.filter(o => o.turno === 1).length;
  const turno2Count = userOS.filter(o => o.turno === 2).length;
  const turno3Count = userOS.filter(o => o.turno === 3).length;

  return (
    <div>
      {/* Cabeçalho com mensagem de boas-vindas e botão de exportar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        background: '#f0f0ea',
        padding: '12px 16px',
        borderRadius: '10px'
      }}>
        <div style={{ fontSize: '14px', color: '#333' }}>
          <i className="ti ti-user-check" style={{ marginRight: 8, color: '#0c447c' }}></i>
          {getWelcomeMessage()}
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleExportDashboard}
          style={{ background: '#0f6e56', borderColor: '#0f6e56' }}
        >
          <i className="ti ti-file-spreadsheet"></i> Exportar Dashboard
        </button>
      </div>

      {/* Cards de estatísticas principais */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total de OS</div><div className="stat-val blue">{total}</div></div>
        <div className="stat-card"><div className="stat-label">Abertas</div><div className="stat-val blue">{abertas}</div></div>
        <div className="stat-card"><div className="stat-label">Em andamento</div><div className="stat-val amber">{andamento}</div></div>
        <div className="stat-card"><div className="stat-label">Concluídas</div><div className="stat-val green">{concluidas}</div></div>
        <div className="stat-card"><div className="stat-label">Recusadas</div><div className="stat-val red">{recusadas}</div></div>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <div className="stat-label">⏱️ Tempo Médio de Resposta</div>
          <div className="stat-val purple">{tempoRespostaMedio} <span style={{ fontSize: '14px' }}>horas</span></div>
          <div style={{ fontSize: '11px', color: '#666' }}>Tempo entre criação e aceitação</div>
        </div>
      </div>

      {/* Cartões por turno */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <div className="stat-label">🌅 1º Turno</div><div className="stat-val blue">{turno1Count}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>{total ? Math.round((turno1Count / total) * 100) : 0}% das OS</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <div className="stat-label">🌞 2º Turno</div><div className="stat-val amber">{turno2Count}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>{total ? Math.round((turno2Count / total) * 100) : 0}% das OS</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <div className="stat-label">🌙 3º Turno</div><div className="stat-val purple">{turno3Count}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>{total ? Math.round((turno3Count / total) * 100) : 0}% das OS</div>
        </div>
      </div>

      {/* PRIMEIRA LINHA DE GRÁFICOS: Status (pizza) + Turno (barras) */}
      <div className="report-grid">
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}><i className="ti ti-chart-pie"></i> Distribuição por Status</div>
          {statusData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80} dataKey="value">
                  {statusData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Nenhum dado disponível</div>}
        </div>

        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}><i className="ti ti-clock"></i> OS por Turno</div>
          {turnoData.some(t => t.count > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={turnoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" /><YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#0c447c" radius={[8,8,0,0]}>
                  {turnoData.map((entry, idx) => <Cell key={idx} fill={entry.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Nenhum dado disponível</div>}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 15, marginTop: 10 }}>
            {turnoData.map(t => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.cor }}></div>
                <span style={{ fontSize: 11 }}>{t.name}: {t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEGUNDA LINHA: Depto (barras horizontais) + Situação inicial (pizza) */}
      <div className="report-grid">
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}><i className="ti ti-building"></i> OS por Departamento (Top 6)</div>
          {byDept.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byDept} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" /><YAxis type="category" dataKey="dept" width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#0c447c" radius={[0,4,4,0]}>
                  {byDept.map((_, idx) => <Cell key={idx} fill={deptColors[idx % deptColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Nenhum dado disponível</div>}
        </div>

        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}><i className="ti ti-alert-circle"></i> OS por Situação Inicial</div>
          {situacaoData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={situacaoData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name.split(' ')[0]}: ${(percent*100).toFixed(0)}%`}
                  outerRadius={80} dataKey="value">
                  {situacaoData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Nenhum dado disponível</div>}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            {situacaoData.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }}></div>
                <span style={{ fontSize: 10 }}>
                  {s.name === 'Máquina Parada por Quebra' ? 'Quebra' : 
                   s.name === 'Trabalho Deficiente' ? 'Trab. Deficiente' : 
                   s.name === 'Trabalhando' ? 'Trabalhando' : 'Lib. Manut.'}: {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TERCEIRA LINHA: Tendência mensal (linha) + Top equipamentos (barras) */}
      <div className="report-grid">
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}><i className="ti ti-trending-up"></i> Tendência Mensal (últimos 6 meses)</div>
          {monthlyData.some(m => m.criadas > 0 || m.concluidas > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" /><YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="criadas" stroke="#0c447c" name="Criadas" strokeWidth={2} dot={{ fill: '#0c447c', r: 4 }} />
                <Line type="monotone" dataKey="concluidas" stroke="#0f6e56" name="Concluídas" strokeWidth={2} dot={{ fill: '#0f6e56', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Nenhum dado disponível</div>}
        </div>

        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}><i className="ti ti-trophy"></i> Top 5 Equipamentos com mais OS</div>
          {topEquipamentos.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topEquipamentos} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" /><YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#a32d2d" radius={[0,4,4,0]}>
                  {topEquipamentos.map((_, idx) => <Cell key={idx} fill={equipamentoColors[idx % equipamentoColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Nenhum dado de equipamento disponível</div>}
          <div style={{ marginTop: 10, fontSize: 11, color: '#666', textAlign: 'center' }}>🏆 Equipamentos com maior número de ocorrências</div>
        </div>
      </div>

      {/* OS por hora do dia (área) */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}><i className="ti ti-clock"></i> OS por Hora do Dia</div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={osPorHora}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hora" /><YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="count" stroke="#0c447c" fill="#185fa5" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#666', marginTop: 8 }}>📊 Identifique os horários de maior demanda</div>
      </div>

      {/* Componente de ranking de problemas (Admin/Gestor) */}
      {(currentUser?.role === 'Admin' || currentUser?.role === 'Gestor') && (
        <div style={{ marginTop: '20px' }}>
          <ProblemRanking os={userOS} currentUser={currentUser} />
        </div>
      )}

      {/* Componente de tempo médio por setor (Admin/Gestor) */}
      {(currentUser?.role === 'Admin' || currentUser?.role === 'Gestor') && (
        <div style={{ marginTop: '20px' }}>
          <TimeByDept os={userOS} currentUser={currentUser} />
        </div>
      )}

      {/* Atividade recente (últimas 5 OS) */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}><i className="ti ti-clock"></i> Atividade Recente</div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {userOS.slice(0, 5).map(o => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0ea' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{o.num}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{o.titulo.length > 40 ? o.titulo.substring(0,40)+'...' : o.titulo}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                <span className={getBadgeClass(o.status)}>{o.status}</span>
                <span style={{ fontSize: 10, color: '#aaa' }}>{timeAgo(o.criadoEm)}</span>
              </div>
            </div>
          ))}
          {userOS.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Nenhuma OS encontrada</div>}
        </div>
      </div>

      {/* METAS E SLA */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>🎯 Metas e SLA</div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          {(() => {
            const total = userOS.length;
            const concluidas = userOS.filter(o => o.status === 'Concluída').length;
            const taxaReal = total ? (concluidas / total) * 100 : 0;
            const slaUrgente = userOS.filter(o => o.prio === 'Urgente' && o.status !== 'Concluída').length;
            return (
              <>
                <div className="stat-card">
                  <div className="stat-label">Meta de Conclusão</div>
                  <div className="stat-val">{taxaReal.toFixed(0)}% / 80%</div>
                  <div style={{ fontSize: 11, color: taxaReal >= 80 ? '#0f6e56' : '#a32d2d' }}>
                    {taxaReal >= 80 ? '✅ Meta atingida' : '⚠️ Abaixo da meta'}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">OS Urgentes Pendentes</div>
                  <div className="stat-val red">{slaUrgente}</div>
                  <div style={{ fontSize: 11 }}>Meta: 0 urgentes em aberto</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Tempo Médio de Resposta</div>
                  <div className="stat-val blue">{tempoRespostaMedio} h</div>
                  <div style={{ fontSize: 11 }}>Meta: &lt; 24h</div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}