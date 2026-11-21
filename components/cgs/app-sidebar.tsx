'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSidebar } from '@/components/ui/sidebar'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { BookOpenText, ChevronDown, History, Plus } from 'lucide-react'

type ConversationSummary = { id: string; title: string }

type Props = {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  historyOpen: boolean
  onNewGeneration: () => void
  onToggleHistory: () => void
  onSelectConversation: (id: string) => void
}

export function AppSidebar({
  conversations,
  activeConversationId,
  historyOpen,
  onNewGeneration,
  onToggleHistory,
  onSelectConversation,
}: Props) {
  const { isMobile, setOpenMobile } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()

  const selectConversation = (id: string) => {
    onSelectConversation(id)
    if (isMobile) setOpenMobile(false)
  }

  const startNewGeneration = () => {
    if (pathname !== '/') {
      router.push('/')
    } else {
      onNewGeneration()
    }
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="generation-sidebar-header">
        <div className="generation-wordmark">CGS</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={startNewGeneration} tooltip="New generation">
                  <Plus />
                  <span>New Generation</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onToggleHistory} isActive={historyOpen} tooltip="History">
                  <History />
                  <span>History</span>
                  <ChevronDown className={`generation-history-chevron ${historyOpen ? 'is-open' : ''}`} />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/about" onClick={() => isMobile && setOpenMobile(false)} />}
                  isActive={pathname === '/about'}
                  tooltip="About CGS"
                >
                  <BookOpenText />
                  <span>About CGS</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {historyOpen && (
          <SidebarGroup className="generation-history-group">
            <SidebarGroupLabel>Previous conversations</SidebarGroupLabel>
            <SidebarGroupContent>
              {conversations.length ? (
                <SidebarMenu>
                  {conversations.map((conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <SidebarMenuButton
                        isActive={activeConversationId === conversation.id}
                        onClick={() => selectConversation(conversation.id)}
                        tooltip={conversation.title}
                      >
                        <span className="generation-history-title">{conversation.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              ) : (
                <p className="generation-history-empty">No conversations yet</p>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
