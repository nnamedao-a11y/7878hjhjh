/**
 * Contracts Controller
 * 
 * Routes:
 * POST /api/contracts/create           - Create contract
 * POST /api/contracts/:id/send         - Send for signing
 * POST /api/contracts/:id/sign         - Sign contract
 * POST /api/contracts/:id/reject       - Reject contract
 * GET  /api/contracts/me               - User's contracts
 * GET  /api/contracts/:id              - Get contract
 * GET  /api/contracts/deal/:dealId     - Deal contracts
 * GET  /api/admin/contracts/pending    - Pending contracts (admin)
 * GET  /api/admin/contracts/analytics  - Analytics (admin)
 */

import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ContractsService, CreateContractDto } from './contracts.service';

@Controller()
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  // === CREATE CONTRACT ===
  
  @Post('contracts/create')
  async createContract(@Body() body: CreateContractDto, @Req() req: any) {
    const createdBy = req.user?.id;
    return this.contractsService.createContract(body, createdBy);
  }

  // === SEND FOR SIGNING ===
  
  @Post('contracts/:id/send')
  async sendContract(
    @Param('id') id: string,
    @Body() body: { originUrl: string }
  ) {
    return this.contractsService.sendContract(id, body.originUrl);
  }

  // === VIEW CONTRACT ===
  
  @Post('contracts/:id/view')
  async viewContract(@Param('id') id: string) {
    return this.contractsService.markViewed(id);
  }

  // === SIGN CONTRACT ===
  
  @Post('contracts/:id/sign')
  async signContract(
    @Param('id') id: string,
    @Body() body: { signatureData?: any }
  ) {
    return this.contractsService.signContract(id, body.signatureData);
  }

  // === REJECT CONTRACT ===
  
  @Post('contracts/:id/reject')
  async rejectContract(
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ) {
    return this.contractsService.rejectContract(id, body.reason);
  }

  // === CHECK IF SIGNED ===
  
  @Get('contracts/check-signed/:dealId')
  async checkSigned(@Param('dealId') dealId: string) {
    const signed = await this.contractsService.isContractSignedForDeal(dealId);
    return { signed };
  }

  // === GET MY CONTRACTS ===
  
  @Get('contracts/me')
  async getMyContracts(@Req() req: any, @Query('customerId') customerId?: string) {
    const userId = customerId || req.user?.id;
    if (!userId) return [];
    return this.contractsService.getUserContracts(userId);
  }

  // === GET CONTRACT ===
  
  @Get('contracts/:id')
  async getContract(@Param('id') id: string) {
    return this.contractsService.getContract(id);
  }

  // === GET DEAL CONTRACTS ===
  
  @Get('contracts/deal/:dealId')
  async getDealContracts(@Param('dealId') dealId: string) {
    return this.contractsService.getDealContracts(dealId);
  }

  // === ADMIN: PENDING CONTRACTS ===
  
  @Get('admin/contracts/pending')
  async getPendingContracts() {
    return this.contractsService.getPendingContracts();
  }

  // === ADMIN: ANALYTICS ===
  
  @Get('admin/contracts/analytics')
  async getAnalytics(@Query('period') period?: string) {
    const periodDays = parseInt(period || '30', 10);
    return this.contractsService.getAnalytics(periodDays);
  }
}
