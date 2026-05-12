// src/utils/fileUtils.js
// ATENÇÃO: Este arquivo NÃO É MAIS UTILIZADO no sistema atual.
// Os anexos são gerenciados diretamente pelo componente FileAttachments com Supabase Storage.
// Mantido apenas para referência.

const STORAGE_KEY = 'os_attachments';

export function saveAttachment(osId, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const attachments = getAttachments(osId);
        const newAttachment = {
          id: Date.now() + Math.random() * 1000,
          osId,
          nome: file.name,
          tamanho: file.size,
          tipo: file.type,
          data: e.target.result,
          dataUpload: Date.now(),
          extensao: file.name.split('.').pop().toLowerCase()
        };
        attachments.push(newAttachment);
        localStorage.setItem(`${STORAGE_KEY}_${osId}`, JSON.stringify(attachments));
        resolve(newAttachment);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getAttachments(osId) {
  try {
    const data = localStorage.getItem(`${STORAGE_KEY}_${osId}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function deleteAttachment(osId, attachmentId) {
  const attachments = getAttachments(osId);
  const filtered = attachments.filter(a => a.id !== attachmentId);
  localStorage.setItem(`${STORAGE_KEY}_${osId}`, JSON.stringify(filtered));
  return filtered;
}

export function downloadAttachment(attachment) {
  const link = document.createElement('a');
  link.href = attachment.data;
  link.download = attachment.nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileIcon(extensao) {
  const icons = {
    pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
    doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', txt: '📃',
    zip: '📦', rar: '📦'
  };
  return icons[extensao] || '📎';
}

export function isImage(attachment) {
  return attachment.tipo?.startsWith('image/') ||
         ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(attachment.extensao);
}