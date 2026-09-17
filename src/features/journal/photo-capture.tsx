import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DialogFooter, DialogPanel } from '@vita/ui/dialog';
import { Button } from '@vita/ui/button';
import { Input } from '@vita/ui/input';
import { Textarea } from '@vita/ui/textarea';
import { Icons } from '@vita/ui/icons';
import { Tabs, TabsList, TabsTab, TabsPanel } from '@vita/ui/tabs';
import { Alert, AlertDescription } from '@vita/ui/alert';
import { Progress } from '@vita/ui/progress';
import { Choice, FormField, RecordFields, FormError, pendingFile } from './controls';
import { useJournal, errorText } from './journal-context';
import { localDateTime, newRecord, type JournalRecord } from './model';
import { extractImageDraft } from './photo-text';
import { recognizeImage } from './ocr';
import { FileDownload } from './file-download';

const emptyEvent = {
  title: '',
  date: '',
  time: '',
  place: '',
  address: '',
  note: '',
};
type EventKey = keyof typeof emptyEvent;
type OcrState = {
  status: 'idle' | 'loading' | 'done' | 'empty' | 'error' | 'cancelled';
  progress: number;
  text: string;
  message: string;
  dates: string[];
  times: string[];
};
const initialOCR: OcrState = {
  status: 'idle',
  progress: 0,
  text: '',
  message: '',
  dates: [],
  times: [],
};
export function PhotoCapture({ onClose }: { onClose: () => void }) {
  const { state, busy, save, notify } = useJournal();
  const [image, setImage] = useState<{
    file: File;
    url: string;
    source: string;
  } | null>(null);
  const [mode, setMode] = useState('record'),
    [typeId, setTypeId] = useState('photo');
  const [event, setEvent] = useState(emptyEvent),
    [reminder, setReminder] = useState('30');
  const [title, setTitle] = useState(''),
    [occurredAt, setOccurredAt] = useState(localDateTime());
  const [valuesByType, setValuesByType] = useState<Record<string, JournalRecord['values']>>(
    {},
  );
  const [ocr, setOCR] = useState<OcrState>(initialOCR),
    [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false),
    [cameraLoading, setCameraLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    cameraInput = useRef<HTMLInputElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null),
    controller = useRef<AbortController | null>(null);
  const alive = useRef(true),
    selection = useRef(0),
    cameraRun = useRef(0),
    dirty = useRef(new Set<string>()),
    modeTouched = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const type = state.types.find((type) => type.id === typeId)!;
  const values = valuesByType[typeId] || {};
  function stopCamera() {
    cameraRun.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setCameraOpen(false);
    setCameraLoading(false);
  }
  function stopOCR() {
    controller.current?.abort();
    controller.current = null;
    clearTimeout(timeout.current);
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      selection.current++;
      cameraRun.current++;
      controller.current?.abort();
      clearTimeout(timeout.current);
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );
  useEffect(() => {
    if (cameraOpen && video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current.play().catch(() => {
        stopCamera();
        setError('无法打开相机预览，请重试或上传图片');
      });
    }
  }, [cameraOpen]);
  useEffect(() => {
    const field =
      type.fields.find((field) => field.id === 'recognizedText') ||
      type.fields.find((field) => field.kind === 'longtext');
    if (ocr.text && field)
      setValuesByType((previous) =>
        previous[typeId]?.[field.id] !== undefined
          ? previous
          : {
              ...previous,
              [typeId]: { ...previous[typeId], [field.id]: ocr.text },
            },
      );
  }, [ocr.text, typeId, type]);
  async function recognize(file: File) {
    stopOCR();
    const active = new AbortController();
    controller.current = active;
    setOCR({
      ...initialOCR,
      status: 'loading',
      message: '正在识别图片文字，首次需要下载语言包…',
    });
    timeout.current = setTimeout(() => {
      if (controller.current !== active) return;
      active.abort();
      setOCR((previous) => ({
        ...previous,
        status: 'error',
        message: '识别耗时较长，可以重试或直接保存图片。',
      }));
    }, 90000);
    try {
      const text = await recognizeImage(file, active.signal, (progress) => {
        if (alive.current && controller.current === active)
          setOCR((previous) => ({ ...previous, progress }));
      });
      if (!alive.current || active.signal.aborted || controller.current !== active) return;
      const result = extractImageDraft(text);
      setOCR({
        status: text ? 'done' : 'empty',
        progress: 100,
        text,
        message: text
          ? '文字已识别，请核对自动填入的信息。'
          : '没有读到清晰文字，仍可直接保存图片。',
        dates: result.dates,
        times: result.times,
      });
      setEvent(
        (previous) =>
          Object.fromEntries(
            Object.entries(previous).map(([key, value]) => [
              key,
              dirty.current.has(key) ? value : result[key as EventKey] || value,
            ]),
          ) as typeof emptyEvent,
      );
      if (!dirty.current.has('recordTitle')) setTitle(result.title);
      if (!modeTouched.current) setMode(result.suggestEvent ? 'event' : 'record');
    } catch {
      if (alive.current && !active.signal.aborted && controller.current === active)
        setOCR((previous) => ({
          ...previous,
          status: 'error',
          message: '暂时无法识别，检查网络后重试，或直接保存图片。',
        }));
    } finally {
      if (controller.current === active) clearTimeout(timeout.current);
    }
  }
  async function selectImage(file?: File, source = '上传图片') {
    if (!file || busy) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('请选择 JPG、PNG、WebP 等图片');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('图片不能超过 20 MB');
      return;
    }
    stopOCR();
    stopCamera();
    setOCR((previous) =>
      previous.status === 'loading'
        ? {
            ...previous,
            status: 'cancelled',
            message: '已停止识别，可以直接保存或重新识别。',
          }
        : previous,
    );
    const current = ++selection.current;
    const url = URL.createObjectURL(file);
    try {
      const decoded = new Image();
      decoded.src = url;
      await decoded.decode();
    } catch {
      URL.revokeObjectURL(url);
      if (alive.current && current === selection.current)
        setError('图片无法打开，请转换成 JPG 或 PNG 后重试');
      return;
    }
    if (!alive.current || current !== selection.current) {
      URL.revokeObjectURL(url);
      return;
    }
    setImage({ file, url, source });
    dirty.current.clear();
    setEvent(emptyEvent);
    setReminder('30');
    setTitle('');
    setOccurredAt(localDateTime());
    setValuesByType({});
    void recognize(file);
  }
  async function sample() {
    try {
      const response = await fetch(new URL('./sample-appointment.svg', import.meta.url));
      if (!response.ok) throw new Error('示例图片加载失败');
      await selectImage(
        new File([await response.blob()], '示例预约单.svg', {
          type: 'image/svg+xml',
        }),
        '示例图片',
      );
    } catch (cause) {
      if (alive.current) setError(errorText(cause));
    }
  }
  async function startCamera() {
    setError('');
    if (matchMedia('(pointer: coarse)').matches) {
      cameraInput.current?.click();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前浏览器无法调用相机，请使用 HTTPS 或 localhost，也可以上传图片');
      return;
    }
    const current = ++cameraRun.current;
    setCameraLoading(true);
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (!alive.current || current !== cameraRun.current) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = next;
      setCameraOpen(true);
    } catch {
      if (alive.current && current === cameraRun.current)
        setError('相机不可用或未获授权，可以允许相机访问后重试，或上传图片');
    } finally {
      if (alive.current && current === cameraRun.current) setCameraLoading(false);
    }
  }
  async function takePhoto() {
    if (!video.current?.videoWidth) {
      setError('相机尚未准备好，请稍后重试');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.current.videoWidth;
    canvas.height = video.current.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('当前浏览器无法处理照片，请上传图片');
      return;
    }
    context.drawImage(video.current, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!alive.current) return;
    if (blob)
      await selectImage(
        new File([blob], `拍照-${Date.now()}.jpg`, { type: 'image/jpeg' }),
        '相机拍摄',
      );
    else setError('照片保存失败，请重拍');
  }
  function change(key: EventKey, value: string) {
    dirty.current.add(key);
    setEvent((previous) => ({ ...previous, [key]: value }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!image || busy) return;
    setError('');
    try {
      const target =
        mode === 'event' ? state.types.find((type) => type.id === 'event')! : type;
      const field =
        target.fields.find((field) => field.kind === 'attachment' && field.required) ||
        target.fields.find((field) => field.kind === 'attachment');
      if (
        target.fields.filter((field) => field.kind === 'attachment' && field.required)
          .length > 1
      )
        throw new Error(
          '这个类型需要多个附件，请先选择「图片记录」保存，再通过「记一笔」录入完整表单',
        );
      if (mode === 'event' && (!event.title.trim() || !event.date || !event.time))
        throw new Error('请补全事件名称、日期和时间');
      const file = pendingFile(image.file, field?.id);
      const record: JournalRecord = {
        ...newRecord(
          target.id,
          mode === 'event'
            ? { place: event.place, address: event.address, note: event.note }
            : values,
          mode === 'event'
            ? event.title.trim()
            : title.trim() || `图片记录 · ${image.file.name}`,
          mode === 'event'
            ? new Date()
            : new Date(typeId === 'feeding' ? String(values.startedAt) : occurredAt),
        ),
        attachments: [file.attachment],
        source: image.source,
        ocrText: ocr.text,
      };
      stopOCR();
      stopCamera();
      setOCR((previous) =>
        previous.status === 'loading'
          ? {
              ...previous,
              status: 'cancelled',
              message: '已停止识别，可以直接保存或重新识别。',
            }
          : previous,
      );
      await save(
        {
          kind: 'record',
          record,
          ...(mode === 'event'
            ? {
                event: {
                  due: `${event.date}T${event.time}:00`,
                  reminder: reminder === 'none' ? null : Number(reminder),
                },
              }
            : {}),
        },
        [file],
      );
      notify(mode === 'event' ? '事件已加入待办，原图一起保存' : '图片记录已保存');
      onClose();
    } catch (cause) {
      setError(errorText(cause));
    }
  }
  return (
    <form className="journal-dialog-form" onSubmit={submit}>
      <DialogPanel>
        <fieldset disabled={busy} className="space-y-5">
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void selectImage(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              void selectImage(e.target.files?.[0], '相机拍摄');
              e.target.value = '';
            }}
          />
          <div className={`journal-photo-grid ${image ? 'has-image' : ''}`}>
            <section
              className="journal-photo-source"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void selectImage(e.dataTransfer.files[0]);
              }}
            >
              {cameraOpen ? (
                <div className="col-span-full space-y-4">
                  <video
                    ref={video}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg"
                    aria-label="相机预览"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={stopCamera}>
                      取消拍摄
                    </Button>
                    <Button onClick={() => void takePhoto()}>拍下这张</Button>
                  </div>
                </div>
              ) : image ? (
                <>
                  <FileDownload
                    url={image.url}
                    name={image.file.name}
                    read={() => Promise.resolve(image.file)}
                    className="journal-photo-preview"
                    label="下载原图"
                  >
                    <img src={image.url} alt={image.file.name} />
                  </FileDownload>
                  <p className="journal-photo-name text-xs text-muted-foreground">
                    <span className="truncate">{image.file.name}</span>
                    <span>{Math.max(1, Math.round(image.file.size / 1024))} KB</span>
                  </p>
                  <div className="journal-photo-actions">
                    <Button variant="outline" onClick={() => input.current?.click()}>
                      更换图片
                    </Button>
                    <Button
                      variant="outline"
                      disabled={cameraLoading}
                      onClick={() => void startCamera()}
                    >
                      {cameraLoading ? '连接相机…' : '重新拍照'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-5 py-8 text-center">
                  <Icons.scanLine className="mx-auto size-12 text-primary" />
                  <h3 className="text-lg font-medium">从一张图片开始</h3>
                  <p className="text-sm text-muted-foreground">
                    预约单、票据、截图，或生活里的一个瞬间
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button variant="primary" onClick={() => input.current?.click()}>
                      <Icons.upload />
                      上传图片
                    </Button>
                    <Button
                      variant="outline"
                      disabled={cameraLoading}
                      onClick={() => void startCamera()}
                    >
                      {cameraLoading ? '连接相机…' : '拍照'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    也可以把图片拖到这里 · 单张不超过 20 MB
                  </p>
                  <Button variant="link" size="sm" onClick={() => void sample()}>
                    用示例预约单试一下
                    <Icons.arrowRight />
                  </Button>
                </div>
              )}
              <p className="journal-photo-privacy text-xs leading-6 text-muted-foreground">
                图片保留在此设备，文字在本机识别。
              </p>
            </section>
            {image ? (
              <section className="min-w-0 space-y-5">
                <Tabs
                  className="gap-5"
                  value={mode}
                  onValueChange={(value) => {
                    setMode(String(value));
                    modeTouched.current = true;
                  }}
                >
                  <TabsList className="w-full" aria-label="图片保存方式">
                    <TabsTab value="event" disabled={busy}>
                      <Icons.calendar />
                      创建事件
                    </TabsTab>
                    <TabsTab value="record" disabled={busy}>
                      <Icons.book />
                      保存记录
                    </TabsTab>
                  </TabsList>
                  <Alert role="status">
                    <AlertDescription>
                      {ocr.message}
                      {ocr.status === 'loading' ? (
                        <>
                          <Progress aria-label="图片文字识别进度" value={ocr.progress} />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              stopOCR();
                              setOCR((previous) => ({
                                ...previous,
                                status: 'cancelled',
                                message: '已停止识别，可以直接保存或手动补充。',
                              }));
                            }}
                          >
                            跳过识别
                          </Button>
                        </>
                      ) : (
                        ocr.status !== 'done' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void recognize(image.file)}
                          >
                            重新识别
                          </Button>
                        )
                      )}
                    </AlertDescription>
                  </Alert>
                  {mode === 'event' ? (
                    <TabsPanel value="event" className="space-y-5">
                      <FormField label="事件名称" htmlFor="photo-event-title">
                        <Input
                          id="photo-event-title"
                          required
                          value={event.title}
                          onChange={(e) => change('title', e.target.value)}
                        />
                      </FormField>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="日期" htmlFor="photo-date">
                          <Input
                            nativeInput
                            id="photo-date"
                            type="date"
                            required
                            value={event.date}
                            onChange={(e) => change('date', e.target.value)}
                          />
                        </FormField>
                        <FormField label="时间" htmlFor="photo-time">
                          <Input
                            nativeInput
                            id="photo-time"
                            type="time"
                            required
                            value={event.time}
                            onChange={(e) => change('time', e.target.value)}
                          />
                        </FormField>
                      </div>
                      {ocr.dates.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                          <p className="w-full text-xs text-muted-foreground">
                            识别到多个日期，请选择：
                          </p>
                          {ocr.dates.map((date) => (
                            <Button
                              key={date}
                              size="sm"
                              variant="outline"
                              onClick={() => change('date', date)}
                            >
                              {date}
                            </Button>
                          ))}
                        </div>
                      )}
                      {ocr.times.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                          <p className="w-full text-xs text-muted-foreground">
                            识别到多个时间，请选择：
                          </p>
                          {ocr.times.map((time) => (
                            <Button
                              key={time}
                              size="sm"
                              variant="outline"
                              onClick={() => change('time', time)}
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                      )}
                      <FormField label="场所（可选）" htmlFor="photo-place">
                        <Input
                          id="photo-place"
                          value={event.place}
                          onChange={(e) => change('place', e.target.value)}
                        />
                      </FormField>
                      <FormField label="详细地点（可选）" htmlFor="photo-address">
                        <Input
                          id="photo-address"
                          value={event.address}
                          onChange={(e) => change('address', e.target.value)}
                        />
                      </FormField>
                      <FormField label="备注（可选）" htmlFor="photo-note">
                        <Textarea
                          id="photo-note"
                          value={event.note}
                          onChange={(e) => change('note', e.target.value)}
                          rows={2}
                        />
                      </FormField>
                      <Choice
                        label="提醒"
                        value={reminder}
                        options={[
                          { value: 'none', label: '不提醒' },
                          { value: '0', label: '准时' },
                          { value: '15', label: '提前 15 分钟' },
                          { value: '30', label: '提前 30 分钟' },
                          { value: '60', label: '提前 1 小时' },
                        ]}
                        onChange={setReminder}
                      />
                    </TabsPanel>
                  ) : (
                    <TabsPanel value="record" className="space-y-5">
                      <Choice
                        label="记录类型"
                        value={typeId}
                        options={state.types.map((type) => ({
                          value: type.id,
                          label: type.name,
                        }))}
                        onChange={setTypeId}
                      />
                      <FormField label="标题（可选）" htmlFor="photo-title">
                        <Input
                          id="photo-title"
                          placeholder="也可以只保存图片"
                          value={title}
                          onChange={(e) => {
                            dirty.current.add('recordTitle');
                            setTitle(e.target.value);
                          }}
                        />
                      </FormField>
                      {typeId !== 'feeding' && (
                        <FormField label="发生时间" htmlFor="photo-occurred">
                          <Input
                            nativeInput
                            id="photo-occurred"
                            type="datetime-local"
                            required
                            value={occurredAt}
                            onChange={(e) => setOccurredAt(e.target.value)}
                          />
                        </FormField>
                      )}
                      <RecordFields
                        type={type}
                        values={values}
                        onChange={(values) =>
                          setValuesByType((previous) => ({
                            ...previous,
                            [typeId]: values,
                          }))
                        }
                      />
                    </TabsPanel>
                  )}
                  {ocr.text && (
                    <details>
                      <summary className="cursor-pointer text-sm text-muted-foreground">
                        查看图片识别原文
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {ocr.text}
                      </p>
                    </details>
                  )}
                </Tabs>
              </section>
            ) : (
              <aside className="space-y-8 py-6">
                <div className="space-y-3">
                  <Icons.calendar className="size-6 text-primary" />
                  <h3 className="font-medium">安排下一件事</h3>
                  <p className="text-sm leading-7 text-muted-foreground">
                    从预约单或活动海报提取时间与地点，确认后加入待办。
                  </p>
                </div>
                <div className="space-y-3">
                  <Icons.book className="size-6 text-primary" />
                  <h3 className="font-medium">留下此刻的记录</h3>
                  <p className="text-sm leading-7 text-muted-foreground">
                    保存原图与识别文字，也能放入自己组装的记录类型。
                  </p>
                </div>
                <p className="text-xs leading-6 text-muted-foreground">
                  首次识别需要下载语言包；下载失败时仍可保存图片。
                </p>
              </aside>
            )}
          </div>
          <FormError message={error} />
        </fieldset>
      </DialogPanel>
      {image && (
        <DialogFooter className="items-center">
          <p className="mr-auto text-xs text-muted-foreground">
            {mode === 'event' ? '原图一起保存 · 提醒仅在应用内展示' : '原图与文字一起保存'}
          </p>
          <Button variant="primary" type="submit" loading={busy}>
            {mode === 'event' ? '确认并创建事件' : '保存图片记录'}
            <Icons.check />
          </Button>
        </DialogFooter>
      )}
    </form>
  );
}
