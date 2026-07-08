// @ts-nocheck

import React, { useState, useEffect, useRef, useCallback, lazy, Suspense, useMemo } from 'react';
import {
  Search,
  Send,
  Paperclip,
  Smile,
  MessageSquare,
  MoreVertical,
  SquarePen,
  X,
  Phone,
  Check,
  AlertCircle,
  RefreshCw,
  UserPlus,
  FileText,
} from 'lucide-react';
import { AddContactModal } from '../components/AddContactModal';
import SmsTemplatesModal from '../components/SmsTemplatesModal';
import { toast } from 'react-hot-toast';
import { type EmojiClickData } from 'emoji-picker-react';
const EmojiPicker = lazy(() => import('emoji-picker-react'));

import { io, Socket } from 'socket.io-client';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { useTheme } from '../context/ThemeContext';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Conversation {
  id: string;
  phoneNumber: string;
  name: string;
  avatar: string;
  lastMessage: string;
  unread: number;
  online?: boolean;
  time?: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  time: string;
  clientId: string;
  failed?: boolean;
  sending?: boolean;
}

interface ContactPhone {
  id: number;
  numberE164: string;
  label: string;
  isPrimary: boolean;
  isBlocked: boolean;
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  nickName?: string;
  company?: string;
  email?: string;
  phones: ContactPhone[];
  addresses: { city?: string; state?: string }[];
}

// ─── API HELPERS ──────────────────────────────────────────────────────────────
const fetchConversationsList = async (): Promise<Conversation[]> => {
  const { data } = await api.get('/message/list');
  return data.success ? data.conversations : [];
};

const fetchConversation = async (phoneNumber: string): Promise<Message[]> => {
  const { data } = await api.get(
    `/message/conversation/${encodeURIComponent(normalizePhone(phoneNumber))}`
  );

  return data.success ? (data.messages || []).map(normalizeMessage) : [];
};

const sendMessageAPI = async (to: string, text: string, clientId: string) => {
  const { data } = await api.post('/message/send', { to, body: text, clientId });
  return data;
};

const markAsRead = async (phoneNumber: string) => {
  try {
    await api.patch(`/message/conversations/${encodeURIComponent(phoneNumber)}/read`);
  } catch {
    // silent fail — UI already updated optimistically
  }
};
const normalizePhone = (num?: string) => {
  if (!num) return '';
  return String(num).replace(/\s+/g, '').trim();
};

const normalizeMessage = (message: any): Message => {
  const id = message?.id || message?.clientId || `msg-${Date.now()}-${Math.random()}`;

  return {
    id,
    clientId: message?.clientId || id,
    text: message?.text || message?.body || '',
    sender: message?.sender === 'me' ? 'me' : 'them',
    time: message?.time || message?.createdAt || new Date().toISOString(),
    failed: Boolean(message?.failed),
    sending: Boolean(message?.sending),
  };
};

