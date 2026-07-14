'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Undo, Redo } from 'lucide-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export default function RichTextEditor({ value, onChange, placeholder, className, rows = 8 }: RichTextEditorProps) {
  const minHeight = `${rows * 1.75}rem`;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none px-3 py-2 focus:outline-none',
        style: `min-height: ${minHeight}`,
        'data-placeholder': placeholder || 'Escribe aquí...',
      },
    },
  });

  // Sync value when it changes externally (e.g., when form is reset or editing a different record)
  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;
    const current = editor.getHTML();
    const incoming = value || '';
    if (current !== incoming && !(current === '<p></p>' && incoming === '')) {
      editor.commands.setContent(incoming, { emitUpdate: false } as any);
    }
  }, [value, editor]);

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 bg-white ${className ?? ''}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-gray-50 flex-wrap">
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold') ?? false} title="Negrita (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic') ?? false} title="Cursiva (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <Divider />
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList') ?? false} title="Lista con viñetas">
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList') ?? false} title="Lista numerada">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <Divider />
        <ToolbarBtn onClick={() => editor?.chain().focus().undo().run()} active={false} title="Deshacer (Ctrl+Z)" disabled={!editor?.can().undo()}>
          <Undo className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().redo().run()} active={false} title="Rehacer (Ctrl+Y)" disabled={!editor?.can().redo()}>
          <Redo className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarBtn({ onClick, active, title, disabled, children }: {
  onClick: () => void;
  active: boolean;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed
        ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-gray-300 mx-1" />;
}
