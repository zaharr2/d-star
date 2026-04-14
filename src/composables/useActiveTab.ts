import { ref, watch, onMounted, onUnmounted } from 'vue'

const STORAGE_KEY = 'd-star:activeTab'

export function useActiveTab(validIds: string[], defaultId: string) {
  function read(): string {
    const hash = window.location.hash.replace(/^#/, '')
    if (hash && validIds.includes(hash)) return hash
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && validIds.includes(stored)) return stored
    return defaultId
  }

  const activeId = ref<string>(read())

  watch(activeId, (id) => {
    localStorage.setItem(STORAGE_KEY, id)
    if (window.location.hash.replace(/^#/, '') !== id) {
      history.replaceState(null, '', `#${id}`)
    }
  })

  function onHashChange() {
    const hash = window.location.hash.replace(/^#/, '')
    if (hash && validIds.includes(hash) && hash !== activeId.value) {
      activeId.value = hash
    }
  }

  onMounted(() => window.addEventListener('hashchange', onHashChange))
  onUnmounted(() => window.removeEventListener('hashchange', onHashChange))

  return { activeId }
}
