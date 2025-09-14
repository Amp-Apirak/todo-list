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
          </span>
          <div class="actions">
            <button @click="startEdit(todo)" aria-label="แก้ไข">แก้ไข</button>
            <button class="danger" @click="removeTodo(todo.id)" aria-label="ลบ">ลบ</button>
          </div>
        </template>

        <!-- โหมดแก้ไข -->
        <template v-else>
          <input
            v-model="todo.editText"
            type="text"
            class="edit-input"
            @keydown.enter.prevent="saveEdit(todo)"
            @keydown.esc.prevent="cancelEdit(todo)"
            aria-label="แก้ไขงาน"
          />
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
  done: boolean // สถานะเสร็จแล้ว
  editing: boolean
  editText?: string
}

// สร้าง state สำหรับรายการงาน และข้อความงานใหม่
const todos = ref<Todo[]>([])
const newText = ref('')

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
    const compact = list.map(({ id, text, createdAt, done }) => ({ id, text, createdAt, done }))
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
    done: false,
    editing: false
  }
  todos.value.unshift(t)
  newText.value = ''
}

// ฟังก์ชัน: เริ่มแก้ไขงาน
function startEdit(todo: Todo) {
  todo.editing = true
  todo.editText = todo.text
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
  todo.editing = false
  delete todo.editText
}

// ฟังก์ชัน: ยกเลิกการแก้ไข (คืนค่าเดิม)
function cancelEdit(todo: Todo) {
  todo.editing = false
  delete todo.editText
}

// ฟังก์ชัน: ลบงาน
function removeTodo(id: number) {
  todos.value = todos.value.filter((t) => t.id !== id)
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
}

input[type="text"] {
  background: transparent;
  color: var(--text);
  border-color: var(--border);
  border-radius: 10px;
  transition: box-shadow 160ms ease, border-color 160ms ease;
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