// ─── COMPOSE MODAL ────────────────────────────────────────────────────────────
function ComposeModal({
  onClose,
  token,
  isDark,
  onSent,
}: {
  onClose: () => void;
  token: string;
  isDark: boolean;
  onSent?: (payload: { phoneNumber: string; body: string }) => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedPhone, setSelectedPhone] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/contacts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setContacts(res.data.data || []);
      } catch {
        setContacts([]);
      } finally {
        setLoadingContacts(false);
      }
    })();
  }, [token]);

  const filteredContacts = contacts.filter((c) => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const q = search.toLowerCase();
    return (
      fullName.includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      c.phones.some((p) => p.numberE164.includes(search))
    );
  });

  const getInitials = (c: Contact) =>
    `${c.firstName?.[0] || ''}${c.lastName?.[0] || ''}`.toUpperCase() || '?';

  const getFullName = (c: Contact) =>
    `${c.firstName} ${c.lastName}`.trim() || c.nickName || 'Unknown';

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    const primary = contact.phones.find((p) => p.isPrimary) || contact.phones[0];
    setSelectedPhone(primary?.numberE164 || '');
    setManualNumber('');
    setError('');
    setTimeout(() => bodyRef.current?.focus(), 80);
  };

  const handleSend = async () => {
    const to = (selectedContact ? selectedPhone : manualNumber).trim();
    if (!to) {
      setError('Please select a contact or enter a phone number.');
      return;
    }
    if (!body.trim()) {
      setError('Message body cannot be empty.');
      return;
    }

    setSending(true);
    setError('');
    try {
      const clientId = `compose-${Date.now()}`;
      const result = await sendMessageAPI(to, body.trim(), clientId);
      if (result.success) {
        setSent(true);
      
        onSent?.({
          phoneNumber: normalizePhone(to),
          body: body.trim(),
        });
      
        setTimeout(onClose, 900);
      }else {
        setError(result.message || 'Failed to send. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="cm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cm-modal">
        {/* Header */}
        <div className="cm-header">
          <div className="cm-header-left">
            <SquarePen size={17} color={isDark ? '#7C7CF0' : '#4f46e5'} />
            <span className="cm-title">New Message</span>
          </div>
          <button className="cm-close-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="cm-body">
          {/* ── Left: Contact list ── */}
          <div className="cm-left">
            <div className="cm-left-search-wrap">
              <Search size={13} className="cm-left-search-icon" />
              <input
                className="cm-left-search"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="cm-contact-list">
              {loadingContacts ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="cm-skel-row">
                    <div className="cm-skel-av" />
                    <div style={{ flex: 1 }}>
                      <div className="cm-skel" style={{ width: '68%', height: 11, marginBottom: 6 }} />
                      <div className="cm-skel" style={{ width: '48%', height: 9 }} />
                    </div>
                  </div>
                ))
              ) : filteredContacts.length === 0 ? (
                <div className="cm-no-contacts">No contacts found</div>
              ) : (
                filteredContacts.map((contact) => {
                  const isActive = selectedContact?.id === contact.id;
                  const primary =
                    contact.phones.find((p) => p.isPrimary) || contact.phones[0];
                  return (
                    <div
                      key={contact.id}
                      className={`cm-contact-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectContact(contact)}
                    >
                      <div className="cm-contact-av">{getInitials(contact)}</div>
                      <div className="cm-contact-info">
                        <div className="cm-contact-name">{getFullName(contact)}</div>
                        {primary && (
                          <div className="cm-contact-num">
                            <Phone size={9} />
                            {primary.numberE164}
                          </div>
                        )}
                        {contact.company && (
                          <div className="cm-contact-co">{contact.company}</div>
                        )}
                      </div>
                      {isActive && (
                        <div className="cm-check-badge">
                          <Check size={11} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right: Compose ── */}
          <div className="cm-right">
            {/* To field */}
            <div className="cm-field">
              <div className="cm-field-label">To</div>
              {selectedContact ? (
                <div className="cm-pill">
                  <div className="cm-pill-av">{getInitials(selectedContact)}</div>
                  <div className="cm-pill-info">
                    <span className="cm-pill-name">{getFullName(selectedContact)}</span>
                    {selectedContact.phones.length > 1 ? (
                      <select
                        className="cm-pill-select"
                        value={selectedPhone}
                        onChange={(e) => setSelectedPhone(e.target.value)}
                      >
                        {selectedContact.phones.map((p) => (
                          <option key={p.id} value={p.numberE164}>
                            {p.numberE164} · {p.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="cm-pill-phone">{selectedPhone}</span>
                    )}
                  </div>
                  <button
                    className="cm-pill-remove"
                    onClick={() => {
                      setSelectedContact(null);
                      setSelectedPhone('');
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <input
                  className="cm-to-input"
                  placeholder="Or type number directly (e.g. +923001234567)"
                  value={manualNumber}
                  onChange={(e) => {
                    setManualNumber(e.target.value);
                    setError('');
                  }}
                />
              )}
            </div>

            {/* Message body */}
            <div className="cm-field cm-body-field">
              <div className="cm-field-label">Message</div>
              <textarea
                ref={bodyRef}
                className="cm-textarea"
                placeholder="Write your message..."
                value={body}
                rows={6}
                maxLength={750}
                onChange={(e) => {
                  if (e.target.value.length <= 750) {
                    setBody(e.target.value);
                    setError('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) handleSend();
                }}
              />
              <div
                className={`cm-char ${
                  body.length >= 750 ? 'over' : body.length >= 700 ? 'warn' : ''
                }`}
              >
                {body.length} / 750
              </div>
            </div>

            {/* Error */}
            {error && <div className="cm-error">{error}</div>}

            {/* Footer */}
            <div className="cm-footer">
              <span className="cm-hint">⌘ + Enter to send</span>
              <button
                className={`cm-send-btn ${sent ? 'sent' : ''}`}
                onClick={handleSend}
                disabled={sending || sent || !body.trim() || body.length > 750}
              >
                {sent ? (
                  <>
                    <Check size={14} /> Sent!
                  </>
                ) : sending ? (
                  <>
                    <span className="cm-spinner" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Messages() {
  const { user, token } = useAuth();
  const { resetMessage } = useCall();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesVisible, setMessagesVisible] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);
  // SMS Templates
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<{ title: string; body: string } | null>(null);
  const canUseTemplates = user?.role === 'ADMIN' || (user as any)?.additionalRole?.smsTemplates === true;
  // Contacts for known-number detection (separate from ComposeModal's contacts)
  const [knownContacts, setKnownContacts] = useState<Contact[]>([]);

  // Set of all contact phone numbers for O(1) lookup
  const contactPhoneSet = useMemo(() => {
    const s = new Set<string>();
    knownContacts.forEach(c => c.phones.forEach(p => { if (p.numberE164) s.add(p.numberE164); }));
    return s;
  }, [knownContacts]);

  const isKnownContact = (phone: string) => !!phone && contactPhoneSet.has(phone);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ✅ FIX: Ref always has latest selectedChat — prevents stale closure in socket handlers
  const selectedChatRef = useRef<Conversation | null>(null);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Close header menu on outside click
  useEffect(() => {
    if (!showHeaderMenu) return;
    const handler = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setShowHeaderMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showHeaderMenu]);

  // Add to Contact handler — same API as Contact.tsx
  const handleAddContact = async (data: any) => {
    try {
      await api.post('/contacts', {
        firstName: data.firstName,
        lastName: data.lastName,
        nickName: data.nickName,
        company: data.company,
        title: data.title,
        email: data.email || null,
        source: data.source,
        birthdate: data.birthdate || null,
        website: data.website || null,
        notes: data.notes || null,
        addresses: data.addresses?.map((a: any) => ({
          address: a.address, city: a.city, state: a.state, zip: a.zip, label: a.label,
        })),
        phones: data.phones.map((p: any) => ({
          numberE164: p.number, label: p.type, isPrimary: false,
        })),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setAddContactOpen(false);
      toast.success('Contact added!');
      // Refresh known contacts so isKnownContact updates immediately
      try {
        const res = await api.get('/contacts', { headers: { Authorization: `Bearer ${token}` } });
        setKnownContacts(res.data.data || []);
      } catch {}
    } catch {
      toast.error('Failed to add contact');
    }
  };

  // Load contacts for known-number detection
  useEffect(() => {
    if (!token) return;
    api.get('/contacts', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setKnownContacts(res.data.data || []))
      .catch(() => {});
  }, [token]);

  // ─── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    socketRef.current = io('https://api.rizingmatrics.com', {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user?.id) return;
    socket.emit('join-user-room', { userId: user.id });
    return () => socket.emit('leave-user-room', { userId: user.id });
  }, [user?.id]);

  // ─── Initial conversations load ────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const convs = await fetchConversationsList();
      if (mounted) setConversations(convs);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    resetMessage();
  }, [conversations]);

  // ─── Real-time socket handlers ─────────────────────────────────────────────
  // ✅ FIX: Empty deps — selectedChatRef gives current value without stale closure
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleNewMessage = ({ phoneNumber, message }: any) => {
      const normalizedPhone = normalizePhone(phoneNumber);
      const incomingMessage = normalizeMessage(message);
    
      const currentSelected = selectedChatRef.current;
      const isChatOpen =
        normalizePhone(currentSelected?.phoneNumber) === normalizedPhone;
    
      if (isChatOpen && incomingMessage.sender === 'them') {
        markAsRead(normalizedPhone);
      }
    
      setMessages((prev) => {
        if (!isChatOpen) return prev;
    
        const exists = prev.some(
          (m) =>
            m.id === incomingMessage.id ||
            m.clientId === incomingMessage.clientId
        );
    
        return exists ? prev : [...prev, incomingMessage];
      });
    
      setConversations((prev) => {
        const idx = prev.findIndex(
          (c) => normalizePhone(c.phoneNumber) === normalizedPhone
        );
    
        const shouldIncreaseUnread =
          incomingMessage.sender === 'them' && !isChatOpen;
    
        if (idx === -1) {
          const displayName = message?.senderName || normalizedPhone;
    
          return [
            {
              id: normalizedPhone,
              phoneNumber: normalizedPhone,
              name: displayName,
              avatar: displayName
                .split(' ')
                .map((p: string) => p[0])
                .join('')
                .substring(0, 2)
                .toUpperCase(),
              lastMessage: incomingMessage.text,
              unread: shouldIncreaseUnread ? 1 : 0,
              online: false,
              time: incomingMessage.time,
            },
            ...prev,
          ];
        }
    
        const updated = [...prev];
    
        updated[idx] = {
          ...updated[idx],
          lastMessage: incomingMessage.text,
          time: incomingMessage.time,
          unread: isChatOpen
            ? 0
            : shouldIncreaseUnread
            ? updated[idx].unread + 1
            : updated[idx].unread,
        };
    
        const [conv] = updated.splice(idx, 1);
        return [conv, ...updated];
      });
    };

    const handleConversationUpdate = (payload: any) => {
      const normalizedPhone = normalizePhone(payload.phoneNumber);
      const currentSelected = selectedChatRef.current;
    
      const isChatOpen =
        normalizePhone(currentSelected?.phoneNumber) === normalizedPhone;
    
      if (isChatOpen) {
        markAsRead(normalizedPhone);
      }
    
      setConversations((prev) => {
        const idx = prev.findIndex(
          (c) => normalizePhone(c.phoneNumber) === normalizedPhone
        );
    
        if (idx === -1) return prev;
    
        const updated = [...prev];
    
        updated[idx] = {
          ...updated[idx],
          lastMessage: payload.lastMessage ?? updated[idx].lastMessage,
          time: payload.time ?? updated[idx].time,
          unread: isChatOpen ? 0 : updated[idx].unread,
        };
    
        const [conv] = updated.splice(idx, 1);
        return [conv, ...updated];
      });
    };

    // ✅ Typing indicator from other agents (optional — backend emit karein)
    const handleTyping = ({ phoneNumber }: { phoneNumber: string }) => {
      if (selectedChatRef.current?.phoneNumber === phoneNumber) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('conversation-update', handleConversationUpdate);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('conversation-update', handleConversationUpdate);
      socket.off('typing', handleTyping);
    };
  }, []); // ✅ Empty deps intentional — ref handles currency

  // ─── Load conversation messages ────────────────────────────────────────────
  const loadMessages = useCallback(async (conv: Conversation) => {
    const normalizedConv = {
      ...conv,
      phoneNumber: normalizePhone(conv.phoneNumber),
      unread: 0,
    };
  
    setSelectedChat(normalizedConv);
    selectedChatRef.current = normalizedConv;
  
    setMessagesVisible(false);
    setLoadingMessages(true);
    setMessages([]);
    setIsTyping(false);
  
    setConversations((prev) =>
      prev.map((c) =>
        normalizePhone(c.phoneNumber) === normalizedConv.phoneNumber
          ? { ...c, unread: 0 }
          : c
      )
    );
  
    markAsRead(normalizedConv.phoneNumber);
  
    try {
      const msgs = await fetchConversation(normalizedConv.phoneNumber);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
  
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
          setMessagesVisible(true);
          inputRef.current?.focus();
        });
      });
    }
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!messagesVisible) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      const wrap = document.querySelector('.msg-emoji-wrap');
      if (wrap && !wrap.contains(e.target as Node)) setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  // ─── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    const hasContent = activeTemplate ? true : !!messageInput.trim();
    if (!hasContent || !selectedChat) return;

    const clientId = `temp-${Date.now()}`;
    // displayText keeps HTML for bubble rendering; smsText is plain text for Twilio
    const displayText = activeTemplate ? activeTemplate.body : messageInput.trim();
    const smsText = activeTemplate
      ? displayText
          .replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/li>/gi, '\n').replace(/<li>/gi, '• ')
          .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
      : displayText;
    setActiveTemplate(null);

    const optimisticMsg: Message = {
      id: clientId,
      clientId,
      text: displayText,
      sender: 'me',
      time: new Date().toISOString(),
      failed: false,
      sending: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageInput('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' }), 0);

    // Update conversation list with latest message (plain text preview)
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.phoneNumber === selectedChat.phoneNumber);
      if (idx === -1) return prev;
      const updated = [...prev];
      const [conv] = updated.splice(idx, 1);
      return [{ ...conv, lastMessage: smsText, time: new Date().toISOString() }, ...updated];
    });

    try {
      const result = await sendMessageAPI(selectedChat.phoneNumber, smsText, clientId);
      if (!result.success) throw new Error(result.message || 'Send failed');

      // ✅ Mark as sent (remove sending state)
      setMessages((prev) =>
      prev.map((m) =>
        m.clientId === clientId
          ? {
              ...m,
              sending: false,
              failed: false,
              id: result.message?.id || result.message?.sid || m.id,
              time: result.message?.createdAt || m.time,
            }
          : m
      )
    );
    } catch (err) {
      console.error('Failed to send:', err);
      // ✅ FIX: Mark failed — shows retry button
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId ? { ...m, failed: true, sending: false } : m
        )
      );
    }
  };

  // ─── Retry failed message ──────────────────────────────────────────────────
  const retryMessage = async (failedMsg: Message) => {
    if (!selectedChat) return;
    const newClientId = `retry-${Date.now()}`;

    setMessages((prev) =>
      prev.map((m) =>
        m.clientId === failedMsg.clientId
          ? { ...m, clientId: newClientId, failed: false, sending: true, time: new Date().toISOString() }
          : m
      )
    );

    try {
      const retrySmsText = /^<[a-z][\s\S]*>/i.test(failedMsg.text)
        ? failedMsg.text.replace(/<\/p>/gi,'\n').replace(/<br\s*\/?>/gi,'\n').replace(/<\/li>/gi,'\n').replace(/<li>/gi,'• ').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/\n{3,}/g,'\n\n').trim()
        : failedMsg.text;
      const result = await sendMessageAPI(selectedChat.phoneNumber, retrySmsText, newClientId);
      if (!result.success) throw new Error(result.message || 'Retry failed');
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === newClientId ? { ...m, sending: false, id: result.message?.id || m.id } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === newClientId ? { ...m, failed: true, sending: false } : m
        )
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === '/' && canUseTemplates && !messageInput && !activeTemplate) {
      e.preventDefault();
      setShowTemplatesModal(true);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessageInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneNumber.includes(searchQuery)
  );

  const formatTime = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatConvTime = (iso: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');
        .msg-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

        /* ── Sidebar ─────────────────────────────────────────────── */
        .msg-sidebar { width:320px;min-width:300px;background:#fff;border-right:1px solid #f0f0f0;display:flex;flex-direction:column;height:100%; }
        .msg-sidebar-header { padding:20px 18px 14px;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;justify-content:space-between; }
        .msg-title { font-size:20px;font-weight:600;color:#111;letter-spacing:-0.4px; }
        .msg-compose-btn { width:34px;height:34px;border-radius:50%;border:none;background:#f0f4ff;color:#4f46e5;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s,transform 0.1s; }
        .msg-compose-btn:hover { background:#e0e7ff;transform:scale(1.06); }
        .msg-compose-btn:active { transform:scale(0.95); }

        .msg-search-wrap { padding:10px 14px;position:relative; }
        .msg-search { width:100%;background:#f7f7f8;border:1.5px solid transparent;border-radius:10px;padding:8px 12px 8px 36px;font-size:13px;color:#222;outline:none;transition:border-color 0.15s;font-family:'DM Sans',sans-serif; }
        .msg-search:focus { background:#fff;border-color:#d0d0d0; }
        .msg-search-icon { position:absolute;left:24px;top:50%;transform:translateY(-50%);color:#bbb;pointer-events:none; }

        .msg-conv-list { flex:1;overflow-y:auto;padding:6px 8px 12px;scrollbar-width:thin;scrollbar-color:#eee transparent; }
        .msg-conv-item { display:flex;align-items:center;gap:12px;padding:10px 11px;border-radius:12px;cursor:pointer;transition:background 0.12s;position:relative; }
        .msg-conv-item:hover { background:#f7f7f8; }
        .msg-conv-item.active { background:#f0f4ff; }

        .msg-avatar { width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;flex-shrink:0;position:relative; }
        .msg-avatar.sm { width:40px;height:40px;font-size:13px; }
        .msg-online-dot { position:absolute;bottom:1px;right:1px;width:10px;height:10px;background:#22c55e;border:2px solid #fff;border-radius:50%; }
        .msg-conv-info { flex:1;min-width:0; }
        .msg-conv-name { font-size:13.5px;font-weight:500;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .msg-conv-last { font-size:12px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px; }
        .msg-conv-meta { display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0; }
        .msg-conv-time { font-size:10.5px;color:#ccc;font-family:'DM Mono',monospace;white-space:nowrap; }
        .msg-unread-badge { background:#4f46e5;color:#fff;font-size:10px;font-weight:600;min-width:18px;height:18px;border-radius:9px;padding:0 5px;display:flex;align-items:center;justify-content:center; }

        /* ── Main ───────────────────────────────────────────────── */
        .msg-main { flex:1;display:flex;flex-direction:column;background:#fafafa;min-width:0; }
        .msg-chat-header { background:#fff;border-bottom:1px solid #f0f0f0;padding:13px 20px;display:flex;align-items:center;gap:13px; }
        .msg-header-info { flex:1; }
        .msg-header-name { font-size:15px;font-weight:600;color:#111;letter-spacing:-0.2px; }
        .msg-header-status { font-size:12px;color:#aaa;margin-top:1px; }
        .msg-header-online { color:#22c55e;font-weight:500; }
        .msg-icon-btn { width:36px;height:36px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#999;transition:background 0.12s,color 0.12s; }
        .msg-icon-btn:hover { background:#f5f5f5;color:#333; }

        .msg-messages-area { flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:3px;scrollbar-width:thin;scrollbar-color:#e0e0e0 transparent;transition:opacity 0.2s ease; }
        .msg-messages-area.hidden { opacity:0;pointer-events:none; }
        .msg-messages-area.visible { opacity:1; }

        .msg-loading-wrap { flex:1;display:flex;flex-direction:column;gap:14px;padding:24px;justify-content:flex-end; }
        .msg-skel { height:38px;border-radius:16px;background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .msg-date-sep { text-align:center;margin:14px 0 10px; }
        .msg-date-sep span { font-size:11px;color:#ccc;background:#f0f0f0;padding:3px 12px;border-radius:20px;font-weight:500; }

        .msg-row { display:flex;margin-bottom:1px; }
        .msg-row.me { justify-content:flex-end; }
        .msg-row.them { justify-content:flex-start; }

        .msg-bubble { max-width:62%;padding:10px 14px;border-radius:18px;font-size:13.5px;line-height:1.55;word-break:break-word;white-space:pre-wrap;position:relative;transition:opacity 0.2s; }
        .msg-bubble.me { background:#4f46e5;color:#fff;border-bottom-right-radius:4px; }
        .msg-bubble.them { background:#fff;color:#222;border-bottom-left-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.07); }
        .msg-bubble.me.sending { opacity:0.65; }
        .msg-bubble.me.failed { background:#ef4444;opacity:0.85; }
        .msg-time { font-size:10px;margin-top:4px;text-align:right;opacity:0.55;font-family:'DM Mono',monospace;display:flex;align-items:center;justify-content:flex-end;gap:5px; }
        .msg-retry-btn { background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.9);font-size:10px;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:3px;padding:0;opacity:0.9;transition:opacity 0.15s; }
        .msg-retry-btn:hover { opacity:1; }

        /* Typing indicator */
        .msg-typing { display:flex;align-items:center;gap:4px;padding:10px 14px;background:#fff;border-radius:18px;border-bottom-left-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.07);width:fit-content;margin-top:4px; }
        .msg-typing-dot { width:7px;height:7px;border-radius:50%;background:#ccc;animation:typingPulse 1.2s ease-in-out infinite; }
        .msg-typing-dot:nth-child(2) { animation-delay:0.2s; }
        .msg-typing-dot:nth-child(3) { animation-delay:0.4s; }
        @keyframes typingPulse { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1);opacity:1} }

        .msg-footer { background:#fff;border-top:1px solid #f0f0f0;padding:13px 20px;position:relative; }
        .msg-input-row { display:flex;align-items:center;gap:9px;background:#f7f7f8;border:1.5px solid transparent;border-radius:14px;padding:5px 7px 5px 14px;transition:border-color 0.15s,background 0.15s; }
        .msg-input-row:focus-within { background:#fff;border-color:#d0d0d0; }
        .msg-text-input { flex:1;background:transparent;border:none;outline:none;font-size:13.5px;color:#222;padding:7px 0;font-family:'DM Sans',sans-serif; }
        .msg-text-input::placeholder { color:#bbb; }
        .msg-send-btn { width:36px;height:36px;border-radius:10px;background:#4f46e5;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;transition:background 0.15s,transform 0.1s;flex-shrink:0; }
        .msg-send-btn:hover { background:#4338ca; }
        .msg-send-btn:active { transform:scale(0.95); }
        .msg-send-btn:disabled { background:#e0e0e0;cursor:not-allowed; }
        .msg-emoji-wrap { position:absolute;bottom:74px;right:20px;z-index:50;box-shadow:0 8px 32px rgba(0,0,0,0.12);border-radius:16px;overflow:hidden; }

        .msg-empty { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center; }
        .msg-empty-icon { width:72px;height:72px;border-radius:50%;background:#f0f4ff;display:flex;align-items:center;justify-content:center;margin-bottom:18px; }
        .msg-empty h3 { font-size:17px;font-weight:600;color:#222;margin:0 0 8px; }
        .msg-empty p { font-size:13px;color:#aaa;max-width:240px;line-height:1.6;margin:0 0 20px; }
        .msg-empty-compose { display:flex;align-items:center;gap:7px;padding:9px 18px;background:#4f46e5;color:#fff;border:none;border-radius:10px;font-size:13.5px;font-weight:500;cursor:pointer;transition:background 0.15s;font-family:'DM Sans',sans-serif; }
        .msg-empty-compose:hover { background:#4338ca; }
        .msg-no-convs { padding:32px 16px;text-align:center;color:#bbb;font-size:13px; }
        .msg-char-counter { font-size:10.5px;text-align:right;padding-right:4px;margin-top:5px;font-family:'DM Mono',monospace;transition:color 0.15s; }

        /* ── Compose Modal ──────────────────────────────────────── */
        .cm-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.32);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:cmFadeIn 0.15s ease; }
        @keyframes cmFadeIn { from{opacity:0} to{opacity:1} }
        .cm-modal { background:#fff;border-radius:18px;width:100%;max-width:780px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.16);animation:cmUp 0.2s ease;overflow:hidden; }
        @keyframes cmUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .cm-header { padding:15px 20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0; }
        .cm-header-left { display:flex;align-items:center;gap:9px; }
        .cm-title { font-size:15px;font-weight:600;color:#111; }
        .cm-close-btn { width:30px;height:30px;border-radius:50%;border:none;background:#f5f5f5;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#666;transition:background 0.12s; }
        .cm-close-btn:hover { background:#ebebeb; }
        .cm-body { display:flex;flex:1;min-height:0;overflow:hidden; }
        .cm-left { width:260px;min-width:240px;border-right:1px solid #f0f0f0;display:flex;flex-direction:column; }
        .cm-left-search-wrap { padding:10px 12px;position:relative;flex-shrink:0; }
        .cm-left-search-icon { position:absolute;left:22px;top:50%;transform:translateY(-50%);color:#bbb;pointer-events:none; }
        .cm-left-search { width:100%;background:#f7f7f8;border:1.5px solid transparent;border-radius:9px;padding:8px 10px 8px 32px;font-size:12.5px;color:#222;outline:none;font-family:'DM Sans',sans-serif;transition:border-color 0.15s; }
        .cm-left-search:focus { background:#fff;border-color:#d0d0d0; }
        .cm-contact-list { flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#eee transparent; }
        .cm-contact-list::-webkit-scrollbar { width:3px; }
        .cm-contact-list::-webkit-scrollbar-thumb { background:#eee;border-radius:3px; }
        .cm-skel-row { display:flex;align-items:center;gap:10px;padding:10px 12px; }
        .cm-skel-av { width:36px;height:36px;border-radius:50%;background:#f0f0f0;flex-shrink:0; }
        .cm-skel { border-radius:6px;background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite; }
        .cm-contact-item { display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;transition:background 0.1s;border-left:3px solid transparent; }
        .cm-contact-item:hover { background:#f7f7f8; }
        .cm-contact-item.active { background:#f0f4ff;border-left-color:#4f46e5; }
        .cm-contact-av { width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;flex-shrink:0; }
        .cm-contact-info { flex:1;min-width:0; }
        .cm-contact-name { font-size:13px;font-weight:500;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .cm-contact-num { font-size:11px;color:#888;display:flex;align-items:center;gap:3px;margin-top:2px;font-family:'DM Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .cm-contact-co { font-size:10.5px;color:#ccc;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .cm-check-badge { width:20px;height:20px;border-radius:50%;background:#4f46e5;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0; }
        .cm-no-contacts { padding:24px 16px;text-align:center;font-size:12.5px;color:#bbb; }
        .cm-right { flex:1;display:flex;flex-direction:column;padding:16px 20px;gap:14px;min-width:0;overflow-y:auto; }
        .cm-field { display:flex;flex-direction:column;gap:6px; }
        .cm-body-field { flex:1; }
        .cm-field-label { font-size:10.5px;font-weight:600;color:#bbb;text-transform:uppercase;letter-spacing:0.5px; }
        .cm-to-input { background:#f7f7f8;border:1.5px solid transparent;border-radius:10px;padding:10px 13px;font-size:13.5px;color:#222;outline:none;font-family:'DM Sans',sans-serif;transition:border-color 0.15s; }
        .cm-to-input:focus { background:#fff;border-color:#d0d0d0; }
        .cm-to-input::placeholder { color:#ccc; }
        .cm-pill { display:flex;align-items:center;gap:10px;background:#f0f4ff;border:1.5px solid #e0e7ff;border-radius:10px;padding:8px 12px; }
        .cm-pill-av { width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:600;flex-shrink:0; }
        .cm-pill-info { flex:1;min-width:0; }
        .cm-pill-name { font-size:13.5px;font-weight:500;color:#111;display:block; }
        .cm-pill-phone { font-size:11.5px;color:#888;font-family:'DM Mono',monospace; }
        .cm-pill-select { font-size:11.5px;color:#666;background:transparent;border:none;outline:none;margin-top:2px;cursor:pointer;font-family:'DM Mono',monospace;max-width:100%; }
        .cm-pill-remove { width:24px;height:24px;border-radius:50%;border:none;background:#e0e7ff;color:#4f46e5;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.12s;flex-shrink:0; }
        .cm-pill-remove:hover { background:#c7d2fe; }
        .cm-textarea { resize:none;background:#f7f7f8;border:1.5px solid transparent;border-radius:12px;padding:12px 14px;font-size:13.5px;color:#222;outline:none;font-family:'DM Sans',sans-serif;line-height:1.6;transition:border-color 0.15s;min-height:140px;width:100%; }
        .cm-textarea:focus { background:#fff;border-color:#d0d0d0; }
        .cm-textarea::placeholder { color:#ccc; }
        .cm-char { font-size:10.5px;color:#ccc;text-align:right;margin-top:4px;font-family:'DM Mono',monospace;transition:color 0.15s; }
        .cm-char.warn { color:#f59e0b; }
        .cm-char.over { color:#dc2626;font-weight:700; }
        .cm-error { background:#fff0f0;border:1px solid #fecaca;color:#dc2626;font-size:12.5px;padding:8px 12px;border-radius:8px; }
        .cm-footer { display:flex;align-items:center;justify-content:space-between;padding-top:4px;flex-shrink:0;margin-top:auto; }
        .cm-hint { font-size:11px;color:#ccc; }
        .cm-send-btn { display:flex;align-items:center;gap:7px;padding:10px 20px;background:#4f46e5;color:#fff;border:none;border-radius:10px;font-size:13.5px;font-weight:500;cursor:pointer;transition:background 0.15s;font-family:'DM Sans',sans-serif; }
        .cm-send-btn:hover { background:#4338ca; }
        .cm-send-btn:disabled { opacity:0.6;cursor:not-allowed; }
        .cm-send-btn.sent { background:#16a34a; }
        .cm-spinner { width:13px;height:13px;border:2px solid rgba(255,255,255,0.35);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block; }
        @keyframes spin { to{transform:rotate(360deg)} }

        /* ── Dark mode ──────────────────────────────────────────── */
        ${isDark ? `
          .msg-sidebar { background:#17171F;border-right:1px solid rgba(255,255,255,0.07); }
          .msg-sidebar-header { border-bottom:1px solid rgba(255,255,255,0.06); }
          .msg-title { color:#F0F0F5; }
          .msg-compose-btn { background:rgba(124,124,240,0.14);color:#7C7CF0; }
          .msg-compose-btn:hover { background:rgba(124,124,240,0.22); }
          .msg-search { background:rgba(255,255,255,0.06);color:#F0F0F5; }
          .msg-search:focus { background:rgba(255,255,255,0.09);border-color:rgba(124,124,240,0.45); }
          .msg-search::placeholder { color:#4A4A5A; }
          .msg-search-icon { color:#4A4A5A; }
          .msg-conv-list { scrollbar-color:rgba(255,255,255,0.08) transparent; }
          .msg-conv-item:hover { background:rgba(255,255,255,0.05); }
          .msg-conv-item.active { background:rgba(124,124,240,0.12); }
          .msg-online-dot { border-color:#17171F; }
          .msg-conv-name { color:#E0E0EF; }
          .msg-conv-last { color:#4A4A5A; }
          .msg-conv-time { color:#3A3A4A; }
          .msg-unread-badge { background:#7C7CF0; }
          .msg-main { background:#0F0F14; }
          .msg-chat-header { background:#17171F;border-bottom:1px solid rgba(255,255,255,0.07); }
          .msg-header-name { color:#F0F0F5; }
          .msg-header-status { color:#4A4A5A; }
          .msg-icon-btn { color:#4A4A5A; }
          .msg-icon-btn:hover { background:rgba(255,255,255,0.07);color:#A0A0B0; }
          .msg-messages-area { scrollbar-color:rgba(255,255,255,0.08) transparent; }
          .msg-skel { background:linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.10) 50%,rgba(255,255,255,0.06) 75%);background-size:200% 100%; }
          .msg-date-sep span { color:#4A4A5A;background:rgba(255,255,255,0.07); }
          .msg-bubble.me { background:#5B5BD6; }
          .msg-bubble.me.failed { background:#b91c1c; }
          .msg-bubble.them { background:#1E1E2C;color:#E0E0EF;box-shadow:0 1px 3px rgba(0,0,0,0.30); }
          .msg-typing { background:#1E1E2C;box-shadow:0 1px 3px rgba(0,0,0,0.30); }
          .msg-typing-dot { background:#4A4A5A; }
          .msg-footer { background:#17171F;border-top:1px solid rgba(255,255,255,0.07); }
          .msg-input-row { background:rgba(255,255,255,0.06);border-color:transparent; }
          .msg-input-row:focus-within { background:rgba(255,255,255,0.09);border-color:rgba(124,124,240,0.35); }
          .msg-text-input { color:#F0F0F5; }
          .msg-text-input::placeholder { color:#4A4A5A; }
          .msg-send-btn { background:#7C7CF0; }
          .msg-send-btn:hover { background:#6666E0; }
          .msg-send-btn:disabled { background:rgba(255,255,255,0.10);cursor:not-allowed; }
          .msg-empty-icon { background:rgba(124,124,240,0.14); }
          .msg-empty h3 { color:#F0F0F5; }
          .msg-empty p { color:#4A4A5A; }
          .msg-empty-compose { background:#7C7CF0; }
          .msg-empty-compose:hover { background:#6666E0; }
          .msg-no-convs { color:#4A4A5A; }
          .cm-overlay { background:rgba(0,0,0,0.55); }
          .cm-modal { background:#17171F;box-shadow:0 24px 64px rgba(0,0,0,0.50),0 0 0 1px rgba(255,255,255,0.07); }
          .cm-header { border-bottom:1px solid rgba(255,255,255,0.07); }
          .cm-title { color:#F0F0F5; }
          .cm-close-btn { background:rgba(255,255,255,0.07);color:#A0A0B0; }
          .cm-close-btn:hover { background:rgba(255,255,255,0.12); }
          .cm-left { border-right:1px solid rgba(255,255,255,0.07); }
          .cm-left-search { background:rgba(255,255,255,0.06);color:#F0F0F5; }
          .cm-left-search:focus { background:rgba(255,255,255,0.09);border-color:rgba(124,124,240,0.40); }
          .cm-left-search::placeholder { color:#4A4A5A; }
          .cm-left-search-icon { color:#4A4A5A; }
          .cm-skel-av { background:rgba(255,255,255,0.08); }
          .cm-skel { background:linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.10) 50%,rgba(255,255,255,0.06) 75%);background-size:200% 100%; }
          .cm-contact-item:hover { background:rgba(255,255,255,0.05); }
          .cm-contact-item.active { background:rgba(124,124,240,0.12);border-left-color:#7C7CF0; }
          .cm-contact-name { color:#E0E0EF; }
          .cm-contact-num { color:#4A4A5A; }
          .cm-contact-co { color:#3A3A4A; }
          .cm-check-badge { background:#7C7CF0; }
          .cm-no-contacts { color:#4A4A5A; }
          .cm-field-label { color:#4A4A5A; }
          .cm-right { background:#17171F; }
          .cm-to-input { background:rgba(255,255,255,0.06);color:#F0F0F5;border-color:rgba(255,255,255,0.08); }
          .cm-to-input:focus { background:rgba(255,255,255,0.09);border-color:rgba(124,124,240,0.45); }
          .cm-to-input::placeholder { color:#4A4A5A; }
          .cm-pill { background:rgba(124,124,240,0.12);border-color:rgba(124,124,240,0.25); }
          .cm-pill-name { color:#F0F0F5; }
          .cm-pill-phone { color:#A0A0B0; }
          .cm-pill-select { color:#A0A0B0; }
          .cm-pill-remove { background:rgba(124,124,240,0.18);color:#7C7CF0; }
          .cm-pill-remove:hover { background:rgba(124,124,240,0.30); }
          .cm-textarea { background:rgba(255,255,255,0.06);color:#F0F0F5;border-color:rgba(255,255,255,0.08); }
          .cm-textarea:focus { background:rgba(255,255,255,0.09);border-color:rgba(124,124,240,0.45); }
          .cm-textarea::placeholder { color:#4A4A5A; }
          .cm-char { color:#3A3A4A; }
          .cm-error { background:rgba(220,38,38,0.10);border-color:rgba(220,38,38,0.25);color:#F87171; }
          .cm-hint { color:#3A3A4A; }
          .cm-send-btn { background:#7C7CF0; }
          .cm-send-btn:hover { background:#6666E0; }
        ` : ''}
      `}</style>

      {showCompose && (
        <ComposeModal
        onClose={() => setShowCompose(false)}
        token={token}
        isDark={isDark}
        onSent={async ({ phoneNumber, body }) => {
          setConversations((prev) => {
            const normalizedPhone = normalizePhone(phoneNumber);
            const idx = prev.findIndex(
              (c) => normalizePhone(c.phoneNumber) === normalizedPhone
            );
      
            if (idx === -1) {
              return [
                {
                  id: normalizedPhone,
                  phoneNumber: normalizedPhone,
                  name: normalizedPhone,
                  avatar: normalizedPhone.substring(0, 2).toUpperCase(),
                  lastMessage: body,
                  unread: 0,
                  online: false,
                  time: new Date().toISOString(),
                },
                ...prev,
              ];
            }
      
            const updated = [...prev];
            const [conv] = updated.splice(idx, 1);
      
            return [
              {
                ...conv,
                lastMessage: body,
                time: new Date().toISOString(),
                unread: 0,
              },
              ...updated,
            ];
          });
      
          try {
            const fresh = await fetchConversationsList();
            setConversations(fresh);
          } catch {
            // optimistic update already done
          }
        }}
      />
      )}

      <div className="msg-root" style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>

        {/* ── SIDEBAR ───────────────────────────────────────── */}
        <aside className="msg-sidebar">
          <div className="msg-sidebar-header">
            <div className="msg-title">Messages</div>
            <button
              className="msg-compose-btn"
              onClick={() => setShowCompose(true)}
              title="New Message"
            >
              <SquarePen size={16} />
            </button>
          </div>

          <div className="msg-search-wrap">
            <Search size={14} className="msg-search-icon" />
            <input
              type="text"
              className="msg-search"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="msg-conv-list">
            {filteredConversations.length === 0 && (
              <div className="msg-no-convs">
                {searchQuery ? 'No results found' : 'No conversations yet'}
              </div>
            )}
            {filteredConversations.map((conv) => {
              const known = isKnownContact(conv.phoneNumber);
              const isHovered = hoveredConvId === conv.id;
              return (
                <div
                  key={conv.id}
                  className={`msg-conv-item ${selectedChat?.id === conv.id ? 'active' : ''}`}
                  style={{ position: 'relative' }}
                  onClick={() => loadMessages(conv)}
                  onMouseEnter={() => setHoveredConvId(conv.id)}
                  onMouseLeave={() => setHoveredConvId(null)}
                >
                  <div className="msg-avatar sm">
                    {conv.avatar}
                    {conv.online && <span className="msg-online-dot" />}
                  </div>
                  <div className="msg-conv-info">
                    <div className="msg-conv-name">{conv.name}</div>
                    <div className="msg-conv-last">{conv.lastMessage}</div>
                  </div>
                  <div className="msg-conv-meta">
                    {/* Show add-to-contact icon on hover for unknown numbers */}
                    {!known && isHovered ? (
                      <button
                        title="Add to Contacts"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddContactOpen(true);
                          // Pre-select phone via selectedChat — set it manually
                          setSelectedChat(conv);
                        }}
                        style={{
                          width: 26, height: 26, borderRadius: '50%',
                          border: '1px solid rgba(99,102,241,0.35)',
                          background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                          color: '#6366f1', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'background 0.15s',
                        }}
                      >
                        <UserPlus size={13} />
                      </button>
                    ) : (
                      <>
                        {conv.time && (
                          <div className="msg-conv-time">{formatConvTime(conv.time)}</div>
                        )}
                        {conv.unread > 0 && (
                          <div className="msg-unread-badge">{conv.unread > 99 ? '99+' : conv.unread}</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── MAIN ──────────────────────────────────────────── */}
        <main className="msg-main">
          {selectedChat ? (
            <>
              <header className="msg-chat-header">
                <div className="msg-avatar sm">{selectedChat.avatar}</div>
                <div className="msg-header-info">
                  <div className="msg-header-name">{selectedChat.name}</div>
                  <div className="msg-header-status">
                    {selectedChat.online ? (
                      <span className="msg-header-online">● Online</span>
                    ) : (
                      selectedChat.phoneNumber
                    )}
                  </div>
                </div>
                {/* Header action menu */}
                <div ref={headerMenuRef} style={{ position: 'relative' }}>
                  <button
                    className="msg-icon-btn"
                    onClick={() => setShowHeaderMenu(v => !v)}
                    title="Options"
                  >
                    <MoreVertical size={17} />
                  </button>

                  {showHeaderMenu && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                      zIndex: 999, minWidth: 180,
                      background: theme === 'dark' ? '#1E1E2E' : '#ffffff',
                      border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)'}`,
                      borderRadius: 12,
                      boxShadow: theme === 'dark'
                        ? '0 8px 28px rgba(0,0,0,0.55)'
                        : '0 6px 24px rgba(15,20,60,0.12)',
                      overflow: 'hidden',
                    }}>
                      {!isKnownContact(selectedChat.phoneNumber) ? (
                        <button
                          onClick={() => { setShowHeaderMenu(false); setAddContactOpen(true); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 16px', border: 'none', background: 'transparent',
                            cursor: 'pointer', textAlign: 'left',
                            fontSize: 13, fontWeight: 600,
                            color: theme === 'dark' ? '#e2e4f0' : '#1a1c2e',
                            fontFamily: 'inherit',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f5f6fa'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <UserPlus size={14} color="#6366f1" />
                          Add to Contacts
                        </button>
                      ) : (
                        <div style={{
                          padding: '11px 16px', fontSize: 12, fontWeight: 500,
                          color: theme === 'dark' ? '#68687a' : '#9ca3af',
                        }}>
                          Already in Contacts
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </header>

              {loadingMessages ? (
                <div className="msg-loading-wrap">
                  {[60, 45, 75, 50, 65].map((w, i) => (
                    <div
                      key={i}
                      className="msg-skel"
                      style={{
                        width: `${w}%`,
                        alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  ref={messagesContainerRef}
                  className={`msg-messages-area ${messagesVisible ? 'visible' : 'hidden'}`}
                >
                  {messages.map((msg, idx) => {
                    const prevMsg = messages[idx - 1];
                    const showDate =
                      !prevMsg ||
                      new Date(msg.time).toDateString() !==
                        new Date(prevMsg.time).toDateString();
                    return (
                      <React.Fragment key={msg.clientId || msg.id}>
                        {showDate && (
                          <div className="msg-date-sep">
                            <span>
                              {new Date(msg.time).toLocaleDateString([], {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                        <div className={`msg-row ${msg.sender}`}>
                          <div
                            className={`msg-bubble ${msg.sender} ${
                              msg.failed ? 'failed' : ''
                            } ${msg.sending ? 'sending' : ''}`}
                          >
                            {/^<[a-z][\s\S]*>/i.test(msg.text) ? (
                              <>
                                <style>{`.tmpl-bubble p{margin:0 0 4px;font-size:inherit;line-height:1.65} .tmpl-bubble ul,.tmpl-bubble ol{padding-left:16px;margin:0 0 4px} .tmpl-bubble li{margin-bottom:2px} .tmpl-bubble strong{font-weight:700} .tmpl-bubble em{font-style:italic} .tmpl-bubble u{text-decoration:underline}`}</style>
                                <div className="tmpl-bubble" dangerouslySetInnerHTML={{ __html: msg.text }} />
                              </>
                            ) : msg.text}
                            <div className="msg-time">
                              {msg.sending ? (
                                <span style={{ opacity: 0.6 }}>Sending...</span>
                              ) : msg.failed ? (
                                <>
                                  <AlertCircle size={10} />
                                  <button
                                    className="msg-retry-btn"
                                    onClick={() => retryMessage(msg)}
                                    title="Tap to retry"
                                  >
                                    <RefreshCw size={9} />
                                    Retry
                                  </button>
                                </>
                              ) : (
                                formatTime(msg.time)
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="msg-row them">
                      <div className="msg-typing">
                        <div className="msg-typing-dot" />
                        <div className="msg-typing-dot" />
                        <div className="msg-typing-dot" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              <footer className="msg-footer">
                {showEmojiPicker && (
                  <div className="msg-emoji-wrap">
                    <Suspense fallback={null}>
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        theme={isDark ? 'dark' : 'light'}
                        previewConfig={{ showPreview: false }}
                      />
                    </Suspense>
                  </div>
                )}
                {/* Template active preview card */}
                {activeTemplate && (
                  <div style={{ margin: '0 0 8px', padding: '10px 14px', borderRadius: 10, border: `1px solid ${isDark ? 'rgba(91,91,214,0.30)' : 'rgba(91,91,214,0.20)'}`, background: isDark ? 'rgba(91,91,214,0.10)' : 'rgba(91,91,214,0.06)', position: 'relative' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6366F1', marginBottom: 6 }}>{activeTemplate.title}</div>
                    <style>{`.tmpl-prev p{margin:0 0 4px;font-size:13px;line-height:1.65} .tmpl-prev ul,.tmpl-prev ol{padding-left:16px;margin:0 0 4px} .tmpl-prev li{font-size:13px;margin-bottom:2px} .tmpl-prev strong{font-weight:700} .tmpl-prev em{font-style:italic} .tmpl-prev u{text-decoration:underline}`}</style>
                    <div className="tmpl-prev" dangerouslySetInnerHTML={{ __html: activeTemplate.body }} style={{ color: isDark ? '#E8E8F0' : '#1A1A2E', maxHeight: 120, overflowY: 'auto' }} />
                    <button onClick={() => setActiveTemplate(null)} style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 6, border: 'none', background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)', color: isDark ? '#AAA' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="msg-input-row">
                  <button
                    className="msg-icon-btn"
                    style={{ width: 32, height: 32, borderRadius: 8 }}
                  >
                    <Paperclip size={16} />
                  </button>
                  {canUseTemplates && (
                    <button
                      className="msg-icon-btn"
                      style={{ width: 32, height: 32, borderRadius: 8 }}
                      onClick={() => setShowTemplatesModal(true)}
                      title="SMS Templates (or press /)"
                    >
                      <FileText size={16} />
                    </button>
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    className="msg-text-input"
                    placeholder={activeTemplate ? 'Template ready — press Send' : canUseTemplates ? 'Type a message or press / for templates…' : 'Type a message...'}
                    value={activeTemplate ? '' : messageInput}
                    maxLength={750}
                    readOnly={!!activeTemplate}
                    onChange={(e) => {
                      if (!activeTemplate && e.target.value.length <= 750) setMessageInput(e.target.value);
                    }}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    className="msg-icon-btn"
                    style={{ width: 32, height: 32, borderRadius: 8 }}
                    onClick={() => setShowEmojiPicker((v) => !v)}
                  >
                    <Smile size={16} />
                  </button>
                  <button
                    className="msg-send-btn"
                    onClick={handleSendMessage}
                    disabled={!activeTemplate && (!messageInput.trim() || messageInput.length > 750)}
                  >
                    <Send size={15} />
                  </button>
                </div>
                {!activeTemplate && messageInput.length > 0 && (
                  <div
                    className="msg-char-counter"
                    style={{
                      color:
                        messageInput.length >= 750
                          ? '#dc2626'
                          : messageInput.length >= 700
                          ? '#f59e0b'
                          : isDark
                          ? '#3A3A4A'
                          : '#ccc',
                      fontWeight: messageInput.length >= 750 ? 700 : 400,
                    }}
                  >
                    {messageInput.length} / 750
                  </div>
                )}
              </footer>
            </>
          ) : (
            <div className="msg-empty">
              <div className="msg-empty-icon">
                <MessageSquare
                  size={30}
                  color={isDark ? '#7C7CF0' : '#4f46e5'}
                  strokeWidth={1.5}
                />
              </div>
              <h3>Your Messages</h3>
              <p>Select a conversation or start a new one</p>
              <button
                className="msg-empty-compose"
                onClick={() => setShowCompose(true)}
              >
                <SquarePen size={16} />
                New Message
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Add to Contact modal — phone pre-filled from selected conversation */}
      <AddContactModal
        open={addContactOpen}
        onClose={() => setAddContactOpen(false)}
        onSubmit={handleAddContact}
        defaultPhone={selectedChat?.phoneNumber || ''}
        currentUserId={user?.id}
      />

      {/* SMS Templates modal */}
      {canUseTemplates && (
        <SmsTemplatesModal
          open={showTemplatesModal}
          onClose={() => setShowTemplatesModal(false)}
          onUse={(template) => {
            setActiveTemplate(template);
            setMessageInput('');
            setShowTemplatesModal(false);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
        />
      )}
    </>
  );
}