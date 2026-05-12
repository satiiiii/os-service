// src/components/NovaOSModal.js
// Modal para criação de nova OS em duas etapas:
// 1. Seleção de célula/setor e equipamento (lista de equipamentos pré‑cadastrada)
// 2. Preenchimento dos detalhes da OS (título, situação, departamento, turno, data, localização, descrição)
//    + campos para Tipo de Manutenção e Horímetro Inicial

import React, { useState, useEffect } from 'react';
import { DEPTS, TURNOS } from '../data/constants';
import { equipamentos, getUniqueCelulas, getEquipamentosByCelula, SITUACOES_INICIAIS } from '../data/equipamentos';

// Opções fixas de localização
const LOCALIZACOES = [
  "Planta 1",
  "Planta 2",
  "Planta 3",
  "Baia usinagem",
  "Baia Ferramental",
  "Ferramentaria",
  "Área Externa",
];

export default function NovaOSModal({ onClose, onSave }) {
  const [step, setStep] = useState(1);                       // 1 = selecionar equipamento, 2 = detalhes OS
  const [selectedEquipamento, setSelectedEquipamento] = useState(null);
  const [celulas, setCelulas] = useState([]);               // lista de células únicas
  const [equipamentosFiltrados, setEquipamentosFiltrados] = useState([]);
  const [buscaEquip, setBuscaEquip] = useState('');
  
  // Estado do formulário da OS (dados finais)
  const [form, setForm] = useState({
    titulo: '',
    situacao: '',
    dept: '',
    turno: '',
    dataProgramada: '',
    localizacao: '',
    desc: '',
    equipamentoTag: '',
    equipamentoNome: '',
    celula: '',
    // NOVOS CAMPOS
    tipoManutencao: '',
    horimetroInicio: '',
  });

  // Carrega a lista de células disponíveis a partir da base de equipamentos
  useEffect(() => {
    const uniqueCelulas = getUniqueCelulas();
    setCelulas(uniqueCelulas);
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Quando a célula é selecionada, filtra os equipamentos daquela célula
  const handleCelulaChange = (celula) => {
    set('celula', celula);
    const equipamentosDaCelula = getEquipamentosByCelula(celula);
    setEquipamentosFiltrados(equipamentosDaCelula);
    setSelectedEquipamento(null);
    set('equipamentoTag', '');
    set('equipamentoNome', '');
    setBuscaEquip('');
  };

  // Ao escolher um equipamento, avança para a etapa 2 com os dados preenchidos
  const handleEquipamentoSelect = (eq) => {
    setSelectedEquipamento(eq);
    set('equipamentoTag', eq["TAG"]);
    set('equipamentoNome', eq["EQUIPAMENTO"]);
    set('predio', eq["PRÉDIO"] || '');
    setStep(2);
  };

  // Filtro dos equipamentos por texto (nome ou tag)
  const equipamentosFiltradosBusca = equipamentosFiltrados.filter(eq =>
    eq["EQUIPAMENTO"].toLowerCase().includes(buscaEquip.toLowerCase()) ||
    eq["TAG"].toLowerCase().includes(buscaEquip.toLowerCase())
  );

  // Verifica se todos os campos obrigatórios da OS estão preenchidos
  const canSubmit = form.titulo && 
                    form.situacao && 
                    form.dept && 
                    form.turno && 
                    form.dataProgramada && 
                    form.localizacao &&
                    form.tipoManutencao;  // tipo de manutenção agora é obrigatório

  // PASSO 1 - SELECIONAR EQUIPAMENTO
  if (step === 1) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: '700px' }}>
          <div className="modal-header">
            <span className="modal-title">
              <i className="ti ti-building-factory"></i> Selecionar Equipamento
            </span>
            <button className="btn btn-sm" onClick={onClose}><i className="ti ti-x"></i></button>
          </div>

          <div className="modal-body">
            {/* Indicador de progresso */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#0c447c', color: 'white', borderRadius: '8px' }}>
                <span style={{ fontSize: '12px' }}>1️⃣ Selecionar Equipamento</span>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#f0f0ea', borderRadius: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>2️⃣ Detalhes da OS</span>
              </div>
            </div>

            {/* Seletor de célula */}
            <div className="form-group">
              <label className="form-label">📍 Selecione a Célula / Setor *</label>
              <select className="form-input" onChange={(e) => handleCelulaChange(e.target.value)} defaultValue="">
                <option value="" disabled>Selecione uma célula...</option>
                {celulas.map(celula => <option key={celula} value={celula}>{celula}</option>)}
              </select>
            </div>

            {/* Campo de busca dentro da célula selecionada */}
            {equipamentosFiltrados.length > 0 && (
              <div className="form-group">
                <label className="form-label">🔍 Buscar equipamento</label>
                <input className="form-input" placeholder="Digite o nome do equipamento ou tag..." value={buscaEquip} onChange={(e) => setBuscaEquip(e.target.value)} />
              </div>
            )}

            {/* Listagem de equipamentos */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {equipamentosFiltradosBusca.length === 0 ? (
                <div className="empty" style={{ padding: '30px' }}>
                  <i className="ti ti-search"></i>
                  <div>Nenhum equipamento encontrado</div>
                </div>
              ) : (
                equipamentosFiltradosBusca.map(eq => (
                  <div
                    key={eq["TAG"]}
                    onClick={() => handleEquipamentoSelect(eq)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid #e5e5e0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: selectedEquipamento?.["TAG"] === eq["TAG"] ? '#e6f1fb' : 'white'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0ea'}
                    onMouseLeave={(e) => e.currentTarget.style.background = selectedEquipamento?.["TAG"] === eq["TAG"] ? '#e6f1fb' : 'white'}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{eq["EQUIPAMENTO"]}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Tag: {eq["TAG"]} | Descrição: {eq["DESCRIÇÃO"]?.substring(0, 50)}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>Célula: {eq["CÉLULA"]} | Status: {eq["STATUS"]}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  // PASSO 2 - DETALHES DA OS (com novos campos)
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <span className="modal-title"><i className="ti ti-clipboard-list"></i> Nova Ordem de Serviço</span>
          <button className="btn btn-sm" onClick={() => setStep(1)} style={{ marginRight: '8px' }}><i className="ti ti-arrow-left"></i> Voltar</button>
          <button className="btn btn-sm" onClick={onClose}><i className="ti ti-x"></i></button>
        </div>

        <div className="modal-body">
          {/* Indicador de progresso */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#f0f0ea', borderRadius: '8px', border: 'none', cursor: 'pointer' }} onClick={() => setStep(1)}>
              <span style={{ fontSize: '12px' }}>1️⃣ Selecionar Equipamento</span>
            </button>
            <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#0c447c', color: 'white', borderRadius: '8px' }}>
              <span style={{ fontSize: '12px' }}>2️⃣ Detalhes da OS</span>
            </div>
          </div>

          {/* Resumo do equipamento selecionado */}
          {selectedEquipamento && (
            <div style={{ background: '#e6f1fb', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>📌 Equipamento selecionado:</div>
              <div><strong>{selectedEquipamento["EQUIPAMENTO"]}</strong></div>
              <div style={{ fontSize: '12px', color: '#555' }}>Tag: {selectedEquipamento["TAG"]} | Célula: {form.celula}</div>
            </div>
          )}

          {/* Campos do formulário */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tag do Equipamento *</label>
              <input className="form-input" value={form.equipamentoTag} disabled style={{ background: '#f0f0ea', cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Célula *</label>
              <input className="form-input" value={form.celula} disabled style={{ background: '#f0f0ea', cursor: 'not-allowed' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Título da OS *</label>
            <input className="form-input" placeholder="Ex: Quebra na máquina, vazamento, etc..." value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
          </div>

          {/* NOVO CAMPO: Tipo de Manutenção */}
          <div className="form-group">
            <label className="form-label">Tipo de Manutenção *</label>
            <select 
              className="form-input" 
              value={form.tipoManutencao} 
              onChange={(e) => set('tipoManutencao', e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              <option value="PREVENTIVA">Preventiva</option>
              <option value="CORRETIVA">Corretiva</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Situação Inicial *</label>
              <select className="form-input" value={form.situacao} onChange={(e) => set('situacao', e.target.value)} required>
                <option value="" disabled>Selecione uma situação...</option>
                {SITUACOES_INICIAIS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Departamento *</label>
              <select className="form-input" value={form.dept} onChange={(e) => set('dept', e.target.value)} required>
                <option value="" disabled>Selecione um departamento...</option>
                {DEPTS.map((d) => (<option key={d} value={d}>{d}</option>))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Turno *</label>
              <select className="form-input" value={form.turno} onChange={(e) => set('turno', parseInt(e.target.value))} required>
                <option value="" disabled>Selecione um turno...</option>
                {TURNOS.map((t) => (<option key={t.id} value={t.id}>{t.nome} ({t.horario})</option>))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data Programada *</label>
              <input type="date" className="form-input" value={form.dataProgramada} onChange={(e) => set('dataProgramada', e.target.value)} required />
            </div>
          </div>

          {/* NOVO CAMPO: Horímetro Inicial */}
          <div className="form-group">
            <label className="form-label">Horímetro Inicial (horas)</label>
            <input 
              type="number" 
              step="0.1" 
              className="form-input" 
              placeholder="Ex: 15230.5"
              value={form.horimetroInicio}
              onChange={(e) => set('horimetroInicio', e.target.value)}
            />
            <small style={{ fontSize: '11px', color: '#666' }}>Leitura do horímetro no momento da abertura da OS</small>
          </div>

          <div className="form-group">
            <label className="form-label">Localização *</label>
            <select className="form-input" value={form.localizacao} onChange={(e) => set('localizacao', e.target.value)} required>
              <option value="" disabled>Selecione a localização...</option>
              {LOCALIZACOES.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Descrição detalhada (opcional)</label>
            <textarea className="form-input form-textarea" placeholder="Descreva o problema com o máximo de detalhes possível..." value={form.desc} onChange={(e) => set('desc', e.target.value)} rows={6} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={() => setStep(1)}>Voltar</button>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!canSubmit} onClick={() => {
            // Converte horimetroInicio para número ou null
            const horimetro = form.horimetroInicio ? parseFloat(form.horimetroInicio) : null;
            onSave({ ...form, horimetroInicio: horimetro });
          }}>
            <i className="ti ti-send"></i> Abrir OS
          </button>
        </div>
      </div>
    </div>
  );
}