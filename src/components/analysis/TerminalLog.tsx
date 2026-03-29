import type { LogLine } from "@/types/ui";

const COLOR_MAP = {
  green: "text-accent",
  white: "text-white",
  muted: "text-[#555]",
};

/** Caixa de log estilo terminal */
export const TerminalLog = ({ logs }: { logs: LogLine[] }) => {
  if (logs.length === 0) return null;

  return (
    <div className="mt-2 ml-6 bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg p-3 overflow-x-auto">
      <div className="terminal-log space-y-0.5">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            {log.timestamp && (
              <span className="text-[#444] shrink-0">[{log.timestamp}]</span>
            )}
            <span className={COLOR_MAP[log.color]}>{log.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
