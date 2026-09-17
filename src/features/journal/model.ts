import { z } from 'zod';
import { appearanceSchema, type TypeAppearance } from './type-appearance';

const fieldSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  kind: z.enum(['text', 'longtext', 'number', 'date', 'datetime', 'choice', 'attachment']),
  required: z.boolean().optional(),
  unit: z.string().optional(),
  options: z.array(z.string()).optional(),
});
const typeSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  fields: z.array(fieldSchema).min(1),
  appearance: appearanceSchema.optional(),
});
const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  mime: z.string(),
  size: z.number(),
  fieldId: z.string().optional(),
});
const recordSchema = z.object({
  id: z.string(),
  typeId: z.string(),
  title: z.string(),
  occurredAt: z.string(),
  values: z.record(z.string(), z.union([z.string(), z.number()])),
  attachments: z.array(attachmentSchema),
  source: z.string().optional(),
  ocrText: z.string().optional(),
  eventAt: z.string().optional(),
  events: z.array(z.number()).optional(),
});
const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  typeId: z.string(),
  due: z.string(),
  status: z.enum(['pending', 'done']),
  note: z.string(),
  sourceRecordId: z.string().optional(),
  planId: z.string().optional(),
  remindAt: z.string().optional(),
  reminderDisabled: z.boolean().optional(),
});
const planSchema = z.object({
  interval: z.number().int().min(1).max(24),
  mode: z.enum(['fixed', 'completion']),
  paused: z.boolean(),
});
const boardCardSchema = z.object({
  id: z.string(),
  typeId: z.string(),
  fieldId: z.string().optional(),
});
export const stateSchema = z.object({
  version: z.literal(1),
  types: z.array(typeSchema),
  records: z.array(recordSchema),
  tasks: z.array(taskSchema),
  plan: planSchema,
  session: z.object({ start: z.number(), events: z.array(z.number()) }).nullable(),
  hiddenCards: z.array(z.string()),
  cards: z.array(boardCardSchema),
});
export type RecordField = z.infer<typeof fieldSchema>;
export type RecordType = z.infer<typeof typeSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type JournalRecord = z.infer<typeof recordSchema>;
export type JournalTask = z.infer<typeof taskSchema>;
export type Plan = z.infer<typeof planSchema>;
export type JournalState = z.infer<typeof stateSchema>;
export type BoardCard = z.infer<typeof boardCardSchema>;
export type Action =
  | {
      kind: 'record';
      record: JournalRecord;
      completeTaskId?: string;
      event?: { due: string; reminder: number | null };
    }
  | { kind: 'type'; type: RecordType }
  | { kind: 'typeAppearance'; typeId: string; appearance?: TypeAppearance }
  | { kind: 'plan'; plan: Plan }
  | { kind: 'session'; operation: 'start' | 'count' | 'undo' | 'finish' }
  | { kind: 'board'; hiddenCards: string[]; cards: BoardCard[] }
  | { kind: 'postpone'; taskId: string };

export const uid = () => crypto.randomUUID();
export const localDateTime = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
export const formatTime = (date: string | number) =>
  new Date(date).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
export const formatDate = (date: string | number) =>
  new Date(date).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });
export const todayRecords = (state: JournalState, now = new Date()) =>
  state.records.filter(
    (record) =>
      localDateTime(new Date(record.occurredAt)).slice(0, 10) ===
      localDateTime(now).slice(0, 10),
  );
export const pendingTasks = (state: JournalState) =>
  state.tasks
    .filter((task) => task.status === 'pending')
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due));
export function formatFieldValue(field: RecordField, value: string | number) {
  if (field.kind === 'datetime')
    return new Date(String(value)).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  return `${value}${field.unit ? ` ${field.unit}` : ''}`;
}
export const summary = (record: JournalRecord, type?: RecordType) =>
  type?.fields
    .filter(
      (field) =>
        field.kind !== 'attachment' &&
        record.values[field.id] !== undefined &&
        record.values[field.id] !== '',
    )
    .map((field) => formatFieldValue(field, record.values[field.id]))
    .join(' · ') || '';
export function newRecord(
  typeId: string,
  values: JournalRecord['values'],
  title: string,
  now = new Date(),
): JournalRecord {
  return {
    id: uid(),
    typeId,
    title,
    occurredAt: now.toISOString(),
    values,
    attachments: [],
  };
}

function feedingType(): RecordType {
  return {
    id: 'feeding',
    name: '婴儿哺乳',
    fields: [
      {
        id: 'method',
        name: '喂养方式',
        kind: 'choice',
        options: ['全母乳', '全奶粉', '混合喂养'],
        required: true,
      },
      { id: 'startedAt', name: '开始时间', kind: 'datetime', required: true },
      { id: 'endedAt', name: '结束时间', kind: 'datetime', required: true },
      { id: 'amount', name: '喂养量', kind: 'number', unit: 'ml', required: true },
    ],
  };
}

