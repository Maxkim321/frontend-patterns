export function hello(name: string): string {
  return `Hello, ${name}!`
}

export function formatDate(d: Date, fmt = 'YYYY-MM-DD'): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const map: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
  }
  return fmt.replace(/YYYY|MM|DD|HH|mm|ss/g, (k) => map[k] ?? k)
}
