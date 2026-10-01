import { useMemo } from 'react';

/**
 * Safe rich-text rendering for assistant answers: HTML is escaped first,
 * then a small subset (bold, paragraphs, dash lists, Arabic RTL blocks) is
 * applied. Model output can never inject markup this way.
 */
export default function NoorText({ text }: { text: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div className="noor-answer">
      {blocks.map((block, i) => {
        if (block.type === 'list') {
          return (
            <ul key={i} className="my-2 space-y-1.5 pl-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-secondary-500" />
                  <span><Inline text={item} /></span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} dir={block.rtl ? 'rtl' : undefined} lang={block.rtl ? 'ar' : undefined} className={block.rtl ? 'font-arabic text-right text-[17px] leading-9' : undefined}>
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

type Block = { type: 'para'; text: string; rtl: boolean } | { type: 'list'; items: string[] };

function isRtl(text: string): boolean {
  const arabic = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  return arabic > text.replace(/\s/g, '').length / 2;
}

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: Block[] = [];
  let current: string[] = [];

  const flush = () => {
    const joined = current.join(' ').trim();
    current = [];
    if (joined) blocks.push({ type: 'para', text: joined, rtl: isRtl(joined) });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*•]\s+/.test(trimmed)) {
      flush();
      const last = blocks[blocks.length - 1];
      const item = trimmed.replace(/^[-*•]\s+/, '');
      if (last && last.type === 'list') {
        last.items.push(item);
      } else {
        blocks.push({ type: 'list', items: [item] });
      }
    } else if (trimmed === '') {
      flush();
    } else {
      current.push(trimmed);
    }
  }
  flush();
  return blocks;
}

function Inline({ text }: { text: string }) {
  // Escape, then bold (**...**). Code spans render as plain mono chips.
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const html = escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-black/5 px-1 dark:bg-white/10">$1</code>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
