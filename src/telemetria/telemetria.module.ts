import { Module } from '@nestjs/common';
import { TelemetriaService } from './telemetria.service';
import { TelemetriaInterceptor } from './telemetria.interceptor';

@Module({
  providers: [TelemetriaService, TelemetriaInterceptor],
  exports: [TelemetriaService, TelemetriaInterceptor],
})
export class TelemetriaModule {}
