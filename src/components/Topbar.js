// src/components/Topbar.js
// Barra de navegação superior com botões horizontais.
// Os botões aparecem conforme as permissões do usuário (Admin, Gestor, Técnico, etc.).
// Não utiliza dropdown - todos os itens ficam visíveis diretamente.

import React from 'react';
import { canViewRelatorios, canViewDashboard } from '../utils/helpers';
import NotificationBell from './NotificationBell';

export default function Topbar({ page, setPage, role, userName, onLogout }) {
  const user = { role, nome: userName };
  const showDashboard = canViewDashboard(user);  // Dashboard visível para Admin, Gestor e Técnico
  const isAdmin = role === 'Admin';
  const isGestor = role === 'Gestor';

  // Classe CSS do botão (ativa se for a página atual)
  const getButtonClass = (pageName) => `nav-btn ${page === pageName ? 'active' : ''}`;

  return (
    <div className="topbar">
      {/* Logo */}
      <div className="logo">
        <div className="logo-icon">OS</div>
        <div className="logo-text">
          Manager
          <small>Sistema de Ordens de Serviço</small>
        </div>
      </div>

      {/* Botão Dashboard (para quem tem permissão) */}
      {showDashboard && (
        <button className={getButtonClass('dashboard')} onClick={() => setPage('dashboard')}>
          <i className="ti ti-layout-dashboard"></i> Dashboard
        </button>
      )}

      {/* Botão Ordens de Serviço (todos os perfis autenticados) */}
      <button className={getButtonClass('os')} onClick={() => setPage('os')}>
        <i className="ti ti-clipboard-list"></i> Ordens de Serviço
      </button>

      {/* Botão KPIs (apenas Admin e Gestor) */}
      {(isAdmin || isGestor) && (
        <button className={getButtonClass('kpis')} onClick={() => setPage('kpis')}>
          <i className="ti ti-chart-pie"></i> KPIs
        </button>
      )}

      {/* Botão Técnicos (apenas Admin e Gestor) */}
      {(isAdmin || isGestor) && (
        <button className={getButtonClass('tecnicos')} onClick={() => setPage('tecnicos')}>
          <i className="ti ti-users"></i> Técnicos
        </button>
      )}

      {/* Botão Relatórios (apenas Admin e Gestor) */}
      {canViewRelatorios(user) && (
        <button className={getButtonClass('relatorios')} onClick={() => setPage('relatorios')}>
          <i className="ti ti-chart-bar"></i> Relatórios
        </button>
      )}

      {/* Botão Confiabilidade (apenas Admin e Gestor) - NOVO */}
      {(isAdmin || isGestor) && (
        <button className={getButtonClass('confiabilidade')} onClick={() => setPage('confiabilidade')}>
          <i className="ti ti-chart-infographic"></i> Confiabilidade
        </button>
      )}

      {/* Botão Admin (apenas Admin) */}
      {isAdmin && (
        <button className={getButtonClass('admin')} onClick={() => setPage('admin')}>
          <i className="ti ti-dashboard"></i> Admin
        </button>
      )}

      {/* Área direita (notificações, usuário, logout) */}
      <div className="topbar-right">
        <NotificationBell />
        <div className="user-pill">
          <i className="ti ti-user"></i> {userName} ({role})
        </div>
        <button className="btn btn-sm" onClick={onLogout} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}>
          <i className="ti ti-logout"></i> Sair
        </button>
      </div>
    </div>
  );
}