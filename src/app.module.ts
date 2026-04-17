import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CepModule } from './cep/cep.module';
import { TelemetriaModule } from './telemetria/telemetria.module';
import { TelemetriaInterceptor } from './telemetria/telemetria.interceptor';

@Module({
  imports: [
    CepModule,
    TelemetriaModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/cep*'],
    }),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TelemetriaInterceptor,
    },
  ],
})
export class AppModule {}
