/**
 * Payments Service
 * 
 * Handles:
 * 1. Invoice creation for each step
 * 2. Stripe checkout session creation
 * 3. Webhook processing
 * 4. Payment status checking
 * 
 * SECURITY:
 * - Amount always from backend (FIXED_PACKAGES or deal amount)
 * - URLs built dynamically from frontend origin
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { Invoice, InvoiceStatus, InvoiceType } from './invoice.schema';
import { generateId, toObjectResponse } from '../../shared/utils';

// Fixed packages (amount in USD)
const FIXED_PACKAGES = {
  deposit_500: { amount: 500, description: 'Депозит $500', type: InvoiceType.DEPOSIT },
  deposit_1000: { amount: 1000, description: 'Депозит $1000', type: InvoiceType.DEPOSIT },
  deposit_2000: { amount: 2000, description: 'Депозит $2000', type: InvoiceType.DEPOSIT },
  service_fee: { amount: 350, description: 'Сервісний збір', type: InvoiceType.SERVICE_FEE },
};

export interface CreateInvoiceDto {
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  dealId?: string;
  leadId?: string;
  type: InvoiceType;
  amount: number;
  description?: string;
  dueDate?: Date;
  metadata?: Record<string, any>;
}

export interface CreateCheckoutDto {
  invoiceId: string;
  originUrl: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel('Deal') private dealModel: Model<any>,
  ) {
    const apiKey = this.configService.get<string>('STRIPE_API_KEY') || 'sk_test_emergent';
    this.stripe = new Stripe(apiKey, { apiVersion: '2025-02-24.acacia' as any });
  }

  // === CREATE INVOICE ===
  
  async createInvoice(dto: CreateInvoiceDto): Promise<Invoice> {
    // Validate amount (must be > 0)
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const invoice = new this.invoiceModel({
      id: generateId(),
      ...dto,
      currency: 'usd',
      status: InvoiceStatus.PENDING,
      dueDate: dto.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
    });

    await invoice.save();
    this.logger.log(`Invoice created: ${invoice.id} for ${dto.amount} USD`);

    return invoice;
  }

  // === CREATE INVOICE FROM PACKAGE ===
  
  async createInvoiceFromPackage(
    packageId: string,
    customerId: string,
    customerEmail?: string,
    dealId?: string
  ): Promise<Invoice> {
    const pkg = FIXED_PACKAGES[packageId];
    if (!pkg) {
      throw new BadRequestException(`Invalid package: ${packageId}`);
    }

    return this.createInvoice({
      customerId,
      customerEmail,
      dealId,
      type: pkg.type,
      amount: pkg.amount,
      description: pkg.description,
      metadata: { packageId },
    });
  }

  // === CREATE CHECKOUT SESSION ===
  
  async createCheckoutSession(dto: CreateCheckoutDto): Promise<{ url: string; sessionId: string }> {
    const invoice = await this.invoiceModel.findOne({ id: dto.invoiceId });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice already paid');
    }

    // Build URLs dynamically (NEVER hardcode)
    const successUrl = `${dto.originUrl}/cabinet/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${dto.originUrl}/cabinet/invoices`;

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: invoice.currency || 'usd',
              product_data: {
                name: invoice.description || `Invoice #${invoice.id}`,
              },
              unit_amount: Math.round(invoice.amount * 100), // Stripe uses cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          dealId: invoice.dealId || '',
          type: invoice.type,
        },
        customer_email: invoice.customerEmail,
      });

      // Update invoice with Stripe session
      invoice.stripeSessionId = session.id;
      invoice.stripeCheckoutUrl = session.url || '';
      await invoice.save();

      this.logger.log(`Checkout session created: ${session.id} for invoice ${invoice.id}`);

      return {
        url: session.url || '',
        sessionId: session.id,
      };
    } catch (error) {
      this.logger.error(`Stripe error: ${error.message}`);
      throw new BadRequestException('Failed to create checkout session');
    }
  }

  // === HANDLE WEBHOOK ===
  
  async handleWebhook(body: Buffer, signature: string): Promise<any> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    
    let event: Stripe.Event;

    try {
      if (webhookSecret) {
        event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } else {
        // For testing without webhook secret
        event = JSON.parse(body.toString());
      }
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await this.handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.succeeded':
        // Handle payment intent if needed
        break;
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) {
      this.logger.warn('Checkout completed without invoiceId');
      return;
    }

    const invoice = await this.invoiceModel.findOne({ id: invoiceId });
    if (!invoice) {
      this.logger.warn(`Invoice not found: ${invoiceId}`);
      return;
    }

    // Prevent duplicate processing
    if (invoice.status === InvoiceStatus.PAID) {
      this.logger.log(`Invoice ${invoiceId} already paid, skipping`);
      return;
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    invoice.stripePaymentIntentId = session.payment_intent as string;
    await invoice.save();

    // Update deal if connected
    if (invoice.dealId) {
      await this.dealModel.updateOne(
        { id: invoice.dealId },
        { 
          $set: { lastPaymentAt: new Date() },
          $push: { paidInvoices: invoice.id },
        }
      );
    }

    this.logger.log(`Invoice ${invoiceId} marked as PAID`);
  }

  private async handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) return;

    await this.invoiceModel.updateOne(
      { id: invoiceId, status: InvoiceStatus.PENDING },
      { $set: { status: InvoiceStatus.EXPIRED } }
    );

    this.logger.log(`Invoice ${invoiceId} marked as EXPIRED`);
  }

  // === GET CHECKOUT STATUS ===
  
  async getCheckoutStatus(sessionId: string): Promise<any> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      
      // Update invoice if paid
      if (session.payment_status === 'paid' && session.metadata?.invoiceId) {
        const invoice = await this.invoiceModel.findOne({ id: session.metadata.invoiceId });
        if (invoice && invoice.status !== InvoiceStatus.PAID) {
          invoice.status = InvoiceStatus.PAID;
          invoice.paidAt = new Date();
          invoice.stripePaymentIntentId = session.payment_intent as string;
          await invoice.save();
        }
      }

      return {
        status: session.status,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
      };
    } catch (error) {
      this.logger.error(`Error getting checkout status: ${error.message}`);
      throw new BadRequestException('Failed to get checkout status');
    }
  }

  // === GET USER INVOICES ===
  
  async getUserInvoices(customerId: string): Promise<any[]> {
    const invoices = await this.invoiceModel.find({ customerId })
      .sort({ createdAt: -1 })
      .lean();
    
    return invoices.map(i => toObjectResponse(i));
  }

  // === GET INVOICE ===
  
  async getInvoice(invoiceId: string): Promise<any> {
    const invoice = await this.invoiceModel.findOne({ id: invoiceId }).lean();
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return toObjectResponse(invoice);
  }

  // === CHECK IF STEP IS BLOCKED ===
  
  async isStepBlocked(dealId: string, requiredType: InvoiceType): Promise<boolean> {
    const paidInvoice = await this.invoiceModel.findOne({
      dealId,
      type: requiredType,
      status: InvoiceStatus.PAID,
    });

    return !paidInvoice;
  }

  // === GET AVAILABLE PACKAGES ===
  
  getAvailablePackages(): any {
    return Object.entries(FIXED_PACKAGES).map(([id, pkg]) => ({
      id,
      ...pkg,
    }));
  }
}
