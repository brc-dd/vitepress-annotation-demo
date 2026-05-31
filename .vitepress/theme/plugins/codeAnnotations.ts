import { type App, defineCustomElement } from 'vue'
import CodeAnnotationRef from '../components/CodeAnnotationRef.vue'
import '../styles/code-annotations.css'

const TAG = 'code-annotation-ref'

export function codeAnnotations(_app: App) {
  if (typeof customElements !== 'undefined' && !customElements.get(TAG)) {
    customElements.define(TAG, defineCustomElement(CodeAnnotationRef, { shadowRoot: false }))
  }
}
