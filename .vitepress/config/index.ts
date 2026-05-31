import { defineConfig } from 'vitepress'
import { codeAnnotationsPlugin } from './plugins/codeAnnotations.js'

export default defineConfig({
  markdown: {
    config(md) {
      md.use(codeAnnotationsPlugin)
    }
  }
})
