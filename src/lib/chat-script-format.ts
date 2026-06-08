import { formatStudioNodeText } from "@/lib/studio-pro/display-text";

export type ChatScriptRowType = "hook" | "visual" | "spoken" | "caption" | "cta" | "body" | "note" | "other";

export type ChatScriptRow = {
  type: ChatScriptRowType;
  content: string;
};

export type ChatScriptSection = {
  name: string;
  timing?: string;
  rows: ChatScriptRow[];
};

export type ParsedChatScript = {
  title?: string;
  sections: ChatScriptSection[];
};

const TIMING_PATTERN = /^(\d+)\s*-\s*(\d+)\s*sec(?:onds)?\.?$/i;

const BRACKET_LABEL_PATTERN =
  /^\[(HOOK|VISUAL|SPOKEN|SPEECH|CAPTIONS?|CTA|AUDIO|B-ROLL|ON-?SCREEN)\]\s*(.*)$/i;

const COLON_LABEL_PATTERN =
  /^(?:\*\*)?(HOOK|VISUAL|SPOKEN|SPEECH|CAPTIONS?|CTA|AUDIO|B-ROLL|ON-?SCREEN)(?:\*\*)?:\s*(.+)$/i;

const COLON_LABEL_ONLY_PATTERN =
  /^(?:\*\*)?(HOOK|VISUAL|SPOKEN|SPEECH|CAPTIONS?|CTA|AUDIO|B-ROLL|ON-?SCREEN)(?:\*\*)?:\s*$/i;

const TABLE_ROW_PATTERN =
  /^\|?\s*(Visual|Spoken|Caption|Captions|CTA|Hook|Audio|B-?Roll)\s*\|?\s*(.+?)\s*\|?\s*$/i;

function normalizeType(label: string): ChatScriptRowType {
  const key = label.toLowerCase().replace(/[\s-]/g, "");
  if (key === "hook") return "hook";
  if (key === "visual" || key === "broll") return "visual";
  if (key === "spoken" || key === "speech" || key === "audio") return "spoken";
  if (key === "caption" || key === "captions") return "caption";
  if (key === "cta") return "cta";
  return "other";
}

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#{1,6}\s+/, "")
    .trim();
}

function isTitleLine(line: string) {
  const plain = stripMarkdown(line);
  return /script/i.test(plain) && plain.length < 140;
}

function isTimingLine(line: string) {
  return TIMING_PATTERN.test(stripMarkdown(line));
}

function parseTiming(line: string) {
  const plain = stripMarkdown(line);
  const match = plain.match(TIMING_PATTERN);
  if (!match) return plain;
  return `${match[1]}-${match[2]} sec`;
}

function isMarkdownSeparatorLine(line: string) {
  const plain = stripMarkdown(line).trim();
  if (!plain.includes("-")) return false;
  return /^[\s|:\-]+$/.test(plain) && /-{2,}/.test(plain);
}

function parseDirectionNote(line: string) {
  const match = line.match(/^direction\s*[\t|]+\s*-\s*(.+)$/i);
  return match?.[1]?.trim() ? stripMarkdown(match[1].trim()) : null;
}

function isSkippableLine(line: string) {
  const plain = stripMarkdown(line);
  if (!plain) return true;
  if (plain === "---") return true;
  if (/^direction$/i.test(plain)) return true;
  if (isMarkdownSeparatorLine(line)) return true;
  if (parseDirectionNote(line)) return false;
  if (/^direction\s*[\t|]/i.test(line)) return true;
  return false;
}

function isSectionName(line: string) {
  const plain = stripMarkdown(line);
  if (!plain || isSkippableLine(plain)) return false;
  if (isTimingLine(plain)) return false;
  if (isTitleLine(plain)) return false;
  if (parseTableRow(plain)) return false;
  if (parseBracketOrColonLabel(plain)) return false;
  if (plain.startsWith("- ")) return false;

  if (/^[A-Z][A-Z0-9\s/&-]{1,60}$/.test(plain)) return true;
  if (/^[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+$/.test(plain)) return true;
  return false;
}

function isTableTypeLabel(label: string) {
  return /^(visual|spoken|caption|captions|cta|hook|audio|b-?roll)$/i.test(label.trim());
}

function parseTableRow(line: string) {
  const plain = stripMarkdown(line).replace(/^\|/, "").replace(/\|$/, "").trim();
  const cells = plain.split("|").map((cell) => cell.trim()).filter(Boolean);

  if (cells.length >= 2 && isTableTypeLabel(cells[0])) {
    return {
      type: normalizeType(cells[0]),
      content: cells.slice(1).join(" | ").trim(),
    };
  }

  const inline = plain.match(TABLE_ROW_PATTERN);
  const inlineContent = inline?.[2]?.trim();
  if (inline?.[1] && inlineContent && inlineContent !== ":") {
    return { type: normalizeType(inline[1]), content: inlineContent };
  }

  const tabParts = line.split(/\t+/).map((part) => part.trim()).filter(Boolean);
  if (tabParts.length >= 2 && isTableTypeLabel(tabParts[0])) {
    return { type: normalizeType(tabParts[0]), content: tabParts.slice(1).join(" ").trim() };
  }

  return null;
}

function parseColonLabelOnly(line: string) {
  const plain = stripMarkdown(line);
  const match = plain.match(COLON_LABEL_ONLY_PATTERN);
  return match ? normalizeType(match[1]) : null;
}

function parseBracketOrColonLabel(line: string) {
  const plain = stripMarkdown(line);
  const bracket = plain.match(BRACKET_LABEL_PATTERN);
  if (bracket?.[2]?.trim()) {
    return { type: normalizeType(bracket[1]), content: bracket[2].trim() };
  }
  const colon = plain.match(COLON_LABEL_PATTERN);
  if (colon?.[2]?.trim()) {
    return { type: normalizeType(colon[1]), content: colon[2].trim() };
  }
  return null;
}

function stripScriptPreamble(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const startPattern =
    /^(HOOK|PROBLEM|PRODUCT DEMO|PROOF|CTA|BODY|FILMING NOTES|SPOKEN|VISUAL|CAPTIONS?|CTA|\[(HOOK|VISUAL|SPOKEN|CAPTIONS?|CTA)\]|\|?\s*Visual\s*\|)/i;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed || isSkippableLine(trimmed)) continue;
    if (
      startPattern.test(stripMarkdown(trimmed)) ||
      isSectionName(trimmed) ||
      parseTimedSectionHeader(trimmed) ||
      parseTableRow(trimmed) ||
      parseBracketOrColonLabel(trimmed) ||
      parseColonLabelOnly(trimmed)
    ) {
      return lines.slice(index).join("\n");
    }
  }

  return text;
}

