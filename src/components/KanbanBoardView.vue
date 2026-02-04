<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router'; // Add route
import { storeToRefs } from 'pinia';
import KanbanColumn from './KanbanColumn.vue';
import TaskModal from './TaskModal.vue';
import FilterBar from './FilterBar.vue';
import ActivityTimeline from './ActivityTimeline.vue';
import AlertModal from './AlertModal.vue';
import { ChevronLeft, MoreVertical, Plus, Edit, Trash2 } from 'lucide-vue-next';
import { useKanbanStore } from '../stores/kanbanStore';

const props = defineProps({
  id: String // From Router
});

const emit = defineEmits(['back', 'edit-board', 'delete-board']);

const store = useKanbanStore();
const route = useRoute();
const { selectedBoard, boardTasks, boardLogs, currentUser } = storeToRefs(store);

// Initialize board from route or prop
onMounted(() => {
  const boardId = props.id || route.params.id;
  if (boardId) {
    store.selectBoard(boardId);
  }
});

watch(() => props.id, (newId) => {
  if (newId) store.selectBoard(newId);
});

const board = computed(() => selectedBoard.value || {});
const tasks = computed(() => boardTasks.value);
const logs = computed(() => boardLogs.value);

const selectedTask = ref(null);
const isModalOpen = ref(false);
const isNewTask = ref(false);
const draggedTask = ref(null);
const showBoardMenu = ref(false);
const menuRef = ref(null);
const isAlertOpen = ref(false);
const alertTitle = ref('알림');
const alertMessage = ref('');

const showAlert = (message, title = '알림') => {
  alertTitle.value = title;
  alertMessage.value = message;
  isAlertOpen.value = true;
};

// 필터 상태
const selectedAssignee = ref('All');
const selectedPriority = ref('All');

// 담당자 목록 추출
const assignees = computed(() => {
  const allAssignees = tasks.value.flatMap((task) => task.assignees || []);
  return Array.from(new Set(allAssignees)).sort();
});

// 필터링된 작업 목록
const filteredTasks = computed(() => {
  return tasks.value.filter((task) => {
    const assigneeMatch =
      selectedAssignee.value === 'All' ||
      (task.assignees && task.assignees.includes(selectedAssignee.value));
    const priorityMatch = selectedPriority.value === 'All' || task.priority === selectedPriority.value;
    return assigneeMatch && priorityMatch;
  });
});

// 동적 컬럼 정의 (데이터가 없으면 기본값 사용)
const columns = computed(() => {
  if (board.value.columns && board.value.columns.length > 0) {
    return board.value.columns;
  }
  return [
    { id: 'todo', title: '할 일', color: 'bg-slate-50 border-slate-200' },
    { id: 'inProgress', title: '진행 중', color: 'bg-blue-50 border-blue-200' },
    { id: 'done', title: '완료', color: 'bg-green-50 border-green-200' }
  ];
});

// 칼럼별 작업 분류 (동적)
const tasksByColumn = computed(() => {
  const grouped = {};
  columns.value.forEach(col => {
    grouped[col.id] = filteredTasks.value.filter(t => t.column === col.id);
  });
  return grouped;
});

const isCreator = computed(() => board.value.createdBy === currentUser.value?.email);
const hasBoardActions = computed(() => true); // Access control can be stricter if needed

const handleDocumentClick = (event) => {
  if (!menuRef.value) return;
  if (!menuRef.value.contains(event.target)) {
    showBoardMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});

// 활동 로그 추가
const addLog = async (action, taskTitle, details, taskId) => {
  const newLog = {
    id: `log${Date.now()}`,
    taskId,
    taskTitle,
    action,
    timestamp: new Date(),
    details,
    boardId: board.value.id,
  };
  await store.addLogItem(newLog);
};

