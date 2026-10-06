"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

interface InviteCodeDisplayProps {
  inviteCode: string;
}

export function InviteCodeDisplay({ inviteCode }: InviteCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="rounded bg-[#1a140f] px-2 py-1 font-mono text-lg font-semibold text-[#efe5d2]">
        {inviteCode}
      </code>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="h-8 w-8"
        title="Скопіювати код"
      >
        {copied ? (
          <Check className="h-4 w-4 text-[#c9b37a]" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
