import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { TelemetriaInterceptor } from './telemetria.interceptor';
import { TelemetriaService } from './telemetria.service';

function criarContexto(cep = '01001000', raioKm = '5'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        path: '/cep/buscar',
        query: { cep, raioKm },
      }),
    }),
  } as unknown as ExecutionContext;
}

function criarHandler(): CallHandler {
  return { handle: () => of({ total: 1, resultados: [] }) };
}

describe('TelemetriaInterceptor', () => {
  let interceptor: TelemetriaInterceptor;
  let telemetriaService: jest.Mocked<TelemetriaService>;

  beforeEach(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetriaInterceptor,
        {
          provide: TelemetriaService,
          useValue: { registrar: jest.fn() },
        },
      ],
    }).compile();

    interceptor = modulo.get<TelemetriaInterceptor>(TelemetriaInterceptor);
    telemetriaService = modulo.get(TelemetriaService);
  });

  it('chama telemetriaService.registrar apos a requisicao ser concluida', async () => {
    await lastValueFrom(interceptor.intercept(criarContexto(), criarHandler()));
    expect(telemetriaService.registrar).toHaveBeenCalledTimes(1);
  });

  it('registra os campos obrigatorios no log', async () => {
    await lastValueFrom(interceptor.intercept(criarContexto('01001000', '5'), criarHandler()));
    const chamada = telemetriaService.registrar.mock.calls[0][0];
    expect(chamada).toMatchObject({
      rota: '/cep/buscar',
      cep: '01001000',
      raioKm: 5,
    });
    expect(chamada.timestamp).toBeDefined();
    expect(chamada.tempoMs).toBeGreaterThanOrEqual(0);
    expect(chamada.memoriaHeapMb).toBeGreaterThan(0);
  });

  it('registra raioKm como numero mesmo recebendo string', async () => {
    await lastValueFrom(interceptor.intercept(criarContexto('01001000', '10.5'), criarHandler()));
    const chamada = telemetriaService.registrar.mock.calls[0][0];
    expect(typeof chamada.raioKm).toBe('number');
    expect(chamada.raioKm).toBe(10.5);
  });
});
