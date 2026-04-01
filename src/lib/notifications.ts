import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Send a notification to a recipient.
 * Fire-and-forget — doesn't throw on failure.
 */
export async function notify(opts: {
  recipient?: string
  title: string
  message?: string
  type?: string  // 'chat' | 'task' | 'lead' | 'template' | 'alert' | 'info'
  link?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const supabase = createAdminClient()
    if (!supabase) return

    await supabase.from('mc_notifications').insert({
      recipient: opts.recipient || 'brandon',
      title: opts.title,
      message: opts.message || '',
      type: opts.type || 'info',
      link: opts.link || null,
      metadata: opts.metadata || {},
    })
  } catch {
    // Fire-and-forget — don't crash the calling route
  }
}
