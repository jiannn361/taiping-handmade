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

