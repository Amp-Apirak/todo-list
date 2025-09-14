<template>
  <!-- ส่วนหัวของหน้า -->
  <section class="container">
    <h1>Todo List</h1>

    <!-- ฟอร์มเพิ่มงานใหม่ -->
    <form class="add-form" @submit.prevent="addTodo">
      <!-- ช่องกรอกชื่องาน: ป้องกันค่าว่างด้วยการ trim ในโค้ด -->
      <input
        v-model="newText"
        type="text"
        placeholder="พิมพ์งานที่ต้องทำ แล้วกด Enter"
        @keydown.enter.prevent="addTodo"
        aria-label="เพิ่มงานใหม่"
      />
      <!-- ผู้บันทึก -->
      <input v-model="newCreator" type="text" placeholder="ผู้บันทึก" aria-label="ผู้บันทึก" />
      <!-- ผู้ดำเนินการ -->
      <input v-model="newAssignee" type="text" placeholder="ผู้ดำเนินการ" aria-label="ผู้ดำเนินการ" />
      <!-- วันเวลาเริ่มต้น/สิ้นสุด -->
      <input v-model="newStart" type="datetime-local" aria-label="วันเวลาเริ่มต้น" />
      <input v-model="newEnd" type="datetime-local" aria-label="วันเวลาสิ้นสุด" />
      <button type="submit" :disabled="!canAdd">เพิ่ม</button>
    </form>

    <!-- แถบตัวกรอง + สวิตช์ธีม -->
    <div class="toolbar">
      <div class="filters">
        <button :class="{ active: filter === 'all' }" @click="filter = 'all'">ทั้งหมด ({{ total }})</button>
        <button :class="{ active: filter === 'active' }" @click="filter = 'active'">ค้างทำ ({{ activeCount }})</button>
        <button :class="{ active: filter === 'done' }" @click="filter = 'done'">เสร็จแล้ว ({{ doneCount }})</button>
      </div>
      <div class="theme">
        <button class="ghost" @click="toggleTheme" aria-label="สลับธีม">สลับธีม: {{ themeText }}</button>
      </div>
    </div>

    <!-- รายการงานทั้งหมด -->
    <ul class="list">
      <li v-for="todo in filteredTodos" :key="todo.id" :class="['item', { done: todo.done }]">
        <!-- ช่องติ๊กเสร็จแล้ว -->
        <input type="checkbox" v-model="todo.done" aria-label="ทำเสร็จแล้ว" />
        <!-- โหมดแสดงผลปกติ -->
        <template v-if="!todo.editing">
          <span class="text">
            {{ todo.text }}
            <!-- แสดงวันเวลาที่บันทึก -->
            <small class="meta">บันทึกเมื่อ: {{ formatDate(todo.createdAt) }}</small>
            <!-- ช่วงเวลาเริ่ม-สิ้นสุด และผู้เกี่ยวข้อง -->
            <small class="meta">เริ่ม: {{ formatDate(todo.startAt) }} · สิ้นสุด: {{ formatDate(todo.endAt) }}</small>
            <small class="meta">ผู้บันทึก: {{ todo.creator || '-' }} · ผู้ดำเนินการ: {{ todo.assignee || '-' }}</small>
          </span>
          <div class="actions">
            <button @click="startEdit(todo)" aria-label="แก้ไข">แก้ไข</button>
            <button class="danger" @click="removeTodo(todo.id)" aria-label="ลบ">ลบ</button>
          </div>
        </template>

        <!-- โหมดแก้ไข -->
        <template v-else>
          <!-- แก้ไขชื่องาน -->
          <input v-model="todo.editText" type="text" class="edit-input" @keydown.enter.prevent="saveEdit(todo)" @keydown.esc.prevent="cancelEdit(todo)" aria-label="แก้ไขงาน" />
          <!-- แก้ไขผู้บันทึก/ผู้ดำเนินการ -->
          <input v-model="todo.editCreator" type="text" placeholder="ผู้บันทึก" aria-label="แก้ไขผู้บันทึก" />
          <input v-model="todo.editAssignee" type="text" placeholder="ผู้ดำเนินการ" aria-label="แก้ไขผู้ดำเนินการ" />
          <!-- แก้ไขวันเวลาเริ่ม/สิ้นสุด -->
          <input v-model="todo.editStart" type="datetime-local" aria-label="แก้ไขวันเวลาเริ่ม" />
          <input v-model="todo.editEnd" type="datetime-local" aria-label="แก้ไขวันเวลาสิ้นสุด" />
          <div class="actions">
            <button @click="saveEdit(todo)" aria-label="บันทึก">บันทึก</button>
            <button class="ghost" @click="cancelEdit(todo)" aria-label="ยกเลิก">ยกเลิก</button>
          </div>
        </template>
      </li>
    </ul>

    <!-- กรณีไม่มีงาน แสดงข้อความแนะนำ -->
    <p v-if="todos.length === 0" class="empty">ยังไม่มีงาน ลองเพิ่มงานแรกของคุณดูสิ</p>
  </section>
