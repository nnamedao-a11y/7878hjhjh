import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DealsService } from './deals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../shared/enums';

/**
 * Deals Controller v2.0 - Full Sales Pipeline
 * 
 * Endpoints:
 * POST /deals - Create deal
 * POST /deals/from-lead - Create deal from lead + quote
 * GET /deals - List all deals
 * GET /deals/stats - Get deal statistics
 * GET /deals/pipeline-analytics - Get pipeline funnel analytics
 * GET /deals/:id - Get deal by ID
 * GET /deals/lead/:leadId - Get deal by lead ID
 * PUT /deals/:id - Update deal
 * PATCH /deals/:id/status - Update status
 * PATCH /deals/:id/finance - Update financial data
 * PATCH /deals/:id/bind-deposit - Bind deposit to deal
 * DELETE /deals/:id - Delete deal
 */

@Controller('deals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  async create(@Body() data: any, @Request() req) {
    return this.dealsService.create(data, req.user.id);
  }

  @Post('from-lead')
  async createFromLead(
    @Body() data: { leadId: string; quoteId?: string; notes?: string },
    @Request() req
  ) {
    return this.dealsService.createFromLead(data, req.user.id);
  }

  @Get()
  async findAll(@Query() query: any) {
    return this.dealsService.findAll(query);
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.TEAM_LEAD, UserRole.OWNER)
  async getStats() {
    return this.dealsService.getStats();
  }

  @Get('pipeline-analytics')
  @Roles(UserRole.OWNER, UserRole.TEAM_LEAD)
  async getPipelineAnalytics() {
    return this.dealsService.getPipelineAnalytics();
  }

  @Get('lead/:leadId')
  async findByLeadId(@Param('leadId') leadId: string) {
    return this.dealsService.findByLeadId(leadId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.dealsService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.dealsService.update(id, data);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string }
  ) {
    return this.dealsService.updateStatus(id, body.status, body.notes);
  }

  @Patch(':id/finance')
  async updateFinance(
    @Param('id') id: string,
    @Body() body: {
      purchasePrice?: number;
      clientPrice?: number;
      internalCost?: number;
      realCost?: number;
      realRevenue?: number;
    }
  ) {
    return this.dealsService.updateFinance(id, body);
  }

  @Patch(':id/bind-deposit')
  async bindDeposit(
    @Param('id') id: string,
    @Body() body: { depositId: string }
  ) {
    return this.dealsService.bindDeposit(id, body.depositId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.TEAM_LEAD)
  async delete(@Param('id') id: string) {
    return this.dealsService.delete(id);
  }
}
