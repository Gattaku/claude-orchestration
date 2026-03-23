'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type ReviewResult = { success: true } | { success: false; error: string }

export async function approveTheme(themeId: string): Promise<ReviewResult> {
  const supabase = await createServerSupabaseClient()

  // Authentication check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: '認証が必要です。ログインしてください。' }
  }

  // Validate themeId
  if (!themeId || typeof themeId !== 'string') {
    return { success: false, error: 'テーマIDが無効です。' }
  }

  // Check theme exists and is awaiting-review
  const { data: theme, error: themeError } = await supabase
    .from('themes')
    .select('theme_id, current_status')
    .eq('theme_id', themeId)
    .single()

  if (themeError || !theme) {
    return { success: false, error: 'テーマが見つかりません。' }
  }

  if (theme.current_status !== 'awaiting-review') {
    return { success: false, error: 'このテーマはawaiting-reviewステータスではありません。' }
  }

  // Insert review record
  const { error: insertError } = await supabase.from('theme_reviews').insert({
    theme_id: themeId,
    action: 'approved',
    reviewer_email: user.email!,
    comment: null,
  })

  if (insertError) {
    return { success: false, error: 'レビューの記録に失敗しました。' }
  }

  // Update theme status to in-progress
  const { error: updateError } = await supabase
    .from('themes')
    .update({ current_status: 'in-progress' })
    .eq('theme_id', themeId)

  if (updateError) {
    return { success: false, error: 'テーマのステータス更新に失敗しました。' }
  }

  revalidatePath('/')
  revalidatePath(`/themes/${themeId}`)

  return { success: true }
}

export async function rejectTheme(themeId: string, comment?: string): Promise<ReviewResult> {
  const supabase = await createServerSupabaseClient()

  // Authentication check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: '認証が必要です。ログインしてください。' }
  }

  // Validate themeId
  if (!themeId || typeof themeId !== 'string') {
    return { success: false, error: 'テーマIDが無効です。' }
  }

  // Validate comment length
  if (comment && comment.length > 1000) {
    return { success: false, error: 'コメントは1000文字以内で入力してください。' }
  }

  // Check theme exists and is awaiting-review
  const { data: theme, error: themeError } = await supabase
    .from('themes')
    .select('theme_id, current_status')
    .eq('theme_id', themeId)
    .single()

  if (themeError || !theme) {
    return { success: false, error: 'テーマが見つかりません。' }
  }

  if (theme.current_status !== 'awaiting-review') {
    return { success: false, error: 'このテーマはawaiting-reviewステータスではありません。' }
  }

  // Insert review record
  const { error: insertError } = await supabase.from('theme_reviews').insert({
    theme_id: themeId,
    action: 'rejected',
    reviewer_email: user.email!,
    comment: comment || null,
  })

  if (insertError) {
    return { success: false, error: 'レビューの記録に失敗しました。' }
  }

  revalidatePath('/')
  revalidatePath(`/themes/${themeId}`)

  return { success: true }
}
