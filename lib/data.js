// A股投资研究 · 研究清单持久化（$DSH_HOME/a-stock-analysis/）。
// plan.json：{ target, style, items: [{ index, task, status, note, updatedAt }] }
// status: todo | doing | done
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const DATA_DIR = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'a-stock-analysis')
const PLAN_FILE = join(DATA_DIR, 'plan.json')
export const STATUSES = ['todo', 'doing', 'done']

// 默认研究流程（与 tasks.yaml 的 4 个任务对应 + 风控收尾）。
export const DEFAULT_STAGES = [
  'A股市场大盘分析（技术面/政策面/资金面）',
  '标的财务分析（盈利/偿债/成长/估值）',
  '市场情绪与资金流向分析',
  '综合投资建议与风险控制方案',
]

export function ensureDirs() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function load() {
  try {
    const raw = JSON.parse(readFileSync(PLAN_FILE, 'utf8'))
    return raw && typeof raw === 'object' ? raw : null
  } catch {
    return null
  }
}

function save(plan) {
  ensureDirs()
  const tmp = `${PLAN_FILE}.tmp`
  writeFileSync(tmp, JSON.stringify(plan, null, 2), 'utf8')
  renameSync(tmp, PLAN_FILE)
}

export function getPlan() {
  return load() || { target: '', style: '', items: [] }
}

export function initPlan(target, style, stages, confirm = false) {
  const prev = load()
  if (prev && prev.items.length && !confirm) {
    return { conflict: true, target: prev.target, items: prev.items.length }
  }
  const list = Array.isArray(stages) && stages.length ? stages : DEFAULT_STAGES
  const plan = {
    target,
    style: style || '',
    items: list.map((task, i) => ({ index: i + 1, task, status: 'todo', note: '', updatedAt: new Date().toISOString() })),
    updatedAt: new Date().toISOString(),
  }
  save(plan)
  return plan
}

export function updateStage(index, patch) {
  const plan = load()
  if (!plan) return null
  let item = plan.items.find((it) => it.index === index)
  if (!item) {
    item = { index, task: patch.task || `阶段${index}`, status: 'todo', note: '', updatedAt: '' }
    plan.items.push(item)
    plan.items.sort((a, b) => a.index - b.index)
  }
  if (patch.task !== undefined) item.task = patch.task
  if (patch.status !== undefined && STATUSES.includes(patch.status)) item.status = patch.status
  if (patch.note !== undefined) item.note = String(patch.note).slice(0, 300)
  item.updatedAt = new Date().toISOString()
  plan.updatedAt = item.updatedAt
  save(plan)
  return item
}

export function clearPlan() {
  save({ target: '', style: '', items: [] })
}
