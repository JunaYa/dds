import { describe, expect, it } from 'vitest';
import { extractImageDraft } from './photo-text';

describe('image text extraction', () => {
  it('extracts normalized Chinese appointment fields and separate label lines', () => {
    expect(
      extractImageDraft(
        '事项：产检复诊\n预 约 日 期：\n２０２６年９月１８日\n预约时间：０９：３０\n场所：市妇幼保健院\n详细地点：门诊楼３层３０８诊室\n备注：携带报告',
      ),
    ).toMatchObject({
      title: '产检复诊',
      date: '2026-09-18',
      time: '09:30',
      place: '市妇幼保健院',
      address: '门诊楼3层308诊室',
      note: '携带报告',
      suggestEvent: true,
    });
  });
  it('requires confirmation of ambiguous dates and times', () => {
    const draft = extractImageDraft('会议日期：2026-09-18、2026-09-19\n会议时间：09:30 或 14:00');
    expect(draft.date).toBe('');
    expect(draft.time).toBe('');
    expect(draft.dates).toEqual(['2026-09-18', '2026-09-19']);
    expect(draft.times).toEqual(['09:30', '14:00']);
  });
  it('does not invent years, accept impossible dates, or schedule purchase receipts', () => {
    expect(extractImageDraft('预约日期：2026-02-30\n预约时间：25:70').date).toBe('');
    expect(extractImageDraft('预约日期：9月18日').suggestEvent).toBe(false);
    expect(extractImageDraft('购物小票\n交易时间：2026-09-18 09:30\n合计：20.00')).toMatchObject({
      date: '',
      time: '',
      suggestEvent: false,
    });
  });
});
