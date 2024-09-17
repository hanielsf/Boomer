<template>
  <q-page class="dashboard q-pa-md" v-if="userProfile === 'admin'">
    <div class="row justify-between items-center q-mb-md">
      <h1 class="text-h4">Painel de Atendimentos</h1>
      <div class="row q-gutter-sm">
        <q-btn-dropdown color="primary" :label="formatDateRange">
          <q-date v-model="dateRange" range />
        </q-btn-dropdown>
        <q-btn color="secondary" icon="filter_list" label="Filtros" @click="visualizarFiltros = true" />
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-xs-12 col-sm-6 col-md-3" v-for="stat in stats" :key="stat.label">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-subtitle2">{{ stat.label }}</div>
            <div class="text-h5 q-mt-sm">{{ stat.value }}</div>
            <q-linear-progress :value="stat.progress" class="q-mt-sm" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card class="q-mb-md">
      <q-tabs v-model="visao" class="text-primary">
        <q-tab v-for="option in optionsVisao" :key="option.value" :name="option.value" :label="option.label" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="visao" animated>
        <q-tab-panel v-for="option in optionsVisao" :key="option.value" :name="option.value">
          <div class="row q-col-gutter-md">
            <div v-for="(items, key) in groupedTickets" :key="key" class="col-xs-12 col-sm-6 col-md-4 col-lg-3">
              <q-card class="dashboard-card">
                <q-card-section :class="{ 'bg-negative text-white': isPendente(items[0]) }">
                  <div class="text-h6">{{ getHeaderTitle(items[0]) }}</div>
                  <div class="text-subtitle2">{{ getHeaderSubtitle(items) }}</div>
                </q-card-section>
                <q-separator />
                <q-card-section class="scroll" style="max-height: 300px;">
                  <q-list v-if="option.value.endsWith('S')" dense>
                    <q-item v-for="status in ['open', 'pending', 'closed']" :key="status">
                      <q-item-section>
                        <q-item-label>{{ statusLabels[status] }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-chip :color="statusColors[status]" text-color="white">
                          {{ counterStatus(items)[status] }}
                        </q-chip>
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <ItemTicket v-else v-for="ticket in items" :key="ticket.id" :ticket="ticket" :filas="filas" />
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <q-dialog full-height position="right" v-model="visualizarFiltros">
      <q-card style="width: 300px">
        <q-card-section>
          <div class="text-h6">Filtros Avançados</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-if="!pesquisaTickets.showAll"
            outlined
            dense
            multiple
            use-chips
            label="Filas"
            v-model="pesquisaTickets.queuesIds"
            :options="filas"
            option-value="id"
            option-label="queue"
          />
          <q-toggle v-if="profile === 'admin'" v-model="pesquisaTickets.showAll" label="Visualizar Todos" />
          <q-select
            outlined
            dense
            multiple
            use-chips
            label="Status"
            v-model="pesquisaTickets.status"
            :options="Object.keys(statusLabels)"
            :option-label="opt => statusLabels[opt]"
          />
          <q-input v-model="pesquisaTickets.searchTerm" outlined dense label="Buscar por palavra-chave" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn unelevated label="Aplicar" color="primary" @click="applyFilters" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { date } from 'quasar'
import { groupBy } from 'lodash'
import ItemTicket from 'src/pages/atendimento/ItemTicket'
import { ConsultarTicketsQueuesService } from 'src/service/estatisticas.js'
import { ListarFilas } from 'src/service/filas'

export default {
  name: 'PainelDeControle',
  components: { ItemTicket },
  setup() {
    const userProfile = ref(localStorage.getItem('profile'))
    const profile = ref(localStorage.getItem('profile'))
    const visualizarFiltros = ref(false)
    const visao = ref('U')
    const dateRange = ref({
      from: date.subtractFromDate(new Date(), { days: 30 }),
      to: new Date()
    })
    const pesquisaTickets = ref({
      showAll: true,
      dateStart: date.formatDate(date.subtractFromDate(new Date(), { days: 30 }), 'YYYY-MM-DD'),
      dateEnd: date.formatDate(new Date(), 'YYYY-MM-DD'),
      queuesIds: [],
      status: [],
      searchTerm: ''
    })
    const tickets = ref([])
    const filas = ref([])

    const optionsVisao = [
      { label: 'Por Usuário', value: 'U' },
      { label: 'Por Usuário (Sintético)', value: 'US' },
      { label: 'Por Filas', value: 'F' },
      { label: 'Por Filas (Sintético)', value: 'FS' }
    ]

    const statusLabels = {
      open: 'Abertos',
      pending: 'Pendentes',
      closed: 'Fechados'
    }

    const statusColors = {
      open: 'green',
      pending: 'orange',
      closed: 'red'
    }

    const formatDateRange = computed(() => {
      return `${date.formatDate(dateRange.value.from, 'DD/MM/YYYY')} - ${date.formatDate(dateRange.value.to, 'DD/MM/YYYY')}`
    })

    const groupedTickets = computed(() => {
      const field = visao.value.startsWith('U') ? 'userId' : 'queueId'
      return groupBy(filteredTickets.value, field)
    })

    const filteredTickets = computed(() => {
      return tickets.value.filter(ticket => {
        if (pesquisaTickets.value.status.length && !pesquisaTickets.value.status.includes(ticket.status)) {
          return false
        }
        if (pesquisaTickets.value.searchTerm && !ticket.title.toLowerCase().includes(pesquisaTickets.value.searchTerm.toLowerCase())) {
          return false
        }
        return true
      })
    })

    const stats = computed(() => {
      const total = filteredTickets.value.length
      const open = filteredTickets.value.filter(t => t.status === 'open').length
      const pending = filteredTickets.value.filter(t => t.status === 'pending').length
      const closed = filteredTickets.value.filter(t => t.status === 'closed').length
      
      return [
        { label: 'Total de Tickets', value: total, progress: 1 },
        { label: 'Tickets Abertos', value: open, progress: open / total },
        { label: 'Tickets Pendentes', value: pending, progress: pending / total },
        { label: 'Tickets Fechados', value: closed, progress: closed / total }
      ]
    })

    function counterStatus(tickets) {
      const status = { open: 0, pending: 0, closed: 0 }
      tickets.forEach(ticket => {
        status[ticket.status]++
      })
      return status
    }

    function isPendente(item) {
      return !item.user || item.status === 'pending'
    }

    function getHeaderTitle(item) {
      return visao.value.startsWith('U') ? (item.user?.name || 'Não Atribuído') : (filas.value.find(f => f.id === item.queueId)?.queue || 'Sem Fila')
    }

    function getHeaderSubtitle(items) {
      const status = counterStatus(items)
      return `Abertos: ${status.open} | Pendentes: ${status.pending} | Total: ${items.length}`
    }

    async function consultarTickets() {
      try {
        const res = await ConsultarTicketsQueuesService(pesquisaTickets.value)
        tickets.value = res.data
      } catch (error) {
        console.error(error)
        // Utilize o sistema de notificação do Quasar
        this.$q.notify({
          color: 'negative',
          position: 'top',
          message: 'Erro ao consultar atendimentos',
          icon: 'report_problem'
        })
      }
    }

    function applyFilters() {
      pesquisaTickets.value.dateStart = date.formatDate(dateRange.value.from, 'YYYY-MM-DD')
      pesquisaTickets.value.dateEnd = date.formatDate(dateRange.value.to, 'YYYY-MM-DD')
      consultarTickets()
    }

    onMounted(async () => {
      userProfile.value = localStorage.getItem('profile')
      const { data } = await ListarFilas()
      filas.value = data
      await consultarTickets()
    })

    watch(dateRange, applyFilters)

    return {
      userProfile,
      profile,
      visualizarFiltros,
      visao,
      dateRange,
      pesquisaTickets,
      optionsVisao,
      statusLabels,
      statusColors,
      formatDateRange,
      groupedTickets,
      stats,
      filas,
      isPendente,
      getHeaderTitle,
      getHeaderSubtitle,
      counterStatus,
      applyFilters
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  }
}

:root {
  --card-bg: #ffffff;
  --text-color: #333333;
}

.body--dark {
  --card-bg: #1e1e1e;
  --text-color: #ffffff;
}

.q-card {
  background-color: var(--card-bg);
  color: var(--text-color);
}

.scroll {
  overflow-y: auto;
}
</style>