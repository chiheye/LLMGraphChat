//OpenAISettings.tsx

import { useState, useEffect } from 'react';
import { fetchAvailableModels } from '@/lib/api';

// 添加类型定义
interface OpenAISettingsProps {
  settings: {
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    neo4jUri?: string;
    neo4jUsername?: string;
    neo4jPassword?: string;
    modelName?: string;
    // 其他可能的设置项
  };
  updateSettings: (newSettings: any) => void;
}

export function OpenAISettings({ settings, updateSettings }: OpenAISettingsProps) {
  const [apiKey, setApiKey] = useState(settings.openaiApiKey || '');
  const [baseUrl, setBaseUrl] = useState(settings.openaiBaseUrl || '');
  const [modelName, setModelName] = useState(settings.modelName || '');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');
  const [debugInfo, setDebugInfo] = useState(''); // 添加调试信息

  // 当 API 密钥或基础 URL 变化时获取模型列表
  useEffect(() => {
    async function loadModels() {
      if (!apiKey) {
        setAvailableModels([]);
        setDebugInfo('未提供 API 密钥');
        return;
      }

      setIsLoadingModels(true);
      setModelError('');
      setDebugInfo('正在加载模型...');

      try {
        console.log('开始获取模型列表, API Key:', apiKey.substring(0, 3) + '...');
        const models = await fetchAvailableModels(apiKey, baseUrl);
        console.log('获取到模型列表:', models);
        setAvailableModels(models);
        setDebugInfo(`成功加载了 ${models.length} 个模型`);
      } catch (error: any) {
        console.error('获取模型列表失败:', error);
        setModelError(error.message || '获取模型列表失败');
        setAvailableModels([]);
        setDebugInfo(`加载失败: ${error.message}`);
      } finally {
        setIsLoadingModels(false);
      }
    }

    loadModels();
  }, [apiKey, baseUrl]);

  const handleSave = () => {
    console.log('保存设置:', { apiKey: apiKey.substring(0, 3) + '...', baseUrl, modelName });
    updateSettings({
      ...settings,
      openaiApiKey: apiKey,
      openaiBaseUrl: baseUrl,
      modelName: modelName,
    });
    setDebugInfo('设置已保存');
  };

  return (
    <div className="space-y-4 border p-4 rounded shadow-sm">
      <h2 className="text-xl font-bold">OpenAI 设置</h2>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">API 密钥</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="sk-..."
        />
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">API 基础 URL（可选）</label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="https://api.openai.com/v1"
        />
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">模型选择</label>
        {isLoadingModels ? (
          <div className="text-sm text-gray-500">正在加载模型列表...</div>
        ) : modelError ? (
          <div className="text-sm text-red-500">{modelError}</div>
        ) : (
          <>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full p-2 border rounded"
              disabled={availableModels.length === 0}
            >
              <option value="">选择模型</option>
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              {availableModels.length > 0 ? `可用模型: ${availableModels.length}` : '无可用模型'}
            </div>
          </>
        )}
        {availableModels.length === 0 && !isLoadingModels && !modelError && (
          <div className="text-sm text-gray-500">
            请输入有效的 API 密钥以加载可用模型
          </div>
        )}
      </div>
      
      {/* 添加调试信息 */}
      {debugInfo && (
        <div className="text-xs text-gray-500 border-t pt-2 mt-2">
          调试信息: {debugInfo}
        </div>
      )}
      
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        保存设置
      </button>
    </div>
  );
}