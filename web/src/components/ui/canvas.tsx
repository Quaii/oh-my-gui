// Source: user-supplied shadcn.io canvas manual installation.
"use client";

import {
  LockIcon,
  LockOpenIcon,
  MaximizeIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react";
import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type KeyboardEvent,
  type PointerEvent,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** A point on the canvas, in its own units: `x` from the inline start, `y` down. */
export interface CanvasPosition {
  x: number;
  y: number;
}

/** A new edge someone drew: from a node's output to another node's input. */
export interface CanvasConnectionParams {
  /** The id of the node the edge starts from. */
  source: string;
  /** The id of the node the edge ends at. */
  target: string;
}

/** Which handles a node has: `target` on its inline start, `source` on its inline end. */
export interface CanvasNodeHandles {
  source: boolean;
  target: boolean;
}

/** Where a panel sits in the canvas: logical corners, or centered on an edge. */
export type CanvasPanelPosition =
  | "bottom-center"
  | "bottom-end"
  | "bottom-start"
  | "top-center"
  | "top-end"
  | "top-start";

/** How an edge is drawn: a line, a line with a dot running along it, or dashed. */
export type CanvasEdgeType = "animated" | "default" | "temporary";

/** What the canvas shows: its offset from the inline-start top corner, in pixels, and its scale. */
interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

/** A node's place and measured size, in canvas units. */
interface CanvasBox {
  h: number;
  w: number;
  x: number;
  y: number;
}

/**
 * A connection being drawn from a node's output: to the pointer's point
 * (`pointer`), or, from the keyboard, waiting for an input to be chosen.
 */
interface CanvasDraft {
  pointer: boolean;
  /** The node it starts from; `""` while none is being drawn. */
  source: string;
  x: number;
  y: number;
}

/** A press on the background, a node or a handle: where it began, and whether it has moved. */
interface CanvasPress {
  /** The pointer's id; -1 while nothing is pressed. */
  id: number;
  moved: boolean;
  pointerX: number;
  pointerY: number;
  rtl: boolean;
  /** The place being moved (the view's offset or the node's), as the press began. */
  x: number;
  y: number;
}

interface CanvasContextValue {
  boxes: Record<string, CanvasBox>;
  /** Connects the connection being drawn to a node's input. */
  connect: (target: string) => void;
  draft: CanvasDraft;
  /** Draws the connection from a node's output to the pointer. */
  drawTo: (source: string, clientX: number, clientY: number) => void;
  /** Ends a drawn connection where the pointer was let go. */
  drop: (clientX: number, clientY: number) => void;
  /** Glides the view to show every node. */
  fit: () => void;
  locked: boolean;
  maxZoom: number;
  minZoom: number;
  nodeHelpId: string;
  place: (id: string, box: CanvasBox) => void;
  remove: (id: string) => void;
  say: (message: string) => void;
  select: (id: string) => void;
  selected: string;
  setLocked: (locked: boolean) => void;
  /** Starts a connection from a node's output, or stops it when it's already started there. */
  startConnection: (source: string) => void;
  zoom: number;
  zoomBy: (factor: number) => void;
}

const CanvasContext = createContext<CanvasContextValue>({
  boxes: {},
  connect: () => undefined,
  draft: { pointer: false, source: "", x: 0, y: 0 },
  drawTo: () => undefined,
  drop: () => undefined,
  fit: () => undefined,
  locked: false,
  maxZoom: 2,
  minZoom: 0.25,
  nodeHelpId: "",
  place: () => undefined,
  remove: () => undefined,
  say: () => undefined,
  select: () => undefined,
  selected: "",
  setLocked: () => undefined,
  startConnection: () => undefined,
  zoom: 1,
  zoomBy: () => undefined,
});

interface CanvasNodeContextValue {
  id: string;
  selected: boolean;
  titleId: string;
}

const CanvasNodeContext = createContext<CanvasNodeContextValue>({
  id: "",
  selected: false,
  titleId: "",
});

const NO_DRAFT: CanvasDraft = { pointer: false, source: "", x: 0, y: 0 };
const IDLE: CanvasPress = {
  id: -1,
  moved: false,
  pointerX: 0,
  pointerY: 0,
  rtl: false,
  x: 0,
  y: 0,
};
const BOTH: CanvasNodeHandles = { source: true, target: true };

/** How far a pointer travels before a press becomes a drag, in pixels. */
const DEAD_ZONE = 3;
/** How far an arrow key moves a node (Shift: `BIG_STEP`), in canvas units. */
const STEP = 10;
const BIG_STEP = 50;
/** How far an arrow key pans the view, in pixels. */
const PAN_STEP = 40;
/** How much a zoom button or key scales the view. */
const ZOOM_STEP = 1.2;
/** How long a button's zoom or fit glides, in milliseconds (none with reduced motion). */
const GLIDE = 250;

const ARROWS: Record<string, CanvasPosition> = {
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
};

const ZOOM_KEYS: Record<string, number> = {
  _: 1 / ZOOM_STEP,
  "-": 1 / ZOOM_STEP,
  "+": ZOOM_STEP,
  "=": ZOOM_STEP,
};

/**
 * The dots' spacing on screen: 20 canvas units, doubled while that's under
 * 12 pixels, so a zoomed-out view doesn't turn grey.
 */
const gridOf = (zoom: number) => {
  const spacing = 20 * zoom;
  return spacing * 2 ** Math.max(0, Math.ceil(Math.log2(12 / spacing)));
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isRtl = (node: Element) => getComputedStyle(node).direction === "rtl";

/** Whether a press began on something of its own: a button, a field, a link. */
const isControl = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest(
    "button, input, textarea, select, a[href], [contenteditable=true]"
  ) !== null;

/** Whether a key goes to a field: typing keeps its keys. */
const isField = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest("input, textarea, select, [contenteditable=true]") !== null;

/** Where a pointer is in the canvas: pixels from its inline-start top corner. */
const pointIn = (node: HTMLElement, clientX: number, clientY: number) => {
  const box = node.getBoundingClientRect();
  return {
    x: isRtl(node)
      ? box.right - node.clientLeft - clientX
      : clientX - box.left - node.clientLeft,
    y: clientY - box.top - node.clientTop,
  };
};

/** The view scaled to `zoom` around a point of the canvas, which stays put. */
const zoomAround = (
  view: CanvasViewport,
  zoom: number,
  x: number,
  y: number
): CanvasViewport => ({
  x: x - ((x - view.x) / view.zoom) * zoom,
  y: y - ((y - view.y) / view.zoom) * zoom,
  zoom,
});

/**
 * The view that shows every node, centered, with `padding` (a share of
 * the view) around them; never above 100%.
 */
const fitBoxes = (
  boxes: CanvasBox[],
  width: number,
  height: number,
  padding: number,
  bounds: { max: number; min: number }
): CanvasViewport => {
  if (boxes.length === 0 || width === 0 || height === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.w));
  const bottom = Math.max(...boxes.map((box) => box.y + box.h));
  const zoom = clamp(
    Math.min(
      width / ((right - left) * (1 + padding)),
      height / ((bottom - top) * (1 + padding)),
      1
    ),
    bounds.min,
    bounds.max
  );
  return {
    x: (width - (right - left) * zoom) / 2 - left * zoom,
    y: (height - (bottom - top) * zoom) / 2 - top * zoom,
    zoom,
  };
};

/** How far a bezier's handle reaches: half the gap, or a loop's when the target is behind. */
const reach = (distance: number) =>
  distance >= 0 ? distance / 2 : 6.25 * Math.sqrt(-distance);

/** A curve from a node's output (inline end) to another's input (inline start). */
const edgePath = (from: CanvasBox, to: CanvasBox) => {
  const sx = from.x + from.w;
  const sy = from.y + from.h / 2;
  const tx = to.x;
  const ty = to.y + to.h / 2;
  const bend = reach(tx - sx);
  return `M ${sx},${sy} C ${sx + bend},${sy} ${tx - bend},${ty} ${tx},${ty}`;
};

/** The line being drawn: from a node's output to the pointer, its handles halfway across. */
const draftPath = (from: CanvasBox, draft: CanvasDraft) => {
  const sx = from.x + from.w;
  const sy = from.y + from.h / 2;
  const middle = sx + (draft.x - sx) / 2;
  return `M ${sx},${sy} C ${middle},${sy} ${middle},${draft.y} ${draft.x},${draft.y}`;
};

/** A node's title, for what the live region says; its id when it has none. */
const titleIn = (root: HTMLElement | null, id: string) => {
  const nodes = root
    ? Array.from(root.querySelectorAll("[data-slot=canvas-node]"))
    : [];
  const node = nodes.find((item) => item.getAttribute("data-node-id") === id);
  const title = node?.querySelector("[data-slot=canvas-node-title]");
  return title?.textContent?.trim() || id;
};

/**
 * Nodes and edges sit at the canvas's inline-start top corner and are moved
 * into place by the view (`--canvas-x`, `--canvas-y`, `--canvas-zoom`), so
 * panning and zooming change three variables rather than each node's place.
 * In right-to-left text `--canvas-dir` is -1 and the whole flow mirrors.
 */
const PLACED =
  "absolute top-0 start-0 group-data-pending/canvas:invisible group-data-gliding/canvas:transition-[translate,scale] group-data-gliding/canvas:duration-250 group-data-gliding/canvas:ease-out motion-reduce:transition-none";

/** An edge's layer: one pixel at the corner, scaled (and mirrored) like the nodes. */
const EDGE_LAYER = cn(
  PLACED,
  "pointer-events-none z-0 size-px origin-top-left overflow-visible rtl:-start-px",
  "[scale:calc(var(--canvas-dir)*var(--canvas-zoom))_var(--canvas-zoom)] [translate:calc(var(--canvas-dir)*var(--canvas-x))_var(--canvas-y)]"
);

const EDGE_STROKE: Record<CanvasEdgeType, string> = {
  animated: "stroke-muted-foreground/60",
  default: "stroke-muted-foreground/60",
  temporary: "stroke-ring [stroke-dasharray:5_5]",
};

export interface CanvasProps
  extends Omit<ComponentProps<"div">, "defaultValue"> {
  /** The node selected at first, by id. */
  defaultValue?: string;
  /**
   * Scales and centers the view to show every node once they're measured.
   *
   * @default true
   */
  fitView?: boolean;
  /**
   * The room fitting leaves around the nodes, as a share of the view.
   *
   * @default 0.1
   */
  fitViewPadding?: number;
  /**
   * The most the view zooms in.
   *
   * @default 2
   */
  maxZoom?: number;
  /**
   * The most the view zooms out.
   *
   * @default 0.25
   */
  minZoom?: number;
  /**
   * Called when someone connects a node's output to another node's input,
   * by dragging between their handles or choosing both with the keyboard.
   * Add the edge to your list to keep it.
   */
  onConnect?: (connection: CanvasConnectionParams) => void;
  /** Called with the selected node's id, or `""` when the selection clears. */
  onValueChange?: (value: string) => void;
  /**
   * The wheel pans the view; pinch, or the wheel with Ctrl or ⌘, zooms.
   * Without it the wheel zooms around the pointer.
   *
   * @default false
   */
  panOnScroll?: boolean;
  /** The selected node's id (`""` for none), when you control it. */
  value?: string;
}

/**
 * The viewport of a node editor: nodes and edges are its children, panels
 * and controls float over it. Drag the background to pan, use the wheel or
 * a pinch to zoom around the pointer, and with the canvas focused, the
 * arrow keys pan, plus and minus zoom and 0 fits every node in view.
 * Escape clears the selection and stops a connection.
 */
export const Canvas = (props: CanvasProps) => {
  const {
    defaultValue = "",
    fitView = true,
    fitViewPadding = 0.1,
    maxZoom = 2,
    minZoom = 0.25,
    onConnect,
    onValueChange,
    panOnScroll = false,
    value,
    className,
    children,
    style,
    onKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    ...rest
  } = props;
  const root = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const nodeHelpId = useId();
  const [viewport, setViewport] = useState<CanvasViewport>({
    x: 0,
    y: 0,
    zoom: 1,
  });
  const [boxes, setBoxes] = useState<Record<string, CanvasBox>>({});
  const [own, setOwn] = useState(defaultValue);
  const [draft, setDraft] = useState(NO_DRAFT);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [gliding, setGliding] = useState(false);
  const [panning, setPanning] = useState(false);
  const [said, setSaid] = useState("");
  const pan = useRef(IDLE);
  const glideTimer = useRef(0);
  const selected = value ?? own;

  // Once every node has been measured, fit them in view, then show them.
  useEffect(() => {
    const node = root.current;
    const list = Object.values(boxes);
    const count = node
      ? node.querySelectorAll("[data-slot=canvas-node]").length
      : 0;
    if (
      ready ||
      !node ||
      list.length < count ||
      list.some((box) => box.w === 0)
    ) {
      return;
    }
    if (fitView) {
      setViewport(
        fitBoxes(list, node.clientWidth, node.clientHeight, fitViewPadding, {
          max: maxZoom,
          min: minZoom,
        })
      );
    }
    setReady(true);
  }, [boxes, ready, fitView, fitViewPadding, maxZoom, minZoom]);

  // The wheel zooms around the pointer (or pans); a listener of its own,
  // since React's wheel listener can't keep the page from scrolling.
  useEffect(() => {
    const node = root.current;
    if (!node) {
      return;
    }
    const wheel = (event: WheelEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      // Over what floats on the board, the wheel is the page's, or a
      // scrolling panel's.
      if (
        target?.closest("[data-slot=canvas-panel], [data-slot=canvas-controls]")
      ) {
        return;
      }
      event.preventDefault();
      const rtl = isRtl(node);
      if (panOnScroll && !event.ctrlKey && !event.metaKey) {
        setViewport((view) => ({
          x: view.x - (rtl ? -event.deltaX : event.deltaX),
          y: view.y - event.deltaY,
          zoom: view.zoom,
        }));
        return;
      }
      const at = pointIn(node, event.clientX, event.clientY);
      const lines = event.deltaMode === 1 ? 0.05 : 0.002;
      const delta =
        -event.deltaY *
        (event.deltaMode === 2 ? 1 : lines) *
        (event.ctrlKey ? 10 : 1);
      setViewport((view) =>
        zoomAround(
          view,
          clamp(view.zoom * 2 ** delta, minZoom, maxZoom),
          at.x,
          at.y
        )
      );
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [maxZoom, minZoom, panOnScroll]);

  useEffect(() => () => window.clearTimeout(glideTimer.current), []);

  const say = (message: string) => setSaid(message);

  const select = (id: string) => {
    if (id === selected) {
      return;
    }
    setOwn(id);
    onValueChange?.(id);
  };

  /** Lets the next change of view glide, for a moment (not with reduced motion: CSS drops it). */
  const glide = () => {
    window.clearTimeout(glideTimer.current);
    setGliding(true);
    glideTimer.current = window.setTimeout(() => setGliding(false), GLIDE);
  };

  const fit = () => {
    const node = root.current;
    if (!node) {
      return;
    }
    glide();
    setViewport(
      fitBoxes(
        Object.values(boxes),
        node.clientWidth,
        node.clientHeight,
        fitViewPadding,
        { max: maxZoom, min: minZoom }
      )
    );
  };

  const zoomBy = (factor: number) => {
    const node = root.current;
    if (!node) {
      return;
    }
    glide();
    setViewport((view) =>
      zoomAround(
        view,
        clamp(view.zoom * factor, minZoom, maxZoom),
        node.clientWidth / 2,
        node.clientHeight / 2
      )
    );
  };

  const connectNodes = (source: string, target: string) => {
    setDraft(NO_DRAFT);
    if (source === "" || source === target) {
      return;
    }
    onConnect?.({ source, target });
    say(
      `Connected ${titleIn(root.current, source)} to ${titleIn(root.current, target)}.`
    );
  };

  /** The lock stops a connection that waits for its input, as it stops new ones. */
  const lock = (next: boolean) => {
    if (next && draft.source !== "") {
      setDraft(NO_DRAFT);
      say("Connection cancelled.");
    }
    setLocked(next);
  };

  const startConnection = (source: string) => {
    if (draft.source === source) {
      setDraft(NO_DRAFT);
      say("Connection cancelled.");
      return;
    }
    setDraft({ pointer: false, source, x: 0, y: 0 });
    say(
      `Connecting from ${titleIn(root.current, source)}. Choose another node's input, or press Escape.`
    );
  };

  const drawTo = (source: string, clientX: number, clientY: number) => {
    const node = root.current;
    if (!node) {
      return;
    }
    const at = pointIn(node, clientX, clientY);
    setDraft({
      pointer: true,
      source,
      x: (at.x - viewport.x) / viewport.zoom,
      y: (at.y - viewport.y) / viewport.zoom,
    });
  };

  // A drop lands on a node with an input: on its handle or anywhere on it.
  const drop = (clientX: number, clientY: number) => {
    const hit = root.current?.ownerDocument.elementFromPoint(clientX, clientY);
    const node = hit?.closest("[data-slot=canvas-node]");
    const input = node?.querySelector(
      "[data-slot=canvas-handle][data-type=target]"
    );
    if (node && input) {
      connectNodes(draft.source, node.getAttribute("data-node-id") ?? "");
    } else {
      setDraft(NO_DRAFT);
    }
  };

  const place = (id: string, box: CanvasBox) => {
    setBoxes((last) => ({ ...last, [id]: box }));
  };

  const remove = (id: string) => {
    setBoxes((last) =>
      Object.fromEntries(Object.entries(last).filter(([key]) => key !== id))
    );
  };

  // A press on the background pans; one that doesn't move clears the selection.
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    pan.current = {
      id: event.pointerId,
      moved: false,
      pointerX: event.clientX,
      pointerY: event.clientY,
      rtl: isRtl(event.currentTarget),
      x: viewport.x,
      y: viewport.y,
    };
  };

  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    const start = pan.current;
    const dx = event.clientX - start.pointerX;
    const dy = event.clientY - start.pointerY;
    if (
      start.id !== event.pointerId ||
      (!start.moved && Math.hypot(dx, dy) < DEAD_ZONE)
    ) {
      return;
    }
    if (!start.moved) {
      pan.current = { ...start, moved: true };
      setPanning(true);
    }
    setViewport((view) => ({
      x: start.x + (start.rtl ? -dx : dx),
      y: start.y + dy,
      zoom: view.zoom,
    }));
  };

  const release = (event: PointerEvent<HTMLDivElement>) => {
    const start = pan.current;
    if (start.id !== event.pointerId) {
      return;
    }
    pan.current = IDLE;
    setPanning(false);
    if (!start.moved) {
      select("");
      if (draft.source !== "") {
        say("Connection cancelled.");
      }
      setDraft(NO_DRAFT);
    }
  };

  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    onPointerUp?.(event);
    release(event);
  };

  /** Escape clears the selection and stops a connection, when there's one. */
  const dismiss = (event: KeyboardEvent<HTMLDivElement>) => {
    if (draft.source === "" && selected === "") {
      return;
    }
    event.preventDefault();
    if (draft.source !== "") {
      say("Connection cancelled.");
    }
    setDraft(NO_DRAFT);
    select("");
  };

  /** Plus and minus zoom, 0 fits; arrows on the canvas itself pan. */
  const shortcut = (event: KeyboardEvent<HTMLDivElement>) => {
    const factor = ZOOM_KEYS[event.key] ?? 0;
    const arrow = ARROWS[event.key];
    if (factor !== 0) {
      event.preventDefault();
      zoomBy(factor);
    } else if (event.key === "0") {
      event.preventDefault();
      fit();
    } else if (arrow && event.target === event.currentTarget) {
      event.preventDefault();
      const sign = isRtl(event.currentTarget) ? 1 : -1;
      setViewport((view) => ({
        x: view.x + arrow.x * PAN_STEP * sign,
        y: view.y - arrow.y * PAN_STEP,
        zoom: view.zoom,
      }));
    }
  };

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }
    if (event.key === "Escape") {
      dismiss(event);
    } else if (!isField(event.target)) {
      shortcut(event);
    }
  };

  return (
    <CanvasContext.Provider
      value={{
        boxes,
        connect: (target: string) => connectNodes(draft.source, target),
        draft,
        drawTo,
        drop,
        fit,
        locked,
        maxZoom,
        minZoom,
        nodeHelpId,
        place,
        remove,
        say,
        select: (id: string) => {
          if (!locked) {
            select(id);
          }
        },
        selected,
        setLocked: lock,
        startConnection,
        zoom: viewport.zoom,
        zoomBy,
      }}
    >
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: an application region: it pans, zooms and hears its shortcuts. */}
      <div
        aria-describedby={helpId}
        aria-label="Canvas"
        aria-roledescription="canvas"
        className={cn(
          "group/canvas relative isolate size-full min-h-64 cursor-grab touch-none select-none overflow-hidden rounded-xl border bg-background text-foreground outline-none",
          "[--canvas-dir:1] [--canvas-dot:color-mix(in_oklab,var(--muted-foreground)_40%,transparent)] rtl:[--canvas-dir:-1]",
          "[background-image:radial-gradient(circle,var(--canvas-dot)_1px,transparent_1.5px)] [background-position:var(--canvas-x)_var(--canvas-y)] [background-size:var(--canvas-grid)_var(--canvas-grid)] rtl:[background-position:right_var(--canvas-x)_top_var(--canvas-y)]",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-panning:cursor-grabbing data-gliding:transition-[background-position,background-size] data-gliding:duration-250 motion-reduce:transition-none",
          className
        )}
        data-gliding={gliding ? "" : undefined}
        data-locked={locked ? "" : undefined}
        data-panning={panning ? "" : undefined}
        data-pending={ready ? undefined : ""}
        data-slot="canvas"
        onKeyDown={keyDown}
        onLostPointerCapture={release}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        ref={root}
        role="application"
        style={
          {
            "--canvas-grid": `${gridOf(viewport.zoom)}px`,
            "--canvas-x": `${viewport.x}px`,
            "--canvas-y": `${viewport.y}px`,
            "--canvas-zoom": `${viewport.zoom}`,
            ...style,
          } as CSSProperties
        }
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the canvas takes focus for its shortcuts (zoom, fit, pan).
        tabIndex={0}
        {...rest}
      >
        <p className="sr-only" id={helpId}>
          Drag the background or use the arrow keys to pan. Plus and minus zoom,
          0 fits every node in view.
        </p>
        <p className="sr-only" id={nodeHelpId}>
          Arrow keys move the node, Shift with an arrow moves it further. Enter
          selects it.
        </p>
        <p aria-live="polite" className="sr-only" role="status">
          {said}
        </p>
        {children}
      </div>
    </CanvasContext.Provider>
  );
};

