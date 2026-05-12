// src/utils/auth.js
// Funções de autenticação usando Supabase (usuários, login, registro, logout).
// O registro sempre cria usuários com perfil "Solicitante". O Admin pode alterar perfis posteriormente.

import { getUsers, createUser, updateUser, createLog } from '../services/supabase';

// Lista de perfis válidos (RDP removido, pois o sistema agora é focado apenas em OS)
export const ROLES = ['Solicitante', 'Técnico', 'Gestor', 'Admin'];

// ========== FUNÇÕES AUXILIARES ==========

// Busca um usuário pelo RA (Registro Acadêmico) usando o Supabase.
// Otimizado: usa uma consulta direta em vez de baixar todos os usuários.
async function getUserByRA(ra) {
  const { supabase } = await import('../services/supabase');
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('ra', ra)
    .maybeSingle();
  if (error) {
    console.error('Erro ao buscar usuário por RA:', error);
    return null;
  }
  return data;
}

// ========== LOGIN ==========
export async function login(ra, senha) {
  try {
    const user = await getUserByRA(ra);
    if (!user) return { success: false, error: 'RA não encontrado' };
    if (user.senha !== senha) return { success: false, error: 'Senha incorreta' };
    if (user.ativo === false) return { success: false, error: 'Usuário desativado' };

    const { senha: _, ...userWithoutPassword } = user;
    localStorage.setItem('os_manager_current_user', JSON.stringify(userWithoutPassword));

    await createLog({
      usuario: user.nome,
      email: user.ra,
      acao: 'Login realizado',
      timestamp: Date.now()
    });

    return { success: true, user: userWithoutPassword };
  } catch (error) {
    console.error('Erro no login:', error);
    return { success: false, error: 'Erro ao fazer login' };
  }
}

// ========== REGISTRO (sempre como Solicitante) ==========
export async function register(nome, ra, email, senha) {
  try {
    const existing = await getUserByRA(ra);
    if (existing) return { success: false, error: 'RA já cadastrado' };

    const newUser = {
      nome,
      ra,
      email: email || `${ra}@sistema.com`,
      senha,
      role: 'Solicitante',   // perfil padrão
      ativo: true,
      criado_em: Date.now()
    };

    const user = await createUser(newUser);
    const { senha: _, ...userWithoutPassword } = user;
    localStorage.setItem('os_manager_current_user', JSON.stringify(userWithoutPassword));

    await createLog({
      usuario: user.nome,
      email: user.ra,
      acao: 'Registro realizado como Solicitante',
      timestamp: Date.now()
    });

    return { success: true, user: userWithoutPassword };
  } catch (error) {
    console.error('Erro no registro:', error);
    return { success: false, error: 'Erro ao criar usuário' };
  }
}

// ========== ADMIN: ALTERAR PERFIL DE UM USUÁRIO ==========
export async function updateUserRole(userId, newRole) {
  try {
    const currentUser = getCurrentUser();
    if (currentUser?.role !== 'Admin') {
      return { success: false, error: 'Apenas Admin pode alterar permissões' };
    }

    const result = await updateUser(userId, { role: newRole });

    await createLog({
      usuario: currentUser.nome,
      email: currentUser.ra,
      acao: `Alterou perfil do usuário ID ${userId} para ${newRole}`,
      timestamp: Date.now()
    });

    return { success: true, user: result };
  } catch (error) {
    console.error('Erro ao alterar perfil:', error);
    return { success: false, error: 'Erro ao alterar perfil' };
  }
}

// ========== LOGOUT ==========
export async function logout() {
  const user = getCurrentUser();
  if (user) {
    await createLog({
      usuario: user.nome,
      email: user.ra,
      acao: 'Logout realizado',
      timestamp: Date.now()
    });
  }
  localStorage.removeItem('os_manager_current_user');
}

// ========== USUÁRIO ATUAL ==========
export function getCurrentUser() {
  try {
    const user = localStorage.getItem('os_manager_current_user');
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

// ========== LISTAR TODOS OS USUÁRIOS (para Admin) ==========
export async function getUsersList() {
  try {
    return await getUsers();
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }
}

// ========== FUNÇÃO OBSOLETA (mantida para compatibilidade, mas não usada) ==========
export async function saveUsers(users) {
  // No sistema atual, os usuários são salvos diretamente pelo Supabase (createUser/updateUser).
  // Esta função é mantida apenas para evitar erros em componentes antigos.
  return users;
}

// Re-exporta getUsersList como getUsers (para compatibilidade com código existente)
export { getUsersList as getUsers };