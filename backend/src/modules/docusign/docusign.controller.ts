/**
 * DocuSign Controller
 * 
 * Routes:
 * POST /api/docusign/envelopes/create       - Create envelope
 * POST /api/docusign/envelopes/:id/sign     - Get signing URL
 * GET  /api/docusign/envelopes/:id/status   - Get envelope status
 * POST /api/docusign/envelopes/:id/complete - Mark as signed (mock)
 * GET  /api/docusign/envelopes/:id/document - Download signed PDF
 * POST /api/docusign/webhook                - DocuSign Connect webhook
 * GET  /api/docusign/config                 - Get config status
 */

import { Controller, Get, Post, Body, Param, Req, Res, Query, Headers, HttpCode } from '@nestjs/common';
import { DocusignService, CreateEnvelopeInput } from './docusign.service';

@Controller('docusign')
export class DocusignController {
  constructor(private readonly docusignService: DocusignService) {}

  /**
   * Create and send envelope for signing
   */
  @Post('envelopes/create')
  async createEnvelope(@Body() body: CreateEnvelopeInput) {
    return this.docusignService.createEnvelope(body);
  }

  /**
   * Generate embedded signing URL
   */
  @Post('envelopes/:envelopeId/sign')
  @HttpCode(200)
  async getSigningUrl(
    @Param('envelopeId') envelopeId: string,
    @Body() body: {
      email: string;
      fullName: string;
      clientUserId: string;
      returnUrl?: string;
    }
  ) {
    return this.docusignService.createSigningUrl({
      envelopeId,
      ...body,
    });
  }

  /**
   * Get envelope status
   */
  @Get('envelopes/:envelopeId/status')
  async getStatus(@Param('envelopeId') envelopeId: string) {
    return this.docusignService.getEnvelopeStatus(envelopeId);
  }

  /**
   * Mark as signed (for mock/fallback flow)
   */
  @Post('envelopes/:envelopeId/complete')
  async markComplete(@Param('envelopeId') envelopeId: string) {
    return this.docusignService.markAsSigned(envelopeId);
  }

  /**
   * Download signed document
   */
  @Get('envelopes/:envelopeId/document')
  async getDocument(@Param('envelopeId') envelopeId: string, @Res() res: any) {
    const doc = await this.docusignService.getSignedDocument(envelopeId);
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not available' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=contract_${envelopeId}.pdf`);
    return res.send(doc);
  }

  /**
   * DocuSign Connect webhook
   */
  @Post('webhook')
  async webhook(@Body() body: any, @Headers('x-docusign-signature-1') signature?: string) {
    // TODO: Verify HMAC signature in production
    return this.docusignService.handleWebhookEvent(body);
  }

  /**
   * Get user's envelopes
   */
  @Get('envelopes/user/:userId')
  async getUserEnvelopes(@Param('userId') userId: string) {
    return this.docusignService.getUserEnvelopes(userId);
  }

  /**
   * Get configuration status
   */
  @Get('config')
  async getConfig() {
    return this.docusignService.getConfigStatus();
  }
}
