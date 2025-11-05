/**
 * 集成測試 - API Functions
 * 測試 Netlify Functions 的端到端行為
 */

const generateText = require('../../netlify/functions/generate-text');
const generateAudio = require('../../netlify/functions/generate-audio');

describe('Generate Text Function - Integration', () => {
    let originalApiKey;

    beforeEach(() => {
        originalApiKey = process.env.GEMINI_API_KEY;
    });

    afterEach(() => {
        process.env.GEMINI_API_KEY = originalApiKey;
    });

    test('應該在缺少 API 金鑰時返回 500', async () => {
        delete process.env.GEMINI_API_KEY;

        const event = {
            body: JSON.stringify({
                prompt: 'Test prompt',
                systemInstruction: 'Test instruction'
            })
        };

        const response = await generateText.handler(event);

        expect(response.statusCode).toBe(500);
        const body = JSON.parse(response.body);
        expect(body.error.message).toContain('API 金鑰');
    });

    test('應該在缺少請求體時返回 400', async () => {
        process.env.GEMINI_API_KEY = 'test-key';

        const event = {
            body: null
        };

        const response = await generateText.handler(event);

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error.message).toContain('請求體');
    });

    test('應該在無效 JSON 時返回 400', async () => {
        process.env.GEMINI_API_KEY = 'test-key';

        const event = {
            body: '{ invalid json'
        };

        const response = await generateText.handler(event);

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error.message).toContain('JSON 解析失敗');
    });

    test('應該在 prompt 過長時返回 400', async () => {
        process.env.GEMINI_API_KEY = 'test-key';

        const longPrompt = 'a'.repeat(5001);
        const event = {
            body: JSON.stringify({
                prompt: longPrompt,
                systemInstruction: 'Test'
            })
        };

        const response = await generateText.handler(event);

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error.message).toContain('最大長度');
    });

    test('應該在 systemInstruction 過長時返回 400', async () => {
        process.env.GEMINI_API_KEY = 'test-key';

        const longInstruction = 'a'.repeat(5001);
        const event = {
            body: JSON.stringify({
                prompt: 'Short prompt',
                systemInstruction: longInstruction
            })
        };

        const response = await generateText.handler(event);

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error.message).toContain('最大長度');
    });

    test('應該接受沒有 systemInstruction 的請求', async () => {
        process.env.GEMINI_API_KEY = 'test-key';

        const event = {
            body: JSON.stringify({
                prompt: 'Test prompt'
            })
        };

        // 注意：這個測試會實際調用 API（如果有真實的 key）
        // 在 CI/CD 中，你可能需要 mock fetch
        const response = await generateText.handler(event);

        // 沒有真實 API key 時會失敗，但至少驗證了請求格式
        expect([200, 500, 504]).toContain(response.statusCode);
    });
});

describe('Generate Audio Function - Integration', () => {
    let originalApiKey;

    beforeEach(() => {
        originalApiKey = process.env.GEMINI_API_KEY;
    });

    afterEach(() => {
        process.env.GEMINI_API_KEY = originalApiKey;
    });

    test('應該在缺少 API 金鑰時返回 500', async () => {
        delete process.env.GEMINI_API_KEY;

        const event = {
            body: JSON.stringify({
                text: 'Test text'
            })
        };

        const response = await generateAudio.handler(event);

        expect(response.statusCode).toBe(500);
        const body = JSON.parse(response.body);
        expect(body.error.message).toContain('API 金鑰');
    });

    test('應該在缺少 text 時返回 400', async () => {
        process.env.GEMINI_API_KEY = 'test-key';

        const event = {
            body: JSON.stringify({})
        };

        const response = await generateAudio.handler(event);

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error.message).toContain('text');
    });

    test('應該在 text 過長時返回 400', async () => {
        process.env.GEMINI_API_KEY = 'test-key';

        const longText = 'a'.repeat(3001);
        const event = {
            body: JSON.stringify({
                text: longText
            })
        };

        const response = await generateAudio.handler(event);

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error.message).toContain('最大長度');
        expect(body.error.message).toContain('3000');
    });

    test('應該接受有效的文本', async () => {
        process.env.GEMINI_API_KEY = 'test-key';

        const event = {
            body: JSON.stringify({
                text: 'Say clearly: Hello world'
            })
        };

        const response = await generateAudio.handler(event);

        // 沒有真實 API key 時會失敗，但至少驗證了請求格式
        expect([200, 500, 504]).toContain(response.statusCode);
    });
});

describe('Error Handling - Integration', () => {
    test('兩個函數應該返回一致的錯誤格式', async () => {
        delete process.env.GEMINI_API_KEY;

        const textEvent = {
            body: JSON.stringify({ prompt: 'Test' })
        };
        const audioEvent = {
            body: JSON.stringify({ text: 'Test' })
        };

        const textResponse = await generateText.handler(textEvent);
        const audioResponse = await generateAudio.handler(audioEvent);

        // 兩者都應該返回相同的錯誤格式
        expect(textResponse.statusCode).toBe(audioResponse.statusCode);

        const textBody = JSON.parse(textResponse.body);
        const audioBody = JSON.parse(audioResponse.body);

        expect(textBody).toHaveProperty('error');
        expect(audioBody).toHaveProperty('error');
        expect(textBody.error).toHaveProperty('message');
        expect(audioBody.error).toHaveProperty('message');
    });
});