</template>

<script setup lang="ts">
// ประกาศชนิดข้อมูลของรายการงาน
type Todo = {
  id: number
  text: string
  // เวลาที่บันทึกรายการ (มิลลิวินาที)
  createdAt: number
  // วันเวลาเริ่มต้น/สิ้นสุด
  startAt?: number | null
  endAt?: number | null
  // ผู้เกี่ยวข้อง
  creator?: string
  assignee?: string
  done: boolean // สถานะเสร็จแล้ว
  editing: boolean
  editText?: string
  editCreator?: string
  editAssignee?: string
  editStart?: string
  editEnd?: string
}

// สร้าง state สำหรับรายการงาน และข้อความงานใหม่
const todos = ref<Todo[]>([])
const newText = ref('')
const newCreator = ref('')
const newAssignee = ref('')
const newStart = ref<string>('')
const newEnd = ref<string>('')

// key สำหรับเก็บข้อมูลใน localStorage
const STORAGE_KEY = 'nuxt_todos_v1'

// คำนวณเงื่อนไขปุ่มเพิ่ม (ป้องกันค่าว่าง)
const canAdd = computed(() => newText.value.trim().length > 0)

// โหลดข้อมูลจาก localStorage เมื่อหน้าเพิ่งเปิด
onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Array<Partial<Todo>>
      // รองรับข้อมูลเก่าที่ยังไม่มี createdAt โดยเติมค่าใหม่
      todos.value = parsed.map((t) => ({
        id: t.id as number,
        text: t.text as string,
        createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
        startAt: (t as any).startAt ?? null,
        endAt: (t as any).endAt ?? null,
        creator: (t as any).creator ?? '',
        assignee: (t as any).assignee ?? '',
        done: Boolean(t && (t as any).done),
        editing: false
      }))
    }
  } catch (e) {
    // ถ้า parse ไม่ได้ ให้เริ่มจากรายการว่าง
    todos.value = []
  }
})

// เฝ้าดูการเปลี่ยนแปลงของ todos แล้วบันทึกลง localStorage (ไม่เก็บสถานะแก้ไข)
watch(
  todos,
  (list) => {
    const compact = list.map(({ id, text, createdAt, startAt, endAt, creator, assignee, done }) => ({ id, text, createdAt, startAt, endAt, creator, assignee, done }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compact))
  },
  { deep: true }
)

// ฟังก์ชัน: เพิ่มงานใหม่
function addTodo() {
  const text = newText.value.trim()
  if (!text) return
  const t: Todo = {
    id: Date.now(), // ใช้เวลาเป็น id แบบง่าย ๆ
    text,
    createdAt: Date.now(), // วันเวลาที่บันทึก
    startAt: parseLocalDate(newStart.value),
    endAt: parseLocalDate(newEnd.value),
    creator: newCreator.value.trim(),
    assignee: newAssignee.value.trim(),
    done: false,
    editing: false
  }
  todos.value.unshift(t)
  newText.value = ''
  newCreator.value = ''
  newAssignee.value = ''
  newStart.value = ''
  newEnd.value = ''

  // แจ้งเตือนอีเมล (สร้างใหม่)
  notify('create', t)
}

// ฟังก์ชัน: เริ่มแก้ไขงาน
function startEdit(todo: Todo) {
  todo.editing = true
  todo.editText = todo.text
  todo.editCreator = todo.creator || ''
  todo.editAssignee = todo.assignee || ''
  todo.editStart = toLocalInputValue(todo.startAt)
  todo.editEnd = toLocalInputValue(todo.endAt)
}

