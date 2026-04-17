import { CsvService, CepCoordenado } from './csv.service';

function criarServico(): CsvService {
  const svc = new CsvService();
  (svc as any).indice = new Map<string, CepCoordenado>();
  (svc as any).ordenadosPorLat = [];
  return svc;
}

function popularServico(svc: CsvService, registros: CepCoordenado[]): void {
  const indice = (svc as any).indice as Map<string, CepCoordenado>;
  const ordenados = [...registros].sort((a, b) => a.latitude - b.latitude);
  for (const r of ordenados) indice.set(r.cep, r);
  (svc as any).ordenadosPorLat = ordenados;
}

const fixture: CepCoordenado[] = [
  { cep: '01001000', latitude: -23.5329, longitude: -46.6395, cidade: 'Sao Paulo', uf: 'SP', bairro: 'Se', logradouro: 'Praca da Se' },
  { cep: '01001001', latitude: -23.5340, longitude: -46.6400, cidade: 'Sao Paulo', uf: 'SP', bairro: 'Se', logradouro: 'Rua A' },
  { cep: '20040020', latitude: -22.9068, longitude: -43.1729, cidade: 'Rio de Janeiro', uf: 'RJ', bairro: 'Centro', logradouro: 'Av Rio Branco' },
];

describe('CsvService', () => {
  let svc: CsvService;

  beforeEach(() => {
    svc = criarServico();
    popularServico(svc, fixture);
  });

  describe('obterPorCep', () => {
    it('retorna o registro quando o CEP existe', () => {
      const resultado = svc.obterPorCep('01001000');
      expect(resultado).toBeDefined();
      expect(resultado?.cep).toBe('01001000');
    });

    it('retorna undefined para CEP inexistente', () => {
      expect(svc.obterPorCep('00000000')).toBeUndefined();
    });
  });

  describe('buscarPorRaio', () => {
    it('retorna CEPs proximos dentro do raio informado', () => {
      const resultado = svc.buscarPorRaio(-23.5329, -46.6395, 1);
      const ceps = resultado.map((r) => r.cep);
      expect(ceps).toContain('01001000');
      expect(ceps).toContain('01001001');
    });

    it('nao retorna CEP de outra cidade fora do raio', () => {
      const resultado = svc.buscarPorRaio(-23.5329, -46.6395, 10);
      const ceps = resultado.map((r) => r.cep);
      expect(ceps).not.toContain('20040020');
    });

    it('raio menor retorna menos resultados que raio maior', () => {
      const pequeno = svc.buscarPorRaio(-23.5329, -46.6395, 0.5);
      const grande = svc.buscarPorRaio(-23.5329, -46.6395, 500);
      expect(grande.length).toBeGreaterThanOrEqual(pequeno.length);
    });

    it('retorna lista vazia quando nenhum CEP esta no raio', () => {
      const resultado = svc.buscarPorRaio(0, 0, 0.001);
      expect(resultado).toEqual([]);
    });

    it('raio abrangente retorna todos os registros', () => {
      const resultado = svc.buscarPorRaio(-23.5329, -46.6395, 500);
      expect(resultado.length).toBe(fixture.length);
    });
  });
});
