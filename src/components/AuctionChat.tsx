'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, MessageCircle, Users } from 'lucide-react'
import { supabaseClient as supabase } from '@/lib/supabase-client'

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
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState('Loading...')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Show chat for everyone participating in the auction
  // No restrictions - all users can participate in the chat

  useEffect(() => {
    console.log('Chat component mounted for auction:', auctionId)
    console.log('Current user ID:', currentUserId)
    console.log('Is winner:', isWinner, 'Is seller:', isSeller)
    
    fetchUserInfo()
    fetchMessages()
    subscribeToMessages()
    
    return () => {
      if (subscribed) {
        console.log('Cleaning up subscriptions')
        // Note: removeAllSubscriptions is not available in current Supabase version
        // Subscriptions will be cleaned up automatically when component unmounts
      }
    }
  }, [auctionId, currentUserId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const fetchUserInfo = async () => {
    try {
      console.log('Fetching user info for:', currentUserId)
      const response = await fetch(`/api/whop/user-info?userId=${currentUserId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('User info response:', data)
        if (data.success && data.user) {
          const displayName = data.user.username || 
                             `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() ||
                             data.user.email?.split('@')[0] ||
                             'Anonymous'
          console.log('Setting display name to:', displayName)
          setCurrentUserDisplayName(displayName)
        }
      } else {
        console.error('Failed to fetch user info:', response.status)
        setCurrentUserDisplayName('Anonymous')
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
      setCurrentUserDisplayName('Anonymous')
    }
  }

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages for auction:', auctionId)
      const { data, error } = await supabase
        .from('auction_chat')
        .select('*')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching messages:', error)
        return
      }
      
      console.log('Fetched messages:', data)
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const subscribeToMessages = () => {
    console.log('Setting up real-time subscription for auction:', auctionId)
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
          console.log('New message received:', payload)
          const newMessage = payload.new as ChatMessage
          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        setSubscribed(status === 'SUBSCRIBED')
      })

    return subscription
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    setLoading(true)
    try {
      console.log('Sending message:', {
        auction_id: auctionId,
        user_id: currentUserId,
        user_name: currentUserDisplayName,
        message: newMessage.trim(),
        experience_id: experienceId
      })

      const { error } = await supabase
        .from('auction_chat')
        .insert({
          auction_id: auctionId,
          user_id: currentUserId,
          user_name: currentUserDisplayName,
          message: newMessage.trim(),
          experience_id: experienceId
        })

      if (error) {
        console.error('Error sending message:', error)
        return
      }

      console.log('Message sent successfully')
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newMessage.trim()) {
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
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {isWinner && isSeller ? '(You are both winner and seller)' : 
               isWinner ? '(You won this auction)' : 
               isSeller ? '(You created this auction)' : 
               '(Public chat - everyone can participate)'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages - Made taller for better visibility */}
        <ScrollArea 
          ref={scrollAreaRef}
          className="h-96 w-full border rounded-md p-4"
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
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Type your message as ${currentUserDisplayName}...`}
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
