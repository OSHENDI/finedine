import Icon from "@/components/ui/Icon";
import { numberFormat, text, type Lang } from "@/lib/i18n";

// Quantity control: "+" on the left, the number, then on the right "x" (remove) when there is one,
// or "-" when there are more. The order is the same in Arabic and English, so a thumb always finds
// the same button. With min=1 (choosing a quantity before adding) there is no remove: "-" stops at 1.
export default function Stepper({
  quantity,
  lang,
  label,
  min = 0,
  max = 25,
  size = "md",
  disabled,
  onChange
}: {
  quantity: number;
  lang: Lang;
  label: string;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  disabled?: boolean;
  onChange: (delta: 1 | -1) => void;
}) {
  const t = text(lang);
  const removes = min === 0 && quantity <= 1;
  return (
    <div aria-label={label} className="fd-stepper" data-size={size} dir="ltr" onClick={(event) => event.stopPropagation()} role="group">
      <button aria-label={t.increase} className="fd-sbtn fd-sbtn--add" disabled={disabled || quantity >= max} onClick={() => onChange(1)} type="button">
        <Icon name="plus" size={18} />
      </button>
      <output aria-live="polite">{numberFormat(lang).format(quantity)}</output>
      <button aria-label={removes ? t.remove : t.decrease} className="fd-sbtn fd-sbtn--less" data-remove={removes} disabled={quantity <= min && !removes} onClick={() => onChange(-1)} type="button">
        <Icon name={removes ? "close" : "minus"} size={removes ? 16 : 18} />
      </button>
    </div>
  );
}
