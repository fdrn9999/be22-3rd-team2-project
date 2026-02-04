<script setup>
import { computed } from 'vue';
import TaskCard from './TaskCard.vue';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  columnType: {
    type: String,
    required: true,
  },
  tasks: {
    type: Array,
    required: true,
  },
  columnData: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['edit', 'toggleFavorite', 'dragStart', 'dragOver', 'drop']);

const columnColors = {
  todo: 'bg-slate-50 border-slate-200',
  inProgress: 'bg-blue-50 border-blue-200',
  done: 'bg-green-50 border-green-200',
};

const containerClass = computed(() => {
  // Use color from columnData if available, otherwise fallback to predefined colors
  const colorClass = props.columnData.color || columnColors[props.columnType] || 'bg-gray-50 border-gray-200';
  return `flex-1 min-w-[300px] rounded-lg border-2 ${colorClass} p-4`;
});
</script>

<template>
  <div :class="containerClass">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h2 class="font-semibold text-gray-800">{{ title }}</h2>
        <span class="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
          {{ tasks.length }}
        </span>
      </div>
    </div>
    
    <div
      class="space-y-3 min-h-[200px]"
      @dragover="(e) => emit('dragOver', e)"
      @drop="() => emit('drop', columnType)"
    >
      <div
        v-for="task in tasks"
        :key="task.id"
        draggable="true"
        @dragstart="() => emit('dragStart', task)"
      >
        <TaskCard
          :task="task"
          @edit="emit('edit', task)"
          @toggle-favorite="emit('toggleFavorite', task.id)"
        />
      </div>
    </div>
  </div>
</template>
