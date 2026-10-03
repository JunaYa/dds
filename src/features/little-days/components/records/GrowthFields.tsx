import { Button } from "@vita/ui/button";
import { Input } from "@vita/ui/input";
import { NativeInput } from "@vita/ui/input";
import { useI18n } from "../../i18n/useI18n";
import { useId, useState } from "react";
import type { Values } from "../../domain/model";
import "../../styles/growth.css";

const measurements = {
  height: {
    label: "Height",
    unit: "cm",
    alternate: "in",
    factor: 2.54,
    min: 20,
    max: 160,
    initial: 50,
    interval: 10,
  },
  weight: {
    label: "Weight",
    unit: "kg",
    alternate: "lb",
    factor: 0.45359237,
    min: 0.5,
    max: 60,
    initial: 3.5,
    interval: 5,
  },
};
type Measurement = keyof typeof measurements;

export function GrowthFields({
  values,
  onChange,
}: {
  values: Values;
  onChange: (id: string, value: string | number) => void;
}) {
  const { tr } = useI18n();
  const [active, setActive] = useState<Measurement>("height");
  return (
    <section className="growth-fields" aria-label={tr("Growth record")}>
      <div className="growth-switch" aria-label={tr("Choose a measurement")}>
        {(Object.keys(measurements) as Measurement[]).map((key) => (
          <Button
            unstyled
            type="button"
            key={key}
            aria-pressed={active === key}
            onClick={() => setActive(key)}
          >
            <span>{tr(measurements[key].label)}</span>
            <small>
              {typeof values[key] === "number"
                ? `${values[key]} ${measurements[key].unit}`
                : tr("Not recorded")}
            </small>
          </Button>
        ))}
      </div>
      <MeasurementRuler
        key={active}
        kind={active}
        value={values[active]}
        onChange={(value) => onChange(active, value)}
      />
      <p className="growth-hint">
        {tr(
          "Height and weight can be recorded separately. Empty measurements will not be saved.",
        )}
      </p>
    </section>
  );
}

function MeasurementRuler({
  kind,
  value,
  onChange,
}: {
  kind: Measurement;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
}) {
  const { tr } = useI18n();
  const id = useId();
  const config = measurements[kind];
  const [imperial, setImperial] = useState(false);
  const factor = imperial ? config.factor : 1;
  const unit = imperial ? config.alternate : config.unit;
  const hasValue = typeof value === "number";
  const selected = hasValue ? value : config.initial;
  const display = (number: number) => Number((number / factor).toFixed(2));
  const position =
    100 *
    (1 -
      (Math.min(config.max, Math.max(config.min, selected)) - config.min) /
        (config.max - config.min));
  const ticks = Array.from(
    { length: Math.floor(config.max / config.interval) },
    (_, i) => (i + 1) * config.interval,
  ).filter((tick) => tick >= config.min);
  return (
    <>
      <div className="growth-heading">
        <h3>
          {tr("Record your baby’s {measurement}", {
            measurement: tr(config.label).toLowerCase(),
          })}
        </h3>
        <p>{tr("Drag the ruler, or enter an exact value below")}</p>
        <div
          className="growth-units"
          aria-label={tr("{measurement} unit", {
            measurement: tr(config.label),
          })}
        >
          {[config.unit, config.alternate].map((label, index) => (
            <Button
              unstyled
              type="button"
              key={label}
              aria-pressed={imperial === !!index}
              onClick={() => setImperial(!!index)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className={`growth-measurement growth-measurement--${kind}`}>
        <div className="growth-illustration" aria-hidden="true">
          <svg viewBox="0 0 140 240" fill="none">
            <circle cx="70" cy="45" r="30" fill="currentColor" opacity=".18" />
            <path
              d="M62 17c-2 9 11 12 13 3M59 45h1m20 0h1M64 58q6 5 12 0"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M48 83Q70 73 92 83L116 133Q121 148 109 150Q100 150 95 136L89 124L91 161L88 214Q88 225 77 225L72 179H68L63 225Q52 227 51 214L49 161L51 124L45 136Q40 151 30 150Q19 148 24 133Z"
              fill="currentColor"
              opacity=".18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M51 150Q70 162 89 150M66 112h8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="growth-ruler">
          <div className="growth-ruler-track" aria-hidden="true">
            {ticks.map((tick) => (
              <span
                className="growth-tick"
                key={tick}
                style={{
                  top: `${100 * (1 - (tick - config.min) / (config.max - config.min))}%`,
                }}
              >
                {display(tick)}
              </span>
            ))}
            <div className="growth-marker" style={{ top: `${position}%` }}>
              <span>
                {display(selected)} <small>{unit}</small>
              </span>
            </div>
          </div>
          <NativeInput
            aria-label={tr("{measurement} ruler", {
              measurement: tr(config.label),
            })}
            aria-valuetext={
              hasValue
                ? `${display(selected)} ${unit}`
                : tr("{value} {unit}, not recorded yet", {
                    value: display(selected),
                    unit,
                  })
            }
            type="range"
            min={config.min}
            max={config.max}
            step="any"
            value={Math.min(config.max, Math.max(config.min, selected))}
            onChange={(event) =>
              onChange(Number(Number(event.target.value).toFixed(2)))
            }
          />
        </div>
      </div>
      <label className="form-field growth-value" htmlFor={id}>
        <span>
          {tr(config.label)}
          <small>{unit}</small>
        </span>
        <Input
          nativeInput
          id={id}
          type="number"
          inputMode="decimal"
          min={0.01}
          step="any"
          placeholder={tr("No measurement yet")}
          value={hasValue ? display(value) : ""}
          onChange={(event) =>
            onChange(
              event.target.value === ""
                ? ""
                : Number((Number(event.target.value) * factor).toFixed(2)),
            )
          }
        />
      </label>
    </>
  );
}
