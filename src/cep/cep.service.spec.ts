import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CepService } from './cep.service';
import { CsvService, CepCoordenado } from '../csv/csv.service';

const cepSaoPaulo: CepCoordenado = {
  cep: '01001000',
  latitude: -23.5329,
  longitude: -46.6395,
  cidade: 'Sao Paulo',
  uf: 'SP',
  bairro: 'Se',
  logradouro: 'Praca da Se',
};

const cepProximo: CepCoordenado = {
  cep: '01001001',
  latitude: -23.533,
  longitude: -46.6396,
  cidade: 'Sao Paulo',
  uf: 'SP',
  bairro: 'Se',
  logradouro: 'Praca da Se',
};

describe('CepService', () => {
  let service: CepService;
  let csvService: jest.Mocked<CsvService>;

  beforeEach(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        CepService,
        {
          provide: CsvService,
          useValue: {
            obterPorCep: jest.fn(),
            buscarPorRaio: jest.fn(),
          },
        },
      ],
    }).compile();

    service = modulo.get<CepService>(CepService);
    csvService = modulo.get(CsvService);
  });

  describe('buscar', () => {
    it('retorna origem e lista de CEPs encontrados no raio', () => {
      csvService.obterPorCep.mockReturnValue(cepSaoPaulo);
      csvService.buscarPorRaio.mockReturnValue([cepSaoPaulo, cepProximo]);

      const resultado = service.buscar('01001000', 1);

      expect(resultado.origem).toEqual(cepSaoPaulo);
      expect(resultado.resultados).toEqual(['01001000', '01001001']);
      expect(resultado.total).toBe(2);
    });

    it('lanca NotFoundException para CEP inexistente na base', () => {
      csvService.obterPorCep.mockReturnValue(undefined);

      expect(() => service.buscar('00000000', 5)).toThrow(NotFoundException);
      expect(() => service.buscar('00000000', 5)).toThrow(
        'CEP 00000000 nao encontrado na base de dados',
      );
    });

    it('chama buscarPorRaio com as coordenadas da origem e o raio informado', () => {
      csvService.obterPorCep.mockReturnValue(cepSaoPaulo);
      csvService.buscarPorRaio.mockReturnValue([cepSaoPaulo]);

      service.buscar('01001000', 3);

      expect(csvService.buscarPorRaio).toHaveBeenCalledWith(-23.5329, -46.6395, 3);
    });

    it('retorna total zero quando nenhum CEP esta no raio', () => {
      csvService.obterPorCep.mockReturnValue(cepSaoPaulo);
      csvService.buscarPorRaio.mockReturnValue([]);

      const resultado = service.buscar('01001000', 0.001);

      expect(resultado.resultados).toEqual([]);
      expect(resultado.total).toBe(0);
    });
  });
});
