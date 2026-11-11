import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEuro } from "@/lib/utils";

const PRESETS = [25, 50, 100, 250, 500, 1000];

export function DonateDialog({
  username,
  onClose,
  onSubmit,
  busy,
}: {
  username: string;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  busy: boolean;
}) {
  const [amount, setAmount] = useState(100);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6">
        <h2 className="text-xl font-bold">Donate @{username}</h2>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(n)}
              className={
                amount === n
                  ? "h-11 rounded-full bg-primary text-sm font-semibold text-white"
                  : "h-11 rounded-full bg-elevated text-sm text-fg"
              }
            >
              {formatEuro(n * 100)}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-xs font-semibold uppercase text-muted">
          Betrag
          <Input
            type="number"
            min={5}
            className="mt-2"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
        <div className="mt-6 flex gap-2">
          <Button disabled={busy} onClick={() => void onSubmit(amount)} className="flex-1" size="lg">
            {busy ? "…" : `Zahlen ${formatEuro(amount * 100)}`}
          </Button>
          <Button variant="outline" onClick={onClose} size="lg">
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}
