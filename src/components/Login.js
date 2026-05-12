// src/components/Login.js
// Componente de autenticação (login e registro). Permite acesso ao sistema com RA e senha.
// Usa as funções login/register do módulo auth.js (que integram com Supabase).
// O registro cria automaticamente usuários com perfil "Solicitante".

import React, { useState } from 'react';
import { login, register } from '../utils/auth';

export default function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);       // true = tela de login, false = tela de registro
  const [form, setForm] = useState({
    nome: '',
    ra: '',
    email: '',
    senha: '',
    confirmSenha: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Atualiza o estado do formulário conforme o usuário digita
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  // Envia o formulário (login ou registro)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isLogin) {
      // Tentativa de login
      const result = await login(form.ra, form.senha);
      if (result.success) {
        onLogin(result.user);               // passa o usuário para o App.js
      } else {
        setError(result.error);
      }
    } else {
      // Validações do registro
      if (form.senha !== form.confirmSenha) {
        setError('As senhas não coincidem');
        setLoading(false);
        return;
      }
      if (form.senha.length < 4) {
        setError('A senha deve ter pelo menos 4 caracteres');
        setLoading(false);
        return;
      }
      if (!form.ra) {
        setError('RA é obrigatório');
        setLoading(false);
        return;
      }
      // Registra usuário (sempre como Solicitante)
      const result = await register(form.nome, form.ra, form.email, form.senha);
      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '460px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Logo e título */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
          }}>
            <i className="ti ti-clipboard-list" style={{ fontSize: '32px', color: '#fff' }}></i>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            OS Manager
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            {isLogin ? 'Acesse sua conta com seu RA' : 'Crie sua conta gratuitamente'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Campos específicos do registro (nome) */}
          {!isLogin && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="ti ti-user" style={{ fontSize: '14px' }}></i>
                Nome completo
              </label>
              <input
                className="form-input"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                required
                placeholder="Digite seu nome completo"
                style={{ borderRadius: '12px' }}
              />
            </div>
          )}

          {/* RA (obrigatório para login e registro) */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-id" style={{ fontSize: '14px' }}></i>
              {isLogin ? 'RA' : 'RA (Registro Acadêmico)'}
            </label>
            <input
              className="form-input"
              type="text"
              name="ra"
              value={form.ra}
              onChange={handleChange}
              required
              placeholder="Ex: 2024001"
              style={{ borderRadius: '12px', fontFamily: 'monospace', fontSize: '15px' }}
            />
          </div>

          {/* Email (opcional, apenas no registro) */}
          {!isLogin && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="ti ti-mail" style={{ fontSize: '14px' }}></i>
                Email (opcional)
              </label>
              <input
                className="form-input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                style={{ borderRadius: '12px' }}
              />
            </div>
          )}

          {/* Senha */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-lock" style={{ fontSize: '14px' }}></i>
              Senha
            </label>
            <input
              className="form-input"
              type="password"
              name="senha"
              value={form.senha}
              onChange={handleChange}
              required
              placeholder={isLogin ? 'Digite sua senha' : 'Mínimo 4 caracteres'}
              style={{ borderRadius: '12px' }}
            />
          </div>

          {/* Confirmação de senha (apenas registro) */}
          {!isLogin && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="ti ti-lock" style={{ fontSize: '14px' }}></i>
                Confirmar senha
              </label>
              <input
                className="form-input"
                type="password"
                name="confirmSenha"
                value={form.confirmSenha}
                onChange={handleChange}
                required
                placeholder="Digite a senha novamente"
                style={{ borderRadius: '12px' }}
              />
            </div>
          )}

          {/* Exibição de erro, se houver */}
          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderLeft: '3px solid #dc2626'
            }}>
              <i className="ti ti-alert-circle"></i>
              {error}
            </div>
          )}

          {/* Botão principal (login ou criar conta) */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '20px',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(59, 130, 246, 0.3)';
            }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: '16px', height: '16px' }}></div> Processando...</>
            ) : (
              <><i className={`ti ti-${isLogin ? 'login' : 'user-plus'}`}></i> {isLogin ? 'Entrar' : 'Criar conta'}</>
            )}
          </button>
        </form>

        {/* Link para alternar entre login e registro */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setForm({ nome: '', ra: '', email: '', senha: '', confirmSenha: '' });
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}
          >
            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
          </button>
        </div>

        {/* Rodapé informativo (apenas login) */}
        {isLogin && (
          <div style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '11px',
            color: '#94a3b8',
            textAlign: 'center'
          }}>
            <p>Sistema de Ordens de Serviço</p>
            <p style={{ marginTop: '4px' }}>
              <i className="ti ti-shield"></i> Ambiente seguro
            </p>
          </div>
        )}
      </div>
    </div>
  );
}