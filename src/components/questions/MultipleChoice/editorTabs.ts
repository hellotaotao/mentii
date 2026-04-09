export const HOST_PROPERTY_TABS = ['type', 'content', 'customize'] as const

export type HostPropertyTab = (typeof HOST_PROPERTY_TABS)[number]
