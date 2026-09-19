import { useId, type ReactNode } from 'react';
import { Field, FieldLabel } from '@vita/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@vita/ui/select';
import { Input } from '@vita/ui/input';
import { Textarea } from '@vita/ui/textarea';
import { localDateTime, uid, type JournalRecord, type RecordType } from './model';
import { Button } from '@vita/ui/button';
import { DialogFooter } from '@vita/ui/dialog';
import { Icons } from '@vita/ui/icons';
import { Alert, AlertDescription } from '@vita/ui/alert';
import { useJournal } from './journal-context';
import type { PendingFile } from './storage';

export function FormField({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
    </Field>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id}>
      <Select
        value={value}
        onValueChange={(value) => value !== null && onChange(value)}
        items={options}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </FormField>
  );
}
export function RecordFields({
  type,
  values,
  onChange,
  lockTimes = false,
}: {
  type: RecordType;
  values: JournalRecord['values'];
  onChange: (values: JournalRecord['values']) => void;
  lockTimes?: boolean;
}) {
  const prefix = useId();
  return (
    <>
      {type.fields
        .filter((field) => field.kind !== 'attachment')
        .map((field) => {
          const label = `${field.name}${field.unit ? `（${field.unit}）` : ''}${field.required ? ' *' : ''}`;
          const value = values[field.id] ?? '';
          const inputValue =
            field.kind === 'datetime' && value !== ''
              ? localDateTime(new Date(String(value)), true)
              : value;
          const change = (value: string) => onChange({ ...values, [field.id]: value });
          if (field.kind === 'choice')
            return (
              <Choice
                key={field.id}
                label={label}
                value={String(values[field.id] ?? '')}
                options={[
                  { value: '', label: '请选择' },
                  ...(field.options || []).map((option) => ({
                    value: option,
                    label: option,
                  })),
                ]}
                onChange={change}
              />
            );
          return (
            <FormField key={field.id} label={label} htmlFor={`${prefix}-${field.id}`}>
              {field.kind === 'longtext' ? (
                <Textarea
                  id={`${prefix}-${field.id}`}
                  value={values[field.id] ?? ''}
                  onChange={(event) => change(event.target.value)}
                  required={field.required}
                  rows={3}
                />
              ) : (
                <Input
                  id={`${prefix}-${field.id}`}
                  nativeInput
                  type={
                    field.kind === 'datetime'
                      ? 'datetime-local'
                      : field.kind === 'number' || field.kind === 'date'
                        ? field.kind
                        : 'text'
                  }
                  step={
                    field.kind === 'number'
                      ? 'any'
                      : field.kind === 'datetime'
                        ? 1
                        : undefined
                  }
                  disabled={lockTimes && field.kind === 'datetime'}
                  value={inputValue}
                  onChange={(event) => change(event.target.value)}
                  required={field.required}
                />
              )}
            </FormField>
          );
        })}
      {type.id === 'feeding' && (
        <p className="text-sm text-muted-foreground">
          喂养量填写本次总量，混合喂养填写母乳与奶粉的合计量。
        </p>
      )}
    </>
  );
}

export function FormError({ message }: { message: string }) {
  return message ? (
    <Alert variant="error">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null;
}
export function SubmitFooter({
  label = '保存记录',
  hint,
  disabled,
}: {
  label?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const { busy } = useJournal();
  return (
    <DialogFooter className="items-center">
      <p className="mr-auto text-xs text-muted-foreground">{hint || '保存在此设备'}</p>
      <Button type="submit" variant="primary" loading={busy} disabled={disabled}>
        {label}
        <Icons.check />
      </Button>
    </DialogFooter>
  );
}
export function pendingFile(file: File, fieldId?: string): PendingFile {
  if (file.size > 20 * 1024 * 1024) throw new Error('单个附件不能超过 20 MB');
  return {
    attachment: { id: uid(), name: file.name, mime: file.type, size: file.size, fieldId },
    blob: file,
  };
}
