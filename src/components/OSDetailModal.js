// src/components/OSDetailModal.js (versão atualizada)
import React, { useState } from 'react';
import { getBadgeClass, formatDate, formatDateShort, canAcceptOS, canRejectOS, canCompleteOS, canReopenOS, canCancelOS } from '../utils/helpers';
import { TURNOS } from '../data/constants';
import FileAttachments from './FileAttachments';
import { addNotification, NOTIF_TYPES } from '../utils/notifications';

export default function OSDetailModal({ os, onClose, onUpdate, role, userName }) {
  const [motivo, setMotivo] = useState('');
  const [nota, setNota] = useState('');
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  // Estados para os novos campos de conclusão
  const [showCustosModal, setShowCustosModal] = useState(false);
  const [custoPecas, setCustoPecas] = useState('');
  const [custoMaoObra, setCustoMaoObra] = useState('');
  const [tempoParada, setTempoParada] = useState('');
  const [tempoManutencao, setTempoManutencao] = useState('');
  const [horimetroFim, setHorimetroFim] = useState('');

  const getTurnoLabel = () => {
    const turno = TURNOS.find(t => t.id === os.turno);
    return turno ? `${turno.nome} (${turno.horario})` : '-';
  };

  const userMock = { role, nome: userName };
  const canAceitar = canAcceptOS(userMock, os);
  const canRecusar = canRejectOS(userMock, os);
  const canConcluir = canCompleteOS(userMock, os);
  const canReabrir = canReopenOS(userMock, os);
  const canCancelar = canCancelOS(userMock, os);
  const hasActions = canAceitar || canRecusar || canConcluir || canReabrir || canCancelar;

  // PRIMEIRA AÇÃO: clicar em "Concluir OS" abre modal de custos
  const handleConcluirClick = () => {
    setShowCustosModal(true);
  };

  // SEGUNDA AÇÃO: confirmar conclusão com os dados preenchidos
  const confirmarConclusao = () => {
    if (os.tipo_manutencao === 'CORRETIVA') {
      if (!custoPecas && !custoMaoObra) {
        addNotification('Dados obrigatórios', 'Informe ao menos um custo (peças ou mão de obra) para OS corretiva.', NOTIF_TYPES.WARNING);
        return;
      }
      if (!tempoParada) {
        addNotification('Dados obrigatórios', 'Informe o tempo de parada do equipamento.', NOTIF_TYPES.WARNING);
        return;
      }
    }
    if (!horimetroFim && os.horimetro_inicio) {
      addNotification('Horímetro final', 'Informe o horímetro final para cálculo de MTBF/MTTF.', NOTIF_TYPES.WARNING);
      return;
    }
    // Chama a função que realmente conclui a OS
    action('concluir', {
      custo_pecas: parseFloat(custoPecas) || 0,
      custo_mao_obra: parseFloat(custoMaoObra) || 0,
      tempo_parada: parseFloat(tempoParada) || 0,
      tempo_manutencao: parseFloat(tempoManutencao) || 0,
      horimetro_fim: horimetroFim ? parseFloat(horimetroFim) : null,
    });
    setShowCustosModal(false);
  };

  function action(type, custos = {}) {
    const ts = Date.now();
    let update = { atualizadoEm: ts };
    let entrada = '';

    if (type === 'aceitar') {
      update.status = 'Em andamento';
      update.tecnico = userName;
      entrada = 'Aceita por ' + userName;
      addNotification('✅ OS em Andamento', `A OS ${os.num} foi aceita por ${userName}`, NOTIF_TYPES.INFO, null, os.id);
    } else if (type === 'recusar') {
      update.status = 'Recusada';
      entrada = 'Recusada' + (motivo ? ': ' + motivo : '');
      addNotification('❌ OS Recusada', `A OS ${os.num} foi recusada`, NOTIF_TYPES.WARNING, null, os.id);
    } else if (type === 'concluir') {
      update.status = 'Concluída';
      update.data_conclusao = ts;
      // Incluir os campos de custo e tempo
      update.custo_pecas = custos.custo_pecas;
      update.custo_mao_obra = custos.custo_mao_obra;
      update.custo_total = custos.custo_pecas + custos.custo_mao_obra;
      update.tempo_parada = custos.tempo_parada;
      update.tempo_manutencao = custos.tempo_manutencao;
      update.horimetro_fim = custos.horimetro_fim;
      update.custo_aprovado_por = userName;
      update.custo_aprovado_em = ts;
      entrada = 'OS concluída' + (nota ? ' — Obs: ' + nota : '');
      addNotification('🎉 OS Concluída', `A OS ${os.num} foi concluída com sucesso!`, NOTIF_TYPES.SUCCESS, null, os.id);
    } else if (type === 'reabrir') {
      update.status = 'Aberta';
      update.tecnico = null;
      update.data_conclusao = null;
      entrada = 'Reaberta por ' + userName;
      addNotification('🔄 OS Reaberta', `A OS ${os.num} foi reaberta por ${userName}`, NOTIF_TYPES.WARNING, null, os.id);
    } else if (type === 'cancelar') {
      update.status = 'Recusada';
      entrada = 'Cancelada por ' + userName + (motivoCancelamento ? ': ' + motivoCancelamento : '');
      addNotification('⛔ OS Cancelada', `A OS ${os.num} foi cancelada`, NOTIF_TYPES.ERROR, null, os.id);
    }

    const historico = [...os.historico, { acao: entrada, autor: userName, ts }];
    onUpdate({ ...os, ...update, historico });
  }

  // ... (restante do componente inalterado até o return)

  return (
    <>
      {/* Modal principal (exibição da OS) - igual ao original */}
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal">
          {/* ... conteúdo existente ... */}
          <div className="modal-footer">
            <button className="btn" onClick={onClose}>Fechar</button>
            {canConcluir && <button className="btn btn-success" onClick={handleConcluirClick}>Concluir OS</button>}
            {canAceitar && <button className="btn btn-primary" onClick={() => action('aceitar')}>Aceitar OS</button>}
            {canRecusar && <button className="btn btn-danger" onClick={() => action('recusar')}>Recusar</button>}
            {canReabrir && <button className="btn btn-warning" onClick={() => action('reabrir')}>Reabrir OS</button>}
            {canCancelar && <button className="btn btn-danger" onClick={() => action('cancelar')}>Cancelar OS</button>}
          </div>
        </div>
      </div>

      {/* Modal de custos e tempos (aparece ao clicar em Concluir) */}
      {showCustosModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCustosModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <span className="modal-title">Informações de conclusão</span>
              <button className="btn btn-sm" onClick={() => setShowCustosModal(false)}><i className="ti ti-x"></i></button>
            </div>
            <div className="modal-body">
              <p><strong>OS:</strong> {os.num} - {os.titulo}</p>
              <p><strong>Tipo de manutenção:</strong> {os.tipo_manutencao === 'PREVENTIVA' ? 'Preventiva' : 'Corretiva'}</p>
              <hr />
              <div className="form-group">
                <label>Custo de peças (R$)</label>
                <input type="number" step="0.01" className="form-input" value={custoPecas} onChange={e => setCustoPecas(e.target.value)} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label>Custo de mão de obra (R$)</label>
                <input type="number" step="0.01" className="form-input" value={custoMaoObra} onChange={e => setCustoMaoObra(e.target.value)} placeholder="0,00" />
              </div>
              {os.tipo_manutencao === 'CORRETIVA' && (
                <div className="form-group">
                  <label>Tempo de parada do equipamento (horas) *</label>
                  <input type="number" step="0.5" className="form-input" value={tempoParada} onChange={e => setTempoParada(e.target.value)} placeholder="Ex: 2.5" required />
                </div>
              )}
              <div className="form-group">
                <label>Tempo de manutenção efetiva (horas)</label>
                <input type="number" step="0.5" className="form-input" value={tempoManutencao} onChange={e => setTempoManutencao(e.target.value)} placeholder="Horas trabalhadas" />
              </div>
              <div className="form-group">
                <label>Horímetro final (horas)</label>
                <input type="number" step="0.1" className="form-input" value={horimetroFim} onChange={e => setHorimetroFim(e.target.value)} placeholder={os.horimetro_inicio ? `Inicial: ${os.horimetro_inicio}` : ''} />
              </div>
              <div className="form-group">
                <label>Observação adicional (opcional)</label>
                <input type="text" className="form-input" value={nota} onChange={e => setNota(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowCustosModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarConclusao}>Confirmar conclusão</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}