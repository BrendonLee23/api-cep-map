import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface RegistroTelemetria {
  timestamp: string;
  rota: string;
  cep: string;
  raioKm: number;
  tempoMs: number;
  memoriaHeapMb: number;
  cpuUserMs: number;
  cpuSistemaMs: number;
}

@Injectable()
export class TelemetriaService implements OnModuleInit {
  private readonly caminhoLog = path.resolve('logs', 'telemetria.log');

  onModuleInit(): void {
    const pastaLogs = path.resolve('logs');
    if (!fs.existsSync(pastaLogs)) {
      fs.mkdirSync(pastaLogs, { recursive: true });
    }
  }

  registrar(dados: RegistroTelemetria): void {
    const linha = JSON.stringify(dados) + '\n';
    fs.appendFile(this.caminhoLog, linha, (err) => {
      if (err) process.stderr.write(`[telemetria] erro: ${err.message}\n`);
    });
  }
}
