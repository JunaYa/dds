import { useEffect, useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@vita/ui/dialog';
import { Button } from '@vita/ui/button';
import { Input } from '@vita/ui/input';
import { Switch } from '@vita/ui/switch';
import { Checkbox } from '@vita/ui/checkbox';
import { Icons } from '@vita/ui/icons';
import { Alert, AlertDescription } from '@vita/ui/alert';
import { Label } from '@vita/ui/label';
import { useJournal, errorText } from './journal-context';
import {
  Choice,
  FormField,
  RecordFields,
  FormError,
  SubmitFooter,
  pendingFile,
} from './controls';
import {
  formatDate,
  formatTime,
  localDateTime,
  newRecord,
  pendingTasks,
  uid,
  type Attachment,
  type JournalRecord,
  type RecordField,
} from './model';
import { type PendingFile } from './storage';
import { PhotoCapture } from './photo-capture';
import { FileDownload } from './file-download';
import { TypeAppearanceEditor, TypeCover } from './type-appearance-editor';
import type { TypeAppearance } from './type-appearance';

export type Modal =
  | { kind: 'capture' | 'type' | 'plan' | 'board' | 'reminders' }
  | { kind: 'record'; typeId?: string; taskId?: string }
  | { kind: 'appearance'; typeId: string }
  | { kind: 'detail'; recordId: string };
const titles = {
  capture: '图片速记',
  type: '组装一种记录',
  appearance: '编辑类型外观',
  plan: '循环计划',
  board: '管理看板卡片',
  reminders: '提醒与安排',
  record: '记下这一刻',
  detail: '记录详情',
};
export function Dialogs({ modal, onClose }: { modal: Modal | null; onClose: () => void }) {
  const { busy } = useJournal();
  return (
    <Dialog
      open={!!modal}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogPopup
        className={`journal-dialog ${modal?.kind === 'capture' || modal?.kind === 'type' ? 'max-w-4xl' : 'max-w-xl'}`}
        closeLabel="关闭弹窗"
        closeProps={{ disabled: busy }}
      >
        <DialogHeader>
          <DialogTitle>{modal ? titles[modal.kind] : '日日记'}</DialogTitle>
          <DialogDescription>
            {modal?.kind === 'capture'
              ? '从一张图片开始，确认后创建事件或保存记录。'
              : '按自己的方式，把生活记录下来。'}
          </DialogDescription>
        </DialogHeader>
        {modal?.kind === 'record' && (
          <RecordForm
            key={`${modal.typeId}-${modal.taskId}`}
            modal={modal}
            onClose={onClose}
          />
        )}
        {modal?.kind === 'capture' && <PhotoCapture onClose={onClose} />}
        {modal?.kind === 'type' && <TypeForm onClose={onClose} />}
        {modal?.kind === 'appearance' && (
          <AppearanceForm key={modal.typeId} typeId={modal.typeId} onClose={onClose} />
        )}
        {modal?.kind === 'plan' && <PlanForm onClose={onClose} />}
        {modal?.kind === 'board' && <BoardForm onClose={onClose} />}
        {modal?.kind === 'reminders' && <Reminders />}
        {modal?.kind === 'detail' && <RecordDetail recordId={modal.recordId} />}
      </DialogPopup>
    </Dialog>
  );
}

function RecordForm({
  modal,
  onClose,
}: {
  modal: Extract<Modal, { kind: 'record' }>;
  onClose: () => void;
}) {
  const { state, save, busy, notify } = useJournal();
  const task = state.tasks.find((task) => task.id === modal.taskId);
  const source = state.records.find((record) => record.id === task?.sourceRecordId);
  const [typeId, setTypeId] = useState(modal.typeId || 'note');
  const [title, setTitle] = useState(task?.title || '');
  const [occurredAt, setOccurredAt] = useState(localDateTime());
  const [values, setValues] = useState<JournalRecord['values']>(source?.values || {});
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>(source?.attachments || []);
  const [error, setError] = useState('');
  const type = state.types.find((type) => type.id === typeId)!;
  const attachmentFields = type.fields.filter((field) => field.kind === 'attachment');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const record = {
        ...newRecord(
          typeId,
          values,
          title.trim() || `${type.name}记录`,
          new Date(occurredAt),
        ),
        attachments: [...attachments, ...files.map((file) => file.attachment)],
      };
      await save({ kind: 'record', record, completeTaskId: task?.id }, files);
      notify(task ? '已完成，并留下本次记录' : '记录已保存');
      onClose();
    } catch (cause) {
      setError(errorText(cause));
    }
  }
  function attach(list: FileList | null, fieldId?: string) {
    try {
      setFiles((previous) => [
        ...previous,
        ...Array.from(list || []).map((file) => pendingFile(file, fieldId)),
      ]);
      setError('');
    } catch (cause) {
      setError(errorText(cause));
    }
  }
  return (
    <form className="journal-dialog-form" onSubmit={submit}>
      <DialogPanel>
        <fieldset disabled={busy} className="space-y-5">
          {task && (
            <Alert>
              <AlertDescription>
                {formatDate(task.due)} {formatTime(task.due)} · {task.note}
              </AlertDescription>
            </Alert>
          )}
          {!task && (
            <Choice
              label="记录类型"
              value={typeId}
              options={state.types.map((type) => ({
                value: type.id,
                label: type.name,
              }))}
              onChange={(id) => {
                setTypeId(id);
                setValues({});
                setFiles([]);
                setAttachments([]);
              }}
            />
          )}
          <FormField label="标题（可选）" htmlFor="record-title">
            <Input
              id="record-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              placeholder="给这次记录起个名字"
            />
          </FormField>
          <FormField label="发生时间" htmlFor="record-time">
            <Input
              id="record-time"
              nativeInput
              type="datetime-local"
              required
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </FormField>
          <RecordFields type={type} values={values} onChange={setValues} />
          {(attachmentFields.length
            ? attachmentFields
            : [{ id: undefined, name: '补充附件', required: false }]
          ).map((field) => (
            <FormField
              key={field.id || 'extra'}
              label={`${field.name}${field.required ? ' *' : ''}`}
              htmlFor={`record-file-${field.id}`}
            >
              <Input
                nativeInput
                id={`record-file-${field.id}`}
                type="file"
                multiple
                onChange={(event) => {
                  attach(event.target.files, field.id);
                  event.target.value = '';
                }}
              />
              <p className="text-xs text-muted-foreground">
                图片、视频、音频或文件，单个不超过 20 MB。
              </p>
            </FormField>
          ))}
          {[...attachments, ...files.map((file) => file.attachment)].map((file) => (
            <div className="flex items-center justify-between gap-3" key={file.id}>
              <span className="min-w-0 break-all text-sm">{file.name}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`移除${file.name}`}
                onClick={() => {
                  setAttachments((list) => list.filter((item) => item.id !== file.id));
                  setFiles((list) => list.filter((item) => item.attachment.id !== file.id));
                }}
              >
                <Icons.close />
              </Button>
            </div>
          ))}
          <FormError message={error} />
        </fieldset>
      </DialogPanel>
      <SubmitFooter label={task ? '完成并保存记录' : '保存记录'} />
    </form>
  );
}

