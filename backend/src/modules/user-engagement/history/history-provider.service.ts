/**
 * History Provider Service
 * 
 * Wrapper для зовнішнього провайдера history reports
 * TODO: Замінити на реальний API провайдера
 */

import { Injectable, Logger } from '@nestjs/common';

export interface HistoryReportResult {
  vin: string;
  provider: string;
  rawData: Record<string, any>;
  normalizedData: {
    vin: string;
    accidentHistory: string[];
    ownersCount: number;
    titleIssues: string[];
    odometerFlags: string[];
    auctionHistory: any[];
    damageHistory: string[];
    serviceRecords: any[];
    historyScore?: number;
  };
  cost: number;
}

@Injectable()
export class HistoryProviderService {
  private readonly logger = new Logger(HistoryProviderService.name);

  /**
   * Отримати history report від провайдера
   * 
   * TODO: Замінити на реальну інтеграцію з Carfax/CarVertical API
   */
  async fetchReport(vin: string): Promise<HistoryReportResult> {
    this.logger.log(`[Provider] Fetching history for ${vin}`);

    // MOCK: В реальності тут буде виклик API провайдера
    // Приклад: const response = await axios.post('https://api.carfax.com/...', { vin });
    
    // Симуляція затримки API
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock response - замінити на реальний API response
    return {
      vin,
      provider: 'internal_history',
      rawData: {
        vin,
        source: 'mock',
        fetchedAt: new Date().toISOString(),
      },
      normalizedData: {
        vin,
        accidentHistory: [],
        ownersCount: 0,
        titleIssues: [],
        odometerFlags: [],
        auctionHistory: [],
        damageHistory: [],
        serviceRecords: [],
        historyScore: undefined,
      },
      cost: 0, // Для mock даних cost = 0
    };
  }

  /**
   * Перевірка доступності провайдера
   */
  async healthCheck(): Promise<{ available: boolean; provider: string }> {
    return {
      available: true,
      provider: 'internal_history',
    };
  }
}
