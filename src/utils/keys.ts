export type SupportedJwkFamily = "ECDSA" | "ED25519" | "RSA";

export type PemBlock = {
  bytes: Uint8Array;
  body: string;
  label: string;
};

export type ParsedOpenSshPrivateKey = {
  comment: string;
  keyType: string;
  publicKeyBlob: Uint8Array;
};

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return base64ToBytes(padded);
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

export function encodeUint32(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

export function encodeSshString(value: Uint8Array | string): Uint8Array {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return concatBytes([encodeUint32(bytes.length), bytes]);
}

function normalizeMpint(bytes: Uint8Array): Uint8Array {
  let start = 0;

  while (start < bytes.length - 1 && bytes[start] === 0) {
    start += 1;
  }

  const trimmed = bytes.slice(start);

  if (trimmed[0] && (trimmed[0] & 0x80) !== 0) {
    return concatBytes([new Uint8Array([0]), trimmed]);
  }

  return trimmed;
}

export function encodeSshMpint(bytes: Uint8Array): Uint8Array {
  const normalized = normalizeMpint(bytes);
  return concatBytes([encodeUint32(normalized.length), normalized]);
}

export function pemEncode(label: string, bytes: Uint8Array): string {
  const base64 = bytesToBase64(bytes);
  const lines = base64.match(/.{1,64}/g) ?? [];

  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

export function parsePemBlocks(input: string): PemBlock[] {
  const pattern = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/g;
  const blocks: PemBlock[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    const label = match[1].trim();
    const body = match[2].replace(/[\r\n\t ]+/g, "");

    if (!body) {
      continue;
    }

    try {
      blocks.push({
        label,
        body,
        bytes: base64ToBytes(body),
      });
    } catch {
      continue;
    }
  }

  return blocks;
}

function readUint32(bytes: Uint8Array, offset: number): { nextOffset: number; value: number } {
  if (offset + 4 > bytes.length) {
    throw new Error("Unexpected end of key data.");
  }

  const value =
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3];

  return { value: value >>> 0, nextOffset: offset + 4 };
}

function readBytes(bytes: Uint8Array, offset: number, length: number): { nextOffset: number; value: Uint8Array } {
  if (offset + length > bytes.length) {
    throw new Error("Unexpected end of key data.");
  }

  return {
    value: bytes.slice(offset, offset + length),
    nextOffset: offset + length,
  };
}

function readSshStringBytes(bytes: Uint8Array, offset: number): { nextOffset: number; value: Uint8Array } {
  const { value: length, nextOffset: afterLength } = readUint32(bytes, offset);
  return readBytes(bytes, afterLength, length);
}

function readSshStringText(bytes: Uint8Array, offset: number): { nextOffset: number; value: string } {
  const { value, nextOffset } = readSshStringBytes(bytes, offset);
  return {
    value: new TextDecoder().decode(value),
    nextOffset,
  };
}

function getCheckInt(): number {
  return window.crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

function getPaddingLength(length: number, blockSize = 8): number {
  const remainder = length % blockSize;
  return remainder === 0 ? blockSize : blockSize - remainder;
}

function getRsaPublicBlob(jwk: JsonWebKey): Uint8Array {
  if (!jwk.e || !jwk.n) {
    throw new Error("The RSA JWK is missing public key fields.");
  }

  return concatBytes([
    encodeSshString("ssh-rsa"),
    encodeSshMpint(base64UrlToBytes(jwk.e)),
    encodeSshMpint(base64UrlToBytes(jwk.n)),
  ]);
}

function getRsaPrivateBlob(jwk: JsonWebKey): Uint8Array {
  if (!jwk.e || !jwk.n || !jwk.d || !jwk.p || !jwk.q || !jwk.qi) {
    throw new Error("The RSA JWK is missing private key fields.");
  }

  return concatBytes([
    encodeSshString("ssh-rsa"),
    encodeSshMpint(base64UrlToBytes(jwk.n)),
    encodeSshMpint(base64UrlToBytes(jwk.e)),
    encodeSshMpint(base64UrlToBytes(jwk.d)),
    encodeSshMpint(base64UrlToBytes(jwk.qi)),
    encodeSshMpint(base64UrlToBytes(jwk.p)),
    encodeSshMpint(base64UrlToBytes(jwk.q)),
  ]);
}

function getEcCurveInfo(crv: string): { sshCurve: string; sshLabel: string } {
  switch (crv) {
    case "P-256":
      return { sshCurve: "nistp256", sshLabel: "ecdsa-sha2-nistp256" };
    case "P-384":
      return { sshCurve: "nistp384", sshLabel: "ecdsa-sha2-nistp384" };
    case "P-521":
      return { sshCurve: "nistp521", sshLabel: "ecdsa-sha2-nistp521" };
    default:
      throw new Error(`Unsupported ECDSA curve: ${crv}`);
  }
}

function getEcPoint(jwk: JsonWebKey): Uint8Array {
  if (!jwk.x || !jwk.y) {
    throw new Error("The ECDSA JWK is missing public key fields.");
  }

  return concatBytes([
    new Uint8Array([4]),
    base64UrlToBytes(jwk.x),
    base64UrlToBytes(jwk.y),
  ]);
}

function getEcdsaPublicBlob(jwk: JsonWebKey): Uint8Array {
  if (!jwk.crv) {
    throw new Error("The ECDSA JWK is missing its curve.");
  }

  const curveInfo = getEcCurveInfo(jwk.crv);
  const point = getEcPoint(jwk);

  return concatBytes([
    encodeSshString(curveInfo.sshLabel),
    encodeSshString(curveInfo.sshCurve),
    encodeSshString(point),
  ]);
}

function getEcdsaPrivateBlob(jwk: JsonWebKey): Uint8Array {
  if (!jwk.crv || !jwk.d) {
    throw new Error("The ECDSA JWK is missing private key fields.");
  }

  const curveInfo = getEcCurveInfo(jwk.crv);
  const point = getEcPoint(jwk);

  return concatBytes([
    encodeSshString(curveInfo.sshLabel),
    encodeSshString(curveInfo.sshCurve),
    encodeSshString(point),
    encodeSshMpint(base64UrlToBytes(jwk.d)),
  ]);
}

function getEd25519PublicBlob(jwk: JsonWebKey): Uint8Array {
  if (!jwk.x) {
    throw new Error("The Ed25519 JWK is missing its public key.");
  }

  return concatBytes([
    encodeSshString("ssh-ed25519"),
    encodeSshString(base64UrlToBytes(jwk.x)),
  ]);
}

function getEd25519PrivateBlob(jwk: JsonWebKey): Uint8Array {
  if (!jwk.x || !jwk.d) {
    throw new Error("The Ed25519 JWK is missing private key fields.");
  }

  const publicKey = base64UrlToBytes(jwk.x);

  return concatBytes([
    encodeSshString("ssh-ed25519"),
    encodeSshString(publicKey),
    encodeSshString(concatBytes([base64UrlToBytes(jwk.d), publicKey])),
  ]);
}

export function getJwkFamily(jwk: JsonWebKey): SupportedJwkFamily | null {
  if (jwk.kty === "RSA") {
    return "RSA";
  }

  if (jwk.kty === "EC") {
    return "ECDSA";
  }

  if (jwk.kty === "OKP" && jwk.crv === "Ed25519") {
    return "ED25519";
  }

  return null;
}

export function derivePublicJwk(privateJwk: JsonWebKey): JsonWebKey {
  const family = getJwkFamily(privateJwk);

  switch (family) {
    case "RSA":
      if (!privateJwk.n || !privateJwk.e) {
        throw new Error("The RSA JWK is missing public key fields.");
      }

      return {
        kty: "RSA",
        n: privateJwk.n,
        e: privateJwk.e,
        alg: privateJwk.alg,
        key_ops: ["verify"],
        ext: true,
      };
    case "ECDSA":
      if (!privateJwk.crv || !privateJwk.x || !privateJwk.y) {
        throw new Error("The ECDSA JWK is missing public key fields.");
      }

      return {
        kty: "EC",
        crv: privateJwk.crv,
        x: privateJwk.x,
        y: privateJwk.y,
        alg: privateJwk.alg,
        key_ops: ["verify"],
        ext: true,
      };
    case "ED25519":
      if (!privateJwk.x || privateJwk.crv !== "Ed25519") {
        throw new Error("The Ed25519 JWK is missing public key fields.");
      }

      return {
        kty: "OKP",
        crv: "Ed25519",
        x: privateJwk.x,
        alg: privateJwk.alg,
        key_ops: ["verify"],
        ext: true,
      };
    default:
      throw new Error("Unsupported JWK type.");
  }
}

function getCryptoAlgorithmForJwk(
  jwk: JsonWebKey,
): AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams {
  const family = getJwkFamily(jwk);

  switch (family) {
    case "RSA":
      return {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      };
    case "ECDSA":
      if (!jwk.crv) {
        throw new Error("The ECDSA JWK is missing its curve.");
      }

      return {
        name: "ECDSA",
        namedCurve: jwk.crv,
      };
    case "ED25519":
      return {
        name: "Ed25519",
      };
    default:
      throw new Error("Unsupported JWK type.");
  }
}

function getPublicUsages(jwk: JsonWebKey): KeyUsage[] {
  const family = getJwkFamily(jwk);

  switch (family) {
    case "RSA":
    case "ECDSA":
    case "ED25519":
      return ["verify"];
    default:
      throw new Error("Unsupported JWK type.");
  }
}

function getPrivateUsages(jwk: JsonWebKey): KeyUsage[] {
  const family = getJwkFamily(jwk);

  switch (family) {
    case "RSA":
    case "ECDSA":
    case "ED25519":
      return ["sign"];
    default:
      throw new Error("Unsupported JWK type.");
  }
}

export async function publicJwkToPem(jwk: JsonWebKey): Promise<string> {
  const publicKey = await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    getCryptoAlgorithmForJwk(jwk),
    true,
    getPublicUsages(jwk),
  );
  const spki = await window.crypto.subtle.exportKey("spki", publicKey);

  return pemEncode("PUBLIC KEY", new Uint8Array(spki));
}

export async function privateJwkToPem(jwk: JsonWebKey): Promise<string> {
  const privateKey = await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    getCryptoAlgorithmForJwk(jwk),
    true,
    getPrivateUsages(jwk),
  );
  const pkcs8 = await window.crypto.subtle.exportKey("pkcs8", privateKey);

  return pemEncode("PRIVATE KEY", new Uint8Array(pkcs8));
}

