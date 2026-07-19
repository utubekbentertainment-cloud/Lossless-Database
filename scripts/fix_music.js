const fs = require('fs');

const CANVAS_FILE = 'music.json';

function fixCanvas() {
  console.log('--- Starting music.json Auto-fix ---');

  if (!fs.existsSync(CANVAS_FILE)) {
    console.error(`Error: ${CANVAS_FILE} not found!`);
    process.exit(1);
  }

  const content = fs.readFileSync(CANVAS_FILE, 'utf8');

  let data;
  try {
    data = JSON.parse(content);
    fs.writeFileSync(CANVAS_FILE, JSON.stringify(data, null, 2));
    console.log('JSON is already valid, formatted successfully.');
    return;
  } catch (err) {
    console.log(`JSON parse failed (${err.message}). Attempting regex extraction...`);
  }
  const itemRegex = /\{[^{}]*\}/g;
  const items = [];
  let match;
  let hasExtracted = false;

  while ((match = itemRegex.exec(content)) !== null) {
    const block = match[0];
    const songMatch = /"song"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/.exec(block);
    const artistMatch = /"artist"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/.exec(block);
    const urlMatch = /"url"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/.exec(block);

    if (songMatch && artistMatch && urlMatch) {
      try {
        items.push({
          song: JSON.parse('"' + songMatch[1] + '"'),
          artist: JSON.parse('"' + artistMatch[1] + '"'),
          url: JSON.parse('"' + urlMatch[1] + '"')
        });
        hasExtracted = true;
      } catch (e) {
      }
    }
  }
  if (!hasExtracted) {
    console.log('No valid {} blocks found, attempting sequential field extraction...');
    const songRegex = /"song"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    const artistRegex = /"artist"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    const urlRegex = /"url"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;

    const songs = [...content.matchAll(songRegex)].map(m => m[1]);
    const artists = [...content.matchAll(artistRegex)].map(m => m[1]);
    const urls = [...content.matchAll(urlRegex)].map(m => m[1]);

    const count = Math.min(songs.length, artists.length, urls.length);
    for (let i = 0; i < count; i++) {
      try {
        items.push({
          song: JSON.parse('"' + songs[i] + '"'),
          artist: JSON.parse('"' + artists[i] + '"'),
          url: JSON.parse('"' + urls[i] + '"')
        });
      } catch (e) {}
    }
  }
  const uniqueItems = [];
  const seen = new Set();
  for (const item of items) {
    const key = `${item.song.toLowerCase().trim()}|${item.artist.toLowerCase().trim()}|${item.url.trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    }
  }
  items.length = 0;
  items.push(...uniqueItems);

  if (items.length > 0) {
    const newData = { items };
    fs.writeFileSync(CANVAS_FILE, JSON.stringify(newData, null, 2));
    console.log(`Auto-fixed JSON and recovered ${items.length} items.`);
  } else {
    console.error('Could not auto-fix JSON. No valid item fields found.');
    process.exit(1);
  }
}

fixCanvas();
