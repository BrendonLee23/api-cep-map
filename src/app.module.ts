import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { Controller, Get } from '@nestjs/common';
import { join } from 'path';
import { CepModule } from './cep/cep.module';
import { TelemetriaModule } from './telemetria/telemetria.module';
import { TelemetriaInterceptor } from './telemetria/telemetria.interceptor';

@Controller()
export class AppController {
  @Get('health')
  health(): { status: string; uptime: number } {
    return { status: 'ok', uptime: process.uptime() };
  }
}

@Module({
  imports: [
    CepModule,
    TelemetriaModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/cep*', '/health*'],
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TelemetriaInterceptor,
    },
  ],
})
export class AppModule {}
