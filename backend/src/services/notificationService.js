import nodemailer from 'nodemailer';
import fetch from 'node-fetch';
import Alert from '../models/Alert.js';
import User from '../models/User.js';

// Function to check if email is enabled (check at runtime, not module load time)
function isEmailEnabled() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  const enabled = Boolean(
    host && host.trim().length > 0 &&
    user && user.trim().length > 0 &&
    pass && pass.trim().length > 0
  );
  
  return enabled;
}

// Check email configuration - log actual values for debugging
const smtpHost = process.env.SMTP_HOST;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

console.log('🔍 Email config check (raw values):', {
  SMTP_HOST: smtpHost ? `"${smtpHost}" (length: ${smtpHost.length})` : 'undefined',
  SMTP_USER: smtpUser ? `"${smtpUser}" (length: ${smtpUser.length})` : 'undefined',
  SMTP_PASS: smtpPass ? `"${'*'.repeat(smtpPass.length)}" (length: ${smtpPass.length})` : 'undefined',
});

const emailEnabled = isEmailEnabled();

// Log email configuration status on module load
console.log('📧 Email service initialization:', {
  emailEnabled,
  smtpHost: process.env.SMTP_HOST || 'NOT SET',
  smtpPort: process.env.SMTP_PORT || '587 (default)',
  smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 10)}...` : 'NOT SET',
  smtpPass: process.env.SMTP_PASS ? 'SET (hidden)' : 'NOT SET',
  smtpSecure: process.env.SMTP_SECURE || 'false (default)',
  hasTransporter: emailEnabled,
});

// Verify environment variables are actually set (for debugging)
if (!emailEnabled) {
  console.warn('⚠️ Email service is DISABLED. Check your .env file:');
  console.warn('   SMTP_HOST:', process.env.SMTP_HOST || '❌ NOT SET');
  console.warn('   SMTP_USER:', process.env.SMTP_USER || '❌ NOT SET');
  console.warn('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ SET' : '❌ NOT SET');
  console.warn('💡 Make sure .env file is in the backend/ directory and restart the server after changes.');
}

const smsWebhookUrl = process.env.SMS_WEBHOOK_URL;

const transporter = emailEnabled
  ? nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

async function sendEmail(recipients, subject, text, html = null) {
  // Normalize recipients to array
  if (!recipients) {
    return { sent: false, reason: 'No recipients provided' };
  }
  
  const recipientsArray = Array.isArray(recipients) ? recipients : [recipients];
  
  // Filter out any null/undefined/empty recipients
  const validRecipients = recipientsArray.filter(r => r && typeof r === 'string' && r.trim().length > 0);
  
  // Check email enabled at runtime (not just module load time)
  const emailEnabledNow = isEmailEnabled();
  if (!emailEnabledNow) {
    console.error('❌ Email not enabled. Current env vars:', {
      SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
      SMTP_USER: process.env.SMTP_USER || 'NOT SET',
      SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'NOT SET',
    });
    return { sent: false, reason: 'Email not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env' };
  }
  
  if (validRecipients.length === 0) {
    return { sent: false, reason: 'No valid recipients provided' };
  }

  // Create transporter if not exists or recreate if needed
  let currentTransporter = transporter;
  if (!currentTransporter && emailEnabledNow) {
    currentTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (!currentTransporter) {
    return { sent: false, reason: 'Email transporter not initialized' };
  }

  try {
    const mailOptions = {
      from: process.env.NOTIFY_EMAIL_FROM || process.env.SMTP_USER,
      to: validRecipients.length === 1 ? validRecipients[0] : validRecipients,
      subject,
      text,
    };

    // Add HTML if provided
    if (html) {
      mailOptions.html = html;
    }

    const info = await currentTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${validRecipients.length} recipient(s)`);
    return { sent: true, messageId: info.messageId, count: validRecipients.length };
  } catch (err) {
    console.error('Email send error:', err);
    
    // Provide helpful error messages for common Gmail issues
    let errorMessage = err.message;
    if (err.code === 'EAUTH') {
      if (err.message.includes('BadCredentials') || err.message.includes('Username and Password not accepted')) {
        errorMessage = 'Gmail authentication failed. Please check:\n' +
          '1. You are using a Gmail App Password (not your regular password)\n' +
          '2. 2-Factor Authentication is enabled on your Google account\n' +
          '3. The App Password is correct (16 characters, no spaces)\n' +
          '4. Generate a new App Password at: https://myaccount.google.com/apppasswords';
      } else if (err.message.includes('Less secure app access')) {
        errorMessage = 'Gmail requires App Passwords. Generate one at: https://myaccount.google.com/apppasswords';
      }
    }
    
    return { sent: false, error: errorMessage };
  }
}

async function sendSms(phones, message) {
  // Normalize phones to array
  if (!phones) {
    return { sent: false, reason: 'No phone numbers provided' };
  }
  
  const phonesArray = Array.isArray(phones) ? phones : [phones];
  
  // Filter out any null/undefined/empty phone numbers
  const validPhones = phonesArray.filter(p => p && (typeof p === 'string' || typeof p === 'number') && String(p).trim().length > 0);
  
  if (!smsWebhookUrl) {
    return { sent: false, reason: 'SMS not configured. Please set SMS_WEBHOOK_URL in .env' };
  }
  
  if (validPhones.length === 0) {
    return { sent: false, reason: 'No valid phone numbers provided' };
  }

  const results = [];
  for (const phone of validPhones) {
    try {
      const resp = await fetch(smsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, message }),
      });
      results.push({ to: phone, status: resp.status });
    } catch (err) {
      console.error('SMS send error:', err);
      results.push({ to: phone, error: err.message });
    }
  }

  return { sent: true, results };
}

