// API สำหรับแจ้งเตือนทางอีเมลเมื่อมีการเพิ่ม/ลบ/แก้ไข
import { sendMail } from '~/server/utils/mailer'

type Todo = {
  id: number
  text: string
  createdAt: number
  startAt?: number | null
  endAt?: number | null
  creator?: string
  assignee?: string
  done?: boolean
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ action: 'create' | 'update' | 'delete'; todo: Todo; prev?: Todo }>(event)
  const { action, todo, prev } = body || ({} as any)

  if (!action || !todo) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  const actionText = action === 'create' ? 'สร้างงานใหม่' : action === 'update' ? 'แก้ไขงาน' : 'ลบงาน'
  const fmt = (ts?: number | null) => (ts ? new Date(ts).toLocaleString('th-TH') : '-')

  const html = `
    <h3>${actionText}</h3>
    <ul>
      <li><b>ชื่องาน:</b> ${escapeHtml(todo.text)}</li>
      <li><b>ผู้บันทึก:</b> ${escapeHtml(todo.creator || '-')}</li>
      <li><b>ผู้ดำเนินการ:</b> ${escapeHtml(todo.assignee || '-')}</li>
      <li><b>เริ่มต้น:</b> ${fmt(todo.startAt)}</li>
      <li><b>สิ้นสุด:</b> ${fmt(todo.endAt)}</li>
      <li><b>บันทึกเมื่อ:</b> ${fmt(todo.createdAt)}</li>
      <li><b>สถานะ:</b> ${todo.done ? 'เสร็จแล้ว' : 'ค้างทำ'}</li>
    </ul>
    ${prev ? `<p><b>รายละเอียดเดิม (ก่อนแก้ไข):</b> ${escapeHtml(prev.text)}</p>` : ''}
  `

  const result = await sendMail({
    subject: `[Todo] ${actionText}: ${todo.text}`,
    html,
    // ค่าเริ่มต้นดึงจาก env NUXT_MAIL_TO แต่โจทย์กำหนดอีเมลไว้แล้ว
    to: undefined
  })

  return { ok: true, mailed: result.ok, skipped: (result as any).skipped || false }
})

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

