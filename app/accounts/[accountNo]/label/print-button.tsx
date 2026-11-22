"use client";

import { Icon } from "../../../ui";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" className="primary" onClick={() => window.print()}>
      <Icon name="print" stroke={1.8} />{label}
    </button>
  );
}
