import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    console.log('Received Telegram Update:', update);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    // Basic response handling
    if (update.message && update.message.text && botToken) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      let replyText = "សួស្តី! (Hello!) ខ្ញុំកំពុងដំណើរការ។";
      if (text === '/start') {
        replyText = "Welcome to the Bot! ដំណើរការបានជោគជ័យ។";
      }

      // Send the message back via Telegram API
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText
        })
      });
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    return NextResponse.json({ ok: false, error: 'Failed to process update' }, { status: 500 });
  }
}
