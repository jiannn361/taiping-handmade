// 圖片先放進 images 資料夾，再把下方空字串改成檔案路徑。留空就不顯示。
// 例如 mascot: 'images/mascot.png'；請勿放入密鑰或存取權杖。
window.BOOKING_CONFIG = {
  liffId: '2009010332-K14upnUb',
  officialAccount: '@703hkgpk',
  mascot: '',
  // 每週固定休息：0=日、1=一、2=二、3=三、4=四、5=五、6=六。
  closedWeekdays: [3],
  // 臨時整天休息：例如 ['2026-12-05', '2026-12-06']。刪除日期即可恢復預約。
  closedDates: [],
  experiencePhotos: { '手拉胚': 'images/pottery.jpg', '陶杯刻畫': 'images/cup.jpg', '植物槌染': 'images/plant.jpg' },
  processImages: { '手拉胚': '', '陶杯刻畫': '', '植物槌染': '' }
};

