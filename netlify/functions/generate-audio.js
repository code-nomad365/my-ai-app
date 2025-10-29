// 這是您的後端伺服器 (Node.js)
// 它會安全地在伺服器上執行，隱藏您的 API 金鑰

const fetch = require('node-fetch');

exports.handler = async (event) => {
    // 1. 從環境變數中安全地讀取 API 金鑰
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: { message: "API 金鑰未設定。" } })
        };
    }

    // 2. 從前端請求中獲取 'text'
    const { text } = JSON.parse(event.body);

    if (!text) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: { message: "Text 不得為空。" } })
        };
    }

    // 3. 準備 Google API 的 payload
    const googleTtsApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{
            parts: [{ text: text }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Kore" }
                }
            }
        },
        model: "gemini-2.5-flash-preview-tts"
    };

    // 4. 呼叫 Google API
    try {
        const response = await fetch(googleTtsApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 5. 將 Google 的回應 *原樣* 傳回給前端
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: { message: error.message } })
        };
    }
};
