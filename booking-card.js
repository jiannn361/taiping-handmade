function shortBookingCode(code) {
  return `BK-${code.slice(-12)}`;
}

function bookingLookupUrl(baseUrl, code) {
  const destination = new URL('/booking-status.html', baseUrl);
  destination.searchParams.set('code', shortBookingCode(code));
  return destination.href;
}

function bookingCard(booking, confirmation = false) {
  const title = confirmation ? '體驗預約已確認' : '體驗預約申請';
  const shortCode = shortBookingCode(booking.code);
  const rows = [
    ['體驗', booking.experience],
    ['日期', booking.date],
    [confirmation ? '確認時間' : '希望時間', booking.time],
    ['人數', `${booking.people} 人`],
    ['預約編號', shortCode]
  ];
  if (confirmation) rows.push(['集合地點', booking.location]);
  return {
    type: 'flex',
    altText: `${title}｜${booking.experience}｜${booking.date} ${booking.time}｜預約編號 ${shortCode}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '嘉義梅山太平', color: '#65775F', size: 'sm', weight: 'bold' },
          { type: 'text', text: title, size: 'xl', weight: 'bold', wrap: true },
          { type: 'separator' },
          ...rows.map(([label, value]) => ({
            type: 'box', layout: 'baseline', spacing: 'sm',
            contents: [
              { type: 'text', text: label, color: '#777777', size: 'sm', flex: 2 },
              { type: 'text', text: String(value), color: '#333333', size: 'sm', wrap: true, flex: 5 }
            ]
          })),
          { type: 'separator' },
          { type: 'text', text: confirmation ? '請依確認時間抵達集合地點，期待與您見面！' : '待工作室回覆確認後，預約才正式成立。', color: '#777777', size: 'xs', wrap: true }
        ]
      },
      ...(booking.lookupUrl ? { footer: { type: 'box', layout: 'vertical', contents: [
        { type: 'button', style: 'secondary', action: {
          type: 'uri', label: confirmation ? '查看我的預約' : '查詢我的預約', uri: booking.lookupUrl
        } }
      ] } } : {})
    }
  };
}

if (typeof module !== 'undefined') module.exports = { bookingCard, bookingLookupUrl, shortBookingCode };
