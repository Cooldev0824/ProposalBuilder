<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

const router = useRouter()
const store = useStore()
const proposals = ref([])
const loading = ref(true)
const showModal = ref(false)

// Form data
const formData = ref({
  title: '',
  clientName: ''
})

onMounted(async () => {
  try {
    await store.dispatch('fetchProposals')
    proposals.value = store.state.proposals
  } finally {
    loading.value = false
  }
})

const openProposal = (id) => {
  router.push(`/proposal/edit/${id}`)
}

const createNewProposal = () => {
  showModal.value = true
}

const handleCreateProposal = async () => {
  if (!formData.value.title || !formData.value.clientName) {
    return // Add validation handling if needed
  }
  console.log('Creating proposal with data:', formData.value);
  router.push('/proposal/create')
}
</script>

<template>
  <v-app>
    <v-app-bar flat>
      <v-toolbar-title>Proposals Dashboard</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="createNewProposal">
        <v-icon left>mdi-plus</v-icon>
        New Proposal
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container>
        <v-row>
          <v-col cols="12">
            <v-card>
              <v-card-title>
                My Proposals
                <v-spacer></v-spacer>
                <v-text-field
                  v-model="search"
                  append-icon="mdi-magnify"
                  label="Search"
                  single-line
                  hide-details
                ></v-text-field>
              </v-card-title>

              <v-card-text>
                <v-sheet v-if="loading" class="d-flex align-center justify-center" height="200">
                  <v-progress-circular indeterminate></v-progress-circular>
                </v-sheet>

                <v-table v-else>
                  <thead>
                    <tr>
                      <th>Proposal Name</th>
                      <th>Client Name</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="proposal in proposals" :key="proposal.id" @click="openProposal(proposal.id)" style="cursor: pointer">
                      <td>{{ proposal.name }}</td>
                      <td>{{ new Date(proposal.created_at).toLocaleDateString() }}</td>
                      <td>
                        <v-chip
                          :color="proposal.status === 'draft' ? 'grey' : 'success'"
                          size="small"
                        >
                          {{ proposal.status }}
                        </v-chip>
                      </td>
                      <td>
                        <v-btn
                          icon
                          size="small"
                          @click.stop="openProposal(proposal.id)"
                        >
                          <v-icon>mdi-pencil</v-icon>
                        </v-btn>
                        <v-btn
                          icon
                          size="small"
                          color="error"
                          @click.stop="deleteProposal(proposal.id)"
                        >
                          <v-icon>mdi-delete</v-icon>
                        </v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>

                <!-- Empty state -->
                <v-sheet
                  v-if="!loading && proposals.length === 0"
                  class="d-flex align-center justify-center flex-column"
                  height="200"
                >
                  <v-icon size="large" color="grey">mdi-file-document-outline</v-icon>
                  <div class="text-h6 mt-4">No proposals yet</div>
                  <v-btn color="primary" class="mt-4" @click="createNewProposal">
                    Create your first proposal
                  </v-btn>
                </v-sheet>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- New Proposal Modal -->
    <v-dialog v-model="showModal" max-width="500px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">
          Create New Proposal
        </v-card-title>

        <v-card-text class="pt-4">
          <v-form @submit.prevent="handleCreateProposal">
            <v-text-field
              v-model="formData.title"
              label="Proposal Title"
              required
              :rules="[v => !!v || 'Title is required']"
              placeholder="Enter proposal title"
              class="mb-4"
            ></v-text-field>

            <v-text-field
              v-model="formData.clientName"
              label="Client Name"
              required
              :rules="[v => !!v || 'Client name is required']"
              placeholder="Enter client name"
            ></v-text-field>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey-darken-1"
            variant="text"
            @click="showModal = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="handleCreateProposal"
            :disabled="!formData.title || !formData.clientName"
          >
            Create Proposal
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<style scoped>
.v-table {
  cursor: pointer;
}

.v-table tr:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.v-card-title {
  padding: 16px !important;
}

.v-card-text {
  padding-top: 20px !important;
}
</style>



