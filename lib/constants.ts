// 定义节点类型对应的颜色
export const NODE_COLORS: Record<string, string> = {
  // 根据节点标签/类型设置不同颜色
  Person: "#ff6b6b",         // 红色系
  Organization: "#4ecdc4",   // 青色系
  Location: "#ffd166",       // 黄色系
  Event: "#6a0572",          // 紫色系
  Product: "#1a936f",        // 绿色系
  Document: "#457b9d",       // 蓝色系
  Concept: "#f2cc8f",        // 浅棕色
  DEFAULT: "#5a67d8",        // 默认颜色（深蓝紫色）
}

// 定义关系类型对应的颜色 - 使用更鲜明的颜色方案
export const LINK_COLORS: Record<string, string> = {
  // 基础关系
  KNOWS: "#ff9f1c",       // 橙色
  WORKS_AT: "#2ec4b6",    // 青绿色
  LIVES_IN: "#e71d36",    // 红色
  CREATED: "#8338ec",     // 紫色
  
  // 家庭关系
  妻子: "#ff5c8d",         // 粉红色
  丈夫: "#5271ff",         // 蓝色
  父亲: "#3a86ff",         // 亮蓝色
  母亲: "#ff66b3",         // 粉色
  儿子: "#4cc9f0",         // 浅蓝色
  女儿: "#f15bb5",         // 洋红色
  兄弟: "#4361ee",         // 靛蓝色
  姐妹: "#ff70a6",         // 浅粉色
  
  // 社会关系
  朋友: "#ffd166",         // 黄色
  同事: "#06d6a0",         // 绿松石色
  上司: "#073b4c",         // 深蓝色
  下属: "#118ab2",         // 蓝绿色
  
  // 默认颜色 - 使用更鲜明的深灰色而非半透明
  DEFAULT: "#555555",     // 深灰色
}