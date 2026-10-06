import { LoadingState } from "@/components/common/states";
import { HudPage, HudPanel } from "@/components/hud/page";

export default function Loading() {
  return (
    <HudPage>
      <HudPanel>
        <LoadingState />
      </HudPanel>
    </HudPage>
  );
}