export function publicJwkToOpenSshPublic(jwk: JsonWebKey, comment = ""): string {
  const family = getJwkFamily(jwk);
  const trimmedComment = comment.trim();
  const suffix = trimmedComment ? ` ${trimmedComment}` : "";

  switch (family) {
    case "RSA": {
      const blob = getRsaPublicBlob(jwk);
      return `ssh-rsa ${bytesToBase64(blob)}${suffix}`;
    }
    case "ECDSA": {
      const blob = getEcdsaPublicBlob(jwk);
      const curveInfo = getEcCurveInfo(jwk.crv ?? "");
      return `${curveInfo.sshLabel} ${bytesToBase64(blob)}${suffix}`;
    }
    case "ED25519": {
      const blob = getEd25519PublicBlob(jwk);
      return `ssh-ed25519 ${bytesToBase64(blob)}${suffix}`;
    }
    default:
      throw new Error("Unsupported JWK type.");
  }
}

export function publicJwkToOpenSshPublicBlob(jwk: JsonWebKey): Uint8Array {
  const family = getJwkFamily(jwk);

  switch (family) {
    case "RSA":
      return getRsaPublicBlob(jwk);
    case "ECDSA":
      return getEcdsaPublicBlob(jwk);
    case "ED25519":
      return getEd25519PublicBlob(jwk);
    default:
      throw new Error("Unsupported JWK type.");
  }
}

