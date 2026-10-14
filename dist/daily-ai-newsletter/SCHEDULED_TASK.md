# 每日自動排程

在 Cowork 裡說「幫我建一個每天早上 8 點的排程任務」，然後把下面整段當成任務內容貼進去。
（或直接對 Cowork 說：「用 daily-ai-newsletter 這個 skill 幫我建每日排程」，它會自己套用。）

執行前請先確認 `config.json` 已填好（見 SETUP.md）。

---

## 任務 prompt（整段複製）

```
你要產出「今天」的「每日 AI 知識庫」文章與逐字稿，通過內容驗證閘門，並同步上傳到 Google Drive。
只做文章＋逐字稿，不要做影片 render、不要產音檔。

使用 daily-ai-newsletter skill，並依其 SKILL.md 的規範執行。

步驟：

1. 讀取 skill 目錄下的 config.json 取得 project_dir 與 drive_parent_folder_id。
   確認 project_dir 已掛載（request_cowork_directory 傳入該路徑）。
   今天日期用 bash 取得：TODAY=$(date +%Y-%m-%d)

2. 冪等檢查（重要，避免覆蓋既有產出）：
   若 ai-knowledge-$TODAY/ai-knowledge-$TODAY.md 已存在，不要重新產生內容，
   改為只「補驗證」：跳到第 4 步，對既有文章查證（--audit 模式）。

3. 若當天文章不存在才產新內容：
   - 用 date 判斷週五（時事型）或其他（觀念型）。
   - 觀念型題目參照題目庫 TSV 當天那列，標題沿用題目庫文字。
   - 先寫到 isolation 暫存區：.staging/$TODAY/

4. 驗證閘門（強制）：
   - 從文章抽取可查證的事實宣稱，用 WebSearch 逐條查證，寫進 _claims.json。
     時事型至少 2 條 verified、觀念型至少 1 條；任一 refuted 必須修正文章。
   - 跑：python3 scripts/verify_content.py --root . --date $TODAY --staging .staging/$TODAY --mode auto
   - FAIL（退出碼 1）：依 _verify.json 的 errors 修正後重跑，最多 3 次。
     仍 FAIL 就停在 staging、不 promote、不上傳，並簡短回報原因。

5. PASS（退出碼 0）才 promote：加上 --promote 重跑一次。

6. 上傳 Google Drive（只在 PASS 後執行；drive_parent_folder_id 為空則跳過）：
   - 在母資料夾底下「找或建」當天子資料夾，名稱 = ai-knowledge-$TODAY
     （先 search_files 找，找不到才 create_file 建 folder）
   - 把文章、逐字稿、_verify.json 三個檔上傳到當天子資料夾，
     每個檔上傳前先用 search_files 在子夾查同名檔，已存在就跳過（去重）。
   - 一律 disableConversionToGoogleType=true，textContent 帶完整內容。
   - 切勿上傳未通過驗證的內容（零污染）。

7. 完成後簡短回報：今天類型（時事/觀念）、標題、驗證 PASS/FAIL、本地路徑、
   Drive 子資料夾是否已建立並上傳哪些檔。不要長篇大論。

注意：不要在對話顯示任何金鑰。
```

---

## 建議時間

早上 8:00（台北時間）。這樣週五時事型能抓到前一天美國時間發布的消息。

## 排程跑失敗怎麼辦

排程執行時沒有人可以回答問題，所以它會自己做決定並在回報裡註明。
若驗證閘門 FAIL，它會**停在 staging 不上架**，並在回報中說明原因——這是設計上的安全行為，不是壞掉。
你可以隔天手動說「幫我修 <日期> 的內容並重跑驗證」。
