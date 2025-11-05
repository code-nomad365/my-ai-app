/**
 * 單元測試 - Utils 模組
 * 測試所有共用工具函數的功能
 */

const {
    validateApiKey,
    parseRequestBody,
    validateTextLength,
    createSuccessResponse
} = require('../../netlify/functions/utils');

describe('Utils Module - validateApiKey', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env.GEMINI_API_KEY;
    });

    afterEach(() => {
        process.env.GEMINI_API_KEY = originalEnv;
    });

    test('應該在 API 金鑰存在時返回成功', () => {
        process.env.GEMINI_API_KEY = 'test-api-key-123';
        const result = validateApiKey();

        expect(result.success).toBe(true);
        expect(result.apiKey).toBe('test-api-key-123');
        expect(result.error).toBeUndefined();
    });

    test('應該在 API 金鑰不存在時返回錯誤', () => {
        delete process.env.GEMINI_API_KEY;
        const result = validateApiKey();

        expect(result.success).toBe(false);
        expect(result.apiKey).toBeUndefined();
        expect(result.error).toBeDefined();
        expect(result.error.statusCode).toBe(500);
    });

    test('錯誤響應應包含有用的訊息', () => {
        delete process.env.GEMINI_API_KEY;
        const result = validateApiKey();

        const errorBody = JSON.parse(result.error.body);
        expect(errorBody.error.message).toContain('API 金鑰');
    });
});

describe('Utils Module - parseRequestBody', () => {
    test('應該成功解析有效的 JSON', () => {
        const validJson = JSON.stringify({ text: 'Hello', prompt: 'Test' });
        const result = parseRequestBody(validJson);

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ text: 'Hello', prompt: 'Test' });
        expect(result.error).toBeUndefined();
    });

    test('應該處理空請求體', () => {
        const result = parseRequestBody('');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error.statusCode).toBe(400);
    });

    test('應該處理 null 請求體', () => {
        const result = parseRequestBody(null);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    test('應該處理無效的 JSON', () => {
        const invalidJson = '{ invalid json }';
        const result = parseRequestBody(invalidJson);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error.statusCode).toBe(400);

        const errorBody = JSON.parse(result.error.body);
        expect(errorBody.error.message).toContain('JSON 解析失敗');
    });

    test('應該處理複雜的嵌套對象', () => {
        const complexJson = JSON.stringify({
            user: { name: 'Test', settings: { theme: 'dark' } },
            data: [1, 2, 3]
        });
        const result = parseRequestBody(complexJson);

        expect(result.success).toBe(true);
        expect(result.data.user.settings.theme).toBe('dark');
        expect(result.data.data).toEqual([1, 2, 3]);
    });
});

describe('Utils Module - validateTextLength', () => {
    test('應該接受有效長度的文本', () => {
        const result = validateTextLength('Hello world', 100);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    test('應該拒絕超過最大長度的文本', () => {
        const longText = 'a'.repeat(101);
        const result = validateTextLength(longText, 100);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error.statusCode).toBe(400);
    });

    test('應該拒絕空文本', () => {
        const result = validateTextLength('', 100);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
    });

    test('應該拒絕 null 文本', () => {
        const result = validateTextLength(null, 100);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
    });

    test('應該拒絕非字符串類型', () => {
        const result = validateTextLength(12345, 100);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
    });

    test('應該使用默認最大長度', () => {
        const longText = 'a'.repeat(5001);
        const result = validateTextLength(longText); // 默認 5000

        expect(result.valid).toBe(false);
    });

    test('應該在錯誤訊息中包含字段名稱', () => {
        const result = validateTextLength('', 100, 'customField');

        const errorBody = JSON.parse(result.error.body);
        expect(errorBody.error.message).toContain('customField');
    });

    test('應該在錯誤訊息中顯示當前長度', () => {
        const longText = 'a'.repeat(150);
        const result = validateTextLength(longText, 100);

        const errorBody = JSON.parse(result.error.body);
        expect(errorBody.error.message).toContain('150');
    });
});

describe('Utils Module - createSuccessResponse', () => {
    test('應該創建正確格式的成功響應', () => {
        const data = { message: 'Success', value: 123 };
        const response = createSuccessResponse(data);

        expect(response.statusCode).toBe(200);
        expect(response.headers).toBeDefined();
        expect(response.headers['Content-Type']).toBe('application/json');
        expect(response.body).toBe(JSON.stringify(data));
    });

    test('應該包含 Cache-Control 標頭', () => {
        const response = createSuccessResponse({});

        expect(response.headers['Cache-Control']).toBeDefined();
        expect(response.headers['Cache-Control']).toContain('no-cache');
    });

    test('應該處理空對象', () => {
        const response = createSuccessResponse({});

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('{}');
    });

    test('應該處理複雜數據結構', () => {
        const complexData = {
            candidates: [
                {
                    content: {
                        parts: [{ text: 'Generated text' }]
                    }
                }
            ]
        };
        const response = createSuccessResponse(complexData);

        const parsedBody = JSON.parse(response.body);
        expect(parsedBody.candidates[0].content.parts[0].text).toBe('Generated text');
    });
});

describe('Utils Module - Integration Tests', () => {
    test('應該能夠鏈接多個驗證函數', () => {
        process.env.GEMINI_API_KEY = 'test-key';

        // 1. 驗證 API 金鑰
        const apiKeyResult = validateApiKey();
        expect(apiKeyResult.success).toBe(true);

        // 2. 解析請求體
        const requestBody = JSON.stringify({ text: 'Hello' });
        const parseResult = parseRequestBody(requestBody);
        expect(parseResult.success).toBe(true);

        // 3. 驗證文本長度
        const validateResult = validateTextLength(parseResult.data.text, 100);
        expect(validateResult.valid).toBe(true);

        // 4. 創建成功響應
        const response = createSuccessResponse({ result: 'Success' });
        expect(response.statusCode).toBe(200);
    });

    test('應該在任何步驟失敗時正確處理錯誤', () => {
        // 場景：文本過長
        const longText = 'a'.repeat(101);
        const requestBody = JSON.stringify({ text: longText });

        const parseResult = parseRequestBody(requestBody);
        expect(parseResult.success).toBe(true);

        const validateResult = validateTextLength(parseResult.data.text, 100);
        expect(validateResult.valid).toBe(false);
        expect(validateResult.error.statusCode).toBe(400);
    });
});
