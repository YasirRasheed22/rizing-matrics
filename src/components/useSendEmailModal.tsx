// src/hooks/useSendEmailModal.ts
//@ts-nocheck
import {
    Search,
    Send,
    Paperclip,
    Mail,
    Inbox,
    Send as SendIcon,
    Plus,
    X,
    CheckCheck,
    Clock,
    Download,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Undo2,
    Redo2,
    List,
    ListOrdered,
    Link as LinkIcon, // rename to avoid conflict with HTML <a>
    Image as ImageIcon,
    Code,
  } from "lucide-react";
import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import api from '../api';
import { EditorContent, useEditor } from "@tiptap/react";
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";

import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";



interface SendEmailModalHook {
    openSendEmailModal: (initialTo?: string[]) => void;
    SendEmailModal: JSX.Element | null; // modal component jo render karna hai
    isModalOpen: boolean;
    closeModal: () => void;
  }

export function useSendEmailModal() {
  const { user, token } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [to, setTo] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Open modal with optional pre-filled recipients
  const openSendEmailModal = useCallback((initialTo: string[] = []) => {
    setTo(initialTo);
    setToInput('');
    setSubject('');
    setBody('');
    setAttachments([]);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setTo([]);
    setSubject('');
    setBody('');
    setAttachments([]);
  }, []);

  const addToRecipient = () => {
    if (toInput.trim() && !to.includes(toInput.trim())) {
      setTo([...to, toInput.trim()]);
      setToInput('');
    }
  };

  const removeTo = (email: string) => {
    setTo(to.filter((t) => t !== email));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!to.length || !subject.trim() || sending) return;

    setSending(true);
    const formData = new FormData();
    formData.append('to', to.join(','));
    formData.append('subject', subject);
    formData.append('html', body); // rich text from editor

    attachments.forEach((file) => {
      formData.append('attachments', file);
    });

    try {
      const result = await api.post('/voice/email/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (result.data.success) {
        toast.success('Email sent successfully!');
        setSubject('');
        setBody('');
        setTo([])
        setAttachments([]);

        closeModal(); // modal close on success
      }
    } catch (err) {
      console.error('Email send failed:', err);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Tiptap Editor Setup (same as before, minimal)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { HTMLAttributes: { class: 'list-disc pl-5' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal pl-5' } },
      }),
      Underline,
      Link,
      Image,
      
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[200px] p-4 bg-white text-black',
      },
    },
    onUpdate: ({ editor }) => {
      setBody(editor.getHTML());
    },
  });

  const SendEmailModal = isOpen ? (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="text-xl font-semibold text-black">Compose Email</h3>
          <button onClick={closeModal}>
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* To */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2 text-black">To</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {to.map((email) => (
                <div
                  key={email}
                  className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2 text-sm text-black"
                >
                  {email}
                  <X className="h-4 w-4 cursor-pointer text-black" onClick={() => removeTo(email)} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToRecipient())}
                placeholder="Add recipient..."
                className="ringnex-input flex-1 px-4 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={addToRecipient}
                className="group relative overflow-hidden rounded px-4 py-2 font-bold text-white shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 bg-orange"
              >
                Add
              </button>
            </div>
          </div>

          {/* Subject */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2 text-black">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="ringnex-input w-full px-4 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Body - Tiptap Editor (minimal toolbar) */}
          <div>
            <label className="block text-sm font-medium mb-2 text-black">Message</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
              {/* Minimal Toolbar */}
              <div className="flex gap-2 p-2 bg-gray-50 border-b">
                <button
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded hover:bg-gray-200 ${editor?.isActive('bold') ? 'bg-gray-300' : ''}`}
                  title="Bold"
                >
                  <Bold  color="black" className="h-5 w-5" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded hover:bg-gray-200 ${editor?.isActive('italic') ? 'bg-gray-300' : ''}`}
                  title="Italic"
                >
                  <Italic color="black" className="h-5 w-5" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={`p-1.5 rounded hover:bg-gray-200 ${editor?.isActive('underline') ? 'bg-gray-300' : ''}`}
                  title="Underline"
                >
                  <Underline  color="black" className="h-5 w-5" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`p-1.5 rounded hover:bg-gray-200 ${editor?.isActive('bulletList') ? 'bg-gray-300' : ''}`}
                  title="Bullet List"
                >
                  <List  color="black" className="h-5 w-5" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`p-1.5 rounded hover:bg-gray-200 ${editor?.isActive('orderedList') ? 'bg-gray-300' : ''}`}
                  title="Ordered List"
                >
                  <ListOrdered  color="black" className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    const url = window.prompt('Enter URL', 'https://');
                    if (url) editor?.chain().focus().setLink({ href: url }).run();
                  }}
                  className="p-1.5 rounded hover:bg-gray-200"
                  title="Insert Link"
                >
                  <LinkIcon  color="black" className="h-5 w-5" />
                </button>
              </div>
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium mb-2 text-black">Attachments</label>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-orange rounded hover:bg-gray flex items-center gap-2"
            >
              <Paperclip className="h-5 w-5" /> Attach Files
            </button>

            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-1"
                  >
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-5 w-5 text-gray-500" />
                      <span className="text-sm truncate max-w-[300px] text-black">{file.name}</span>
                      <span className="text-xs text-gray-500 text-black">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <X
                      className="h-5 w-5 cursor-pointer text-red-500 hover:text-red-700"
                      onClick={() => removeAttachment(idx)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-4">
          <button
            onClick={closeModal}
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !to.length || !subject.trim()}
            className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? 'Sending...' : 'Send'} <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return {
    openSendEmailModal,
    SendEmailModal,
    isModalOpen: isOpen,
    closeModal,
  };
}