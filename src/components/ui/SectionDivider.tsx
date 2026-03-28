/**
 * Diagonal SVG divider between sections.
 * `from` is the color above, `to` is the color below.
 */
export const SectionDivider = ({
  from,
  to,
}: {
  from: string;
  to: string;
}) => {
  return (
    <div style={{ position: "relative", zIndex: 2 }}>
      <svg
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className="w-full h-[40px] md:h-[60px] block"
        style={{ marginBottom: "-1px" }}
      >
        <polygon points="0,0 1440,60 1440,60 0,60" fill={to} />
        <polygon points="0,0 1440,0 1440,60" fill={from} />
      </svg>
    </div>
  );
};

/** Dark (#0F0F0F) → Light (#F2F1ED) divider */
export const DarkToLightDivider = () => (
  <SectionDivider from="#0F0F0F" to="#F2F1ED" />
);

/** Light (#F2F1ED) → Dark (#0F0F0F) divider */
export const LightToDarkDivider = () => (
  <SectionDivider from="#F2F1ED" to="#0F0F0F" />
);
