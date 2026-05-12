// src/utils/notifications.js
// Sistema de notificações para eventos do sistema (nova OS, mudanças de status, etc.).
// As notificações são armazenadas no localStorage e exibidas como toasts e no sino de notificações.
// Utilizado em App.js, OSDetailModal.js, etc.

export const NOTIF_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

let listeners = [];
let notifications = [];

// ========== PERSISTÊNCIA ==========
export function loadNotifications() {
  try {
    const saved = localStorage.getItem('os_notifications');
    if (saved) {
      notifications = JSON.parse(saved);
      notifyListeners();
    }
  } catch (e) {}
}

function saveNotifications() {
  try {
    const toSave = notifications.slice(0, 50); // mantém apenas últimas 50
    localStorage.setItem('os_notifications', JSON.stringify(toSave));
  } catch (e) {}
}

// ========== GERENCIAMENTO DE LISTENERS ==========
function notifyListeners() {
  listeners.forEach(listener => listener([...notifications]));
}

export function subscribeToNotifications(callback) {
  listeners.push(callback);
  callback([...notifications]);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

// ========== CRIAÇÃO DE NOTIFICAÇÕES ==========
export function addNotification(title, message, type = NOTIF_TYPES.INFO, link = null, osId = null) {
  const notification = {
    id: Date.now(),
    title,
    message,
    type,
    link,
    osId,
    read: false,
    createdAt: Date.now()
  };
  notifications.unshift(notification);
  saveNotifications();
  notifyListeners();
  showToast(message, type);
  return notification;
}

// ========== AÇÕES SOBRE NOTIFICAÇÕES ==========
export function markAsRead(id) {
  const notif = notifications.find(n => n.id === id);
  if (notif) {
    notif.read = true;
    saveNotifications();
    notifyListeners();
  }
}

export function markAllAsRead() {
  notifications.forEach(n => n.read = true);
  saveNotifications();
  notifyListeners();
}

export function removeNotification(id) {
  notifications = notifications.filter(n => n.id !== id);
  saveNotifications();
  notifyListeners();
}

export function clearAllNotifications() {
  notifications = [];
  saveNotifications();
  notifyListeners();
}

export function getUnreadCount() {
  return notifications.filter(n => !n.read).length;
}

// ========== TOAST (notificação temporária) ==========
function showToast(message, type) {
  const toast = document.createElement('div');
  const colors = {
    success: '#0f6e56',
    error: '#a32d2d',
    warning: '#854f0b',
    info: '#0c447c'
  };
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 1000;
    animation: slideInRight 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-size: 14px;
    max-width: 350px;
    cursor: pointer;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
  toast.onclick = () => toast.remove();
}

// Adiciona estilos CSS para as animações (executado uma vez)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}