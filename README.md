# Su Ying Hsin — Portfolio

蘇映欣的設計作品集網站，收錄 UI/UX、服務設計、品牌識別、平面設計與互動網頁專案。

## Website structure

- `index.html` — 作品集首頁
- `go-ride.html` — 定點 GO 服務與產品設計
- `emo-site/` — 我獨自 EMO 互動網站
- `other-project-*.html` — 其他作品介紹頁
- `assets/` — 網站使用的圖片與媒體素材

此專案是純 HTML、CSS 與 JavaScript 網站，不需要安裝套件或執行建置指令。

## Local preview

在專案資料夾執行：

```bash
python3 -m http.server 4173
```

然後開啟 `http://localhost:4173/`。

## Publish with GitHub Pages

1. 將此資料夾推送到 GitHub repository。
2. 前往 repository 的 **Settings → Pages**。
3. 在 **Build and deployment** 選擇 **Deploy from a branch**。
4. Branch 選擇 `main`，資料夾選擇 `/ (root)`，然後儲存。
5. GitHub 完成部署後，即可取得公開網站網址。

## Notes

- 網站入口必須保留為根目錄的 `index.html`。
- `.nojekyll` 會讓 GitHub Pages 直接發布目前的靜態檔案結構。
- `.gitignore` 已排除未被正式網站使用的舊版與原始素材，避免 repository 過大。
