# Shared UI

Import controls through `@vita/ui/<component>`. Keep business data, translations, storage, and feature-specific compositions in the app. New reusable controls, styles, and behavior tests belong here, with a public export in `package.json`.

| Use | Component |
| --- | --- |
| Actions | `Button`; prefer variants, reserve `unstyled` for existing custom surfaces |
| Text and numeric entry | `Input`; `nativeInput` retains native input events and validation |
| Notes | `Textarea` |
| Custom selection menu | Compound `Select` components |
| Platform selection / option children | `NativeSelect` from `@vita/ui/select` |
| Custom radio, range, or file control geometry | `NativeInput` from `@vita/ui/input` |
| Calendar with optional time entry | `DateTimePicker` |
| Scrollable keyboard-accessible option column | `WheelPicker` |
| Modal / floating content | `Dialog`, `Sheet`, `Popover` |

`DateTimePicker` composes Calendar, Popover, Input, and Button. It supports controlled `value` / `onValueChange` or `defaultValue`, English/Chinese `locale`, `mode="date"`, `required`, and `min` / `max`. Values stay in local wall-clock format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`), without UTC conversion. Associate its input with an external label via `id`; do not wrap the whole picker in a label because it also contains a calendar button. The input supports a ref and normal form validation.

`WheelPicker` accepts option `{ value, label }` pairs, `label` for accessibility, and controlled `value` / `onValueChange` or `defaultValue`. It supports arrow keys, Page Up/Down, Home/End, scrolling, and touch.

Run `pnpm check:ui` to check application boundaries. Semantic HTML structure is allowed in the app; raw controls belong in the shared package.
