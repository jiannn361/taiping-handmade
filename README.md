# 手作體驗預約網站

將本資料夾內容上傳到 GitHub 儲存庫根目錄，首頁為 index.html，無須安裝或編譯。

## 自己放圖片

1. 把圖片放進 images 資料夾，建議用英文檔名。
2. 編輯 config.js 的對應欄位：
   - mascot：頁首吉祥物，例如 'images/mascot.png'。
   - experiencePhotos：各體驗照片，例如 'images/pottery.jpg'。
   - processImages：點選體驗時顯示的流程圖，例如 'images/pottery-process.png'。
3. 空字串 '' 表示不顯示；目前流程圖預設全部關閉。
4. 圖片及修改後的 config.js 必須一起上傳。

## 改文字

- index.html：標題、價格、地點及表單欄位。
- app.js 的 notesByExperience：各體驗注意事項。
- style.css：配色及版面。

## LINE

上線後，將網站 HTTPS 正式網址填入 LIFF Endpoint URL，啟用 chat_message.write 權限。
從官方帳號聊天室使用 https://liff.line.me/2009010332-H3eAyCZD 開啟並測試。
目前沒有預約資料庫，預約摘要傳回開啟 LIFF 的聊天室，由工作室回覆確認。
不要在網站檔案放入 channel secret 或 access token。

## 陶藝燒製進度

1. 和陶藝老師約定批次，給同一批作品使用同一個查詢碼，例如 `KILN-AB7Q`。體驗結束時可寫在小卡上，讓遊客從預約首頁進入查詢頁。
2. 在 `kiln-batches.js` 加入該批資料，例如 `'KILN-AB7Q': { stage: 'waiting', updated: '2026-11-09' },`。日期用 `YYYY-MM-DD`。狀態可填 `drying`（乾燥中）、`waiting`（等待排窯）、`firing`（燒製中）、`inspection`（出窯檢查）、`complete`（燒製完成）。整批準備寄送時可填 `awaiting-shipment`（待寄送），交寄後可填 `shipping`（寄送中，請留意包裹）。同批作品若有自取或分開寄送，可保留「燒製完成」，個別通知寄送進度。
3. 收到老師的進度更新時，修改該批狀態和日期，提交到 GitHub，等 Vercel 部署完成。可先在本機開啟 `kiln-status.html` 核對。首次上線前請加入真實批次。

`kiln-batches.js` 是公開網站檔案，查詢碼只用來找到批次。檔案只放批次查詢碼、燒製狀態和更新日期。姓名、電話、寄送地址及批次對應的遊客名單留在原本的紙本流程。

## 固定公休與臨時休息
config.js 的 closedWeekdays: [3] 表示每週三固定公休。
臨時整天休息請在 closedDates 填入日期，例如：
closedDates: ['2026-12-05', '2026-12-06'],
日期必須使用 YYYY-MM-DD，並放在單引號內，多個日期以逗號分隔。
刪除日期後即可恢復預約（每週三仍固定休息）。目前這份設定以整天為單位。
修改後提交到 GitHub，等待 Vercel 完成部署；已開啟的頁面需重新整理。
吉祥物放入 images/mascot.png，將 mascot 改為 'images/mascot.png'，會顯示在「手作時光」旁。

部署須包含 index.html、style.css、config.js、availability.js、app.js 與圖片資料夾。

目前統一使用此資料夾最外層的 index.html，直接雙擊即可預覽。
images 中 pottery.jpg、cup.jpg、plant.jpg 已接到三項體驗照片。
舊版都放入 _previous_versions，請勿再使用該資料夾內的舊網頁。
.gitignore 會排除舊版備份及 ZIP，請將 .gitignore 也一起提交。
本次整理僅修正本機檔案，尚未提交或上傳 GitHub。

2026-11-03 版面與 LINE 更新
- 日期獨佔一列，時間移至下一列。
- 三項體驗照片顯示區提高，採完整顯示，不裁切。可用 JPG、PNG、WebP；建議橫式 4:3，寬度至少 1200px。直式也可完整顯示，旁邊可能留白。
- 將標誌命名為 logo.png 放進 images，將顯示在「嘉義梅山太平」左側。建議透明背景正方形 PNG。若未放圖則自動隱藏。
- LINE 改為 Flex 預約小卡，增加 line.js 檔案，上傳時務必一起包含。
- 本機 file 網址無法直接傳送 LINE。上線網址需設為 LIFF Endpoint URL；官方帳號聊天室入口必須使用 https://liff.line.me/2009010332-H3eAyCZD ，並啟用 chat_message.write 權限。
- 點選一般 HTTPS 網址開啟的 LINE 內建瀏覽器，不等於 LIFF 瀏覽器。請從官方帳號聊天室點 LIFF 連結測試。
- Flex 小卡透過 LIFF 傳送不會觸發訊息 webhook。若後續需要自動記錄或自動回覆，須另加後端流程。


體驗須知彈出視窗
點選任一體驗即可查看須知，關閉後留在原本填表位置。
若要放動態過程，將 GIF 放進 images，再修改 config.js 的 processImages，例如：
'手拉胚': 'images/pottery-process.gif'
建議檔案小於 5MB、橫式寬度約 800–1200px，避免手機載入太慢。
設定留空 '' 即不顯示過程圖片。GIF 有播放／暫停按鈕，減少動態效果模式下預設不播放。
上傳更新時務必包含新增的 notices.js。

最新資訊與陶藝假日規則
- config.js 的 latestNews 可修改公告 title、text，image 留空只顯示文字；填 images/news.jpg 可加圖片。
- 手拉胚與陶杯刻畫：週六、日僅 15:00／15:30／16:00；平日維持原時段。
- 含國定假日或補假的連續休假（至少2天）整段暫停陶藝線上預約，請聯繫詢問；單獨一天的國定假日照常開放，植物槌染不受此規則限制，仍遵守週三及臨時休息設定。
- potteryHolidayOpenDates 可填例外開放日期，例如 ['2026-12-25']；不會覆蓋 closedDates 或週三固定休息。遇週末仍只有下午三時段。
- holidays.js 來自人事行政總處官方辦公日曆，收錄2026、2027年；含國定假日及補假，非僅依星期判定。
- 來源 https://data.gov.tw/dataset/14718 （政府資料開放授權條款第1版）。這是靜態年度資料，需隨官方新版公告更新；未收錄年份的陶藝預約會暫停。
- 更新 GitHub 時請一併上傳 holidays.js、updates.js，以及這次修改的所有檔案。

