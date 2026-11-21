'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'

export type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

type Props = {
  messages: ChatMessage[]
  onSend: (text: string) => void
}

export function ConversationWorkspace({ messages, onSend }: Props) {
  const [draft, setDraft] = useState('')
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <section className="conversation-workspace" aria-label="AI generation conversation">
      <div className="conversation-log" role="log" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 ? (
          <div className="generation-empty-state">
            <h1>What would you like to generate?</h1>
          </div>
        ) : (
          <div className="generation-messages">
            {messages.map((message) => (
              <article key={message.id} className={`generation-message ${message.role}`}>
                {message.role === 'assistant' && <div className="generation-message-label">CGS</div>}
                <div className="generation-message-content">{message.text}</div>
              </article>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
      <div className="generation-composer-dock">
        <form
          className="generation-composer"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <textarea
            ref={textareaRef}
            aria-label="Message CGS"
            placeholder="Ask CGS to generate course content…"
            rows={1}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              event.target.style.height = 'auto'
              event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`
            }}
            onKeyDown={onKeyDown}
          />
          <button type="submit" className="generation-send" aria-label="Send message" disabled={!draft.trim()}>
            <ArrowUp aria-hidden="true" />
          </button>
        </form>
        <p className="generation-composer-hint">Enter to send · Shift + Enter for a new line</p>
      </div>
    </section>
  )
}
