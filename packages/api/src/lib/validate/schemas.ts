import { z } from 'zod'

export const eventSchema = z.object({
  type: z.enum([
    'page_view',
    'click',
    'rage_click',
    'scroll_depth',
    'session_end',
    'form_submit',
    'copy',
    'tab_focus',
    'tab_blur',
  ]),
  sessionId: z.string().min(1),
  projectKey: z.string().min(1),
  url: z.string().url(),
  referrer: z.string().optional(),
  timestamp: z.string().datetime(),
  sessionStart: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const ingestSchema = z.object({
  events: z.array(eventSchema).min(1).max(100),
})

export const registerProjectSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  domain: z.string().optional(),
  language: z.enum([
    'English', 'Spanish', 'French', 'German',
    'Portuguese', 'Turkish', 'Italian', 'Dutch',
  ]).optional().default('English'),
  digestDay: z.number().int().min(0).max(6).optional().default(1),
  digestHour: z.number().int().min(0).max(23).optional().default(8),
})

export const digestTriggerSchema = z.object({
  email: z.email(),
})

export type IngestInput = z.infer<typeof ingestSchema>
export type RegisterProjectInput = z.infer<typeof registerProjectSchema>
export type DigestTriggerInput = z.infer<typeof digestTriggerSchema>