export interface CanvasNodeProps
  extends Omit<ComponentProps<typeof Card>, "id"> {
  /**
   * Whether the node can be dragged and moved with the arrow keys.
   *
   * @default true
   */
  draggable?: boolean;
  /**
   * The node's handles: `target` (its input, on the inline start) takes
   * edges in, `source` (its output, on the inline end) sends them out.
   *
   * @default { source: true, target: true }
   */
  handles?: CanvasNodeHandles;
  /** The node's id, unique in its canvas: edges name it as `source` or `target`. */
  id: string;
  /** Called with the node's new place when a drag or a key moves it. */
  onPositionChange?: (position: CanvasPosition) => void;
  /** The node's place, when you control it: move it in `onPositionChange`. */
  position?: CanvasPosition;
  /**
   * Where the node starts, from the canvas's inline start, in canvas units.
   *
   * @default 0
   */
  x?: number;
  /**
   * Where the node starts, from the canvas's top, in canvas units.
   *
   * @default 0
   */
  y?: number;
}

/**
 * A node: a Card on the canvas, its handles on its sides. Drag it, or
 * focus it and use the arrow keys; a press selects it. It's a group named
 * by its title, or by its id when it has none.
 */
export const CanvasNode = (props: CanvasNodeProps) => {
  const {
    draggable = true,
    handles = BOTH,
    id,
    onPositionChange,
    position,
    x = 0,
    y = 0,
    className,
    children,
    ...rest
  } = props;
  const canvas = useContext(CanvasContext);
  const element = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [own, setOwn] = useState<CanvasPosition>({ x, y });
  const [measured, setMeasured] = useState({ h: 0, w: 0 });
  const [dragging, setDragging] = useState(false);
  const press = useRef(IDLE);
  const at = position ?? own;
  const selected = canvas.selected === id;
  const movable = draggable && !canvas.locked;

  // Its size, now and whenever its content changes it.
  useEffect(() => {
    const node = element.current;
    if (!node) {
      return;
    }
    const measure = () =>
      setMeasured({ h: node.offsetHeight, w: node.offsetWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Its box, for the edges and for fitting the view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the canvas's functions are new on each render; the box's own values are the trigger.
  useEffect(() => {
    canvas.place(id, { h: measured.h, w: measured.w, x: at.x, y: at.y });
  }, [id, at.x, at.y, measured.h, measured.w]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: removed once, when the node goes; the canvas's functions are new on each render.
  useEffect(() => () => canvas.remove(id), [id]);

  const title = () =>
    element.current
      ?.querySelector("[data-slot=canvas-node-title]")
      ?.textContent?.trim() || id;

  const moveTo = (next: CanvasPosition) => {
    setOwn(next);
    onPositionChange?.(next);
  };

  // A press selects it; once it moves past the dead zone, it drags.
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.button !== 0 || isControl(event.target)) {
      return;
    }
    canvas.select(id);
    if (!movable) {
      return;
    }
    press.current = {
      id: event.pointerId,
      moved: false,
      pointerX: event.clientX,
      pointerY: event.clientY,
      rtl: isRtl(event.currentTarget),
      x: at.x,
      y: at.y,
    };
  };

  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = press.current;
    const dx = event.clientX - start.pointerX;
    const dy = event.clientY - start.pointerY;
    if (
      start.id !== event.pointerId ||
      (!start.moved && Math.hypot(dx, dy) < DEAD_ZONE)
    ) {
      return;
    }
    if (!start.moved) {
      event.currentTarget.setPointerCapture(event.pointerId);
      press.current = { ...start, moved: true };
      setDragging(true);
    }
    moveTo({
      x: Math.round(start.x + (start.rtl ? -dx : dx) / canvas.zoom),
      y: Math.round(start.y + dy / canvas.zoom),
    });
  };

  const release = () => {
    const start = press.current;
    press.current = IDLE;
    if (start.moved) {
      setDragging(false);
      canvas.say(`${title()} moved to ${at.x}, ${at.y}.`);
    }
  };

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      canvas.select(selected ? "" : id);
      return;
    }
    const arrow = ARROWS[event.key];
    if (!(arrow && movable)) {
      return;
    }
    event.preventDefault();
    const step = event.shiftKey ? BIG_STEP : STEP;
    const sign = isRtl(event.currentTarget) ? -1 : 1;
    const next = {
      x: at.x + arrow.x * step * sign,
      y: at.y + arrow.y * step,
    };
    moveTo(next);
    canvas.say(`${title()} moved to ${next.x}, ${next.y}.`);
  };

  return (
    <CanvasNodeContext.Provider value={{ id, selected, titleId }}>
      {/* biome-ignore lint/a11y/useSemanticElements: a node is a card that holds headings and controls; a fieldset would bring a form's border and legend. */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: a node is dragged, selected and moved with the arrow keys. */}
      <div
        aria-describedby={canvas.nodeHelpId}
        // The title names it; with no title rendered, `aria-labelledby`
        // points at nothing and `aria-label` names it instead.
        aria-label={id}
        aria-labelledby={titleId}
        className={cn(
          PLACED,
          "group/canvas-node z-10 w-max origin-top-left cursor-default outline-none data-selected:z-20 rtl:origin-top-right",
          "[scale:var(--canvas-zoom)] [translate:calc(var(--canvas-dir)*(var(--canvas-x)_+_var(--canvas-node-x)*var(--canvas-zoom)))_calc(var(--canvas-y)_+_var(--canvas-node-y)*var(--canvas-zoom))]",
          "data-dragging:cursor-grabbing data-movable:cursor-grab"
        )}
        data-dragging={dragging ? "" : undefined}
        data-movable={movable ? "" : undefined}
        data-node-id={id}
        data-selected={selected ? "true" : undefined}
        data-slot="canvas-node"
        onKeyDown={keyDown}
        onLostPointerCapture={release}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={release}
        ref={element}
        role="group"
        style={
          {
            "--canvas-node-x": `${at.x}px`,
            "--canvas-node-y": `${at.y}px`,
          } as CSSProperties
        }
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a node takes focus, to be moved with the arrow keys and selected with Enter.
        tabIndex={0}
      >
        <Card
          className={cn(
            "w-sm gap-0 py-0 transition-shadow motion-reduce:transition-none",
            "group-focus-visible/canvas-node:outline-2 group-focus-visible/canvas-node:outline-ring group-focus-visible/canvas-node:outline-offset-2",
            "group-data-dragging/canvas-node:shadow-lg group-data-selected/canvas-node:ring-2 group-data-selected/canvas-node:ring-primary",
            className
          )}
          {...rest}
        >
          {children}
        </Card>
        {handles.target ? <CanvasHandle type="target" /> : null}
        {handles.source ? <CanvasHandle type="source" /> : null}
      </div>
    </CanvasNodeContext.Provider>
  );
};

