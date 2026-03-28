/**
 * Official LupAI V1A logo component.
 * Green variant for dark backgrounds, dark variant for light/cream backgrounds.
 */
export const LupaiLogo = ({
  size = 32,
  variant = "green",
  withText = false,
  textSize = "text-sm",
}: {
  size?: number;
  variant?: "green" | "dark";
  withText?: boolean;
  textSize?: string;
}) => {
  const fill = variant === "green" ? "#C8FF3C" : "#1a1a1a";
  const opacities =
    variant === "green"
      ? [0.15, 0.3, 0.55, 0.85]
      : [0.08, 0.15, 0.3, 0.6];
  const textColor = variant === "green" ? "text-white" : "text-[#1A1A1A]";

  return (
    <span className="inline-flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="4" y="4" width="14" height="14" rx="3" fill={fill} opacity={opacities[0]} />
        <rect x="8" y="8" width="16" height="16" rx="3" fill={fill} opacity={opacities[1]} />
        <rect x="12" y="12" width="16" height="16" rx="3" fill={fill} opacity={opacities[2]} />
        <rect x="16" y="16" width="12" height="12" rx="3" fill={fill} opacity={opacities[3]} />
        <line x1="30" y1="30" x2="42" y2="42" stroke={fill} strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      {withText && (
        <span className={`font-semibold tracking-wider ${textSize} ${textColor}`}>
          LUPAI
        </span>
      )}
    </span>
  );
};
