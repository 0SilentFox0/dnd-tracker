"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionProps {
  children: React.ReactNode;
  className?: string;
}

interface AccordionItemProps {
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

const AccordionContext = React.createContext<{
  openItems: Set<string>;
  toggleItem: (id: string) => void;
}>({
  openItems: new Set(),
  toggleItem: () => {},
});

export function Accordion({ children, className }: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set());

  const toggleItem = React.useCallback((id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className={cn("space-y-2 w-full", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  children,
  className,
  defaultOpen = false,
}: AccordionItemProps) {
  const id = React.useId();
  const { openItems, toggleItem } = React.useContext(AccordionContext);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const isOpen = openItems.has(id);

  React.useEffect(() => {
    if (defaultOpen && !isInitialized) {
      toggleItem(id);
      setIsInitialized(true);
    }
  }, [defaultOpen, id, toggleItem, isInitialized]);

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden w-full",
        isOpen && "border-primary",
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{
              id?: string;
              isOpen?: boolean;
              toggleItem?: (id: string) => void;
            }>,
            {
              id,
              isOpen,
              toggleItem,
            }
          );
        }
        return child;
      })}
    </div>
  );
}

export function AccordionTrigger({
  children,
  className,
  id,
  isOpen,
  toggleItem,
  ...props
}: AccordionTriggerProps & {
  id?: string;
  isOpen?: boolean;
  toggleItem?: (id: string) => void;
}) {
  const handleClick = () => {
    if (id && toggleItem) {
      toggleItem(id);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center justify-between p-4 text-left font-medium transition-all hover:bg-accent [&[data-state=open]>svg]:rotate-180",
        className
      )}
      data-state={isOpen ? "open" : "closed"}
      {...props}
    >
      {children}
      <ChevronDownIcon className="h-5 w-5 shrink-0 transition-transform duration-200 ml-2" />
    </button>
  );
}

export function AccordionContent({
  children,
  className,
  isOpen,
  ...props
}: AccordionContentProps & {
  isOpen?: boolean;
  toggleItem?: (id: string) => void;
  id?: string;
}) {
  // Видаляємо не-DOM пропси перед передачею на div
  const { toggleItem, id, ...domProps } = props;
  void toggleItem; // Приглушуємо попередження про невикористану змінну
  void id; // Приглушуємо попередження про невикористану змінну

  return (
    <div
      className={cn(
        "overflow-hidden transition-all w-full",
        isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0",
        className
      )}
      {...domProps}
    >
      <div className="p-1 md:p-4 pt-0 w-full min-w-0">{children}</div>
    </div>
  );
}
