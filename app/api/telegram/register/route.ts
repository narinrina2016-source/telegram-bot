import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ success: false, error: 'TELEGRAM_BOT_TOKEN is not set in environment variables.' }, { status: 400 });
  }

  // Get the base URL logically based on the current origin
  let origin = req.nextUrl.origin;
  try {
    const body = await req.json();
    if (body.origin) {
      origin = body.origin;
    }
  } catch (e) {
    // Ignore JSON parsing errors if body is empty
  }
  
  const webhookUrl = `${origin}/api/telegram/webhook`;

  try {
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
    
    const response = await fetch(telegramApiUrl);
    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({ success: true, message: 'Webhook registered successfully!', url: webhookUrl });
    } else {
      return NextResponse.json({ success: false, error: data.description }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
