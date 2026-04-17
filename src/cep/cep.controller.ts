import { Controller, Get, Query } from '@nestjs/common';
import { CepService } from './cep.service';
import { BuscarCepDto } from './dto/buscar-cep.dto';

@Controller('cep')
export class CepController {
  constructor(private readonly cepService: CepService) {}

  @Get('buscar')
  buscar(@Query() dto: BuscarCepDto) {
    return this.cepService.buscar(dto.cep, dto.raioKm);
  }
}
