import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { codeAnnotations } from './plugins/codeAnnotations'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(codeAnnotations)
  }
} satisfies Theme
