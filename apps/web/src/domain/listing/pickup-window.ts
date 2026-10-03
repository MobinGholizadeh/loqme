const tehranDateTime = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function parts(date: Date): Record<string, string> {
  return Object.fromEntries(tehranDateTime.formatToParts(date).map(part => [part.type, part.value]));
}

function localTime(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('تاریخ یا ساعت تحویل معتبر نیست');
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  const p = parts(new Date(target));
  const offset = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - target;
  const instant = new Date(target - offset);
  const actual = parts(instant);
  if (+actual.year !== year || +actual.month !== month || +actual.day !== day || +actual.hour !== hour || +actual.minute !== minute) {
    throw new Error('تاریخ یا ساعت تحویل معتبر نیست');
  }
  return instant;
}

/** Merchant clock inputs are Tehran time, regardless of the server timezone. */
export function resolvePickupWindow(input: { pickupDate?: string; pickupStart?: string; pickupEnd?: string }, now = new Date()) {
  const today = parts(now);
  const dateText = input.pickupDate || `${today.year}-${today.month}-${today.day}`;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? dateText : (() => {
    const date = new Date(dateText);
    if (!Number.isFinite(date.getTime())) throw new Error('تاریخ تحویل معتبر نیست');
    const p = parts(date); return `${p.year}-${p.month}-${p.day}`;
  })();
  const pickupDate = localTime(day, '00:00');
  let pickupStart: Date, pickupEnd: Date;
  if (input.pickupStart === undefined && input.pickupEnd === undefined) {
    pickupStart = new Date(now.getTime() + 3600000);
    pickupEnd = new Date(now.getTime() + 10800000);
  } else {
    const parse = (value?: string) => {
      if (!value) throw new Error('زمان شروع و پایان تحویل را با هم وارد کنید');
      if (!value.includes('T')) return localTime(day, value);
      if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) throw new Error('منطقه زمانی تحویل معتبر نیست');
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) throw new Error('زمان تحویل معتبر نیست');
      return date;
    };
    pickupStart = parse(input.pickupStart); pickupEnd = parse(input.pickupEnd);
  }
  if (pickupEnd <= pickupStart) throw new Error('زمان پایان تحویل باید بعد از زمان شروع تحویل باشد');
  if (pickupEnd <= now) throw new Error('بازه تحویل انتخاب‌شده گذشته است؛ زمان امروز را به آینده تغییر دهید');
  return { pickupDate, pickupStart, pickupEnd };
}
