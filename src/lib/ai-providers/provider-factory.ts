import { AIProvider, APICredentialConfig, SupportedProvider } from "./types";
import { OpenAIProvider } from "./openai-provider";

export class ProviderFactory {
  static createProvider(config: APICredentialConfig): AIProvider {
    const provider = config.provider.toLowerCase() as SupportedProvider;

    switch (provider) {
      case "openai":
        return new OpenAIProvider(config.apiKey, config.model);

      case "claude":
        // 待实现
        throw new Error("Claude provider not yet implemented");

      case "gemini":
        // 待实现
        throw new Error("Gemini provider not yet implemented");

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
