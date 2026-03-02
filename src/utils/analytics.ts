import { api, type AnalyticsEventContext, type AnalyticsEventInput, type AnalyticsEventName } from '../services/api';

export function trackAnalyticsEventNonBlocking(
  eventName: AnalyticsEventName,
  params?: {
    ctx?: AnalyticsEventContext;
    sessionId?: string;
    props?: Record<string, unknown>;
  },
): void {
  const payload: AnalyticsEventInput = {
    eventName,
    occurredAtClient: new Date().toISOString(),
    ctx: params?.ctx,
    sessionId: params?.sessionId,
    props: params?.props,
  };

  void api.trackAnalyticsEvents([payload]).catch(() => {
    // analytics should never break gameplay/UI flow
  });
}

export function trackAnalyticsEventsNonBlocking(events: AnalyticsEventInput[]): void {
  if (events.length === 0) return;

  const prepared = events.map((event) => ({
    ...event,
    occurredAtClient: event.occurredAtClient ?? new Date().toISOString(),
  }));

  void api.trackAnalyticsEvents(prepared).catch(() => {
    // analytics should never break gameplay/UI flow
  });
}
