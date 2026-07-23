import { useEffect, useState } from 'react'
import { cn } from '../lib/format'

type ConnectionStatusProps = {
  className?: string
}

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const updateConnectionStatus = () => setIsOnline(navigator.onLine)

    window.addEventListener('online', updateConnectionStatus)
    window.addEventListener('offline', updateConnectionStatus)

    return () => {
      window.removeEventListener('online', updateConnectionStatus)
      window.removeEventListener('offline', updateConnectionStatus)
    }
  }, [])

  return (
    <div
      className={cn('sidebar-connection-status', isOnline ? 'is-online' : 'is-offline', className)}
      role="status"
      aria-live="polite"
    >
      <span className="sidebar-connection-status__dot" aria-hidden="true" />
      <span>{isOnline ? 'В сети' : 'Не в сети'}</span>
    </div>
  )
}