export function privateJwkToOpenSshPrivate(jwk: JsonWebKey, comment = ""): string {
  const family = getJwkFamily(jwk);
  const publicJwk = derivePublicJwk(jwk);
  const publicKeyBlob = publicJwkToOpenSshPublicBlob(publicJwk);
  let privateKeyBlob: Uint8Array;

  switch (family) {
    case "RSA":
      privateKeyBlob = getRsaPrivateBlob(jwk);
      break;
    case "ECDSA":
      privateKeyBlob = getEcdsaPrivateBlob(jwk);
      break;
    case "ED25519":
      privateKeyBlob = getEd25519PrivateBlob(jwk);
      break;
    default:
      throw new Error("Unsupported JWK type.");
  }

  const checkInt = getCheckInt();
  const privateSectionWithoutPadding = concatBytes([
    encodeUint32(checkInt),
    encodeUint32(checkInt),
    privateKeyBlob,
    encodeSshString(comment.trim()),
  ]);
  const paddingLength = getPaddingLength(privateSectionWithoutPadding.length);
  const padding = Uint8Array.from({ length: paddingLength }, (_, index) => index + 1);
  const privateSection = concatBytes([privateSectionWithoutPadding, padding]);
  const authMagic = new TextEncoder().encode("openssh-key-v1\0");
  const container = concatBytes([
    authMagic,
    encodeSshString("none"),
    encodeSshString("none"),
    encodeSshString(new Uint8Array()),
    encodeUint32(1),
    encodeSshString(publicKeyBlob),
    encodeSshString(privateSection),
  ]);

  return pemEncode("OPENSSH PRIVATE KEY", container);
}

