import { Info } from "../wailsjs/go/main/App";

export async function shellInfo(): Promise<string> {
  if (!("go" in window)) return "Browser preview";
  try {
    const info = await Info();
    return info.name + " · desktop shell " + info.version;
  } catch {
    return "Desktop bridge unavailable";
  }
}
