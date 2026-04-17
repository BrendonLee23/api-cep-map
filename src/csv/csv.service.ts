import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { haversine, calcularBoundingBox } from '../geo/geo.util';

export interface CepCoordenado {
  cep: string;
  latitude: number;
  longitude: number;
  cidade: string;
  uf: string;
  bairro: string;
  logradouro: string;
}

@Injectable()
export class CsvService implements OnModuleInit {
  private indice: Map<string, CepCoordenado> = new Map();
  private ordenadosPorLat: CepCoordenado[] = [];

  async onModuleInit(): Promise<void> {
    const caminhoCsv = path.resolve('data', 'ceps.csv');
    if (!fs.existsSync(caminhoCsv)) {
      throw new InternalServerErrorException(
        'Arquivo data/ceps.csv nao encontrado. Execute npm run build:dataset primeiro.',
      );
    }
    await this.carregarCsv(caminhoCsv);
  }

  private carregarCsv(caminho: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const registros: CepCoordenado[] = [];
      const stream = fs.createReadStream(caminho);
      const parser = parse({ columns: true, trim: true, skip_empty_lines: true, relax_column_count: true });

      parser.on('readable', () => {
        let registro: Record<string, string> | null;
        while ((registro = parser.read() as Record<string, string> | null) !== null) {
          const lat = parseFloat(registro['latitude']);
          const lng = parseFloat(registro['longitude']);
          if (!registro['cep'] || isNaN(lat) || isNaN(lng)) continue;
          registros.push({
            cep: registro['cep'].replace(/\D/g, ''),
            latitude: lat,
            longitude: lng,
            cidade: registro['cidade'] ?? '',
            uf: registro['uf'] ?? '',
            bairro: registro['bairro'] ?? '',
            logradouro: registro['logradouro'] ?? '',
          });
        }
      });

      parser.on('error', reject);

      parser.on('end', () => {
        registros.sort((a, b) => a.latitude - b.latitude);
        this.ordenadosPorLat = registros;
        for (const r of registros) {
          this.indice.set(r.cep, r);
        }
        resolve();
      });

      stream.pipe(parser);
    });
  }

  obterPorCep(cep: string): CepCoordenado | undefined {
    return this.indice.get(cep);
  }

  buscarPorRaio(lat: number, lng: number, raioKm: number): CepCoordenado[] {
    const bbox = calcularBoundingBox(lat, lng, raioKm);
    const inicio = this.buscaBinaria(bbox.latMin);
    const resultado: CepCoordenado[] = [];
    for (let i = inicio; i < this.ordenadosPorLat.length; i++) {
      const item = this.ordenadosPorLat[i];
      if (item.latitude > bbox.latMax) break;
      if (item.longitude < bbox.lngMin || item.longitude > bbox.lngMax) continue;
      if (haversine(lat, lng, item.latitude, item.longitude) <= raioKm) {
        resultado.push(item);
      }
    }
    return resultado;
  }

  private buscaBinaria(latMin: number): number {
    let ini = 0;
    let fim = this.ordenadosPorLat.length - 1;
    while (ini <= fim) {
      const meio = Math.floor((ini + fim) / 2);
      if (this.ordenadosPorLat[meio].latitude < latMin) {
        ini = meio + 1;
      } else {
        fim = meio - 1;
      }
    }
    return ini;
  }
}
