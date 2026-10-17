import { useCallback, useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { useReducedMotion } from 'motion/react';
import { Button } from '../button/button';
import { IconRenderer } from '../icons/icons';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuItem } from '../dropdown-menu/dropdown-menu';
import { gridColumns, widgetCellPx, widgetGridStyle } from './widget-grid-geometry';
import { positionWidgets, moveWidgetTo, overlaps, type PositionedWidget } from './positions';
import { widgetSpan, widgetGridGapPx } from './widget-grid-geometry';
export { positionWidgets } from './positions';
import './widget-board.css';

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetItem = { id: string; size: WidgetSize; col?: number; row?: number };
export type WidgetDefinition = { id: string; title: string; sizes: WidgetSize[]; render: (size: WidgetSize) => ReactNode };
export type WidgetBoardLabels = { move: (title: string) => string; remove: (title: string) => string; removeText: string; options: (title: string) => string; resize: string; canDrop: string; canSwap: string; cannotDrop: string; sizes: Record<WidgetSize, string> };

export function moveWidget(items: WidgetItem[], from: string, to: string) {
  const start = items.findIndex((item) => item.id === from), end = items.findIndex((item) => item.id === to);
  if (start < 0 || end < 0 || start === end) return items;
  const next = [...items];
  next.splice(end, 0, ...next.splice(start, 1));
  return next;
}

function Tile({ item, definition, editing, labels, onRemove, onResize, canResize }: {
  item: PositionedWidget; definition: WidgetDefinition; editing: boolean; labels: WidgetBoardLabels; onRemove: (id: string) => void; onResize: (size: WidgetSize) => void; canResize: (size: WidgetSize) => boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: item.id, disabled: !editing });
  const [menuOpen, setMenuOpen] = useState(false);
  const removalFocus = useRef<HTMLElement | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const attach = useCallback((node: HTMLElement | null) => { setNodeRef(node); setContainer(node); }, [setNodeRef]);
  return <section ref={attach} className="vita-widget-card" data-widget-id={item.id} data-size={item.size}
    onContextMenu={editing ? (event) => { event.preventDefault(); setMenuOpen(true); } : undefined}
    data-dragging={isDragging || undefined} aria-label={definition.title}
    style={{ gridColumn: `${item.col + 1} / span var(--widget-span)`, gridRow: `${item.row + 1} / span ${widgetSpan(item.size).rows}` }}>
    <div className="vita-widget-surface">
      <div className="vita-widget-body">{definition.render(item.size)}</div>
    </div>
    {editing && <>
      <Button unstyled ref={setActivatorNodeRef} className="vita-widget-drag" {...attributes} {...listeners} aria-label={labels.move(definition.title)}><span aria-hidden="true" /></Button>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger render={<Button unstyled className="vita-widget-options" />} aria-label={labels.options(definition.title)}><IconRenderer name="ellipsis" className="vita-widget-options-icon" /></DropdownMenuTrigger>
        <DropdownMenuContent finalFocus={() => removalFocus.current ?? true} align="end" portalProps={{ container }} positionerClassName="vita-widget-menu-positioner" className="vita-widget-menu">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{labels.resize}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={item.size} onValueChange={(value) => {
              const size = definition.sizes.find((size) => size === value);
              if (size && canResize(size)) onResize(size);
            }}>
              {definition.sizes.map((size) => <DropdownMenuRadioItem closeOnClick key={size} value={size} disabled={!canResize(size)} aria-label={labels.sizes[size]}>
                <span className="vita-widget-size-option"><span className="vita-widget-size-code" aria-hidden="true">{{ small: 'S', medium: 'M', large: 'L' }[size]}</span>{labels.sizes[size]}</span>
              </DropdownMenuRadioItem>)}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem aria-label={labels.remove(definition.title)} variant="destructive" onClick={() => {
            const sibling = container?.nextElementSibling ?? container?.previousElementSibling;
            const target = sibling?.querySelector<HTMLButtonElement>('.vita-widget-drag');
            removalFocus.current = target ?? container?.parentElement ?? null;
            requestAnimationFrame(() => removalFocus.current?.focus({ preventScroll: true }));
            onRemove(item.id);
          }}><IconRenderer name="remove" aria-hidden="true" />{labels.removeText}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>}
  </section>;
}

