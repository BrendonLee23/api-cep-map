import { Module } from '@nestjs/common';
import { CepController } from './cep.controller';
import { CepService } from './cep.service';
import { CsvModule } from '../csv/csv.module';

@Module({
  imports: [CsvModule],
  controllers: [CepController],
  providers: [CepService],
})
export class CepModule {}
