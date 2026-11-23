import { z } from 'zod'

export const eventSchema = z.object({
  type: z.enum([
    'page_view',
    'click',
    'dead_click',
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
  url: z.url(),
  referrer: z.string().optional(),
  timestamp: z.iso.datetime(),
  sessionStart: z.iso.datetime().optional(),
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
    'English',
    'Spanish',
    'French',
    'German',
    'Portuguese',
    'Turkish',
    'Japanese',
    'Chinese',
  ]).optional().default('English'),
  digestDay: z.number().int().min(0).max(6).optional().default(1),
  digestHour: z.number().int().min(0).max(23).optional().default(8),
  betaCode: z.string().min(1).max(50),
  termsAccepted: z.literal(true),
})

export const validateBetaCodeSchema = z.object({
  code: z.string().min(1).max(50),
})

export const requestDeleteProjectSchema = z.object({
  projectKey: z.string().min(1),
  email: z.email(),
})

export const confirmDeleteProjectSchema = z.object({
  token: z.string().min(64),
})

export type IngestInput = z.infer<typeof ingestSchema>
export type RegisterProjectInput = z.infer<typeof registerProjectSchema>
export type ValidateBetaCodeInput = z.infer<typeof validateBetaCodeSchema>
export type RequestDeleteProjectInput = z.infer<typeof requestDeleteProjectSchema>
export type ConfirmDeleteProjectInput = z.infer<typeof confirmDeleteProjectSchema>