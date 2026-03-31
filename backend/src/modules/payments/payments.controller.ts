/**
 * Payments Controller
 * 
 * Routes:
 * POST /api/invoices/create              - Create invoice
 * POST /api/invoices/create-from-package - Create from fixed package
 * GET  /api/invoices/me                  - User's invoices
 * GET  /api/invoices/:id                 - Get invoice
 * 
 * POST /api/stripe/create-checkout-session - Create Stripe checkout
 * GET  /api/stripe/checkout-status/:sessionId - Get payment status
 * POST /api/webhook/stripe               - Stripe webhook
 * 
 * GET  /api/payments/packages            - Get available packages
 */

import { Controller, Get, Post, Body, Param, Query, Req, Headers, RawBodyRequest } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InvoiceType } from './invoice.schema';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // === INVOICES ===

  @Post('invoices/create')
  async createInvoice(@Body() body: {
    customerId: string;
    customerEmail?: string;
    dealId?: string;
    leadId?: string;
    type: InvoiceType;
    amount: number;
    description?: string;
  }) {
    return this.paymentsService.createInvoice(body);
  }

  @Post('invoices/create-from-package')
  async createFromPackage(@Body() body: {
    packageId: string;
    customerId: string;
    customerEmail?: string;
    dealId?: string;
  }) {
    return this.paymentsService.createInvoiceFromPackage(
      body.packageId,
      body.customerId,
      body.customerEmail,
      body.dealId
    );
  }

  @Get('invoices/me')
  async getMyInvoices(@Req() req: any, @Query('customerId') customerId?: string) {
    const userId = customerId || req.user?.id;
    if (!userId) return [];
    return this.paymentsService.getUserInvoices(userId);
  }

  @Get('invoices/:id')
  async getInvoice(@Param('id') id: string) {
    return this.paymentsService.getInvoice(id);
  }

  @Get('invoices/check-blocked/:dealId/:type')
  async checkBlocked(
    @Param('dealId') dealId: string,
    @Param('type') type: InvoiceType
  ) {
    const blocked = await this.paymentsService.isStepBlocked(dealId, type);
    return { blocked };
  }

  // === STRIPE ===

  @Post('stripe/create-checkout-session')
  async createCheckoutSession(@Body() body: {
    invoiceId: string;
    originUrl: string;
  }) {
    return this.paymentsService.createCheckoutSession(body);
  }

  @Get('stripe/checkout-status/:sessionId')
  async getCheckoutStatus(@Param('sessionId') sessionId: string) {
    return this.paymentsService.getCheckoutStatus(sessionId);
  }

  @Post('webhook/stripe')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string
  ) {
    const body = req.rawBody || Buffer.from(JSON.stringify(req.body));
    return this.paymentsService.handleWebhook(body as Buffer, signature);
  }

  // === PACKAGES ===

  @Get('payments/packages')
  getPackages() {
    return this.paymentsService.getAvailablePackages();
  }
}
