import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button } from '@vita/ui/button';
import { Input } from '@vita/ui/input';
import { Icons } from '@vita/ui/icons';
import { FormError, FormField } from './controls';
import { errorText } from './journal-context';
import type { RecordType } from './model';
import {
  defaultTypeIcon,
  foregroundFor,
  prepareTypeBackground,
  typeIcons,
  type TypeAppearance,
} from './type-appearance';

const iconLabels: Record<TypeAppearance['icon'], string> = {
  book: '书本',
  heart: '爱心',
  calendar: '日历',
  image: '图片',
  sun: '太阳',
  moon: '月亮',
  flag: '旗帜',
  flame: '火焰',
  music: '音乐',
  headphones: '耳机',
  repeat: '循环',
  palette: '调色盘',
};
const colors = [
  { value: '#DFEAE2', label: '鼠尾草' },
  { value: '#DBE8F4', label: '晴空' },
  { value: '#F1DFD5', label: '陶土' },
  { value: '#E8E0EF', label: '丁香' },
  { value: '#F2E8C9', label: '麦黄' },
  { value: '#283E39', label: '深林' },
];
type TypeIdentity = Pick<RecordType, 'id' | 'name' | 'appearance'>;

function backgroundStyle(appearance?: TypeAppearance): CSSProperties | undefined {
  const background = appearance?.background;
  if (background?.kind === 'color')
    return { backgroundColor: background.value, color: foregroundFor(background.value) };
  if (background?.kind === 'image') return { backgroundColor: '#202020', color: '#ffffff' };
}

function BackgroundImage({ appearance }: { appearance?: TypeAppearance }) {
  return appearance?.background?.kind === 'image' ? (
    <>
      <img src={appearance.background.value} alt="" className="journal-type-image" />
      <span className="journal-type-scrim" />
    </>
  ) : null;
}

export function TypeGlyph({ type }: { type?: TypeIdentity }) {
  const Icon = Icons[type?.appearance?.icon || defaultTypeIcon(type?.id || '')];
  return (
    <span
      className="journal-type-glyph"
      style={backgroundStyle(type?.appearance)}
      aria-hidden="true"
    >
      <BackgroundImage appearance={type?.appearance} />
      <Icon className="relative size-5" />
    </span>
  );
}

export function TypeCover({
  type,
  description,
}: {
  type: TypeIdentity;
  description?: string;
}) {
  const Icon = Icons[type.appearance?.icon || defaultTypeIcon(type.id)];
  return (
    <div className="journal-type-cover" style={backgroundStyle(type.appearance)}>
      <BackgroundImage appearance={type.appearance} />
      <div className="relative flex min-w-0 items-center gap-3">
        <Icon className="size-7 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold">{type.name}</h3>
          {description && <p className="mt-1 text-sm">{description}</p>}
        </div>
      </div>
    </div>
  );
}

export function TypeAppearanceEditor({
  typeId,
  value,
  onChange,
  onProcessingChange,
}: {
  typeId: string;
  value?: TypeAppearance;
  onChange: (value: TypeAppearance | undefined) => void;
  onProcessingChange: (processing: boolean) => void;
}) {
  const appearance = value || { icon: defaultTypeIcon(typeId) };
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function upload(file?: File) {
    if (!file) return;
    setProcessing(true);
    onProcessingChange(true);
    setError('');
    try {
      const data = await prepareTypeBackground(file);
      if (alive.current)
        onChange({ ...appearance, background: { kind: 'image', value: data } });
    } catch (cause) {
      if (alive.current) setError(errorText(cause));
    } finally {
      if (alive.current) {
        setProcessing(false);
        onProcessingChange(false);
      }
    }
  }
  return (
    <fieldset className="min-w-0 space-y-5" disabled={processing}>
      <legend className="mb-3 text-sm font-medium">图标与背景</legend>
      <div role="group" aria-label="选择图标" className="journal-icon-options">
        {typeIcons.map((icon) => {
          const Icon = Icons[icon];
          return (
            <Button
              key={icon}
              variant={appearance.icon === icon ? 'secondary' : 'outline'}
              size="icon"
              aria-label={`${iconLabels[icon]}图标`}
              aria-pressed={appearance.icon === icon}
              title={iconLabels[icon]}
              onClick={() => onChange({ ...appearance, icon })}
            >
              <Icon />
            </Button>
          );
        })}
      </div>
      <div role="group" aria-label="背景颜色" className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <Button
            key={color.value}
            size="icon"
            variant="outline"
            aria-label={`${color.label}背景`}
            aria-pressed={
              appearance.background?.kind === 'color' &&
              appearance.background.value.toLowerCase() === color.value.toLowerCase()
            }
            style={{ backgroundColor: color.value, color: foregroundFor(color.value) }}
            onClick={() =>
              onChange({ ...appearance, background: { kind: 'color', value: color.value } })
            }
          >
            {appearance.background?.kind === 'color' &&
              appearance.background.value.toLowerCase() === color.value.toLowerCase() && (
                <Icons.check />
              )}
          </Button>
        ))}
      </div>
      <FormField label="自定义颜色" htmlFor="type-color">
        <Input
          nativeInput
          id="type-color"
          type="color"
          className="h-11 w-full cursor-pointer p-1"
          value={
            appearance.background?.kind === 'color'
              ? appearance.background.value
              : colors[0].value
          }
          onChange={(event) =>
            onChange({
              ...appearance,
              background: { kind: 'color', value: event.target.value },
            })
          }
        />
      </FormField>
      <FormField label="上传背景图片" htmlFor="type-background">
        <Input
          nativeInput
          id="type-background"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="type-background-hint"
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <p id="type-background-hint" className="text-xs leading-5 text-muted-foreground">
          JPG、PNG 或 WebP，最大 10 MB。图片会压缩并保存在此设备。
        </p>
      </FormField>
      {processing && (
        <p role="status" className="text-sm text-muted-foreground">
          正在处理背景图片…
        </p>
      )}
      <FormError message={error} />
      <div className="flex flex-wrap gap-2">
        {appearance.background && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ icon: appearance.icon })}
          >
            移除背景
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(undefined);
            setError('');
          }}
        >
          恢复默认外观
        </Button>
      </div>
    </fieldset>
  );
}
