import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const r = (p: string) => path.resolve(__dirname, p)

// 环境依赖 shim：DocFlow 组件逐字复制，next/主题/UI 库/后端 API 全部走别名替换
const shims = {
  'next/navigation': r('src/shims/next-navigation.ts'),
  '@/components/theme-provider': r('src/shims/theme-provider.ts'),
  '@/lib/utils': r('src/shims/utils.ts'),
  '@/services/workflows': r('src/shims/workflows.ts'),
  sonner: r('src/shims/toast.tsx'),
  '@/components/ui/badge': r('src/shims/ui.tsx'),
  '@/components/ui/button': r('src/shims/ui.tsx'),
  '@/components/ui/card': r('src/shims/ui.tsx'),
  '@/components/ui/input': r('src/shims/ui.tsx'),
  '@/components/ui/label': r('src/shims/ui.tsx'),
  '@/components/ui/select': r('src/shims/ui.tsx'),
  '@/components/ui/separator': r('src/shims/ui.tsx'),
  '@/components/ui/textarea': r('src/shims/ui.tsx'),
  '@/components/ui/command': r('src/shims/ui.tsx'),
  '@/components/ui/popover': r('src/shims/ui.tsx'),
  '@docflow/agent-contracts/workflow': r('src/agent-contracts/workflow/index.ts'),
  '@docflow/agent-contracts': r('src/agent-contracts/index.ts'),
}

export default defineConfig({
  base: '/frontend-patterns/react-demo/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: shims },
  build: { chunkSizeWarningLimit: 1600 },
})
