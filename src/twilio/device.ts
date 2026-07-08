import { Device } from "@twilio/voice-sdk";

let device: Device | null = null;

export const initDevice = async (token: string): Promise<Device> => {
  if (!token) throw new Error("Missing Twilio token");

  device = new Device(token, {
    logLevel: 1,
    codecPreferences: ["opus", "pcmu"] as any,
  });

  await device.register();
  return device;
};

export const getDevice = (): Device | null => device;
