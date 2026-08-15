import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/storage";
import { Avatar } from "@/components/ui/Avatar";

/**
 * 頭像圖片的網址要另外跟 Storage 換一趟 signed URL，而且一定要等資料列先回來
 * 才知道路徑 —— 排進主流程就等於整頁多等一趟往返，只為了一張小圖。
 *
 * 這裡把那趟往返包進自己的 Suspense：先畫出首字圓形（Avatar 沒有 src 時的樣子，
 * 尺寸完全相同所以不會跳版），圖片換好之後再串流補上。
 */
export function StreamedAvatar({
  path,
  name,
  size = 40,
  className,
}: {
  path: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const fallback = <Avatar name={name} size={size} className={className} />;
  if (!path) return fallback;

  return (
    <Suspense fallback={fallback}>
      <SignedAvatar path={path} name={name} size={size} className={className} />
    </Suspense>
  );
}

async function SignedAvatar({
  path,
  name,
  size,
  className,
}: {
  path: string;
  name: string;
  size: number;
  className?: string;
}) {
  const supabase = await createClient();
  const urls = await getSignedUrls(supabase, [path]);
  return (
    <Avatar
      src={urls[path] ?? null}
      name={name}
      size={size}
      className={className}
    />
  );
}

/**
 * 清單用的版本：一整頁的頭像共用「同一個」還沒 await 的批次簽章 Promise，
 * 所以還是只發一次 Storage 請求，但每張卡片的文字都不必等它回來。
 */
export function StreamedAvatarFromBatch({
  urls,
  path,
  name,
  size = 40,
  className,
}: {
  urls: Promise<Record<string, string>>;
  path: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const fallback = <Avatar name={name} size={size} className={className} />;
  if (!path) return fallback;

  return (
    <Suspense fallback={fallback}>
      <AvatarFromBatch
        urls={urls}
        path={path}
        name={name}
        size={size}
        className={className}
      />
    </Suspense>
  );
}

async function AvatarFromBatch({
  urls,
  path,
  name,
  size,
  className,
}: {
  urls: Promise<Record<string, string>>;
  path: string;
  name: string;
  size: number;
  className?: string;
}) {
  const resolved = await urls;
  return (
    <Avatar
      src={resolved[path] ?? null}
      name={name}
      size={size}
      className={className}
    />
  );
}
