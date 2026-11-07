// A股投资研究 · Host 半边（技能 + 硬规则注入 + astock_crew/astock_plan 原生工具 + 面板数据面）。
import Schema from '@deepseek-ai/schemastery'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSkillProvider } from '../lib/skills.js'
import { systemSection } from './systemPrompt.js'
import { registerApi } from '../lib/api.js'
import { loadCrew } from '../lib/crew.js'
import { getPlan, initPlan, updateStage, clearPlan, DEFAULT_STAGES, STATUSES } from '../lib/data.js'

export const name = 'a-stock-analysis'

export const inject = ['tools', 'skills', 'systemPrompt', 'webServer', 'connection']

export const Config = Schema.object({
  injectRules: Schema.boolean().default(true).description('注入投资研究方法论到系统提示'),
})

function check(args, spec) {
  const problems = []
  for (const key of spec.required || []) {
    if (args?.[key] === undefined) problems.push(`缺少必填参数 ${key}`)
  }
  for (const [key, rule] of Object.entries(spec.properties || {})) {
    const value = args?.[key]
    if (value === undefined) continue
    if (rule.enum && !rule.enum.includes(value)) problems.push(`${key} 只能是 ${rule.enum.join(' / ')} 之一`)
  }
  for (const key of Object.keys(args || {})) {
    if (!spec.properties || !(key in spec.properties)) problems.push(`未知参数 ${key}`)
  }
  if (problems.length) throw new Error(`参数有误：${problems.join('；')}。`)
}

const str = (description, extra = {}) => ({ type: 'string', description, ...extra })
const num = (description, extra = {}) => ({ type: 'number', description, ...extra })
const text = (value) => [{ type: 'text', text: value }]

const OUTPUT = {
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['ok', 'summary'],
    properties: {
      ok: { type: 'boolean' },
      summary: { type: 'string', description: '给模型看的回执' },
      data: { type: 'string', description: '可选：Crew 构成/清单' },
    },
  },
  render: (_args, value) => text(value.data ? `${value.summary}\n\n${value.data}` : value.summary),
}

const result = (ok, summary, data = '') => ({ ok, summary, data })

// ---------------------------------------------------------------------------
// 工具 1：astock_crew —— CrewAI 团队构成查询（4 角色 + 4 任务）
// ---------------------------------------------------------------------------
export const astockCrewTool = {
  name: 'astock_crew',
  description:
    '查询内置的 A 股研究 CrewAI 团队构成：4 个分析师角色（大盘/财务/情绪/投资顾问，含 role/goal/backstory）' +
    '与 4 个任务（市场分析/财务分析/情绪分析/投资建议，含 description/expected_output）。' +
    '按此分工组织研究：哪些维度该看什么、每个任务交付什么。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['action'],
    properties: {
      action: str('agents 列角色；tasks 列任务；all 全部', { enum: ['agents', 'tasks', 'all'] }),
      key: str('可选：只看某个 agent/task 的详情（如 financial_analyst）'),
    },
  },
  output: OUTPUT,
  async execute(args) {
    check(args, this.parameters)
    const crew = loadCrew(skillDirsRef.dirs)
    if (!crew.agents.length) return result(false, 'Crew 配置（agents.yaml/tasks.yaml）不可用。')
    const pick = (list, key) => (key ? list.filter((x) => x.key === key) : list)
    const parts = []
    if (args.action === 'agents' || args.action === 'all') {
      for (const a of pick(crew.agents, args.key)) {
        parts.push(`【角色 ${a.key}】\n职位：${a.role}\n目标：${a.goal}\n背景：${a.backstory}`)
      }
    }
    if (args.action === 'tasks' || args.action === 'all') {
      for (const t of pick(crew.tasks, args.key)) {
        parts.push(`【任务 ${t.key}】\n内容：${t.description}\n预期产出：${t.expectedOutput}`)
      }
    }
    if (!parts.length) return result(false, `没有找到 ${args.key}（agents: ${crew.agents.map((a) => a.key).join('、')}）。`)
    return result(true, `Crew 构成（${parts.length} 项）：`, parts.join('\n\n'))
  },
}

