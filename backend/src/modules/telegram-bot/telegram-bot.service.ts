/**
 * BIBI Cars Telegram Bot - API Service
 * 
 * Low-level Telegram API wrapper
 */

import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

interface SendMessageOptions {
  chatId: string | number;
  text: string;
  replyMarkup?: any;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN;

  private get baseUrl() {
    return `https://api.telegram.org/bot${this.token}`;
  }

  async sendMessage(options: SendMessageOptions): Promise<any> {
    const { chatId, text, replyMarkup, parseMode = 'HTML' } = options;

    if (!this.token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured');
      return null;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
        parse_mode: parseMode,
      });

      return response.data;
    } catch (error) {
      this.handleError(error, 'sendMessage');
      return null;
    }
  }

  async editMessage(
    chatId: string | number,
    messageId: number,
    text: string,
    replyMarkup?: any,
  ): Promise<any> {
    if (!this.token) return null;

    try {
      const response = await axios.post(`${this.baseUrl}/editMessageText`, {
        chat_id: chatId,
        message_id: messageId,
        text,
        reply_markup: replyMarkup,
        parse_mode: 'HTML',
      });

      return response.data;
    } catch (error) {
      this.handleError(error, 'editMessage');
      return null;
    }
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert = false,
  ): Promise<any> {
    if (!this.token) return null;

    try {
      const response = await axios.post(`${this.baseUrl}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      });

      return response.data;
    } catch (error) {
      this.handleError(error, 'answerCallbackQuery');
      return null;
    }
  }

  async setWebhook(url: string): Promise<any> {
    if (!this.token) {
      this.logger.warn('Cannot set webhook: TELEGRAM_BOT_TOKEN not configured');
      return null;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/setWebhook`, {
        url,
        allowed_updates: ['message', 'callback_query'],
      });

      this.logger.log(`Webhook set to: ${url}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'setWebhook');
      return null;
    }
  }

  async deleteWebhook(): Promise<any> {
    if (!this.token) return null;

    try {
      const response = await axios.post(`${this.baseUrl}/deleteWebhook`);
      this.logger.log('Webhook deleted');
      return response.data;
    } catch (error) {
      this.handleError(error, 'deleteWebhook');
      return null;
    }
  }

  async getMe(): Promise<any> {
    if (!this.token) return null;

    try {
      const response = await axios.get(`${this.baseUrl}/getMe`);
      return response.data.result;
    } catch (error) {
      this.handleError(error, 'getMe');
      return null;
    }
  }

  async sendNotification(
    telegramId: string,
    title: string,
    message: string,
    link?: string,
  ): Promise<boolean> {
    const text = link
      ? `<b>${title}</b>\n\n${message}\n\n<a href="${link}">Переглянути →</a>`
      : `<b>${title}</b>\n\n${message}`;

    const result = await this.sendMessage({
      chatId: telegramId,
      text,
    });

    return !!result;
  }

  private handleError(error: unknown, context: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Telegram API error in ${context}: ${axiosError.response?.status} - ${JSON.stringify(axiosError.response?.data)}`,
      );
    } else {
      this.logger.error(`Error in ${context}: ${error}`);
    }
  }
}
