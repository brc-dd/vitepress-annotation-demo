import { slugify } from '@mdit-vue/shared'
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'

type MarkdownIt = Parameters<Required<import('vitepress').MarkdownOptions>['config']>[0]

type CodeAnnotationStore = Record<string, true>

type CodeAnnotationEnv = {
  codeAnnotations?: CodeAnnotationStore
}

export function codeAnnotationsPlugin(md: MarkdownIt) {
  md.block.ruler.before('reference', 'code_annotation_def', codeAnnotationDef.bind(null, md), {
    alt: ['paragraph', 'reference']
  })

  md.renderer.rules.code_annotation_open = (tokens, idx) => {
    const ref: string = tokens[idx].meta.ref
    const annotationId = getAnnotationId(ref)
    const codeRefId = getCodeRefId(ref)

    return [
      `<div id="${md.utils.escapeHtml(annotationId)}" class="code-annotation">`,
      `<a class="code-annotation__label"`,
      ` href="#${md.utils.escapeHtml(codeRefId)}"`,
      ` aria-label="Back to code annotation ${md.utils.escapeHtml(ref)}">`,
      `${md.utils.escapeHtml(ref)}`,
      `</a>`,
      `<div class="code-annotation__content">`
    ].join('')
  }
  md.renderer.rules.code_annotation_anchor = () => `</div>`
  md.renderer.rules.code_annotation_close = () => `</div>\n`

  const origRenderAsync = md.renderAsync.bind(md)
  md.renderAsync = async (src, env = {}) => {
    const html = await origRenderAsync(src, env)
    return replaceAnnotationMarkers(md, html, env)
  }
}

function codeAnnotationDef(
  md: MarkdownIt,
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean
): boolean {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false

  const start = state.bMarks[startLine] + state.tShift[startLine]
  const max = state.eMarks[startLine]

  if (start + 3 > max) return false
  if (state.src.charCodeAt(start) !== 0x40 /* @ */) return false

  let pos = start + 1
  const refStart = pos

  while (pos < max) {
    const code = state.src.charCodeAt(pos)
    if (code < 0x30 || code > 0x39) break
    pos++
  }

  if (pos === refStart) return false
  if (pos >= max) return false
  if (state.src.charCodeAt(pos) !== 0x3a /* : */) return false

  if (silent) return true

  const ref = state.src.slice(refStart, pos)
  getAnnotationStore(state.env)[ref] = true

  pos++

  const tokenOpen = new state.Token('code_annotation_open', 'div', 1)
  tokenOpen.block = true
  tokenOpen.meta = { ref }
  tokenOpen.level = state.level++
  state.tokens.push(tokenOpen)

  const oldBMark = state.bMarks[startLine]
  const oldTShift = state.tShift[startLine]
  const oldSCount = state.sCount[startLine]
  const oldParentType = state.parentType

  const posAfterColon = pos
  const initial =
    state.sCount[startLine] + pos - (state.bMarks[startLine] + state.tShift[startLine])

  let offset = initial

  while (pos < max) {
    const ch = state.src.charCodeAt(pos)

    if (md.utils.isSpace(ch)) {
      if (ch === 0x09 /* tab */) {
        offset += 4 - (offset % 4)
      } else {
        offset++
      }
    } else {
      break
    }

    pos++
  }

  state.tShift[startLine] = pos - posAfterColon
  state.sCount[startLine] = offset - initial
  state.bMarks[startLine] = posAfterColon

  state.blkIndent += 4
  // @ts-expect-error custom type
  state.parentType = 'code_annotation'

  if (state.sCount[startLine] < state.blkIndent) {
    state.sCount[startLine] += state.blkIndent
  }

  state.md.block.tokenize(state, startLine, endLine)

  state.parentType = oldParentType
  state.blkIndent -= 4
  state.tShift[startLine] = oldTShift
  state.sCount[startLine] = oldSCount
  state.bMarks[startLine] = oldBMark

  const tokenAnchor = new state.Token('code_annotation_anchor', '', 0)
  tokenAnchor.meta = { ref }
  tokenAnchor.level = state.level
  state.tokens.push(tokenAnchor)

  const tokenClose = new state.Token('code_annotation_close', 'div', -1)
  tokenClose.block = true
  tokenClose.meta = { ref }
  tokenClose.level = --state.level
  state.tokens.push(tokenClose)

  return true
}

function replaceAnnotationMarkers(md: MarkdownIt, html: string, env: CodeAnnotationEnv): string {
  const store = getAnnotationStore(env)
  const escapeHtml = md.utils.escapeHtml

  return html.replace(/<span\b[^>]*>\s*\/\*\s*@(\d+)\s*\*\/\s*<\/span>/g, (match, ref: string) => {
    if (!store[ref]) return match

    const annotationId = getAnnotationId(ref)
    const codeRefId = getCodeRefId(ref)

    return [
      `<a id="${escapeHtml(codeRefId)}"`,
      ` class="code-annotation-ref vp-copy-ignore"`,
      ` href="#${escapeHtml(annotationId)}"`,
      ` data-ref="${escapeHtml(ref)}"`,
      ` aria-describedby="${escapeHtml(annotationId)}"`,
      ` aria-label="Code annotation ${escapeHtml(ref)}">`,
      `${escapeHtml(ref)}`,
      `</a>`
    ].join('')
  })
}

function getAnnotationStore(env: CodeAnnotationEnv): CodeAnnotationStore {
  return (env.codeAnnotations ??= Object.create(null))
}

function getAnnotationId(ref: string): string {
  return `code-annotation-${slugify(ref)}`
}

function getCodeRefId(ref: string): string {
  return `code-annotation-ref-${slugify(ref)}`
}
