import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { reportMonth, data, chatId } = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json({ success: false, error: 'TELEGRAM_BOT_TOKEN is not configured.' }, { status: 400 });
    }

    if (!chatId) {
      return NextResponse.json({ success: false, error: 'Chat ID is required.' }, { status: 400 });
    }

    // Top 10 by hours worked
    const topData = [...data]
      .map(d => ({
        name: d.name || 'Unknown',
        totalHoursFixed: parseFloat(d.totalHoursFixed || '0') || 0
      }))
      .sort((a, b) => b.totalHoursFixed - a.totalHoursFixed)
      .slice(0, 10);
    
    const chartConfig = {
      type: 'bar',
      data: {
        labels: topData.map(d => d.name),
        datasets: [{
          label: 'Total Hours Worked',
          data: topData.map(d => d.totalHoursFixed),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }]
      },
      options: {
        title: {
          display: true,
          text: `Attendance Report - ${reportMonth}`
        }
      }
    };

    const chartUrl = `https://quickchart.io/chart?w=800&h=400&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

    // Format text summary safely as HTML to avoid Telegram markdown parser crashes
    const totalEmployees = data.length;
    const totalDays = data.reduce((acc: number, cur: any) => acc + (Number(cur.daysWorked) || 0), 0);
    const totalLate = data.reduce((acc: number, cur: any) => acc + (Number(cur.lateDays) || 0), 0);

    const caption = `📊 <b>Monthly Attendance Report: ${reportMonth}</b>\n\n` +
      `👥 Total Employees Active: ${totalEmployees}\n` +
      `📅 Total Days Worked (combined): ${totalDays}\n` +
      `⏰ Total Late Check-ins: ${totalLate}\n\n` +
      `<i>This chart shows the top employees by total hours worked.</i>`;

    // Send Photo to Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
    
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: chartUrl,
        caption: caption,
        parse_mode: 'HTML'
      })
    });

    const tgData = await response.json();

    if (tgData.ok) {
      return NextResponse.json({ success: true, message: 'Report sent successfully!' });
    } else {
      console.error("Telegram API Error:", tgData);
      return NextResponse.json({ success: false, error: tgData.description }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Send Report Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