export function ensureBuiltInTypes(state: JournalState): JournalState {
  return state.types.some((type) => type.id === 'feeding')
    ? state
    : { ...state, types: [...state.types, feedingType()] };
}

export function createInitialState(now = new Date(), withExamples = false): JournalState {
  const at = (hour: number, offset = 0) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour).toISOString();
  const attachment: RecordField = {
    id: 'attachment',
    name: '附件',
    kind: 'attachment',
  };
  return {
    version: 1,
    types: [
      {
        id: 'note',
        name: '随手记',
        fields: [
          { id: 'content', name: '内容', kind: 'longtext', required: true },
          attachment,
        ],
      },
      {
        id: 'water',
        name: '饮水',
        fields: [
          {
            id: 'amount',
            name: '饮水量',
            kind: 'number',
            unit: 'ml',
            required: true,
          },
          { id: 'note', name: '备注', kind: 'text' },
        ],
      },
      {
        id: 'movement',
        name: '胎动',
        fields: [
          {
            id: 'count',
            name: '次数',
            kind: 'number',
            unit: '次',
            required: true,
          },
          { id: 'duration', name: '持续时间', kind: 'number', unit: '分钟' },
        ],
      },
      {
        id: 'routine',
        name: '事件 A',
        fields: [
          {
            id: 'result',
            name: '执行结果',
            kind: 'choice',
            options: ['已完成', '部分完成'],
            required: true,
          },
          { id: 'note', name: '备注', kind: 'longtext' },
          attachment,
        ],
      },
      {
        id: 'photo',
        name: '图片记录',
        fields: [
          { id: 'description', name: '描述', kind: 'longtext' },
          { id: 'recognizedText', name: '图片文字', kind: 'longtext' },
          { ...attachment, required: true },
        ],
      },
      {
        id: 'event',
        name: '事件',
        fields: [
          { id: 'place', name: '场所', kind: 'text' },
          { id: 'address', name: '详细地点', kind: 'text' },
          { id: 'note', name: '备注', kind: 'longtext' },
          attachment,
        ],
      },
      feedingType(),
    ],
    records: withExamples
      ? [
          newRecord(
            'note',
            { content: '散步回来，把生活里的小事一点点收集起来。' },
            '窗边的光很好',
            new Date(at(10)),
          ),
          newRecord('water', { amount: 250 }, '一杯温水', new Date(at(9))),
          newRecord(
            'movement',
            { count: 8, duration: 18 },
            '早晨的胎动记录',
            new Date(at(8)),
          ),
          ...Array.from({ length: 37 }, (_, index) =>
            newRecord(
              index % 2 ? 'water' : 'note',
              index % 2
                ? { amount: 250 }
                : { content: '提前整理好需要携带的资料和想问的问题。' },
              index % 2
                ? '午后补充水分'
                : '散步时想到的事：下次复诊记得带上上次的超声报告、纸质就诊卡和问题清单',
              new Date(at(10, -1 - Math.floor(index / 3))),
            ),
          ),
        ]
      : [],
    tasks: withExamples
      ? [
          {
            id: uid(),
            title: '事件 A',
            typeId: 'routine',
            due: at(12),
            status: 'pending',
            planId: 'routine',
            note: '完成后，留下这一次的记录。',
          },
          {
            id: uid(),
            title: '记录今天的感受',
            typeId: 'note',
            due: at(20),
            status: 'pending',
            note: '给自己两分钟，记下今天。',
          },
          {
            id: uid(),
            title: '产检复诊',
            typeId: 'event',
            due: at(9, 1),
            status: 'pending',
            note: '市妇幼保健院 · 门诊楼 3 层 308 诊室',
          },
        ]
      : [],
    plan: { interval: 3, mode: 'fixed', paused: !withExamples },
    session: null,
    hiddenCards: [],
    cards: [],
  };
}

export function validateRecord(state: JournalState, record: JournalRecord) {
  const type = state.types.find((type) => type.id === record.typeId);
  if (!type) throw new Error('记录类型不存在');
  if (!Number.isFinite(Date.parse(record.occurredAt)))
    throw new Error('请选择有效的发生时间');
  for (const field of type.fields) {
    const value = record.values[field.id];
    const missing =
      field.kind === 'attachment'
        ? !record.attachments.some((file) => file.fieldId === field.id)
        : value === undefined || String(value).trim() === '';
    if (field.required && missing) throw new Error(`请填写「${field.name}」`);
    if (!missing && field.kind === 'number' && !Number.isFinite(Number(value)))
      throw new Error(`「${field.name}」需要有效数字`);
    if (!missing && field.kind === 'choice' && !field.options?.includes(String(value)))
      throw new Error(`请选择「${field.name}」的有效选项`);
    if (!missing && field.kind === 'datetime' && !Number.isFinite(Date.parse(String(value))))
      throw new Error(`「${field.name}」需要有效日期时间`);
  }
  if (record.typeId === 'feeding') {
    if (
      Date.parse(String(record.values.endedAt)) < Date.parse(String(record.values.startedAt))
    )
      throw new Error('结束时间不能早于开始时间');
    if (Number(record.values.amount) <= 0) throw new Error('喂养量必须大于 0 ml');
  }
}

