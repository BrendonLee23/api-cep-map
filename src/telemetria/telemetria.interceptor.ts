import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs';
import { TelemetriaService } from './telemetria.service';

@Injectable()
export class TelemetriaInterceptor implements NestInterceptor {
  constructor(private readonly telemetriaService: TelemetriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const inicio = process.hrtime.bigint();
    const cpuInicio = process.cpuUsage();
    const req = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      finalize(() => {
        const fim = process.hrtime.bigint();
        const cpuDelta = process.cpuUsage(cpuInicio);
        const memoria = process.memoryUsage();
        this.telemetriaService.registrar({
          timestamp: new Date().toISOString(),
          rota: req.path,
          cep: String(req.query?.['cep'] ?? ''),
          raioKm: parseFloat(String(req.query?.['raioKm'] ?? '0')) || 0,
          tempoMs: Number(Number(fim - inicio) / 1_000_000),
          memoriaHeapMb: Number((memoria.heapUsed / 1024 / 1024).toFixed(2)),
          cpuUserMs: Number((cpuDelta.user / 1000).toFixed(2)),
          cpuSistemaMs: Number((cpuDelta.system / 1000).toFixed(2)),
        });
      }),
    );
  }
}
