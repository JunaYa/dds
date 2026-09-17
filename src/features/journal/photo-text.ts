const clean = (text: string) =>
  text
    .normalize('NFKC')
    .replace(/(?<=\p{Script=Han})[ \t]+(?=\p{Script=Han})/gu, '')
    .replace(/\r/g, '');

export function extractImageDraft(text: string) {
  const lines = clean(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  function labeled(labels: string) {
    for (let index = 0; index < lines.length; index++) {
      const match = lines[index].match(new RegExp(`^(?:${labels})\\s*[:：]?\\s*(.*)$`, 'i'));
      if (match) return match[1] || lines[index + 1] || '';
    }
    return '';
  }
  const actionable =
    /预约|就诊|出发|开车|活动|会议|演出|集合|appointment|departure|event|meeting/i.test(
      lines.join('\n'),
    );
  const dateLines = lines.filter((line) =>
    /预约日期|就诊日期|出发日期|活动日期|会议日期|预约时间|就诊时间|出发时间|活动时间|会议时间|event date|appointment|departure/i.test(
      line,
    ),
  );
  const timeLines = lines.filter((line) =>
    /预约时间|就诊时间|出发时间|活动时间|会议时间|开始时间|event time|appointment|departure/i.test(
      line,
    ),
  );
  for (let index = 0; index < lines.length - 1; index++) {
    if (
      /^(预约日期|就诊日期|出发日期|活动日期|会议日期|预约时间|就诊时间|出发时间|活动时间|会议时间)\s*[:：]?$/.test(
        lines[index],
      )
    )
      dateLines.push(lines[index + 1]);
    if (/^(预约时间|就诊时间|出发时间|活动时间|会议时间|开始时间)\s*[:：]?$/.test(lines[index]))
      timeLines.push(lines[index + 1]);
  }
  const dates: string[] = [];
  for (const line of dateLines) {
    for (const match of line.matchAll(
      /\b(20\d{2})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})(?:日|\b)/g,
    )) {
      const [, year, month, day] = match;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      if (
        date.getFullYear() === Number(year) &&
        date.getMonth() === Number(month) - 1 &&
        date.getDate() === Number(day)
      )
        dates.push(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
  }
  const times: string[] = [];
  for (const line of timeLines) {
    for (const match of line.matchAll(/\b([01]?\d|2[0-3])\s*[:：点时]\s*([0-5]\d)(?:分|\b)/g))
      times.push(`${match[1].padStart(2, '0')}:${match[2]}`);
  }
  const uniqueDates = [...new Set(dates)],
    uniqueTimes = [...new Set(times)];
  const title = labeled('事项名称|事项|标题|活动名称|会议名称|预约项目|就诊项目|event|title');
  const place =
    labeled('场所|医院|会场|venue') ||
    lines.find((line) => /^.{2,30}(医院|保健院|剧院|体育馆|会议中心)$/.test(line)) ||
    '';
  const address = labeled('详细地点|就诊地点|活动地点|会议地点|地点|地址|location|address');
  return {
    title:
      title ||
      lines.find(
        (line) =>
          !/[:：]|\d{2,}|示例|演示|凭据|预约单|^日期|^时间/.test(line) &&
          line.length >= 3 &&
          line.length <= 50,
      ) ||
      '',
    date: uniqueDates.length === 1 ? uniqueDates[0] : '',
    time: uniqueTimes.length === 1 ? uniqueTimes[0] : '',
    place,
    address,
    note: labeled('注意事项|备注|须知|notes') || '',
    dates: uniqueDates,
    times: uniqueTimes,
    suggestEvent: actionable && uniqueDates.length > 0,
  };
}
