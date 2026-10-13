import { useState, type RefObject } from 'react';
import { Button } from '@vita/ui/button';
import { WidgetBoard, type WidgetDefinition, type WidgetItem } from '@vita/ui/widget-board';
import { useApp } from '../hooks/useApp';
import { useI18n } from '../i18n/useI18n';
import { typeName } from '../i18n/record-labels';
import { Icon } from '../components/common/Icon';
import { nightStatus } from './night-status';
import { NightStatusMetric, NightStatusNotes } from './NightStatus';
import { defaultWidgetLayout, normalizeWidgetLayout, widgetLayoutKey } from './widget-layout';

export function QuickRecordWidgets({ child, now, night, editing, highlighted, onHighlight, onPick, grid }: {
  child?: string; now: Date; night: boolean; editing: boolean; highlighted?: string;
  onHighlight: (id: string) => void; onPick: (id: string) => void;
  grid: RefObject<HTMLDivElement | null>;
}) {
  const a = useApp();
  const { tr, locale } = useI18n();
  const defaults = defaultWidgetLayout(a.types.map((type) => type.id));
  const [storageError, setStorageError] = useState(false);
  const [layout, setLayout] = useState<WidgetItem[]>(() => {
    try {
      const saved = localStorage.getItem(widgetLayoutKey);
      return saved ? normalizeWidgetLayout(JSON.parse(saved), defaults) : defaults;
    } catch { return defaults; }
  });
  const items = normalizeWidgetLayout(layout, defaults);
  const status = nightStatus(a.records, a.session, child ?? '', now);
  function update(next: WidgetItem[]) {
    setLayout(next);
    try { localStorage.setItem(widgetLayoutKey, JSON.stringify(next)); setStorageError(false); }
    catch { setStorageError(true); }
  }
  const definitions: WidgetDefinition[] = [
    { id: 'clock', title: tr('Time'), sizes: ['small', 'medium', 'large'], render: () =>
      <div className="quick-recorder-clock">
        <time dateTime={now.toISOString()}>{now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}</time>
        <p>{now.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div> },
    { id: 'sleep', title: tr('Sleep timer'), sizes: ['small', 'medium', 'large'], render: (size) =>
      <NightStatusMetric metric={status.sleep} kind="sleep" detailed={size !== 'small'} /> },
    { id: 'feeding', title: tr('Since last recorded feeding'), sizes: ['small', 'medium', 'large'], render: (size) =>
      <NightStatusMetric metric={status.feed} kind="feed" detailed={size !== 'small'} /> },
    ...a.types.map((type, index): WidgetDefinition => ({
      id: `record:${type.id}`, title: typeName(type, tr), sizes: ['small', 'medium', 'large'], render: (size) =>
        <Button unstyled className="quick-record-widget-action" data-record-type={type.id}
          disabled={!child || editing}
          aria-current={highlighted === type.id ? 'true' : undefined}
          tabIndex={highlighted === type.id || !items.some((item) => item.id === `record:${highlighted}`) ? 0 : -1}
          onFocus={() => onHighlight(type.id)} onClick={() => onPick(type.id)}>
          <Icon name={type.icon} /><span>{typeName(type, tr)}</span>
          {index < 9 && <kbd>{index + 1}</kbd>}
          {size !== 'small' && <small>{tr('Open the form to record details')}</small>}
        </Button>,
    })),
  ];
  return <>
    {night && child && !editing && <div className="night-edge-glow" data-signal={status.signal} aria-hidden="true" />}
    {storageError && <p role="alert">{tr('Could not save the layout. Changes will last until this window closes.')}</p>}
    {items.length === 0 && <p className="quick-recorder-help">{tr('No widgets yet. Use Edit widgets to add one.')}</p>}
    <section aria-label={tr('Choose a record type')}>
      <div ref={grid} onKeyDown={(event) => {
        if (editing || event.defaultPrevented || event.nativeEvent.isComposing || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey ||
          !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        const buttons = Array.from(grid.current?.querySelectorAll<HTMLButtonElement>('button[data-record-type]') ?? []);
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        if (index < 0) return;
        event.preventDefault();
        const rects = buttons.map((button) => button.getBoundingClientRect());
        if (rects[index].width > 0) {
          const origin = rects[index];
          const x = origin.left + origin.width / 2, y = origin.top + origin.height / 2;
          const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown';
          const direction = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1;
          const candidates = rects.map((rect, candidate) => {
            const dx = rect.left + rect.width / 2 - x, dy = rect.top + rect.height / 2 - y;
            return { candidate, along: (vertical ? dy : dx) * direction, across: Math.abs(vertical ? dx : dy) };
          }).filter((item) => item.along > 1).sort((a, b) => (a.along + a.across * 2) - (b.along + b.across * 2));
          if (candidates[0]) buttons[candidates[0].candidate].focus();
          return;
        }
        const nextRow = buttons.findIndex((button) => button.offsetTop > buttons[0].offsetTop);
        const columns = nextRow > 0 ? nextRow : buttons.length;
        let next = index;
        if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
        if (event.key === 'ArrowRight') next = Math.min(buttons.length - 1, index + 1);
        if (event.key === 'ArrowUp' && index >= columns) next = index - columns;
        if (event.key === 'ArrowDown' && Math.floor(index / columns) < Math.floor((buttons.length - 1) / columns)) next = Math.min(buttons.length - 1, index + columns);
        buttons[next]?.focus();
      }}>
        <WidgetBoard definitions={definitions} items={items} editing={editing} onChange={update} labels={{
          move: (name) => tr('Drag {name}', { name }),
          remove: (name) => tr('Remove {name}', { name }),
          options: (name) => tr('Options for {name}', { name }), resize: tr('Widget size'),
          canDrop: tr('Release to place here'), cannotDrop: tr('Cannot place here'),
          sizes: { small: tr('Small'), medium: tr('Medium'), large: tr('Large') },
        }} />
      </div>
    </section>
    {editing && <section className="quick-widget-library" aria-label={tr('Add widgets')}>
      <p>{tr('Drag the top handle to reorder. With the handle focused, press Space, use arrow keys, then Space to drop or Esc to cancel. Changes are saved on this device.')}</p>
      <div>
        {definitions.filter((definition) => !items.some((item) => item.id === definition.id)).map((definition) =>
          <Button key={definition.id} variant="outline" onClick={() => update([...items, defaults.find((item) => item.id === definition.id)!])}>
            {tr('Add {name}', { name: definition.title })}
          </Button>)}
        <Button variant="ghost" onClick={() => update(defaults)}>{tr('Restore default layout')}</Button>
      </div>
    </section>}
    {!editing && <div className="quick-widget-help"><p>{tr('Press 1–9 to choose a record type')}</p><p>{tr('Arrow keys to select · Enter to open')}</p></div>}
    {child && !editing && <NightStatusNotes />}
  </>;
}
