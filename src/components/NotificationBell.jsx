// src/components/NotificationBell.jsx
// Componente que exibe um sino de notificações no topbar.
// As notificações são geradas por eventos do sistema (ex: nova OS, mudança de status)
// e armazenadas no localStorage via módulo notifications.js.
// Permite marcar como lidas, remover individualmente ou limpar todas.

import React, { useState, useEffect } from 'react';
import { 
  getUnreadCount, 
  subscribeToNotifications, 
  markAsRead, 
  markAllAsRead,
  removeNotification,
  clearAllNotifications
} from '../utils/notifications';
import { formatDateShort } from '../utils/helpers';

export default function NotificationBell({ onSelectOS }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  // Assina as mudanças nas notificações e atualiza o contador
  useEffect(() => {
    setUnreadCount(getUnreadCount());
    const unsubscribe = subscribeToNotifications((notifs) => {
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    });
    return unsubscribe; // cleanup ao desmontar
  }, []);

  // Retorna o ícone correspondente ao tipo de notificação
  const getIconByType = (type) => {
    switch(type) {
      case 'success': return 'ti-circle-check';
      case 'error': return 'ti-circle-x';
      case 'warning': return 'ti-alert-triangle';
      default: return 'ti-info-circle';
    }
  };

  // Retorna a cor do ícone conforme o tipo
  const getColorByType = (type) => {
    switch(type) {
      case 'success': return '#0f6e56';
      case 'error': return '#a32d2d';
      case 'warning': return '#854f0b';
      default: return '#0c447c';
    }
  };

  // Ao clicar em uma notificação, marca como lida e, se houver OS associada,
  // dispara a função para selecioná-la (abrir modal de detalhes)
  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    if (notif.osId && onSelectOS) {
      onSelectOS(notif.osId);
    }
    setIsOpen(false); // fecha o painel
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Botão do sino */}
      <button
        className="btn btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: 'relative', background: '#f0f0ea' }}
      >
        <i className="ti ti-bell" style={{ fontSize: '18px' }}></i>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#a32d2d',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 'bold',
            minWidth: '18px'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Painel de notificações (dropdown) */}
      {isOpen && (
        <>
          {/* Overlay para fechar o painel ao clicar fora */}
          <div className="modal-overlay" style={{ background: 'transparent', zIndex: 999 }} onClick={() => setIsOpen(false)} />
          <div style={{
            position: 'absolute',
            top: '40px',
            right: '0',
            width: '380px',
            maxHeight: '500px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Cabeçalho com título e botões de ação */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e5e5e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fff'
            }}>
              <strong style={{ fontSize: '14px' }}>Notificações</strong>
              <div style={{ display: 'flex', gap: '8px' }}>
                {notifications.length > 0 && (
                  <>
                    <button className="btn btn-sm" onClick={() => markAllAsRead()} style={{ fontSize: '11px', padding: '4px 8px' }}>
                      Ler todas
                    </button>
                    <button className="btn btn-sm" onClick={() => clearAllNotifications()} style={{ fontSize: '11px', padding: '4px 8px', color: '#a32d2d' }}>
                      Limpar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Lista de notificações */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                  <i className="ti ti-bell-off" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}></i>
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f0f0ea',
                      cursor: 'pointer',
                      background: notif.read ? 'white' : '#f5f5f0'  // destaque para não lidas
                    }}
                  >
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <i className={getIconByType(notif.type)} style={{ color: getColorByType(notif.type), fontSize: '18px', marginTop: '2px' }}></i>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{notif.title}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{notif.message}</div>
                        <div style={{ fontSize: '10px', color: '#999' }}>{formatDateShort(notif.createdAt)}</div>
                      </div>
                      {/* Botão para remover notificação individualmente */}
                      <button onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: '4px' }}>
                        <i className="ti ti-x"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}