function TypeForm({ onClose }: { onClose: () => void }) {
  const { save, busy, notify } = useJournal();
  const [name, setName] = useState(''),
    [error, setError] = useState('');
  const [appearance, setAppearance] = useState<TypeAppearance>();
  const [processing, setProcessing] = useState(false);
  const [fields, setFields] = useState<RecordField[]>([
    { id: uid(), name: '内容', kind: 'text', required: true },
  ]);
  function update(id: string, patch: Partial<RecordField>) {
    setFields(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  }
  const kinds = {
    text: '文本',
    longtext: '长文本',
    number: '数值',
    date: '日期',
    choice: '选项',
    attachment: '附件',
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (processing) return;
    try {
      await save({
        kind: 'type',
        type: {
          id: uid(),
          name: name.trim(),
          appearance,
          fields: fields.map((field) => ({
            ...field,
            name: field.name.trim(),
          })),
        },
      });
      notify(`已创建「${name}」`);
      onClose();
    } catch (cause) {
      setError(errorText(cause));
    }
  }
  return (
    <form className="journal-dialog-form" onSubmit={submit}>
      <DialogPanel>
        <fieldset disabled={busy} className="journal-builder">
          <div className="space-y-5">
            <FormField label="类型名称" htmlFor="type-name">
              <Input
                id="type-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={40}
                placeholder="例如：植物养护"
              />
            </FormField>
            <TypeAppearanceEditor
              typeId=""
              value={appearance}
              onChange={setAppearance}
              onProcessingChange={setProcessing}
            />
            {fields.map((field, index) => (
              <div className="space-y-4 rounded-xl border p-4" key={field.id}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">字段 {index + 1}</span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`移除字段 ${index + 1}`}
                    disabled={fields.length === 1}
                    onClick={() => setFields(fields.filter((item) => item.id !== field.id))}
                  >
                    <Icons.trash />
                  </Button>
                </div>
                <FormField label="字段名称" htmlFor={`field-name-${field.id}`}>
                  <Input
                    id={`field-name-${field.id}`}
                    value={field.name}
                    onChange={(event) => update(field.id, { name: event.target.value })}
                    required
                  />
                </FormField>
                <Choice
                  label="字段类型"
                  value={field.kind}
                  options={Object.entries(kinds).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  onChange={(kind) => update(field.id, { kind: kind as RecordField['kind'] })}
                />
                {field.kind === 'number' && (
                  <FormField label="单位（可选）" htmlFor={`unit-${field.id}`}>
                    <Input
                      id={`unit-${field.id}`}
                      value={field.unit || ''}
                      onChange={(event) => update(field.id, { unit: event.target.value })}
                      placeholder="ml、次、分钟"
                    />
                  </FormField>
                )}
                {field.kind === 'choice' && (
                  <FormField label="选项（用逗号分隔）" htmlFor={`options-${field.id}`}>
                    <Input
                      id={`options-${field.id}`}
                      value={field.options?.join('，') || ''}
                      onChange={(event) =>
                        update(field.id, {
                          options: event.target.value.split(/[,，]/),
                        })
                      }
                      required
                    />
                  </FormField>
                )}
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`required-${field.id}`}
                    checked={!!field.required}
                    onCheckedChange={(required) => update(field.id, { required })}
                  />
                  <Label htmlFor={`required-${field.id}`}>必填</Label>
                </div>
              </div>
            ))}
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setFields([...fields, { id: uid(), name: '', kind: 'text' }])}
            >
              <Icons.plus />
              添加字段
            </Button>
            <FormError message={error} />
          </div>
          <aside className="h-fit space-y-5 rounded-xl bg-muted p-5">
            <p className="text-xs text-muted-foreground">表单预览</p>
            <TypeCover type={{ id: '', name: name || '你的记录类型', appearance }} />
            {fields.map((field) => (
              <div className="space-y-2" key={field.id}>
                <p className="text-sm">
                  {field.name || '未命名字段'}
                  {field.required ? ' *' : ''}
                </p>
                <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
                  {kinds[field.kind]}
                  {field.unit ? ` · ${field.unit}` : ''}
                </div>
              </div>
            ))}
          </aside>
        </fieldset>
      </DialogPanel>
      <SubmitFooter
        label="创建记录类型"
        hint="字段组成类型，类型定义你的记录"
        disabled={processing}
      />
    </form>
  );
}

