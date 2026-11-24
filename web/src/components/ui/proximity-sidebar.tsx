import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

type Side = "left" | "right"
type SectionKind = "title" | "subtitle" | "section" | "body"
type SectionLevel = 1 | 2 | 3 | 4 | 5 | 6

export type ProximitySection = {
  id: string
  label: string
  preview?: string
  kind?: SectionKind
  level?: SectionLevel
}

type DashPreset = {
  base: number
  bump: number
  thickness: number
  className: string
}

type DashProps = {
  active: boolean
  mouseY: MotionValue<number>
  onSelect: (id: string) => void
  registerDash: (id: string, node: HTMLButtonElement | null) => void
  section: ProximitySection
  sectionKind: SectionKind
  side: Side
}

type ProximitySidebarProps = {
  activeOffset?: number
  className?: string
  sections: ProximitySection[]
  side?: Side
}

const RADIUS = 38
const SCROLL_IDLE_RESET_DELAY = 80

const DASH_PRESETS: Record<SectionKind, DashPreset> = {
  title: {
    base: 12,
    bump: 17,
    thickness: 2,
    className: "bg-foreground",
  },
  subtitle: {
    base: 11,
    bump: 17,
    thickness: 2,
    className: "bg-foreground",
  },
  section: {
    base: 10,
    bump: 17,
    thickness: 2,
    className: "bg-muted-foreground/40",
  },
  body: {
    base: 8,
    bump: 17,
    thickness: 2,
    className: "bg-muted-foreground/40",
  },
}

const getSectionElement = (id: string) =>
  typeof document === "undefined" ? null : document.getElementById(id)

const getSectionKind = (section: ProximitySection): SectionKind => {
  if (section.kind) return section.kind
  if (section.level === 1) return "title"
  if (section.level === 2) return "subtitle"
  if (section.level === 3) return "section"
  return "body"
}

const getElementSectionKind = (id: string): SectionKind | undefined => {
  const heading = getSectionElement(id)?.querySelector("h1, h2, h3, h4, h5, h6")
  const tagName = heading?.tagName.toLowerCase()

  if (tagName === "h1") return "title"
  if (tagName === "h2") return "subtitle"
  if (tagName === "h3") return "section"
  if (tagName) return "body"
}

const getScrollParent = (element: HTMLElement) => {
  let parent = element.parentElement

  while (parent) {
    const { overflowY } = window.getComputedStyle(parent)

    if (/(auto|scroll|overlay)/.test(overflowY)) {
      return parent
    }

    parent = parent.parentElement
  }

  return window
}

const Dash = ({
  active,
  mouseY,
  onSelect,
  registerDash,
  section,
  sectionKind,
  side,
}: DashProps) => {
  const ref = useRef<HTMLButtonElement>(null)
  const reducedMotion = useReducedMotion()
  const preset = DASH_PRESETS[sectionKind]
  const activeWidth = preset.base + preset.bump

  useEffect(() => {
    registerDash(section.id, ref.current)
    return () => registerDash(section.id, null)
  }, [registerDash, section.id])

  const distance = useTransform(mouseY, (y) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect || !Number.isFinite(y)) return RADIUS
    return y - (rect.top + rect.height / 2)
  })

  const targetWidth = useTransform(
    distance,
    [-RADIUS, 0, RADIUS],
    [
      preset.base,
      activeWidth,
      preset.base,
    ],
    { clamp: true }
  )

  const springWidth = useSpring(targetWidth, {
    stiffness: 320,
    damping: 34,
    mass: 0.7,
  })
  const width = useTransform(reducedMotion ? targetWidth : springWidth, value => Math.round(value))

  return (
    <Tooltip delayDuration={130}>
      <TooltipTrigger asChild>
      <button
      ref={ref}
      type="button"
      aria-current={active ? "location" : undefined}
      aria-label={`Go to ${section.label}`}
      className="conversation-timeline-tick group"
      onClick={() => onSelect(section.id)}
    >
      <motion.span
        className={`conversation-timeline-dash ${preset.className}`}
        style={{
          height: preset.thickness,
          width,
        }}
      />
      </button>
      </TooltipTrigger>
      <TooltipContent side={side === "left" ? "right" : "left"} className="conversation-timeline-preview" collisionPadding={12}>
        <p className="conversation-timeline-preview-title">{section.label}</p>
        {section.preview && <p className="conversation-timeline-preview-reply">{section.preview}</p>}
      </TooltipContent>
    </Tooltip>
  )
}

