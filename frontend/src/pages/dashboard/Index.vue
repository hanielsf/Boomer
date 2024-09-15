<template>
  <q-page class="dashboard q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <h1 class="text-h4">Visão Geral de Atendimentos</h1>
      <div class="date-picker">
        <q-btn-dropdown color="primary" :label="formatDateRange">
          <q-date v-model="dateRange" range minimal />
        </q-btn-dropdown>
      </div>
    </div>

    <div v-if="isLoading" class="text-center q-pa-md">
      <q-spinner color="primary" size="3em" />
      <p>Carregando dados...</p>
    </div>

    <template v-else>
      <div class="row q-col-gutter-md">
        <div v-for="metric in metrics" :key="metric.label" class="col-xs-12 col-sm-6 col-md-3">
          <q-card class="metric-card">
            <q-card-section>
              <div class="text-subtitle2">{{ metric.label }}</div>
              <div class="text-h5">{{ metric.value }}</div>
              <q-linear-progress :value="metric.progress" class="q-mt-sm" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md q-mt-md">
        <div class="col-xs-12 col-md-6">
          <q-card>
            <q-card-section>
              <div class="text-h6">Distribuição por Canal</div>
              <apexchart type="donut" height="300" :options="channelDistributionOptions" :series="channelDistributionSeries" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-xs-12 col-md-6">
          <q-card>
            <q-card-section>
              <div class="text-h6">Evolução de Atendimentos</div>
              <apexchart type="line" height="300" :options="attendanceEvolutionOptions" :series="attendanceEvolutionSeries" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <q-card class="q-mt-md">
        <q-card-section>
          <div class="text-h6">Desempenho da Equipe</div>
          <q-table
            :data="teamPerformance"
            :columns="teamPerformanceColumns"
            row-key="name"
            :pagination.sync="pagination"
            flat
            bordered
          />
        </q-card-section>
      </q-card>
    </template>
  </q-page>
</template>

<script>
import { date } from 'quasar'
import VueApexCharts from 'vue-apexcharts'
import { 
  GetDashTicketsAndTimes,
  GetDashTicketsChannels,
  GetDashTicketsEvolutionByPeriod,
  GetDashTicketsPerUsersDetail
} from 'src/service/estatisticas'

