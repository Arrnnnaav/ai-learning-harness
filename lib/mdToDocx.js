const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx');

const HEADING_BY_LEVEL = [null, HeadingLevel.TITLE, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];

function lineToParagraph(line) {
  const heading = line.match(/^(#{1,4})\s+(.*)/);
  if (heading) {
    return new Paragraph({ text: heading[2], heading: HEADING_BY_LEVEL[heading[1].length] });
  }
  const checklist = line.match(/^- \[([ x])\]\s+(.*)/);
  if (checklist) {
    return new Paragraph({ text: `${checklist[1] === 'x' ? '☑' : '☐'} ${checklist[2]}`, bullet: { level: 0 } });
  }
  const bullet = line.match(/^[-*]\s+(.*)/);
  if (bullet) {
    return new Paragraph({ text: bullet[1], bullet: { level: 0 } });
  }
  if (line.trim().startsWith('```')) return null;
  if (!line.trim()) return new Paragraph({ text: '' });
  return new Paragraph({ children: [new TextRun(line)] });
}

async function markdownToDocxBuffer(markdown) {
  const paragraphs = markdown
    .split('\n')
    .map(lineToParagraph)
    .filter(Boolean);
  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBuffer(doc);
}

module.exports = { markdownToDocxBuffer };
