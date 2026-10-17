import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import katex from "katex";
import { Check, ChevronDown, Copy, Link2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const LANG_LABEL = {
  cpp: "C++", python: "Python", py: "Python", bash: "Shell", sh: "Shell", sql: "SQL", typescript: "TypeScript",
  ts: "TypeScript", yaml: "YAML", yml: "YAML", json: "JSON", toml: "TOML", dockerfile: "Dockerfile",
  xml: "XML", cmake: "CMake", text: "Text", gitignore: ".gitignore", javascript: "JavaScript", js: "JavaScript",
};

function textOf(node) {
  if (!node) return "";
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

const FOLD_LINES = 28;

function CodeBlock({ node, children }) {
  const codeNode = node?.children?.find((c) => c.tagName === "code");
  const cls = (codeNode?.properties?.className ?? []).find((c) => String(c).startsWith("language-"));
  const lang = cls ? String(cls).slice(9) : "";
  const raw = textOf(codeNode).replace(/\n$/, "");
  const lineCount = raw.split("\n").length;
  const isDiagram = !lang || lang === "text";
  const long = lineCount > FOLD_LINES;
  const [open, setOpen] = useState(!long);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className={cn("group not-prose relative overflow-hidden rounded-lg border font-sans", isDiagram ? "bg-muted/45" : "bg-code")}>
      <div className="flex h-8 items-center justify-between border-b border-border/70 px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {isDiagram ? "Diagram / trace" : LANG_LABEL[lang] ?? lang}
        </span>
        <div className="flex items-center gap-1">
          {long && <span className="mr-1 text-[11px] text-muted-foreground">{lineCount} lines</span>}
          <Tip content={copied ? "Copied" : "Copy"}>
            <Button variant="ghost" size="icon-sm" className="size-6 opacity-60 group-hover:opacity-100" onClick={copy} aria-label="Copy code">
              {copied ? <Check className="!size-3.5" /> : <Copy className="!size-3.5" />}
            </Button>
          </Tip>
        </div>
      </div>
      <div className="relative">
        <ScrollArea orientation="horizontal">
          <pre className={cn("code-body px-4 py-3", isDiagram && "text-[13px] leading-[1.55]", !open && "max-h-[24rem] overflow-hidden")}>
            {children}
          </pre>
        </ScrollArea>
        {long && (
          <div className={cn("flex justify-center", !open && "absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--code-bg)] via-[var(--code-bg)]/85 to-transparent pt-10 pb-2", open && "border-t border-border/70 py-1")}>
            <Button variant="outline" size="xs" onClick={() => setOpen((o) => !o)}>
              <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
              {open ? "Collapse" : `Show all ${lineCount} lines`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function makeHeading(Tag, ids, offset) {
  return function Heading({ node, children }) {
    const line = node?.position?.start?.line;
    const id = line != null ? ids?.get(offset + line - 1) : undefined;
    return (
      <Tag id={id} className="group/h relative scroll-mt-20">
        {children}
        {id && (
          <a href={`#${id}`} onClick={(e) => { e.preventDefault(); const h = window.location.hash.split("#").slice(0, 2).join("#"); history.replaceState(null, "", `${h}#${id}`); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}
            className="ml-2 inline-flex align-middle text-muted-foreground opacity-0 transition-opacity group-hover/h:opacity-100 !no-underline" aria-label="Link to section">
            <Link2 className="size-4" />
          </a>
        )}
      </Tag>
    );
  };
}

// `$\$2$` (currency inside math) trips remark-math's delimiter scan; KaTeX's \textdollar renders the same.
const fixMath = (s) => s.replace(/\$\\\$/g, "$\\text{\\textdollar}");

/** Short inline text with optional $math$ (TOC entries, fold titles). */
export function InlineText({ text }) {
  const parts = text.replace(/\*\*/g, "").split(/(\$[^$]+\$|`[^`]+`)/g);
  return parts.map((p, k) => {
    if (p.startsWith("$") && p.endsWith("$") && p.length > 2)
      return <span key={k} dangerouslySetInnerHTML={{ __html: katex.renderToString(p.slice(1, -1), { throwOnError: false, strict: false }) }} />;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={k} className="font-mono text-[0.9em]">{p.slice(1, -1)}</code>;
    return p;
  });
}

function Markdown({ text, ids, offset = 0 }) {
  const components = {
    h1: makeHeading("h1", ids, offset),
    h2: makeHeading("h2", ids, offset),
    h3: makeHeading("h3", ids, offset),
    h4: makeHeading("h4", ids, offset),
    h5: makeHeading("h5", ids, offset),
    h6: makeHeading("h6", ids, offset),
    pre: CodeBlock,
    table: ({ children }) => (
      <div className="not-prose font-sans text-[14.5px]">
        <Table>{children}</Table>
      </div>
    ),
    thead: ({ children }) => <TableHeader>{children}</TableHeader>,
    tbody: ({ children }) => <TableBody>{children}</TableBody>,
    tr: ({ children }) => <TableRow>{children}</TableRow>,
    th: ({ children, style }) => <TableHead className="normal-case tracking-normal text-[13px] text-foreground" style={style}>{children}</TableHead>,
    td: ({ children, style }) => <TableCell className="leading-relaxed [&_code]:text-[12.5px]" style={style}>{children}</TableCell>,
    a: ({ href, children }) => {
      if (href?.startsWith("#") && !href.startsWith("#/")) {
        const id = href.slice(1);
        return (
          <a href={href} onClick={(e) => { e.preventDefault(); const h = window.location.hash.split("#").slice(0, 2).join("#"); history.replaceState(null, "", `${h}#${id}`); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}>
            {children}
          </a>
        );
      }
      const external = /^https?:/.test(href ?? "");
      return (
        <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
          {children}
        </a>
      );
    },
  };
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }], [rehypeHighlight, { detect: false, plainText: ["text", "txt"] }]]}
      components={components}
    >
      {fixMath(text)}
    </ReactMarkdown>
  );
}

export default memo(Markdown);
