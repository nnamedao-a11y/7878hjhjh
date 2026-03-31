/**
 * Owner Dashboard Controller
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnerDashboardService } from './owner-dashboard.service';

@Controller('owner-dashboard')
export class OwnerDashboardController {
  constructor(private readonly dashboardService: OwnerDashboardService) {}

  /**
   * Get full owner dashboard
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getDashboard(@Query('days') days?: number) {
    return this.dashboardService.getDashboard(days || 30);
  }

  /**
   * Get revenue block only
   */
  @Get('revenue')
  @UseGuards(JwtAuthGuard)
  async getRevenue(@Query('days') days?: number) {
    const start = new Date(Date.now() - (days || 30) * 24 * 60 * 60 * 1000);
    const end = new Date();
    return this.dashboardService.getRevenueBlock(start, end);
  }

  /**
   * Get funnel block only
   */
  @Get('funnel')
  @UseGuards(JwtAuthGuard)
  async getFunnel(@Query('days') days?: number) {
    const start = new Date(Date.now() - (days || 30) * 24 * 60 * 60 * 1000);
    const end = new Date();
    return this.dashboardService.getFunnelBlock(start, end);
  }

  /**
   * Get shipping block only
   */
  @Get('shipping')
  @UseGuards(JwtAuthGuard)
  async getShipping(@Query('days') days?: number) {
    const start = new Date(Date.now() - (days || 30) * 24 * 60 * 60 * 1000);
    const end = new Date();
    return this.dashboardService.getShippingBlock(start, end);
  }

  /**
   * Get risk block only
   */
  @Get('risk')
  @UseGuards(JwtAuthGuard)
  async getRisk() {
    return this.dashboardService.getRiskBlock();
  }

  /**
   * Get team block only
   */
  @Get('team')
  @UseGuards(JwtAuthGuard)
  async getTeam(@Query('days') days?: number) {
    const start = new Date(Date.now() - (days || 30) * 24 * 60 * 60 * 1000);
    const end = new Date();
    return this.dashboardService.getTeamBlock(start, end);
  }
}
