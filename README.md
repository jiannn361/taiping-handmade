# 手作體驗預約網站

首頁為 `index.html`。頁面可直接預覽，儲存預約與 LINE 配對需透過 Vercel 的伺服器功能。

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

## 預約管理與官方 LINE 配對

請把官方 LINE 聊天室的預約入口設為 `https://liff.line.me/2009010332-H3eAyCZD`，並在 LIFF 開啟 `chat_message.write` 和 `openid` 權限。`openid` 讓伺服器驗證遊客的 LINE 身分並完成配對，`profile` 可提供暱稱。遊客從這個入口開啟預約頁並儲存申請後，網站會把含短版預約編號的小卡送回開啟頁面的一對一聊天室。若無法透過 LINE 身分驗證配對，網站會再送出一則配對訊息。外部瀏覽器、群組或自動送出失敗時，頁面提供「到官方 LINE 傳送預約編號」按鈕，讓遊客自行按送出。

LINE 配對成功後，系統更新 Google 試算表的 LINE 欄位。若遊客是手動傳送編號，官方帳號會回覆小卡。兩種小卡都顯示體驗項目、日期、時間、人數和短版預約編號。你可以直接用私人試算表管理，也可以在 `/booking-admin.html` 用 Vercel 的 `BOOKING_ADMIN_KEY` 登入，輸入長版或短版編號查詢。回覆確認後，在「預約狀態」填「已確認」，或用管理頁的確認按鈕。預約建立後七天內可配對。預約編號與燒製批次碼分開使用。

### 第一次設定

1. 在自己的 Google Drive 新建一份私人空白試算表，命名「手作體驗預約名單」，共用存取設為「限制」。從「擴充功能 → Apps Script」開啟編輯器，用 `google-sheets/Bookings.gs` 的內容取代預設程式碼並儲存。選擇 `setupBookingSheet` 後按「執行」，依畫面授權。程式會建立「預約名單」分頁和欄位。
2. 在 Apps Script 的「專案設定 → 指令碼屬性」新增 `BOOKING_SHEETS_SECRET`。用下方指令產生一組 64 位十六進位金鑰，保存在密碼管理器。再選「部署 → 新增部署作業 → 網頁應用程式」，執行身分選「我」，存取對象選可供未登入者呼叫的「任何人」，並複製結尾是 `/exec` 的部署網址。這個網址只接受 Vercel 簽名的請求，試算表本身維持私人。
3. 在 Vercel 專案的正式環境設定下列變數，再部署新版程式。試算表金鑰填入 Apps Script 設定的同一組，管理金鑰另產生一組。各組金鑰都透過服務的設定頁輸入。

   | 設定名稱 | 填寫內容 |
   | --- | --- |
   | `BOOKING_SHEETS_URL` | Apps Script 的 `/exec` 部署網址 |
   | `BOOKING_SHEETS_SECRET` | Apps Script 指令碼屬性中的同一組金鑰 |
   | `BOOKING_ADMIN_KEY` | 專供工作室使用的 64 位十六進位管理金鑰。可用 `node -p "require('node:crypto').randomBytes(32).toString('hex')"` 產生 |
   | `LINE_CHANNEL_SECRET` | 官方帳號的 **Messaging API** Channel secret |
   | `LINE_CHANNEL_ACCESS_TOKEN` | 同一個 Messaging API Channel 的 Access token，用來回傳小卡與取得 LINE 暱稱 |

4. 確認 `config.js` 裡的 `officialAccount` 是工作室的官方帳號。在 LINE Developers 的 Messaging API 頁面，把 Webhook URL 設成 `https://你的正式網站/api/line-webhook`，按 Verify，再啟用 Use webhook 和 Webhook redelivery。如果官方帳號已有其他系統接收 Webhook，先把兩套處理整合到同一接收端。
5. 在手機從官方 LINE 聊天室的 LIFF 連結提交一筆測試預約，核對試算表新增一列、原聊天室收到含短版預約編號的小卡、同一列填上 LINE 時間及可取得的暱稱。用管理頁查詢小卡上的短版預約編號，確認找到同一筆預約。

若畫面顯示「預約系統尚未完成設定」，請到 Vercel 專案的 Logs，找 `/api/bookings` 的 `Booking setup` 紀錄。`missing` 代表該部署未讀到設定，`invalid format` 代表格式未通過檢查。紀錄只會列出設定名稱。修改 Production 環境變數後，請重新部署正式版本。

若顯示「暫時無法處理預約」，在同一頁 Logs 搜尋 `Booking Sheets (create)`。`google_access_denied` 代表 Google 拒絕存取，請核對網頁應用程式的部署權限。`script_rejected` 表示舊版 Apps Script 回傳了未細分的錯誤。要取得細節，請貼上最新版 `Bookings.gs`，在「部署 → 管理部署作業」編輯原部署並選「新版本」。新版可區分 `signature_mismatch`（兩邊金鑰不同）、`sheet_not_initialized`（需執行 `setupBookingSheet`）及分頁或標題列錯誤。紀錄只顯示錯誤類別。

管理名單時可修改「預約狀態」。檢視不同場次請用篩選器檢視畫面，讓程式寫入時的列順序維持固定。分頁名稱和欄位順序供程式使用。

「建立時間」和「LINE 訊息收到時間」以台灣時間顯示。若是從舊版更新，請在 Apps Script 貼上最新版 `Bookings.gs` 並執行一次 `setupBookingSheet`，轉換舊有 UTC 時間。接著編輯原網頁應用程式部署，選「新版本」並部署，讓後續的預約也使用同一格式。

上線前，請在表單補上工作室的正式個資告知內容和聯絡方式，定義已結案資料的清理期限，並在 Vercel 對 `/api/bookings` 的公開 POST 設定防濫用限制。原 LINE 記事本資料需按實際需求手動核對。此版本的管理金鑰只供單一管理者使用。

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

