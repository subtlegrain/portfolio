'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
    setTheme(current)
    setReady(true)
  }, [])

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    document.documentElement.style.colorScheme = next
    try {
      window.localStorage.setItem('sk-theme', next)
    } catch {
      // Storage can be unavailable in private browsing; the theme still applies for this visit.
    }
  }

  const label = ready ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme` : 'Switch colour theme'

  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <Sun className="theme-icon theme-icon-sun" aria-hidden="true" strokeWidth={1.5} />
      <Moon className="theme-icon theme-icon-moon" aria-hidden="true" strokeWidth={1.5} />
    </button>
  )
}
