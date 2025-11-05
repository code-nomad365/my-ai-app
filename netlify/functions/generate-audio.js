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

// Google TTS API 配置
const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const API_TIMEOUT = 45000; // 45 秒（語音生成可能需要更長時間）
const MAX_TEXT_LENGTH = 3000; // 最大文本長度（TTS 限制）
const VOICE_NAME = 'Kore'; // 預設語音

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
        const { text } = parseResult.data;

        // 3. 驗證文本長度
        const textValidation = validateTextLength(text, MAX_TEXT_LENGTH, 'text');
        if (!textValidation.valid) {
            return textValidation.error;
        }

        // 4. 準備 Google TTS API URL（使用更安全的方式）
        const googleTtsApiUrl = new URL(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`
        );
        googleTtsApiUrl.searchParams.append('key', apiKey);

        // 5. 準備 API payload
        const payload = {
            contents: [{
                parts: [{ text: text }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: VOICE_NAME }
                    }
                }
            },
            model: GEMINI_TTS_MODEL
        };

        // 6. 呼叫 Google TTS API（帶超時和錯誤處理）
        const apiResult = await callGoogleAPI(googleTtsApiUrl.toString(), payload, API_TIMEOUT);

        if (!apiResult.success) {
            logError('generate-audio', new Error('TTS API 調用失敗'), {
                textLength: text.length,
                voiceName: VOICE_NAME
            });
            return apiResult.error;
        }

        // 7. 驗證響應包含音頻數據
        const audioData = apiResult.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!audioData || !audioData.data) {
            logError('generate-audio', new Error('API 響應缺少音頻數據'), {
                hasData: !!apiResult.data,
                hasCandidates: !!apiResult.data?.candidates
            });

            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: {
                        message: '語音生成失敗：API 未返回有效的音頻數據。'
                    }
                })
            };
        }

        // 8. 返回成功響應
        return createSuccessResponse(apiResult.data);

    } catch (error) {
        // 捕獲任何未預期的錯誤
        logError('generate-audio', error, {
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