// ฟังก์ชัน: บันทึกผลการแก้ไข
function saveEdit(todo: Todo) {
  const text = (todo.editText ?? '').trim()
  if (!text) {
    // ถ้าเป็นค่าว่าง ถือว่าไม่เปลี่ยนแปลง และยกเลิกโหมดแก้ไข
    cancelEdit(todo)
    return
  }
  todo.text = text
  todo.creator = (todo.editCreator || '').trim()
  todo.assignee = (todo.editAssignee || '').trim()
  todo.startAt = parseLocalDate(todo.editStart || '')
  todo.endAt = parseLocalDate(todo.editEnd || '')
  todo.editing = false
  delete todo.editText
  delete todo.editCreator
  delete todo.editAssignee
  delete todo.editStart
  delete todo.editEnd

  // แจ้งเตือนอีเมล (แก้ไข)
  notify('update', todo)
}

// ฟังก์ชัน: ยกเลิกการแก้ไข (คืนค่าเดิม)
function cancelEdit(todo: Todo) {
  todo.editing = false
  delete todo.editText
}

// ฟังก์ชัน: ลบงาน
function removeTodo(id: number) {
  const t = todos.value.find((x) => x.id === id)
  todos.value = todos.value.filter((t) => t.id !== id)
  if (t) notify('delete', t)
}

// ฟังก์ชันช่วยฟอร์แมตวันเวลาให้อ่านง่าย (ภาษาไทย)
function formatDate(ts: number) {
  try {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(ts)
  } catch (e) {
    return new Date(ts).toLocaleString()
  }
}

// แปลง timestamp -> รูปแบบอินพุต datetime-local
function toLocalInputValue(ts?: number | null) {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

// แปลงค่าจาก datetime-local -> timestamp (ms)
function parseLocalDate(v?: string) {
  if (!v) return null
  const ts = Date.parse(v)
  return isNaN(ts) ? null : ts
}

// เรียก API แจ้งอีเมล
async function notify(action: 'create' | 'update' | 'delete', todo: Todo) {
  try {
    await $fetch('/api/notify', {
      method: 'POST',
      body: { action, todo }
    })
  } catch (e) {
    // เงียบไว้เพื่อไม่กระทบ UX ถ้าอีเมลล้มเหลว
    console.warn('notify failed', e)
  }
}

// ฟิลเตอร์รายการ: ทั้งหมด / ค้างทำ / เสร็จแล้ว
const filter = ref<'all' | 'active' | 'done'>('all')
const filteredTodos = computed(() => {
  if (filter.value === 'active') return todos.value.filter((t) => !t.done)
  if (filter.value === 'done') return todos.value.filter((t) => t.done)
  return todos.value
})
const total = computed(() => todos.value.length)
const activeCount = computed(() => todos.value.filter((t) => !t.done).length)
const doneCount = computed(() => todos.value.filter((t) => t.done).length)

// ธีม: สลับสว่าง/มืด และจำค่าด้วย localStorage
const THEME_KEY = 'nuxt_theme_v1'
const theme = ref<'light' | 'dark'>('light')
function applyTheme(t: 'light' | 'dark') {
  theme.value = t
  // ตั้งค่า data-theme บน <html> เพื่อให้ CSS แบบ global อ่านค่าได้
  document.documentElement.setAttribute('data-theme', t)
  try { localStorage.setItem(THEME_KEY, t) } catch (e) {}
}
function toggleTheme() {
  applyTheme(theme.value === 'light' ? 'dark' : 'light')
}
const themeText = computed(() => (theme.value === 'light' ? 'โหมดมืด' : 'โหมดสว่าง'))

onMounted(() => {
  // โหลดธีมเดิมจาก localStorage ถ้าไม่มีให้เดาตามระบบ
  try {
    const saved = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved)
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      applyTheme(prefersDark ? 'dark' : 'light')
    }
  } catch (e) {
    applyTheme('light')
  }
})
</script>

