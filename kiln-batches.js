// 此檔會公開部署。每批只填查詢碼、狀態和更新日期。
// 可用狀態：drying(乾燥)、waiting(等待燒製)、firing(燒製中)、inspection(出窯檢查)、complete(燒製完成)、awaiting-shipment(等待寄送)、shipping(寄送中)。
// 格式範例（上線前請以真實批次資料取代）：
// 'KILN-AB7Q': { stage: 'waiting', updated: '2026-11-09' },
const kilnBatches = {
  'KILN-AA26': { stage: 'firing', updated: '2026-11-09' },
  'KILN-': { stage: 'awaiting-shipment', updated: '2026-11-09' },
  'KILN-': { stage: 'shipping', updated: '2026-11-09' },
};