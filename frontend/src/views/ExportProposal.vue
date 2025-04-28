<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import ToolEditor from '../components/tool_editor.vue';

const route = useRoute();
const router = useRouter();
const store = useStore();
const toolEditor = ref(null);
const content = ref(null);
const loading = ref(true);
const proposal = ref(null);

onMounted(async () => {
  const proposalId = route.params.id;
  
  try {
    loading.value = true;
    
    // Fetch proposal data
    const fetchedProposal = await store.dispatch('getProposal', proposalId);
    proposal.value = fetchedProposal;
    
    if (!fetchedProposal) {
      throw new Error('Proposal not found');
    }

    // Parse the content if it exists
    if (fetchedProposal.content) {
      try {
        content.value = JSON.parse(fetchedProposal.content);
      } catch (e) {
        console.error('Error parsing content:', e);
        content.value = [];
      }
    }
    
    // Wait for DOM to update
    await nextTick();
    
    // Additional wait to ensure component is fully rendered
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!toolEditor.value) {
      throw new Error('ToolEditor ref is not available');
    }

    // Generate and download PDF
    await toolEditor.value.exportToPDF(fetchedProposal.title || 'proposal');
    
    // Wait a bit before redirecting
    setTimeout(() => {
      loading.value = false;
      router.push('/');
    }, 1500);
  } catch (error) {
    console.error('Export failed:', error);
    loading.value = false;
    // Show error message to user
    // You might want to add a notification system here
    setTimeout(() => router.push('/'), 1500);
  }
});
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="d-flex align-center justify-center" style="height: 100vh">
        <div class="text-center">
          <v-progress-circular
            v-if="loading"
            indeterminate
            color="primary"
          ></v-progress-circular>
          <div v-else>
            <v-icon size="large" color="success">mdi-check-circle</v-icon>
            <div class="mt-2">Download complete</div>
          </div>
        </div>
      </v-container>
      
      <!-- Hidden ToolEditor for PDF generation -->
      <div style="position: absolute; visibility: hidden;">
        <ToolEditor 
          ref="toolEditor"
          v-if="content"
          :modelValue="content"
          :readonly="true"
          :zoom="100"
          :background="proposal?.background"
        />
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.v-main {
  background: white;
}

.export-container {
  max-width: none !important;
  height: 100%;
}

.export-editor {
  height: 100%;
}
</style>







