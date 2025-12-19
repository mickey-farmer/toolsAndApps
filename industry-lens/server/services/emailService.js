/**
 * Email Service for Industry Lens
 * 
 * Modes:
 * - development: Logs emails to console + uses Ethereal (fake SMTP)
 * - production: Uses configured SMTP provider (SendGrid, Mailgun, etc.)
 * 
 * Configuration (via .env):
 * - EMAIL_MODE: 'development' or 'production'
 * - SMTP_HOST: SMTP server host
 * - SMTP_PORT: SMTP server port
 * - SMTP_USER: SMTP username
 * - SMTP_PASS: SMTP password
 * - EMAIL_FROM: Default sender email
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.testAccount = null;
    this.initialized = false;
    this.mode = process.env.EMAIL_MODE || 'development';
  }

  async initialize() {
    if (this.initialized) return;

    try {
      if (this.mode === 'production' && process.env.SMTP_HOST) {
        // Production: Use configured SMTP
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        console.log('[Email] Production mode - using configured SMTP');
      } else {
        // Development: Use Ethereal (fake SMTP for testing)
        this.testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: this.testAccount.user,
            pass: this.testAccount.pass,
          },
        });
        console.log('[Email] Development mode - using Ethereal');
        console.log('[Email] View emails at: https://ethereal.email');
        console.log('[Email] Login:', this.testAccount.user);
      }

      this.initialized = true;
    } catch (error) {
      console.error('[Email] Failed to initialize:', error);
      // Don't throw - allow app to continue without email
    }
  }

  async sendEmail({ to, subject, html, text }) {
    // Always log in development
    if (this.mode === 'development') {
      console.log('\n📧 [Email Service] Sending email:');
      console.log('   To:', to);
      console.log('   Subject:', subject);
      console.log('   Preview:', text?.substring(0, 100) + '...');
    }

    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.transporter) {
      console.log('[Email] Transporter not available - email not sent');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Industry Lens" <noreply@industrylens.com>',
        to,
        subject,
        text,
        html,
      });

      // In development, provide link to view the email
      if (this.mode === 'development') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('[Email] ✅ Sent! Preview URL:', previewUrl);
        return { success: true, messageId: info.messageId, previewUrl };
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[Email] Failed to send:', error);
      return { success: false, error: error.message };
    }
  }

  // Email Templates
  async sendWelcomeEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to Industry Lens!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #d4af37, #b8860b); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎬 Industry Lens</h1>
            </div>
            <div class="content">
              <h2>Welcome, ${user.username}!</h2>
              <p>Thank you for joining Industry Lens - the platform for entertainment professionals to share their experiences.</p>
              <p>With your account, you can:</p>
              <ul>
                <li>Search for industry professionals</li>
                <li>Read and write reviews</li>
                <li>Help maintain professional standards in the industry</li>
              </ul>
              <p>Remember: All reviews must be truthful and based on your genuine first-hand experiences.</p>
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/search" class="button">Start Exploring</a>
            </div>
            <div class="footer">
              <p>Industry Lens - Setting standards in entertainment</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to Industry Lens, ${user.username}! Thank you for joining the platform for entertainment professionals.`,
    });
  }

  async sendReviewApprovedEmail(user, review, professional) {
    return this.sendEmail({
      to: user.email,
      subject: `Your review of ${professional.name} has been approved!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .review-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e; }
            .button { display: inline-block; background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Review Approved</h1>
            </div>
            <div class="content">
              <h2>Great news, ${user.username}!</h2>
              <p>Your review of <strong>${professional.name}</strong> has been approved and is now visible to other users.</p>
              <div class="review-box">
                <strong>${review.title}</strong>
                <p style="color: #666;">${review.content.substring(0, 200)}${review.content.length > 200 ? '...' : ''}</p>
              </div>
              <p>Thank you for contributing to the Industry Lens community!</p>
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/professional/${professional.id}" class="button">View Profile</a>
            </div>
            <div class="footer">
              <p>Industry Lens - Setting standards in entertainment</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your review of ${professional.name} has been approved! Title: "${review.title}"`,
    });
  }

  async sendReviewRejectedEmail(user, review, professional, reason, details) {
    return this.sendEmail({
      to: user.email,
      subject: `Update on your review of ${professional.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .reason-box { background: #fff5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
            .button { display: inline-block; background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Review Not Approved</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.username},</h2>
              <p>Unfortunately, your review of <strong>${professional.name}</strong> could not be approved.</p>
              <div class="reason-box">
                <strong>Reason:</strong> ${reason}
                ${details ? `<p style="margin-top: 10px;"><strong>Details:</strong> ${details}</p>` : ''}
              </div>
              <p>If you believe this was an error, or if you'd like to submit a revised review, please ensure it complies with our Terms and Conditions.</p>
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/terms" class="button">View Guidelines</a>
            </div>
            <div class="footer">
              <p>Industry Lens - Setting standards in entertainment</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your review of ${professional.name} was not approved. Reason: ${reason}${details ? `. Details: ${details}` : ''}`,
    });
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Reset your Industry Lens password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #d4af37, #b8860b); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .warning { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.username},</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <div class="warning">
                <strong>⚠️ This link expires in 1 hour.</strong><br>
                If you didn't request this, you can safely ignore this email.
              </div>
            </div>
            <div class="footer">
              <p>Industry Lens - Setting standards in entertainment</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Reset your password by visiting: ${resetUrl}. This link expires in 1 hour.`,
    });
  }

  async sendAdminDigestEmail(adminEmail, stats) {
    return this.sendEmail({
      to: adminEmail,
      subject: `Industry Lens Admin Digest - ${new Date().toLocaleDateString()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: #d4af37; margin: 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .stat-box { background: white; padding: 20px; border-radius: 8px; text-align: center; }
            .stat-number { font-size: 32px; font-weight: bold; color: #d4af37; }
            .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
            .button { display: inline-block; background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎬 Admin Digest</h1>
            </div>
            <div class="content">
              <h2>Here's what needs attention:</h2>
              <div class="stat-grid">
                <div class="stat-box">
                  <div class="stat-number">${stats.pendingReviews}</div>
                  <div class="stat-label">Pending Reviews</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${stats.pendingFlags}</div>
                  <div class="stat-label">Pending Flags</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${stats.newUsersToday || 0}</div>
                  <div class="stat-label">New Users Today</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${stats.totalReviews}</div>
                  <div class="stat-label">Total Reviews</div>
                </div>
              </div>
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/admin" class="button">Go to Admin Panel</a>
            </div>
            <div class="footer">
              <p>Industry Lens Admin Dashboard</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Admin Digest: ${stats.pendingReviews} pending reviews, ${stats.pendingFlags} pending flags.`,
    });
  }
}

// Singleton instance
const emailService = new EmailService();

module.exports = emailService;

