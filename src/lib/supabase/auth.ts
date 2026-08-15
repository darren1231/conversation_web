import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * 取得目前登入者（伺服器端專用）。
 *
 * 刻意不用 `auth.getUser()`：那個方法每次呼叫都會往 Supabase Auth API 打一次
 * 網路請求，而「使用者是誰」是每一個 server component 和每一個 server action
 * 的第一件事，所以那些 round trip 全都排在真正的資料查詢前面 —— 使用者按下
 * 按鈕後要先空等一到兩趟往返，畫面才會開始動。
 *
 * `getClaims()` 改成驗證 JWT 本身：專案使用非對稱簽章金鑰時，會用快取過的
 * JWKS 在本機驗章，不需要連線；仍在用舊的對稱式 secret 的專案則會自動退回
 * 跟 `getUser()` 一樣的伺服器驗證。也就是說安全性沒有打折（token 一樣有驗過
 * 簽章，過期一樣會被擋，快過期時一樣會先換發 session），只是常見情況下少掉
 * 一趟網路往返。實際的資料存取權限仍由 RLS 把關。
 *
 * 外層再包一次 React `cache()`：同一次 render 內不管幾個元件問「誰登入了」，
 * 都共用同一份結果。
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const claims = data?.claims;
  if (!claims?.sub) return null;

  const email = claims.email;
  return {
    id: claims.sub,
    email: typeof email === "string" ? email : null,
  };
});
