import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 這個站台的每一頁都是動態渲染（都要即時讀 Supabase），而動態頁面的
    // client cache 預設是 0 秒 —— 代表「上一頁 / 再點回剛剛那一頁」都要重新
    // 跟伺服器要一次完整的頁面。這裡給 30 秒，讓來回切換是瞬間的；資料變動
    // 時 server action 的 revalidatePath 仍會讓快取失效，不會看到舊資料。
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
