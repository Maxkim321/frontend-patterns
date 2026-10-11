import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ')
}

/* ============================== Button ============================== */

type ButtonVariant = 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive'
type ButtonSize = 'default' | 'sm' | 'xs' | 'icon-sm'

const buttonVariants: Record<ButtonVariant, string> = {
  default: 'border-transparent bg-blue-600 text-white hover:bg-blue-500',
  ghost: 'border-transparent bg-transparent hover:bg-zinc-100',
  outline: 'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50',
  secondary: 'border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
  destructive: 'border-transparent bg-red-600 text-white hover:bg-red-500',
}
const buttonSizes: Record<ButtonSize, string> = {
  default: 'h-9 px-4',
  sm: 'h-8 px-3',
  xs: 'h-7 px-2 text-xs',
  'icon-sm': 'h-8 w-8',
}

export function Button({
  variant = 'default',
  size = 'default',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ============================== Badge / Separator ============================== */

export function Badge({
  className,
  variant = 'default',
  children,
}: {
  className?: string
  variant?: 'default' | 'outline'
  children?: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium',
        variant === 'outline' ? 'border border-zinc-300 text-zinc-600' : 'bg-zinc-900 text-white',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn('h-px bg-zinc-200', className)} />
}

/* ============================== Input / Textarea / Label ============================== */

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-blue-500',
        className,
      )}
      {...rest}
    />
  )
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500',
        className,
      )}
      {...rest}
    />
  )
}

export function Label({ className, children }: { className?: string; children?: ReactNode }) {
  return <label className={cn('block text-xs font-medium text-zinc-700', className)}>{children}</label>
}

/* ============================== Card ============================== */

export function Card({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn('rounded-xl border border-zinc-200 bg-white', className)}>{children}</div>
}
export function CardContent({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn(className)}>{children}</div>
}

/* ============================== Popover（受控 + 非受控两用） ============================== */

interface PopoverCtx {
  open: boolean
  setOpen: (v: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}
const PopoverContext = createContext<PopoverCtx | null>(null)

export function Popover({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (v: boolean) => void
  children?: ReactNode
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const actualOpen = isControlled ? open : internalOpen
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v)
    onOpenChange?.(v)
  }
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!actualOpen) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      const panel = document.getElementById('popover-panel')
      if (panel?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [actualOpen])

  return (
    <PopoverContext.Provider value={{ open: actualOpen, setOpen, triggerRef }}>
      {children}
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger({
  asChild,
  children,
}: {
  asChild?: boolean
  children?: ReactNode
}) {
  const ctx = useContext(PopoverContext)
  if (!asChild || !ctx) return null
  const child = children as React.ReactElement<Record<string, unknown>>
  return {
    ...child,
    props: {
      ...child.props,
      ref: (el: HTMLButtonElement) => {
        ctx.triggerRef.current = el
      },
      onClick: () => ctx.setOpen(!ctx.open),
    },
  }
}

export function PopoverContent({
  className,
  children,
  align = 'start',
}: {
  className?: string
  children?: ReactNode
  align?: 'start' | 'end'
}) {
  const ctx = useContext(PopoverContext)
  if (!ctx || !ctx.open) return null
  const rect = ctx.triggerRef.current?.getBoundingClientRect()
  const style: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: rect.bottom + 6,
        left: align === 'start' ? rect.left : undefined,
        right: align === 'end' ? window.innerWidth - rect.right : undefined,
        zIndex: 60,
      }
    : { position: 'fixed', top: 0, left: 0 }
  return (
    <div id="popover-panel" className={cn('rounded-lg border border-zinc-200 bg-white shadow-lg', className)} style={style}>
      {children}
    </div>
  )
}

/* ============================== Command（轻量命令面板） ============================== */

interface CommandCtx {
  query: string
  setQuery: (v: string) => void
  itemCount: number
  setItemCount: React.Dispatch<React.SetStateAction<number>>
}
const CommandContext = createContext<CommandCtx | null>(null)

export function Command({ className, children }: { className?: string; children?: ReactNode }) {
  const [query, setQuery] = useState('')
  const [itemCount, setItemCount] = useState(0)
  return (
    <CommandContext.Provider value={{ query, setQuery, itemCount, setItemCount }}>
      <div className={cn('overflow-hidden rounded-lg border border-zinc-200 bg-white', className)}>
        {children}
      </div>
    </CommandContext.Provider>
  )
}

