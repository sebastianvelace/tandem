/*
 * Renderiza el cuerpo de un mensaje con enlaces clicables (MSG-06).
 * Detecta URLs http(s) y las convierte en <a> seguros (noopener).
 */
const URL_SPLIT_RE = /(https?:\/\/[^\s<]+)/g;
const URL_TEST_RE = /^https?:\/\/[^\s<]+$/;

export function MessageBody({ body }: { body: string }) {
  const parts = body.split(URL_SPLIT_RE);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        URL_TEST_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent-hover)] underline underline-offset-2 hover:opacity-90"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