function parseTimedSectionHeader(line: string) {
  const plain = stripMarkdown(line);
  const timed = plain.match(/^([A-Za-z][A-Za-z0-9\s/&-]+?)\s*\(([^)]+)\)\s*$/);
  if (timed) {
    return { name: timed[1].trim(), timing: timed[2].trim() };
  }
  return null;
}

function ensureSection(sections: ChatScriptSection[], name: string, timing?: string) {
  const existing = sections.find((section) => section.name === name && section.timing === timing);
  if (existing) return existing;
  const section: ChatScriptSection = { name, timing, rows: [] };
  sections.push(section);
  return section;
}

function finalizeSections(sections: ChatScriptSection[], fallback?: ChatScriptSection) {
  const merged = [...sections];
  if (merged.length === 0 && fallback && fallback.rows.length > 0) {
    merged.push(fallback);
  }
  return merged.filter((section) => section.rows.length > 0 || section.timing);
}

function parseLegacyLines(lines: string[]): ParsedChatScript {
  let title: string | undefined;
  let currentSection = ensureSection([], "Script");
  const sections: ChatScriptSection[] = [];
  let pendingLabel: ChatScriptRowType | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || isSkippableLine(trimmed)) continue;

    const directionNote = parseDirectionNote(trimmed);
    if (directionNote) {
      pendingLabel = null;
      currentSection.rows.push({ type: "note", content: directionNote });
      continue;
    }

    if (!title && isTitleLine(trimmed)) {
      title = stripMarkdown(trimmed);
      continue;
    }

    const timedHeader = parseTimedSectionHeader(trimmed);
    if (timedHeader) {
      pendingLabel = null;
      currentSection = ensureSection(sections, timedHeader.name, timedHeader.timing);
      continue;
    }

    if (isSectionName(trimmed)) {
      pendingLabel = null;
      currentSection = ensureSection(sections, stripMarkdown(trimmed));
      continue;
    }

    if (isTimingLine(trimmed)) {
      currentSection.timing = parseTiming(trimmed);
      continue;
    }

    const labelOnly = parseColonLabelOnly(trimmed);
    if (labelOnly) {
      pendingLabel = labelOnly;
      continue;
    }

    const label = parseBracketOrColonLabel(trimmed);
    if (label?.content) {
      pendingLabel = null;
      currentSection.rows.push(label);
      continue;
    }

    const tableRow = parseTableRow(trimmed);
    if (tableRow?.content && tableRow.content !== ":") {
      pendingLabel = null;
      currentSection.rows.push(tableRow);
      continue;
    }

    if (trimmed.startsWith("- ")) {
      pendingLabel = null;
      currentSection.rows.push({ type: "note", content: stripMarkdown(trimmed.slice(2)) });
      continue;
    }

    const plain = stripMarkdown(trimmed);
    if (!plain) continue;

    if (pendingLabel) {
      currentSection.rows.push({ type: pendingLabel, content: plain });
      pendingLabel = null;
      continue;
    }

    const last = currentSection.rows[currentSection.rows.length - 1];
    if (last && last.type === "body") {
      last.content = `${last.content}\n${plain}`;
      continue;
    }

    currentSection.rows.push({ type: "body", content: plain });
  }

  return {
    title,
    sections: finalizeSections(sections, currentSection),
  };
}

export function parseChatScript(raw: string): ParsedChatScript {
  const extracted = formatStudioNodeText(raw) || raw;
  const normalized = stripScriptPreamble(extracted.replace(/\r\n/g, "\n").trim());
  if (!normalized) return { sections: [] };

  const lines = normalized.split("\n");
  const parsed = parseLegacyLines(lines);

  if (parsed.sections.length === 0) {
    return parsed;
  }

  return {
    title: parsed.title,
    sections: parsed.sections
      .map((section) => ({
        ...section,
        rows: section.rows.filter(
          (row) =>
            row.type !== "body" ||
            (!isMarkdownSeparatorLine(row.content) && row.content !== "|:---|:---|"),
        ),
      }))
      .filter((section) => section.rows.length > 0),
  };
}

export function chatScriptTypeLabel(type: ChatScriptRowType) {
  switch (type) {
    case "hook":
      return "Hook";
    case "visual":
      return "Visual";
    case "spoken":
      return "Spoken";
    case "caption":
      return "Caption";
    case "cta":
      return "CTA";
    case "body":
      return "Direction";
    case "note":
      return "Note";
    default:
      return "Other";
  }
}
