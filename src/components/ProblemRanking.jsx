// src/components/ProblemRanking.jsx
// Componente que analisa as OS e exibe um ranking dos tipos de problema mais frequentes.
// A classificação é feita por palavras‑chave no título e descrição.
// Utilizado apenas por Admin e Gestor (controle de permissão feito no Dashboard).

import React, { useState, useEffect } from 'react';

export default function ProblemRanking({ os, currentUser }) {
  const [problems, setProblems] = useState([]);

  // Recalcula o ranking sempre que a lista de OS mudar
  useEffect(() => {
    if (os && os.length > 0) {
      analyzeProblems();
    }
  }, [os]);

  const analyzeProblems = () => {
    const problemMap = new Map();
    
    os.forEach(os => {
      // Junta título e descrição (se houver) para análise textual
      const text = `${os.titulo} ${os.desc || ''}`.toLowerCase();
      let categoria = 'Outros';
      
      // Palavras‑chave simples (pode ser expandido conforme necessidade)
      if (text.includes('vazamento') || text.includes('óleo')) categoria = 'Vazamento';
      else if (text.includes('elétrica') || text.includes('elétrico')) categoria = 'Falha Elétrica';
      else if (text.includes('motor')) categoria = 'Motor';
      else if (text.includes('injetora')) categoria = 'Injetora';
      else if (text.includes('compressor')) categoria = 'Compressor';
      
      // Incrementa contagem para a categoria
      problemMap.set(categoria, (problemMap.get(categoria) || 0) + 1);
    });
    
    // Converte o Map para array, ordena do maior para o menor e armazena no estado
    const sorted = Array.from(problemMap.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);
    
    setProblems(sorted);
  };

  return (
    <div className="card">
      <div style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-trophy" style={{ color: '#f39c12' }}></i>
        🏆 Ranking de Problemas
      </div>
      
      {problems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          Nenhum dado suficiente para análise
        </div>
      ) : (
        problems.map((problem, index) => (
          <div key={problem.nome} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>
                {index === 0 && '🥇 '}
                {index === 1 && '🥈 '}
                {index === 2 && '🥉 '}
                {problem.nome}
              </span>
              <span style={{ fontWeight: 'bold' }}>{problem.total} OS</span>
            </div>
            <div style={{ height: 8, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${(problem.total / problems[0].total) * 100}%`,
                height: '100%',
                // Cores diferenciadas para os três primeiros lugares
                background: index === 0 ? '#f39c12' : index === 1 ? '#bdc3c7' : index === 2 ? '#cd7f32' : '#0c447c',
                borderRadius: 4
              }}></div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}