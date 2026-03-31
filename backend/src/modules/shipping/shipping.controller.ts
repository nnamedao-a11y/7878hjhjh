/**
 * Shipping Controller
 * 
 * Routes:
 * POST /api/shipping/create            - Create shipment
 * PATCH /api/shipping/:id              - Update shipment
 * POST /api/shipping/:id/event         - Add tracking event
 * POST /api/shipping/:id/document      - Add document
 * GET  /api/shipping/me                - User's shipments
 * GET  /api/shipping/:id               - Get shipment
 * GET  /api/shipping/vin/:vin          - Get by VIN
 * GET  /api/shipping/deal/:dealId      - Get deal shipment
 * GET  /api/admin/shipping/active      - Active shipments (admin)
 * GET  /api/admin/shipping/analytics   - Analytics (admin)
 */

import { Controller, Get, Post, Patch, Body, Param, Query, Req } from '@nestjs/common';
import { ShippingService, CreateShipmentDto, UpdateShipmentDto, AddEventDto } from './shipping.service';

@Controller()
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // === CREATE SHIPMENT ===
  
  @Post('shipping/create')
  async createShipment(@Body() body: CreateShipmentDto) {
    return this.shippingService.createShipment(body);
  }

  // === UPDATE SHIPMENT ===
  
  @Patch('shipping/:id')
  async updateShipment(@Param('id') id: string, @Body() body: UpdateShipmentDto) {
    return this.shippingService.updateShipment(id, body);
  }

  // === ADD EVENT ===
  
  @Post('shipping/:id/event')
  async addEvent(@Param('id') id: string, @Body() body: AddEventDto) {
    return this.shippingService.addEvent(id, body);
  }

  // === ADD DOCUMENT ===
  
  @Post('shipping/:id/document')
  async addDocument(
    @Param('id') id: string,
    @Body() body: { type: string; name: string; url: string }
  ) {
    return this.shippingService.addDocument(id, body);
  }

  // === GET MY SHIPMENTS ===
  
  @Get('shipping/me')
  async getMyShipments(@Req() req: any, @Query('customerId') customerId?: string) {
    const userId = customerId || req.user?.id;
    if (!userId) return [];
    return this.shippingService.getUserShipments(userId);
  }

  // === GET SHIPMENT ===
  
  @Get('shipping/:id')
  async getShipment(@Param('id') id: string) {
    return this.shippingService.getShipment(id);
  }

  // === GET BY VIN ===
  
  @Get('shipping/vin/:vin')
  async getByVin(@Param('vin') vin: string) {
    return this.shippingService.getByVin(vin);
  }

  // === GET DEAL SHIPMENT ===
  
  @Get('shipping/deal/:dealId')
  async getDealShipment(@Param('dealId') dealId: string) {
    return this.shippingService.getDealShipment(dealId);
  }

  // === ADMIN: ACTIVE SHIPMENTS ===
  
  @Get('admin/shipping/active')
  async getActiveShipments() {
    return this.shippingService.getActiveShipments();
  }

  // === ADMIN: ANALYTICS ===
  
  @Get('admin/shipping/analytics')
  async getAnalytics(@Query('period') period?: string) {
    const periodDays = parseInt(period || '30', 10);
    return this.shippingService.getAnalytics(periodDays);
  }
}
