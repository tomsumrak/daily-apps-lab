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

function getEncryptionKey() {
  const secret = process.env[SECRET_ENV];

  if (!secret || secret.length < 32) {
    throw new Error(
      `${SECRET_ENV} must be configured with at least 32 characters.`
    );
  }

  return crypto.createHash("sha256").update(secret).digest();
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

  return {
    login: parsed.login,
    password: parsed.password
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
