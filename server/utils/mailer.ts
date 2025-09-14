// ยูทิลสำหรับส่งอีเมลด้วย Nodemailer
// หมายเหตุ: เปลี่ยนเป็น dynamic import เพื่อลดปัญหา dev ที่ยังไม่ได้ติดตั้งแพ็กเกจ

export async function sendMail(options: {
  subject: string
  html: string
  to?: string | string[]
}) {
  const config = useRuntimeConfig()

  // อ่านการตั้งค่าจาก runtimeConfig/.env
  const host = config.mailHost as string | undefined
  const port = Number(config.mailPort ?? 587)
  const user = config.mailUser as string | undefined
  const pass = config.mailPass as string | undefined
  const from = (config.mailFrom as string | undefined) || 'no-reply@example.com'
  const toEnv = (config.mailTo as string | undefined) || ''
  const toList = options.to || toEnv.split(',').map((s) => s.trim()).filter(Boolean)

  // ถ้าไม่มีผู้รับ ให้ fallback เป็น no-op พร้อมแจ้งเตือนใน log
  if (!toList || (Array.isArray(toList) && toList.length === 0)) {
    console.warn('[mail] no recipients configured')
    return { ok: false, skipped: true }
  }

  // ถ้าไม่ได้ตั้งค่า SMTP หรือยังไม่ได้ติดตั้ง nodemailer ให้ fallback เป็น log
  if (!host || !user || !pass) {
    console.warn('[mail] SMTP not configured, printing message only.')
    console.info(`[mail:subject] ${options.subject}`)
    console.info(`[mail:to] ${Array.isArray(toList) ? toList.join(', ') : toList}`)
    console.info(`[mail:html]\n${options.html}`)
    return { ok: false, skipped: true }
  }

  // พยายาม import nodemailer แบบไดนามิก
  let nodemailer: any
  try {
    nodemailer = (await import('nodemailer')).default
  } catch (e) {
    console.warn('[mail] nodemailer not installed, printing message only.')
    console.info(`[mail:subject] ${options.subject}`)
    console.info(`[mail:to] ${Array.isArray(toList) ? toList.join(', ') : toList}`)
    console.info(`[mail:html]\n${options.html}`)
    return { ok: false, skipped: true }
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  })

  const info = await transporter.sendMail({
    from,
    to: Array.isArray(toList) ? toList.join(',') : toList,
    subject: options.subject,
    html: options.html
  })

  return { ok: true, messageId: info.messageId }
}
