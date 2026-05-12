// src/utils/export.js
// Utilitário simples para exportar uma lista de OS para arquivo CSV.
// Inclui apenas as colunas principais: número, título, status, departamento, prioridade, solicitante.

export function exportToCSV(osList) {
  if (!osList || osList.length === 0) {
    console.warn('Nenhuma OS para exportar');
    return;
  }

  const headers = ['Número', 'Título', 'Status', 'Departamento', 'Prioridade', 'Solicitante'];
  const rows = osList.map(os => [
    os.num,
    os.titulo,
    os.status,
    os.dept,
    os.prio,
    os.solicitante
  ]);

  // Adiciona BOM (Byte Order Mark) para garantir que caracteres acentuados sejam exibidos corretamente no Excel
  const csvContent = "\uFEFF" + [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  // Gera um nome de arquivo com timestamp legível
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  link.download = `os_export_${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // Libera a URL do blob
}