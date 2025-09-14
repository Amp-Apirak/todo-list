<template>
  <section class="container">
    <h1>Nuxt 3 + Bun</h1>
    <p>Project initialized in current folder.</p>
    <div class="links">
      <NuxtLink to="/about">Go to about</NuxtLink>
      <span> · </span>
      <NuxtLink to="/todos">Go to Todo List</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
const runtime = useRuntimeConfig()
</script>

<style scoped>
.container { padding: 2rem; }
h1 { margin: 0 0 0.5rem; font-size: 2rem; }
.links { margin-top: 1rem; }
a { color: #00DC82; }
</style>
