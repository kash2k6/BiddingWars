'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

interface ChatMessage {
  id: string
  auction_id: string
  user_id: string
  user_name?: string
  message: string
  experience_id: string
  created_at: string
}

interface AuctionChatProps {
  auctionId: string
  experienceId: string
  currentUserId: string
  currentUserName?: string
  isWinner: boolean
  isSeller: boolean
}

export default function AuctionChat({
  auctionId,
  experienceId,
  currentUserId,
  currentUserName,
  isWinner,
  isSeller
}: AuctionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Only show chat if user is winner or seller
  if (!isWinner && !isSeller) {
    return null
  }

  useEffect(() => {
    fetchMessages()
    subscribeToMessages()
    
    return () => {
      if (subscribed) {
        supabase.removeAllSubscriptions()
      }
    }
  }, [auctionId])

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('auction_chat')
        .select('*')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        return
      }

      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`auction-chat-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auction_chat',
          filter: `auction_id=eq.${auctionId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          setMessages(prev => [...prev, newMessage])
          
          // Auto-scroll to bottom
          setTimeout(() => {
            if (scrollAreaRef.current) {
              scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
            }
          }, 100)
        }
      )
      .subscribe()

    setSubscribed(true)
    return subscription
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('auction_chat')
        .insert({
          auction_id: auctionId,
          user_id: currentUserId,
          user_name: currentUserName || 'Anonymous',
          message: newMessage.trim(),
          experience_id: experienceId
        })

      if (error) {
        console.error('Error sending message:', error)
        return
      }

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" />
          Auction Chat
          {(isWinner || isSeller) && (
            <span className="text-sm text-muted-foreground">
              {isWinner && isSeller ? '(You are both winner and seller)' : 
               isWinner ? '(You won this auction)' : '(You created this auction)'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <ScrollArea 
          ref={scrollAreaRef}
          className="h-64 w-full border rounded-md p-4"
        >
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isOwnMessage = message.user_id === currentUserId
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getUserInitials(message.user_name || 'User')}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {message.user_name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-lg max-w-xs break-words ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {message.message}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !newMessage.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
