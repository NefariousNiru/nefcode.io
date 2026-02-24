// file: tracker/src/shared/ids.ts

export function uuidv4(): string {
	const cryptoObj = globalThis.crypto;

	if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();

	const buf = new Uint8Array(16);
	cryptoObj.getRandomValues(buf);

	// RFC4122 v4
	buf[6] = (buf[6] & 0x0f) | 0x40;
	buf[8] = (buf[8] & 0x3f) | 0x80;

	const hex = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
