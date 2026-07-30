// Stamps /Title and /Author into a PDF's Info dictionary.
//
// Why bother: Google uses a PDF's /Title as the title of its search result.
// The résumé shipped with /Title () and /Author () both empty (pdfTeX writes
// the keys but LaTeX never filled them), so a result for it would get an
// invented title. It's otherwise a strong asset for the name query — one page
// with a ~3.4k-character text layer, dense with the name, "Atlanta, GA", and
// "Georgia Institute of Technology".
//
// Done as an incremental update rather than by editing the Info dict in place:
// growing an existing object shifts every byte after it, which would
// invalidate the offsets recorded in the file's cross-reference streams. An
// incremental update appends a fresh Info object plus a new xref stream whose
// /Prev chains to the old one, so nothing already in the file moves. This is
// the same mechanism a PDF editor uses to save an annotation.
//
// Runs at build time (see build-seo.mjs) against content/*.pdf rather than
// being committed as a modified binary, so replacing the résumé can't
// silently drop the metadata again.
//
// Two deliberate constraints:
//   - ASCII only in the values. A PDF literal string is bytes, and non-ASCII
//     would need a UTF-16BE hex string with a BOM to be read correctly by
//     every consumer. Not worth it for a title, so no em dashes here.
//   - The new xref stream is uncompressed (no /Filter, no /Predictor), which
//     is valid and keeps this dependency-free — no zlib round-trip through a
//     PNG predictor just to write two 7-byte entries.

/** Escapes a string for use as a PDF literal string. */
function pdfString(value) {
  const ascii = value.replace(/[^\x20-\x7E]/g, "-");
  return `(${ascii.replace(/([\\()])/g, "\\$1")})`;
}

function replaceInfoField(body, key, value) {
  // Matches `/Key (...)` including escaped parens inside the string.
  const pattern = new RegExp(`/${key}\\s*\\((?:[^()\\\\]|\\\\.)*\\)`);
  const replacement = `/${key} ${pdfString(value)}`;
  return pattern.test(body)
    ? body.replace(pattern, replacement)
    : `${body.replace(/>>\s*$/, "")} ${replacement} >>`;
}

/**
 * Returns a new Buffer for `bytes` with `title`/`author` set on its Info dict.
 * Throws rather than returning the input unchanged if the PDF's structure
 * isn't what's expected — a silently unstamped résumé would look like success.
 */
export function stampPdfMetadata(bytes, { title, author }) {
  const src = bytes.toString("latin1");

  const sxIndex = src.lastIndexOf("startxref");
  if (sxIndex === -1) throw new Error("pdf-metadata: no startxref");
  const prev = parseInt(src.slice(sxIndex + "startxref".length).trim(), 10);
  if (!Number.isInteger(prev)) throw new Error("pdf-metadata: bad startxref");

  // The newest cross-reference section carries the trailer fields this update
  // has to preserve (/Root, /Size, /ID) and the Info object it points at.
  const trailer = src.slice(prev, prev + 600);
  const root = trailer.match(/\/Root\s+(\d+)\s+0\s+R/);
  const size = trailer.match(/\/Size\s+(\d+)/);
  const infoRef = trailer.match(/\/Info\s+(\d+)\s+0\s+R/);
  const id = trailer.match(/\/ID\s*\[[^\]]*\]/);
  if (!root || !size) {
    throw new Error("pdf-metadata: could not read /Root and /Size from trailer");
  }

  // Carry the existing Info dictionary forward so CreationDate, Creator and
  // Producer survive; only Title/Author are overridden.
  let infoBody = "<< >>";
  if (infoRef) {
    const objPattern = new RegExp(
      `(?:^|[^0-9])${infoRef[1]} 0 obj\\s*([\\s\\S]*?)\\s*endobj`,
    );
    const found = src.match(objPattern);
    if (found) infoBody = found[1].trim();
  }
  infoBody = replaceInfoField(infoBody, "Title", title);
  infoBody = replaceInfoField(infoBody, "Author", author);

  const firstFree = parseInt(size[1], 10);
  const infoNum = firstFree;
  const xrefNum = firstFree + 1;

  const separator = src.endsWith("\n") ? "" : "\n";
  const infoOffset = bytes.length + separator.length;
  const infoObj = `${infoNum} 0 obj\n${infoBody}\nendobj\n`;
  const xrefOffset = infoOffset + infoObj.length;

  // /W [1 4 2]: one type byte, a four-byte offset, a two-byte generation.
  const entries = Buffer.alloc(14);
  for (const [i, offset] of [infoOffset, xrefOffset].entries()) {
    entries[i * 7] = 1; // type 1 — a normal, uncompressed object
    entries.writeUInt32BE(offset, i * 7 + 1);
    entries.writeUInt16BE(0, i * 7 + 5);
  }

  const xrefDict =
    `<< /Type /XRef /W [ 1 4 2 ] /Index [ ${infoNum} 2 ] ` +
    `/Size ${xrefNum + 1} /Root ${root[1]} 0 R /Info ${infoNum} 0 R ` +
    `/Prev ${prev}${id ? ` ${id[0]}` : ""} /Length ${entries.length} >>`;

  return Buffer.concat([
    bytes,
    Buffer.from(separator, "latin1"),
    Buffer.from(infoObj, "latin1"),
    Buffer.from(`${xrefNum} 0 obj\n${xrefDict}\nstream\n`, "latin1"),
    entries,
    Buffer.from("\nendstream\nendobj\n", "latin1"),
    Buffer.from(`startxref\n${xrefOffset}\n%%EOF\n`, "latin1"),
  ]);
}
