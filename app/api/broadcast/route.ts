import { Telegraf } from 'telegraf';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const bot = process.env.TELEGRAM_BOT_TOKEN 
  ? new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
  : null;

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export async function POST(req: NextRequest) {
  if (!bot) {
    return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 500 });
  }

  try {
    const { message, specificTelegramId } = await req.json();

    if (!supabaseUrl || !supabaseServiceKey) {
       return NextResponse.json({ error: 'Supabase unconfigured' }, { status: 500 });
    }

    if (specificTelegramId) {
      // Send only to the specific user (e.g. Payslip)
      try {
        await bot.telegram.sendMessage(specificTelegramId, message, { parse_mode: 'Markdown' });
        return NextResponse.json({ ok: true, sentCount: 1 });
      } catch (e) {
        console.error(`Failed to send to ${specificTelegramId}`, e);
        return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
      }
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('telegram_id')
      .not('telegram_id', 'is', null)
      .eq('active', true)
      .range(0, 999);

    if (employees) {
      let sentCount = 0;
      for (const emp of employees) {
        if (emp.telegram_id) {
          try {
            await bot.telegram.sendMessage(emp.telegram_id, `📢 *សេចក្តីប្រកាស / Announcement*\n\n${message}`, { parse_mode: 'Markdown' });
            sentCount++;
          } catch (e) {
            console.error(`Failed to send to ${emp.telegram_id}`, e);
          }
        }
      }
      return NextResponse.json({ ok: true, sentCount });
    }

    return NextResponse.json({ error: 'No recipients' }, { status: 400 });
  } catch (error) {
    console.error('Broadcast Error:', error);
    return NextResponse.json({ error: 'Failed to broadcast' }, { status: 500 });
  }
}
