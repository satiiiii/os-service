// src/utils/importUtils.js
// Utilitários para importação/exportação de dados de OS (apenas OS, sem usuários).
// Importa de arquivos JSON previamente exportados.

import { addNotification, NOTIF_TYPES } from './notifications';

// ========== IMPORTAÇÃO APENAS DE OS ==========
// Importa uma lista de OS a partir de um arquivo JSON (estrutura { os: [...] } ou array direto).
// Substitui completamente a lista atual de OS.
export const importFromJSON = (file, setOs) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Caso 1: arquivo com propriedade "os"
        if (data.os && Array.isArray(data.os)) {
          if (data.os.length === 0) throw new Error('Arquivo não contém nenhuma OS');
          const confirmMsg = `Este arquivo contém ${data.os.length} OS.\nData do backup: ${data.exportedAt ? new Date(data.exportedAt).toLocaleString('pt-BR') : 'não informada'}\n\nIsso irá SUBSTITUIR todos os dados atuais!\nTem certeza?`;
          if (window.confirm(confirmMsg)) {
            setOs(data.os);
            addNotification('✅ Dados importados!', `${data.os.length} OS foram restauradas com sucesso.`, NOTIF_TYPES.SUCCESS);
            resolve(data.os);
          } else {
            reject(new Error('Importação cancelada'));
          }
          return;
        }

        // Caso 2: array direto de OS
        if (Array.isArray(data)) {
          if (data.length === 0) throw new Error('Arquivo não contém nenhuma OS');
          const confirmMsg = `Este arquivo contém ${data.length} OS.\n\nIsso irá SUBSTITUIR todos os dados atuais!\nTem certeza?`;
          if (window.confirm(confirmMsg)) {
            setOs(data);
            addNotification('✅ Dados importados!', `${data.length} OS foram restauradas com sucesso.`, NOTIF_TYPES.SUCCESS);
            resolve(data);
          } else {
            reject(new Error('Importação cancelada'));
          }
          return;
        }

        throw new Error('Arquivo inválido: não contém lista de OS');
      } catch (error) {
        addNotification('❌ Erro na importação', error.message, NOTIF_TYPES.ERROR);
        reject(error);
      }
    };

    reader.onerror = () => {
      addNotification('❌ Erro na importação', 'Falha ao ler o arquivo', NOTIF_TYPES.ERROR);
      reject(new Error('Falha ao ler o arquivo'));
    };

    reader.readAsText(file);
  });
};

// ========== EXPORTAÇÃO DE APENAS OS (BACKUP) ==========
// Exporta a lista atual de OS para um arquivo JSON.
export const exportBackup = (os, users) => {
  // O parâmetro `users` é ignorado (não mais utilizado). Mantido para compatibilidade com AdminDashboard.
  const backup = {
    date: new Date().toISOString(),
    os: os,
    version: '2.0' // versão sem usuários
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', `backup_os_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  addNotification('✅ Backup criado!', 'Backup das OS salvo com sucesso!', NOTIF_TYPES.SUCCESS);
};

// NOTA: A função importFullBackup (importação de OS + usuários) foi removida porque o sistema
// agora gerencia usuários diretamente no Supabase. A restauração de usuários via localStorage
// não é mais segura ou recomendada. Apenas a importação de OS é suportada.