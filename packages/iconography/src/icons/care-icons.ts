import { Bath, ClipboardList, MoonStar, Sun, Syringe, Thermometer, createLucideIcon } from 'lucide-react'

export const careIcons = {
  careFeeding: createLucideIcon('CareFeeding', [
    ['path', { key: 'bottle', d: 'M10 6V4a2 2 0 0 1 4 0v2M9 6h6v3H9V6Zm0 3h6l2 3v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-7l2-3Zm-1 5h3m-3 3h3' }],
  ]),
  careDiaper: createLucideIcon('CareDiaper', [
    ['path', { key: 'diaper', d: 'M4 6h16l-1 7c-.6 4-3.2 7-7 7s-6.4-3-7-7L4 6ZM4.5 10h3L9 6m10.5 4h-3L15 6M5.5 14c3-1 5.5 1 6.5 6m6.5-6c-3-1-5.5 1-6.5 6' }],
  ]),
  careSleep: MoonStar,
  careBath: Bath,
  careVaccination: Syringe,
  careGrowth: createLucideIcon('CareGrowth', [
    ['path', { key: 'ruler', d: 'M14 3h6v18h-6V3Zm0 4h3m-3 4h2m-2 4h3m-3 4h2M7 4v16M4 7l3-3 3 3M4 17l3 3 3-3' }],
  ]),
  careVitamins: createLucideIcon('CareVitamins', [
    ['path', { key: 'bottle', d: 'M5 3h6v4H5V3ZM4 7h8l1 3v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9l1-3Zm-1 6h10M6 17h4' }],
    ['path', { key: 'drop', d: 'M19 6s-3 4-3 6a3 3 0 0 0 6 0c0-2-3-6-3-6Z' }],
  ]),
  carePumping: createLucideIcon('CarePumping', [
    ['path', { key: 'pump', d: 'M3 4v8l6-3V7L3 4Zm6 4h5a4 4 0 0 1 4 4v2M13 14h8l-1 5a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2l-1-5Zm2 3h2' }],
  ]),
  careTemperature: Thermometer,
  careSun: Sun,
  careRoutine: ClipboardList,
} as const
