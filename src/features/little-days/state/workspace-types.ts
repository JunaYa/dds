import { type CareRecord, type RecordType, type Supply } from "../domain/model";

export type Page = "Today" | "Supplies" | "Record types" | "Settings";
export type Modal =
  | {
      kind: "record";
      type: RecordType;
      record: CareRecord | null;
      child: string;
    }
  | { kind: "type" | "supply" | "child" }
  | { kind: "restock"; supply: Supply }
  | null;
