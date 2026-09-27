import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ScriptPreviewProps {
  content: string;
  zoom?: number;
}

export function ScriptPreview({ content, zoom = 90 }: ScriptPreviewProps) {
  if (!content.trim()) {
    return <div className="flex h-full min-h-64 items-center justify-center text-center text-sm text-neutral-500">
      Escribe un guión o pide a la IA que cree el primer borrador.
    </div>;
  }

  return <article aria-label="Vista previa del guión" style={{ fontSize: `${16 * zoom / 100}px` }}
    className="mx-auto w-full max-w-[100ch] break-words leading-[1.7] text-neutral-200">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      h1: ({ children }) => <h1 className="mb-[0.9em] border-b border-white/10 pb-[0.4em] text-[2.2em] font-bold leading-tight tracking-tight text-white">{children}</h1>,
      h2: ({ children }) => <h2 className="mb-[0.6em] mt-[1.8em] border-l-4 border-indigo-400 pl-4 text-[1.55em] font-semibold leading-snug text-white">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-[0.5em] mt-[1.5em] text-[1.25em] font-semibold text-indigo-200">{children}</h3>,
      p: ({ children }) => {
        const cue = typeof children === 'string' && /^\s*\[[^\]]+\]\s*$/.test(children);
        return <p className={cue ? 'my-[1.2em] rounded-xl border border-indigo-400/15 bg-indigo-400/5 px-4 py-3 text-[0.9em] italic text-indigo-200' : 'mb-[1.15em]'}>{children}</p>;
      },
      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
      em: ({ children }) => <em className="text-indigo-200">{children}</em>,
      blockquote: ({ children }) => <blockquote className="my-6 border-l-2 border-indigo-400/60 bg-indigo-500/5 py-2 pl-5 italic text-neutral-300">{children}</blockquote>,
      ul: ({ children }) => <ul className="mb-6 list-disc space-y-2 pl-6 marker:text-indigo-400">{children}</ul>,
      ol: ({ children }) => <ol className="mb-6 list-decimal space-y-2 pl-6 marker:text-indigo-400">{children}</ol>,
      hr: () => <hr className="my-10 border-white/10" />,
      a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 hover:text-indigo-200">{children}</a>,
      pre: ({ children }) => <pre className="my-5 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-sm">{children}</pre>,
      code: ({ children }) => <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.9em] text-indigo-100">{children}</code>,
      table: ({ children }) => <table className="my-6 w-full border-collapse text-left text-sm">{children}</table>,
      th: ({ children }) => <th className="border-b border-white/20 bg-white/5 p-3 font-semibold text-white">{children}</th>,
      td: ({ children }) => <td className="border-b border-white/10 p-3 align-top">{children}</td>,
    }}>{content}</ReactMarkdown>
  </article>;
}