/**
 * A node's handle: a button on its side. Drag from an output to another
 * node to connect them; or press an output, then another node's input.
 */
const CanvasHandle = (props: { type: "source" | "target" }) => {
  const canvas = useContext(CanvasContext);
  const node = useContext(CanvasNodeContext);
  const press = useRef(IDLE);
  const output = props.type === "source";
  const started = canvas.draft.source === node.id;
  const open = canvas.draft.source !== "" && !started;

  const pointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!output || event.button !== 0 || canvas.locked) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    press.current = {
      ...IDLE,
      id: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
  };

  const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = press.current;
    if (
      start.id !== event.pointerId ||
      (!start.moved &&
        Math.hypot(
          event.clientX - start.pointerX,
          event.clientY - start.pointerY
        ) < DEAD_ZONE)
    ) {
      return;
    }
    press.current = { ...start, moved: true };
    canvas.drawTo(node.id, event.clientX, event.clientY);
  };

  const pointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const start = press.current;
    press.current = { ...start, id: -1 };
    if (start.id === event.pointerId && start.moved) {
      canvas.drop(event.clientX, event.clientY);
    }
  };

  // The click a drag ends with does nothing; a plain press or a key starts
  // a connection from an output, or ends one at an input.
  const click = () => {
    if (press.current.moved) {
      press.current = IDLE;
      return;
    }
    if (output) {
      canvas.startConnection(node.id);
    } else if (open) {
      canvas.connect(node.id);
    }
  };

  return (
    <button
      aria-label={output ? "Connect from this node" : "Connect to this node"}
      aria-pressed={output ? started : undefined}
      className={cn(
        "absolute top-1/2 z-10 size-3 -translate-y-1/2 rounded-full border-2 border-background bg-muted-foreground outline-none transition-[background-color,box-shadow] motion-reduce:transition-none",
        "before:absolute before:-inset-2 before:content-[''] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-default",
        "aria-pressed:bg-primary data-waiting:bg-primary data-waiting:ring-4 data-waiting:ring-primary/25",
        output
          ? "end-0 translate-x-1/2 cursor-crosshair hover:bg-primary rtl:-translate-x-1/2"
          : "start-0 -translate-x-1/2 rtl:translate-x-1/2"
      )}
      data-slot="canvas-handle"
      data-type={props.type}
      data-waiting={open && !output ? "" : undefined}
      disabled={output ? canvas.locked : !open}
      onClick={click}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      type="button"
    />
  );
};

