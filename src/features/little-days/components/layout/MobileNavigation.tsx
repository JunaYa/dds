import { useEffect, useState } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetPopup,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@vita/ui/sheet";
import { Icon } from "../common/Icon";
import { ChildPicker } from "../children/ChildPicker";
import { PageNavigation } from "./PageNavigation";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 761px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className="mobile-toolbar">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="navigation-toggle" aria-label="Open navigation">
          <Icon name="menu" />
        </SheetTrigger>
        <SheetPopup
          side="left"
          className="navigation-drawer"
          showCloseButton={false}
        >
          <div className="navigation-drawer-heading">
            <SheetTitle>little days</SheetTitle>
            <SheetClose className="navigation-toggle" aria-label="Close navigation">
              <Icon name="close" />
            </SheetClose>
          </div>
          <SheetDescription className="navigation-description">
            A little less to remember
          </SheetDescription>
          <PageNavigation onNavigate={() => setOpen(false)} />
          <p className="navigation-device-note">
            Saved on this device · No cloud sync
          </p>
        </SheetPopup>
      </Sheet>
      <div className="mobile-profile">
        <ChildPicker />
      </div>
    </div>
  );
}
