// 共用工具函數 - 用於所有 Netlify Functions
// 這個模組減少代碼重複並提供一致的錯誤處理

const fetch = require('node-fetch');

/**
 * 驗證並獲取 API 金鑰
 * @returns {Object} { success: boolean, apiKey?: string, error?: Object }
 */
function validateApiKey() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return {
            success: false,
            error: {
                statusCode: 500,
                body: JSON.stringify({
                    error: {
                        message: "API 金鑰未設定。請檢查環境變數配置。"
                    }
                })
            }
        };
    }

    return { success: true, apiKey };
}

/**
 * 安全地解析 JSON 請求體
 * @param {string} body - 請求體字符串
 * @returns {Object} { success: boolean, data?: Object, error?: Object }
 */
function parseRequestBody(body) {
    if (!body) {
        return {
            success: false,
            error: {
                statusCode: 400,
                body: JSON.stringify({
                    error: {
                        message: "請求體不得為空。"
                    }
                })
            }
        };
    }

    try {
        const data = JSON.parse(body);
        return { success: true, data };
    } catch (parseError) {
        return {
            success: false,
            error: {
                statusCode: 400,
                body: JSON.stringify({
                    error: {
                        message: `JSON 解析失敗: ${parseError.message}`
                    }
                })
            }
        };
    }
}

/**
 * 驗證文本長度
 * @param {string} text - 要驗證的文本
 * @param {number} maxLength - 最大長度（默認 5000 字符）
 * @param {string} fieldName - 字段名稱
 * @returns {Object} { valid: boolean, error?: Object }
 */
function validateTextLength(text, maxLength = 5000, fieldName = 'text') {
    if (!text || typeof text !== 'string') {
        return {
            valid: false,
            error: {
                statusCode: 400,
                body: JSON.stringify({
                    error: {
                        message: `${fieldName} 不得為空且必須是字符串。`
                    }
                })
            }
        };
    }

    if (text.length > maxLength) {
        return {
            valid: false,
            error: {
                statusCode: 400,
                body: JSON.stringify({
                    error: {
                        message: `${fieldName} 超過最大長度 ${maxLength} 字符（當前: ${text.length}）。`
                    }
                })
            }
        };
    }

    return { valid: true };
}

/**
 * 使用超時和錯誤處理調用 Google API
 * @param {string} url - API URL
 * @param {Object} payload - 請求負載
 * @param {number} timeout - 超時時間（毫秒，默認 30000）
 * @returns {Promise<Object>} { success: boolean, data?: Object, error?: Object }
 */
async function callGoogleAPI(url, payload, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // 檢查 HTTP 狀態
        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: {
                    statusCode: response.status,
                    body: JSON.stringify({
                        error: {
                            message: `Google API 錯誤 (${response.status}): ${errorText}`
                        }
                    })
                }
            };
        }

        // 安全解析 JSON 響應
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            return {
                success: false,
                error: {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: {
                            message: `無法解析 Google API 響應: ${jsonError.message}`
                        }
                    })
                }
            };
        }

        return { success: true, data };

    } catch (error) {
        clearTimeout(timeoutId);

        // 處理不同類型的錯誤
        if (error.name === 'AbortError') {
            return {
                success: false,
                error: {
                    statusCode: 504,
                    body: JSON.stringify({
                        error: {
                            message: `請求超時（${timeout}ms）。請稍後重試。`
                        }
                    })
                }
            };
        }

        return {
            success: false,
            error: {
                statusCode: 500,
                body: JSON.stringify({
                    error: {
                        message: `網絡錯誤: ${error.message}`
                    }
                })
            }
        };
    }
}

/**
 * 創建標準化的成功響應
 * @param {Object} data - 響應數據
 * @returns {Object} Netlify function 響應對象
 */
function createSuccessResponse(data) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(data)
    };
}

/**
 * 記錄錯誤（用於監控）
 * @param {string} functionName - 函數名稱
 * @param {Error} error - 錯誤對象
 * @param {Object} context - 額外的上下文信息
 */
function logError(functionName, error, context = {}) {
    console.error(`[${functionName}] 錯誤:`, {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        ...context
    });
}

module.exports = {
    validateApiKey,
    parseRequestBody,
    validateTextLength,
    callGoogleAPI,
    createSuccessResponse,
    logError
};
