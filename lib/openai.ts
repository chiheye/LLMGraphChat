import type { Message } from "./types"
import OpenAI from "openai";
import axios from "axios";

// 添加获取可用模型的函数
// 将函数声明改为导出函数
export async function getAvailableModels(apiKey: string, baseUrl: string): Promise<string[]> {
  try {
    // 规范化 baseUrl，确保不会有重复的 /v1 路径
    let modelsUrl = '';
    if (baseUrl.endsWith('/v1')) {
      modelsUrl = `${baseUrl}/models`;
    } else if (baseUrl.endsWith('/')) {
      modelsUrl = `${baseUrl}v1/models`;
    } else {
      modelsUrl = `${baseUrl}/v1/models`;
    }
    
    console.log(`正在请求模型列表，API基础URL: ${modelsUrl}`);
    
    const response = await axios.get(modelsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`模型列表请求状态码: ${response.status}`);
    
    if (response.data && response.data.data) {
      const models = response.data.data.map((model: any) => model.id);
      console.log(`获取到 ${models.length} 个可用模型:`);
      console.log(JSON.stringify(models, null, 2));
      return models;
    }
    
    console.log("模型列表响应格式不符合预期:", response.data);
    return [];
  } catch (error) {
    console.error("获取模型列表时出错:", error);
    if (axios.isAxiosError(error)) {
      console.error("请求详情:", {
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data
      });
    }
    return [];
  }
}

export async function generateCypherQuery(
  messages: Message[],
  schema: { nodeLabels: string[]; relationshipTypes: string[]; nodeProperties: Record<string, string[]> },
  apiKey?: string,
  baseUrl?: string,
  modelName?: string // 添加模型名称参数
): Promise<{ cypherQuery: string; explanation: string }> {
  try {
    // 构建系统提示
    const systemPrompt = `
You are a helpful assistant that translates natural language questions into Neo4j Cypher queries.
Your task is to understand the user's question about graph data and generate an appropriate Cypher query.

Database Schema Information:
Node Labels:
${schema.nodeLabels.map((label) => `- ${label} (Properties: ${schema.nodeProperties[label]?.join(", ") || "none"})`).join("\n")}

Relationship Types:
${schema.relationshipTypes.map((type) => `- ${type}`).join("\n")}


Follow these guidelines:
1. Analyze the user's question to understand what they're asking about.
2. Use the provided schema information to create accurate queries.
3. Generate a valid Cypher query that would answer their question.
4. Keep queries simple and focused on what the user is asking.
5. Return ONLY nodes and relationships that are relevant to the question.
6. Limit results to a reasonable number (e.g., 50 nodes maximum) to avoid overwhelming visualizations.
7. Include node properties in the results.
8. If you can't generate a query for the question, return a simple query like "MATCH (n) RETURN n LIMIT 5".

Your response should be in the following JSON format:
{
  "cypherQuery": "The Cypher query to execute",
  "explanation": "A brief explanation of what the query does"
}
`;

    // 准备消息数组
    const promptMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role as "system" | "user" | "assistant" | "function" | "tool",
        content: msg.content
      })),
    ];

    console.log("Sending request to OpenAI API");
    
    // 使用提供的API密钥和基础URL，或使用环境变量
    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;
    const openaiBaseUrl = baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    
    if (!openaiApiKey) {
      throw new Error("OpenAI API key is required");
    }

    // 使用客户选择的模型或默认模型
    const model = modelName || "gpt-4";
    console.log(`Using model: ${model}`);

    // 创建OpenAI API客户端
    const configuration = {
      baseURL: openaiBaseUrl,
      apiKey: openaiApiKey,
    };
    
    const openai = new OpenAI(configuration);

    // 发送请求到OpenAI API
    const response = await openai.chat.completions.create({
      model: model,
      messages: promptMessages as any,
      temperature: 0.1,
      stream: false,
    });

    console.log("Received response from OpenAI API");
    
    // 处理响应
    if (!response.choices || response.choices.length === 0) {
      throw new Error("No response from OpenAI API");
    }
    
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("Empty response from OpenAI API");
    }
    
    console.log("Raw response content:", content);
    
    // 尝试解析JSON响应
    try {
      // 尝试从文本中提取JSON
      let jsonContent = content;
      
      // 如果响应包含markdown代码块，提取其中的内容
      const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonContent = jsonBlockMatch[1];
      }
      
      // 尝试找到JSON对象
      const jsonMatch = jsonContent.match(/{[\s\S]*}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }
      
      console.log("Extracted JSON content:", jsonContent);
      
      const parsedResponse = JSON.parse(jsonContent);
      
      // 验证响应格式
      if (!parsedResponse.cypherQuery) {
        throw new Error("Response does not contain a Cypher query");
      }
      
      return {
        cypherQuery: parsedResponse.cypherQuery,
        explanation: parsedResponse.explanation || "未提供查询解释",
      };
    } catch (error) {
      console.error("Error parsing JSON response:", error);
      
      // 如果JSON解析失败，尝试直接从文本中提取查询
      const cypherMatch = content.match(/cypherQuery["\s:]+([^"]+)/);
      const explanationMatch = content.match(/explanation["\s:]+([^"]+)/);
      
      if (cypherMatch) {
        return {
          cypherQuery: cypherMatch[1].trim(),
          explanation: explanationMatch ? explanationMatch[1].trim() : "未提供查询解释",
        };
      }
      
      // 如果所有尝试都失败，返回默认查询
      return {
        cypherQuery: "MATCH (n) RETURN n LIMIT 25",
        explanation: "无法从LLM响应中提取有效的查询。使用默认查询。",
      };
    }
  } catch (error: any) {
    console.error("Error in generateCypherQuery:", error);
    
    // 返回默认查询和错误说明
    return {
      cypherQuery: "MATCH (n) RETURN n LIMIT 25",
      explanation: `处理您的问题时遇到错误。请检查您的OpenAI API密钥和连接设置是否正确。`,
    };
  }
}

