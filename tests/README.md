# 測試文檔

本目錄包含 AI 英文學習系統的所有測試。

## 目錄結構

```
tests/
├── unit/                    # 單元測試
│   └── utils.test.js       # Utils 模組測試
├── integration/             # 集成測試
│   └── api-functions.test.js  # API Functions 測試
└── README.md               # 本文件
```

## 運行測試

### 安裝依賴

```bash
npm install
```

### 運行所有測試

```bash
npm test
```

### 運行測試並生成覆蓋率報告

```bash
npm test -- --coverage
```

### 運行特定測試文件

```bash
npm test -- tests/unit/utils.test.js
```

### 監視模式（自動重新運行）

```bash
npm run test:watch
```

### 只運行單元測試

```bash
npm run test:unit
```

## 測試覆蓋率

測試目標是達到以下覆蓋率：
- **語句覆蓋率**: > 80%
- **分支覆蓋率**: > 75%
- **函數覆蓋率**: > 80%
- **行覆蓋率**: > 80%

## 測試類型

### 單元測試 (`tests/unit/`)

測試單個函數或模組的功能，不依賴外部服務。

**測試內容**:
- ✅ API 金鑰驗證
- ✅ 請求體解析
- ✅ 文本長度驗證
- ✅ 成功響應創建
- ✅ 錯誤處理

### 集成測試 (`tests/integration/`)

測試多個組件協同工作的情況。

**測試內容**:
- ✅ 完整的請求/響應流程
- ✅ 錯誤情況處理
- ✅ API 函數端到端行為

## 編寫新測試

### 測試命名規範

```javascript
describe('模組名稱 - 功能', () => {
    test('應該[預期行為]', () => {
        // 測試代碼
    });
});
```

### 測試結構

每個測試應遵循 AAA 模式：

```javascript
test('測試描述', () => {
    // Arrange（準備）
    const input = '測試數據';

    // Act（執行）
    const result = functionToTest(input);

    // Assert（斷言）
    expect(result).toBe('預期結果');
});
```

### 環境變數處理

測試中需要設置環境變數時：

```javascript
let originalEnv;

beforeEach(() => {
    originalEnv = process.env.VARIABLE_NAME;
    process.env.VARIABLE_NAME = 'test-value';
});

afterEach(() => {
    process.env.VARIABLE_NAME = originalEnv;
});
```

## 持續集成

這些測試應該在以下情況下自動運行：
- 每次 git push
- 每次 pull request
- 部署到生產環境之前

## Mock 策略

對於外部 API 調用（Google Gemini API），目前測試：
1. **驗證請求格式** - 確保發送正確的數據
2. **錯誤處理** - 確保適當處理失敗情況
3. **不實際調用 API** - 在沒有真實金鑰時測試仍能通過

未來改進：
- 添加 `nock` 或 `jest.mock()` 來模擬 API 響應
- 創建測試專用的 API fixtures

## 調試測試

### 查看詳細輸出

```bash
npm test -- --verbose
```

### 只運行失敗的測試

```bash
npm test -- --onlyFailures
```

### 生成 HTML 覆蓋率報告

```bash
npm test -- --coverage --coverageReporters=html
```

然後打開 `coverage/index.html` 查看詳細報告。

## 常見問題

### Q: 為什麼有些測試被跳過？

A: 使用 `test.skip()` 或 `describe.skip()` 標記的測試會被跳過。檢查是否是因為依賴外部服務。

### Q: 如何測試需要真實 API 金鑰的功能？

A: 使用環境變數 `GEMINI_API_KEY_TEST` 提供測試金鑰，或使用 mock。

### Q: 測試運行很慢怎麼辦？

A:
1. 使用 `--maxWorkers=4` 限制並發數
2. 只運行相關的測試文件
3. 考慮增加超時時間

## 貢獻指南

添加新功能時：
1. ✅ 先寫測試（TDD）
2. ✅ 確保測試覆蓋所有分支
3. ✅ 運行完整的測試套件
4. ✅ 確保覆蓋率不下降

---

**最後更新**: 2025-11-05
**維護者**: AI Code Review Team
