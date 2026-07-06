'use client';

import { useEffect, useRef, useState } from 'react';

interface TiptapEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export default function TiptapEditor({ value, onChange }: TiptapEditorProps) {
  const editorId = useRef(`tinymce-${Math.random().toString(36).slice(2)}`);
  const editorRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const isInitializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let active = true;

    const loadScript = (): Promise<void> =>
      new Promise((resolve) => {
        if ((window as any).tinymce) { resolve(); return; }
        const existing = document.getElementById('tinymce-js');
        if (existing) {
          const t = setInterval(() => {
            if ((window as any).tinymce) { clearInterval(t); resolve(); }
          }, 50);
          return;
        }
        const s = document.createElement('script');
        s.id = 'tinymce-js';
        s.src = '/tinymce/tinymce.min.js';
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.head.appendChild(s);
      });

    const init = async () => {
      if (isInitializedRef.current) return;
      await loadScript();
      if (!active) return;
      const tinymce = (window as any).tinymce;
      if (!tinymce) { setIsLoaded(true); return; }

      isInitializedRef.current = true;

      tinymce.init({
        selector: `#${editorId.current}`,
        base_url: '/tinymce',
        suffix: '.min',
        license_key: 'gpl',
        height: 620,
        menubar: 'file edit view insert format tools table help',
        branding: false,
        promotion: false,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'help', 'wordcount',
          'codesample', 'emoticons', 'directionality', 'nonbreaking', 'pagebreak', 'quickbars',
        ],
        toolbar1: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | removeformat',
        toolbar2: 'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | codesample code | charmap emoticons | ltr rtl | fullscreen preview',
        toolbar_mode: 'wrap',
        font_family_formats: 'Arial=arial,helvetica,sans-serif;Georgia=georgia,palatino;Times New Roman=times new roman,times;Courier New=courier new,courier,monospace;Verdana=verdana,geneva;Tahoma=tahoma,arial,helvetica,sans-serif;Trebuchet MS=trebuchet ms,geneva;Impact=impact,chicago;Comic Sans MS=comic sans ms,sans-serif;',
        font_size_formats: '8pt 9pt 10pt 11pt 12pt 14pt 16pt 18pt 20pt 22pt 24pt 28pt 32pt 36pt 48pt 60pt 72pt',
        block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre; Blockquote=blockquote',
        content_style: `
          body {
            font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
            font-size: 14px; line-height: 1.6;
            color: #1a1a2e; background: #fff; padding: 16px;
          }
          img { max-width: 100%; height: auto; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ccc; padding: 8px; }
          pre { background: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; }
          blockquote { border-left: 4px solid #e0e0e0; margin: 16px 0; padding: 8px 16px; color: #666; }
        `,
        quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
        quickbars_insert_toolbar: 'quickimage quicktable',
        image_advtab: true,
        image_title: true,
        automatic_uploads: false,
        file_picker_types: 'image',
        file_picker_callback: (cb: any) => {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.onchange = function () {
            const file = (this as any).files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => cb(reader.result as string, { title: file.name });
            reader.readAsDataURL(file);
          };
          input.click();
        },
        setup: (editor: any) => {
          editorRef.current = editor;
          editor.on('init', () => {
            if (!active) return;
            editor.setContent(value || '');
            setIsLoaded(true);
          });
          editor.on('Change Input KeyUp Paste Undo Redo', () => {
            if (!active) return;
            onChangeRef.current(editor.getContent());
          });
        },
      });
    };

    init();

    return () => {
      active = false;
      const editor = editorRef.current;
      if (editor) {
        try { editor.destroy(); } catch {}
        editorRef.current = null;
      }
      isInitializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync value from parent when editor not focused
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !isLoaded) return;
    try {
      if (!editor.hasFocus() && editor.getContent() !== (value || '')) {
        editor.setContent(value || '');
      }
    } catch {}
  }, [value, isLoaded]);

  return (
    <div style={{ minHeight: 620 }}>
      {!isLoaded && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 200, background: '#1a1a2e',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
          color: '#aaa', fontSize: 14, gap: 10,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.3"/>
            <path d="M21 12a9 9 0 00-9-9"/>
          </svg>
          Đang tải trình soạn thảo...
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <textarea id={editorId.current} style={{ visibility: 'hidden', position: 'absolute' }} />
    </div>
  );
}
