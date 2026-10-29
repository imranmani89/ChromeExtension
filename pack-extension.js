const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const sourceFiles = ['manifest.json', 'popup.html', 'popup.js', 'background.js', 'icons/icon2.png'];
const outputDirectory = path.join(__dirname, 'dist');
const outputPath = path.join(outputDirectory, 'dropmunk.zip');
const legacyOutputPath = path.join(__dirname, 'packed-extension', 'live-download-speed-monitor.zip');

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(buffer) {
  let checksum = 0xffffffff;
  for (const byte of buffer) {
    checksum = crcTable[(checksum ^ byte) & 0xff] ^ (checksum >>> 8);
  }
  return (checksum ^ 0xffffffff) >>> 0;
}

const localFileHeaders = [];
const centralDirectoryEntries = [];
let offset = 0;

for (const fileName of sourceFiles) {
  const fileData = fs.readFileSync(path.join(__dirname, fileName));
  const compressedData = zlib.deflateRawSync(fileData);
  const encodedName = Buffer.from(fileName, 'utf8');
  const checksum = crc32(fileData);

  const localHeader = Buffer.alloc(30 + encodedName.length);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0x0800, 6);
  localHeader.writeUInt16LE(8, 8);
  localHeader.writeUInt16LE(0, 10);
  localHeader.writeUInt16LE(0x21, 12);
  localHeader.writeUInt32LE(checksum, 14);
  localHeader.writeUInt32LE(compressedData.length, 18);
  localHeader.writeUInt32LE(fileData.length, 22);
  localHeader.writeUInt16LE(encodedName.length, 26);
  localHeader.writeUInt16LE(0, 28);
  encodedName.copy(localHeader, 30);
  localFileHeaders.push(localHeader, compressedData);

  const centralEntry = Buffer.alloc(46 + encodedName.length);
  centralEntry.writeUInt32LE(0x02014b50, 0);
  centralEntry.writeUInt16LE(20, 4);
  centralEntry.writeUInt16LE(20, 6);
  centralEntry.writeUInt16LE(0x0800, 8);
  centralEntry.writeUInt16LE(8, 10);
  centralEntry.writeUInt16LE(0, 12);
  centralEntry.writeUInt16LE(0x21, 14);
  centralEntry.writeUInt32LE(checksum, 16);
  centralEntry.writeUInt32LE(compressedData.length, 20);
  centralEntry.writeUInt32LE(fileData.length, 24);
  centralEntry.writeUInt16LE(encodedName.length, 28);
  centralEntry.writeUInt16LE(0, 30);
  centralEntry.writeUInt16LE(0, 32);
  centralEntry.writeUInt16LE(0, 34);
  centralEntry.writeUInt16LE(0, 36);
  centralEntry.writeUInt32LE(0, 38);
  centralEntry.writeUInt32LE(offset, 42);
  encodedName.copy(centralEntry, 46);
  centralDirectoryEntries.push(centralEntry);

  offset += localHeader.length + compressedData.length;
}

const centralDirectory = Buffer.concat(centralDirectoryEntries);
const endOfCentralDirectory = Buffer.alloc(22);
endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
endOfCentralDirectory.writeUInt16LE(0, 4);
endOfCentralDirectory.writeUInt16LE(0, 6);
endOfCentralDirectory.writeUInt16LE(sourceFiles.length, 8);
endOfCentralDirectory.writeUInt16LE(sourceFiles.length, 10);
endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
endOfCentralDirectory.writeUInt32LE(offset, 16);
endOfCentralDirectory.writeUInt16LE(0, 20);

const archive = Buffer.concat([...localFileHeaders, centralDirectory, endOfCentralDirectory]);
fs.mkdirSync(outputDirectory, { recursive: true });
fs.mkdirSync(path.dirname(legacyOutputPath), { recursive: true });
fs.writeFileSync(outputPath, archive);
fs.writeFileSync(legacyOutputPath, archive);

console.log(`Created ${path.relative(__dirname, outputPath)}`);
console.log(`Updated ${path.relative(__dirname, legacyOutputPath)}`);
