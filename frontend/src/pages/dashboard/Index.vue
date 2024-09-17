<template>
  <q-page class="dashboard q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <h1 class="text-h4 text-weight-bold">Visão Geral de Atendimentos</h1>
      <q-btn-dropdown color="primary" :label="formatDateRange" class="date-picker">
        <q-date v-model="dateRange" range minimal />
      </q-btn-dropdown>
    </div>

    <div v-if="isLoading" class="fullscreen flex flex-center">
      <q-spinner color="primary" size="3em" />
    </div>

    <template v-else>
      <div class="row q-col-gutter-md q-mb-md">
        <div v-for="metric in metrics" :key="metric.label" class="col-xs-12 col-sm-6 col-md-3">
          <q-card class="metric-card">
            <q-card-section>
              <div class="text-subtitle1 text-grey">{{ metric.label }}</div>
              <div class="text-h4 text-weight-bold q-mt-sm">{{ metric.value }}</div>
              <q-linear-progress
                :value="metric.progress"
                class="q-mt-sm"
                size="10px"
                :color="getProgressColor(metric.progress)"
              />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <div class="col-xs-12 col-md-6">
          <q-card class="chart-card">
            <q-card-section>
              <div class="text-h6 text-weight-bold">Distribuição por Canal</div>
              <apexchart type="donut" height="300" :options="channelDistributionOptions" :series="channelDistributionSeries" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-xs-12 col-md-6">
          <q-card class="chart-card">
            <q-card-section>
              <div class="text-h6 text-weight-bold">Evolução de Atendimentos</div>
              <apexchart type="area" height="300" :options="attendanceEvolutionOptions" :series="attendanceEvolutionSeries" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <q-card class="q-mt-md">
        <q-card-section>
          <div class="text-h6 text-weight-bold q-mb-md">Desempenho da Equipe</div>
          <q-table
            :data="teamPerformance"
            :columns="teamPerformanceColumns"
            row-key="name"
            :pagination.sync="pagination"
            flat
            bordered
            class="performance-table"
          >
            <template v-slot:body-cell-efficiency="props">
              <q-td :props="props">
                <q-linear-progress
                  :value="props.value / 100"
                  size="xs"
                  :color="getProgressColor(props.value / 100)"
                />
                <span class="q-ml-sm">{{ props.value }}%</span>
              </q-td>
            </template>
          </q-table>
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
    apexchart: VueApexCharts
  },
  data () {
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
    currentTheme () {
      return this.$q.dark.isActive ? 'dark' : 'light'
    },
    formatDateRange () {
      return `${date.formatDate(this.ensureValidDate(this.dateRange.from), 'DD/MM/YYYY')} - ${date.formatDate(this.ensureValidDate(this.dateRange.to), 'DD/MM/YYYY')}`
    },
    metrics () {
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
    channelDistributionOptions () {
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
    channelDistributionSeries () {
      return this.dashData.channels.map(c => c.qtd)
    },
    attendanceEvolutionOptions () {
      return {
        chart: { type: 'area', zoom: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth' },
        xaxis: {
          type: 'datetime',
          categories: this.dashData.evolution.map(e => this.ensureValidDate(e.label).getTime())
        },
        theme: { mode: this.currentTheme },
        colors: ['#008FFB'],
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.9,
            stops: [0, 90, 100]
          }
        },
        grid: {
          borderColor: this.currentTheme === 'dark' ? '#4b5563' : '#e5e7eb'
        }
      }
    },
    attendanceEvolutionSeries () {
      return [{
        name: 'Atendimentos',
        data: this.dashData.evolution.map(e => e.qtd)
      }]
    },
    teamPerformanceColumns () {
      return [
        { name: 'name', label: 'Atendente', field: 'name', sortable: true, align: 'left' },
        { name: 'qtd_resolvidos', label: 'Resolvidos', field: 'qtd_resolvidos', sortable: true, align: 'center' },
        { name: 'qtd_pendentes', label: 'Pendentes', field: 'qtd_pendentes', sortable: true, align: 'center' },
        { name: 'tma', label: 'TMA', field: 'tma', format: this.formatDuration, sortable: true, align: 'center' },
        { name: 'tme', label: 'TME', field: 'tme', format: this.formatDuration, sortable: true, align: 'center' },
        { name: 'efficiency', label: 'Eficiência', field: row => ((row.qtd_resolvidos / 8) * 100).toFixed(1), sortable: true, align: 'center' }
      ]
    },
    teamPerformance () {
      return this.dashData.teamPerformance || []
    }
  },
  methods: {
    formatDuration (timeObject) {
      if (!timeObject || typeof timeObject !== 'object') return 'N/A'
      const hours = Number(timeObject.hours) || 0
      const minutes = Number(timeObject.minutes) || 0
      const seconds = Number(timeObject.seconds) || 0
      return `${hours}h ${minutes}m ${seconds}s`
    },
    calculateProgress (timeObject) {
      if (!timeObject || typeof timeObject !== 'object') return 0
      const hours = Number(timeObject.hours) || 0
      const minutes = Number(timeObject.minutes) || 0
      const seconds = Number(timeObject.seconds) || 0
      const totalSeconds = hours * 3600 + minutes * 60 + seconds
      return Math.min(totalSeconds / (24 * 3600), 1) // Assume um máximo de 24 horas
    },
    getProgressColor (value) {
      if (value < 0.3) return 'negative'
      if (value < 0.7) return 'warning'
      return 'positive'
    },
    async fetchDashboardData () {
      this.isLoading = true
      try {
        const startDate = this.ensureValidDate(this.dateRange.from)
        const endDate = this.ensureValidDate(this.dateRange.to)

        const formattedStartDate = date.formatDate(startDate, 'YYYY-MM-DD')
        const formattedEndDate = date.formatDate(endDate, 'YYYY-MM-DD')

        const [timesResponse, channelsResponse, evolutionResponse, usersResponse] = await Promise.all([
          GetDashTicketsAndTimes({ startDate: formattedStartDate, endDate: formattedEndDate }),
          GetDashTicketsChannels({ startDate: formattedStartDate, endDate: formattedEndDate }),
          GetDashTicketsEvolutionByPeriod({ startDate: formattedStartDate, endDate: formattedEndDate }),
          GetDashTicketsPerUsersDetail({ startDate: formattedStartDate, endDate: formattedEndDate })
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
        this.$q.notify({ type: 'negative', message: 'Erro ao carregar dados do dashboard' })
      } finally {
        this.isLoading = false
      }
    },
    ensureValidDate (dateValue) {
      if (dateValue instanceof Date && !isNaN(dateValue)) {
        return dateValue
      }
      if (typeof dateValue === 'string') {
        const parsedDate = new Date(dateValue)
        if (!isNaN(parsedDate)) {
          return parsedDate
        }
      }
      console.warn('Data inválida detectada, usando a data atual como fallback')
      return new Date()
    }
  },
  mounted () {
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

<style lang="scss">
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

.metric-card {
  height: 100%;
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  }
}

.chart-card {
  transition: all 0.3s ease;
  &:hover {
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  }
}

.date-picker {
  .q-btn-dropdown__arrow {
    margin-left: 8px;
  }
}

.performance-table {
  .q-table__top,
  .q-table__bottom,
  thead tr:first--child th {
      background-color: #2a2a2a;
    }
  }

.q-card {
  background-color: var(--card-bg);
  color: var(--text-color);
}
</style>