// 작업 저장
const handleSaveTask = async (task) => {
  if (isNewTask.value) {
    const newTask = { ...task, id: `task${Date.now()}`, createdAt: new Date(), boardId: board.value.id };
    await store.addTask(newTask);
    addLog('작업 생성', newTask.title, `"${newTask.title}" 작업이 생성되었습니다.`, newTask.id);
    showAlert('업무가 생성되었습니다.', '완료');
  } else {
    const oldTask = tasks.value.find((t) => t.id === task.id);
    await store.updateTaskItem(task);
    
    if (oldTask && oldTask.column !== task.column) {
      const colMap = columns.value.reduce((acc, col) => ({...acc, [col.id]: col.title}), {});
      const oldColName = colMap[oldTask.column] || oldTask.column;
      const newColName = colMap[task.column] || task.column;

      addLog(
        '작업 이동',
        task.title,
        `"${task.title}" 작업이 ${oldColName}에서 ${newColName}(으)로 이동되었습니다.`,
        task.id
      );
    } else {
      addLog('작업 수정', task.title, `"${task.title}" 작업이 수정되었습니다.`, task.id);
    }
    showAlert('업무가 수정되었습니다.', '완료');
  }
  isModalOpen.value = false;
  selectedTask.value = null;
  isNewTask.value = false;
};

// 작업 삭제
const handleDeleteTask = async (taskId) => {
  const task = tasks.value.find((t) => t.id === taskId);
  if (task) {
    await store.removeTask(taskId);
    addLog('작업 삭제', task.title, `"${task.title}" 작업이 삭제되었습니다.`, taskId);
    showAlert('업무가 삭제되었습니다.', '완료');
    isModalOpen.value = false;
    selectedTask.value = null;
  }
};

// 새 작업 추가
const handleAddTask = (columnType) => {
  selectedTask.value = {
    id: '',
    title: '',
    description: '',
    assignees: [],
    priority: 'Medium',
    column: columnType,
    createdAt: new Date(),
    updatedAt: new Date(),
    boardId: board.value.id,
  };
  isNewTask.value = true;
  isModalOpen.value = true;
};

// 드래그 앤 드롭
const handleDragStart = (task) => {
  draggedTask.value = task;
};

const handleDragOver = (e) => {
  e.preventDefault();
};

const handleDrop = async (columnType) => {
  if (draggedTask.value && draggedTask.value.column !== columnType) {
    const updatedTask = { ...draggedTask.value, column: columnType, updatedAt: new Date() };
    await store.updateTaskItem(updatedTask);
    
    const colMap = columns.value.reduce((acc, col) => ({...acc, [col.id]: col.title}), {});
    const oldColName = colMap[draggedTask.value.column] || draggedTask.value.column;
    const newColName = colMap[columnType] || columnType;

    addLog(
      '작업 이동',
      draggedTask.value.title,
      `"${draggedTask.value.title}" 작업이 ${oldColName}에서 ${newColName}(으)로 이동되었습니다.`,
      draggedTask.value.id
    );
  }
  draggedTask.value = null;
};

// 작업 편집
const handleEditTask = (task) => {
  selectedTask.value = task;
  isNewTask.value = false;
  isModalOpen.value = true;
};

// 즐겨찾기 토글
const handleToggleFavorite = async (taskId) => {
  const task = tasks.value.find((t) => t.id === taskId);
  if (task) {
    const updatedTask = { ...task, isFavorite: !task.isFavorite, updatedAt: new Date() };
    await store.updateTaskItem(updatedTask);
    addLog(
      updatedTask.isFavorite ? '즐겨찾기 추가' : '즐겨찾기 해제',
      task.title,
      `"${task.title}" 작업을 즐겨찾기${updatedTask.isFavorite ? '에 추가' : '에서 제거'}했습니다.`,
      taskId
    );
  }
};

const handleReset = () => {
  selectedAssignee.value = 'All';
  selectedPriority.value = 'All';
};
</script>