export async function getOpenSshFingerprint(publicKeyBlob: Uint8Array): Promise<string> {
  const fingerprintBytes = new Uint8Array(
    await window.crypto.subtle.digest("SHA-256", toArrayBuffer(publicKeyBlob)),
  );

  return `SHA256:${bytesToBase64(fingerprintBytes).replace(/=+$/g, "")}`;
}

export function publicKeyBlobToOpenSsh(publicKeyBlob: Uint8Array, comment = ""): string {
  const { value: keyType } = readSshStringText(publicKeyBlob, 0);
  const trimmedComment = comment.trim();

  return `${keyType} ${bytesToBase64(publicKeyBlob)}${trimmedComment ? ` ${trimmedComment}` : ""}`;
}

function trimLeadingZeros(bytes: Uint8Array): Uint8Array {
  let start = 0;

  while (start < bytes.length - 1 && bytes[start] === 0) {
    start += 1;
  }

  return bytes.slice(start);
}

export function openSshPublicBlobToJwk(publicKeyBlob: Uint8Array): JsonWebKey {
  const keyType = readSshStringText(publicKeyBlob, 0);
  let offset = keyType.nextOffset;

  switch (keyType.value) {
    case "ssh-rsa": {
      const exponent = readSshStringBytes(publicKeyBlob, offset);
      offset = exponent.nextOffset;
      const modulus = readSshStringBytes(publicKeyBlob, offset);

      return {
        kty: "RSA",
        e: bytesToBase64Url(trimLeadingZeros(exponent.value)),
        n: bytesToBase64Url(trimLeadingZeros(modulus.value)),
        ext: true,
        key_ops: ["verify"],
      };
    }
    case "ssh-ed25519": {
      const publicKey = readSshStringBytes(publicKeyBlob, offset);

      return {
        kty: "OKP",
        crv: "Ed25519",
        x: bytesToBase64Url(publicKey.value),
        ext: true,
        key_ops: ["verify"],
      };
    }
    case "ecdsa-sha2-nistp256":
    case "ecdsa-sha2-nistp384":
    case "ecdsa-sha2-nistp521": {
      const curve = readSshStringText(publicKeyBlob, offset);
      offset = curve.nextOffset;
      const point = readSshStringBytes(publicKeyBlob, offset);
      const curveLengthMap: Record<string, number> = {
        nistp256: 32,
        nistp384: 48,
        nistp521: 66,
      };
      const coordinateLength = curveLengthMap[curve.value];

      if (!coordinateLength || point.value[0] !== 4) {
        throw new Error("The ECDSA public key point is invalid.");
      }

      const x = point.value.slice(1, 1 + coordinateLength);
      const y = point.value.slice(1 + coordinateLength, 1 + coordinateLength * 2);

      return {
        kty: "EC",
        crv:
          curve.value === "nistp256"
            ? "P-256"
            : curve.value === "nistp384"
              ? "P-384"
              : "P-521",
        x: bytesToBase64Url(x),
        y: bytesToBase64Url(y),
        ext: true,
        key_ops: ["verify"],
      };
    }
    default:
      throw new Error(`Unsupported SSH public key type: ${keyType.value}`);
  }
}

