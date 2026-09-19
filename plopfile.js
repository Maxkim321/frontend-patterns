export default function (plop) {
  plop.setGenerator('pattern', {
    description: '新增一条方案（pattern）',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: '方案名（kebab-case，如 big-data-table）',
        validate: (v) => (/^[a-z][a-z0-9-]*$/.test(v) ? true : '必须是小写字母、数字、连字符，且字母开头'),
      },
      { type: 'input', name: 'title', message: '中文标题（如 大数据列表渲染）' },
      { type: 'input', name: 'tags', message: '标签（逗号分隔，如 表格,性能）', default: '未分类' },
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'packages/{{name}}',
        base: 'plop-templates/pattern',
        templateFiles: 'plop-templates/pattern/**/*',
      },
      {
        type: 'add',
        path: 'apps/docs/patterns/{{name}}.md',
        templateFile: 'plop-templates/docs-page/pattern.md.hbs',
      },
    ],
  })
}
