import crypto from "crypto";

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || "";

if (!ENCRYPTION_KEY) {
  console.warn(
    "API_KEY_ENCRYPTION_KEY not set. API keys will be stored in plaintext (NOT SECURE)."
  );
}

// 使用 AES-256-GCM 加密 API Key
export function encryptApiKey(apiKey: string): string {
  if (!ENCRYPTION_KEY) {
    // 如果没有加密密钥，直接返回（开发环境）
    // 生产环境必须设置 API_KEY_ENCRYPTION_KEY
    return apiKey;
  }

  try {
    const algorithm = "aes-256-gcm";
    const key = crypto
      .createHash("sha256")
      .update(ENCRYPTION_KEY)
      .digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(apiKey, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // 格式：iv + authTag + encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt API key");
  }
}

// 解密 API Key
export function decryptApiKey(encrypted: string): string {
  if (!ENCRYPTION_KEY) {
    // 如果没有加密密钥，直接返回（开发环境）
    return encrypted;
  }

  try {
    const parts = encrypted.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted format");
    }

    const algorithm = "aes-256-gcm";
    const key = crypto
      .createHash("sha256")
      .update(ENCRYPTION_KEY)
      .digest();
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt API key");
  }
}
