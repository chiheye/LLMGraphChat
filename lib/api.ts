// ... 现有代码 ...

// 获取可用的 OpenAI 模型列表
export async function fetchAvailableModels(apiKey: string, baseUrl?: string) {
  console.log('正在获取模型列表...');
  
  try {
    const response = await fetch('/api/models', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        openaiApiKey: apiKey,
        openaiBaseUrl: baseUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('模型列表获取失败:', error);
      throw new Error(error.message || '获取模型列表失败');
    }

    const data = await response.json();
    console.log('获取到模型列表:', data.models);
    return data.models || [];
  } catch (error) {
    console.error('获取模型列表时出错:', error);
    throw error;
  }
}

// ... 现有代码 ...