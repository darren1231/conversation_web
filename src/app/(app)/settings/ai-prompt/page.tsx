import { getAISystemPrompt } from "@/lib/actions/ai-settings";
import { DEFAULT_ANALYSIS_PROMPT } from "@/lib/ai-providers/default-prompt";
import { AIPromptForm } from "@/components/settings/AIPromptForm";

export default async function AIPromptSettingsPage() {
  const saved = await getAISystemPrompt();

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        AI 分析風格
      </h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        調整「AI 建議怎麼回」使用的分析角度與回覆偏好。
      </p>

      <AIPromptForm
        initialPrompt={saved ?? ""}
        defaultPrompt={DEFAULT_ANALYSIS_PROMPT}
      />
    </div>
  );
}
