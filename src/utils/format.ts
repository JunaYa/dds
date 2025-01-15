// 时间格式化
export function formatTime(time: string) {
  return new Date(time).toLocaleTimeString();
}

export function formatDuration(duration: number) {
  return `${duration}h`;
}