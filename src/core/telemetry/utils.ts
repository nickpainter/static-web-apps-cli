import dotenv from "dotenv";
dotenv.config();

import TelemetryReporter from "./telemetryReporter";
import type { TelemetryEventMeasurements, TelemetryEventProperties } from "./telemetryReporterTypes";
import { readCLIEnvFile } from "../utils";
import * as crypto from "crypto";
import os from "os";
import { getMachineIdForTelemetry } from "../swa-cli-persistence-plugin/impl/machine-identifier";
import { DEFAULT_CONFIG } from "../../config";

const aiKey = "8428a7f6-6650-4490-a15a-c7f7a16449d7";
const pkg = require("../../../package.json");

export async function collectTelemetryEvent(event: string, properties?: TelemetryEventProperties, measurements?: TelemetryEventMeasurements) {
  const reporter = await getTelemetryReporter();

  if (reporter) {
    const macAddressHash = (await getMachineIdForTelemetry()).toString();
    let extendedTelemetryEventProperties = {
      macAddressHash: macAddressHash,
      installationId: crypto
        .createHash("sha256")
        .update(pkg.version + macAddressHash)
        .digest("hex"),
      subscriptionId: DEFAULT_CONFIG.subscriptionId!,
      OsType: os.type(),
      OsVersion: os.version(),
    } as TelemetryEventProperties;

    reporter.sendTelemetryEvent(event, { ...properties, ...extendedTelemetryEventProperties }, measurements);
  }
}

export async function collectTelemetryException(exception: Error, properties?: TelemetryEventProperties, measurements?: TelemetryEventMeasurements) {
  const reporter = await getTelemetryReporter();
  if (reporter) {
    reporter.sendTelemetryException(exception, properties, measurements);
  }
}

export async function getTelemetryReporter() {
  const config = await readCLIEnvFile();
  if (!config["SWA_CLI_CAPTURE_TELEMETRY"] || config["SWA_CLI_CAPTURE_TELEMETRY"].toLowerCase() === "true") {
    const reporter: TelemetryReporter = new TelemetryReporter(aiKey);
    return reporter;
  }
  return undefined;
}

export function getSessionId(timeStamp: number) {
  const timeStampStr = timeStamp.toString();
  const PID = process.pid.toString();
  return crypto
    .createHash("sha256")
    .update(PID + timeStampStr)
    .digest("hex");
}