export const CanvasNodeHeader = (props: ComponentProps<typeof CardHeader>) => {
  const { className, ...rest } = props;

  return (
    <CardHeader
      className={cn(
        "gap-0.5 border-b bg-muted/50 py-(--card-spacing) has-data-[slot=canvas-node-action]:grid-cols-[1fr_auto] has-data-[slot=canvas-node-description]:grid-rows-[auto_auto]",
        className
      )}
      data-slot="canvas-node-header"
      {...rest}
    />
  );
};

/** The node's title: it names the node for assistive tech. */
export const CanvasNodeTitle = (props: ComponentProps<typeof CardTitle>) => {
  const { className, ...rest } = props;
  const node = useContext(CanvasNodeContext);

  return (
    <CardTitle
      className={cn("text-sm", className)}
      data-slot="canvas-node-title"
      id={node.titleId}
      {...rest}
    />
  );
};

export const CanvasNodeDescription = (
  props: ComponentProps<typeof CardDescription>
) => {
  const { className, ...rest } = props;

  return (
    <CardDescription
      className={cn("text-xs", className)}
      data-slot="canvas-node-description"
      {...rest}
    />
  );
};

export const CanvasNodeAction = (props: ComponentProps<typeof CardAction>) => {
  const { className, ...rest } = props;

  return (
    <CardAction
      className={className}
      data-slot="canvas-node-action"
      {...rest}
    />
  );
};

