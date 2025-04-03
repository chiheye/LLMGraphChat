import { OpenAISettings } from './OpenAISettings';

interface SettingsProps {
  settings: {
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    neo4jUri?: string;
    neo4jUsername?: string;
    neo4jPassword?: string;
    modelName?: string;
    // 添加其他可能的设置项
  };
  updateSettings: (newSettings: any) => void;
}

export function Settings({ settings, updateSettings }: SettingsProps) {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">应用设置</h1>
      
      {/* 确保这里正确使用了 OpenAISettings 组件 */}
      <div className="mb-8">
        <OpenAISettings settings={settings} updateSettings={updateSettings} />
      </div>
      
      {/* 其他设置组件 */}
    </div>
  );
}