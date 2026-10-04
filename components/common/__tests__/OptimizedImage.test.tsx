// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OptimizedImage } from "@/components/common/OptimizedImage";

const SUPABASE_ICON =
  "https://mpvcaxsukbwzgrbvzmjj.supabase.co/storage/v1/object/public/spell-icons/fireball.png";

describe("OptimizedImage", () => {
  afterEach(cleanup);

  it("іконку з Supabase Storage віддає через оптимізатор Next (кеш Vercel замість egress Supabase)", () => {
    render(<OptimizedImage src={SUPABASE_ICON} alt="fireball" width={48} height={48} />);

    expect(screen.getByAltText("fireball").getAttribute("src")).toContain("/_next/image");
  });

  it("зовнішню картинку віддає напряму, без оптимізатора", () => {
    const src = "https://example.com/a.png";

    render(<OptimizedImage src={src} alt="external" width={48} height={48} />);

    expect(screen.getByAltText("external").getAttribute("src")).toBe(src);
  });

  it("fallback={null} при помилці завантаження нічого не рендерить", () => {
    render(
      <OptimizedImage src="https://example.com/broken.png" alt="broken" width={48} height={48} fallback={null} />,
    );

    fireEvent.error(screen.getByAltText("broken"));

    expect(screen.queryByAltText("broken")).toBeNull();
  });
});