<template>
  <div class="flex-1 h-screen overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50">
    <div class="max-w-7xl mx-auto p-6">
      <!-- 헤더 -->
      <div class="mb-6">
        <!-- 뒤로가기 버튼 -->
        <button
          @click="emit('back')"
          class="group inline-flex items-center gap-2 mb-4 px-3 py-2 rounded-lg hover:bg-white/60 transition-all duration-200 ease-in-out"
        >
          <div class="flex items-center justify-center size-6 rounded-full bg-white shadow-sm group-hover:shadow-md group-hover:-translate-x-1 transition-all duration-200">
            <ChevronLeft class="size-4 text-gray-700" />
          </div>
          <span class="text-sm font-medium text-gray-700 group-hover:text-gray-900">
            보드 목록으로
          </span>
        </button>

        <!-- 보드 정보 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div :class="`size-12 ${board.color} rounded-lg shadow-md`"></div>
            <div>
              <h1 class="font-bold text-gray-900">{{ board.title }}</h1>
              <p class="text-sm text-gray-600">{{ board.description }}</p>
            </div>
          </div>
          
          <!-- 멤버 및 액션 -->
          <div class="flex items-center gap-3">
            <!-- 멤버 아바타 그룹 -->
            <div v-if="board.members && board.members.length > 0" class="flex items-center gap-1">
              <div class="flex -space-x-2">
                <img
                  v-for="member in board.members.slice(0, 3)"
                  :key="member.id"
                  :src="member.avatar"
                  :alt="member.name"
                  :title="member.name"
                  class="size-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform cursor-pointer"
                />
              </div>
              <div
                v-if="board.members.length > 3"
                class="size-8 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center"
              >
                <span class="text-xs font-medium text-gray-700">
                  +{{ board.members.length - 3 }}
                </span>
              </div>
            </div>
            
            <button
              @click="handleAddTask('todo')"
              class="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <Plus class="size-4 mr-1" />
              새 작업 추가
            </button>
            
            <!-- 보드 설정 메뉴 - 생성자만 보임 -->
            <div v-if="isCreator && hasBoardActions" class="relative" ref="menuRef">
              <button
                class="p-2 hover:bg-white/60 rounded-lg transition-colors"
                @click.stop="showBoardMenu = !showBoardMenu"
                aria-label="보드 메뉴"
              >
                <MoreVertical class="size-5 text-gray-700" />
              </button>

              <div
                v-if="showBoardMenu"
                class="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 z-10 animate-in fade-in slide-in-from-top-2 duration-200"
                @click.stop
              >
                <!-- 수정 버튼 -->
                <button
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  @click="() => {
                    emit('edit-board', board);
                    showBoardMenu = false;
                  }"
                >
                  <Edit class="size-4" />
                  <span class="font-medium">수정</span>
                </button>

                <!-- 구분선 -->
                <div class="my-1 border-t border-gray-100" />

                <!-- 삭제 버튼 -->
                <button
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  @click="() => {
                    emit('delete-board', board.id);
                    showBoardMenu = false;
                  }"
                >
                  <Trash2 class="size-4" />
                  <span class="font-medium">삭제</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 필터 바 -->
      <FilterBar
        :assignees="assignees"
        :selected-assignee="selectedAssignee"
        :selected-priority="selectedPriority"
        @assignee-change="(val) => selectedAssignee = val"
        @priority-change="(val) => selectedPriority = val"
        @reset="handleReset"
      />

      <!-- 칸반 보드 (동적 렌더링) -->
      <div class="flex gap-4 mb-8 overflow-x-auto pb-4">
        <KanbanColumn
          v-for="col in columns"
          :key="col.id"
          :title="col.title"
          :column-type="col.id"
          :column-data="col"
          :tasks="tasksByColumn[col.id] || []"
          @edit="handleEditTask"
          @toggle-favorite="handleToggleFavorite"
          @drag-start="handleDragStart"
          @drag-over="handleDragOver"
          @drop="handleDrop"
        />
      </div>

      <!-- 활동 로그 -->
      <ActivityTimeline :logs="logs" />

      <!-- 작업 상세 모달 -->
      <TaskModal
        :task="selectedTask"
        :is-open="isModalOpen"
        :is-new-task="isNewTask"
        :board-members="board.members"
        :board-created-by="board.createdBy"
        :available-users="store.registeredUsers"
        @close="() => {
          isModalOpen = false;
          selectedTask = null;
          isNewTask = false;
        }"
        @save="handleSaveTask"
        @delete="handleDeleteTask"
      />

      <AlertModal
        :is-open="isAlertOpen"
        :title="alertTitle"
        :message="alertMessage"
        @close="isAlertOpen = false"
      />
    </div>
  </div>
</template>
