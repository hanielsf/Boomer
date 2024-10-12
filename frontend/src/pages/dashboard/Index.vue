<template>
  <q-page class="dashboard q-pa-md">
    <div class="row items-center justify-between q-mb-lg">
      <h1 class="text-h4 text-weight-bold">Central de Inteligência Operacional</h1>
      <q-btn-dropdown color="primary" :label="formatDateRange" class="date-picker">
        <q-date v-model="dateRange" range minimal />
      </q-btn-dropdown>
    </div>

    <div v-if="isLoading" class="fullscreen flex flex-center">
      <q-spinner-dots color="primary" size="5em" />
    </div>

    <template v-else>
      <div class="row q-col-gutter-md q-mb-lg">
        <div v-for="metric in metricasAvancadas" :key="metric.label" class="col-xs-12 col-sm-6 col-md-3">
          <q-card class="metric-card">
            <q-card-section>
              <div class="row items-center no-wrap">
                <div class="col">
                  <div class="text-subtitle2 text-weight-medium">{{ metric.label }}</div>
                  <div class="text-h5 text-weight-bold q-mt-sm">{{ metric.value }}</div>
                </div>
                <q-icon :name="metric.icon" size="48px" :class="$q.dark.isActive ? 'text-white' : 'text-primary'" />
              </div>
              <q-linear-progress
                :value="metric.progress"
                class="q-mt-sm"
                size="4px"
                :color="metric.color"
              />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-xs-12 col-sm-6 col-md-3">
          <q-card class="chart-card">
            <q-card-section>
              <div class="text-h6 text-weight-bold q-mb-md">Evolução de Atendimentos</div>
              <apexchart
                type="area"
                height="200"
                :options="evolucaoAtendimentosOptions"
                :series="evolucaoAtendimentosSeries"
              />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-xs-12 col-sm-6 col-md-3">
          <q-card class="chart-card">
            <q-card-section>
              <div class="text-h6 text-weight-bold q-mb-md">Distribuição por Canal</div>
              <apexchart
                type="pie"
                height="200"
                :options="distribuicaoCanalOptions"
                :series="distribuicaoCanalSeries"
              />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-xs-12 col-sm-6 col-md-3">
          <q-card class="chart-card">
            <q-card-section>
              <div class="text-h6 text-weight-bold q-mb-md">Tempo Médio Atendimento</div>
              <apexchart
                type="bar"
                height="200"
                :options="tmaOptions"
                :series="tmaSeries"
              />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-xs-12 col-sm-6 col-md-3">
          <q-card class="chart-card">
            <q-card-section>
              <div class="text-h6 text-weight-bold q-mb-md">Satisfação do Cliente</div>
              <apexchart
                type="radialBar"
                height="200"
                :options="satisfacaoOptions"
                :series="satisfacaoSeries"
              />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <q-card class="performance-table-card q-mb-lg">
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
                  :color="getEfficiencyColor(props.value)"
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
  name: 'DashboardRevolucionario',
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
        qtd_atendentes: 1,
        channels: [],
        evolution: []
      },
      teamPerformance: [],
      pagination: { rowsPerPage: 10 },
      metricasAvancadas: []
    }
  },
  computed: {
    formatDateRange () {
      return `${date.formatDate(this.ensureValidDate(this.dateRange.from), 'DD/MM/YYYY')} - ${date.formatDate(this.ensureValidDate(this.dateRange.to), 'DD/MM/YYYY')}`
    },
    evolucaoAtendimentosOptions () {
      return {
        chart: {
          type: 'area',
          height: 200,
          toolbar: {
            show: false
          }
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: 'smooth'
        },
        xaxis: {
          type: 'datetime',
          categories: this.dashData.evolution.map(e => new Date(e.label).getTime())
        },
        yaxis: {
          title: {
            text: 'Atendimentos'
          }
        },
        tooltip: {
          x: {
            format: 'dd MMM yyyy'
          }
        },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.9,
            stops: [0, 90, 100]
          }
        },
        theme: {
          mode: this.$q.dark.isActive ? 'dark' : 'light'
        }
      }
    },
    evolucaoAtendimentosSeries () {
      return [{
        name: 'Atendimentos',
        data: this.dashData.evolution.map(e => e.qtd)
      }]
    },
    distribuicaoCanalOptions () {
      return {
        chart: {
          type: 'pie',
          height: 200
        },
        labels: this.dashData.channels.map(c => c.label),
        responsive: [{
          breakpoint: 480,
          options: {
            chart: {
              width: 200
            },
            legend: {
              position: 'bottom'
            }
          }
        }],
        theme: {
          mode: this.$q.dark.isActive ? 'dark' : 'light'
        }
      }
    },
    distribuicaoCanalSeries () {
      return this.dashData.channels.map(c => c.qtd)
    },
    tmaOptions () {
      return {
        chart: {
          type: 'bar',
          height: 200
        },
        plotOptions: {
          bar: {
            horizontal: true
          }
        },
        dataLabels: {
          enabled: false
        },
        xaxis: {
          categories: this.dashData.channels.map(c => c.label)
        },
        yaxis: {
          title: {
            text: 'Tempo Médio (minutos)'
          }
        },
        theme: {
          mode: this.$q.dark.isActive ? 'dark' : 'light'
        }
      }
    },
    tmaSeries () {
      return [{
        data: this.dashData.channels.map(c => this.calculateTotalMinutes(c.tma || {}))
      }]
    },
    satisfacaoOptions () {
      return {
        chart: {
          height: 200,
          type: 'radialBar'
        },
        plotOptions: {
          radialBar: {
            hollow: {
              size: '70%'
            },
            dataLabels: {
              name: {
                fontSize: '22px'
              },
              value: {
                fontSize: '16px'
              },
              total: {
                show: true,
                label: 'Satisfação',
                formatter: function (w) {
                  return (w.globals.seriesTotals.reduce((a, b) => a + b, 0) / w.globals.series.length).toFixed(1) + '%'
                }
              }
            }
          }
        },
        labels: ['Satisfação'],
        theme: {
          mode: this.$q.dark.isActive ? 'dark' : 'light'
        }
      }
    },
    satisfacaoSeries () {
      return [(this.dashData.satisfacao * 100).toFixed(1)]
    },
    teamPerformanceColumns () {
      return [
        { name: 'name', align: 'left', label: 'Atendente', field: 'name', sortable: true },
        { name: 'qtd_resolvidos', align: 'center', label: 'Resolvidos', field: 'qtd_resolvidos', sortable: true },
        { name: 'qtd_pendentes', align: 'center', label: 'Pendentes', field: 'qtd_pendentes', sortable: true },
        { name: 'tma', align: 'center', label: 'TMA', field: 'tma', format: this.formatDuration, sortable: true },
        { name: 'efficiency', align: 'center', label: 'Eficiência', field: row => ((row.qtd_resolvidos / (row.qtd_resolvidos + row.qtd_pendentes)) * 100).toFixed(1), sortable: true }
      ]
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
    calculateTotalMinutes (timeObject) {
      if (!timeObject || typeof timeObject !== 'object') return 0
      const hours = Number(timeObject.hours) || 0
      const minutes = Number(timeObject.minutes) || 0
      const seconds = Number(timeObject.seconds) || 0
      return Math.round((hours * 60) + minutes + (seconds / 60))
    },
    calculateProgress (timeObject) {
      if (!timeObject || typeof timeObject !== 'object') return 0
      const totalMinutes = this.calculateTotalMinutes(timeObject)
      return Math.min(totalMinutes / (24 * 60), 1) // Assumindo um máximo de 24 horas
    },
    getEfficiencyColor (value) {
      if (value < 30) return 'negative'
      if (value < 70) return 'warning'
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
          evolution: evolutionResponse.data
        }
        this.teamPerformance = usersResponse.data

        this.calculateAdvancedMetrics()
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Ocorreu um erro ao carregar os dados do dashboard. Por favor, tente novamente mais tarde.',
          position: 'top',
          timeout: 5000
        })
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
    },
    calculateAdvancedMetrics () {
      this.metricasAvancadas = [
        {
          label: 'Total de Atendimentos',
          value: this.dashData.qtd_total_atendimentos.toLocaleString(),
          progress: this.dashData.qtd_total_atendimentos / 1000,
          icon: 'support_agent',
          color: 'primary'
        },
        {
          label: 'Taxa de Resolução',
          value: `${((this.dashData.qtd_resolvidos / this.dashData.qtd_total_atendimentos) * 100).toFixed(1)}%`,
          progress: this.dashData.qtd_resolvidos / (this.dashData.qtd_total_atendimentos || 1),
          icon: 'check_circle',
          color: 'positive'
        },
        {
          label: 'Tempo Médio Atendimento',
          value: this.formatDuration(this.dashData.tma),
          progress: this.calculateProgress(this.dashData.tma),
          icon: 'schedule',
          color: 'warning'
        },
        {
          label: 'Novos Contatos',
          value: this.dashData.new_contacts.toLocaleString(),
          progress: this.dashData.new_contacts / 1000,
          icon: 'person_add',
          color: 'secondary'
        }
      ]
    },
    updateChartThemes (isDark) {
      const theme = {
        mode: isDark ? 'dark' : 'light',
        palette: 'palette1'
      }
      this.evolucaoAtendimentosOptions.theme = theme
      this.distribuicaoCanalOptions.theme = theme
      this.tmaOptions.theme = theme
      this.satisfacaoOptions.theme = theme
    }
  },
  mounted () {
    this.fetchDashboardData()
  },
  watch: {
    dateRange: {
      handler: 'fetchDashboardData',
      deep: true
    },
    '$q.dark.isActive': {
      handler (isDark) {
        this.updateChartThemes(isDark)
      },
      immediate: true
    }
  }
}
</script>

