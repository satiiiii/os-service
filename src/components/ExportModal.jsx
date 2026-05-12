// src/components/ExportModal.jsx
import React, { useState } from 'react';
import { exportToAdvancedExcel } from '../utils/excelExportUtils';
import { exportarPDF, exportarXLSX } from '../utils/exportUtils';
import { addNotification, NOTIF_TYPES } from '../utils/notifications';
import { DEPTS, PRIORIDADES, TURNOS, STATUS_LIST } from '../data/constants';

export default function ExportModal({ osList, onClose }) {
  const [format, setFormat] = useState('excel');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTurnos, setSelectedTurnos] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedPrios, setSelectedPrios] = useState([]);
  const [loading, setLoading] = useState(false);

  // Função para filtrar OS
  const filterOS = () => {
    let filtered = [...osList];

    if (dateRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      filtered = filtered.filter(os => os.criadoEm >= start && os.criadoEm <= end);
    } else if (dateRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = filtered.filter(os => os.criadoEm >= today.getTime() && os.criadoEm < tomorrow.getTime());
    } else if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(os => os.criadoEm >= weekAgo.getTime());
    } else if (dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(os => os.criadoEm >= monthAgo.getTime());
    }

    if (selectedTurnos.length > 0) {
      filtered = filtered.filter(os => selectedTurnos.includes(os.turno));
    }

    if (selectedStatus.length > 0) {
      filtered = filtered.filter(os => selectedStatus.includes(os.status));
    }

    if (selectedDepts.length > 0) {
      filtered = filtered.filter(os => selectedDepts.includes(os.dept));
    }

    if (selectedPrios.length > 0) {
      filtered = filtered.filter(os => selectedPrios.includes(os.prio));
    }

    return filtered;
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const filtered = filterOS();
      
      if (filtered.length === 0) {
        addNotification('Nenhum dado para exportar', 'Não há OS que correspondam aos filtros selecionados.', NOTIF_TYPES.WARNING);
        setLoading(false);
        return;
      }

      const filename = `os_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;

      if (format === 'excel') {
        const stats = {
          total: filtered.length,
          abertas: filtered.filter(o => o.status === 'Aberta').length,
          andamento: filtered.filter(o => o.status === 'Em andamento').length,
          concluidas: filtered.filter(o => o.status === 'Concluída').length,
          recusadas: filtered.filter(o => o.status === 'Recusada').length,
          txConclusao: filtered.length ? Math.round((filtered.filter(o => o.status === 'Concluída').length / filtered.length) * 100) : 0,
          txRecusa: filtered.length ? Math.round((filtered.filter(o => o.status === 'Recusada').length / filtered.length) * 100) : 0,
          porDept: [...new Set(filtered.map(o => o.dept))].map(d => ({ 
            dept: d, 
            total: filtered.filter(o => o.dept === d).length 
          })),
          porPrio: ['Urgente', 'Normal', 'Baixa'].map(p => ({ 
            prio: p, 
            count: filtered.filter(o => o.prio === p).length 
          }))
        };
        
        await exportToAdvancedExcel(filtered, stats, filename);
        addNotification('Exportação concluída!', `${filtered.length} OS exportadas com sucesso!`, NOTIF_TYPES.SUCCESS);
      } else if (format === 'pdf') {
        exportToPDF(filtered, `Relatório de OS - ${new Date().toLocaleDateString('pt-BR')}`);
        addNotification('PDF gerado!', `Relatório PDF com ${filtered.length} OS gerado com sucesso!`, NOTIF_TYPES.SUCCESS);
      } else if (format === 'json') {
        exportToJSON(filtered, filename);
        addNotification('Backup criado!', `Arquivo JSON com ${filtered.length} OS salvo com sucesso!`, NOTIF_TYPES.SUCCESS);
      }
      
      onClose();
    } catch (error) {
      console.error(error);
      addNotification('Erro na exportação', 'Ocorreu um erro ao gerar o arquivo.', NOTIF_TYPES.ERROR);
    }
    setLoading(false);
  };

  const totalAfterFilter = filterOS().length;

  // Ícone e cor para cada formato
  const getFormatIcon = () => {
    switch(format) {
      case 'excel': return '📊';
      case 'pdf': return '📄';
      case 'json': return '💾';
      default: return '📁';
    }
  };

  const getFormatColor = () => {
    switch(format) {
      case 'excel': return '#0f6e56';
      case 'pdf': return '#a32d2d';
      case 'json': return '#854f0b';
      default: return '#0c447c';
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <span className="modal-title">
            <i className="ti ti-download" style={{ marginRight: 6 }}></i>
            Exportar Dados
          </span>
          <button className="btn btn-sm" onClick={onClose}>
            <i className="ti ti-x"></i>
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Formato de exportação */}
          <div className="form-group">
            <label className="form-label">🎯 Formato de Exportação</label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '10px 16px',
                background: format === 'excel' ? '#eaf3de' : '#f5f5f0',
                borderRadius: '8px',
                cursor: 'pointer',
                border: format === 'excel' ? '2px solid #0f6e56' : '1px solid #e5e5e0',
                flex: 1
              }}>
                <input 
                  type="radio" 
                  name="format" 
                  value="excel" 
                  checked={format === 'excel'}
                  onChange={(e) => setFormat(e.target.value)}
                  style={{ marginRight: '4px' }}
                />
                <span style={{ fontSize: '20px' }}>📊</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Excel</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Dashboard colorido + 7 abas</div>
                </div>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '10px 16px',
                background: format === 'pdf' ? '#fcebeb' : '#f5f5f0',
                borderRadius: '8px',
                cursor: 'pointer',
                border: format === 'pdf' ? '2px solid #a32d2d' : '1px solid #e5e5e0',
                flex: 1
              }}>
                <input 
                  type="radio" 
                  name="format" 
                  value="pdf" 
                  checked={format === 'pdf'}
                  onChange={(e) => setFormat(e.target.value)}
                  style={{ marginRight: '4px' }}
                />
                <span style={{ fontSize: '20px' }}>📄</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>PDF</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Documento para impressão</div>
                </div>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '10px 16px',
                background: format === 'json' ? '#faeeda' : '#f5f5f0',
                borderRadius: '8px',
                cursor: 'pointer',
                border: format === 'json' ? '2px solid #854f0b' : '1px solid #e5e5e0',
                flex: 1
              }}>
                <input 
                  type="radio" 
                  name="format" 
                  value="json" 
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value)}
                  style={{ marginRight: '4px' }}
                />
                <span style={{ fontSize: '20px' }}>💾</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>JSON</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Backup dos dados</div>
                </div>
              </label>
            </div>
          </div>

          <hr style={{ margin: '16px 0', borderColor: '#e5e5e0' }} />

          {/* Filtro por período */}
          <div className="form-group">
            <label className="form-label">📅 Período de Criação</label>
            <select 
              className="form-input" 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">Todas as OS</option>
              <option value="today">Hoje</option>
              <option value="week">Últimos 7 dias</option>
              <option value="month">Últimos 30 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data inicial</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Data final</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                />
              </div>
            </div>
          )}

          {/* Filtro por turno */}
          <div className="form-group">
            <label className="form-label">🕐 Turno</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {TURNOS.map(turno => (
                <label key={turno.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedTurnos.includes(turno.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTurnos([...selectedTurnos, turno.id]);
                      } else {
                        setSelectedTurnos(selectedTurnos.filter(t => t !== turno.id));
                      }
                    }}
                  />
                  {turno.nome}
                </label>
              ))}
            </div>
          </div>

          {/* Filtro por status */}
          <div className="form-group">
            <label className="form-label">📊 Status</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {STATUS_LIST.map(status => (
                <label key={status} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedStatus.includes(status)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStatus([...selectedStatus, status]);
                      } else {
                        setSelectedStatus(selectedStatus.filter(s => s !== status));
                      }
                    }}
                  />
                  {status}
                </label>
              ))}
            </div>
          </div>

          {/* Filtro por departamento */}
          <div className="form-group">
            <label className="form-label">🏢 Departamento</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {DEPTS.slice(0, 8).map(dept => (
                <label key={dept} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedDepts.includes(dept)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDepts([...selectedDepts, dept]);
                      } else {
                        setSelectedDepts(selectedDepts.filter(d => d !== dept));
                      }
                    }}
                  />
                  {dept}
                </label>
              ))}
            </div>
          </div>

          {/* Filtro por prioridade */}
          <div className="form-group">
            <label className="form-label">⚠️ Prioridade</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {PRIORIDADES.map(prio => (
                <label key={prio} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedPrios.includes(prio)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPrios([...selectedPrios, prio]);
                      } else {
                        setSelectedPrios(selectedPrios.filter(p => p !== prio));
                      }
                    }}
                  />
                  {prio}
                </label>
              ))}
            </div>
          </div>

          {/* Preview do que será gerado */}
          {format === 'excel' && (
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              padding: '16px', 
              borderRadius: '12px', 
              marginTop: '16px',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                🎉 O que você vai receber no Excel:
              </div>
              <ul style={{ marginLeft: '20px', fontSize: '12px', lineHeight: '1.6' }}>
                <li>📊 Dashboard executivo colorido</li>
                <li>🏆 Ranking de performance dos técnicos</li>
                <li>📈 Análise por status, departamento e prioridade</li>
                <li>🔥 Destaque para OS urgentes</li>
                <li>📅 Resumo do mês atual</li>
                <li>✅ Indicadores com metas e avaliações</li>
              </ul>
            </div>
          )}

          {format === 'pdf' && (
            <div style={{ 
              background: 'linear-gradient(135deg, #a32d2d 0%, #e74c3c 100%)', 
              padding: '16px', 
              borderRadius: '12px', 
              marginTop: '16px',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                📄 O PDF será gerado com:
              </div>
              <ul style={{ marginLeft: '20px', fontSize: '12px', lineHeight: '1.6' }}>
                <li>Relatório formatado para impressão</li>
                <li>Tabela completa com todas as OS</li>
                <li>Resumo estatístico no cabeçalho</li>
                <li>Design limpo e profissional</li>
                <li>Pronto para enviar por email</li>
              </ul>
            </div>
          )}

          {format === 'json' && (
            <div style={{ 
              background: 'linear-gradient(135deg, #854f0b 0%, #f39c12 100%)', 
              padding: '16px', 
              borderRadius: '12px', 
              marginTop: '16px',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                💾 Backup JSON inclui:
              </div>
              <ul style={{ marginLeft: '20px', fontSize: '12px', lineHeight: '1.6' }}>
                <li>Dados completos de todas as OS</li>
                <li>Timestamp da exportação</li>
                <li>Formato padronizado para importação</li>
                <li>Ideal para restaurar dados</li>
              </ul>
            </div>
          )}

          {/* Resumo final */}
          <div style={{ 
            background: '#f0f0ea', 
            padding: '12px', 
            borderRadius: '8px', 
            marginTop: '16px',
            fontSize: '13px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Total a ser exportado</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: getFormatColor() }}>
              {totalAfterFilter}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>{getFormatIcon()} Formato {format.toUpperCase()}</div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button 
            className="btn btn-primary" 
            onClick={handleExport} 
            disabled={loading || totalAfterFilter === 0}
            style={{ 
              background: getFormatColor(), 
              borderColor: getFormatColor(),
              minWidth: '140px',
              justifyContent: 'center'
            }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: '14px', height: '14px' }}></div> Gerando...</>
            ) : (
              <><i className="ti ti-download"></i> Exportar {totalAfterFilter} OS</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}