function skipPrivateKeyRecord(bytes: Uint8Array, offset: number, keyType: string): number {
  let nextOffset = offset;

  switch (keyType) {
    case "ssh-rsa":
      for (let index = 0; index < 6; index += 1) {
        nextOffset = readSshStringBytes(bytes, nextOffset).nextOffset;
      }
      return nextOffset;
    case "ssh-ed25519":
      nextOffset = readSshStringBytes(bytes, nextOffset).nextOffset;
      nextOffset = readSshStringBytes(bytes, nextOffset).nextOffset;
      return nextOffset;
    case "ecdsa-sha2-nistp256":
    case "ecdsa-sha2-nistp384":
    case "ecdsa-sha2-nistp521":
      nextOffset = readSshStringText(bytes, nextOffset).nextOffset;
      nextOffset = readSshStringBytes(bytes, nextOffset).nextOffset;
      nextOffset = readSshStringBytes(bytes, nextOffset).nextOffset;
      return nextOffset;
    default:
      throw new Error(`Unsupported OpenSSH private key type: ${keyType}`);
  }
}

export function parseOpenSshPrivateKey(input: string): ParsedOpenSshPrivateKey {
  const block = parsePemBlocks(input).find((entry) => entry.label === "OPENSSH PRIVATE KEY");

  if (!block) {
    throw new Error("No OpenSSH private key block was found.");
  }

  const bytes = block.bytes;
  const magic = new TextEncoder().encode("openssh-key-v1\0");

  if (bytes.length < magic.length) {
    throw new Error("The OpenSSH private key is incomplete.");
  }

  for (let index = 0; index < magic.length; index += 1) {
    if (bytes[index] !== magic[index]) {
      throw new Error("The OpenSSH private key header is invalid.");
    }
  }

  let offset = magic.length;
  const ciphername = readSshStringText(bytes, offset);
  offset = ciphername.nextOffset;
  const kdfname = readSshStringText(bytes, offset);
  offset = kdfname.nextOffset;
  offset = readSshStringBytes(bytes, offset).nextOffset;
  const keyCount = readUint32(bytes, offset);
  offset = keyCount.nextOffset;

  if (ciphername.value !== "none" || kdfname.value !== "none") {
    throw new Error("Encrypted OpenSSH private keys are not supported in this tool.");
  }

  if (keyCount.value !== 1) {
    throw new Error("Only single-key OpenSSH private key files are supported.");
  }

  const publicKeyBlob = readSshStringBytes(bytes, offset);
  offset = publicKeyBlob.nextOffset;
  const privateSection = readSshStringBytes(bytes, offset);

  let privateOffset = 0;
  const privateBytes = privateSection.value;
  const checkInt1 = readUint32(privateBytes, privateOffset);
  privateOffset = checkInt1.nextOffset;
  const checkInt2 = readUint32(privateBytes, privateOffset);
  privateOffset = checkInt2.nextOffset;

  if (checkInt1.value !== checkInt2.value) {
    throw new Error("The OpenSSH private key integrity check failed.");
  }

  const keyType = readSshStringText(privateBytes, privateOffset);
  privateOffset = keyType.nextOffset;
  privateOffset = skipPrivateKeyRecord(privateBytes, privateOffset, keyType.value);
  const comment = readSshStringText(privateBytes, privateOffset);

  return {
    keyType: keyType.value,
    comment: comment.value,
    publicKeyBlob: publicKeyBlob.value,
  };
}

export async function importPkcs8PrivateKeyToJwk(pkcs8Bytes: Uint8Array): Promise<JsonWebKey> {
  const attempts: Array<{
    algorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams;
    usages: KeyUsage[];
  }> = [
    { algorithm: { name: "Ed25519" }, usages: ["sign"] },
    { algorithm: { name: "ECDSA", namedCurve: "P-256" }, usages: ["sign"] },
    { algorithm: { name: "ECDSA", namedCurve: "P-384" }, usages: ["sign"] },
    { algorithm: { name: "ECDSA", namedCurve: "P-521" }, usages: ["sign"] },
    { algorithm: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, usages: ["sign"] },
  ];

  for (const attempt of attempts) {
    try {
      const privateKey = await window.crypto.subtle.importKey(
        "pkcs8",
        toArrayBuffer(pkcs8Bytes),
        attempt.algorithm,
        true,
        attempt.usages,
      );

      return (await window.crypto.subtle.exportKey("jwk", privateKey)) as JsonWebKey;
    } catch {
      continue;
    }
  }

  throw new Error("This PKCS#8 private key type is not supported.");
}