export function WidgetBoard({ items, definitions, editing, onChange, labels }: {
  items: WidgetItem[]; definitions: WidgetDefinition[]; editing: boolean; onChange: (items: WidgetItem[]) => void; labels: WidgetBoardLabels;
}) {
  const board = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<{ id: string; width: number; height: number } | null>(null);
  const [delta, setDelta] = useState({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const node = board.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const columns = gridColumns(width);
  const cell = columns > 1 ? widgetCellPx(width, columns) : 160;
  const positioned = positionWidgets(items, columns);
  const step = cell + widgetGridGapPx();
  const rows = Math.max(1, ...positioned.map((item) => item.row + widgetSpan(item.size).rows)) + (editing ? 2 : 0);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: (event, { currentCoordinates }) => {
      const offsets: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const offset = offsets[event.code];
      if (offset) { event.preventDefault(); return { x: currentCoordinates.x + offset[0], y: currentCoordinates.y + offset[1] }; }
    } }));
  const activeItem = positioned.find((item) => item.id === active?.id);
  const activeDefinition = definitions.find((definition) => definition.id === active?.id);
  const destination = activeItem ? {
    col: activeItem.col + Math.round(delta.x / step),
    row: activeItem.row + Math.round(delta.y / step),
  } : null;
  const canDrop = !!activeItem && !!destination && moveWidgetTo(positioned, activeItem.id, destination.col, destination.row, columns) !== positioned;
  const swapTarget = canDrop && destination && positioned.find((item) => item.id !== activeItem?.id && item.col === destination.col && item.row === destination.row);
  const dropMessage = canDrop ? swapTarget ? labels.canSwap : labels.canDrop : labels.cannotDrop;
  return <DndContext sensors={sensors} modifiers={[restrictToParentElement]}
    onDragStart={({ active }) => {
      setDelta({ x: 0, y: 0 });
      const node = Array.from(board.current?.querySelectorAll<HTMLElement>('[data-widget-id]') ?? [])
        .find((node) => node.dataset.widgetId === String(active.id));
      const rect = active.rect.current.initial ?? node?.getBoundingClientRect();
      if (rect) setActive({ id: String(active.id), width: rect.width, height: rect.height });
    }} onDragMove={({ delta }) => setDelta(delta)} onDragCancel={() => setActive(null)} onDragEnd={({ active, delta }) => {
      setActive(null);
      const item = positioned.find((entry) => entry.id === active.id);
      if (item) onChange(moveWidgetTo(positioned, item.id, item.col + Math.round(delta.x / step), item.row + Math.round(delta.y / step), columns));
    }}>

      <div ref={board} tabIndex={-1} className="vita-widget-board" data-editing={editing || undefined} data-columns={columns}
        style={{ ...widgetGridStyle({ columns, gridWidth: width }), gridTemplateRows: `repeat(${rows}, var(--home-cell))` }}>
        {positioned.map((item) => {
          const definition = definitions.find((entry) => entry.id === item.id);
          return definition && <Tile key={item.id} item={item} definition={definition} editing={editing} labels={labels}
            onRemove={(id) => onChange(positioned.filter((entry) => entry.id !== id))}
            canResize={(size) => item.col + Math.min(widgetSpan(size).cols, columns) <= columns && !positioned.some((other) => other.id !== item.id && overlaps({ ...item, size }, other, columns))}
            onResize={(size) => onChange(positioned.map((entry) => entry.id === item.id ? { ...entry, size } : entry))} />;
        })}
        {activeItem && destination && <div className="vita-widget-drop-target" data-valid={canDrop} aria-hidden="true"
          style={{ left: destination.col * step, top: destination.row * step, width: active?.width, height: active?.height }} />}
      </div>
      {active && <span role="status" className="sr-only">{dropMessage}</span>}

    <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
      {active && activeItem && activeDefinition && <div aria-hidden="true" inert className="vita-widget-card vita-widget-overlay" data-valid={canDrop} style={{ width: active.width, height: active.height } as CSSProperties}>
        <div className="vita-widget-surface"><div className="vita-widget-body">{activeDefinition.render(activeItem.size)}</div></div>
        <span className="vita-widget-drop-label">{swapTarget ? '⇄' : canDrop ? '✓' : '×'} {dropMessage}</span>
      </div>}
    </DragOverlay>
  </DndContext>;
}
