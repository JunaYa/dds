// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createInitialState, newRecord } from './model';
import { openDatabase, persistAction, readFile, readState } from './storage';

describe('journal persistence', () => {
  it('persists a type image and removes it without touching historical records', async () => {
    const before = await readState();
    const appearance = {
      icon: 'image' as const,
      background: { kind: 'image' as const, value: 'data:image/jpeg;base64,AQID' },
    };
    await persistAction({ kind: 'typeAppearance', typeId: 'note', appearance });
    const after = await readState();
    expect(after.types[0].appearance).toEqual(appearance);
    expect(after.records).toEqual(before.records);
    await persistAction({ kind: 'typeAppearance', typeId: 'note' });
    expect((await readState()).types[0].appearance).toBeUndefined();
  });
  it('stores the image and its record together and reloads them', async () => {
    await readState();
    const record = newRecord('photo', {}, '本地图片');
    const attachment = {
      id: 'test-image',
      name: 'test.png',
      mime: 'image/png',
      size: 3,
      fieldId: 'attachment',
    };
    record.attachments.push(attachment);
    await persistAction({ kind: 'record', record }, [
      { attachment, blob: new Blob(['abc'], { type: 'image/png' }) },
    ]);
    expect((await readState()).records[0].id).toBe(record.id);
    expect((await readFile(attachment.id)).size).toBe(3);
  });
  it('rolls back both files and records when validation fails', async () => {
    const before = await readState();
    await expect(
      persistAction({ kind: 'record', record: newRecord('water', {}, '无效数据') }, [
        {
          attachment: { id: 'orphan', name: 'x', mime: 'image/png', size: 1 },
          blob: new Blob(['x']),
        },
      ]),
    ).rejects.toThrow('饮水量');
    expect((await readState()).records).toEqual(before.records);
    await expect(readFile('orphan')).rejects.toThrow('附件不可用');
  });
  it('serializes concurrent writes without dropping a record', async () => {
    const records = [
      newRecord('water', { amount: 100 }, '第一杯'),
      newRecord('water', { amount: 200 }, '第二杯'),
    ];
    await Promise.all(records.map((record) => persistAction({ kind: 'record', record })));
    const after = await readState();
    expect(
      records.every((record) => after.records.some((saved) => saved.id === record.id)),
    ).toBe(true);
  });
  it('does not retain attachments from a task already completed in another tab', async () => {
    await persistAction({
      kind: 'record',
      record: newRecord('event', {}, '待办'),
      event: { due: new Date().toISOString(), reminder: null },
    });
    const state = await readState();
    const task = state.tasks.find((task) => task.status === 'pending')!;
    await persistAction({
      kind: 'record',
      record: newRecord('event', {}, '第一笔'),
      completeTaskId: task.id,
    });
    const attachment = {
      id: 'duplicate-file',
      name: 'duplicate.png',
      mime: 'image/png',
      size: 1,
    };
    const duplicate = {
      ...newRecord('event', {}, '第二笔'),
      attachments: [attachment],
    };
    await persistAction({ kind: 'record', record: duplicate, completeTaskId: task.id }, [
      { attachment, blob: new Blob(['x']) },
    ]);
    expect((await readState()).records.some((record) => record.id === duplicate.id)).toBe(
      false,
    );
    await expect(readFile(attachment.id)).rejects.toThrow('附件不可用');
  });
  it('isolates example records and attachments from the real application', async () => {
    const production = await readState();
    const demo = await readState('example');
    expect(demo.records).toHaveLength(40);
    expect(demo.plan.paused).toBe(false);
    const record = newRecord('note', { content: '仅供演示' }, '示例专用');
    const attachment = {
      id: 'demo-file',
      name: 'example.txt',
      mime: 'text/plain',
      size: 1,
    };
    record.attachments.push(attachment);
    await persistAction(
      { kind: 'record', record },
      [{ attachment, blob: new Blob(['x']) }],
      'example',
    );
    expect((await readFile('demo-file', 'example')).size).toBe(1);
    await expect(readFile('demo-file')).rejects.toThrow('附件不可用');
    expect((await readState()).records).toEqual(production.records);
    expect((await readState('example')).records[0].id).toBe(record.id);
  });
  it.each([
    ['app', 'read'],
    ['app', 'write'],
    ['example', 'read'],
    ['example', 'write'],
  ] as const)(
    'adds feeding to existing %s data on %s once and preserves customization',
    async (mode, entry) => {
      const legacy = createInitialState(new Date(), true);
      legacy.types = legacy.types.filter((type) => type.id !== 'feeding');
      legacy.types[0].appearance = { icon: 'moon' };
      const db = await openDatabase(mode);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('state', 'readwrite');
        tx.objectStore('state').put(legacy, 'journal');
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
      });
      db.close();
      if (entry === 'write')
        await persistAction(
          { kind: 'typeAppearance', typeId: 'note', appearance: { icon: 'moon' } },
          [],
          mode,
        );
      const upgraded = await readState(mode);
      expect(upgraded.types.filter((type) => type.id === 'feeding')).toHaveLength(1);
      expect({
        ...upgraded,
        types: upgraded.types.filter((type) => type.id !== 'feeding'),
      }).toEqual(legacy);
      await persistAction(
        { kind: 'typeAppearance', typeId: 'feeding', appearance: { icon: 'sun' } },
        [],
        mode,
      );
      const reloaded = await readState(mode);
      expect(reloaded.types.find((type) => type.id === 'feeding')?.appearance).toEqual({
        icon: 'sun',
      });
      expect(await readState(mode)).toEqual(reloaded);
    },
  );
});
