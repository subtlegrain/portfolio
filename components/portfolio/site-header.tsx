'use client'

import { useEffect, useRef, useState } from 'react'
import { ThemeToggle } from './theme-toggle'

const navigation = [
  { label: 'About', id: 'about' },
  { label: 'Experience', id: 'experience' },
  { label: 'Education', id: 'education' },
  { label: 'Projects', id: 'projects' },
  { label: 'Skills', id: 'capabilities' },
  { label: 'Looking for', id: 'looking-for', longLabel: "What I'm looking for" },
  { label: 'Contact', id: 'contact' },
]

export function SiteHeader({ basePath = '' }: { basePath?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('home')
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (basePath) return

    const sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id]'))
    if (!sections.length) return

    let frame = 0

    const update = () => {
      frame = 0
      const marker = window.scrollY + window.innerHeight * 0.32
      let current = sections[0].id

      sections.forEach((section) => {
        const top = section.getBoundingClientRect().top + window.scrollY
        if (top <= marker) current = section.id
      })

      setActive(current)
    }

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
    }
  }, [basePath])

  useEffect(() => {
    if (!menuOpen) return

    const previous = document.activeElement as HTMLElement | null
    const body = document.body
    const scrollbar = window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`

    const focusable = () =>
      Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])

    focusable()[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const items = focusable()
      if (!items.length) return

      const first = items[0]
      const last = items[items.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      body.style.overflow = ''
      body.style.paddingRight = ''
      document.removeEventListener('keydown', onKeyDown)
      if (previous?.isConnected) previous.focus()
    }
  }, [menuOpen])

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="wordmark" href={`${basePath}#home`} aria-label="Sudip Khatri. AI Engineer — home">
          <span className="wordmark-name">
            Sudip Khatri<span className="wordmark-dot">.</span>
          </span>
          <span className="wordmark-role">AI Engineer</span>
        </a>

        <nav className="site-nav" aria-label="Primary navigation">
          {navigation.map((item, index) => (
            <a
              key={item.id}
              href={`${basePath}#${item.id}`}
              aria-current={!basePath && active === item.id ? 'location' : undefined}
            >
              <span className="nav-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <button
            ref={menuButtonRef}
            type="button"
            className="menu-button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            <span>Menu</span>
            <span className="menu-glyph" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-menu" id="mobile-menu" ref={menuRef} role="dialog" aria-modal="true" aria-label="Site menu">
          <div className="mobile-menu-bar">
            <span className="wordmark-name">
              Sudip Khatri<span className="wordmark-dot">.</span>
            </span>
            <button type="button" className="menu-close" onClick={() => setMenuOpen(false)}>
              Close <span aria-hidden="true">×</span>
            </button>
          </div>

          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navigation.map((item, index) => (
              <a key={item.id} href={`${basePath}#${item.id}`} onClick={() => setMenuOpen(false)}>
                <span className="mobile-nav-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{item.longLabel ?? item.label}</span>
                <span className="mobile-nav-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            ))}
          </nav>

          <div className="mobile-menu-footer">
            <a href="mailto:sudip33khatri@gmail.com">sudip33khatri@gmail.com</a>
            <div className="mobile-menu-socials">
              <a href="https://github.com/subtlegrain" target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a href="https://linkedin.com/in/sudip-khatri-993b40240" target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <a href="/sudip-khatri-cv.pdf" target="_blank" rel="noreferrer">
                CV
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
