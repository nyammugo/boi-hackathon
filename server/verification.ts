import { createHash } from "node:crypto";

// Issued sample records are maintained here, never created from uploaded files.
// Hash covers all extracted text except the code line, with whitespace collapsed.
const sampleRecords: Record<string, string> = {
  "PLAINLY-DEMO-2026-001":
    "bafcbc3da6d769551a2e2983392b02b7d053248e85ce08455789d3ab03a142b2",
};

export function verifyLetter(content: string) {
  const codes = [
    ...content.matchAll(/^Demo[ \t]+verification[ \t]+code:[^\r\n]*$/gm),
  ];
  if (codes.length === 0)
    return {
      status: "missing",
      title: "Not verified — no demo code",
      detail:
        "No demo verification code was found. This does not mean the letter is fake.",
    };
  if (codes.length !== 1)
    return {
      status: "mismatch",
      title: "Not verified — conflicting codes",
      detail:
        "More than one demo code was found, so this letter could not be matched to a sample record.",
    };
  const code = codes[0][0].slice(codes[0][0].indexOf(":") + 1).trim();
  const expected = Object.hasOwn(sampleRecords, code)
    ? sampleRecords[code]
    : undefined;
  if (!expected)
    return {
      status: "unknown",
      title: "Not verified — unknown demo code",
      detail:
        "This code is not in the trusted demo records. This does not establish whether the letter is genuine or fake.",
    };
  const body = content.replace(codes[0][0], "").replace(/\s+/g, " ").trim();
  const actual = createHash("sha256").update(body).digest("hex");
  if (actual !== expected)
    return {
      status: "mismatch",
      title: "Not verified — text does not match",
      detail:
        "The demo code is recognised, but the letter text differs from the stored sample. A copied code alone does not verify a letter.",
    };
  return {
    status: "matched",
    title: "Demo sample matched",
    detail:
      "The code and extracted text match our stored sample. This is a demo check, not confirmation that a bank issued the letter.",
  };
}
