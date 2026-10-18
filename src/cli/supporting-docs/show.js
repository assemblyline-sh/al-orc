import { writeFileSync } from 'node:fs';
import { clientFor } from '../_helpers.js';
import { formatHeader, formatField, formatBytes, formatDate } from '../utils/format.js';

/** `al-orc supporting-docs show <id>` — metadata (+ markdown content); --save <path> downloads files. */
export async function showSupportingDocHandler(argv) {
  const { id, save, json } = argv;

  const orc = clientFor();
  const doc = await orc.supportingDocs.get(id);

  if (json) {
    console.log(JSON.stringify(doc, null, 2));
    return;
  }

  if (!doc) {
    console.error(`Supporting document not found: ${id}`);
    process.exit(1);
  }

  console.log(formatHeader('Supporting Document', doc.id));
  console.log('');
  const lw = 16;
  console.log(formatField('Title', doc.title ?? doc.name, lw));
  console.log(formatField('Type', doc.type, lw));
  if (doc.step_slug) console.log(formatField('Step', doc.step_slug, lw));
  if (doc.filename) console.log(formatField('Filename', doc.filename, lw));
  if (doc.mime_type) console.log(formatField('MIME Type', doc.mime_type, lw));
  if (doc.size_bytes) console.log(formatField('Size', formatBytes(doc.size_bytes), lw));
  if (doc.work_record_id) console.log(formatField('Work Record', doc.work_record_id, lw));
  console.log(formatField('Created', formatDate(doc.created_at), lw));

  if (doc.type === 'markdown' && doc.content) {
    console.log('\n--- Content ---\n');
    console.log(doc.content);
  }

  if (doc.type === 'file') {
    if (save) {
      const { response } = await orc.supportingDocs.downloadStream(id);
      const buffer = Buffer.from(await response.arrayBuffer());
      writeFileSync(save, buffer);
      console.log(`\nSaved to: ${save}`);
    } else {
      console.log('\nUse --save <path> to download this file.');
    }
  }
}
