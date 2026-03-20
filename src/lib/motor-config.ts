export const MOTOR_SERVER_URL_STORAGE_KEY = "MICROVIEW_MOTOR_SERVER_URL";
export const MOTOR_SENSITIVITY_STORAGE_KEY = "MICROVIEW_MOTOR_SENSITIVITY";

export function getMotorServerUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_MOTOR_SERVER_URL || "http://127.0.0.1:3001";
  }

  const stored = localStorage.getItem(MOTOR_SERVER_URL_STORAGE_KEY);
  if (stored) return stored;

  return process.env.NEXT_PUBLIC_MOTOR_SERVER_URL || "http://127.0.0.1:3001";
}

export function setMotorServerUrl(url: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOTOR_SERVER_URL_STORAGE_KEY, url);
}

export function getMotorSensitivity(): number {
  if (typeof window === "undefined") return 1.0;
  const stored = localStorage.getItem(MOTOR_SENSITIVITY_STORAGE_KEY);
  return stored ? parseFloat(stored) : 1.0;
}

export function setMotorSensitivity(val: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOTOR_SENSITIVITY_STORAGE_KEY, val.toString());
}
