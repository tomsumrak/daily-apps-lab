import crypto from "node:crypto";

export type DataForSeoCredentials = {
  login: string;
  password: string;
};

export type EncryptedCredentialBlob = {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
};

const SECRET_ENV = "DATAFORSEO_CREDENTIAL_ENCRYPTION_KEY";
const AUTH_SECRET_ENV = "AUTH_SECRET";

export class DataForSeoCredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataForSeoCredentialError";
  }
}

function getEncryptionKey() {
  const secret = process.env[SECRET_ENV]?.trim();

  if (secret && secret.length >= 32) {
    return crypto.createHash("sha256").update(secret).digest();
  }

  const authSecret = process.env[AUTH_SECRET_ENV]?.trim();

  if (
    process.env.NODE_ENV !== "production" &&
    authSecret &&
    authSecret.length >= 32
  ) {
    return crypto
      .createHash("sha256")
      .update(`${SECRET_ENV}:development:${authSecret}`)
      .digest();
  }

  throw new Error(
    `${SECRET_ENV} is a server-side app encryption key, not your DataForSEO API password. Configure it with a separate random value of at least 32 characters.`
  );
}

export function encryptCredentials(
  credentials: DataForSeoCredentials
): EncryptedCredentialBlob {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const plaintext = JSON.stringify(credentials);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
}

export function decryptCredentials(
  encrypted: EncryptedCredentialBlob
): DataForSeoCredentials {
  if (encrypted.version !== 1 || encrypted.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported credential encryption format.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(encrypted.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");

  const parsed = JSON.parse(plaintext) as Partial<DataForSeoCredentials>;

  if (
    typeof parsed.login !== "string" ||
    typeof parsed.password !== "string"
  ) {
    throw new Error("Credential payload is invalid.");
  }

  return normalizeDataForSeoCredentials(parsed);
}

function extractBasicToken(value: string) {
  const trimmed = value.trim();
  const authorizationMatch = trimmed.match(/^Authorization:\s*Basic\s+(.+)$/i);

  if (authorizationMatch?.[1]) {
    return { token: authorizationMatch[1].trim(), explicit: true };
  }

  const basicMatch = trimmed.match(/^Basic\s+(.+)$/i);

  if (basicMatch?.[1]) {
    return { token: basicMatch[1].trim(), explicit: true };
  }

  return { token: trimmed, explicit: false };
}

function decodeBasicCredentialToken(value: string) {
  const { token, explicit } = extractBasicToken(value);

  if (!token || !/^[A-Za-z0-9+/_=-]+$/.test(token)) {
    return { decoded: null, explicit };
  }

  try {
    const decodedText = Buffer.from(
      token.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    const separatorIndex = decodedText.indexOf(":");

    if (separatorIndex <= 0) {
      return { decoded: null, explicit };
    }

    const login = decodedText.slice(0, separatorIndex).trim();
    const password = decodedText.slice(separatorIndex + 1).trim();

    if (!login || !password) {
      return { decoded: null, explicit };
    }

    return {
      decoded: {
        login,
        password
      } satisfies DataForSeoCredentials,
      explicit
    };
  } catch {
    return { decoded: null, explicit };
  }
}

function isPlausibleApiLogin(value: string) {
  return /^[^\s:]+@[^\s:]+\.[^\s:]+$/.test(value) || /^[a-z0-9._-]+$/i.test(value);
}

export function normalizeDataForSeoCredentials(
  credentials: Partial<DataForSeoCredentials>
): DataForSeoCredentials {
  let login = credentials.login?.trim() ?? "";
  let password = credentials.password?.trim() ?? "";

  const { decoded, explicit } = decodeBasicCredentialToken(password);

  if (decoded) {
    if (login && decoded.login.toLowerCase() !== login.toLowerCase()) {
      if (explicit) {
        throw new DataForSeoCredentialError(
          "The pasted DataForSEO authorization token belongs to a different API login."
        );
      }
    } else if (explicit || isPlausibleApiLogin(decoded.login)) {
      login = decoded.login;
      password = decoded.password;
    }
  } else if (explicit) {
    throw new DataForSeoCredentialError(
      "Paste the raw DataForSEO API password, or a valid Basic authorization token."
    );
  }

  if (!login || !password) {
    throw new DataForSeoCredentialError(
      "Enter both DataForSEO API login and raw API password."
    );
  }

  return {
    login,
    password
  };
}

export function maskLogin(login: string) {
  const trimmed = login.trim();
  const at = trimmed.indexOf("@");

  if (at > 1) {
    return `${trimmed.slice(0, 2)}***${trimmed.slice(at)}`;
  }

  if (trimmed.length <= 4) {
    return "***";
  }

  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}