export const CanvasNodeContent = (
  props: ComponentProps<typeof CardContent>
) => {
  const { className, ...rest } = props;

  return (
    <CardContent
      className={cn("py-(--card-spacing)", className)}
      data-slot="canvas-node-content"
      {...rest}
    />
  );
};

export const CanvasNodeFooter = (props: ComponentProps<typeof CardFooter>) => {
  const { className, ...rest } = props;

  return (
    <CardFooter
      className={cn("text-xs", className)}
      data-slot="canvas-node-footer"
      {...rest}
    />
  );
};

export interface CanvasEdgeProps
  extends Omit<ComponentProps<"svg">, "children" | "type"> {
  /** The id of the node it starts from, at its output. */
  source: string;
  /** The id of the node it ends at, at its input. */
  target: string;
  /**
   * `animated` runs a dot along it, from source to target (it stops with
   * reduced motion); `temporary` dashes it, for a link not made yet.
   *
   * @default "default"
   */
  type?: CanvasEdgeType;
}

/** A curve from one node's output to another's input; it follows them as they move. */
export const CanvasEdge = (props: CanvasEdgeProps) => {
  const { source, target, type = "default", className, ...rest } = props;
  const canvas = useContext(CanvasContext);
  const from = canvas.boxes[source];
  const to = canvas.boxes[target];
  const path = from && to ? edgePath(from, to) : "";

  return (
    <svg
      aria-hidden="true"
      className={cn(EDGE_LAYER, className)}
      data-slot="canvas-edge"
      data-type={type}
      fill="none"
      {...rest}
    >
      {path ? (
        <path
          className={cn(
            "stroke-1 [vector-effect:non-scaling-stroke]",
            EDGE_STROKE[type]
          )}
          d={path}
          data-slot="canvas-edge-path"
        />
      ) : null}
      {path && type === "animated" ? (
        <path
          className="animate-canvas-edge-dot stroke-8 stroke-primary [stroke-dasharray:0_2] [stroke-linecap:round] motion-reduce:animate-none motion-reduce:[stroke-dashoffset:-0.5]"
          d={path}
          data-slot="canvas-edge-dot"
          pathLength={1}
        />
      ) : null}
    </svg>
  );
};

