// The Regular / Large / Billboard "Aa" tiles. Used on Settings → Text Size &
// Time Zone and Settings → Notifications, so both look and work the same.
import { TEXT_SIZES, type TextSize } from "@/lib/textSize";
import { palette } from "@/lib/theme";

export function TextSizeTiles({ value, onChange }: { value: TextSize; onChange: (size: TextSize) => void }) {
  return (
    <div role="radiogroup" aria-label="Text size" style={{ display: "flex", gap: 8 }}>
      {TEXT_SIZES.map(({ id, label }) => {
        const isSelected = value === id;
        const previewPx = { normal: 16, large: 20, xlarge: 24 }[id];
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(id)}
            data-testid={`text-size-${id}`}
            style={{
              flex: 1,
              minWidth: 0,
              background: isSelected ? palette.gold : palette.uiSeparator,
              border: isSelected ? `2px solid ${palette.gold}` : "2px solid transparent",
              borderRadius: 12,
              padding: "10px 6px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: previewPx, fontWeight: 600, color: isSelected ? palette.ink : "#ffffff", lineHeight: 1 }}>Aa</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: isSelected ? palette.ink : palette.uiLabel2, textAlign: "center" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
