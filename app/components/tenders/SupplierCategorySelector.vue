<template>
  <div class="rounded-box border border-base-200 bg-base-200/20 p-3">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-sm font-semibold">Required supplier categories</p>
        <p v-if="!item.supplier_categories?.length" class="mt-1 text-xs text-base-content/50">
          Open to all registered supplier categories.
        </p>
        <div v-else class="mt-2 flex flex-wrap gap-1">
          <span v-for="category in item.supplier_categories" :key="category.id" class="badge badge-outline badge-sm">
            {{ category.code }} · {{ category.name }}
          </span>
        </div>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" @click="toggleEditor">
        <Icon name="lucide:tags" class="h-4 w-4" />
        {{ editorOpen ? 'Close' : 'Set categories' }}
      </button>
    </div>

    <div v-if="editorOpen" class="mt-3 border-t border-base-200 pt-3">
      <label class="input input-sm flex w-full items-center gap-2">
        <Icon name="lucide:search" class="h-4 w-4 text-base-content/40" />
        <input v-model="searchTerm" class="grow" placeholder="Search supplier categories…">
      </label>

      <div class="mt-2 max-h-52 space-y-1 overflow-y-auto">
        <p v-if="!filteredCategories.length" class="p-3 text-center text-xs text-base-content/50">
          No supplier categories match your search.
        </p>
        <label
          v-for="category in filteredCategories"
          :key="category.id"
          class="flex cursor-pointer items-start gap-2 rounded-box px-2 py-1.5 hover:bg-base-200/60"
        >
          <input
            type="checkbox"
            class="checkbox checkbox-sm mt-0.5"
            :checked="selectedCategoryIds.includes(Number(category.id))"
            @change="toggleCategory(category.id)"
          >
          <span class="text-sm">
            <strong>{{ category.name }}</strong>
            <span class="ml-1 font-mono text-xs text-base-content/50">{{ category.code }}</span>
          </span>
        </label>
      </div>

      <p v-if="errorMessage" class="mt-2 text-xs text-error">{{ errorMessage }}</p>
      <div class="mt-3 flex justify-end">
        <button type="button" class="btn btn-primary btn-sm" :disabled="saving || !hasChanges" @click="save">
          <span v-if="saving" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:save" class="h-4 w-4" />
          Save categories
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, required: true },
  item: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
})

const emit = defineEmits(['saved'])
const { updateTenderItem } = useTenderHelper()

const editorOpen = ref(false)
const searchTerm = ref('')
const saving = ref(false)
const errorMessage = ref('')
const selectedCategoryIds = ref([])

const savedCategoryIds = computed(() => (props.item.supplier_categories ?? [])
  .map(category => Number(category.id))
  .sort((left, right) => left - right))
const normalizedSelectedIds = computed(() => [...selectedCategoryIds.value].sort((left, right) => left - right))
const hasChanges = computed(() => JSON.stringify(normalizedSelectedIds.value) !== JSON.stringify(savedCategoryIds.value))
const filteredCategories = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  if (!term) return props.categories
  return props.categories.filter(category => `${category.code} ${category.name}`.toLowerCase().includes(term))
})

watch(
  () => props.item.supplier_categories,
  categories => {
    selectedCategoryIds.value = (categories ?? []).map(category => Number(category.id))
  },
  { immediate: true, deep: true },
)

function toggleEditor() {
  editorOpen.value = !editorOpen.value
  errorMessage.value = ''
}

function toggleCategory(categoryId) {
  const id = Number(categoryId)
  const selected = new Set(selectedCategoryIds.value)
  if (selected.has(id)) selected.delete(id)
  else selected.add(id)
  selectedCategoryIds.value = [...selected]
}

function responseMessage(error) {
  const errors = error?.value?.data?.data?.errors ?? error?.value?.data?.errors
  if (Array.isArray(errors) && errors.length) return errors[0]
  if (errors && typeof errors === 'object') return Object.values(errors).flat()[0] || 'Could not save supplier categories.'
  return error?.value?.data?.message || 'Could not save supplier categories.'
}

async function save() {
  saving.value = true
  errorMessage.value = ''
  try {
    const { status, error } = await updateTenderItem(props.tenderUuid, props.item.id, {
      supplier_category_ids: normalizedSelectedIds.value,
    })
    if (!status.value) {
      errorMessage.value = responseMessage(error)
      return
    }
    editorOpen.value = false
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>
