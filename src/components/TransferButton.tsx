// components/TransferButton.tsx
// @ts-nocheck

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";

export default function TransferButton({ 
  disabled, 
  loading, 
  onClick 
}: { 
  disabled?: boolean; 
  loading?: boolean; 
  onClick: () => void; 
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center space-x-2"
    >
      {loading && <Loader2 className="animate-spin w-4 h-4" />}
      <span>{loading ? "Transferring..." : "Transfer Call"}</span>
    </Button>
  );
}
