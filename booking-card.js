function bookingCard(booking) {
  const rows = [
    ['體驗', booking.experience],
    ['日期', booking.date],
    ['希望時間', booking.time],
    ['人數', `${booking.people} 人`]
  ];
  return {
    type: 'flex',
    altText: `體驗預約申請｜${booking.experience}｜${booking.date} ${booking.time}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '嘉義梅山太平', color: '#65775F', size: 'sm', weight: 'bold' },
          { type: 'text', text: '體驗預約申請', size: 'xl', weight: 'bold', wrap: true },
          { type: 'separator' },
          ...rows.map(([label, value]) => ({
            type: 'box', layout: 'baseline', spacing: 'sm',
            contents: [
              { type: 'text', text: label, color: '#777777', size: 'sm', flex: 2 },
              { type: 'text', text: String(value), color: '#333333', size: 'sm', wrap: true, flex: 5 }
            ]
          })),
          { type: 'separator' },
          { type: 'text', text: '待工作室回覆確認後，預約才正式成立。', color: '#777777', size: 'xs', wrap: true }
        ]
      }
    }
  };
}

if (typeof module !== 'undefined') module.exports = bookingCard;
