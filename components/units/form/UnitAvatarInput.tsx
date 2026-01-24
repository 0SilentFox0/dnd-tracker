import Image from "next/image";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeImageUrl } from "@/lib/utils/common/image-url";
import type { Unit } from "@/types/units";

interface UnitAvatarInputProps {
  formData: Partial<Unit>;
  onChange: (data: Partial<Unit>) => void;
}

export function UnitAvatarInput({ formData, onChange }: UnitAvatarInputProps) {
  return (
    <div>
      <Label htmlFor="avatar">Посилання на картинку</Label>
      <Input
        id="avatar"
        type="url"
        value={formData.avatar || ""}
        onChange={(e) => onChange({ avatar: e.target.value || null })}
        placeholder="https://example.com/unit-avatar.png"
      />
      <p className="text-xs text-muted-foreground mt-1">
        Введіть URL картинки з інтернету
      </p>
      {formData.avatar && (
        <div className="mt-3">
          <Label>Попередній перегляд:</Label>
          <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden bg-muted border">
            <Image
              src={normalizeImageUrl(formData.avatar)}
              alt="Preview"
              width={128}
              height={128}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;

                target.style.display = "none";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