export async function createSystemAlert({ message, level = 'MODERATE', source = 'manual', metadata = {}, io }) {
  const alert = new Alert({ message, level, source, metadata });
  await alert.save();

  if (io) {
    io.emit('broadcast-alert', {
      ...alert.toObject(),
      id: alert._id.toString(),
      _id: undefined,
    });
  }

  return alert;
}

export async function notifyRegisteredUsers({ title, message, level = 'MODERATE', channels = ['email', 'sms'], io, metadata = {} }) {
  console.log('📢 notifyRegisteredUsers called:', { title, message, level, channels });
  
  const users = await User.find({}, 'email phone name').lean();
  console.log(`👥 Found ${users.length} users in database`);
  
  // Filter and validate emails - only include non-empty, trimmed email strings
  const emails = users
    .filter(u => u.email && typeof u.email === 'string' && u.email.trim().length > 0)
    .map(u => u.email.trim());
  console.log(`📧 Found ${emails.length} users with valid emails:`, emails);
  
  // Filter and validate phones - only include non-empty phone numbers
  const phones = users
    .filter(u => u.phone && (typeof u.phone === 'string' || typeof u.phone === 'number') && String(u.phone).trim().length > 0)
    .map(u => String(u.phone).trim());
  console.log(`📱 Found ${phones.length} users with valid phones`);

  const subject = title || `Alert: ${level}`;
  const notifyMessage = message;
  
  const emailEnabledNow = isEmailEnabled();
  console.log('📨 Email configuration status (runtime check):', {
    emailEnabled: emailEnabledNow,
    hasTransporter: !!transporter,
    smtpHost: process.env.SMTP_HOST || 'NOT SET',
    smtpUser: process.env.SMTP_USER || 'NOT SET',
    smtpPass: process.env.SMTP_PASS ? 'SET' : 'NOT SET',
  });

  // Create HTML email template
  const htmlEmail = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${level === 'CRITICAL' ? '#dc3545' : level === 'HIGH' ? '#fd7e14' : level === 'MODERATE' ? '#ffc107' : '#28a745'}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
        .level-badge { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🚨 ${subject}</h2>
          <span class="level-badge" style="background-color: rgba(255,255,255,0.3);">${level}</span>
        </div>
        <div class="content">
          <p>${notifyMessage.replace(/\n/g, '<br>')}</p>
          ${metadata.incidentId ? `<p><strong>Incident ID:</strong> ${metadata.incidentId}</p>` : ''}
        </div>
        <div class="footer">
          <p>Suraksha Setu - Disaster Response System</p>
          <p>This is an automated notification. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const results = {
    audience: { total: users.length, emails: emails.length, phones: phones.length },
    email: null,
    sms: null,
  };

  if (channels.includes('email')) {
    console.log('📧 Attempting to send emails to:', emails);
    results.email = await sendEmail(emails, subject, notifyMessage, htmlEmail);
    console.log('📧 Email send result:', results.email);
  } else {
    console.log('⏭️ Email channel not requested, skipping');
  }

  if (channels.includes('sms')) {
    console.log('📱 Attempting to send SMS to:', phones);
    results.sms = await sendSms(phones, notifyMessage);
    console.log('📱 SMS send result:', results.sms);
  } else {
    console.log('⏭️ SMS channel not requested, skipping');
  }

  // Always emit in-app if socket present and requested
  if (io && channels.includes('in_app')) {
    console.log('🔔 Emitting in-app notification via Socket.IO');
    const alertPayload = {
      message: notifyMessage,
      title: subject,
      level,
      metadata,
      created_at: new Date().toISOString(),
    };
    console.log('📤 Emitting broadcast-alert with payload:', alertPayload);
    io.emit('broadcast-alert', alertPayload);
  } else {
    console.log('⏭️ In-app notifications not requested or no Socket.IO instance');
    if (!io) {
      console.warn('⚠️ Socket.IO instance (io) is not available');
    }
    if (!channels.includes('in_app')) {
      console.log('ℹ️ In-app channel not in channels array:', channels);
    }
  }

  console.log('✅ Notification process completed. Results:', results);
  return results;
}

// Utility for one-off transactional emails (e.g., password reset)
export async function sendEmailToRecipients({ recipients, subject, text, html = null }) {
  return sendEmail(recipients, subject, text, html);
}

// Test email configuration
export async function testEmailConfiguration(testRecipient) {
  if (!emailEnabled) {
    return { 
      success: false, 
      message: 'Email not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env' 
    };
  }

  const testSubject = 'Suraksha Setu - Email Test';
  const testMessage = 'This is a test email from Suraksha Setu. If you receive this, your email configuration is working correctly!';
  
  const result = await sendEmail([testRecipient], testSubject, testMessage);
  
  if (result.sent) {
    return { 
      success: true, 
      message: `Test email sent successfully to ${testRecipient}`,
      messageId: result.messageId 
    };
  } else {
    return { 
      success: false, 
      message: `Failed to send test email: ${result.error || result.reason}` 
    };
  }
}