/** The line drawn while someone drags from a node's output, to the pointer. */
export const CanvasConnection = (
  props: Omit<ComponentProps<"svg">, "children">
) => {
  const { className, ...rest } = props;
  const canvas = useContext(CanvasContext);
  const from = canvas.boxes[canvas.draft.source];
  const path =
    from && canvas.draft.pointer ? draftPath(from, canvas.draft) : "";

  return (
    <svg
      aria-hidden="true"
      className={cn(EDGE_LAYER, "z-20", className)}
      data-slot="canvas-connection"
      fill="none"
      {...rest}
    >
      {path ? (
        <path
          className="stroke-1 stroke-ring [vector-effect:non-scaling-stroke]"
          d={path}
        />
      ) : null}
      {path ? (
        <circle
          className="fill-background stroke-1 stroke-ring"
          cx={canvas.draft.x}
          cy={canvas.draft.y}
          r={3}
        />
      ) : null}
    </svg>
  );
};

const PANEL_POSITION: Record<CanvasPanelPosition, string> = {
  "bottom-center": "inset-x-0 bottom-0 mx-auto mb-3 w-fit",
  "bottom-end": "end-0 bottom-0 m-3",
  "bottom-start": "start-0 bottom-0 m-3",
  "top-center": "inset-x-0 top-0 mx-auto mt-3 w-fit",
  "top-end": "end-0 top-0 m-3",
  "top-start": "start-0 top-0 m-3",
};

