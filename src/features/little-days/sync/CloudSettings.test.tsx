import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CloudSettings } from "./CloudSettings";
import { emptyWorkspace } from "../domain/model";
const cloud = vi.hoisted(() => ({ status: vi.fn(), enable: vi.fn(), native: true, ios: false, begin: vi.fn(), poll: vi.fn(), disconnect: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => cloud.native, invoke: vi.fn() }));
vi.mock("../components/layout/ios-platform", () => ({ isIosApp: () => cloud.ios }));
vi.mock("../hooks/useApp", () => ({ useApp: () => ({ data: emptyWorkspace(), session: null }) }));
vi.mock("../i18n/useI18n", () => ({ useI18n: () => ({ tr: (text: string) => text }) }));
vi.mock("./transport", () => ({ cloudStatus: cloud.status, beginAuthorization: cloud.begin, pollAuthorization: cloud.poll, disconnectProvider: cloud.disconnect }));
vi.mock("./SyncContext", () => ({ useCloudSync: () => ({ binding:null,busy:false,error:"",lastSync:"",enable:cloud.enable }) }));
beforeEach(() => { vi.clearAllMocks(); cloud.native=true; cloud.ios=false; });
afterEach(cleanup);
it("does not offer authorization for an unconfigured application", async () => {
  cloud.status.mockResolvedValue({configured:false,connected:false});render(<CloudSettings />);
  await screen.findByText(/not configured in this build/);
  expect(screen.queryByRole("button",{name:"Connect Alipan"})).not.toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Enable automatic sync"})).toBeDisabled();
  expect(cloud.enable).not.toHaveBeenCalled();
});
it("requires explicit upload consent even for an already authorized account", async () => {
  cloud.status.mockResolvedValue({configured:true,connected:true,account:"test"});render(<CloudSettings />);
  await screen.findByRole("button",{name:"Reconnect Alipan"});
  const enable=screen.getByRole("button",{name:"Enable automatic sync"});expect(enable).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox",{name:/Upload this device/}));
  await waitFor(()=>expect(enable).toBeEnabled());fireEvent.click(enable);
  expect(cloud.enable).toHaveBeenCalledWith("alipan");
});
it("does not call native transports in the browser", () => {
  cloud.native=false;render(<CloudSettings />);
  expect(screen.getByText(/installed app/)).toBeInTheDocument();expect(cloud.status).not.toHaveBeenCalled();
});

it("offers both providers on iOS and switches authorization by capability", async () => {
  cloud.ios=true;
  cloud.status.mockResolvedValue({configured:true,connected:false});
  render(<CloudSettings />);
  await screen.findByRole("button", {name:"Check iCloud again"});
  expect(screen.queryByRole("button", {name:"Connect Alipan"})).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox"), {target:{value:"alipan"}});
  cloud.begin.mockResolvedValue({url:"https://openapi.alipan.com/oauth/qrcode/test", expiresAt:Date.now()/1000+180});
  fireEvent.click(await screen.findByRole("button", {name:"Connect Alipan"}));
  await screen.findByAltText("Alipan authorization QR code");
  expect(cloud.begin).toHaveBeenCalledWith("alipan");
  expect(screen.getByRole("combobox")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", {name:"Cancel"}));
  expect(screen.queryByAltText("Alipan authorization QR code")).not.toBeInTheDocument();
});
