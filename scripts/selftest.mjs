// 离线自检：技能注册 + addendum + systemPrompt + 面板 API。零网络零 key。
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { createSkillProvider } = await import('../lib/skills.js')
const { systemSection } = await import('../src/systemPrompt.js')

let failed = 0
const step = async (name, fn) => {
  process.stdout.write(`- ${name} … `)
  try {
    await fn()
    console.log('ok')
  } catch (err) {
    failed++
    console.log('失败')
    console.error(`  ${err.message}`)
  }
}

await step('快照完整（SKILL.md + agents.yaml + tasks.yaml）', () => {
  for (const p of ['SKILL.md', 'agents.yaml', 'tasks.yaml']) {
    if (!existsSync(join(ROOT, 'skills', 'a-stock-analysis', p))) throw new Error(`缺 ${p}`)
  }
})

const provider = createSkillProvider([join(ROOT, 'skills')])
let candidates
await step('provider 注册 + 四大视角正文 + addendum', async () => {
  candidates = await provider.list()
  if (candidates.length !== 1) throw new Error(`候选 ${candidates.length} ≠ 1`)
  const skill = await provider.get(candidates[0])
  for (const keyword of ['市场分析师', '财务报表专家', '市场情绪研究员', '投资策略顾问', 'stock_zh_a_spot_em', '不构成投资建议']) {
    if (!skill.content.includes(keyword)) throw new Error(`缺「${keyword}」`)
  }
  if (!skill.content.includes('泄露')) throw new Error('缺密钥泄露警告')
})

await step('systemPrompt 含方法论核心', () => {
  const section = systemSection()
  if (!section.text.includes('四大视角')) throw new Error('缺四大视角')
  if (!section.text.includes('stock_zh_a_spot_em')) throw new Error('缺 AKShare 接口')
  if (!section.text.includes('不构成投资建议')) throw new Error('缺免责')
})

await step('上游密钥不入包（env.example 排除）', () => {
  if (existsSync(join(ROOT, 'skills', 'a-stock-analysis', '.env.example'))) throw new Error('.env.example 不应入包')
  // 全局扫描不含明文 key
  const skillText = readFileSync(join(ROOT, 'skills', 'a-stock-analysis', 'SKILL.md'), 'utf8')
  if (skillText.includes('fk217050')) throw new Error('明文密钥泄露！')
})

await step('面板 API 健康（内存 ctx 模拟）', async () => {
  const { registerApi } = await import('../lib/api.js')
  const captured = []
  const fakeRes = { writeHead() { return this }, end(chunk) { captured.push(String(chunk)) } }
  const fakeCtx = {
    get: () => ({ requestRejection: () => false }),
    webServer: { register: async ({ handler }) => { globalThis.__stockHandler = handler } },
  }
  await registerApi(fakeCtx, { skillDirs: [join(ROOT, 'skills')] })
  const handler = globalThis.__stockHandler
  if (!handler) throw new Error('路由未注册')
  await handler({ method: 'GET', url: '/a-stock-analysis/api/health', headers: {} }, fakeRes)
  if (!JSON.parse(captured.at(-1)).ok) throw new Error('health 错误')
})

if (failed > 0) {
  console.error(`\n自检失败 ${failed} 项`)
  process.exit(1)
}
console.log('\n全部通过。')