export interface CanvasPanelProps extends ComponentProps<"div"> {
  /**
   * Where it sits over the canvas.
   *
   * @default "top-start"
   */
  position?: CanvasPanelPosition;
}

/**
 * A card fixed over the canvas, in a corner or centered on an edge: it
 * stays put while the view pans and zooms, and presses on it never reach
 * the canvas.
 */
export const CanvasPanel = (props: CanvasPanelProps) => {
  const { position = "top-start", className, onPointerDown, ...rest } = props;

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    event.stopPropagation();
  };

  return (
    <div
      className={cn(
        "absolute z-30 cursor-auto overflow-hidden rounded-lg border bg-card p-1 text-card-foreground shadow-xs",
        PANEL_POSITION[position],
        className
      )}
      data-position={position}
      data-slot="canvas-panel"
      onPointerDown={pointerDown}
      {...rest}
    />
  );
};

export interface CanvasControlsProps extends ComponentProps<"div"> {
  /**
   * Which way the buttons run.
   *
   * @default "vertical"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Where they sit over the canvas.
   *
   * @default "bottom-start"
   */
  position?: CanvasPanelPosition;
  /**
   * Shows the fit view button.
   *
   * @default true
   */
  showFitView?: boolean;
  /**
   * Shows the lock button, which stops nodes from being moved, selected or
   * connected (the view still pans and zooms).
   *
   * @default true
   */
  showInteractive?: boolean;
  /**
   * Shows the zoom in and zoom out buttons.
   *
   * @default true
   */
  showZoom?: boolean;
}

