// src/components/FileAttachments.jsx
// Componente responsável por gerenciar anexos (arquivos) de uma OS específica.
// Utiliza o Supabase Storage (bucket 'os-attachments') e exibe lista de arquivos
// com opções de upload, download, visualização de imagem e exclusão.

import React, { useState, useEffect } from 'react';
import { supabase, STORAGE_BUCKET } from '../services/supabase';
import { addNotification, NOTIF_TYPES } from '../utils/notifications';

export default function FileAttachments({ osId, canEdit }) {
  // Estado: lista de anexos, flag de upload, URL da imagem em pré-visualização
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Carrega os anexos sempre que o osId mudar (ex: ao abrir o modal de OS)
  useEffect(() => {
    loadAttachments();
  }, [osId]);

  // Busca a lista de arquivos no bucket do Supabase e gera URLs assinadas (válidas por 1 hora)
  const loadAttachments = async () => {
    const { data, error } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .list(`${osId}`, { limit: 100 });
    if (error) {
      console.error('Erro ao listar anexos:', error);
      return;
    }
    const filesWithUrls = await Promise.all(data.map(async (file) => {
      const { data: urlData } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(`${osId}/${file.name}`, 60 * 60); // 1 hora
      return {
        id: file.id,
        nome: file.name,
        tamanho: file.metadata?.size || 0,
        tipo: file.metadata?.mimetype || '',
        dataUpload: file.created_at,
        extensao: file.name.split('.').pop().toLowerCase(),
        signedUrl: urlData?.signedUrl
      };
    }));
    setAttachments(filesWithUrls);
  };

  // Upload de um ou mais arquivos (limite de 10MB por arquivo)
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const maxSize = 10 * 1024 * 1024;
    const oversized = files.find(f => f.size > maxSize);
    if (oversized) {
      addNotification('Arquivo muito grande', `${oversized.name} excede 10MB`, NOTIF_TYPES.ERROR);
      return;
    }

    setUploading(true);
    for (const file of files) {
      const filePath = `${osId}/${file.name}`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, { upsert: true }); // sobrescreve se existir
      if (error) {
        addNotification('Erro ao anexar', `Falha ao enviar ${file.name}`, NOTIF_TYPES.ERROR);
      } else {
        addNotification('Anexo adicionado', `${file.name} foi anexado com sucesso!`, NOTIF_TYPES.SUCCESS);
      }
    }
    await loadAttachments();   // recarrega a lista
    setUploading(false);
    e.target.value = '';      // limpa o input file
  };

  // Remover um arquivo (apenas se tiver permissão `canEdit`)
  const handleDelete = async (attachment) => {
    if (window.confirm(`Deseja remover o arquivo "${attachment.nome}"?`)) {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([`${osId}/${attachment.nome}`]);
      if (error) {
        addNotification('Erro', 'Não foi possível remover o arquivo.', NOTIF_TYPES.ERROR);
      } else {
        setAttachments(prev => prev.filter(a => a.id !== attachment.id));
        addNotification('Anexo removido', `${attachment.nome} foi removido`, NOTIF_TYPES.INFO);
      }
    }
  };

  // Download: abre a URL assinada em uma nova aba (força o download do navegador)
  const handleDownload = (attachment) => {
    if (attachment.signedUrl) {
      window.open(attachment.signedUrl, '_blank');
    } else {
      addNotification('Erro', 'Não foi possível baixar o arquivo.', NOTIF_TYPES.ERROR);
    }
  };

  // Formata o tamanho do arquivo (Bytes, KB, MB, GB)
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Retorna um ícone de acordo com a extensão do arquivo
  const getFileIcon = (ext) => {
    const icons = { pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', txt: '📃', zip: '📦' };
    return icons[ext] || '📎';
  };

  // Verifica se o arquivo é uma imagem (para mostrar pré‑visualização)
  const isImage = (att) => att.tipo?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif'].includes(att.extensao);

  // Formata a data de upload para exibição
  const formatDate = (ts) => new Date(ts).toLocaleString('pt-BR');

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Modal para pré‑visualização de imagem em tamanho grande */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)} style={{ zIndex: 1000, background: 'rgba(0,0,0,0.9)' }}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }} />
            <button onClick={() => setPreviewImage(null)} style={{ marginTop: 20, padding: '10px 20px', background: '#a32d2d', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Fechar</button>
          </div>
        </div>
      )}

      {/* Área principal de anexos */}
      <div style={{ background: '#f5f5f0', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-paperclip"></i> Anexos ({attachments.length})
          </div>
          {/* Botão de upload (só aparece se o usuário tiver permissão de edição na OS) */}
          {canEdit && (
            <label className="btn btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
              <i className="ti ti-upload"></i> {uploading ? 'Enviando...' : 'Adicionar'}
              <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
          )}
        </div>

        <div style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>
          Formatos suportados: imagens, PDF, DOC, XLS, TXT, ZIP (máx 10MB)
        </div>

        {attachments.length === 0 ? (
          // Estado vazio
          <div style={{ textAlign: 'center', padding: 20, color: '#888', fontSize: 12 }}>
            <i className="ti ti-file" style={{ fontSize: 24, marginBottom: 8, display: 'block' }}></i>
            Nenhum anexo ainda {canEdit && <div>Clique em "Adicionar" para enviar arquivos</div>}
          </div>
        ) : (
          // Lista de anexos
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attachments.map(att => (
              <div key={att.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, background: 'white', borderRadius: 6, border: '1px solid #e5e5e0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <span style={{ fontSize: 24 }}>{getFileIcon(att.extensao)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.nome}</div>
                    <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{formatFileSize(att.tamanho)} • {formatDate(att.dataUpload)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {/* Pré‑visualização (apenas para imagens) */}
                  {isImage(att) && (
                    <button className="btn btn-sm" onClick={() => setPreviewImage(att.signedUrl)} style={{ padding: '4px 8px' }} title="Visualizar">
                      <i className="ti ti-eye"></i>
                    </button>
                  )}
                  {/* Download */}
                  <button className="btn btn-sm" onClick={() => handleDownload(att)} style={{ padding: '4px 8px' }} title="Baixar">
                    <i className="ti ti-download"></i>
                  </button>
                  {/* Exclusão (apenas com permissão) */}
                  {canEdit && (
                    <button className="btn btn-sm" onClick={() => handleDelete(att)} style={{ padding: '4px 8px', color: '#a32d2d' }} title="Remover">
                      <i className="ti ti-trash"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}