<style lang="scss">
.dashboard {
  .metric-card {
    height: 100%;
    transition: all 0.3s ease;
    border-radius: 12px;
    overflow: hidden;

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }

    .q-card__section {
      padding: 16px;
    }

    .text-subtitle2 {
      opacity: 0.8;
    }

    .text-h5 {
      margin-top: 8px;
      margin-bottom: 12px;
    }

    .q-linear-progress {
      height: 4px;
      border-radius: 2px;
    }
  }

  .chart-card {
    height: 100%;
    transition: all 0.3s ease;
    border-radius: 12px;
    overflow: hidden;

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }

    .q-card__section {
      padding: 16px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .text-h6 {
      margin-bottom: 8px;
    }

    .apexcharts-canvas {
      margin: auto;
    }
  }

  .performance-table-card {
    border-radius: 12px;
    overflow: hidden;

    .q-table__container {
      border-radius: 12px;
    }

    .q-table {
      th {
        font-weight: bold;
      }

      td {
        padding: 8px 16px;
      }
    }
  }

  .date-picker {
    .q-btn {
      padding: 8px 16px;
      font-weight: 500;
    }
  }
}

// Estilos para tema claro
.body--light {
  .dashboard {
    .metric-card {
      background-color: #f5f5f5;
      color: #000;
    }

    .chart-card,
    .performance-table-card {
      background-color: #fff;
      color: #000;
    }

    .q-table {
      th {
        background-color: #f5f5f5;
        color: #000;
      }
      td {
        color: #000;
      }
    }
  }
}

// Estilos para tema escuro
.body--dark {
  .dashboard {
    .metric-card {
      background-color: #1d1d1d;
      color: #fff;

      .text-subtitle2 {
        color: rgba(255, 255, 255, 0.7);
      }
    }

    .chart-card,
    .performance-table-card {
      background-color: #2d2d2d;
      color: #fff;
    }

    .q-table {
      th {
        background-color: #1d1d1d;
        color: #fff;
      }
      td {
        color: #fff;
      }
    }
  }
}

// Estilos responsivos
@media (max-width: 1023px) {
  .dashboard {
    .chart-card {
      margin-bottom: 16px;
    }
  }
}

@media (max-width: 599px) {
  .dashboard {
    .metric-card,
    .chart-card,
    .performance-table-card {
      margin-bottom: 16px;
    }

    .text-h4 {
      font-size: 1.8rem;
    }

    .text-h6 {
      font-size: 1.1rem;
    }
  }
}
</style>
