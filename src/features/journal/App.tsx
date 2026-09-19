import { useEffect, useRef, useState } from 'react';
import { Button } from '@vita/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vita/ui/card';
import { Badge } from '@vita/ui/badge';
import { Input } from '@vita/ui/input';
import { Icons } from '@vita/ui/icons';
import { Tabs, TabsList, TabsTab, TabsPanel } from '@vita/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@vita/ui/table';
import { Choice } from './controls';
import { Dialogs, type Modal } from './dialogs';
import { useJournal, errorText } from './journal-context';
import { useViewport } from './use-viewport';
import {
  useNativeNavigation,
  type JournalPage,
  type NativeHeaderAction,
} from './use-native-navigation';
import { TypeCover, TypeGlyph } from './type-appearance-editor';
import { FeedingTimerBanner } from './feeding-timer';
import { BoardCalendar } from './board-calendar';
import {
  formatDate,
  formatTime,
  newRecord,
  pendingTasks,
  summary,
  todayRecords,
  type Action,
  type BoardCard,
  type JournalRecord,
} from './model';

type Page = JournalPage;
const views: { id: Page; title: string; description: string }[] = [
  {
    id: 'today',
    title: '今天',
    description: '生活里的每件小事，都有地方安放。',
  },
  { id: 'board', title: '我的看板', description: '把正在关注的事，放在一起。' },
  { id: 'library', title: '记录库', description: '不同的记录，同一份生活。' },
  {
    id: 'types',
    title: '记录类型',
    description: '用字段组装，按自己的方式记录。',
  },
];
export default function App() {
  useViewport();
  const { state, busy, save, notify, demo } = useJournal();
  const [page, setPage] = useState<Page>(() => {
    const view = new URLSearchParams(location.search).get('view');
    return views.find((item) => item.id === view)?.id || 'today';
  });
  const [modal, setModal] = useState<Modal | null>(null);
  const [nativeSearch, setNativeSearch] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const [boardView, setBoardView] = useState(() =>
    new URLSearchParams(location.search).get('boardView') === 'calendar' ? 'calendar' : 'cards',
  );
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all');
  function navigate(next: Page) {
    setPage(next);
    setNativeSearch(false);
    setFilter('all');
    setQuery('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function headerAction(action: NativeHeaderAction) {
    if (action === 'search') {
      navigate('library');
      setNativeSearch(true);
    } else if (action === 'create') {
      setModal(page === 'types' ? { kind: 'type' } : { kind: 'record' });
    } else {
      setModal({ kind: action });
    }
  }
  const nativeNavigation = useNativeNavigation(page, navigate, modal !== null, headerAction);
  useEffect(() => {
    if (nativeSearch) searchInput.current?.focus();
  }, [nativeSearch]);
  const pending = pendingTasks(state),
    today = todayRecords(state);
  const current = views.find((view) => view.id === page)!;
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set('view', page);
    if (page === 'board' && boardView === 'calendar')
      url.searchParams.set('boardView', 'calendar');
    else url.searchParams.delete('boardView');
    history.replaceState(null, '', url);
  }, [page, boardView]);
  async function act(action: Action, message?: string) {
    try {
      await save(action);
      if (message) notify(message);
    } catch (cause) {
      notify(errorText(cause));
    }
  }
  const records = (compact = false) => (
    <RecordList
      records={state.records}
      compact={compact}
      query={compact ? '' : query}
      filter={compact ? 'all' : filter}
      onOpen={(record) => setModal({ kind: 'detail', recordId: record.id })}
    />
  );
  const tasks = (
    <Card>
      <CardHeader>
        <CardTitle>
          接下来 <span className="ml-2 text-muted-foreground">{pending.length}</span>
        </CardTitle>
        <CardAction>
          <Button size="sm" variant="ghost" onClick={() => setModal({ kind: 'plan' })}>
            <Icons.repeat />
            循环计划
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {pending.map((task) => (
            <article key={task.id} className="journal-task">
              <time className="text-sm tabular-nums">
                <strong>{formatTime(task.due)}</strong>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {formatDate(task.due)}
                </span>
              </time>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {state.types.find((type) => type.id === task.typeId)?.name}
                  </Badge>
                  {task.planId && (
                    <span className="text-xs text-muted-foreground">
                      {state.plan.paused ? '循环已暂停' : `每 ${state.plan.interval} 小时`}
                    </span>
                  )}
                </div>
                <h3 className="break-words font-medium">{task.title}</h3>
                <p className="break-words text-sm text-muted-foreground">{task.note}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setModal({
                      kind: 'record',
                      taskId: task.id,
                      typeId: task.typeId,
                    })
                  }
                >
                  {task.typeId === 'event' ? '查看安排' : '完成并记录'}
                  <Icons.arrowRight />
                </Button>
              </div>
              <Button
                size="icon"
                variant="outline"
                aria-label={`处理${task.title}`}
                onClick={() =>
                  setModal({
                    kind: 'record',
                    taskId: task.id,
                    typeId: task.typeId,
                  })
                }
              >
                <Icons.check />
              </Button>
            </article>
          ))}
        </div>
        {!pending.length && <Empty text="事情都处理好了，给自己留一点时间。" />}
      </CardContent>
    </Card>
  );
  const water = (
    <Card className="pt-0">
      <TypeCover
        type={{ ...state.types.find((type) => type.id === 'water')!, name: '饮水记录' }}
        description="今天"
      />
      <CardContent className="space-y-5">
        <div>
          <strong className="text-5xl font-medium tabular-nums">
            {today
              .filter((record) => record.typeId === 'water')
              .reduce((sum, record) => sum + Number(record.values.amount || 0), 0)}
          </strong>
          <span className="ml-2 text-sm text-muted-foreground">ml</span>
        </div>
        <Button
          className="w-full"
          variant="secondary"
          disabled={busy}
          onClick={() =>
            void act(
              {
                kind: 'record',
                record: newRecord('water', { amount: 250 }, '喝了一杯水'),
              },
              '已记录 250 ml 饮水',
            )
          }
        >
          <Icons.plus />
          250 ml
        </Button>
      </CardContent>
    </Card>
  );
  const capture = (
    <Card>
      <CardHeader>
        <CardTitle>图片速记</CardTitle>
        <CardDescription>票据变成待办，照片留下记录。</CardDescription>
        <CardAction>
          <Icons.scanLine className="size-5 text-primary" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => setModal({ kind: 'capture' })}
        >
          <Icons.image />
          上传图片 / 拍照
        </Button>
      </CardContent>
    </Card>
  );
  return (
    <div
      className="journal-shell"
      data-native-navigation={nativeNavigation.active || undefined}
      data-native-header={nativeNavigation.headerActive || undefined}
      data-native-search={nativeSearch || undefined}
    >
      <a href="#journal-main" className="journal-skip">
        跳到主要内容
      </a>
      <aside className="journal-sidebar">
        <div className="flex items-center gap-3 px-3 py-5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Icons.bookOpen className="size-6" />
          </span>
          <div>
            <strong className="text-lg">日日记</strong>
            <p className="text-xs text-muted-foreground">DAILY, BY YOU</p>
          </div>
        </div>
        <nav aria-label="主要导航" className="journal-nav">
          {views.map((view) => (
            <Button
              key={view.id}
              variant={page === view.id ? 'secondary' : 'ghost'}
              className="justify-start"
              aria-current={page === view.id ? 'page' : undefined}
              onClick={() => navigate(view.id)}
            >
              {view.id === 'today' ? (
                <Icons.sun />
              ) : view.id === 'board' ? (
                <Icons.layoutGrid />
              ) : view.id === 'library' ? (
                <Icons.book />
              ) : (
                <Icons.layers />
              )}
              {view.title}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => setModal({ kind: 'plan' })}
          >
            <Icons.repeat />
            循环计划
          </Button>
        </nav>
        <div className="journal-collections">
          <div className="mb-3 mt-8 flex items-center justify-between px-3 text-xs text-muted-foreground">
            我的记录
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="新建记录类型"
              onClick={() => setModal({ kind: 'type' })}
            >
              <Icons.plus />
            </Button>
          </div>
          {state.types.map((type) => (
            <Button
              key={type.id}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setPage('library');
                setFilter(type.id);
                setQuery('');
              }}
            >
              <TypeGlyph type={type} />
              <span className="min-w-0 flex-1 truncate text-left">{type.name}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {state.records.filter((record) => record.typeId === type.id).length}
              </span>
            </Button>
          ))}
        </div>
        <div className="mt-auto px-3 pt-8 text-xs leading-6 text-muted-foreground">
          <p>数据保存在此设备</p>
          <p>{demo ? 'DDS Example · 含示例数据' : '日日记 · 记录你的生活'}</p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="journal-topbar">
          <span className="hidden text-sm text-muted-foreground lg:block">
            我的空间 / {current.title}
          </span>
          <div className="ml-auto w-full max-w-xs">
            <label htmlFor="journal-search" className="sr-only">
              搜索记录
            </label>
            <Input
              ref={searchInput}
              id="journal-search"
              type="search"
              placeholder="搜索生活里的记录"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage('library');
              }}
            />
          </div>
          {nativeSearch && (
            <Button
              className="journal-search-close"
              variant="ghost"
              onClick={() => {
                setNativeSearch(false);
                setQuery('');
                searchInput.current?.blur();
              }}
            >
              取消搜索
            </Button>
          )}
          <Button
            className="journal-header-action"
            variant="outline"
            aria-label="图片速记"
            onClick={() => setModal({ kind: 'capture' })}
          >
            <Icons.scanLine />
            <span className="hidden sm:inline">图片速记</span>
          </Button>
          <Button
            className="journal-header-action"
            size="icon"
            variant="ghost"
            aria-label="提醒与安排"
            onClick={() => setModal({ kind: 'reminders' })}
          >
            <Icons.bell />
          </Button>
        </header>
        <main id="journal-main" className="journal-main">
          <div className="journal-heading">
            <div>
              <p className="mb-3 text-xs text-muted-foreground">
                {new Date().toLocaleDateString('zh-CN', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">{current.title}</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {page === 'today'
                  ? `${pending.length} 件待办，${today.length} 条记录。`
                  : current.description}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() =>
                setModal(page === 'types' ? { kind: 'type' } : { kind: 'record' })
              }
            >
              <Icons.plus />
              {page === 'types' ? '新建类型' : '记一笔'}
            </Button>
          </div>
          <FeedingTimerBanner onOpen={() => setModal({ kind: 'record', typeId: 'feeding' })} />
          <Tabs
            value={page}
            onValueChange={(value) => setPage(value as Page)}
            className="gap-0"
          >
            {page !== 'types' && (
              <TabsList aria-label="记录视图" className="journal-view-tabs mb-6">
                <TabsTab value="today">今天</TabsTab>
                <TabsTab value="board">看板</TabsTab>
                <TabsTab value="library">记录库</TabsTab>
              </TabsList>
            )}
            {page === 'today' && (
              <TabsPanel value="today" className="journal-today">
                <div className="space-y-6">
                  {tasks}
                  <Card>
                    <CardHeader>
                      <CardTitle>最近留下的</CardTitle>
                      <CardAction>
                        <Button size="sm" variant="ghost" onClick={() => setPage('library')}>
                          全部记录
                          <Icons.arrowRight />
                        </Button>
                      </CardAction>
                    </CardHeader>
                    <CardContent>{records(true)}</CardContent>
                  </Card>
                </div>
                <aside className="space-y-6">
                  <Counter onAction={act} />
                  {water}
                  {capture}
                </aside>
              </TabsPanel>
            )}
            {page === 'board' && (
              <TabsPanel value="board">
                <Tabs value={boardView} onValueChange={(value) => setBoardView(String(value))}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <TabsList aria-label="看板视图">
                      <TabsTab value="cards">卡片</TabsTab>
                      <TabsTab value="calendar">日历</TabsTab>
                    </TabsList>
                    {boardView === 'cards' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setModal({ kind: 'board' })}
                      >
                        <Icons.settings2 />
                        管理卡片
                      </Button>
                    )}
                  </div>
                  <TabsPanel value="calendar">
                    <BoardCalendar
                      onOpenRecord={(record) =>
                        setModal({ kind: 'detail', recordId: record.id })
                      }
                      onOpenTask={(task) =>
                        setModal({ kind: 'record', taskId: task.id, typeId: task.typeId })
                      }
                    />
                  </TabsPanel>
                  <TabsPanel value="cards">
                    <div className="journal-board">
                      {!state.hiddenCards.includes('tasks') && (
                        <div className="journal-board-tasks">{tasks}</div>
                      )}
                      {!state.hiddenCards.includes('counter') && <Counter onAction={act} />}
                      {!state.hiddenCards.includes('water') && water}
                      {!state.hiddenCards.includes('capture') && capture}
                      {state.cards.map((card) => (
                        <MetricCard
                          key={card.id}
                          card={card}
                          onRecord={() => setModal({ kind: 'record', typeId: card.typeId })}
                        />
                      ))}
                      {!state.hiddenCards.includes('recent') && (
                        <Card className="journal-board-recent">
                          <CardHeader>
                            <CardTitle>最近记录</CardTitle>
                          </CardHeader>
                          <CardContent>{records(true)}</CardContent>
                        </Card>
                      )}
                      <Button
                        variant="outline"
                        className="min-h-32 border-dashed"
                        onClick={() => setModal({ kind: 'board' })}
                      >
                        <Icons.plus />
                        添加记录卡片
                      </Button>
                    </div>
                  </TabsPanel>
                </Tabs>
              </TabsPanel>
            )}
            {page === 'library' && (
              <TabsPanel value="library">
                <Card>
                  <CardHeader>
                    <CardTitle>{state.records.length} 条生活记录</CardTitle>
                    <CardDescription>图片、文字、声音，都在这里。</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6 max-w-xs">
                      <Choice
                        label="记录类型"
                        value={filter}
                        options={[
                          { value: 'all', label: '全部类型' },
                          ...state.types.map((type) => ({
                            value: type.id,
                            label: type.name,
                          })),
                        ]}
                        onChange={setFilter}
                      />
                    </div>
                    {records()}
                  </CardContent>
                </Card>
              </TabsPanel>
            )}
          </Tabs>
          {page === 'types' && (
            <div className="journal-type-grid">
              {state.types.map((type) => (
                <Card key={type.id} className="pt-0">
                  <TypeCover
                    type={type}
                    description={`${type.fields.length} 个字段 · ${state.records.filter((record) => record.typeId === type.id).length} 条记录`}
                  />
                  <CardContent className="space-y-5">
                    <div className="flex flex-wrap gap-2">
                      {type.fields.map((field) => (
                        <Badge key={field.id} variant="secondary">
                          {field.name}
                          {field.required ? ' *' : ''}
                          {field.unit ? ` · ${field.unit}` : ''}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setModal({ kind: 'record', typeId: type.id })}
                      >
                        使用这个类型 <Icons.arrowRight />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`编辑${type.name}外观`}
                        onClick={() => setModal({ kind: 'appearance', typeId: type.id })}
                      >
                        <Icons.palette /> 编辑外观
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
      <Dialogs modal={modal} onClose={() => setModal(null)} />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;
}
function Counter({
  onAction,
}: {
  onAction: (action: Action, message?: string) => Promise<void>;
}) {
  const { state, busy } = useJournal();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!state.session) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.session?.start]);
  const seconds = state.session
    ? Math.max(0, Math.floor((now - state.session.start) / 1000))
    : 0;
  return (
    <Card className="pt-0">
      <TypeCover
        type={{ ...state.types.find((type) => type.id === 'movement')!, name: '胎动计数' }}
        description={state.session ? '本次正在记录' : '随时开始一段记录'}
      />
      <CardContent className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <strong className="text-5xl font-medium tabular-nums">
              {String(state.session?.events.length || 0).padStart(2, '0')}
            </strong>
            <span className="ml-2 text-sm text-muted-foreground">次</span>
          </div>
          <time className="tabular-nums text-muted-foreground">
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:
            {String(seconds % 60).padStart(2, '0')}
          </time>
        </div>
        <Button
          variant="primary"
          className="w-full"
          disabled={busy}
          onClick={() =>
            void onAction({
              kind: 'session',
              operation: state.session ? 'count' : 'start',
            })
          }
        >
          {state.session ? <Icons.plus /> : <Icons.timer />}
          {state.session ? '记一次胎动' : '开始本次计数'}
        </Button>
        {state.session && (
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy || !state.session.events.length}
              onClick={() => void onAction({ kind: 'session', operation: 'undo' })}
            >
              撤销一次
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                void onAction({ kind: 'session', operation: 'finish' }, '本次计数已保存')
              }
            >
              结束并保存
            </Button>
          </div>
        )}
        <p className="text-xs leading-6 text-muted-foreground">
          每次点击，都留下一次时间记录。
        </p>
      </CardContent>
    </Card>
  );
}
function MetricCard({ card, onRecord }: { card: BoardCard; onRecord: () => void }) {
  const { state } = useJournal();
  const type = state.types.find((type) => type.id === card.typeId)!;
  const field = type.fields.find((field) => field.id === card.fieldId);
  const records = todayRecords(state).filter((record) => record.typeId === card.typeId);
  const value = field
    ? records.reduce((sum, record) => sum + Number(record.values[field.id] || 0), 0)
    : records.length;
  return (
    <Card className="pt-0">
      <TypeCover
        type={type}
        description={`今日${field ? `${field.name}合计` : '记录条数'}`}
      />
      <CardContent className="space-y-5">
        <div>
          <strong className="text-5xl font-medium tabular-nums">{value}</strong>
          <span className="ml-2 text-sm text-muted-foreground">{field?.unit || '条'}</span>
        </div>
        <Button variant="outline" className="w-full" onClick={onRecord}>
          <Icons.plus />
          记录{type.name}
        </Button>
      </CardContent>
    </Card>
  );
}
function RecordList({
  records,
  compact,
  query,
  filter,
  onOpen,
}: {
  records: JournalRecord[];
  compact: boolean;
  query: string;
  filter: string;
  onOpen: (record: JournalRecord) => void;
}) {
  const { state } = useJournal();
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [query, filter]);
  const filtered = records.filter(
    (record) =>
      (filter === 'all' || record.typeId === filter) &&
      `${record.title} ${Object.values(record.values).join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10)),
    current = Math.min(page, pages - 1);
  const visible = compact
    ? filtered.slice(0, 4)
    : filtered.slice(current * 10, current * 10 + 10);
  if (!visible.length)
    return (
      <Empty
        text={query ? '没有找到匹配记录，试试别的关键词。' : '还没有记录，从第一笔开始。'}
      />
    );
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>记录</TableHead>
            <TableHead className="hidden md:table-cell">类型</TableHead>
            <TableHead className="text-right">时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="max-w-0 whitespace-normal">
                <Button
                  className="h-auto min-h-11 w-full min-w-0 justify-start whitespace-normal px-0 py-2 text-left"
                  variant="ghost"
                  onClick={() => onOpen(record)}
                >
                  <TypeGlyph type={state.types.find((type) => type.id === record.typeId)} />
                  <span className="min-w-0">
                    <span className="line-clamp-2 break-words text-sm">{record.title}</span>
                    <span className="mt-1 line-clamp-1 break-all text-xs font-normal text-muted-foreground">
                      {summary(
                        record,
                        state.types.find((type) => type.id === record.typeId),
                      ) || '图片与附件记录'}
                    </span>
                  </span>
                </Button>
              </TableCell>
              <TableCell className="hidden w-24 text-xs text-muted-foreground md:table-cell">
                {state.types.find((type) => type.id === record.typeId)?.name}
              </TableCell>
              <TableCell className="w-20 text-right text-xs tabular-nums text-muted-foreground">
                {formatDate(record.occurredAt)}
                <br />
                {formatTime(record.occurredAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!compact && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {filtered.length} 条 · {current + 1} / {pages} 页
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              上一页
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={current === pages - 1}
              onClick={() => setPage(current + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
