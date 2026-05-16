const equipamentos = [
 
// Situações iniciais para a OS
export const SITUACOES_INICIAIS = [
  "Máquina Parada por Quebra",
  "Trabalho Deficiente",
  "Trabalhando",
  "Liberada p/ Manutenção"
];

// Função para obter células únicas (baseado no campo "CÉLULA")
export const getUniqueCelulas = () => {
  const celulas = [...new Set(equipamentos.map(e => e["CÉLULA"]))];
  return celulas.filter(c => c && c !== "").sort();
};

// Buscar equipamentos por célula
export const getEquipamentosByCelula = (celula) => {
  return equipamentos.filter(e => e["CÉLULA"] === celula);
};

// Buscar equipamento por tag
export const getEquipamentoByTag = (tag) => {
  return equipamentos.find(e => e["TAG"] === tag);
};

// Exportar também o array original
export default equipamentos;
