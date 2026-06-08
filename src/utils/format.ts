import { DateTime } from 'luxon'

export function relativeTo(dateStr: string, locale = 'zh') {
  const normalizedLocale = locale ?? 'zh'
  return DateTime.fromISO(dateStr).toRelative({
    base: DateTime.now(),
    locale: normalizedLocale,
  })
}

export function formatDateMD(
  dateStr: string | Date | undefined,
  locale = 'zh',
) {
  const date =
    dateStr instanceof String
      ? DateTime.fromISO(dateStr as string)
      : DateTime.fromJSDate(dateStr as Date)
  if (locale === 'en') {
    return date.setLocale(locale).toFormat('dd, MMM')
  }
  return date.toFormat('MM-dd')
}

export function formatDateYMD(dateStr: string | number | Date, _locale = 'zh') {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month}, ${year}`
}

export function slugifySpace(old: string | undefined) {
  return old?.replace(/\s/g, '-')
}
