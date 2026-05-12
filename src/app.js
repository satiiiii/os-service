import React, { useState, useEffect } from 'react';
import Topbar from './components/Topbar';
import Dashboard from './components/Dashboard';
import OSLista from './components/OSLista';
import Relatorios from './components/Relatorios';
import KPIDashboard from './components/KPIDashboard';
import TechnicianDashboard from './components/TechnicianDashboard';
import AdminDashboard from './components/AdminDashboard';
import ReliabilityDashboard from './components/ReliabilityDashboard'; // NOVO
import NovaOSModal from './components/NovaOSModal';
import OSDetailModal from './components/OSDetailModal';
import Login from './components/Login';
import { getCurrentUser, logout } from './utils/auth';
import { getOS, createOS as createOSInDB, updateOS as updateOSInDB, deleteOS as deleteOSInDB, subscribeToOS } from './services/supabase';
import { canCreateOS, canViewRelatorios, getFilteredOS, canViewDashboard } from './utils/helpers';
import { addNotification, NOTIF_TYPES, loadNotifications } from './utils/notifications';

export default function App() {
  const [user, setUser] = useState(() => getCurrentUser());
  const [os, setOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [showNova, setShowNova] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function loadOS() {
      setLoading(true);
      try {
        const data = await getOS();
        setOs(data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadOS();
  }, []);

  useEffect(() => {
    const subscription = subscribeToOS(() => {
      getOS().then(data => setOs(data || [])).catch(console.error);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (user && user.role === 'Solicitante' && page === 'dashboard') {
      setPage('os');
    }
  }, [user, page]);

  if (!user) return <Login onLogin={setUser} />;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f0' }}>
      <div className="ai-loading"><div className="spinner"></div>Carregando dados...</div>
    </div>
  );

  const canSeeDashboard = canViewDashboard(user);

  async function criarOS(form) {
    const now = Date.now();
    const dataProgramada = new Date(form.dataProgramada).getTime();
    const novaOS = {
      num: `OS-${String(os.length + 1).padStart(3, '0')}`,
      titulo: form.titulo,
      dept: form.dept,
      localizacao: form.localizacao,
      local: form.localizacao,
      descricao: form.desc || '',
      situacao: form.situacao,
      prio: form.prio || 'Normal',
      turno: form.turno,
      status: 'Aberta',
      solicitante: user.nome,
      tecnico: null,
      criado_em: now,
      data_programada: dataProgramada,
      data_conclusao: null,
      equipamento_tag: form.equipamentoTag || '',
      equipamento_nome: form.equipamentoNome || '',
      celula: form.celula || '',
      predio: form.predio || '',
      historico: [{ acao: 'OS criada', autor: user.nome, ts: now }],
      // NOVOS CAMPOS
      tipo_manutencao: form.tipoManutencao,
      horimetro_inicio: form.horimetroInicio || null,
    };
    try {
      const nova = await createOSInDB(novaOS);
      setOs(prev => [nova, ...prev]);
      setShowNova(false);
      setPage('os');
      addNotification('✅ OS criada com sucesso', `A OS ${nova.num} foi criada!`, NOTIF_TYPES.SUCCESS);
    } catch (error) {
      console.error(error);
      addNotification('❌ Erro ao criar OS', 'Tente novamente.', NOTIF_TYPES.ERROR);
    }
  }

  async function atualizarOS(updated) {
    try {
      await updateOSInDB(updated.id, updated);
      setOs(prev => prev.map(o => (o.id === updated.id ? updated : o)));
      setSelected(updated);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDeleteOS(osId, osNum) {
    if (window.confirm(`Tem certeza que deseja excluir a OS ${osNum}?`)) {
      try {
        await deleteOSInDB(osId);
        setOs(prev => prev.filter(o => o.id !== osId));
      } catch (error) {
        console.error(error);
      }
    }
  }

  function handleLogout() {
    logout();
    setUser(null);
  }

  const pageLabel = {
    dashboard: 'Dashboard',
    os: 'Ordens de Serviço',
    relatorios: 'Relatórios',
    kpis: 'KPIs Executivos',
    tecnicos: 'Performance dos Técnicos',
    confiabilidade: 'Confiabilidade',  // NOVO
    admin: 'Admin Dashboard'
  };

  const userOS = getFilteredOS(os, user);
  const pageSub = {
    dashboard: 'Visão geral das operações',
    os: `${userOS.length} ${userOS.length === 1 ? 'ordem registrada' : 'ordens registradas'}`,
    relatorios: 'Análise e indicadores operacionais',
    kpis: 'Métricas de desempenho e eficiência',
    tecnicos: 'Avalie o desempenho individual de cada técnico',
    confiabilidade: 'MTBF, MTTR, MTTF e análise de custos',  // NOVO
    admin: 'Métricas avançadas, logs e gestão de usuários'
  };

  return (
    <div>
      <Topbar page={page} setPage={setPage} role={user.role} userName={user.nome} onLogout={handleLogout} />
      <div className="main">
        <div className="page-header">
          <div>
            <div className="page-title">{pageLabel[page]}</div>
            <div className="page-sub">{pageSub[page]}</div>
          </div>
          {canCreateOS(user) && page === 'os' && (
            <button className="btn btn-primary" onClick={() => setShowNova(true)}>
              <i className="ti ti-plus"></i> Nova OS
            </button>
          )}
        </div>

        {page === 'dashboard' && canSeeDashboard && <Dashboard os={os} currentUser={user} />}
        {page === 'os' && <OSLista os={os} onSelect={setSelected} currentUser={user} onDelete={handleDeleteOS} />}
        {page === 'relatorios' && <Relatorios os={os} currentUser={user} />}
        {page === 'kpis' && (user.role === 'Admin' || user.role === 'Gestor') && <KPIDashboard os={os} currentUser={user} />}
        {page === 'tecnicos' && (user.role === 'Admin' || user.role === 'Gestor') && <TechnicianDashboard os={os} currentUser={user} />}
        {page === 'confiabilidade' && (user.role === 'Admin' || user.role === 'Gestor') && <ReliabilityDashboard os={os} currentUser={user} />} {/* NOVO */}
        {page === 'admin' && user.role === 'Admin' && (
          <AdminDashboard os={os} currentUser={user} onOsUpdate={setOs} onUsersUpdate={() => {}} />
        )}
      </div>
      {showNova && <NovaOSModal onClose={() => setShowNova(false)} onSave={criarOS} />}
      {selected && (
        <OSDetailModal os={selected} onClose={() => setSelected(null)} onUpdate={atualizarOS} role={user.role} userName={user.nome} />
      )}
    </div>
  );
}