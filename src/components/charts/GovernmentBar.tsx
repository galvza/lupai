/**
 * Barra horizontal de governos proporcional à duração de cada mandato.
 *
 * Segmentos coloridos representam a fração do período de dados (2005–2025)
 * que cada governo ocupou, com legenda de nomes abaixo.
 */

import governmentsRaw from "@/data/governments.json";
import type { GovernmentPeriod } from "@/types/government";

const governments = (governmentsRaw as { governments: GovernmentPeriod[] })
  .governments;

const DATA_START = "2005-01";
const DATA_END = "2025-12";

/** Converte "YYYY-MM" em total de meses pra cálculo de duração. */
const toMonths = (date: string): number => {
  const [y, m] = date.split("-").map(Number);
  return y * 12 + m;
};

const totalMonths = toMonths(DATA_END) - toMonths(DATA_START) + 1;

const segments = governments.flatMap((gov) => {
  const start = gov.start < DATA_START ? DATA_START : gov.start;
  const end = gov.end > DATA_END ? DATA_END : gov.end;
  if (toMonths(start) > toMonths(DATA_END) || toMonths(end) < toMonths(DATA_START))
    return [];
  const months = toMonths(end) - toMonths(start) + 1;
  const widthPercent = (months / totalMonths) * 100;
  return [{ id: gov.id, name: gov.name, color: gov.color, widthPercent }];
});

/** Barra proporcional de governos + legenda. */
const GovernmentBar = () => {
  return (
    <div>
      <div
        style={{
          display: "flex",
          height: "6px",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        {segments.map((seg) => (
          <div
            key={seg.id}
            style={{
              width: `${seg.widthPercent}%`,
              backgroundColor: seg.color,
            }}
          />
        ))}
      </div>

      <div
        className="font-ui"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginTop: "8px",
        }}
      >
        {segments.map((seg) => (
          <div
            key={seg.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: seg.color,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "var(--fs-label)", color: "var(--text-tertiary)" }}>
              {seg.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GovernmentBar;
