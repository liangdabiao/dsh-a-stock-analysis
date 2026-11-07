// A股投资研究 · Crew 计划解析（agents.yaml / tasks.yaml → 结构化），工具与面板 API 共用。
// 固定格式：`key:` + `  role: >` 折叠块，简单解析器即可，不引第三方 YAML 库。
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

function parseBlocks(file) {
  if (!existsSync(file)) return []
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  const out = []
  let current = null
  let field = null
  let buf = []
  for (const line of lines) {
    const topMatch = /^([a-z_][a-z0-9_]*):\s*$/.exec(line)
    if (topMatch) {
      if (current) {
        current.fields[field] = buf.join(' ').trim()
        out.push(current)
      }
      current = { key: topMatch[1], fields: {} }
      field = null
      buf = []
      continue
    }
    const fieldMatch = /^\s{2}([a-z_]+):\s*(>[-+]?)?\s*$/.exec(line)
    if (current && fieldMatch) {
      if (field) current.fields[field] = buf.join(' ').trim()
      field = fieldMatch[1]
      buf = []
      continue
    }
    if (current && field && /^\s{4}\S/.test(line)) {
      buf.push(line.trim())
    }
  }
  if (current) {
    if (field) current.fields[field] = buf.join(' ').trim()
    out.push(current)
  }
  return out
}

// Crew 构成：agents（角色/目标/背景）+ tasks（任务/预期产出）。
export function loadCrew(skillDirs) {
  for (const dir of [].concat(skillDirs)) {
    const crewDir = existsSync(join(dir, 'a-stock-analysis')) ? join(dir, 'a-stock-analysis') : dir
    const agentsFile = join(crewDir, 'agents.yaml')
    const tasksFile = join(crewDir, 'tasks.yaml')
    if (!existsSync(agentsFile)) continue
    return {
      agents: parseBlocks(agentsFile).map((a) => ({
        key: a.key, role: a.fields.role || '', goal: a.fields.goal || '', backstory: a.fields.backstory || '',
      })),
      tasks: parseBlocks(tasksFile).map((t) => ({
        key: t.key, description: t.fields.description || '', expectedOutput: t.fields.expected_output || '',
      })),
    }
  }
  return { agents: [], tasks: [] }
}
