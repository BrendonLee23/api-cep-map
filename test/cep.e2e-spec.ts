import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest').default ?? require('supertest');
import { CepModule } from '../src/cep/cep.module';
import { CsvService } from '../src/csv/csv.service';
import { TelemetriaModule } from '../src/telemetria/telemetria.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TelemetriaInterceptor } from '../src/telemetria/telemetria.interceptor';
import { AppController } from '../src/app.module';

const cepSaoPaulo = {
  cep: '01001000',
  latitude: -23.5329,
  longitude: -46.6395,
  cidade: 'Sao Paulo',
  uf: 'SP',
  bairro: 'Se',
  logradouro: 'Praca da Se',
};

const cepProximo = {
  cep: '01001001',
  latitude: -23.5330,
  longitude: -46.6396,
  cidade: 'Sao Paulo',
  uf: 'SP',
  bairro: 'Se',
  logradouro: 'Rua A',
};

describe('GET /cep/buscar (e2e)', () => {
  let app: INestApplication;
  let csvService: jest.Mocked<CsvService>;

  beforeAll(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [CepModule, TelemetriaModule],
      controllers: [AppController],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useClass: TelemetriaInterceptor,
        },
      ],
    })
      .overrideProvider(CsvService)
      .useValue({
        onModuleInit: jest.fn(),
        obterPorCep: jest.fn(),
        buscarPorRaio: jest.fn(),
      })
      .compile();

    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    csvService = modulo.get(CsvService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('casos de sucesso', () => {
    it('retorna 200 com lista de CEPs e total', async () => {
      csvService.obterPorCep.mockReturnValue(cepSaoPaulo);
      csvService.buscarPorRaio.mockReturnValue([cepSaoPaulo, cepProximo]);

      const resposta = await request(app.getHttpServer())
        .get('/cep/buscar?cep=01001000&raioKm=1')
        .expect(200);

      expect(resposta.body.total).toBe(2);
      expect(resposta.body.resultados).toContain('01001000');
      expect(resposta.body.resultados).toContain('01001001');
      expect(resposta.body.origem.cep).toBe('01001000');
    });

    it('retorna total zero quando nenhum CEP esta no raio', async () => {
      csvService.obterPorCep.mockReturnValue(cepSaoPaulo);
      csvService.buscarPorRaio.mockReturnValue([]);

      const resposta = await request(app.getHttpServer())
        .get('/cep/buscar?cep=01001000&raioKm=0.001')
        .expect(200);

      expect(resposta.body.total).toBe(0);
      expect(resposta.body.resultados).toEqual([]);
    });
  });

  describe('tratamento de erros', () => {
    it('retorna 400 para CEP com menos de 8 digitos', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/cep/buscar?cep=123&raioKm=5')
        .expect(400);

      expect(resposta.body.message).toContain('CEP deve conter 8 digitos numericos');
    });

    it('retorna 400 para CEP com letras', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/cep/buscar?cep=abcdefgh&raioKm=5')
        .expect(400);

      expect(resposta.body.message).toContain('CEP deve conter 8 digitos numericos');
    });

    it('retorna 404 para CEP inexistente na base', async () => {
      csvService.obterPorCep.mockReturnValue(undefined);

      const resposta = await request(app.getHttpServer())
        .get('/cep/buscar?cep=00000000&raioKm=5')
        .expect(404);

      expect(resposta.body.message).toContain('nao encontrado na base de dados');
    });

    it('retorna 400 para raioKm negativo', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/cep/buscar?cep=01001000&raioKm=-1')
        .expect(400);

      expect(resposta.body.message).toContain('raioKm deve ser um numero positivo');
    });

    it('retorna 400 para raioKm zero', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/cep/buscar?cep=01001000&raioKm=0')
        .expect(400);

      expect(resposta.body.message).toContain('raioKm deve ser um numero positivo');
    });

    it('retorna 400 para raioKm ausente', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/cep/buscar?cep=01001000')
        .expect(400);

      expect(resposta.body.statusCode).toBe(400);
    });

    it('retorna 400 para cep ausente', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/cep/buscar?raioKm=5')
        .expect(400);

      expect(resposta.body.statusCode).toBe(400);
    });

    it('retorna 400 para raioKm acima de 500', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/cep/buscar?cep=01001000&raioKm=501')
        .expect(400);

      expect(resposta.body.message).toContain('raioKm nao pode exceder 500 km');
    });
  });

  describe('GET /health', () => {
    it('retorna 200 com status ok', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(resposta.body.status).toBe('ok');
    });

    it('retorna uptime como numero positivo', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(typeof resposta.body.uptime).toBe('number');
      expect(resposta.body.uptime).toBeGreaterThan(0);
    });
  });
});
