import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-200 shadow-sm',
      hover && 'hover:border-green-400 hover:shadow-md transition-all cursor-pointer',
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4 border-b border-gray-100', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-sm font-semibold text-gray-700', className)}>{children}</h3>
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>
}
