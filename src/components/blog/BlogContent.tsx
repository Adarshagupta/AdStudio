function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-zinc-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function BlogContent({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);

  return (
    <div className="space-y-5 text-sm leading-7 text-zinc-700 md:text-base">
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={index} className="font-display text-lg font-semibold text-zinc-900">
              {trimmed.slice(4)}
            </h4>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={index} className="font-display text-xl font-semibold text-zinc-900">
              {trimmed.slice(3)}
            </h3>
          );
        }

        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={index} className="font-display text-2xl font-semibold text-zinc-900">
              {trimmed.slice(2)}
            </h2>
          );
        }

        if (trimmed.split("\n").every((line) => line.trim().startsWith("- "))) {
          return (
            <ul key={index} className="list-inside list-disc space-y-2">
              {trimmed.split("\n").map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index}>{renderInline(trimmed.replace(/\n/g, " "))}</p>
        );
      })}
    </div>
  );
}