<style scoped>
.container {
  padding: 2rem;
  max-width: 720px;
}
h1 {
  margin: 0 0 1rem;
  font-size: 2rem;
}
.add-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
input[type="text"] {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  font-size: 1rem;
}
button {
  padding: 0.55rem 0.9rem;
  border: 1px solid transparent;
  background: #00dc82;
  color: #062e2b;
  border-radius: 8px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
button.danger {
  background: #ffebe9;
  color: #a40e26;
  border-color: #ffebe9;
}
button.ghost {
  background: transparent;
  color: #444;
  border-color: #d0d7de;
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.5rem;
}
.text {
  flex: 1;
}
.meta {
  display: block;
  color: #6b7280;
  font-size: 0.85rem;
  margin-top: 2px;
}
.actions {
  display: flex;
  gap: 0.4rem;
}
.edit-input {
  flex: 1;
}
.empty {
  color: #6b7280;
}

/* แถบเครื่องมือและตัวกรอง */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 1rem 0;
}
.filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.filters button { background: transparent; color: inherit; border: 1px solid #d0d7de; }
.filters button.active { border-color: #00dc82; box-shadow: 0 0 0 3px rgba(0, 220, 130, 0.25); }

/* งานที่เสร็จแล้ว: ลดความเด่นและขีดฆ่า */
.item.done .text { text-decoration: line-through; opacity: 0.7; }
.item.done::before { filter: grayscale(0.5) opacity(0.6); }
</style>

<!-- สไตล์ global สำหรับควบคุมธีมด้วย data-attribute บน <html> -->
<style>
:root[data-theme='light'] {
  --bg: #f8fafc;
  --card: #ffffff;
  --border: #e5e7eb;
  --muted: #6b7280;
  --text: #0f172a;
  --primary: #10b981;
  --primary-2: #22d3ee;
  --danger-bg: #ffebe9;
  --danger-fg: #a40e26;
}
:root[data-theme='dark'] {
  --bg: #0b1220;
  --card: #0f172a;
  --border: #1f2937;
  --muted: #9ca3af;
  --text: #e5e7eb;
  --primary: #22d3ee;
  --primary-2: #10b981;
  --danger-bg: #2b0f14;
  --danger-fg: #ff6b6b;
}
html, body { background: var(--bg); }
</style>

<style scoped>
/* ปรับโฉมหน้าตาให้ทันสมัย (โมเดิร์น) และรองรับโหมดมืด */
:root {
  --bg: #f8fafc;
  --card: #ffffff;
  --border: #e5e7eb;
  --muted: #6b7280;
  --text: #0f172a;
  --primary: #10b981;
  --primary-2: #22d3ee;
  --danger-bg: #ffebe9;
  --danger-fg: #a40e26;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b1220;
    --card: #0f172a;
    --border: #1f2937;
    --muted: #9ca3af;
    --text: #e5e7eb;
    --primary: #22d3ee;
    --primary-2: #10b981;
    --danger-bg: #2b0f14;
    --danger-fg: #ff6b6b;
  }
}

.container { margin: 0 auto; max-width: 820px; color: var(--text); }

h1 {
  margin: 0 0 1.25rem;
  font-size: 2.1rem;
  line-height: 1.2;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.add-form {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.6rem;
  box-shadow: 0 6px 20px rgba(2, 6, 23, 0.06);
  flex-wrap: wrap;
}

input[type="text"] {
  background: transparent;
  color: var(--text);
  border-color: var(--border);
  border-radius: 10px;
  transition: box-shadow 160ms ease, border-color 160ms ease;
}
input[type="datetime-local"] {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.5rem 0.6rem;
}
input::placeholder { color: var(--muted); }
input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 25%, transparent);
}

button {
  color: #062e2b;
  background-image: linear-gradient(135deg, var(--primary), var(--primary-2));
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.25);
  transition: transform 120ms ease, box-shadow 160ms ease, opacity 120ms ease;
}
button:hover { transform: translateY(-1px); }
button:active { transform: translateY(0); }

button.danger {
  background: var(--danger-bg);
  color: var(--danger-fg);
  border-color: color-mix(in oklab, var(--danger-fg) 10%, transparent);
  box-shadow: none;
}
button.ghost { background: transparent; color: var(--muted); border-color: var(--border); box-shadow: none; }

.item {
  position: relative;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(2, 6, 23, 0.06);
  transition: transform 120ms ease, box-shadow 160ms ease;
}
.item::before {
  content: "";
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  border-top-left-radius: 14px; border-bottom-left-radius: 14px;
  background: linear-gradient(180deg, var(--primary), var(--primary-2));
}
.item:hover { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(2,6,23,0.1); }

.meta { color: var(--muted); font-size: 0.85rem; }

/* พื้นหลังรวมของหน้า */
:host { background: var(--bg); }

/* ปรับสไตล์สำหรับตัวกรองและสถานะเสร็จแล้ว ให้เข้ากับธีมใหม่ */
.filters button { border-color: var(--border); color: var(--text); }
.filters button.active { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 25%, transparent); }
.item.done .text { text-decoration: line-through; opacity: 0.7; }
.item.done::before { filter: grayscale(0.5) opacity(0.6); }
</style>
