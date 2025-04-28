<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import ToolEditor from '../components/tool_editor.vue';
import html2pdf from 'html2pdf.js';

const route = useRoute();
const router = useRouter();
const store = useStore();
const toolEditor = ref(null);
const content = ref(null);
const loading = ref(true);
const proposal = ref(null);
const error = ref(null);
const exportStatus = ref('loading'); // 'loading', 'success', 'error'

// Function to wait for editors to initialize
const waitForEditors = async () => {
  // Wait for a longer time to ensure all editors are initialized
  console.log('Waiting for editors to initialize...');
  return new Promise(resolve => setTimeout(resolve, 5000));
};

// Function to ensure content is properly loaded
const ensureContentLoaded = async () => {
  if (!content.value || content.value.length === 0) {
    console.warn('Content is empty, creating a sample block');
    // Create a sample block if content is empty
    content.value = [{
      id: Date.now(),
      x: 50,
      y: 50,
      width: 400,
      height: 200,
      content: {
        blocks: [{
          type: 'header',
          data: {
            text: proposal.value?.title || 'Sample Proposal',
            level: 2
          }
        }, {
          type: 'paragraph',
          data: {
            text: 'This is a sample proposal content. The actual content could not be loaded.'
          }
        }]
      },
      backgroundColor: 'transparent',
      zIndex: 10
    }];
  }
};

// Function to export PDF
const generatePDF = async () => {
  try {
    if (!toolEditor.value) {
      throw new Error('ToolEditor ref is not available');
    }

    console.log('Starting PDF export...');
    console.log('Content to export:', content.value);

    // Check if the editor has content
    if (!content.value || content.value.length === 0) {
      console.warn('Content is still empty before PDF generation');
      await ensureContentLoaded();
      await nextTick();
    }

    // Find the editor container element
    const editorContainer = document.querySelector('.tool-editor-container');
    if (!editorContainer) {
      console.error('Editor container element not found in DOM');
      throw new Error('Editor container not found');
    }

    console.log('Editor container found in DOM:', editorContainer);

    // Find the actual editor element inside the container
    const editorElement = editorContainer.querySelector('.editor-container');
    if (!editorElement) {
      console.error('Editor element not found inside container');

      // Try to find any visible content
      const anyContent = editorContainer.querySelector('*');
      if (anyContent) {
        console.log('Found some content in the container:', anyContent);
      } else {
        console.error('No content found in the editor container');
      }

      // Fall back to using the container itself
      console.log('Falling back to using the container itself');
    }

    // Use the element we found, or fall back to the container
    const elementToCapture = editorElement || editorContainer;

    // Get the dimensions of the element
    const rect = elementToCapture.getBoundingClientRect();
    console.log('Element dimensions:', rect.width, 'x', rect.height);

    // Create a filename
    const filename = `${proposal.value?.title || 'proposal'}.pdf`;

    try {
      // Use html2pdf directly on the visible element
      console.log('Capturing visible element with html2pdf...');

      // First try to render to canvas
      const canvas = await html2pdf()
        .from(elementToCapture)
        .set({
          margin: 0,
          filename: filename,
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: {
            scale: 3,
            useCORS: true,
            logging: true,
            allowTaint: true,
            backgroundColor: 'white',
            letterRendering: true
          },
          jsPDF: {
            unit: 'mm',
            format: proposal.value?.pageSize || 'a4',
            orientation: 'portrait'
          }
        })
        .toCanvas();

      console.log('Canvas generated successfully, size:', canvas.width, 'x', canvas.height);

      // Now generate PDF from the canvas
      await html2pdf()
        .from(canvas)
        .set({
          margin: 0,
          filename: filename,
          jsPDF: {
            unit: 'mm',
            format: proposal.value?.pageSize || 'a4',
            orientation: 'portrait'
          }
        })
        .save();

      exportStatus.value = 'success';
      console.log('PDF export completed successfully');

      // Wait a bit before redirecting
      setTimeout(() => {
        router.push('/');
      }, 2000);

      return true;
    } catch (directCaptureError) {
      console.error('Direct capture failed:', directCaptureError);

      // Fall back to the original method
      console.log('Falling back to original export method...');
      const result = await toolEditor.value.exportToPDF(proposal.value?.title || 'proposal');

      if (result) {
        exportStatus.value = 'success';
        console.log('PDF export completed successfully using fallback method');

        // Wait a bit before redirecting
        setTimeout(() => {
          router.push('/');
        }, 2000);

        return true;
      } else {
        throw new Error('Fallback PDF generation returned false or undefined');
      }
    }
  } catch (err) {
    console.error('PDF generation failed:', err);
    error.value = err.message || 'Failed to generate PDF';
    exportStatus.value = 'error';
  }
};

onMounted(async () => {
  const proposalId = route.params.id;

  try {
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
        console.log('Parsed content:', content.value);
      } catch (e) {
        console.error('Error parsing content:', e);
        content.value = [];
      }
    } else {
      console.warn('No content found in proposal');
      content.value = [];
    }

    // Ensure we have some content to render
    await ensureContentLoaded();

    // Wait for DOM to update
    await nextTick();

    // Wait for editors to initialize
    await waitForEditors();

    // Force another DOM update to ensure content is rendered
    await nextTick();

    // Generate PDF
    await generatePDF();
  } catch (err) {
    console.error('Export failed:', err);
    error.value = err.message || 'Export failed';
    exportStatus.value = 'error';

    // Wait a bit before redirecting on error
    setTimeout(() => {
      router.push('/');
    }, 2000);
  }
});
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="d-flex align-center justify-center" style="height: 100vh">
        <div class="text-center">
          <!-- Loading state -->
          <div v-if="exportStatus === 'loading'">
            <v-progress-circular
              indeterminate
              color="primary"
              size="64"
            ></v-progress-circular>
            <div class="mt-4 text-h6">Generating PDF...</div>
            <div class="text-subtitle-1 text-grey">Please wait, this may take a moment</div>
          </div>

          <!-- Success state -->
          <div v-else-if="exportStatus === 'success'">
            <v-icon size="64" color="success">mdi-check-circle</v-icon>
            <div class="mt-4 text-h6">PDF Generated Successfully</div>
            <div class="text-subtitle-1">Your download should begin automatically</div>
          </div>

          <!-- Error state -->
          <div v-else-if="exportStatus === 'error'">
            <v-icon size="64" color="error">mdi-alert-circle</v-icon>
            <div class="mt-4 text-h6">Export Failed</div>
            <div class="text-subtitle-1 text-grey">{{ error || 'An error occurred during PDF generation' }}</div>
            <v-btn color="primary" class="mt-4" @click="router.push('/')">
              Return to Dashboard
            </v-btn>
          </div>
        </div>
      </v-container>

      <!-- ToolEditor for PDF generation - temporarily visible for debugging -->
      <div class="tool-editor-container">
        <ToolEditor
          ref="toolEditor"
          v-if="content"
          :modelValue="content"
          :readonly="true"
          :zoom="100"
          :background="proposal?.background"
          :pageSize="proposal?.pageSize || 'A4'"
        />
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.v-main {
  background: white;
}

.tool-editor-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10; /* Above the status messages for debugging */
  opacity: 1; /* Fully visible for debugging */
  pointer-events: none; /* Don't interfere with UI */
  background-color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  padding: 20px;
}

/* For production, use this instead:
.tool-editor-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  visibility: hidden;
}
*/

.export-container {
  max-width: none !important;
  height: 100%;
}

.export-editor {
  height: 100%;
}
</style>







