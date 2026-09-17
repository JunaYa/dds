import { z } from 'zod';

export const typeIcons = [
  'book',
  'heart',
  'calendar',
  'image',
  'sun',
  'moon',
  'flag',
  'flame',
  'music',
  'headphones',
  'repeat',
  'palette',
] as const;
export const appearanceSchema = z.object({
  icon: z.enum(typeIcons),
  background: z
    .discriminatedUnion('kind', [
      z.object({ kind: z.literal('color'), value: z.string().regex(/^#[\da-f]{6}$/i) }),
      z.object({
        kind: z.literal('image'),
        value: z
          .string()
          .max(700_000)
          .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/),
      }),
    ])
    .optional(),
});
export type TypeAppearance = z.infer<typeof appearanceSchema>;

export function defaultTypeIcon(id: string): TypeAppearance['icon'] {
  switch (id) {
    case 'movement':
      return 'heart';
    case 'water':
      return 'sun';
    case 'routine':
      return 'repeat';
    case 'photo':
      return 'image';
    case 'event':
      return 'calendar';
    default:
      return 'book';
  }
}

export function foregroundFor(color: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.179 ? '#000000' : '#ffffff';
}

export async function prepareTypeBackground(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('请选择 JPG、PNG 或 WebP 图片');
  if (file.size > 10 * 1024 * 1024) throw new Error('背景图片不能超过 10 MB');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => {
      throw new Error('无法读取这张图片，请换一张重试');
    });
    const scale = Math.min(1, 960 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前设备无法处理图片，请选择背景颜色');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', 0.8);
    if (data.length > 700_000) throw new Error('图片内容过于复杂，请选择更小的图片');
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
