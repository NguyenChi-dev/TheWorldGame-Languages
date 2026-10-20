"use client";

import { useRef, useState } from "react";
import type { MapVector } from "@lw/shared/map-layout";

/** Commit on blur/Enter, so typing '-2.5' is one undo step rather than four. */
export function NumberField({
  label,
  displayLabel,
  value,
  min = -10000,
  max = 10000,
  step = 0.5,
  disabled,
  onChange,
}: {
  label: string;
  displayLabel?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const cancelBlur = useRef(false);
  const commit = () => {
    if (cancelBlur.current) {
      cancelBlur.current = false;
      return;
    }
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed) || parsed < min || parsed > max) {
      setDraft(String(value));
      return;
    }
    if (parsed !== value) onChange(parsed);
  };
  return (
    <label className="me-field">
      <span title={label}>{displayLabel ?? label}</span>
      <input
        aria-label={label}
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            cancelBlur.current = true;
            setDraft(String(value));
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

export function VectorFields({
  label,
  unit,
  value,
  scale,
  disabled,
  onChange,
}: {
  label: string;
  unit?: string;
  value: MapVector;
  scale?: boolean;
  disabled?: boolean;
  onChange: (value: MapVector) => void;
}) {
  return (
    <fieldset className="me-vector" disabled={disabled}>
      <legend>
        {label}
        {unit ? <small>{unit}</small> : null}
      </legend>
      <div>
        {(["x", "y", "z"] as const).map((axis) => (
          <NumberField
            key={`${label}-${axis}-${value[axis]}`}
            label={`${label} ${axis.toUpperCase()}`}
            displayLabel={axis.toUpperCase()}
            value={value[axis]}
            min={scale ? 0.01 : -10000}
            max={scale ? 1000 : 10000}
            step={scale ? 0.1 : 0.5}
            onChange={(next) => onChange({ ...value, [axis]: next })}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function TextField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="me-field">
      <span>{label}</span>
      <input
        key={value}
        aria-label={label}
        defaultValue={value}
        maxLength={100}
        disabled={disabled}
        onBlur={(event) => {
          const next = event.target.value.trim();
          if (next && next !== value) onChange(next);
          else event.target.value = value;
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </label>
  );
}
