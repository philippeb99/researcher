import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Button } from './ui/button';
import { 
  Bold, Italic, List, ListOrdered, Undo, Redo, 
  Type, Highlighter 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';

export interface MergeField {
  label: string;
  value: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string, plain: string) => void;
  placeholder?: string;
  mergeFields?: MergeField[];
  readOnly?: boolean;
  className?: string;
}

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Start typing...',
  mergeFields = [],
  readOnly = false,
  className
}: RichTextEditorProps) => {
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const plain = editor.getText();
      
      // Sanitize HTML before passing to parent
      const sanitizedHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'mark', 'span'],
        ALLOWED_ATTR: ['style', 'class']
      });
      
      onChange(sanitizedHtml, plain);
    },
  });

  const insertMergeField = (field: MergeField) => {
    if (editor) {
      editor.chain().focus().insertContent(`[[${field.value}]]`).run();
    }
  };

  if (!editor) {
    return null;
  }

  const wordCount = editor.storage.characterCount?.words() || editor.getText().split(/\s+/).filter(Boolean).length;
  const charCount = editor.storage.characterCount?.characters() || editor.getText().length;

  return (
    <div className={cn("border rounded-lg overflow-hidden flex flex-col", className)}>
      {!readOnly && (
        <div className="border-b bg-muted/30 p-2 flex flex-wrap gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-muted' : ''}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-muted' : ''}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-muted' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-muted' : ''}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={editor.isActive('highlight') ? 'bg-muted' : ''}
          >
            <Highlighter className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>
          
          {mergeFields.length > 0 && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <div className="flex gap-1 flex-wrap">
                {mergeFields.map((field) => (
                  <Button
                    key={field.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertMergeField(field)}
                    className="text-xs"
                  >
                    <Type className="h-3 w-3 mr-1" />
                    {field.label}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        <EditorContent 
          editor={editor} 
          className={cn(
            "p-4 min-h-[300px] focus:outline-none max-w-none",
            "prose prose-sm",
            "[&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4",
            "[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2",
            readOnly && "bg-muted/10"
          )}
        />
      </div>
      
      <div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex justify-between shrink-0">
        <span>{wordCount} words • {charCount} characters</span>
      </div>
    </div>
  );
};