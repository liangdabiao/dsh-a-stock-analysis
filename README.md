# dsh-a-stock-analysis · A股投资研究

DeepSeek Harness（dsh）插件：**A股投资研究方法论**——四大视角（市场分析/财务分析/市场情绪/投资策略）+ AKShare 数据工具指引 + Agent 配置参考。纯技能零 API key。

方法论来自 [easy_investment_Agent_crewai](https://github.com/liangdabiao/easy_investment_Agent_crewai)（MIT，liangdabiao）的 CrewAI 4-Agent 框架（A股市场分析师 / 财务报表专家 / 市场情绪研究员 / 投资策略顾问）。

<img width="1560" height="768" alt="image" src="https://github.com/user-attachments/assets/19902bd8-a2de-44a5-9d3e-0a0ce88aa148" />

<img width="1842" height="966" alt="image" src="https://github.com/user-attachments/assets/7c04158e-b8de-4abb-a1e8-6870a82bfb5e" />


## 装上以后有什么

| 能力 | 说明 |
|---|---|
| `a-stock-analysis` 技能 | 四大视角按序执行的市场研究方法论；AKShare 常用接口清单（实时行情/历史K线/财务指标/资金流/北向资金/新闻）；A 股特色（政策市/涨跌停/T+1/散户结构） |
| 侧栏「A股研究」面板 | 📖 四大视角速览 + 数据获取说明 + ⚠️ 免责声明；📋 技能目录 |
| systemPrompt 注入 | 方法论摘要（四大视角/A股特色/AKShare 接口/铁律），可 Configuration 关闭 |
| agents.yaml / tasks.yaml | 上游 CrewAI 的 4 Agent 视角与 8 阶段任务配置（参考用） |

## 使用

对话里一句话：**「深度分析贵州茅台 600519」**或**「分析腾讯 00700.HK 的投资价值」**。

模型按四大视角顺序执行研究，产出结构化报告（附免责声明）。

数据获取：沙箱 `pip install akshare pandas` 后用 Python 调用（技能正文有接口清单），AKShare 免费无 API key。无 Python 时用网络搜索或请用户提供数据，缺口标 N/A。

## ⚠️ 安全提醒

上游仓库 env.example 曾含明文 API key（已随 GitHub 公开）——如果你用过那对 key，请尽快轮换。本插件**不携带任何密钥**。

## ⚠️ 免责声明

本研究框架输出分析，不构成投资建议或推荐。所有投资存在风险，包括本金损失。投资决策前请自行尽职调查并咨询合格的财务顾问。

## 自检

```bash
npm install && npm test && npm run selftest && npm run build
```

- `npm test`：7 个单测（快照合规/四大视角/A股特色/AKShare 指引/Agent 配置参考/addendum 密钥警告/许可）
- `npm run selftest`：快照+provider+systemPrompt+密钥不入包+面板 API，零网络


## 安装

```bash
dsh plugin --profile web add dsh-a-stock-analysis
```

## 许可

MIT（liangdabiao）