export function applyAction(
  state: JournalState,
  action: Action,
  now = new Date(),
): JournalState {
  const next = structuredClone(state);
  switch (action.kind) {
    case 'record': {
      if (next.records.some((record) => record.id === action.record.id)) return state;
      const task = action.completeTaskId
        ? next.tasks.find((task) => task.id === action.completeTaskId)
        : undefined;
      if (action.completeTaskId && (!task || task.status === 'done')) return state;
      validateRecord(next, action.record);
      const record = { ...action.record, values: { ...action.record.values } };
      const type = next.types.find((type) => type.id === record.typeId)!;
      for (const field of type.fields) {
        const value = record.values[field.id];
        if (field.kind === 'datetime' && value !== undefined && String(value).trim() !== '')
          record.values[field.id] = new Date(String(value)).toISOString();
      }
      if (record.typeId === 'feeding') record.occurredAt = String(record.values.startedAt);
      if (action.event) {
        if (!record.title.trim() || !Number.isFinite(Date.parse(action.event.due)))
          throw new Error('请补全事件名称和有效时间');
        record.eventAt = action.event.due;
        next.tasks.push({
          id: uid(),
          title: record.title,
          typeId: record.typeId,
          due: action.event.due,
          status: 'pending',
          sourceRecordId: record.id,
          note: summary(
            record,
            next.types.find((type) => type.id === record.typeId),
          ),
          reminderDisabled: action.event.reminder === null,
          ...(action.event.reminder === null
            ? {}
            : {
                remindAt: new Date(
                  Date.parse(action.event.due) - action.event.reminder * 60000,
                ).toISOString(),
              }),
        });
      }
      next.records.unshift(record);
      if (task) {
        task.status = 'done';
        if (task.planId && !next.plan.paused) {
          const step = next.plan.interval * 3600000;
          const base = next.plan.mode === 'fixed' ? Date.parse(task.due) : now.getTime();
          const steps = Math.max(1, Math.floor((now.getTime() - base) / step) + 1);
          next.tasks.push({
            ...task,
            id: uid(),
            status: 'pending',
            due: new Date(base + steps * step).toISOString(),
          });
        }
      }
      break;
    }
    case 'typeAppearance': {
      const type = next.types.find((type) => type.id === action.typeId);
      if (!type) throw new Error('记录类型不存在');
      type.appearance = appearanceSchema.optional().parse(action.appearance);
      break;
    }
    case 'type': {
      const type = typeSchema.parse(action.type);
      type.fields = type.fields.map((field) =>
        field.kind === 'choice'
          ? {
              ...field,
              options: [
                ...new Set(field.options?.map((option) => option.trim()).filter(Boolean)),
              ],
            }
          : field,
      );
      if (next.types.some((existing) => existing.name === type.name.trim()))
        throw new Error('这个类型名称已存在');
      if (new Set(type.fields.map((field) => field.name.trim())).size !== type.fields.length)
        throw new Error('字段名称不能重复');
      if (type.fields.some((field) => field.kind === 'choice' && !field.options?.length))
        throw new Error('请为选择字段填写选项');
      next.types.push(type);
      break;
    }
    case 'plan': {
      next.plan = planSchema.parse(action.plan);
      if (
        !next.plan.paused &&
        !next.tasks.some((task) => task.planId === 'routine' && task.status === 'pending')
      )
        next.tasks.push({
          id: uid(),
          title: '事件 A',
          typeId: 'routine',
          due: new Date(now.getTime() + next.plan.interval * 3600000).toISOString(),
          status: 'pending',
          planId: 'routine',
          note: '完成后留下记录。',
        });
      break;
    }
    case 'session': {
      if (action.operation === 'start' && !next.session)
        next.session = { start: now.getTime(), events: [] };
      if (!next.session) break;
      if (action.operation === 'count') next.session.events.push(now.getTime());
      if (action.operation === 'undo') next.session.events.pop();
      if (action.operation === 'finish') {
        next.records.unshift({
          ...newRecord(
            'movement',
            {
              count: next.session.events.length,
              duration: Math.max(
                0.1,
                Math.round((now.getTime() - next.session.start) / 6000) / 10,
              ),
            },
            '胎动计数',
            new Date(next.session.start),
          ),
          events: next.session.events,
        });
        next.session = null;
      }
      break;
    }
    case 'board':
      next.hiddenCards = action.hiddenCards;
      next.cards = action.cards;
      break;
    case 'postpone': {
      const task = next.tasks.find(
        (task) => task.id === action.taskId && task.status === 'pending',
      );
      if (task) {
        task.reminderDisabled = false;
        task.remindAt = new Date(now.getTime() + 900000).toISOString();
      }
    }
  }
  return next;
}
