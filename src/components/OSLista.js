// src/components/OSLista.js
// Componente para exibir a lista de OS com barra de busca, filtros (status, departamento, prioridade, turno, período)
// e funcionalidade para salvar/recarregar combinações de filtros (armazenadas no localStorage).
// Utiliza o componente ExportButton para exportar as OS filtradas.

import React, { useState } from 'react';
import { getBadgeClass, getPrioBadge, formatDateShort, getFilteredOS } from '../utils/helpers';
import ExportButton from './ExportButton';
import { DEPTS, STATUS_LIST, PRIORIDADES, TURNOS } from '../data/constants';
import { addNotification, NOTIF_TYPES } from '../utils/notifications';   // ← IMPORTANTE: adicionado

export default function OSLista({ os, onSelect, currentUser }) {
  // Estados dos filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');
  const [deptFilter, setDeptFilter] = useState('todos');
  const [priorityFilter, setPriorityFilter] = useState('todas');
  const [turnoFilter, setTurnoFilter] = useState('todos');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filtros salvos (armazenados no localStorage)
  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('saved_filters');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [filterName, setFilterName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Aplica as permissões do usuário à lista de OS (solicitante vê apenas as suas)
  const userOS = getFilteredOS(os, currentUser);

  // Conjunto de departamentos únicos (para o campo de filtro)
  const uniqueDepts = ['todos', ...new Set(userOS.map(o => o.dept))];

  // Função que aplica todos os filtros ativos
  const filterOS = () => {
    let filtered = [...userOS];

    // Busca textual (título, número ou descrição)
    if (search) {
      filtered = filtered.filter(o => 
        o.titulo.toLowerCase().includes(search.toLowerCase()) || 
        o.num.toLowerCase().includes(search.toLowerCase()) ||
        o.desc.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'todas') filtered = filtered.filter(o => o.status === statusFilter);
    // Filtro por departamento
    if (deptFilter !== 'todos') filtered = filtered.filter(o => o.dept === deptFilter);
    // Filtro por prioridade
    if (priorityFilter !== 'todas') filtered = filtered.filter(o => o.prio === priorityFilter);
    // Filtro por turno
    if (turnoFilter !== 'todos') filtered = filtered.filter(o => o.turno === parseInt(turnoFilter));

    // Filtro por período de criação
    if (dateRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      filtered = filtered.filter(o => o.criadoEm >= start && o.criadoEm <= end);
    } else if (dateRange === 'week') {
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(o => o.criadoEm >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(o => o.criadoEm >= monthAgo);
    }

    return filtered;
  };

  const filtered = filterOS();

  // Salva a combinação atual de filtros no localStorage
  const saveCurrentFilter = () => {
    if (!filterName.trim()) return;
    const newFilter = {
      id: Date.now(),
      name: filterName,
      filters: { search, statusFilter, deptFilter, priorityFilter, turnoFilter, dateRange, startDate, endDate }
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('saved_filters', JSON.stringify(updated));
    setShowSaveModal(false);
    setFilterName('');
    addNotification('Filtro salvo', `"${filterName}" foi salvo com sucesso!`, NOTIF_TYPES.SUCCESS);
  };

  // Carrega um filtro salvo
  const loadSavedFilter = (filter) => {
    setSearch(filter.filters.search);
    setStatusFilter(filter.filters.statusFilter);
    setDeptFilter(filter.filters.deptFilter);
    setPriorityFilter(filter.filters.priorityFilter);
    setTurnoFilter(filter.filters.turnoFilter);
    setDateRange(filter.filters.dateRange);
    setStartDate(filter.filters.startDate);
    setEndDate(filter.filters.endDate);
  };

  // Remove um filtro salvo
  const deleteSavedFilter = (id) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('saved_filters', JSON.stringify(updated));
  };

  // Limpa todos os filtros atuais
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('todas');
    setDeptFilter('todos');
    setPriorityFilter('todas');
    setTurnoFilter('todos');
    setDateRange('all');
    setStartDate('');
    setEndDate('');
  };

  const statuses = ['todas', 'Aberta', 'Em andamento', 'Concluída', 'Recusada', 'Cancelada', 'Aguardando Aprovação'];
  const priorities = ['todas', 'Urgente', 'Normal', 'Baixa'];
  const turnos = ['todos', '1', '2', '3'];

  return (
    <div>
      {/* Barra superior com busca rápida e botão de filtros avançados */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Buscar por título, número ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className={`btn btn-sm ${showAdvanced ? 'btn-primary' : ''}`} onClick={() => setShowAdvanced(!showAdvanced)}>
          <i className="ti ti-filter"></i>
          {showAdvanced ? 'Fechar' : 'Filtros'}
        </button>
        <ExportButton osList={filtered} variant="default" />
      </div>

      {/* Painel de filtros avançados (expansível) */}
      {showAdvanced && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            {/* Status */}
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {statuses.map(s => <option key={s} value={s}>{s === 'todas' ? 'Todos' : s}</option>)}
              </select>
            </div>
            {/* Departamento */}
            <div className="form-group">
              <label className="form-label">Departamento</label>
              <select className="form-input" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                {uniqueDepts.map(d => <option key={d} value={d}>{d === 'todos' ? 'Todos' : d}</option>)}
              </select>
            </div>
            {/* Prioridade */}
            <div className="form-group">
              <label className="form-label">Prioridade</label>
              <select className="form-input" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                {priorities.map(p => <option key={p} value={p}>{p === 'todas' ? 'Todas' : p}</option>)}
              </select>
            </div>
            {/* Turno */}
            <div className="form-group">
              <label className="form-label">Turno</label>
              <select className="form-input" value={turnoFilter} onChange={(e) => setTurnoFilter(e.target.value)}>
                {turnos.map(t => <option key={t} value={t}>{t === 'todos' ? 'Todos' : t === '1' ? '1º Turno' : t === '2' ? '2º Turno' : '3º Turno'}</option>)}
              </select>
            </div>
            {/* Período */}
            <div className="form-group">
              <label className="form-label">Período</label>
              <select className="form-input" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                <option value="all">Todo período</option>
                <option value="week">Últimos 7 dias</option>
                <option value="month">Últimos 30 dias</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            {/* Datas personalizadas (exibidas apenas quando "custom") */}
            {dateRange === 'custom' && (
              <>
                <div className="form-group">
                  <label className="form-label">Data inicial</label>
                  <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Data final</label>
                  <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}
          </div>

          {/* Botões de ação dos filtros */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={clearFilters}>
              <i className="ti ti-clear-formatting"></i> Limpar filtros
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => setShowSaveModal(true)}>
              <i className="ti ti-bookmark"></i> Salvar filtro
            </button>
          </div>

          {/* Exibição dos filtros salvos anteriormente */}
          {savedFilters.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e5e0' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Filtros salvos:</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {savedFilters.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0f0ea', borderRadius: '4px', padding: '4px 8px' }}>
                    <button className="btn btn-sm" onClick={() => loadSavedFilter(f)} style={{ padding: '2px 4px' }}>
                      <i className="ti ti-filter"></i> {f.name}
                    </button>
                    <button className="btn btn-sm" onClick={() => deleteSavedFilter(f.id)} style={{ padding: '2px 4px', color: '#a32d2d' }}>
                      <i className="ti ti-x"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Informação resumida da quantidade de OS encontradas (apenas quando há filtros ativos) */}
      {(search || statusFilter !== 'todas' || deptFilter !== 'todos' || priorityFilter !== 'todas' || turnoFilter !== 'todos') && (
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
          📊 Encontradas <strong>{filtered.length}</strong> OS
        </div>
      )}

      {/* Listagem visual das OS */}
      <div className="os-list">
        {filtered.length === 0 ? (
          <div className="empty">
            <i className="ti ti-clipboard"></i>
            Nenhuma OS encontrada
          </div>
        ) : (
          filtered.map((o) => (
            <div key={o.id} className="os-item" onClick={() => onSelect(o)}>
              <div className="os-num">{o.num}</div>
              <div className="os-info">
                <div className="os-title">{o.titulo}</div>
                <div className="os-meta">
                  <span><i className="ti ti-building"></i> {o.dept}</span>
                  <span><i className="ti ti-map-pin"></i> {o.local}</span>
                  <span><i className="ti ti-calendar"></i> {formatDateShort(o.criadoEm)}</span>
                </div>
              </div>
              <div className="os-right">
                <span className={getBadgeClass(o.status)}>{o.status}</span>
                <span className={getPrioBadge(o.prio)}>{o.prio}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal para salvar um conjunto de filtros */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowSaveModal(false)}>
          <div className="modal" style={{ maxWidth: '350px' }}>
            <div className="modal-header">
              <span className="modal-title">Salvar filtro</span>
              <button className="btn btn-sm" onClick={() => setShowSaveModal(false)}><i className="ti ti-x"></i></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome do filtro</label>
                <input className="form-input" placeholder="Ex: OS urgentes" value={filterName} onChange={(e) => setFilterName(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowSaveModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveCurrentFilter}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}