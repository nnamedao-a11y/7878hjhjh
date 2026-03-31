/**
 * Ringostat Controller
 * 
 * Routes:
 * POST /api/ringostat/webhook        - Receive Ringostat events
 * GET  /api/calls/board              - Call board for managers
 * GET  /api/calls/analytics          - Call analytics
 * GET  /api/calls/lead/:leadId       - Calls for specific lead
 * GET  /api/calls/follow-up          - Calls needing follow-up
 * PATCH /api/calls/:id               - Update call (note, outcome, etc)
 */

import { Controller, Get, Post, Patch, Body, Param, Query, Req, Headers } from '@nestjs/common';
import { RingostatService, RingostatWebhookDto } from './ringostat.service';

@Controller()
export class RingostatController {
  constructor(private readonly ringostatService: RingostatService) {}

  // === WEBHOOK ===
  
  @Post('ringostat/webhook')
  async handleWebhook(
    @Body() data: RingostatWebhookDto,
    @Headers('x-ringostat-signature') signature?: string
  ) {
    // In production: verify signature
    // if (!this.verifySignature(data, signature)) {
    //   throw new UnauthorizedException('Invalid signature');
    // }

    const result = await this.ringostatService.handleWebhook(data);
    return { status: 'ok', callId: result?.id };
  }

  // === CALL BOARD ===
  
  @Get('calls/board')
  async getCallBoard(
    @Query('managerId') managerId?: string,
    @Query('teamId') teamId?: string,
    @Req() req?: any
  ) {
    // If no managerId specified, use current user's ID
    const userId = managerId || req?.user?.id;
    return this.ringostatService.getCallBoard(userId, teamId);
  }

  // === ANALYTICS ===
  
  @Get('calls/analytics')
  async getAnalytics(
    @Query('managerId') managerId?: string,
    @Query('period') period?: string
  ) {
    const periodDays = parseInt(period || '7', 10);
    return this.ringostatService.getCallAnalytics(managerId, periodDays);
  }

  // === CALLS FOR LEAD ===
  
  @Get('calls/lead/:leadId')
  async getCallsForLead(@Param('leadId') leadId: string) {
    return this.ringostatService.getCallsForLead(leadId);
  }

  // === FOLLOW-UP NEEDED ===
  
  @Get('calls/follow-up')
  async getFollowUp(@Query('managerId') managerId?: string, @Req() req?: any) {
    const userId = managerId || req?.user?.id;
    return this.ringostatService.getCallsNeedingFollowUp(userId);
  }

  // === UPDATE CALL ===
  
  @Patch('calls/:id')
  async updateCall(
    @Param('id') id: string,
    @Body() body: {
      note?: string;
      outcome?: string;
      nextActionAt?: string;
      nextActionType?: string;
      qualityScore?: number;
      isProcessed?: boolean;
    }
  ) {
    return this.ringostatService.updateCall(id, {
      ...body,
      nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : undefined,
    });
  }

  // === TEAM CALLS (FOR TEAM LEAD) ===
  
  @Get('calls/team')
  async getTeamCalls(@Query('period') period?: string) {
    const periodDays = parseInt(period || '7', 10);
    // Get all calls (no filter = team view)
    return this.ringostatService.getCallBoard(undefined, undefined);
  }

  // === TEAM ANALYTICS ===
  
  @Get('calls/team/analytics')
  async getTeamAnalytics(@Query('period') period?: string) {
    const periodDays = parseInt(period || '7', 10);
    return this.ringostatService.getCallAnalytics(undefined, periodDays);
  }
}
