export const MATCH_REQUEST_CONSUMER_NAME = 'matchRequestNotifications';
export const MATCH_REQUEST_CONSUMER_QUEUE =
  'community.match-request-notification';
export const MATCH_REQUEST_DEEP_LINK_PATH = '/roommates';
export const MATCH_REQUEST_INTEGRATION_EVENTS = {
  CREATED: 'match_request.created',
  ACCEPTED: 'match_request.accepted',
  REJECTED: 'match_request.rejected',
  WITHDRAWN: 'match_request.withdrawn',
} as const;

export const MATCH_REQUEST_EVENT_STATUSES = {
  [MATCH_REQUEST_INTEGRATION_EVENTS.CREATED]: 'pending',
  [MATCH_REQUEST_INTEGRATION_EVENTS.ACCEPTED]: 'accepted',
  [MATCH_REQUEST_INTEGRATION_EVENTS.REJECTED]: 'rejected',
  [MATCH_REQUEST_INTEGRATION_EVENTS.WITHDRAWN]: 'withdrawn',
} as const;
