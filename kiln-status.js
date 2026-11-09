const kilnStages = [
  ['drying', '乾燥中'],
  ['waiting', '等待排窯'],
  ['firing', '燒製中'],
  ['inspection', '出窯檢查'],
  ['complete', '燒製完成']
];

const shippingStages = [
  ...kilnStages,
  ['awaiting-shipment', '待寄送'],
  ['shipping', '寄送中，請留意包裹']
];

const kilnLookup = document.getElementById('kiln-lookup');
const kilnCode = document.getElementById('kiln-code');
const kilnMessage = document.getElementById('kiln-message');
const kilnResult = document.getElementById('kiln-result');
const kilnTimeline = document.getElementById('kiln-stages');
const kilnUpdated = document.getElementById('kiln-updated');

kilnCode.addEventListener('input', () => {
  kilnMessage.textContent = '';
  kilnResult.hidden = true;
});

kilnLookup.addEventListener('submit', event => {
  event.preventDefault();
  const code = kilnCode.value.trim().toUpperCase();
  const batch = Object.hasOwn(kilnBatches, code) ? kilnBatches[code] : null;
  const current = shippingStages.findIndex(([stage]) => stage === batch?.stage);

  if (current === -1) {
    kilnMessage.textContent = '查不到這個批次。請確認查詢碼，或向陶藝現場詢問。';
    kilnResult.hidden = true;
    return;
  }

  const visibleStages = current < kilnStages.length ? kilnStages : shippingStages;
  kilnTimeline.replaceChildren(...visibleStages.map(([, label], index) => {
    const item = document.createElement('li');
    item.textContent = label;
    if (index === current) item.setAttribute('aria-current', 'step');
    return item;
  }));
  kilnUpdated.dateTime = batch.updated;
  kilnUpdated.textContent = batch.updated;
  kilnMessage.textContent = '目前進度：' + visibleStages[current][1];
  kilnResult.hidden = false;
});
