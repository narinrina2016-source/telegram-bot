import { Telegraf } from 'telegraf';
import { NextRequest, NextResponse } from 'next/server';

const bot = process.env.TELEGRAM_BOT_TOKEN 
  ? new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
  : null;

export async function POST(req: NextRequest) {
  if (!bot) {
    return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 500 });
  }

  try {
    const { employeeId, employeeName, method, checkType, telegramId } = await req.json();

    const checkTypeName = checkType === 'in' ? 'ម៉ោងចូល (Check In)' : 'ម៉ោងចេញ (Check Out)';
    const timeNow = new Date().toLocaleString('km-KH', { 
      timeZone: 'Asia/Phnom_Penh',
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const message = 
      `📝 *កំណត់ត្រាវត្តមានថ្មី*\n\n` +
      `👤 *បុគ្គលិក*: ${employeeName} (${employeeId})\n` +
      `⏱ *ប្រភេទ*: ${checkTypeName}\n` +
      `📌 *វិធីសាស្ត្រ*: ${method}\n` +
      `⏰ *ម៉ោង*: ${timeNow}`;

    // Send to Admin Group
    const adminGroupId = process.env.TELEGRAM_ADMIN_GROUP_ID;
    if (adminGroupId) {
      bot.telegram.sendMessage(adminGroupId, message, { parse_mode: 'Markdown' }).catch(console.error);
    }

    // Send DM to Employee
    if (telegramId) {
       bot.telegram.sendMessage(telegramId, `✅ បានកត់ត្រាជោគជ័យ។\n${message}`, { parse_mode: 'Markdown' }).catch(console.error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Notify Error:', error);
    return NextResponse.json({ error: 'Failed to notify' }, { status: 500 });
  }
}
