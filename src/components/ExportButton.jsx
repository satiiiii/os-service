// src/components/ExportButton.jsx
// Botão que abre modal de exportação de dados (apenas para Admin/Gestor)
import React, { useState } from 'react';
import ExportModal from './ExportModal';
import { canExportData } from '../utils/helpers';
import { getCurrentUser } from '../utils/auth';

export default function ExportButton({ osList, variant = 'primary' }) {
  const [showModal, setShowModal] = useState(false);
  const currentUser = getCurrentUser();

  // Se o usuário não tem permissão para exportar, não renderiza o botão
  if (!canExportData(currentUser)) {
    return null;
  }

  return (
    <>
      <button 
        className={`btn btn-${variant}`} 
        onClick={() => setShowModal(true)}
      >
        <i className="ti ti-download"></i>
        Exportar
      </button>

      {showModal && (
        <ExportModal 
          osList={osList} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
}