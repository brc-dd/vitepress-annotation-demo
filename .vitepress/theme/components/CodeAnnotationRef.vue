<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useHost } from 'vue'

// Registered as a custom element (see ../plugins/codeAnnotations.ts) so it works
// even inside VitePress code blocks, which are rendered with `v-pre` and are
// therefore skipped by Vue's template compiler.
//
// The visible anchor is server-rendered: the markdown renderer emits it as this
// element's light-DOM child and we project it through the default <slot>. All
// the tooltip behaviour below is purely client side.
const props = defineProps<{
  /** Id of the matching `.code-annotation` definition block on the page. */
  annotationId: string
}>()

type Placement = 'top' | 'bottom'

const GAP = 8 // distance between anchor and tooltip
const MARGIN = 8 // min distance to the viewport edge
const HIDE_DELAY = 150 // grace period so the pointer can travel into the tooltip

const host = useHost()

const visible = ref(false)
const ready = ref(false)
const content = ref('')
const tooltipEl = ref<HTMLElement | null>(null)
const placement = ref<Placement>('top')
const top = ref(0)
const left = ref(0)
const arrowLeft = ref(0)

let hideTimer: ReturnType<typeof setTimeout> | null = null

function loadContent() {
  const def = document.getElementById(props.annotationId)
  const body = def?.querySelector('.code-annotation__content')
  content.value = body ? body.innerHTML : ''
}

async function show() {
  cancelHide()
  if (!visible.value) {
    loadContent()
    ready.value = false
    visible.value = true
  }
  await nextTick()
  updatePosition()
  ready.value = true
}

function scheduleHide() {
  cancelHide()
  hideTimer = setTimeout(hide, HIDE_DELAY)
}

function cancelHide() {
  if (hideTimer !== null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function hide() {
  cancelHide()
  visible.value = false
  ready.value = false
}

function updatePosition() {
  if (!host || !tooltipEl.value) return

  const anchor = host.getBoundingClientRect()
  const tipW = tooltipEl.value.offsetWidth
  const tipH = tooltipEl.value.offsetHeight
  const vw = window.innerWidth
  const vh = window.innerHeight
  const anchorCenter = anchor.left + anchor.width / 2

  // Prefer placing the tooltip above the anchor; flip below when there isn't
  // enough room above and there is more room below.
  const spaceAbove = anchor.top
  const spaceBelow = vh - anchor.bottom
  const next: Placement =
    spaceAbove < tipH + GAP + MARGIN && spaceBelow > spaceAbove ? 'bottom' : 'top'
  placement.value = next

  let nextTop = next === 'top' ? anchor.top - tipH - GAP : anchor.bottom + GAP
  nextTop = Math.max(MARGIN, Math.min(nextTop, vh - tipH - MARGIN))

  // Center horizontally over the anchor, then clamp inside the viewport.
  let nextLeft = anchorCenter - tipW / 2
  nextLeft = Math.max(MARGIN, Math.min(nextLeft, vw - tipW - MARGIN))

  top.value = nextTop
  left.value = nextLeft
  // Keep the arrow pointing at the anchor even after the tooltip is clamped.
  arrowLeft.value = Math.max(12, Math.min(anchorCenter - nextLeft, tipW - 12))
}

// The tooltip is positioned once on open; dismiss it rather than chase the
// anchor when the viewport changes. Scrolling inside the tooltip's own
// content (when it overflows) must not count as a viewport change.
function hideOnViewportChange(e: Event) {
  if (!visible.value) return
  if (e.type === 'scroll' && e.target instanceof Node && tooltipEl.value?.contains(e.target)) {
    return
  }
  hide()
}

onMounted(() => {
  if (host) {
    host.addEventListener('mouseenter', show)
    host.addEventListener('mouseleave', scheduleHide)
  }
  window.addEventListener('scroll', hideOnViewportChange, true)
  window.addEventListener('resize', hideOnViewportChange)
})

onBeforeUnmount(() => {
  cancelHide()
  if (host) {
    host.removeEventListener('mouseenter', show)
    host.removeEventListener('mouseleave', scheduleHide)
  }
  window.removeEventListener('scroll', hideOnViewportChange, true)
  window.removeEventListener('resize', hideOnViewportChange)
})
</script>

<template>
  <slot />
  <Teleport to="body">
    <div
      v-if="visible"
      ref="tooltipEl"
      class="code-annotation-tooltip"
      :class="[`code-annotation-tooltip--${placement}`, { 'is-ready': ready }]"
      :style="{ top: `${top}px`, left: `${left}px` }"
      role="tooltip"
      @mouseenter="cancelHide"
      @mouseleave="scheduleHide"
    >
      <div class="code-annotation-tooltip__content vp-doc" v-html="content" />
      <span class="code-annotation-tooltip__arrow" :style="{ left: `${arrowLeft}px` }" />
    </div>
  </Teleport>
</template>
