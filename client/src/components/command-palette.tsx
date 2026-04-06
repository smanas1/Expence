import { Command } from "cmdk";
import { Plus, Wallet } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuickExpense: () => void;
}

export function CommandPalette({ open, onOpenChange, onQuickExpense }: CommandPaletteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4" onClick={() => onOpenChange(false)}>
      <div
        className="mx-auto mt-[max(8vh,1rem)] max-w-2xl overflow-hidden rounded-[28px] border border-white/20 bg-white/90 shadow-2xl shadow-cyan-950/20 dark:bg-slate-900/92 sm:mt-24 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <Command className="flex flex-col">
          <Command.Input
            className="w-full border-b border-slate-200/80 bg-transparent px-4 py-4 text-base outline-none dark:border-slate-800 sm:px-5 sm:text-sm"
            placeholder="Jump to dashboard, donations, or add expense..."
          />
          <Command.List className="max-h-[70vh] overflow-y-auto p-3 sm:max-h-80">
            <Command.Empty className="px-3 py-10 text-center text-sm text-slate-500">
              No quick actions found.
            </Command.Empty>
            <Command.Group heading="Navigate" className="text-xs text-slate-400">
              <Command.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onSelect={() => { navigate("/"); onOpenChange(false); }}>
                <Wallet className="h-4 w-4" />
                Dashboard
              </Command.Item>
              <Command.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onSelect={() => { navigate("/transactions"); onOpenChange(false); }}>
                <Wallet className="h-4 w-4" />
                Transactions
              </Command.Item>
              <Command.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onSelect={() => { navigate("/donations"); onOpenChange(false); }}>
                <Wallet className="h-4 w-4" />
                Donations
              </Command.Item>
            </Command.Group>
            <Command.Group heading="Actions" className="text-xs text-slate-400">
              <Command.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onSelect={() => { onQuickExpense(); onOpenChange(false); }}>
                <Plus className="h-4 w-4" />
                Add new expense
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
