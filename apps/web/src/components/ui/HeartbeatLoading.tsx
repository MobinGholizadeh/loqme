import { LoqmeLogo } from "./LoqmeLogo";
export function HeartbeatLoading() {
  return (
    <div
      role="status"
      className="loading-state min-h-[260px] flex flex-col items-center justify-center gap-5"
    >
      <div className="heartbeat">
        <LoqmeLogo size={56} variant="icon" />
      </div>
      <span className="text-sm text-loqme-neutral-600">
        در حال آماده‌سازی لقمه‌ها…
      </span>
    </div>
  );
}
