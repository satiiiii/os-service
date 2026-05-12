// src/services/supabase.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://ndtyelliljvwrlmmljbx.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_evUrLvlX-BU3ajLg4zJ-aw_AXun2mxf"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const STORAGE_BUCKET = 'os-attachments'

// ========== FUNÇÕES PARA OS ==========
export async function getOS() {
  const { data, error } = await supabase
    .from('os')
    .select('*')
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data || []).map(os => ({
    ...os,
    desc: os.descricao || '',
    local: os.localizacao || ''
  }))
}

export async function createOS(os) {
  const osParaBanco = {
    num: os.num,
    titulo: os.titulo,
    dept: os.dept,
    localizacao: os.local || os.localizacao,
    descricao: os.desc || '',
    situacao: os.situacao,
    status: os.status,
    prio: os.prio,
    turno: os.turno,
    solicitante: os.solicitante,
    tecnico: os.tecnico,
    criado_em: os.criado_em || Date.now(),
    data_programada: os.data_programada,
    data_conclusao: os.data_conclusao || null,
    equipamento_tag: os.equipamento_tag || '',
    equipamento_nome: os.equipamento_nome || '',
    celula: os.celula || '',
    predio: os.predio || '',
    historico: os.historico || [],
    // NOVOS CAMPOS
    tipo_manutencao: os.tipo_manutencao || null,
    horimetro_inicio: os.horimetro_inicio || null,
  }
  const { data, error } = await supabase.from('os').insert([osParaBanco]).select()
  if (error) throw error
  return data[0] ? { ...data[0], desc: data[0].descricao, local: data[0].localizacao } : os
}

export async function updateOS(id, updates) {
  const updatesBanco = {}
  if (updates.titulo !== undefined) updatesBanco.titulo = updates.titulo
  if (updates.dept !== undefined) updatesBanco.dept = updates.dept
  if (updates.local !== undefined) updatesBanco.localizacao = updates.local
  if (updates.desc !== undefined) updatesBanco.descricao = updates.desc
  if (updates.situacao !== undefined) updatesBanco.situacao = updates.situacao
  if (updates.status !== undefined) updatesBanco.status = updates.status
  if (updates.prio !== undefined) updatesBanco.prio = updates.prio
  if (updates.turno !== undefined) updatesBanco.turno = updates.turno
  if (updates.tecnico !== undefined) updatesBanco.tecnico = updates.tecnico
  if (updates.data_conclusao !== undefined) updatesBanco.data_conclusao = updates.data_conclusao
  if (updates.historico !== undefined) updatesBanco.historico = updates.historico
  // NOVOS CAMPOS
  if (updates.tipo_manutencao !== undefined) updatesBanco.tipo_manutencao = updates.tipo_manutencao
  if (updates.custo_pecas !== undefined) updatesBanco.custo_pecas = updates.custo_pecas
  if (updates.custo_mao_obra !== undefined) updatesBanco.custo_mao_obra = updates.custo_mao_obra
  if (updates.tempo_parada !== undefined) updatesBanco.tempo_parada = updates.tempo_parada
  if (updates.tempo_manutencao !== undefined) updatesBanco.tempo_manutencao = updates.tempo_manutencao
  if (updates.horimetro_inicio !== undefined) updatesBanco.horimetro_inicio = updates.horimetro_inicio
  if (updates.horimetro_fim !== undefined) updatesBanco.horimetro_fim = updates.horimetro_fim
  if (updates.custo_aprovado_por !== undefined) updatesBanco.custo_aprovado_por = updates.custo_aprovado_por
  if (updates.custo_aprovado_em !== undefined) updatesBanco.custo_aprovado_em = updates.custo_aprovado_em

  const { data, error } = await supabase.from('os').update(updatesBanco).eq('id', id).select()
  if (error) throw error
  return data[0] ? { ...data[0], desc: data[0].descricao, local: data[0].localizacao } : updates
}

export async function deleteOS(id) {
  const { error } = await supabase.from('os').delete().eq('id', id)
  if (error) throw error
  return true
}

// ========== APONTAMENTOS ==========
export async function criarApontamento(apontamento) {
  const { data, error } = await supabase
    .from('apontamentos_os')
    .insert([apontamento])
    .select()
  if (error) throw error
  return data[0]
}

export async function getApontamentosPorOS(osId) {
  const { data, error } = await supabase
    .from('apontamentos_os')
    .select('*')
    .eq('os_id', osId)
    .order('timestamp', { ascending: true })
  if (error) throw error
  return data || []
}

// ========== FUNÇÕES PARA USUÁRIOS (inalteradas) ==========
export async function getUsers() {
  const { data, error } = await supabase.from('usuarios').select('*').order('id')
  if (error) throw error
  return data || []
}

export async function getUserByRA(ra) {
  const { data, error } = await supabase.from('usuarios').select('*').eq('ra', ra).maybeSingle()
  if (error) throw error
  return data
}

export async function createUser(user) {
  const { data, error } = await supabase.from('usuarios').insert([user]).select()
  if (error) throw error
  return data[0]
}

export async function updateUser(id, updates) {
  const { data, error } = await supabase.from('usuarios').update(updates).eq('id', id).select()
  if (error) throw error
  return data[0]
}

export async function deleteUser(id) {
  const { error } = await supabase.from('usuarios').delete().eq('id', id)
  if (error) throw error
  return true
}

// ========== FUNÇÕES PARA LOGS ==========
export async function createLog(log) {
  const { error } = await supabase.from('logs_acesso').insert([log])
  if (error) console.error(error)
}

export async function getLogs(limit = 100) {
  const { data, error } = await supabase.from('logs_acesso').select('*').order('timestamp', { ascending: false }).limit(limit)
  if (error) throw error
  return data || []
}

// ========== REAL TIME ==========
export function subscribeToOS(callback) {
  const subscription = supabase
    .channel('os_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'os' }, payload => {
      callback(payload)
    })
    .subscribe()
  return subscription
}