// src/components/TimeByDept.jsx
// Componente que calcula e exibe o tempo médio de resolução (em dias) das OS concluídas,
// agrupado por departamento. Disponível apenas para Admin e Gestor (controle feito no Dashboard).

import React, { useState, useEffect } from 'react';

export default function TimeByDept({ os, currentUser }) {
  const [deptData, setDeptData] = useState([]);

  useEffect(() => {
    if (os && os.length > 0) {
      analyzeTimeByDept();
    }
  }, [os]);

  const analyzeTimeByDept = () => {
    const deptMap = new Map();
    
    os.forEach(os => {
      // Usa os nomes corretos dos campos no Supabase: criado_em e data_conclusao
      if (os.status === 'Concluída' && os.data_conclusao && os.criado_em && os.dept) {
        const tempoDias = (os.data_conclusao - os.criado_em) / (1000 * 60 * 60 * 24);
        
        if (!deptMap.has(os.dept)) {
          deptMap.set(os.dept, { totalTempo: 0, totalOS: 0 });
        }
        
        const data = deptMap.get(os.dept);
        data.totalTempo += tempoDias;
        data.totalOS++;
      }
    });
    
    const result = Array.from(deptMap.entries()).map(([dept, data]) => ({
      dept,
      tempoMedio: data.totalOS > 0 ? (data.totalTempo / data.totalOS).toFixed(1) : 0,
      totalOS: data.totalOS
    }));
    
    // Ordena do menor tempo médio para o maior (mais rápido primeiro)
    result.sort((a, b) => a.tempoMedio - b.tempoMedio);
    setDeptData(result);
  };

  // Determina a cor da barra com base no tempo médio em relação ao menor e maior tempo
  const getPerformanceColor = (tempo, minTempo, maxTempo) => {
    if (maxTempo === 0) return '#0f6e56'; // evita divisão por zero
    if (tempo <= minTempo * 1.2) return '#0f6e56';      // excelente (verde)
    if (tempo <= minTempo * 1.5) return '#2b7bc2';      // bom (azul)
    if (tempo <= minTempo * 2)   return '#854f0b';      // regular (laranja)
    return '#a32d2d';                                   // ruim (vermelho)
  };

  const minTempo = deptData.length > 0 ? Math.min(...deptData.map(d => d.tempoMedio)) : 0;
  const maxTempo = deptData.length > 0 ? Math.max(...deptData.map(d => d.tempoMedio)) : 0;

  return (
    <div className="card">
      <div style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-clock" style={{ color: '#0c447c' }}></i>
        ⏱️ Tempo Médio por Departamento (dias)
      </div>
      
      {deptData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          Nenhuma OS concluída para análise de tempo
        </div>
      ) : (
        deptData.map(dept => {
          // Calcula a largura da barra proporcional ao tempo médio (quanto maior o tempo, maior a barra)
          const widthPercent = maxTempo > 0 ? (dept.tempoMedio / maxTempo) * 100 : 0;
          return (
            <div key={dept.dept} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{dept.dept}</span>
                <span style={{ fontWeight: 'bold', color: getPerformanceColor(dept.tempoMedio, minTempo, maxTempo) }}>
                  {dept.tempoMedio} dias
                </span>
              </div>
              <div style={{ height: 8, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${widthPercent}%`,
                  height: '100%',
                  background: getPerformanceColor(dept.tempoMedio, minTempo, maxTempo),
                  borderRadius: 4
                }}></div>
              </div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{dept.totalOS} OS concluídas</div>
            </div>
          );
        })
      )}
    </div>
  );
}