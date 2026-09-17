import { useState, type ReactNode } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { Button } from '@vita/ui/button';
import { errorText, useJournal } from './journal-context';

export async function saveNativeFile(name: string, read: () => Promise<Blob>) {
  const { save } = await import('@tauri-apps/plugin-dialog');
  const destination = await save({ defaultPath: name, title: '保存附件' });
  if (!destination) return false;
  const { writeFile } = await import('@tauri-apps/plugin-fs');
  await writeFile(destination, new Uint8Array(await (await read()).arrayBuffer()));
  return true;
}

export function FileDownload({
  url,
  name,
  read,
  children,
  className,
  label,
}: {
  url: string;
  name: string;
  read: () => Promise<Blob>;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const { notify } = useJournal();
  const [saving, setSaving] = useState(false);
  if (!isTauri())
    return (
      <a href={url} download={name} className={className} aria-label={label}>
        {children}
      </a>
    );
  return (
    <Button
      variant="link"
      className={`h-auto whitespace-normal p-0 ${className || ''}`}
      aria-label={label}
      disabled={saving}
      onClick={async () => {
        setSaving(true);
        try {
          if (await saveNativeFile(name, read)) notify('附件已保存到所选位置');
        } catch (cause) {
          notify(errorText(cause));
        } finally {
          setSaving(false);
        }
      }}
    >
      {children}
    </Button>
  );
}
