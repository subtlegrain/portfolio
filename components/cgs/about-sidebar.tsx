'use client'

import { useState } from 'react'
import { AppSidebar } from '@/components/cgs/app-sidebar'

export function AboutSidebar() {
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <AppSidebar
      conversations={[]}
      activeConversationId={null}
      historyOpen={historyOpen}
      onNewGeneration={() => {}}
      onToggleHistory={() => setHistoryOpen((open) => !open)}
      onSelectConversation={() => {}}
    />
  )
}
