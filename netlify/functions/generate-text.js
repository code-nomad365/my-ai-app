// 這是您的後端伺服器 (Node.js)
// 它會安全地在伺服器上執行，隱藏您的 API 金鑰
// v1.2.0: 改進錯誤處理、添加超時機制和輸入驗證

const {
    validateApiKey,
    parseRequestBody,
    validateTextLength,
    callGoogleAPI,
    createSuccessResponse,
    logError
} = require('./utils');

// Google API 配置
const GEMINI_MODEL = 'gemini-2.5-flash-preview-09-2025';
const API_TIMEOUT = 30000; // 30 秒
const MAX_PROMPT_LENGTH = 5000; // 最大 prompt 長度

exports.handler = async (event) => {
    try {
        // 1. 驗證 API 金鑰
        const apiKeyResult = validateApiKey();
        if (!apiKeyResult.success) {
            return apiKeyResult.error;
        }
        const { apiKey } = apiKeyResult;

        // 2. 安全解析請求體
        const parseResult = parseRequestBody(event.body);
        if (!parseResult.success) {
            return parseResult.error;
        }
        const { prompt, systemInstruction } = parseResult.data;

        // 3. 驗證 prompt
        const promptValidation = validateTextLength(prompt, MAX_PROMPT_LENGTH, 'prompt');
        if (!promptValidation.valid) {
            return promptValidation.error;
        }

        // 4. 驗證 systemInstruction（如果提供）
        if (systemInstruction) {
            const sysValidation = validateTextLength(
                systemInstruction,
                MAX_PROMPT_LENGTH,
                'systemInstruction'
            );
            if (!sysValidation.valid) {
                return sysValidation.error;
            }
        }

        // 5. 準備 Google API URL（使用更安全的方式）
        const googleApiUrl = new URL(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
        );
        googleApiUrl.searchParams.append('key', apiKey);

        // 6. 準備 API payload
        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        if (systemInstruction) {
            payload.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        // 7. 呼叫 Google API（帶超時和錯誤處理）
        const apiResult = await callGoogleAPI(googleApiUrl.toString(), payload, API_TIMEOUT);

        if (!apiResult.success) {
            logError('generate-text', new Error('API 調用失敗'), {
                prompt: prompt.substring(0, 100), // 只記錄前 100 個字符
                hasSystemInstruction: !!systemInstruction
            });
            return apiResult.error;
        }

        // 8. 返回成功響應
        return createSuccessResponse(apiResult.data);

    } catch (error) {
        // 捕獲任何未預期的錯誤
        logError('generate-text', error, {
            eventBody: event.body ? event.body.substring(0, 100) : 'null'
        });

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: {
                    message: `伺服器錯誤: ${error.message}`
                }
            })
        };
    }
};
