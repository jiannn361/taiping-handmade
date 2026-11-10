// 圖片先放進 images 資料夾，再把下方空字串改成檔案路徑。留空就不顯示。
// 例如 mascot: 'images/mascot.png'；請勿放入密鑰或存取權杖。
globalThis.BOOKING_CONFIG = {
  liffId: '2009010332-H3eAyCZD',
  officialAccount: '@703hkgpk',
  mascot: 'images/logo.png',
  // 每週固定休息：0=日、1=一、2=二、3=三、4=四、5=五、6=六。
  closedWeekdays: [3],
  // 臨時整天休息：例如 ['2026-12-05', '2026-12-06']。刪除日期即可恢復預約。
  closedDates: ['2027-02-04','2027-02-05','2027-02-06','2027-02-07','2027-02-08','2027-02-09'],
  // 陶藝國定假日連假整段暫停線上預約，單日假日照常開放；下方可設定連假例外開放日期，不覆蓋週三或 closedDates。
  potteryHolidayOpenDates: [],
  latestNews: {
    title: '陶藝燒製與作品等候公告',
    text: '近期即將燒製一批陶藝作品。接下來預約的陶藝體驗，將需要較長的等候時間(約1年)，完成時間以工作室通知為準，敬請耐心等候。',
    image: '' // 日後可填 'images/news.jpg'，沒有圖片時只顯示文字。
  },
  experiencePhotos: { '手拉胚': 'images/pottery.jpg', '陶杯刻畫': 'images/cup.jpg', '植物槌染': 'images/plant.jpg' },
  // 支援 PNG、JPG、WebP 和動態 GIF，例如 'images/pottery-process.gif'。
  processImages: { '手拉胚': 'images/pottery.png', '陶杯刻畫': 'images/cup.png', '植物槌染': 'images/plant.png' }
};







