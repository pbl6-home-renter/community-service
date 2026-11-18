export const CONTRACT_LIFECYCLE_CONSUMER_NAME = 'community-contract-lifecycle';
export const CONTRACT_LIFECYCLE_CONSUMER_QUEUE = 'community.contract-lifecycle';

export const CONTRACT_LIFECYCLE_EVENTS = {
  CREATED: 'contract.created',
  UPDATED: 'contract.updated',
  TERMINATED: 'contract.terminated',
} as const;
