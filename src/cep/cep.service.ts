import { Injectable, NotFoundException } from '@nestjs/common';
import { CsvService, CepCoordenado } from '../csv/csv.service';

export interface ResultadoBusca {
  origem: CepCoordenado;
  resultados: string[];
  total: number;
}

@Injectable()
export class CepService {
  constructor(private readonly csvService: CsvService) {}

  buscar(cep: string, raioKm: number): ResultadoBusca {
    const origem = this.csvService.obterPorCep(cep);
    if (!origem) {
      throw new NotFoundException(`CEP ${cep} nao encontrado na base de dados`);
    }
    const encontrados = this.csvService.buscarPorRaio(origem.latitude, origem.longitude, raioKm);
    return {
      origem,
      resultados: encontrados.map((c) => c.cep),
      total: encontrados.length,
    };
  }
}
