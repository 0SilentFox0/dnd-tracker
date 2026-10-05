import type { ReactElement } from "react";
import { render } from "@testing-library/react";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";

export const renderWithConfirm = (ui: ReactElement) => render(<ConfirmProvider>{ui}</ConfirmProvider>);
