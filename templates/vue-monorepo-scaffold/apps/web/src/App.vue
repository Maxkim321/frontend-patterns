<template>
  <div class="home">
    <h1>{{ title }}</h1>
    <p>API 包自检：{{ apiCheck }}</p>
    <p>Utils 包自检：{{ utilsCheck }}</p>
  </div>
</template>

<script setup lang="ts">
import { hello } from '@scaffold/utils'
import { healthCheck } from '@scaffold/api'

const title = 'Vue Monorepo Scaffold'
const apiCheck = healthCheck()
const utilsCheck = hello('scaffold')
</script>
