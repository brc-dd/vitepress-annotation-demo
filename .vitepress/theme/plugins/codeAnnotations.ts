import { App } from 'vue'
import CodeAnnotationRef from '../components/CodeAnnotationRef.vue'
import '../styles/code-annotations.css'

export function codeAnnotations(app: App) {
  app.component('CodeAnnotationRef', CodeAnnotationRef)
}
