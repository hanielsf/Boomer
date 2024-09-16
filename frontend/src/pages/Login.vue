<template>
  <q-layout class="login-layout">
    <q-page-container>
      <q-page class="flex flex-center">
        <q-ajax-bar position="top" color="primary" size="3px" />

        <q-card class="login-card q-pa-lg shadow-10">
          <q-card-section class="text-center">
            <q-img
              src="/logo_izing.png"
              spinner-color="primary"
              style="height: 100px; max-width: 250px"
              class="q-mb-md"
            />
          </q-card-section>

          <q-card-section>
            <div class="text-h5 text-weight-bold text-primary q-mb-md">Bem-vindo!</div>
            <div class="text-subtitle2 text-grey">Faça login para continuar</div>
          </q-card-section>

          <q-card-section>
            <q-form @submit="fazerLogin" class="q-gutter-md">
              <q-input
                v-model="form.email"
                outlined
                rounded
                label="E-mail"
                type="email"
                :error="$v.form.email.$error"
                error-message="Insira um e-mail válido"
                @blur="$v.form.email.$touch"
              >
                <template v-slot:prepend>
                  <q-icon name="mdi-email-outline" color="primary" />
                </template>
              </q-input>

              <q-input
                v-model="form.password"
                outlined
                rounded
                :type="isPwd ? 'password' : 'text'"
                label="Senha"
                :error="$v.form.password.$error"
                error-message="A senha é obrigatória"
                @blur="$v.form.password.$touch"
              >
                <template v-slot:prepend>
                  <q-icon name="mdi-shield-key-outline" color="primary" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="isPwd ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="isPwd = !isPwd"
                  />
                </template>
              </q-input>

              <div>
                <q-btn
                  label="Login"
                  type="submit"
                  color="primary"
                  rounded
                  class="full-width"
                  :loading="loading"
                >
                  <template v-slot:loading>
                    <q-spinner-dots />
                  </template>
                </q-btn>
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { required, email } from 'vuelidate/lib/validators'

export default {
  name: 'Login',
  data () {
    return {
      form: {
        email: null,
        password: null
      },
      contasCliente: {},
      isPwd: true,
      loading: false
    }
  },
  validations: {
    form: {
      email: { required, email },
      password: { required }
    }
  },
  methods: {
    fazerLogin () {
      this.$v.form.$touch()
      if (this.$v.form.$error) {
        this.$q.notify({
          color: 'negative',
          message: 'Por favor, preencha todos os campos corretamente.',
          icon: 'warning'
        })
        return
      }
      this.loading = true
      this.$store.dispatch('UserLogin', this.form)
        .then(data => {
          this.loading = false
        })
        .catch(err => {
          console.error('exStore', err)
          this.loading = false
          this.$q.notify({
            color: 'negative',
            message: 'Falha no login. Verifique suas credenciais.',
            icon: 'error'
          })
        })
    },
    clear () {
      this.form.email = ''
      this.form.password = ''
      this.$v.form.$reset()
    }
  },
  mounted () {
    // Qualquer lógica de montagem necessária
  }
}
</script>

<style lang="scss" scoped>
.login-layout {
  background: linear-gradient(135deg, #FF8C00 0%, #FFA500 100%);
  min-height: 100vh;
}

.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 25px rgba(0, 0, 0, 0.3);
  }
}

.q-input {
  .q-field__control {
    height: 56px;
  }
}

.q-btn {
  height: 56px;
}

.q-card__section + .q-card__section {
  padding-top: 0;
}
</style>