export default {
  name: 'Dashboard',
  components: {
    apexchart: VueApexCharts,
  },
  data() {
    return {
      isLoading: true,
      dateRange: {
        from: date.subtractFromDate(new Date(), { days: 30 }),
        to: new Date()
      },
      dashData: {
        qtd_total_atendimentos: 0,
        tma: { hours: 0, minutes: 0, seconds: 0 },
        tme: { hours: 0, minutes: 0, seconds: 0 },
        qtd_resolvidos: 0,
        new_contacts: 0,
        satisfacao: 0,
        qtd_pendentes: 0,
        qtd_atendentes: 1, // Para evitar divisão por zero
        channels: [],
        evolution: [],
        teamPerformance: []
      },
      pagination: { rowsPerPage: 10 }
    }
  },
  computed: {
    currentTheme() {
      return this.$q.dark.isActive ? 'dark' : 'light'
    },
    formatDateRange() {
      return `${date.formatDate(this.dateRange.from, 'DD/MM/YYYY')} - ${date.formatDate(this.dateRange.to, 'DD/MM/YYYY')}`
    },
    metrics() {
      return [
        {
          label: 'Total de Atendimentos',
          value: this.dashData.qtd_total_atendimentos,
          progress: this.dashData.qtd_total_atendimentos / 1000 // Ajuste conforme necessário
        },
        {
          label: 'Tempo Médio de Atendimento',
          value: this.formatDuration(this.dashData.tma),
          progress: this.calculateProgress(this.dashData.tma)
        },
        {
          label: 'Taxa de Resolução',
          value: `${((this.dashData.qtd_resolvidos / this.dashData.qtd_total_atendimentos) * 100).toFixed(1)}%`,
          progress: this.dashData.qtd_resolvidos / (this.dashData.qtd_total_atendimentos || 1)
        },
        {
          label: 'Novos Contatos',
          value: this.dashData.new_contacts,
          progress: this.dashData.new_contacts / 1000 // Ajuste conforme necessário
        },
        {
          label: 'Satisfação do Cliente',
          value: `${(this.dashData.satisfacao * 100).toFixed(1)}%`,
          progress: this.dashData.satisfacao
        },
        {
          label: 'Tempo Médio de Espera',
          value: this.formatDuration(this.dashData.tme),
          progress: this.calculateProgress(this.dashData.tme)
        },
        {
          label: 'Atendimentos Pendentes',
          value: this.dashData.qtd_pendentes,
          progress: this.dashData.qtd_pendentes / (this.dashData.qtd_total_atendimentos || 1)
        },
        {
          label: 'Eficiência da Equipe',
          value: `${((this.dashData.qtd_resolvidos / this.dashData.qtd_atendentes) / 8).toFixed(1)}`,
          progress: (this.dashData.qtd_resolvidos / this.dashData.qtd_atendentes) / 20 // Ajuste conforme necessário
        }
      ]
    },
    channelDistributionOptions() {
      return {
        chart: { type: 'donut' },
        labels: this.dashData.channels.map(c => c.label),
        theme: { mode: this.currentTheme },
        responsive: [{ breakpoint: 480, options: { chart: { width: 200 }, legend: { position: 'bottom' } } }],
        colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'],
        plotOptions: {
          pie: {
            donut: {
              labels: {
                show: true,
                total: {
                  showAlways: true,
                  show: true
                }
              }
            }
          }
        }
      }
    },
    channelDistributionSeries() {
      return this.dashData.channels.map(c => c.qtd)
    },
    attendanceEvolutionOptions() {
      return {
        chart: { type: 'line', zoom: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth' },
        xaxis: { type: 'datetime', categories: this.dashData.evolution.map(e => e.label) },
        theme: { mode: this.currentTheme },
        colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'],
        grid: {
          borderColor: this.currentTheme === 'dark' ? '#4b5563' : '#e5e7eb'
        }
      }
    },
    attendanceEvolutionSeries() {
      return [{
        name: 'Atendimentos',
        data: this.dashData.evolution.map(e => e.qtd)
      }]
    },
    teamPerformanceColumns() {
      return [
        { name: 'name', label: 'Atendente', field: 'name', sortable: true, align: 'left' },
        { name: 'qtd_resolvidos', label: 'Resolvidos', field: 'qtd_resolvidos', sortable: true, align: 'center' },
        { name: 'qtd_pendentes', label: 'Pendentes', field: 'qtd_pendentes', sortable: true, align: 'center' },
        { name: 'tma', label: 'TMA', field: 'tma', format: this.formatDuration, sortable: true, align: 'center' },
        { name: 'tme', label: 'TME', field: 'tme', format: this.formatDuration, sortable: true, align: 'center' },
        { name: 'efficiency', label: 'Eficiência', field: row => ((row.qtd_resolvidos / 8) * 100).toFixed(1) + '%', sortable: true, align: 'center' }
      ]
    },
    teamPerformance() {
      return this.dashData.teamPerformance || []
    }
  },
  methods: {
    formatDuration(timeObject) {
      if (!timeObject || typeof timeObject !== 'object') return 'N/A'
      const { hours = 0, minutes = 0, seconds = 0 } = timeObject
      return `${hours}h ${minutes}m ${seconds}s`
    },
    calculateProgress(timeObject) {
      if (!timeObject || typeof timeObject !== 'object') return 0
      const { hours = 0, minutes = 0, seconds = 0 } = timeObject
      const totalSeconds = hours * 3600 + minutes * 60 + seconds
      return Math.min(totalSeconds / (24 * 3600), 1) // Assume um máximo de 24 horas
    },
    async fetchDashboardData() {
      this.isLoading = true
      try {
        const [timesResponse, channelsResponse, evolutionResponse, usersResponse] = await Promise.all([
          GetDashTicketsAndTimes({ startDate: date.formatDate(this.dateRange.from, 'YYYY-MM-DD'), endDate: date.formatDate(this.dateRange.to, 'YYYY-MM-DD') }),
          GetDashTicketsChannels({ startDate: date.formatDate(this.dateRange.from, 'YYYY-MM-DD'), endDate: date.formatDate(this.dateRange.to, 'YYYY-MM-DD') }),
          GetDashTicketsEvolutionByPeriod({ startDate: date.formatDate(this.dateRange.from, 'YYYY-MM-DD'), endDate: date.formatDate(this.dateRange.to, 'YYYY-MM-DD') }),
          GetDashTicketsPerUsersDetail({ startDate: date.formatDate(this.dateRange.from, 'YYYY-MM-DD'), endDate: date.formatDate(this.dateRange.to, 'YYYY-MM-DD') })
        ])
        
        const times = timesResponse.data[0]
        this.dashData = {
          ...this.dashData,
          ...times,
          channels: channelsResponse.data,
          evolution: evolutionResponse.data,
          teamPerformance: usersResponse.data
        }

        console.log('TMA:', this.dashData.tma, 'TME:', this.dashData.tme) // Para depuração
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error)
        if (this.$q && this.$q.notify) {
          this.$q.notify({ type: 'negative', message: 'Erro ao carregar dados do dashboard' })
        } else {
          alert('Erro ao carregar dados do dashboard')
        }
      } finally {
        this.isLoading = false
      }
    }
  },
  mounted() {
    this.fetchDashboardData()
  },
  watch: {
    dateRange: {
      handler: 'fetchDashboardData',
      deep: true
    }
  }
}
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}
.metric-card {
  height: 100%;
  transition: all 0.3s ease;
}
.date-picker {
  width: 250px;
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
</style>