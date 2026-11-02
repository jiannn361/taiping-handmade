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
從官方帳號聊天室使用 https://liff.line.me/2009010332-K14upnUb 開啟並測試。
目前沒有預約資料庫，預約摘要傳回開啟 LIFF 的聊天室，由工作室回覆確認。
不要在網站檔案放入 channel secret 或 access token。
