import type { DieSides } from "@/types/battle";

export interface DieFx {
  sides: DieSides;
  value: number;
  chosen?: boolean;
  dropped?: boolean;
  tens?: boolean;
  units?: boolean;
}
