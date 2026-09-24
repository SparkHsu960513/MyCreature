# 我的作品集 — 物件導向程式設計

> 這是你整學期的作品集 repo：16 週的作品、你的 AI 工作流、你的成長紀錄，全部在這裡累積。
> 課程頁：<https://course.interaction.tw/oop/>

## 🚀 三分鐘開工（學校電腦也一樣）

學校公用電腦每次都會被還原？沒關係——**你的環境不在那台電腦上**。

1. 開瀏覽器 → 登入 [github.com](https://github.com)
2. 進到你的這個 repo → 綠色 **Code** 按鈕 → **Codespaces** → **Create codespace on main**
   （第二次以後：同一個地方會看到你之前的 codespace，點開即續，幾秒就好）
3. 等瀏覽器裡出現 **VS Code 版面**——這就是你的工作環境，任何電腦打開都一模一樣
4. 下方終端機輸入 `claude` → 登入你的 Claude 帳號（登入一次即可，之後都記得你）——**照下面的「登入 SOP」做，不要等它自動開瀏覽器**
5. 開始工作。做完記得：**Source Control 面板 → commit → push**（推上去的才算數）

## 📁 這個 repo 的結構

```
CLAUDE.md        ← 你的 AI 工作流（W3 起自己維護，這是課程核心作業之一）
.devcontainer/   ← 環境定義（Claude Code 已預裝）——你不用動它
```

其餘是空白的——這是你的空間，怎麼組織由你（和你的工作流）決定。

## ✍️ 交作業（四件套）

每次作業自己開一個資料夾（例如 `m1-world/`（每個里程碑一個資料夾）），裡面要有：

1. **程式碼**：可執行（p5.js 網頁作品＝`index.html`＋`sketch.js`，對著 `index.html` 按 Live Preview 看結果）
2. **截圖或影片**：放進同一個資料夾
3. **反思**：`README.md` 裡寫 100–200 字（自己寫，AI 不代寫）
4. **AI 揭露欄**：`README.md` 裡照下表填（沒用到就寫「未使用」）

```markdown
## AI 揭露欄
| 項目 | 內容 |
|------|------|
| 工具 | （例：Claude Pro／未使用） |
| 日期 | |
| prompt 摘要 | |
| 採用範圍 | （哪些碼／想法來自 AI，自己改了什麼） |
```

Deadline 前 push＝繳交。commit 的時間戳就是紀錄，每一步嘗試都是過程的證據。

## 🎞️ 簡報上傳 SOP（M1／M2／M3／M6 報告站）

報告站每個人都要上台簡報，簡報檔跟四件套一起放進**該站資料夾**。照這四步，老師一定看得到：

1. **匯出成 PDF**：PowerPoint、Keynote、Google Slides、Canva 都有「匯出／下載 PDF」——**一律傳 PDF**，因為 GitHub 網頁能直接翻頁預覽 PDF，老師點開就能看；pptx 傳上去只能下載、不能預覽，別用
2. **取名放對位置**：檔名照「站名-簡報.pdf」，放進該站資料夾，例如：

   ```
   m1-world/m1-簡報.pdf
   m2-species/m2-簡報.pdf
   m3-creature/m3-簡報.pdf
   m6-zoo/m6-簡報.pdf
   ```

3. **傳上去（兩種方法挑一種）**：
   - **Codespace**：把 PDF 直接拖進左邊檔案總管的該站資料夾 → Source Control 寫一句訊息 → **Commit** → **Sync Changes**
   - **repo 網頁**：打開你的 repo → 點進該站資料夾 → **Add file → Upload files** → 拖檔案進去 → **Commit changes**（單檔上限 25MB，超過幾乎都是簡報裡塞了影片——把影片抽出來另外放進資料夾，簡報裡留截圖就好）
4. **驗收**：push 完打開 repo 網頁，點那個 PDF——**能翻頁預覽＝交付成功**，老師看到的就是這個畫面

用 Google Slides 報告的人：PDF 照傳一份，想附雲端連結的話記得開「知道連結的使用者皆可檢視」再把連結寫進該站 `README.md`——連結會失效、PDF 不會，**PDF 才是交付本體**。

## 🔑 Claude 登入 SOP（Codespace 裡一定要走手動流程）

Codespace 是雲端容器，登入的「自動跳轉」到不了它——**要手動貼授權碼**：

1. 終端機打 `claude` → 選 **Claude account with subscription**
2. 畫面會印出一條**登入網址**——先把終端機面板拉大，然後在網址上**連點三下（快速點三次）**：會一次全選整條網址（包含換行的部分）→ 複製
   （按 `c` 理論上會自動複製，但瀏覽器常擋剪貼簿權限——實測直接三連點反白最可靠）
3. 開新分頁貼上網址 → 登入 Claude 帳號 → 授權
4. 頁面顯示一組**授權碼** → 複製 → 回終端機貼在 `Paste code here…` → Enter

排錯：

- 出現「Invalid OAuth Request — Unknown scope: …」？→ 網址在複製時**掉了字元**（用拖曳框選跨行網址的經典後果）。回到第 2 步用**三連點**重新全選複製；或直接在瀏覽器網址列把拼錯的 scope 改對（例：`fil_upload`→`file_upload`）重新載入
- 授權完跳到「無法連上 localhost」錯誤頁？→ 看**網址列**，把 `code=` 後面那串複製回終端機貼上即可
- 貼上沒反應？→ 終端機用**右鍵→貼上**或 `Ctrl+Shift+V`；再不行檢查 `claude --version` 是否 ≥ 2.1.108，舊了就 `npm install -g @anthropic-ai/claude-code@latest`

## 🎬 第一次試跑（照抄就會動）

環境開好後，建兩個檔案試跑看看（左邊檔案總管右鍵 → New Folder 建 `test/`，裡面 New File）：

**`test/index.html`**

```html
<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>我的第一個動畫</title>
    <script src="https://cdn.jsdelivr.net/npm/p5@2/lib/p5.min.js"></script>
    <style>html,body{margin:0;height:100%}main{display:flex;justify-content:center;align-items:center;height:100%}</style>
  </head>
  <body>
    <main></main>
    <script src="sketch.js"></script>
  </body>
</html>
```

**`test/sketch.js`**

```js
function setup() {
  createCanvas(600, 600)
}

function draw() {
  background(253, 252, 249)
  circle(width / 2, height / 2, 100 + 20 * sin(frameCount * 0.05))
}
```

### 看結果的兩種方式

1. **編輯器內即時預覽（日常用）**：對 `index.html` **右鍵 →「Show Preview」**——碼在左、動畫在右；因為有自動儲存，改一行、預覽秒刷新
2. **完整瀏覽器分頁（發表用）**：終端機跑 `npx live-server test` → 跳出通知點「**Open in Browser**」；在 Ports 面板把該埠設 Public，網址丟給同學就能當場看你的作品

會動了（一顆會呼吸的圓）就代表環境沒問題——可以把 `test/` 刪掉或改名成你的第一份作業資料夾。

## ⚠️ Codespaces 三件事

- **用 2-core 機型就好**（預設就是）：學生帳號每月 180 core-hours＝90 小時，夠用；開大機型會加倍燒
- 閒置 30 分鐘會自動休眠（重開即續）；**閒置 30 天 codespace 會被刪**——所以工作一定要 push，repo 裡的東西永遠不會消失
- 第一次用若被要求設定 spending budget，設 $0 即可（課堂上會帶大家走一遍）

## 🤖 你的 AI 工作流

`CLAUDE.md` 是你的——課堂五條公約寫在裡面（不可刪），其餘的部分隨學期自己長出來：你的偏好、你的流程、你踩過的坑。學期末它就是你帶得走的工作方法。

p5.js 也可以用[網頁編輯器](https://editor.p5js.org)寫（一樣存雲端），寫完把碼貼回當週資料夾即可。