export function CommandInput({
  placeholder,
  className,
}: {
  placeholder?: string
  className?: string
}) {
  const ctx = useContext(CommandContext)
  if (!ctx) return null
  return (
    <input
      autoFocus
      placeholder={placeholder}
      className={cn('w-full border-b border-zinc-200 px-3 py-2 text-sm outline-none', className)}
      onChange={(e) => ctx.setQuery(e.target.value)}
    />
  )
}

export function CommandList({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={cn('max-h-60 overflow-y-auto overflow-x-hidden', className)}>{children}</div>
  )
}

export function CommandEmpty({ children }: { children?: ReactNode }) {
  const ctx = useContext(CommandContext)
  if (!ctx || ctx.query === '' || ctx.itemCount > 0) return null
  return <div className="px-3 py-4 text-center text-xs text-zinc-400">{children}</div>
}

export function CommandGroup({
  heading,
  children,
}: {
  heading?: string
  children?: ReactNode
}) {
  return (
    <div className="py-1">
      {heading ? (
        <div className="px-3 py-1 text-[11px] font-medium text-zinc-400">{heading}</div>
      ) : null}
      {children}
    </div>
  )
}

export function CommandItem({
  value,
  onSelect,
  className,
  children,
}: {
  value?: string
  onSelect?: (value: string) => void
  className?: string
  children?: ReactNode
}) {
  const ctx = useContext(CommandContext)
  useEffect(() => {
    if (!ctx) return
    ctx.setItemCount((count) => count + 1)
    return () => ctx.setItemCount((count) => Math.max(0, count - 1))
  }, [ctx])
  return (
    <div
      className={cn('cursor-pointer px-3 py-1.5 text-sm hover:bg-zinc-100', className)}
      onClick={() => onSelect?.(value ?? '')}
    >
      {children}
    </div>
  )
}

/* ============================== Select ============================== */

interface SelectCtx {
  value: string | undefined
  setValue: (v: string) => void
  open: boolean
  setOpen: (v: boolean) => void
  labels: Map<string, string>
  registerLabel: (value: string, label: string) => void
}
const SelectContext = createContext<SelectCtx | null>(null)

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string
  onValueChange?: (v: string) => void
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const labels = useRef(new Map<string, string>()).current
  const [, force] = useState(0)
  return (
    <SelectContext.Provider
      value={{
        value,
        setValue: (v) => {
          onValueChange?.(v)
          setOpen(false)
        },
        open,
        setOpen,
        labels,
        registerLabel: (v, l) => {
          if (labels.get(v) !== l) {
            labels.set(v, l)
            force((x) => x + 1)
          }
        },
      }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ className, children }: { className?: string; children?: ReactNode }) {
  const ctx = useContext(SelectContext)
  if (!ctx) return null
  return (
    <button
      type="button"
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-zinc-300 bg-white px-2 text-sm',
        className,
      )}
      onClick={() => ctx.setOpen(!ctx.open)}
    >
      {children}
      <ChevronsUpDown className="size-3.5 text-zinc-400" />
    </button>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = useContext(SelectContext)
  if (!ctx) return null
  return <span>{ctx.value ? (ctx.labels.get(ctx.value) ?? ctx.value) : (placeholder ?? '')}</span>
}

export function SelectContent({ className, children }: { className?: string; children?: ReactNode }) {
  const ctx = useContext(SelectContext)
  if (!ctx || !ctx.open) return null
  return (
    <div
      className={cn(
        'absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SelectGroup({ children }: { children?: ReactNode }) {
  return <div>{children}</div>
}

export function SelectLabel({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn('px-2 py-1 text-[11px] font-medium text-zinc-400', className)}>{children}</div>
}

export function SelectItem({
  value,
  children,
}: {
  value: string
  children?: ReactNode
}) {
  const ctx = useContext(SelectContext)
  if (!ctx) return null
  const label = typeof children === 'string' ? children : value
  useEffect(() => {
    ctx.registerLabel(value, label)
  }, [value, label])
  return (
    <div
      className="flex cursor-pointer items-center justify-between px-2 py-1.5 text-sm hover:bg-zinc-100"
      onClick={() => ctx.setValue(value)}
    >
      {children}
      {ctx.value === value ? <Check className="size-3.5 text-blue-600" /> : null}
    </div>
  )
}