// ---------------------------------------------------------------------------
// 工具 2：astock_plan —— 研究清单持久化
// ---------------------------------------------------------------------------
export const astockPlanTool = {
  name: 'astock_plan',
  description:
    '管理一只 A 股标的研究进度（持久化）：init 建研究清单（默认 4 阶段：大盘/财务/情绪/综合建议）、' +
    'status 更新阶段进度、list 看进度。用户要求分析某只 A 股时先 init，每完成一个阶段用 status 记录，用户可在侧栏面板看进度。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['action'],
    properties: {
      action: str('init 建清单；status 更新阶段；list 看进度；clear 清空', { enum: ['init', 'status', 'list', 'clear'] }),
      target: str('init：标的代码/名称（如 贵州茅台、600519、宁德时代）'),
      style: str('init：可选，投资风格（价值/成长/趋势）'),
      stages: str('init：可选，自定义阶段（竖线分隔）。缺省用 4 阶段默认流程'),
      index: num('status：阶段序号（从 1 开始）'),
      status: str('status：todo / doing / done', { enum: STATUSES }),
      note: str('status：可选，该阶段结论（一句话）'),
      confirm: str('init 覆盖 / clear 清空，都要传 "yes"', { enum: ['yes'] }),
    },
  },
  output: OUTPUT,
  async execute(args) {
    check(args, this.parameters)
    if (args.action === 'init') {
      if (!args.target) throw new Error('init 需要 target（标的代码/名称）。')
      const stages = args.stages ? args.stages.split('|').map((s) => s.trim()).filter(Boolean) : DEFAULT_STAGES
      const plan = initPlan(args.target, args.style, stages, args.confirm === 'yes')
      if (plan.conflict) {
        return result(false, `已有「${plan.target}」的研究清单共 ${plan.items} 阶段。要覆盖请用 confirm:"yes"。`)
      }
      return result(true, `「${plan.target}」研究清单已建立（${stages.length} 阶段）${plan.style ? `，风格 ${plan.style}` : ''}。每完成一个阶段用 status 更新。`,
        stages.map((t, i) => `${i + 1}. ${t} [todo]`).join('\n'))
    }
    if (args.action === 'status') {
      if (!args.index) throw new Error('status 需要 index（阶段序号）。')
      const item = updateStage(args.index, { status: args.status, note: args.note })
      if (!item) return result(false, '还没有研究清单，先 init。')
      return result(true, `阶段 ${item.index}「${item.task}」→ ${item.status}${item.note ? `（${item.note}）` : ''}。`)
    }
    if (args.action === 'clear') {
      if (args.confirm !== 'yes') return result(false, '清空研究清单请用 confirm:"yes"。')
      clearPlan()
      return result(true, '研究清单已清空。')
    }
    const plan = getPlan()
    if (!plan.items.length) return result(true, '还没有研究清单。init 一个即可开始（默认 4 阶段）。')
    const done = plan.items.filter((it) => it.status === 'done').length
    return result(true, `「${plan.target}」研究进度：${done}/${plan.items.length} 完成${plan.style ? `（${plan.style}）` : ''}。`,
      plan.items.map((it) => `${it.index}. ${it.task} [${it.status}]${it.note ? ` ${it.note}` : ''}`).join('\n'))
  },
}

const skillDirsRef = { dirs: [] }

export function apply(ctx, config) {
  const skillDirs = [join(dirname(fileURLToPath(import.meta.url)), '..', 'skills')]
  skillDirsRef.dirs = skillDirs

  ctx.effect(() => ctx.tools.register(astockCrewTool), `${name}: tool crew`)
  ctx.effect(() => ctx.tools.register(astockPlanTool), `${name}: tool plan`)
  ctx.effect(() => ctx.skills.registerProvider(() => createSkillProvider(skillDirs)), `${name}: skills`)

  if (config.injectRules !== false) {
    ctx.effect(() => ctx.systemPrompt.section(systemSection()), `${name}: methodology`)
  }

  ctx.effect(() => registerApi(ctx, { skillDirs }), `${name}: routes`)
}
