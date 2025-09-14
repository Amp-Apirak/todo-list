// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  srcDir: '.',
  future: { compatibilityVersion: 4 },
  modules: [],
  compatibilityDate: '2024-11-01',
  runtimeConfig: {
    mailHost: process.env.NUXT_MAIL_HOST,
    mailPort: process.env.NUXT_MAIL_PORT,
    mailUser: process.env.NUXT_MAIL_USER,
    mailPass: process.env.NUXT_MAIL_PASS,
    mailFrom: process.env.NUXT_MAIL_FROM,
    // ค่าเริ่มต้นรายชื่อผู้รับตามที่ผู้ใช้ร้องขอ
    mailTo: process.env.NUXT_MAIL_TO || 'Apirak.ba@gmail.com,Apirak.ba@outlook.com,Apirak@pointit.co.th',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api'
    }
  }
})
