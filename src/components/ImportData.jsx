// src/components/ImportData.jsx
// Componente para importar dados de um arquivo JSON previamente exportado.
// Pode importar apenas OS ou backup completo (OS + usuários).
// Exibe aviso de que substituirá todos os dados atuais.

import React, { useState } from 'react';
import { importFromJSON, importFullBackup } from '../utils/importUtils';
import { addNotification, NOTIF_TYPES } from '../utils/notifications';

export default function ImportData({ onImport, type = 'os', title = 'Importar Dados' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef(null);

  // Processa o arquivo selecionado (valida extensão e chama a importação adequada)
  const handleFile = async (file) => {
    if (!file) return;

    // Verifica se é um arquivo JSON
    if (!file.name.endsWith('.json')) {
      addNotification('❌ Arquivo inválido', 'Por favor, selecione um arquivo .json', NOTIF_TYPES.ERROR);
      return;
    }

    setLoading(true);

    try {
      // Importação completa (OS + usuários) ou apenas OS
      if (type === 'full') {
        // `onImport` deve ser um objeto com setOs e setUsers
        await importFullBackup(file, onImport.setOs, onImport.setUsers);
      } else {
        // `onImport` é a função que atualiza a lista de OS
        await importFromJSON(file, onImport);
      }

      // Recarrega a página após a importação para garantir consistência
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Erro na importação:', error);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Eventos de drag & drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  return (
    <div>
      {/* Título e aviso */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>{title}</h3>
        <p style={{ fontSize: '13px', color: '#666' }}>
          Importe dados de um arquivo JSON exportado anteriormente.
          <strong style={{ color: '#a32d2d', display: 'block', marginTop: '8px' }}>
            ⚠️ Atenção: Isso substituirá TODOS os dados atuais do sistema!
          </strong>
        </p>
      </div>

      {/* Área de upload (drag & drop ou clique) */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#0c447c' : '#d3d1c7'}`,
          borderRadius: '12px',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? '#e6f1fb' : '#fafaf8',
          transition: 'all 0.2s ease',
          opacity: loading ? 0.6 : 1
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={loading}
        />

        {loading ? (
          // Estado de carregamento
          <div>
            <div className="spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }}></div>
            <div style={{ fontSize: '14px', color: '#666' }}>Importando dados...</div>
          </div>
        ) : (
          // Estado normal
          <>
            <i className="ti ti-upload" style={{ fontSize: '48px', color: '#0c447c', display: 'block', marginBottom: '12px' }}></i>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              Clique ou arraste um arquivo JSON
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {type === 'full'
                ? 'Importa OS e usuários de um backup completo'
                : 'Importa apenas as OS de um arquivo de exportação'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}