// ============================================================================
// A股投资研究 · 浏览器半边（最小面板）。
// 两块：📖 四大视角 + 📋 技能目录。
// ============================================================================
const h = require('react').createElement
const { useState, useEffect } = require('react')

const PANEL_ID = 'a-stock-analysis'
const BASE = 'a-stock-analysis'

function PanelIcon(props) {
  return h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', ...props },
    h('rect', { x: 2.5, y: 2.5, width: 19, height: 19, rx: 5, fill: '#b03a2e' }),
    h('path', { d: 'M6 17l3-5 3 2 3-5 3 3', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    h('path', { d: 'M6 19.5h12', stroke: '#ffd24a', 'stroke-width': 1.4, 'stroke-linecap': 'round' }))
}

async function fetchJson(path) {
  const res = await fetch(BASE + path)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`)
  return data
}

const VIEWS = [
  ['📈 市场分析师', '技术面（K线/均线/支撑阻力）· 政策面 · 资金面（主力/北向/散户）'],
  ['💰 财务报表专家', '财务比率（ROE/毛利率）· 趋势分析 · 同业对比 · 估值（PE/PB/PEG）'],
  ['😊 市场情绪研究员', '资金流向 · 北向资金 · 新闻舆情 · 板块轮动 · 游资炒作'],
  ['💼 投资策略顾问', '综合评级 · 目标价区间 · 风险提示 · 仓位建议 · 止损位'],
]

function GuideTab() {
  return h('div', null,
    h('div', { style: styles.card },
      h('div', { style: styles.sectionTitle }, '怎么发起研究'),
      h('div', { style: styles.stepList },
        '在对话里一句话即可：',
        h('div', { style: styles.quote }, '「深度分析贵州茅台 600519」'),
        h('div', { style: styles.quote }, '「分析腾讯 00700.HK 的投资价值」'),
        h('div', { style: styles.quote }, '「宁德时代 300750 财务分析」'),
        '模型按四大视角顺序执行，产出结构化研究报告。')),
    h('div', { style: styles.card },
      h('div', { style: styles.sectionTitle }, '四大视角'),
      h('div', { style: styles.viewList },
        VIEWS.map(([title, desc]) => h('div', { key: title, style: styles.viewRow },
          h('div', { style: styles.viewTitle }, title),
          h('div', { style: styles.muted }, desc))))),
    h('div', { style: styles.card },
      h('div', { style: styles.sectionTitle }, '数据获取'),
      h('div', { style: styles.muted },
        'AKShare（Python，免费无 key）——沙箱 pip install 后用脚本拿实时行情/财务/资金流数据。',
        h('br'), '无 Python 时用网络搜索或请用户提供数据；数据缺口标 N/A 不编造。')),
    h('div', { style: styles.card },
      h('div', { style: styles.sectionTitle }, '⚠️ 免责声明'),
      h('div', { style: styles.muted }, '本研究框架输出分析，不构成投资建议。所有投资存在风险，投资决策前请自行尽职调查。')))
}

function SkillsTab() {
  const [skills, setSkills] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    fetchJson('/api/skills').then((d) => setSkills(d.skills)).catch((e) => setError(e.message))
  }, [])
  return h('div', null,
    error ? h('div', { style: styles.error }, error) : null,
    skills === null ? h('div', { style: styles.muted }, '加载中…') : null,
    skills?.map((s) => h('div', { key: s.name, style: styles.card },
      h('div', { style: styles.skillName }, '/' + s.name),
      h('div', { style: styles.skillDesc }, s.description.length > 200 ? s.description.slice(0, 200) + '…' : s.description))))
}

function Panel() {
  const [tab, setTab] = useState('guide')
  return h('div', { style: styles.wrap },
    h('div', { style: styles.row },
      h('button', { style: tab === 'guide' ? styles.tabActive : styles.tab, onClick: () => setTab('guide') }, '📖 四大视角'),
      h('button', { style: tab === 'skills' ? styles.tabActive : styles.tab, onClick: () => setTab('skills') }, '📋 技能目录')),
    tab === 'guide' ? h(GuideTab) : h(SkillsTab))
}

const styles = {
  wrap: { padding: 16, overflow: 'auto', height: '100%', boxSizing: 'border-box', fontFamily: '-apple-system, "Segoe UI", "Microsoft YaHei", sans-serif', fontSize: 13, color: '#1a1a1a' },
  row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 },
  button: { padding: '6px 14px', border: 'none', borderRadius: 8, background: '#b03a2e', color: '#fff', cursor: 'pointer', fontSize: 13 },
  tab: { padding: '8px 16px', border: '1px solid #d9d9de', borderRadius: 8, background: '#fff', color: '#1a1a1a', cursor: 'pointer', fontSize: 13 },
  tabActive: { padding: '8px 16px', border: '1px solid #b03a2e', borderRadius: 8, background: '#f9eae8', color: '#7a1f15', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  card: { background: '#fff', border: '1px solid #e3e3e6', borderRadius: 10, padding: 12, marginBottom: 10 },
  sectionTitle: { fontWeight: 700, marginBottom: 6 },
  stepList: { lineHeight: 1.9 },
  quote: { background: '#f9eae8', borderRadius: 6, padding: '4px 10px', margin: '4px 0', color: '#7a1f15' },
  viewList: { display: 'grid', gap: 8 },
  viewRow: { background: '#fafafa', borderRadius: 8, padding: '8px 10px' },
  viewTitle: { fontWeight: 600, color: '#7a1f15' },
  muted: { color: '#8a8a92' },
  error: { color: '#c0392b' },
  skillName: { fontWeight: 700, color: '#7a1f15' },
  skillDesc: { marginTop: 4, color: '#4a4a50', lineHeight: 1.5 },
}

function apply(ctx) {
  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 16, label: () => 'A股研究' }, PanelIcon))
  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: PANEL_ID }, Panel))
}

exports.isPlugin = true
exports.inject = ['slots']
exports.apply = apply