/** Zoom in, zoom out, fit view and lock, as ghost Buttons on a panel; add your own as children. */
export const CanvasControls = (props: CanvasControlsProps) => {
  const {
    orientation = "vertical",
    position = "bottom-start",
    showFitView = true,
    showInteractive = true,
    showZoom = true,
    className,
    children,
    onPointerDown,
    ...rest
  } = props;
  const canvas = useContext(CanvasContext);

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    event.stopPropagation();
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a row of buttons, not a form's fieldset with its border and padding.
    <div
      aria-label="Canvas controls"
      className={cn(
        "absolute z-30 flex cursor-auto gap-px rounded-lg border bg-card p-1 text-card-foreground shadow-xs data-[orientation=vertical]:flex-col",
        PANEL_POSITION[position],
        className
      )}
      data-orientation={orientation}
      data-position={position}
      data-slot="canvas-controls"
      onPointerDown={pointerDown}
      role="group"
      {...rest}
    >
      {showZoom ? (
        <Button
          aria-label="Zoom in"
          disabled={canvas.zoom >= canvas.maxZoom - 0.001}
          onClick={() => canvas.zoomBy(ZOOM_STEP)}
          size="icon-sm"
          variant="ghost"
        >
          <PlusIcon aria-hidden="true" />
        </Button>
      ) : null}
      {showZoom ? (
        <Button
          aria-label="Zoom out"
          disabled={canvas.zoom <= canvas.minZoom + 0.001}
          onClick={() => canvas.zoomBy(1 / ZOOM_STEP)}
          size="icon-sm"
          variant="ghost"
        >
          <MinusIcon aria-hidden="true" />
        </Button>
      ) : null}
      {showFitView ? (
        <Button
          aria-label="Fit view"
          onClick={() => canvas.fit()}
          size="icon-sm"
          variant="ghost"
        >
          <MaximizeIcon aria-hidden="true" />
        </Button>
      ) : null}
      {showInteractive ? (
        <Button
          aria-label="Lock"
          aria-pressed={canvas.locked}
          onClick={() => canvas.setLocked(!canvas.locked)}
          size="icon-sm"
          variant="ghost"
        >
          {canvas.locked ? (
            <LockIcon aria-hidden="true" />
          ) : (
            <LockOpenIcon aria-hidden="true" />
          )}
        </Button>
      ) : null}
      {children}
    </div>
  );
};

export interface CanvasToolbarProps extends ComponentProps<"div"> {
  /** Shows it whether or not its node is selected (`false` hides it). */
  isVisible?: boolean;
  /**
   * Which side of its node it floats on.
   *
   * @default "bottom"
   */
  position?: "bottom" | "top";
}

/**
 * Actions for one node, floating under it (or over it) while the node is
 * selected. Put it inside the node; it keeps its size at any zoom.
 */
export const CanvasToolbar = (props: CanvasToolbarProps) => {
  const { isVisible, position = "bottom", className, ...rest } = props;
  const node = useContext(CanvasNodeContext);
  const shown = isVisible ?? node.selected;

  return (
    // biome-ignore lint/a11y/useSemanticElements: a row of buttons, not a form's fieldset with its border and padding.
    <div
      aria-label="Node actions"
      className={cn(
        "absolute inset-x-0 z-30 mx-auto flex w-max cursor-auto items-center gap-1 rounded-md border bg-background p-1 text-foreground shadow-sm [scale:calc(1/var(--canvas-zoom,1))] data-[state=closed]:hidden",
        position === "top"
          ? "bottom-full mb-2 origin-bottom"
          : "top-full mt-2 origin-top",
        className
      )}
      data-position={position}
      data-slot="canvas-toolbar"
      data-state={shown ? "open" : "closed"}
      role="group"
      {...rest}
    />
  );
};
