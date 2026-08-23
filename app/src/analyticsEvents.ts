export type MatchDurationBucket = "under_15_min" | "15_to_45_min" | "over_45_min";

export const matchDurationBucket = (seconds: number): MatchDurationBucket => {
  if (seconds < 15 * 60) return "under_15_min";
  if (seconds <= 45 * 60) return "15_to_45_min";
  return "over_45_min";
};

type CaptureEvent = {
  event: string;
  properties: Record<string, unknown>;
};

export const sanitizeAnalyticsEvent = <Event extends CaptureEvent | null>(capture: Event): Event => {
  if (!capture || capture.event !== "$exception") return capture;

  const exceptionList = Array.isArray(capture.properties.$exception_list)
    ? capture.properties.$exception_list.map((exception) => {
      if (!exception || typeof exception !== "object") return exception;
      return { ...exception, value: "[redacted]" };
    })
    : capture.properties.$exception_list;

  return {
    ...capture,
    properties: {
      ...capture.properties,
      $exception_message: "[redacted]",
      $exception_list: exceptionList,
      $exception_steps: undefined,
      app_version: __APP_VERSION__,
    },
  };
};
