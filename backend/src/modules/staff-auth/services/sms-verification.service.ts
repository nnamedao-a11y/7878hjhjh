import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsVerificationService {
  private readonly logger = new Logger(SmsVerificationService.name);

  generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async sendSms(phone: string, code: string): Promise<{ success: boolean; debugCode?: string }> {
    // TODO: Integrate real SMS provider (Twilio, etc.)
    this.logger.log(`[SMS] Sending code ${code} to ${phone}`);
    
    // For development - return debug code
    if (process.env.NODE_ENV !== 'production') {
      return { success: true, debugCode: code };
    }

    // Production: call actual SMS API
    // await this.twilioService.sendSms(phone, `Your login code: ${code}`);
    
    return { success: true };
  }

  verifyCode(inputCode: string, storedCode: string): boolean {
    return inputCode === storedCode;
  }
}