const ProximitySidebar = ({
  activeOffset = 0.4,
  className = "",
  side = "left",
  sections,
}: ProximitySidebarProps) => {
  const mouseY = useMotionValue(Infinity)
  const shouldReduceMotion = useReducedMotion()
  const dashRefs = useRef(new Map<string, HTMLButtonElement>())
  const listRef = useRef<HTMLDivElement>(null)
  const pointerInside = useRef(false)
  const resetTimer = useRef<number | null>(null)
  const [activeId, setActiveId] = useState(sections[0]?.id)
  const [detectedKinds, setDetectedKinds] = useState<Record<string, SectionKind>>(
    {}
  )

  const sectionIds = useMemo(
    () => sections.map((section) => section.id).join("|"),
    [sections]
  )

  const registerDash = useCallback(
    (id: string, node: HTMLButtonElement | null) => {
      if (node) {
        dashRefs.current.set(id, node)
        return
      }

      dashRefs.current.delete(id)
    },
    []
  )

  const clearPendingReset = useCallback(() => {
    if (!resetTimer.current) return

    window.clearTimeout(resetTimer.current)
    resetTimer.current = null
  }, [])

  const setMouseToDash = useCallback(
    (id?: string) => {
      if (!id) {
        mouseY.set(Infinity)
        return
      }

      const node = dashRefs.current.get(id)
      if (!node) return

      const rect = node.getBoundingClientRect()
      mouseY.set(rect.top + rect.height / 2)
    },
    [mouseY]
  )

  const pulseDash = useCallback(
    (id?: string) => {
      setMouseToDash(id)
      clearPendingReset()

      if (!id || pointerInside.current) return

      resetTimer.current = window.setTimeout(() => {
        mouseY.set(Infinity)
        resetTimer.current = null
      }, SCROLL_IDLE_RESET_DELAY)
    },
    [clearPendingReset, mouseY, setMouseToDash]
  )

  const selectSection = useCallback(
    (id: string) => {
      const element = getSectionElement(id)
      if (!element) return

      element.scrollIntoView({
        behavior: shouldReduceMotion ? "auto" : "smooth",
        block: "start",
      })

      window.history.replaceState(window.history.state, "", `#${id}`)
      setActiveId(id)
      pulseDash(id)
    },
    [pulseDash, shouldReduceMotion]
  )

  useEffect(() => () => clearPendingReset(), [clearPendingReset])

  useEffect(() => {
    const kinds = sections.reduce<Record<string, SectionKind>>(
      (nextKinds, section) => {
        nextKinds[section.id] =
          section.kind || section.level
            ? getSectionKind(section)
            : getElementSectionKind(section.id) ?? getSectionKind(section)

        return nextKinds
      },
      {}
    )

    setDetectedKinds(kinds)
  }, [sectionIds, sections])

  useEffect(() => {
    if (!sections.length) return

    let frame = 0
    const targets = sections.flatMap(section => {
      const element = getSectionElement(section.id)
      return element ? [{ id: section.id, element }] : []
    })

    const updateActiveSection = () => {
      frame = 0

      const anchorY = window.innerHeight * activeOffset
      let low = 0
      let high = targets.length
      while (low < high) {
        const middle = Math.floor((low + high) / 2)
        if (targets[middle].element.getBoundingClientRect().top <= anchorY) low = middle + 1
        else high = middle
      }
      const nextActiveId = targets[Math.max(0, low - 1)]?.id ?? sections[0]?.id
      setActiveId(nextActiveId)

      if (!pointerInside.current) {
        const list = listRef.current
        const tick = dashRefs.current.get(nextActiveId)
        if (list && tick) {
          const viewport = list.getBoundingClientRect()
          const bounds = tick.getBoundingClientRect()
          if (bounds.top < viewport.top) list.scrollTop += bounds.top - viewport.top
          else if (bounds.bottom > viewport.bottom) list.scrollTop += bounds.bottom - viewport.bottom
        }
        pulseDash(nextActiveId)
      }
    }

    const scheduleUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateActiveSection)
    }

    const scrollParents = new Set<EventTarget>([window])

    for (const section of sections) {
      const element = getSectionElement(section.id)
      if (element) scrollParents.add(getScrollParent(element))
    }

    updateActiveSection()

    for (const parent of scrollParents) {
      parent.addEventListener("scroll", scheduleUpdate, { passive: true })
    }

    window.addEventListener("resize", scheduleUpdate)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)

      for (const parent of scrollParents) {
        parent.removeEventListener("scroll", scheduleUpdate)
      }

      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [activeOffset, pulseDash, sectionIds, sections])

  return (
    <nav
      aria-label="Conversation timeline"
      className={`flex h-full min-h-0 items-center ${
        side === "left" ? "justify-start" : "justify-end"
      } ${className}`}
    >
      <div
        ref={listRef}
        className={`conversation-timeline-list flex flex-col ${
          side === "right" ? "items-end" : "items-start"
        }`}
        onPointerMove={(event) => {
          clearPendingReset()
          pointerInside.current = true
          mouseY.set(event.clientY)
        }}
        onPointerLeave={() => {
          pointerInside.current = false
          mouseY.set(Infinity)
        }}
      >
        {sections.map((section) => (
          <Dash
            key={section.id}
            active={section.id === activeId}
            mouseY={mouseY}
            onSelect={selectSection}
            registerDash={registerDash}
            section={section}
            sectionKind={detectedKinds[section.id] ?? getSectionKind(section)}
            side={side}
          />
        ))}
      </div>
    </nav>
  )
}

export default ProximitySidebar
