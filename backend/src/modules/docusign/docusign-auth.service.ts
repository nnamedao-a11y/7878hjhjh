/**
 * DocuSign Auth Service
 * 
 * Handles JWT authentication with DocuSign API
 * Uses OAuth JWT Grant flow for server-to-server auth
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// DocuSign types (simplified for TypeScript)
interface ApiClient {
  setBasePath(path: string): void;
  setOAuthBasePath(path: string): void;
  requestJWTUserToken(
    clientId: string,
    userId: string,
    scopes: string[],
    privateKey: Buffer,
    expiresIn: number
  ): Promise<any>;
  addDefaultHeader(name: string, value: string): void;
}

@Injectable()
export class DocusignAuthService {
  private readonly logger = new Logger(DocusignAuthService.name);
  private cachedClient: any = null;
  private tokenExpiry: Date | null = null;

  constructor(private configService: ConfigService) {}

  /**
   * Get authenticated DocuSign API client
   * Caches client for 50 minutes (tokens last 1 hour)
   */
  async getApiClient(): Promise<any> {
    // Check if we have a valid cached client
    if (this.cachedClient && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.cachedClient;
    }

    const integrationKey = this.configService.get<string>('DOCUSIGN_INTEGRATION_KEY');
    const userId = this.configService.get<string>('DOCUSIGN_USER_ID');
    const privateKey = this.configService.get<string>('DOCUSIGN_PRIVATE_KEY');
    const basePath = this.configService.get<string>('DOCUSIGN_BASE_PATH') || 'https://demo.docusign.net/restapi';
    const oauthBase = this.configService.get<string>('DOCUSIGN_OAUTH_BASE') || 'https://account-d.docusign.com';

    if (!integrationKey || !userId || !privateKey) {
      this.logger.warn('DocuSign credentials not configured - using mock mode');
      return null;
    }

    try {
      // Dynamic import to avoid issues when SDK not configured
      const docusign = await import('docusign-esign');
      
      const apiClient = new docusign.ApiClient();
      apiClient.setBasePath(basePath);
      apiClient.setOAuthBasePath(oauthBase.replace(/^https?:\/\//, ''));

      // Request JWT token
      const results = await apiClient.requestJWTUserToken(
        integrationKey,
        userId,
        ['signature', 'impersonation'],
        Buffer.from(privateKey.replace(/\\n/g, '\n')),
        3600,
      );

      const accessToken = results.body.access_token;
      apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

      // Cache client for 50 minutes
      this.cachedClient = apiClient;
      this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);

      this.logger.log('DocuSign API client authenticated successfully');
      return apiClient;
    } catch (error) {
      this.logger.error(`DocuSign auth failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if DocuSign is properly configured
   */
  isConfigured(): boolean {
    const integrationKey = this.configService.get<string>('DOCUSIGN_INTEGRATION_KEY');
    const userId = this.configService.get<string>('DOCUSIGN_USER_ID');
    const privateKey = this.configService.get<string>('DOCUSIGN_PRIVATE_KEY');
    const accountId = this.configService.get<string>('DOCUSIGN_ACCOUNT_ID');

    return !!(integrationKey && userId && privateKey && accountId);
  }

  /**
   * Get DocuSign account ID
   */
  getAccountId(): string {
    return this.configService.get<string>('DOCUSIGN_ACCOUNT_ID') || '';
  }

  /**
   * Get return URL for signing completion
   */
  getReturnUrl(): string {
    return this.configService.get<string>('DOCUSIGN_RETURN_URL') || 
           `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cabinet/contracts/return`;
  }
}
