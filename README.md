# CloudSecPlatform - 云安全评估平台

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

CloudSecPlatform是一个综合性的云安全评估平台，旨在帮助安全团队和DevOps工程师评估云环境的安全状况，识别潜在的安全风险，并提供针对性的安全建议。
<img width="2986" height="1376" alt="image" src="https://github.com/user-attachments/assets/f4b7ffed-3c89-464b-ac1e-2be205aa2982" />
<img width="2978" height="1364" alt="image" src="https://github.com/user-attachments/assets/46ad842b-0f80-4636-83ae-c1b69fda8248" />

<img width="3010" height="1226" alt="image" src="https://github.com/user-attachments/assets/e15680aa-3642-4018-97de-d41bf7e94f54" />



## 🌟 主要功能

### 1. AKSK利用与权限分析
- 支持多云平台（AWS、阿里云、GCP）的AKSK凭证管理
- 自动分析凭证权限，识别权限配置错误
- 提供详细的权限分析报告
- 基于权限分析结果，展示潜在的提权路径

### 2. 资源总览与区域筛选
- 全面展示云环境中的各类资源
- 支持按区域和资源类型进行筛选
- 提供资源详细信息和状态监控
- 直观的资源数量统计和分布展示

### 3. 拓扑测绘
- 自动生成云环境资源拓扑图
- 可视化展示资源之间的依赖关系
- 支持交互式操作，如缩放、拖拽等
- 清晰展示VPC、EC2等资源的层级关系

### 4. 提权路径分析
- 基于pathfinding.cloud数据，展示完整的提权路径
- 提供40+种提权路径的详细信息
- 可视化展示提权路径的攻击链
- 针对不同权限级别提供相应的安全建议

### 5. APT攻击剧本
- 集成最新的APT云攻击技术
- 包含针对比特币和加密货币的攻击剧本
- 提供详细的攻击步骤和技术说明
- 支持攻击演练功能，模拟真实攻击场景

## 🛠️ 技术栈

### 前端
- React 18+
- Ant Design 5+
- React Flow (拓扑图可视化)
- Redux Toolkit (状态管理)
- Axios (API请求)
- Vite (构建工具)

### 后端
- Go 1.20+
- Gin (Web框架)
- GORM (ORM框架)
- 多云API集成 (AWS SDK、阿里云SDK、GCP SDK)

## 🚀 快速开始

### 前置条件
- Node.js 16+ (前端)
- Go 1.20+ (后端)
- 云平台凭证 (AWS、阿里云或GCP)

### 安装步骤

#### 1. 克隆仓库
```bash
git clone https://github.com/yourusername/CloudSecPlatform.git
cd CloudSecPlatform
```

#### 2. 启动后端服务
```bash
cd backend
# 安装依赖
go mod tidy
# 启动服务
./start.sh  # 或 go run cmd/server/main.go
```

#### 3. 启动前端服务
```bash
cd frontend
# 安装依赖
npm install
# 启动开发服务器
npm run dev
```

#### 4. 访问平台
打开浏览器，访问 http://localhost:3000

## 📖 使用指南

### AKSK利用
1. 在"AKSK利用"页面添加云平台凭证
2. 点击"权限分析"按钮，系统会自动分析凭证权限
3. 查看权限分析结果和潜在的提权路径
4. 根据建议调整权限配置

### 资源总览
1. 在"资源总览"页面选择已添加的凭证
2. 系统会自动获取并展示云环境中的所有资源
3. 使用左侧区域筛选和顶部资源类型标签过滤资源
4. 点击资源查看详细信息

### 拓扑测绘
1. 在"资源总览"页面选择凭证后，点击"生成拓扑图"按钮
2. 系统会自动生成云环境的资源拓扑图
3. 使用鼠标滚轮缩放、拖拽调整视图
4. 点击节点查看资源详细信息

### 提权路径
1. 在"资源总览"页面选择凭证并获取权限信息
2. 点击"生成提权路径"按钮
3. 查看系统生成的提权路径可视化图表
4. 分析每条提权路径的风险和攻击步骤

### APT攻击剧本
1. 在"APT攻击剧本"页面浏览可用的攻击剧本
2. 点击"运行演练"按钮模拟攻击过程
3. 查看攻击步骤和执行结果
4. 了解攻击技术细节和防御措施

## 📁 项目结构

```
CloudSecPlatform/
├── backend/            # 后端代码
│   ├── cmd/server/     # 服务入口
│   ├── internal/       # 内部包
│   ├── pkg/            # 公共包
│   └── go.mod          # Go模块文件
├── frontend/           # 前端代码
│   ├── src/            # 源代码
│   │   ├── components/  # 组件
│   │   ├── pages/       # 页面
│   │   ├── store/       # Redux store
│   │   └── App.jsx      # 应用入口
│   ├── public/          # 静态资源
│   ├── index.html       # HTML模板
│   └── package.json     # NPM配置
└── README.md           # 项目说明
```

## 🔒 安全注意事项

1. **凭证安全**：平台会存储云平台凭证，请确保在安全的环境中部署
2. **权限控制**：建议只对授权人员开放平台访问权限
3. **数据保护**：平台会处理敏感的云环境信息，请确保数据传输和存储的安全性
4. **定期更新**：定期更新平台版本，以获取最新的安全功能和漏洞修复

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request
<img width="2998" height="1220" alt="image" src="https://github.com/user-attachments/assets/1ac83cfe-da27-4ee3-94d7-85ff0c291243" />
<img width="2936" height="1360" alt="image" src="https://github.com/user-attachments/assets/95ed8715-6f66-42d5-9fc9-43159365e965" />

<img width="2986" height="1320" alt="image" src="https://github.com/user-attachments/assets/e466684e-d756-4b99-8aa0-fd115393ef14" />

