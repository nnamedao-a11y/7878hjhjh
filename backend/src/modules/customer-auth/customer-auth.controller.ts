import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomerAuthService, CustomerRegisterDto, CustomerLoginDto } from './customer-auth.service';
import { CustomerRetentionService, SaveListingPayload } from './customer-retention.service';
import { CustomerJwtGuard } from './customer-jwt.guard';

/**
 * Customer Auth Controller
 * 
 * Authentication and retention endpoints for customer cabinet
 * 
 * Public:
 * - POST /customer-auth/register - Register new customer
 * - POST /customer-auth/login - Login customer
 * 
 * Protected (requires JWT):
 * - GET /customer-auth/me - Get current customer profile
 * - GET /customer-auth/me/saved - Get saved listings
 * - POST /customer-auth/me/saved - Save a listing
 * - DELETE /customer-auth/me/saved/:listingId - Remove saved listing
 * - GET /customer-auth/me/saved/:listingId/check - Check if listing is saved
 * - GET /customer-auth/me/recently-viewed - Get recently viewed
 * - POST /customer-auth/me/recently-viewed - Add to recently viewed
 * - DELETE /customer-auth/me/recently-viewed - Clear recently viewed
 */

@Controller('customer-auth')
export class CustomerAuthController {
  constructor(
    private readonly authService: CustomerAuthService,
    private readonly retentionService: CustomerRetentionService,
  ) {}

  // ============ GOOGLE OAUTH ENDPOINTS ============

  /**
   * Exchange session_id from Emergent Auth for customer session (legacy)
   * POST /customer-auth/google/session
   */
  @Post('google/session')
  async googleSession(
    @Body() body: { sessionId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.processGoogleSession(body.sessionId);
    
    // Set httpOnly cookie
    res.cookie('customer_session', result.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    return {
      customerId: result.customerId,
      email: result.email,
      name: result.name,
      picture: result.picture,
    };
  }

  /**
   * Verify Google ID token from native Google Sign-In
   * POST /customer-auth/google/verify
   */
  @Post('google/verify')
  async googleVerify(
    @Body() body: { credential: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyGoogleToken(body.credential);
    
    // Set httpOnly cookie
    res.cookie('customer_session', result.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    return {
      customerId: result.customerId,
      email: result.email,
      name: result.name,
      picture: result.picture,
    };
  }

  /**
   * Get current user from session token (cookie or header)
   * GET /customer-auth/google/me
   */
  @Get('google/me')
  async googleMe(
    @Req() req: any,
    @Headers('authorization') authHeader: string,
  ) {
    // Try cookie first, then Authorization header
    let sessionToken = req.cookies?.customer_session;
    
    if (!sessionToken && authHeader?.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7);
    }
    
    if (!sessionToken) {
      throw new UnauthorizedException('No session token');
    }
    
    return this.authService.getGoogleSession(sessionToken);
  }

  /**
   * Logout - clear session
   * POST /customer-auth/google/logout
   */
  @Post('google/logout')
  async googleLogout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionToken = req.cookies?.customer_session;
    
    if (sessionToken) {
      await this.authService.deleteGoogleSession(sessionToken);
    }
    
    res.clearCookie('customer_session', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
    
    return { success: true };
  }

  // ============ AUTH ENDPOINTS ============

  @Post('register')
  async register(@Body() dto: CustomerRegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: CustomerLoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(CustomerJwtGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    return this.authService.getProfile(req.user.customerId);
  }

  // ============ SAVED LISTINGS ============

  @UseGuards(CustomerJwtGuard)
  @Get('me/saved')
  async getSavedListings(@Req() req: any) {
    return this.retentionService.getSavedListings(req.user.customerId);
  }

  @UseGuards(CustomerJwtGuard)
  @Post('me/saved')
  async saveListing(@Req() req: any, @Body() dto: SaveListingPayload) {
    return this.retentionService.saveListing(req.user.customerId, dto);
  }

  @UseGuards(CustomerJwtGuard)
  @Delete('me/saved/:listingId')
  async unsaveListing(@Req() req: any, @Param('listingId') listingId: string) {
    return this.retentionService.unsaveListing(req.user.customerId, listingId);
  }

  @UseGuards(CustomerJwtGuard)
  @Get('me/saved/:listingId/check')
  async checkSaved(@Req() req: any, @Param('listingId') listingId: string) {
    const isSaved = await this.retentionService.isSaved(req.user.customerId, listingId);
    return { isSaved };
  }

  // ============ RECENTLY VIEWED ============

  @UseGuards(CustomerJwtGuard)
  @Get('me/recently-viewed')
  async getRecentlyViewed(@Req() req: any) {
    return this.retentionService.getRecentlyViewed(req.user.customerId);
  }

  @UseGuards(CustomerJwtGuard)
  @Post('me/recently-viewed')
  async addRecentlyViewed(@Req() req: any, @Body() dto: SaveListingPayload) {
    await this.retentionService.addRecentlyViewed(req.user.customerId, dto);
    return { success: true };
  }

  @UseGuards(CustomerJwtGuard)
  @Delete('me/recently-viewed')
  async clearRecentlyViewed(@Req() req: any) {
    return this.retentionService.clearRecentlyViewed(req.user.customerId);
  }
}
