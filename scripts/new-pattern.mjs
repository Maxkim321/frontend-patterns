// 非交互式生成方案骨架：pnpm new:cli -- --name xxx --title "中文标题" [--tags "a,b"]
// 供脚本 / AI / CI 调用；手动交互仍用 `pnpm new`（plop）。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function flag(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : undefined
}

const name = flag('name')
const title = flag('title')
const tags = flag('tags') || '未分类'

if (!name || !title) {
  console.error('用法：pnpm new:cli -- --name xxx --title "中文标题" [--tags "a,b"]')
  process.exit(1)
}

if (!/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('方案名必须是 kebab-case（小写字母、数字、连字符，字母开头）')
  process.exit(1)
}

const dest = join(root, 'packages', name)
if (existsSync(dest)) {
  console.error(`已存在：${dest}`)
  process.exit(1)
}

// 简单的占位符替换（模板只有 {{name}} / {{title}} / {{tags}} 三类变量，无需完整 handlebars）
function render(content) {
  return content
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{tags\}\}/g, tags)
    .replace(/\\\{\{/g, '{{') // 还原 handlebars 转义（如 demo 里的 \{{ message }}）
}

function copyTpl(relFrom, relTo) {
  const src = join(root, 'plop-templates/pattern', relFrom)
  const out = join(dest, relTo)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, render(readFileSync(src, 'utf8')))
}

copyTpl('package.json.hbs', 'package.json')
copyTpl('README.md.hbs', 'README.md')
copyTpl('src/index.ts.hbs', 'src/index.ts')
copyTpl('src/types.ts.hbs', 'src/types.ts')
copyTpl('demo/Demo.vue.hbs', 'demo/Demo.vue')

const docsPage = render(readFileSync(join(root, 'plop-templates/docs-page/pattern.md.hbs'), 'utf8'))
writeFileSync(join(root, 'apps/docs/patterns', `${name}.md`), docsPage)

console.log(`已生成方案：${name}`)
console.log(`  - packages/${name}/`)
console.log(`  - apps/docs/patterns/${name}.md`)
console.log('下一步：按 AGENTS.md 填空，并在 config.ts 注册侧边栏、theme/index.ts 注册 demo。')
