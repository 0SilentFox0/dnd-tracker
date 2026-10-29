// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NewWorldMapDialog } from "../NewWorldMapDialog";
import { WorldEditorContext, type WorldEditorCtx } from "../WorldEditorContext";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { API_ERRORS } from "@/lib/constants/api-errors";

const upload = vi.fn();

const notify = vi.fn();

vi.mock("@/lib/hooks/common", async (orig) => ({ ...(await orig<object>()), useNotify: () => notify }));

vi.mock("@/lib/hooks/world", () => ({ useWorldMapUpload: () => ({ upload, discard: vi.fn(), uploading: false }) }));

const create = vi.fn();

const openMap = vi.fn();

const ctx = { campaignId: "c1", detail: null, maps: [], selectedId: null, select: vi.fn(), openMap, tool: "select", setTool: vi.fn(), editor: { map: { create: { mutateAsync: create, isPending: false } } } } as unknown as WorldEditorCtx;

const renderDialog = (parentMarker?: { id: string; name: string }) => {
  const onOpenChange = vi.fn();

  renderWithConfirm(
    <WorldEditorContext.Provider value={ctx}>
      <NewWorldMapDialog open onOpenChange={onOpenChange} parentMarker={parentMarker} />
    </WorldEditorContext.Provider>,
  );

  return onOpenChange;
};

// happy-dom does not wire form="…" submit buttons living outside the form
const submit = () => fireEvent.submit(document.getElementById("new-world-map-form") as HTMLElement);

const pickFile = () => fireEvent.change(screen.getByLabelText(/Картинка/), { target: { files: [new File(["x"], "m.webp", { type: "image/webp" })] } });

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  upload.mockResolvedValue({ imageUrl: "https://x/m.webp", width: 800, height: 600 });
  create.mockResolvedValue({ id: "new" });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("NewWorldMapDialog", () => {
  it("renders without Radix a11y warnings, a native file input label or an empty footer block", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderDialog();

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(screen.queryByText(/Choose File/i)).toBeNull();
    expect(screen.getByText(/JPG, PNG або WebP/)).toBeTruthy();
  });

  it("accepts a dropped image and rejects other files", () => {
    renderDialog();

    const zone = screen.getByText(/Перетягніть картинку/).closest("label") as HTMLElement;

    fireEvent.drop(zone, { dataTransfer: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] } });

    expect(screen.getByText(/Оберіть картинку у форматі/)).toBeTruthy();

    fireEvent.drop(zone, { dataTransfer: { files: [new File(["x"], "world.png", { type: "image/png" })] } });

    expect(screen.getByText("world.png")).toBeTruthy();
    expect(screen.queryByText(/Оберіть картинку у форматі/)).toBeNull();
  });

  it("shows WORLD_ROOT_EXISTS (409) in the name field", async () => {
    create.mockRejectedValue(new Error(API_ERRORS.WORLD_ROOT_EXISTS));

    renderDialog();
    fireEvent.change(screen.getByLabelText(/Назва/), { target: { value: "Світ" } });
    pickFile();
    submit();

    expect(await screen.findByText(API_ERRORS.WORLD_ROOT_EXISTS)).toBeTruthy();
  });

  it("blocks submit until a file is chosen", () => {
    renderDialog({ id: "m1", name: "Місто" });

    expect((screen.getByRole("button", { name: "Створити" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Назва/) as HTMLInputElement).value).toBe("Місто");
  });

  it("uploads, then creates under the parent marker and opens the new map", async () => {
    const onOpenChange = renderDialog({ id: "m1", name: "Місто" });

    pickFile();
    submit();

    await waitFor(() => expect(openMap).toHaveBeenCalledWith("new"));
    expect(create).toHaveBeenCalledWith({ name: "Місто", imageUrl: "https://x/m.webp", width: 800, height: 600, parentMarkerId: "m1" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("notifies and stays open when the upload fails", async () => {
    upload.mockRejectedValue(new Error("Завеликий файл"));

    const onOpenChange = renderDialog();

    fireEvent.change(screen.getByLabelText(/Назва/), { target: { value: "Світ" } });
    pickFile();
    submit();

    await waitFor(() => expect(notify).toHaveBeenCalledWith("Завеликий файл"));
    expect(create).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