function AppearanceForm({ typeId, onClose }: { typeId: string; onClose: () => void }) {
  const { state, save, busy, notify } = useJournal();
  const type = state.types.find((type) => type.id === typeId)!;
  const [appearance, setAppearance] = useState(type.appearance);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (processing) return;
    setError('');
    try {
      await save({ kind: 'typeAppearance', typeId, appearance });
      notify(`已更新「${type.name}」的外观`);
      onClose();
    } catch (cause) {
      setError(errorText(cause));
    }
  }
  return (
    <form className="journal-dialog-form" onSubmit={submit}>
      <DialogPanel>
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          <TypeCover type={{ ...type, appearance }} description="外观预览" />
          <TypeAppearanceEditor
            typeId={typeId}
            value={appearance}
            onChange={setAppearance}
            onProcessingChange={setProcessing}
          />
          <FormError message={error} />
        </fieldset>
      </DialogPanel>
      <SubmitFooter
        label="保存外观"
        hint="应用到此类型，已有记录一同更新"
        disabled={processing}
      />
    </form>
  );
}
function PlanForm({ onClose }: { onClose: () => void }) {
  const { state, save, busy, notify } = useJournal();
  const [plan, setPlan] = useState(state.plan),
    [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await save({ kind: 'plan', plan });
      notify('循环规则已更新，适用于下一次安排');
      onClose();
    } catch (cause) {
      setError(errorText(cause));
    }
  }
  return (
    <form className="journal-dialog-form" onSubmit={submit}>
      <DialogPanel>
        <fieldset className="space-y-5" disabled={busy}>
          <Alert>
            <AlertDescription>
              事件 A · 当前任务完成时生成下一次安排，提醒在应用内展示。
            </AlertDescription>
          </Alert>
          <FormField label="间隔（小时）" htmlFor="plan-interval">
            <Input
              nativeInput
              id="plan-interval"
              type="number"
              min={1}
              max={24}
              step={1}
              required
              value={plan.interval}
              onChange={(event) => setPlan({ ...plan, interval: Number(event.target.value) })}
            />
          </FormField>
          <Choice
            label="循环方式"
            value={plan.mode}
            options={[
              { value: 'fixed', label: '按原定时间循环' },
              { value: 'completion', label: '从完成时间开始计算' },
            ]}
            onChange={(mode) => setPlan({ ...plan, mode: mode as 'fixed' | 'completion' })}
          />
          <p className="text-sm text-muted-foreground">错过的时段会跳过，不集中补发。</p>
          <div className="flex items-center justify-between">
            <Label htmlFor="plan-paused">暂停循环</Label>
            <Switch
              id="plan-paused"
              checked={plan.paused}
              onCheckedChange={(paused) => setPlan({ ...plan, paused })}
            />
          </div>
          <FormError message={error} />
        </fieldset>
      </DialogPanel>
      <SubmitFooter label="保存计划" />
    </form>
  );
}
function BoardForm({ onClose }: { onClose: () => void }) {
  const { state, save, busy, notify } = useJournal();
  const [hidden, setHidden] = useState(state.hiddenCards),
    [cards, setCards] = useState(state.cards);
  const [typeId, setTypeId] = useState('note'),
    [fieldId, setFieldId] = useState(''),
    [error, setError] = useState('');
  const type = state.types.find((type) => type.id === typeId)!;
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await save({ kind: 'board', hiddenCards: hidden, cards });
      notify('看板已更新');
      onClose();
    } catch (cause) {
      setError(errorText(cause));
    }
  }
  return (
    <form className="journal-dialog-form" onSubmit={submit}>
      <DialogPanel>
        <fieldset disabled={busy} className="space-y-5">
          {Object.entries({
            tasks: '待办与安排',
            counter: '胎动计数',
            water: '饮水记录',
            capture: '图片速记',
            recent: '最近记录',
          }).map(([id, name]) => (
            <div className="flex items-center justify-between" key={id}>
              <Label htmlFor={`card-${id}`}>{name}</Label>
              <Switch
                id={`card-${id}`}
                checked={!hidden.includes(id)}
                onCheckedChange={(checked) =>
                  setHidden(checked ? hidden.filter((key) => key !== id) : [...hidden, id])
                }
              />
            </div>
          ))}
          <div className="space-y-4 border-t pt-5">
            <h3 className="font-medium">从记录类型添加卡片</h3>
            <Choice
              label="记录类型"
              value={typeId}
              options={state.types.map((type) => ({
                value: type.id,
                label: type.name,
              }))}
              onChange={(value) => {
                setTypeId(value);
                setFieldId('');
              }}
            />
            <Choice
              label="统计内容"
              value={fieldId}
              options={[
                { value: '', label: '今日记录条数' },
                ...type.fields
                  .filter((field) => field.kind === 'number')
                  .map((field) => ({
                    value: field.id,
                    label: `今日${field.name}合计`,
                  })),
              ]}
              onChange={setFieldId}
            />
            <Button
              variant="outline"
              onClick={() => {
                if (
                  cards.some(
                    (card) => card.typeId === typeId && (card.fieldId || '') === fieldId,
                  )
                ) {
                  setError('这张统计卡片已经添加');
                  return;
                }
                setCards([...cards, { id: uid(), typeId, fieldId: fieldId || undefined }]);
                setError('');
              }}
            >
              <Icons.plus />
              添加卡片
            </Button>
            {cards.map((card) => (
              <div className="flex items-center justify-between gap-3" key={card.id}>
                <span className="text-sm">
                  {state.types.find((type) => type.id === card.typeId)?.name} ·{' '}
                  {card.fieldId ? '数值合计' : '记录条数'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCards(cards.filter((item) => item.id !== card.id))}
                >
                  移除
                </Button>
              </div>
            ))}
          </div>
          <FormError message={error} />
        </fieldset>
      </DialogPanel>
      <SubmitFooter label="保存看板" hint="隐藏卡片会保留所有记录" />
    </form>
  );
}
function Reminders() {
  const { state, save, busy } = useJournal();
  const [error, setError] = useState('');
  return (
    <DialogPanel>
      <div className="space-y-5">
        <Alert>
          <AlertDescription>以下为应用内安排，不发送系统通知。</AlertDescription>
        </Alert>
        {pendingTasks(state).map((task) => (
          <div
            className="flex items-center justify-between gap-3 border-b pb-4"
            key={task.id}
          >
            <div className="min-w-0">
              <h3 className="break-words font-medium">{task.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatDate(task.remindAt || task.due)}{' '}
                {formatTime(task.remindAt || task.due)}
                {task.reminderDisabled ? ' · 不提醒' : ''}
              </p>
            </div>
            {!task.reminderDisabled && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void save({ kind: 'postpone', taskId: task.id }).catch((cause) =>
                    setError(errorText(cause)),
                  )
                }
              >
                推迟 15 分钟
              </Button>
            )}
          </div>
        ))}
        {!pendingTasks(state).length && (
          <p className="text-sm text-muted-foreground">暂时没有安排。</p>
        )}
        <FormError message={error} />
      </div>
    </DialogPanel>
  );
}
function RecordDetail({ recordId }: { recordId: string }) {
  const { state } = useJournal();
  const record = state.records.find((record) => record.id === recordId)!;
  const type = state.types.find((type) => type.id === record.typeId)!;
  return (
    <DialogPanel>
      <div className="space-y-5">
        <TypeCover type={type} />
        <h3 className="break-words text-xl font-medium">{record.title}</h3>
        <p className="text-sm text-muted-foreground">
          {formatDate(record.occurredAt)} {formatTime(record.occurredAt)} · {type.name}
        </p>
        {record.eventAt && (
          <Alert>
            <AlertDescription>
              事件时间：{formatDate(record.eventAt)} {formatTime(record.eventAt)}
            </AlertDescription>
          </Alert>
        )}
        <dl className="space-y-4">
          {type.fields
            .filter((field) => field.kind !== 'attachment')
            .map((field) => (
              <div key={field.id}>
                <dt className="mb-1 text-xs text-muted-foreground">{field.name}</dt>
                <dd className="whitespace-pre-wrap break-words text-sm">
                  {record.values[field.id] || record.values[field.id] === 0
                    ? `${record.values[field.id]} ${field.unit || ''}`
                    : '未填写'}
                </dd>
              </div>
            ))}
        </dl>
        {record.source && (
          <p className="text-xs text-muted-foreground">来源：{record.source}</p>
        )}
        {record.ocrText && (
          <details>
            <summary className="cursor-pointer text-sm">图片识别原文</summary>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {record.ocrText}
            </p>
          </details>
        )}
        {record.events && (
          <div>
            <p className="mb-3 text-sm">每次计数的时间</p>
            <div className="flex flex-wrap gap-2">
              {record.events.map((time, index) => (
                <span className="rounded-lg bg-muted p-2 text-xs" key={index}>
                  {index + 1} · {formatTime(time)}
                </span>
              ))}
            </div>
          </div>
        )}
        {record.attachments.map((attachment) => (
          <AttachmentPreview key={attachment.id} attachment={attachment} />
        ))}
      </div>
    </DialogPanel>
  );
}
function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const { readAttachment } = useJournal();
  const [url, setURL] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true,
      objectURL = '';
    void readAttachment(attachment.id)
      .then((blob) => {
        if (active) {
          objectURL = URL.createObjectURL(blob);
          setURL(objectURL);
        }
      })
      .catch((cause) => {
        if (active) setError(errorText(cause));
      });
    return () => {
      active = false;
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [attachment.id, readAttachment]);
  if (error) return <FormError message={error} />;
  if (!url)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        正在加载附件…
      </p>
    );
  return (
    <div className="space-y-3">
      {attachment.mime.startsWith('image/') ? (
        <img
          className="max-h-96 w-full rounded-lg object-contain"
          src={url}
          alt={attachment.name}
        />
      ) : attachment.mime.startsWith('video/') ? (
        <video className="max-h-96 w-full" src={url} controls playsInline />
      ) : attachment.mime.startsWith('audio/') ? (
        <audio className="w-full" src={url} controls />
      ) : null}
      <FileDownload
        className="flex items-center gap-2 break-all text-sm text-primary underline underline-offset-4"
        url={url}
        name={attachment.name}
        read={() => readAttachment(attachment.id)}
      >
        <Icons.download className="size-4 shrink-0" />
        {attachment.name}
      </FileDownload>
    </div>
  );
}
