import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: 'tt-digita-api';
}

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return { status: 'ok', service: 'tt-digita-api' };
  }
}
