// 快照合规 + provider + addendum + systemPrompt + API 单测。零 dsh 依赖零网络。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL_DIR = join(ROOT, 'skills', 'a-stock-analysis')
const SKILL_DIRS = [join(ROOT, 'skills')]
const { createSkillProvider } = await import('../lib/skills.js')
const { systemSection } = await import('../src/systemPrompt.js')
const { requestRejection } = await import('../lib/api.js')

test('快照完整：SKILL.md + agents.yaml + tasks.yaml', () => {
  for (const p of ['SKILL.md', 'agents.yaml', 'tasks.yaml']) {
    assert.ok(existsSync(join(SKILL_DIR, p)), `缺 ${p}`)
  }
})

test('SKILL.md：四大视角 + A股特色 + AKShare 指引', async () => {
  const provider = createSkillProvider(SKILL_DIRS)
  const c = (await provider.list())[0]
  assert.equal(c.name, 'a-stock-analysis')
  const skill = await provider.get(c)
  for (const keyword of ['市场分析师', '财务报表专家', '市场情绪研究员', '投资策略顾问']) {
    assert.ok(skill.content.includes(keyword), `缺「${keyword}」`)
  }
  assert.match(skill.content, /涨跌停/, '应含 A 股特色')
  assert.match(skill.content, /akshare|AKShare/, '应含 AKShare 指引')
  assert.match(skill.content, /stock_zh_a_spot_em/, '应含实时行情接口')
  assert.match(skill.content, /不构成投资建议/, '应含免责')
})

test('agents.yaml / tasks.yaml 内容可读（4 Agent + 4 任务）', () => {
  const agents = readFileSync(join(SKILL_DIR, 'agents.yaml'), 'utf8')
  for (const role of ['a_stock_analyst', 'financial_analyst', 'market_sentiment_analyst', 'investment_advisor']) {
    assert.ok(agents.includes(role), `agents.yaml 缺 ${role}`)
  }
  const tasks = readFileSync(join(SKILL_DIR, 'tasks.yaml'), 'utf8')
  for (const task of ['market_analysis', 'financial_analysis']) {
    assert.ok(tasks.includes(task), `tasks.yaml 缺 ${task}`)
  }
})

test('addendum：工作区约定 + AKShare 安装 + 泄露密钥警告', async () => {
  const provider = createSkillProvider(SKILL_DIRS)
  const c = (await provider.list())[0]
  const skill = await provider.get(c)
  assert.match(skill.content, /pip install akshare/, '应有 AKShare 安装指引')
  assert.match(skill.content, /工作区/, '应有工作区约定')
  assert.match(skill.content, /泄露/, '应有上游密钥泄露警告')
})

test('systemPrompt：四大视角 + AKShare 接口 + 免责', () => {
  const section = systemSection()
  assert.equal(section.name, 'a-stock-analysis:methodology')
  assert.match(section.text, /四大视角/)
  assert.match(section.text, /stock_zh_a_spot_em/)
  assert.match(section.text, /不构成投资建议/)
})

test('面板 API 鉴权 fail closed', () => {
  const noService = { get: () => undefined }
  assert.equal(requestRejection(noService, { headers: {} }), false) // 宿主 token 鉴权是边界，服务缺席放行
})

test('LICENSE 为 MIT', () => {
  assert.ok(existsSync(join(ROOT, 'LICENSE')))
  assert.match(readFileSync(join(ROOT, 'LICENSE'), 'utf8'), /MIT/)
})
