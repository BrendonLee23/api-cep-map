import { IsString, Matches, IsPositive, Max, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class BuscarCepDto {
  @Transform(({ value }) => String(value ?? '').replace(/\D/g, ''))
  @IsString()
  @Matches(/^\d{8}$/, { message: 'CEP deve conter 8 digitos numericos' })
  cep!: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'raioKm e obrigatorio e deve ser um numero' })
  @IsPositive({ message: 'raioKm deve ser um numero positivo' })
  @Max(500, { message: 'raioKm nao pode exceder 500 km' })
  raioKm!: number;
}
